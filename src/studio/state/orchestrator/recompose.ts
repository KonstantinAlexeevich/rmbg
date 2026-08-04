import {
  activePreset,
  saveSettings,
  settingsHash,
  type Settings,
} from '../../../core/storage/settings';
import { getItem, putItem } from '../../../core/storage/db';
import { findOverride, resolveComposition } from '../../../core/preset/override';
import { t } from '../i18n';
import {
  db,
  isQuotaError,
  itemHash,
  segWorker,
  store,
  toView,
  visibleIds,
} from './context';
import { syncExportsToExtension } from '../../ext-sync';

let recomposeTimer = 0;
let recomposeGeneration = 0;

export function scheduleRecompose(): void {
  clearTimeout(recomposeTimer);
  recomposeTimer = window.setTimeout(() => {
    void recomposeStale();
  }, 200);
}

async function refreshStaleFlags(settings: Settings): Promise<boolean> {
  let anyStale = false;
  for (const view of store.getState().items) {
    const record = await getItem(db, view.id);
    if (record === null) continue;
    const hash = itemHash(settings, record.overrides);
    const stale = record.result !== null && record.result.settingsHash !== hash;
    if (stale) anyStale = true;
    store.getState().patchItem(view.id, {
      override: findOverride(record.overrides, settings.activePresetId) ?? null,
      stale,
    });
  }
  return anyStale;
}

export async function updateSettings(mutate: (settings: Settings) => Settings): Promise<void> {
  const after = mutate(store.getState().settings);
  store.getState().setSettings(after);
  await saveSettings(after);
  syncExportsToExtension(after);

  // поэлементный хэш: слепки не реагируют на правку глобального пресета/края
  const anyStale = await refreshStaleFlags(after);
  if (anyStale) scheduleRecompose();
}

async function recomposeStale(): Promise<void> {
  const generation = ++recomposeGeneration;
  const worker = segWorker;
  if (worker === null) return;

  const compareId = store.getState().compareItemId;

  // открытая в просмотре — первой, затем видимые в гриде, потом остальные
  const candidates = store
    .getState()
    .items.filter((i) => i.hasMask && (i.status === 'done' || i.stale))
    .sort((a, b) => {
      const score = (id: string) =>
        (id === compareId ? 2 : 0) + (visibleIds.has(id) ? 1 : 0);
      return score(b.id) - score(a.id);
    });

  for (const view of candidates) {
    if (generation !== recomposeGeneration) return; // настройки изменились снова

    const settings = store.getState().settings;
    const record = await getItem(db, view.id);
    if (record === null || record.mask === null) continue;

    const { preset, edge } = resolveComposition(
      activePreset(settings),
      settings.edge,
      record.overrides,
    );
    const hash = settingsHash(preset, edge);

    if (record.result !== null && record.result.settingsHash === hash) {
      store.getState().patchItem(view.id, {
        stale: false,
        override: findOverride(record.overrides, settings.activePresetId) ?? null,
      });
      continue;
    }

    try {
      const composed = await worker.compose(
        record.source.blob,
        record.mask.blob,
        record.mask.coverage,
        record.mask.bbox,
        edge,
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
      store.getState().upsertItem(toView(record, settings));
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
