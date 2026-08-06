import type { Backend, ModelVariant } from '../../../core/types';
import { detectBackend, gpuAdapterName } from '../../../core/inference/backend';
import { ensureModel } from '../../../core/inference/model-loader';
import { canonicalUrl, variantForBackend } from '../../../core/inference/model-manifest';
import { hasCachedModel } from '../../../core/storage/model-cache';
import { saveSettings, type Settings } from '../../../core/storage/settings';
import { assetUrl } from '../../../platform/assets';
import { t } from '../i18n';
import { SegmentationWorkerClient } from '../workers';
import {
  modelAbort,
  segWorker,
  setFallbackHappened,
  setModelAbort,
  setSegWorker,
  setWorkerInited,
  store,
  fallbackHappened,
} from './context';
import { processAll } from './queue';

export async function startModelPipeline(): Promise<void> {
  const state = store.getState();
  state.setModel({ phase: 'detecting' });

  const settings = state.settings;
  const backend = await detectBackend(settings.backendOverride);
  state.setBackend(backend);
  void gpuAdapterName().then((name) => {
    store.getState().patchDiagnostics({ adapterName: name });
  });

  if (backend === 'wasm' && settings.backendOverride === 'auto') {
    state.addToast('info', t.wasmModeNotice());
  }

  const variant = variantForBackend(backend);

  // кэш вытеснен браузером: метаданные есть, байтов нет — отдельное
  // состояние с кнопкой «Скачать», а не молчаливая закачка 176 МБ
  const known = settings.modelAssets.find((a) => a.url === canonicalUrl(variant));
  if (known !== undefined && !(await hasCachedModel(known.url))) {
    state.setModel({ phase: 'evicted' });
    return;
  }

  await loadModelAndInit(backend, variant);
}

async function loadModelAndInit(
  backend: Backend,
  variant: ModelVariant,
): Promise<void> {
  const state = store.getState();
  const abort = new AbortController();
  setModelAbort(abort);
  const downloadStart = performance.now();

  state.setModel({ phase: 'downloading', loadedBytes: 0, totalBytes: 0 });
  const outcome = await ensureModel({
    variant,
    knownAssets: state.settings.modelAssets,
    signal: abort.signal,
    onProgress: ({ loadedBytes, totalBytes }) => {
      // байты получены, идёт проверка SHA-256
      if (totalBytes > 0 && loadedBytes >= totalBytes) {
        store.getState().setModel({ phase: 'verifying' });
      } else {
        store.getState().setModel({ phase: 'downloading', loadedBytes, totalBytes });
      }
    },
  });

  if (outcome.kind === 'failed') {
    if (outcome.reason === 'aborted') {
      store.getState().setModel({ phase: 'canceled' });
      return;
    }
    store.getState().setModel({
      phase: 'failed',
      reason: outcome.reason,
      message: t.modelFailed(),
    });
    return;
  }

  if (!outcome.fromCache) {
    const settings = store.getState().settings;
    const updated: Settings = {
      ...settings,
      modelAssets: [
        ...settings.modelAssets.filter((a) => a.url !== outcome.asset.url),
        outcome.asset,
      ],
    };
    store.getState().setSettings(updated);
    await saveSettings(updated);
    // отказ в persist не блокирует работу; на Safari/iOS persist почти
    // никогда не выдаётся — тост только пугает без пользы
    if (expectsPersistentStorage() && !(await navigator.storage.persisted())) {
      store.getState().addToast('warning', t.warnNoPersist());
    }
  }
  store.getState().patchDiagnostics({
    modelUrl: outcome.asset.url,
    downloadMs: outcome.fromCache ? 0 : Math.round(performance.now() - downloadStart),
  });

  store.getState().setModel({ phase: 'creating' });
  let worker = segWorker;
  if (worker === null) {
    worker = new SegmentationWorkerClient();
    setSegWorker(worker);
  }
  try {
    // прогрев только на WebGPU: на WASM это полноценный инференс без выгоды
    const initResult = await worker.init(
      backend,
      outcome.asset.url,
      assetUrl('ort/'),
      backend === 'webgpu',
    );
    setWorkerInited(true);
    store.getState().patchDiagnostics({
      warmupMs: Math.round(initResult.warmupMs),
      crossOriginIsolated: initResult.crossOriginIsolated,
      wasmThreads: initResult.wasmThreads,
    });
    store.getState().setModel({ phase: 'ready' });

    if (store.getState().processRequested) {
      store.getState().setProcessRequested(false);
      void processAll();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (backend === 'webgpu') {
      await fallbackToWasm(message);
    } else {
      store.getState().setModel({ phase: 'failed', reason: 'session', message });
      store.getState().addToast('error', t.errorCritical());
    }
  }
}

// Фолбэк одноразовый и односторонний: если ушли на WASM, обратно в рамках
// сессии страницы не возвращаемся.
export async function fallbackToWasm(reason: string): Promise<void> {
  if (fallbackHappened) return;
  setFallbackHappened(true);
  setWorkerInited(false);

  store.getState().patchDiagnostics({ fallbackReason: reason });
  store.getState().addToast('warning', t.fallbackNotice({ reason }));

  segWorker?.terminate();
  setSegWorker(new SegmentationWorkerClient());

  store.getState().setBackend('wasm');
  await loadModelAndInit('wasm', 'q8');
}

export function retryModelDownload(): void {
  const backend = store.getState().backend;
  void loadModelAndInit(backend, variantForBackend(backend));
}

export function cancelModelDownload(): void {
  modelAbort.abort();
}

/** Chrome/Edge/Firefox могут выдать persist; Safari (в т.ч. iOS) — почти никогда. */
function expectsPersistentStorage(): boolean {
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return false;
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)) return false;
  return true;
}
