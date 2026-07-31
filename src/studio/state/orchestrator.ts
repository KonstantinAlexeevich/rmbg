import type { Backend, ItemRecord, ModelVariant } from '../../core/types';
import { detectBackend, gpuAdapterName } from '../../core/inference/backend';
import { ensureModel } from '../../core/inference/model-loader';
import { canonicalUrl, variantForBackend } from '../../core/inference/model-manifest';
import { hasCachedModel } from '../../core/storage/model-cache';
import {
  activePreset,
  loadSettings,
  resolveExportPresets,
  saveSettings,
  settingsHash,
  type Settings,
} from '../../core/storage/settings';
import {
  clearAll,
  createSession,
  deleteItems,
  deleteSession,
  getItem,
  latestSession,
  openDatabase,
  putItem,
  sessionItems,
  touchSession,
  type Database,
} from '../../core/storage/db';
import { decodeImage, isAcceptedType, makeThumbnail } from '../../core/image/decode';
import { expandMask, refineMask } from '../../core/image/mask';
import { cutout } from '../../core/image/compose';
import { extensionForFormat } from '../../core/image/encode';
import { defaultPreset } from '../../core/preset/types';
import { setLocale, t } from './i18n';
import { useStudioStore, type ItemView } from './store';
import { ExportWorkerClient, SegmentationWorkerClient } from './workers';

const store = useStudioStore;

let db: Database;
let sessionId = '';
let segWorker: SegmentationWorkerClient | null = null;
let exportWorker: ExportWorkerClient | null = null;
let modelAbort = new AbortController();
let workerInited = false;
let hadSuccessfulRun = false;
let fallbackHappened = false;

// object URL миниатюр по id элемента, чтобы отзывать при удалении
const thumbUrls = new Map<string, string>();
const resultThumbUrls = new Map<string, string>();

// видимые в области просмотра карточки перекомпозируются первыми
let visibleIds = new Set<string>();
export function setVisibleIds(ids: Set<string>): void {
  visibleIds = ids;
}

function currentHash(settings: Settings): string {
  return settingsHash(activePreset(settings), settings.edge);
}

function toView(item: ItemRecord, hash: string): ItemView {
  const oldThumb = thumbUrls.get(item.id);
  if (oldThumb !== undefined) URL.revokeObjectURL(oldThumb);
  const thumbnailUrl = URL.createObjectURL(item.thumbnail);
  thumbUrls.set(item.id, thumbnailUrl);

  const oldResult = resultThumbUrls.get(item.id);
  if (oldResult !== undefined) URL.revokeObjectURL(oldResult);
  let resultThumbnailUrl = '';
  if (item.result !== null) {
    resultThumbnailUrl = URL.createObjectURL(item.result.thumbnail);
    resultThumbUrls.set(item.id, resultThumbnailUrl);
  } else {
    resultThumbUrls.delete(item.id);
  }

  return {
    id: item.id,
    name: item.name,
    status: item.status,
    error: item.error,
    selected: item.selected,
    width: item.source.width,
    height: item.source.height,
    thumbnailUrl,
    resultThumbnailUrl,
    hasMask: item.mask !== null,
    maskEmpty: item.mask !== null && item.mask.empty,
    stale: item.result !== null && item.result.settingsHash !== hash,
  };
}

function releaseUrls(ids: string[]): void {
  for (const id of ids) {
    const thumb = thumbUrls.get(id);
    if (thumb !== undefined) URL.revokeObjectURL(thumb);
    thumbUrls.delete(id);
    const result = resultThumbUrls.get(id);
    if (result !== undefined) URL.revokeObjectURL(result);
    resultThumbUrls.delete(id);
  }
}

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'QuotaExceededError';
}

// ---------------------------------------------------------------------------
// Запуск студии
// ---------------------------------------------------------------------------

