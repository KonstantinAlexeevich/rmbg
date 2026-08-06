/** Чистые селекторы очереди / экспорта / рекомпозиции — без store/db/workers. */

import { extensionForFormat } from '../../../core/image/encode';
import { activePreset, type Settings } from '../../../core/storage/settings';
import type { OutputFormat, Preset } from '../../../core/preset/types';
import type { ItemStatus } from '../../../core/types';

export type QueueItemRef = {
  id: string;
  status: ItemStatus;
  stale: boolean;
};

export type ExportItemRef = {
  id: string;
  selected: boolean;
  status: ItemStatus;
};

export type RecomposeItemRef = {
  id: string;
  hasMask: boolean;
  status: ItemStatus;
  stale: boolean;
};

export function selectPendingItemIds(items: QueueItemRef[]): string[] {
  return items
    .filter((i) => i.status === 'queued' || i.status === 'failed' || i.stale)
    .map((i) => i.id);
}

export function selectExportableIds(items: ExportItemRef[]): string[] {
  return items.filter((i) => i.selected && i.status === 'done').map((i) => i.id);
}

export function recomposePriorityScore(
  id: string,
  compareId: string,
  visibleIds: ReadonlySet<string>,
): number {
  return (id === compareId ? 2 : 0) + (visibleIds.has(id) ? 1 : 0);
}

export function selectRecomposeCandidates(
  items: RecomposeItemRef[],
  compareId: string,
  visibleIds: ReadonlySet<string>,
): RecomposeItemRef[] {
  return items
    .filter((i) => i.hasMask && (i.status === 'done' || i.stale))
    .slice()
    .sort(
      (a, b) =>
        recomposePriorityScore(b.id, compareId, visibleIds) -
        recomposePriorityScore(a.id, compareId, visibleIds),
    );
}

export function computeEtaMs(recentDurations: number[], remaining: number): number {
  const avg =
    recentDurations.length > 0
      ? recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length
      : 0;
  return avg > 0 ? Math.round(avg * remaining) : 0;
}

/** Первое WASM-изображение — прогрев, в среднее ETA не входит. */
export function shouldRecordRunDuration(
  isWasm: boolean,
  wasmRunsSeen: number,
): boolean {
  return !isWasm || wasmRunsSeen > 1;
}

export function resolveComposePreset(
  settings: Settings,
  autoPresetId: string | undefined,
): Preset {
  if (autoPresetId !== undefined) {
    const found = settings.presets.find((p) => p.id === autoPresetId);
    if (found !== undefined) return found;
  }
  return activePreset(settings);
}

export function isResultStale(
  result: { settingsHash: string } | null,
  currentHash: string,
): boolean {
  return result !== null && result.settingsHash !== currentHash;
}

export function downloadFileName(
  originalName: string,
  format: OutputFormat,
): string {
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}.${extensionForFormat(format)}`;
}
