import type { ItemRecord, ItemOverride } from '../../../core/types';
import { activePreset } from '../../../core/storage/settings';
import {
  createSession,
  deleteItems,
  deleteSession,
  getItem,
  putItem,
  touchSession,
} from '../../../core/storage/db';
import { decodeImage, isAcceptedType, makeThumbnail } from '../../../core/image/decode';
import {
  createOverride,
  dropOverride,
  findOverride,
  putOverride,
} from '../../../core/preset/override';
import { t } from '../i18n';
import {
  db,
  isQuotaError,
  releaseUrls,
  sessionId,
  setAutoDownloadPreset,
  markEphemeral,
  setSessionId,
  store,
  toView,
} from './context';
import { processAll } from './queue';
import { scheduleRecompose, updateSettings } from './recompose';

export async function addFiles(
  files: File[],
  options?: { autoDownloadPresetId?: string; ephemeral?: boolean },
): Promise<string[]> {
  const state = store.getState();
  const settings = state.settings;
  const createdIds: string[] = [];
  const autoPresetId = options?.autoDownloadPresetId;
  const ephemeral = options?.ephemeral === true;

  for (const file of files) {
    if (!isAcceptedType(file.type)) {
      if (!ephemeral) {
        state.addToast('warning', t.errorUnsupportedFile({ name: file.name }));
      }
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
        selected: !ephemeral,
        source: { blob: file, width: bitmap.width, height: bitmap.height },
        thumbnail,
        mask: null,
        result: null,
        overrides: [],
      };
      bitmap.close();
      if (ephemeral) markEphemeral(item.id);
      await putItem(db, item);
      store.getState().upsertItem(toView(item, settings));
      createdIds.push(item.id);
      if (autoPresetId !== undefined) {
        setAutoDownloadPreset(item.id, autoPresetId);
      }
    } catch (e) {
      if (isQuotaError(e)) {
        if (!ephemeral) state.addToast('error', t.errorQuota());
        return createdIds;
      }
      if (!ephemeral) {
        state.addToast('warning', `${file.name}: ${t.errorDecode()}`);
      }
    }
  }
  await touchSession(db, sessionId);
  void processAll();
  return createdIds;
}

export async function overrideCurrentItem(id: string): Promise<void> {
  const record = await getItem(db, id);
  if (record === null) return;

  const settings = store.getState().settings;
  const preset = activePreset(settings);
  if (findOverride(record.overrides, preset.id) !== undefined) return;

  record.overrides = putOverride(
    record.overrides,
    createOverride(preset, settings.edge),
  );
  await putItem(db, record);
  store.getState().upsertItem(toView(record, settings));
  // слепок совпадает с текущими значениями — пересчёт не нужен
}

export async function resetItemOverride(id: string): Promise<void> {
  const record = await getItem(db, id);
  if (record === null) return;

  const settings = store.getState().settings;
  const next = dropOverride(record.overrides, settings.activePresetId);
  if (next.length === record.overrides.length) return;

  record.overrides = next;
  await putItem(db, record);
  store.getState().upsertItem(toView(record, settings));
  store.getState().patchItem(id, { stale: true });
  scheduleRecompose();
}

export async function patchItemOverride(
  id: string,
  mutate: (override: ItemOverride) => ItemOverride,
): Promise<void> {
  const record = await getItem(db, id);
  if (record === null) return;

  const settings = store.getState().settings;
  // Сверяем со слепком в сторе: activePresetId мог смениться между кликом и await.
  const view = store.getState().items.find((i) => i.id === id);
  const presetId = view?.override?.presetId ?? settings.activePresetId;
  const current = findOverride(record.overrides, presetId);
  if (current === undefined) return;

  const next = mutate(structuredClone(current));
  record.overrides = putOverride(record.overrides, next);
  await putItem(db, record);
  store.getState().upsertItem(toView(record, settings));
  store.getState().patchItem(id, { stale: true });
  scheduleRecompose();
}

// при удалении пресета вычищаем слепки с его id у всех картинок сессии
export async function purgeOverridesForPreset(presetId: string): Promise<void> {
  const settings = store.getState().settings;
  for (const view of store.getState().items) {
    const record = await getItem(db, view.id);
    if (record === null) continue;
    const next = dropOverride(record.overrides, presetId);
    if (next.length === record.overrides.length) continue;
    record.overrides = next;
    await putItem(db, record);
    store.getState().upsertItem(toView(record, settings));
  }
}

export async function setItemSelected(id: string, selected: boolean): Promise<void> {
  store.getState().patchItem(id, { selected });
  const record = await getItem(db, id);
  if (record === null) return;
  record.selected = selected;
  await putItem(db, record);
}

export async function renameItem(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') return;
  const record = await getItem(db, id);
  if (record === null || record.name === trimmed) return;
  record.name = trimmed;
  await putItem(db, record);
  store.getState().patchItem(id, { name: trimmed });
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

// Clear / «Очистить» создаёт новую сессию и удаляет предыдущую вместе с элементами
export async function newSession(): Promise<void> {
  const oldSessionId = sessionId;
  const ids = store.getState().items.map((i) => i.id);
  const session = await createSession(db, store.getState().settings.activePresetId);
  setSessionId(session.id);
  releaseUrls(ids);
  store.getState().setCompareItemId('');
  store.getState().setItems([]);
  await deleteSession(db, oldSessionId);
}

export function resetEdgeSettings(): void {
  const compareId = store.getState().compareItemId;
  const item = store.getState().items.find((i) => i.id === compareId);
  if (compareId !== '' && item !== undefined && item.override !== null) {
    void patchItemOverride(compareId, (o) => ({
      ...o,
      edge: { threshold: 0, erode: 1, feather: 0 },
    }));
    return;
  }
  void updateSettings((s) => ({ ...s, edge: { threshold: 0, erode: 1, feather: 0 } }));
}