export async function bootstrap(): Promise<void> {
  const settings = await loadSettings();
  setLocale(settings.ui.locale);
  store.getState().setSettings(settings);

  db = await openDatabase();

  // восстановление последней сессии или создание новой
  let session = await latestSession(db);
  if (session === null) {
    session = await createSession(db, settings.activePresetId);
  }
  sessionId = session.id;

  const hash = currentHash(settings);
  const items = await sessionItems(db, sessionId);
  // незавершённые статусы прошлой сессии откатываются: с готовым результатом —
  // done, иначе обратно в очередь (сегментация пропустится, если маска есть)
  for (const item of items) {
    if (item.status === 'segmenting' || item.status === 'composing') {
      item.status = item.result !== null ? 'done' : 'queued';
      await putItem(db, item);
    }
  }
  store.getState().setItems(items.map((item) => toView(item, hash)));

  // предупреждение о заполнении квоты origin
  const estimate = await navigator.storage.estimate();
  if (
    estimate.quota !== undefined &&
    estimate.usage !== undefined &&
    estimate.quota > 0 &&
    estimate.usage / estimate.quota > 0.8
  ) {
    store.getState().addToast('warning', t('warnQuota'));
  }

  // воркеры создаются сразу: композиция не требует сессии модели
  segWorker = new SegmentationWorkerClient();

  await startModelPipeline();
  // восстановленная очередь / stale — без кнопки «Обработать»
  void processAll();
}

// ---------------------------------------------------------------------------
// Модель: детект бэкенда, загрузка весов, создание сессии, фолбэк
// ---------------------------------------------------------------------------

