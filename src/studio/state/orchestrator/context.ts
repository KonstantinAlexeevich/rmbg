import type { ItemRecord, ItemOverride } from '../../../core/types';
import {
  activePreset,
  settingsHash,
  type Settings,
} from '../../../core/storage/settings';
import type { Database } from '../../../core/storage/db';
import { findOverride, resolveComposition } from '../../../core/preset/override';
import { useStudioStore, type ItemView } from '../store';
import type { ExportWorkerClient, SegmentationWorkerClient } from '../workers';

export const store = useStudioStore;

export let db: Database;
export let sessionId = '';
export let segWorker: SegmentationWorkerClient | null = null;
export let exportWorker: ExportWorkerClient | null = null;
export let modelAbort = new AbortController();
export let workerInited = false;
export let hadSuccessfulRun = false;
export let fallbackHappened = false;

const thumbUrls = new Map<string, string>();
const resultThumbUrls = new Map<string, string>();

export let visibleIds = new Set<string>();

export function setDb(value: Database): void {
  db = value;
}

export function setSessionId(value: string): void {
  sessionId = value;
}

export function setSegWorker(value: SegmentationWorkerClient | null): void {
  segWorker = value;
}

export function setExportWorker(value: ExportWorkerClient | null): void {
  exportWorker = value;
}

export function setModelAbort(value: AbortController): void {
  modelAbort = value;
}

export function setWorkerInited(value: boolean): void {
  workerInited = value;
}

export function setHadSuccessfulRun(value: boolean): void {
  hadSuccessfulRun = value;
}

export function setFallbackHappened(value: boolean): void {
  fallbackHappened = value;
}

export function setVisibleIds(ids: Set<string>): void {
  visibleIds = ids;
}

export function itemHash(settings: Settings, overrides: ItemOverride[]): string {
  const { preset, edge } = resolveComposition(
    activePreset(settings),
    settings.edge,
    overrides,
  );
  return settingsHash(preset, edge);
}

export function toView(item: ItemRecord, settings: Settings): ItemView {
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

  const hash = itemHash(settings, item.overrides);
  const override = findOverride(item.overrides, settings.activePresetId);

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
    override: override ?? null,
  };
}

export function releaseUrls(ids: string[]): void {
  for (const id of ids) {
    const thumb = thumbUrls.get(id);
    if (thumb !== undefined) URL.revokeObjectURL(thumb);
    thumbUrls.delete(id);
    const result = resultThumbUrls.get(id);
    if (result !== undefined) URL.revokeObjectURL(result);
    resultThumbUrls.delete(id);
  }
}

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'QuotaExceededError';
}
