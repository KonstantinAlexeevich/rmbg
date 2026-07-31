import { activePreset } from '../../../core/storage/settings';
import { clearAll, createSession, getItem } from '../../../core/storage/db';
import { defaultPreset } from '../../../core/preset/types';
import { resolveComposition } from '../../../core/preset/override';
import { db, releaseUrls, segWorker, setSessionId, store } from './context';
import { updateSettings } from './recompose';

// Оба кадра слайдера собираем на лету из одного effective preset —
// иначе «До» по новым настройкам и «После» из устаревшего result.blob
// расходятся по layout. Тяжёлая композиция идёт в seg-воркере.
export async function loadCompareUrls(
  id: string,
): Promise<{ originalUrl: string; resultUrl: string; resultWidth: number; resultHeight: number }> {
  const record = await getItem(db, id);
  if (record === null) {
    return { originalUrl: '', resultUrl: '', resultWidth: 0, resultHeight: 0 };
  }

  if (record.mask === null) {
    return {
      originalUrl: URL.createObjectURL(record.source.blob),
      resultUrl: '',
      resultWidth: record.source.width,
      resultHeight: record.source.height,
    };
  }

  const worker = segWorker;
  if (worker === null) {
    return { originalUrl: '', resultUrl: '', resultWidth: 0, resultHeight: 0 };
  }

  const settings = store.getState().settings;
  const { preset, edge } = resolveComposition(
    activePreset(settings),
    settings.edge,
    record.overrides,
  );

  const payload = await worker.composeCompare(
    record.source.blob,
    record.mask.blob,
    record.mask.coverage,
    record.mask.bbox,
    edge,
    preset,
  );

  return {
    originalUrl: URL.createObjectURL(payload.before),
    resultUrl: URL.createObjectURL(payload.after),
    resultWidth: payload.width,
    resultHeight: payload.height,
  };
}

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
  setSessionId(session.id);
  store.getState().setItems([]);
}
