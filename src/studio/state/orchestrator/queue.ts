import {
  activePreset,
  settingsHash,
} from '../../../core/storage/settings';
import { getItem, putItem } from '../../../core/storage/db';
import { resolveComposition } from '../../../core/preset/override';
import { t } from '../i18n';
import {
  db,
  hadSuccessfulRun,
  isQuotaError,
  segWorker,
  setHadSuccessfulRun,
  store,
  toView,
  workerInited,
} from './context';
import { fallbackToWasm } from './model';

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
  const { preset, edge } = resolveComposition(
    activePreset(settings),
    settings.edge,
    record.overrides,
  );
  const hash = settingsHash(preset, edge);

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
      setHadSuccessfulRun(true);

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
      edge,
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
    store.getState().upsertItem(toView(record, store.getState().settings));
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