async function startModelPipeline(): Promise<void> {
  const state = store.getState();
  state.setModel({ phase: 'detecting' });

  const settings = state.settings;
  const backend = await detectBackend(settings.backendOverride);
  state.setBackend(backend);
  void gpuAdapterName().then((name) => {
    store.getState().patchDiagnostics({ adapterName: name });
  });

  if (backend === 'wasm' && settings.backendOverride === 'auto') {
    state.addToast('info', t('wasmModeNotice'));
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
  modelAbort = new AbortController();
  const downloadStart = performance.now();

  state.setModel({ phase: 'downloading', loadedBytes: 0, totalBytes: 0 });
  const outcome = await ensureModel({
    variant,
    knownAssets: state.settings.modelAssets,
    signal: modelAbort.signal,
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
      message: t('modelFailed'),
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
    // отказ в persist не блокирует работу, но пользователь должен знать
    if (!(await navigator.storage.persisted())) {
      store.getState().addToast('warning', t('warnNoPersist'));
    }
  }
  store.getState().patchDiagnostics({
    modelUrl: outcome.asset.url,
    downloadMs: outcome.fromCache ? 0 : Math.round(performance.now() - downloadStart),
  });

  store.getState().setModel({ phase: 'creating' });
  if (segWorker === null) segWorker = new SegmentationWorkerClient();
  try {
    // прогрев только на WebGPU: на WASM это полноценный инференс без выгоды
    const initResult = await segWorker.init(
      backend,
      outcome.asset.url,
      chrome.runtime.getURL('ort/'),
      backend === 'webgpu',
    );
    workerInited = true;
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
      store.getState().addToast('error', t('errorCritical'));
    }
  }
}

// Фолбэк одноразовый и односторонний: если ушли на WASM, обратно в рамках
// сессии страницы не возвращаемся.
async function fallbackToWasm(reason: string): Promise<void> {
  if (fallbackHappened) return;
  fallbackHappened = true;
  workerInited = false;

  store.getState().patchDiagnostics({ fallbackReason: reason });
  store.getState().addToast('warning', t('fallbackNotice', { reason }));

  segWorker?.terminate();
  segWorker = new SegmentationWorkerClient();

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

// ---------------------------------------------------------------------------
// Приём файлов
// ---------------------------------------------------------------------------

export async function addFiles(files: File[]): Promise<void> {
  const state = store.getState();
  const hash = currentHash(state.settings);

  for (const file of files) {
    if (!isAcceptedType(file.type)) {
      state.addToast('warning', t('errorUnsupportedFile', { name: file.name }));
      continue;
    }
    try {
      const bitmap = await decodeImage(file);
      const thumbnail = await makeThumbnail(bitmap);
      const item: ItemRecord = {
        id: crypto.randomUUID(),
        sessionId,
        name: file.name,
        mimeType: file.type,
        createdAt: Date.now(),
        status: 'queued',
        error: '',
        selected: true,
        source: { blob: file, width: bitmap.width, height: bitmap.height },
        thumbnail,
        mask: null,
        result: null,
      };
      bitmap.close();
      await putItem(db, item);
      store.getState().upsertItem(toView(item, hash));
    } catch (e) {
      if (isQuotaError(e)) {
        state.addToast('error', t('errorQuota'));
        return;
      }
      state.addToast('warning', `${file.name}: ${t('errorDecode')}`);
    }
  }
  await touchSession(db, sessionId);
  void processAll();
}

// ---------------------------------------------------------------------------
// Очередь обработки
// ---------------------------------------------------------------------------

let queueRunning = false;
// длительности последних успешных прогонов для оценки оставшегося времени
const recentDurations: number[] = [];
let wasmRunsSeen = 0;

function updateEta(remaining: number): void {
  const avg =
    recentDurations.length > 0
      ? recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length
      : 0;
  store.getState().setBatch({ etaMs: avg > 0 ? Math.round(avg * remaining) : 0 });
}

export async function processAll(): Promise<void> {
  const state = store.getState();
  if (state.model.phase !== 'ready' || !workerInited) {
    state.setProcessRequested(true);
    return;
  }
  if (queueRunning) return;

  const pendingIds = state.items
    .filter((i) => i.status === 'queued' || i.status === 'failed' || i.stale)
    .map((i) => i.id);
  if (pendingIds.length === 0) return;

  queueRunning = true;
  store.getState().setBatch({
    running: true,
    done: 0,
    total: pendingIds.length,
    etaMs: 0,
    stopRequested: false,
  });

  let done = 0;
  for (const id of pendingIds) {
    if (store.getState().batch.stopRequested) break;
    await processItem(id);
    done++;
    store.getState().setBatch({ done });
    updateEta(pendingIds.length - done);
  }

  queueRunning = false;
  store.getState().setBatch({ running: false, stopRequested: false, etaMs: 0 });
}

export function stopProcessing(): void {
  // текущее изображение не отменяется (прогон модели прервать нельзя),
  // очередь перестаёт брать новые
  store.getState().setBatch({ stopRequested: true });
}

export async function retryItem(id: string): Promise<void> {
  if (store.getState().model.phase !== 'ready' || !workerInited) {
    store.getState().setProcessRequested(true);
    return;
  }
  await processItem(id);
}

async function processItem(id: string): Promise<void> {
  const worker = segWorker;
  if (worker === null) return;

  const record = await getItem(db, id);
  if (record === null) return;

  const settings = store.getState().settings;
  const preset = activePreset(settings);
  const hash = currentHash(settings);

  try {
    // сегментация выполняется один раз; при готовой маске — только композиция
    if (record.mask === null) {
      record.status = 'segmenting';
      record.error = '';
      await putItem(db, record);
      store.getState().patchItem(id, { status: 'segmenting', error: '' });

      const started = performance.now();
      let payload;
      try {
        payload = await worker.segment(record.source.blob);
      } catch (e) {
        // сбой первого прогона на WebGPU — одноразовый переход на WASM
        // и повтор той же задачи
        if (store.getState().backend === 'webgpu' && !hadSuccessfulRun) {
          await fallbackToWasm(e instanceof Error ? e.message : String(e));
          if (workerInited && segWorker !== null) {
            payload = await segWorker.segment(record.source.blob);
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
      hadSuccessfulRun = true;

      const duration = performance.now() - started;
      // первое изображение на WASM играет роль прогрева, в среднее не входит
      const isWasm = store.getState().backend === 'wasm';
      if (isWasm) wasmRunsSeen++;
      if (!isWasm || wasmRunsSeen > 1) {
        recentDurations.push(duration);
        if (recentDurations.length > 5) recentDurations.shift();
      }
      store.getState().patchDiagnostics({ lastRunMs: Math.round(duration) });

      record.mask = {
        blob: payload.blob,
        coverage: payload.coverage,
        bbox: payload.bbox,
        empty: payload.empty,
        backend: store.getState().backend,
        passes: payload.passes,
        durationMs: Math.round(payload.durationMs),
      };
      if (payload.secondPassEmpty) {
        console.warn(`Второй проход вернул пустую маску, оставлен первый: ${record.name}`);
      }
      await putItem(db, record);
    }

    record.status = 'composing';
    await putItem(db, record);
    store.getState().patchItem(id, {
      status: 'composing',
      hasMask: true,
      maskEmpty: record.mask.empty,
    });

    const composed = await worker.compose(
      record.source.blob,
      record.mask.blob,
      record.mask.coverage,
      record.mask.bbox,
      settings.edge,
      preset,
    );

    record.result = {
      blob: composed.blob,
      thumbnail: composed.thumbnail,
      width: composed.width,
      height: composed.height,
      format: preset.output.format,
      settingsHash: hash,
    };
    record.status = 'done';
    await putItem(db, record);
    store.getState().upsertItem(toView(record, currentHash(store.getState().settings)));
  } catch (e) {
    if (isQuotaError(e)) {
      store.getState().addToast('error', t('errorQuota'));
      stopProcessing();
    }
    record.status = 'failed';
    record.error = e instanceof Error ? e.message : String(e);
    try {
      await putItem(db, record);
    } catch {
      // не удалось даже записать статус — показываем только в памяти
    }
    store.getState().patchItem(id, { status: 'failed', error: record.error });
  }
}

// ---------------------------------------------------------------------------
// Настройки и перекомпозиция
// ---------------------------------------------------------------------------

let recomposeTimer = 0;
let recomposeGeneration = 0;

export async function updateSettings(mutate: (settings: Settings) => Settings): Promise<void> {
  const before = store.getState().settings;
  const after = mutate(before);
  store.getState().setSettings(after);
  await saveSettings(after);

  const hashBefore = currentHash(before);
  const hashAfter = currentHash(after);
  if (hashBefore === hashAfter) return;

  // изменение фона, края или пресета помечает результаты устаревшими
  const items = store.getState().items;
  for (const item of items) {
    if (item.resultThumbnailUrl !== '' || item.hasMask) {
      store.getState().patchItem(item.id, { stale: true });
    }
  }

  // дебаунс 200 мс: перетаскивание слайдера не должно запускать
  // десятки пересчётов
  clearTimeout(recomposeTimer);
  recomposeTimer = window.setTimeout(() => {
    void recomposeStale();
  }, 200);
}

async function recomposeStale(): Promise<void> {
  const generation = ++recomposeGeneration;
  const worker = segWorker;
  if (worker === null) return;

  // сначала видимые в области просмотра карточки, потом остальные
  const candidates = store
    .getState()
    .items.filter((i) => i.hasMask && (i.status === 'done' || i.stale))
    .sort((a, b) => Number(visibleIds.has(b.id)) - Number(visibleIds.has(a.id)));

  for (const view of candidates) {
    if (generation !== recomposeGeneration) return; // настройки изменились снова

    const settings = store.getState().settings;
    const hash = currentHash(settings);
    const record = await getItem(db, view.id);
    if (record === null || record.mask === null) continue;
    if (record.result !== null && record.result.settingsHash === hash) {
      store.getState().patchItem(view.id, { stale: false });
      continue;
    }

    try {
      const preset = activePreset(settings);
      const composed = await worker.compose(
        record.source.blob,
        record.mask.blob,
        record.mask.coverage,
        record.mask.bbox,
        settings.edge,
        preset,
      );
      if (generation !== recomposeGeneration) return;
      record.result = {
        blob: composed.blob,
        thumbnail: composed.thumbnail,
        width: composed.width,
        height: composed.height,
        format: preset.output.format,
        settingsHash: hash,
      };
      record.status = 'done';
      record.error = '';
      await putItem(db, record);
      store.getState().upsertItem(toView(record, hash));
    } catch (e) {
      if (isQuotaError(e)) {
        store.getState().addToast('error', t('errorQuota'));
        return;
      }
      store.getState().patchItem(view.id, {
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

export function resetEdgeSettings(): void {
  void updateSettings((s) => ({ ...s, edge: { threshold: 0, erode: 1, feather: 0 } }));
}

// ---------------------------------------------------------------------------
// Выбор, удаление, сессии
// ---------------------------------------------------------------------------

export async function setItemSelected(id: string, selected: boolean): Promise<void> {
  store.getState().patchItem(id, { selected });
  const record = await getItem(db, id);
  if (record === null) return;
  record.selected = selected;
  await putItem(db, record);
}

export async function selectAll(): Promise<void> {
  for (const item of store.getState().items) {
    if (!item.selected) await setItemSelected(item.id, true);
  }
}

export async function deleteSelected(): Promise<void> {
  const ids = store
    .getState()
    .items.filter((i) => i.selected)
    .map((i) => i.id);
  if (ids.length === 0) return;
  await deleteItems(db, ids);
  releaseUrls(ids);
  store.getState().removeItems(ids);
}

export async function deleteItem(id: string): Promise<void> {
  await deleteItems(db, [id]);
  releaseUrls([id]);
  store.getState().removeItems([id]);
}

// «Новая сессия» создаёт новую и удаляет предыдущую вместе с элементами
export async function newSession(): Promise<void> {
  const oldSessionId = sessionId;
  const ids = store.getState().items.map((i) => i.id);
  const session = await createSession(db, store.getState().settings.activePresetId);
  sessionId = session.id;
  releaseUrls(ids);
  store.getState().setItems([]);
  await deleteSession(db, oldSessionId);
}

// ---------------------------------------------------------------------------
// Экспорт и скачивание
// ---------------------------------------------------------------------------

export async function exportZip(): Promise<void> {
  const state = store.getState();
  if (state.exporting.running) return;

  // в архив попадают только выбранные карточки со статусом done
  const ids = state.items
    .filter((i) => i.selected && i.status === 'done')
    .map((i) => i.id);
  if (ids.length === 0) return;

  const presets = resolveExportPresets(state.settings);
  if (presets.length === 0) {
    state.addToast('error', t('errorNoExportPresets'));
    return;
  }

  if (exportWorker === null) exportWorker = new ExportWorkerClient();
  const total = ids.length * presets.length;
  state.setExporting({ running: true, done: 0, total });
  try {
    const { blob, fileName } = await exportWorker.zip(
      ids,
      presets,
      state.settings.edge,
      state.settings.activePresetId,
      (done, nextTotal) => {
        store.getState().setExporting({ done, total: nextTotal });
      },
    );
    await downloadBlob(blob, fileName, true);
  } catch (e) {
    store.getState().addToast('error', e instanceof Error ? e.message : String(e));
  } finally {
    store.getState().setExporting({ running: false, done: 0, total: 0 });
  }
}

export async function downloadItem(id: string): Promise<void> {
  const record = await getItem(db, id);
  if (record === null || record.result === null) return;
  const base = record.name.replace(/\.[^.]+$/, '');
  await downloadBlob(
    record.result.blob,
    `${base}.${extensionForFormat(record.result.format)}`,
    false,
  );
}

async function downloadBlob(blob: Blob, filename: string, saveAs: boolean): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    const downloadId = await chrome.downloads.download({ url, filename, saveAs });
    // ранний revoke ломает скачивание больших архивов — ждём завершения
    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId) return;
      const state = delta.state?.current;
      if (state === 'complete' || state === 'interrupted') {
        URL.revokeObjectURL(url);
        chrome.downloads.onChanged.removeListener(listener);
      }
    };
    chrome.downloads.onChanged.addListener(listener);
  } catch (e) {
    URL.revokeObjectURL(url);
    // отмена диалога сохранения не ошибка
    if (e instanceof Error && !e.message.includes('canceled')) {
      store.getState().addToast('error', e.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Данные для просмотра «до/после» (загружаются по требованию)
// ---------------------------------------------------------------------------

// «После» — cutout в разрешении оригинала (не холст пресета), иначе
// слайдер сравнивает кадры разного размера и кромку не видно.
export async function loadCompareUrls(
  id: string,
): Promise<{ originalUrl: string; resultUrl: string }> {
  const record = await getItem(db, id);
  if (record === null) return { originalUrl: '', resultUrl: '' };

  const originalUrl = URL.createObjectURL(record.source.blob);
  if (record.mask === null) return { originalUrl, resultUrl: '' };

  const source = await decodeImage(record.source.blob);
  const maskBitmap = await createImageBitmap(record.mask.blob);
  try {
    const expanded = expandMask(
      maskBitmap,
      record.mask.coverage,
      source.width,
      source.height,
    );
    const refined = refineMask(expanded, store.getState().settings.edge);
    const cut = cutout(source, refined);
    const blob = await cut.convertToBlob({ type: 'image/png' });
    return { originalUrl, resultUrl: URL.createObjectURL(blob) };
  } finally {
    source.close();
    maskBitmap.close();
  }
}

// ---------------------------------------------------------------------------
// Диагностика
// ---------------------------------------------------------------------------

export async function setBackendOverride(
  value: 'auto' | 'webgpu' | 'wasm',
): Promise<void> {
  await updateSettings((s) => ({ ...s, backendOverride: value }));
}

export async function clearAllData(): Promise<void> {
  const ids = store.getState().items.map((i) => i.id);
  releaseUrls(ids);
  await clearAll(db);
  const session = await createSession(db, defaultPreset().id);
  sessionId = session.id;
  store.getState().setItems([]);
}
