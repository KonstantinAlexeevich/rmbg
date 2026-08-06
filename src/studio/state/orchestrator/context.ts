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
import { isResultStale } from './selectors';

export const store = useStudioStore;

export let db: Database;
export let sessionId = '';
export let segWorker: SegmentationWorkerClient | null = null;
export let exportWorker: ExportWorkerClient | null = null;
export let modelAbort = new AbortController();
export let workerInited = false;
export let hadSuccessfulRun = false;
export let fallbackHappened = false;

type CachedUrl = { url: string; blob: Blob };

const thumbUrls = new Map<string, CachedUrl>();
const resultThumbUrls = new Map<string, CachedUrl>();

/** Переиспользуем object URL, пока Blob тот же — иначе Safari мигает на revoke. */
function objectUrlFor(cache: Map<string, CachedUrl>, id: string, blob: Blob): string {
  const cached = cache.get(id);
  if (cached !== undefined && cached.blob === blob) return cached.url;
  if (cached !== undefined) URL.revokeObjectURL(cached.url);
  const url = URL.createObjectURL(blob);
  cache.set(id, { url, blob });
  return url;
}

export let visibleIds = new Set<string>();

/** itemId → presetId: после compose скачать результат этого экспорта (ПКМ «Save without background»). */
const autoDownloadPresetByItem = new Map<string, string>();

/** Тихий импорт: не показывать в UI, удалить после download/fail. */
const ephemeralItemIds = new Set<string>();

export function setAutoDownloadPreset(itemId: string, presetId: string): void {
  autoDownloadPresetByItem.set(itemId, presetId);
}

export function peekAutoDownloadPreset(itemId: string): string | undefined {
  return autoDownloadPresetByItem.get(itemId);
}

export function clearAutoDownloadPreset(itemId: string): void {
  autoDownloadPresetByItem.delete(itemId);
}

export function markEphemeral(itemId: string): void {
  ephemeralItemIds.add(itemId);
}

export function isEphemeral(itemId: string): boolean {
  return ephemeralItemIds.has(itemId);
}

export function clearEphemeral(itemId: string): void {
  ephemeralItemIds.delete(itemId);
}

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
  const thumbnailUrl = objectUrlFor(thumbUrls, item.id, item.thumbnail);

  let resultThumbnailUrl = '';
  if (item.result !== null) {
    resultThumbnailUrl = objectUrlFor(
      resultThumbUrls,
      item.id,
      item.result.thumbnail,
    );
  } else {
    const oldResult = resultThumbUrls.get(item.id);
    if (oldResult !== undefined) URL.revokeObjectURL(oldResult.url);
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
    stale: isResultStale(item.result, hash),
    override: override ?? null,
    ephemeral: ephemeralItemIds.has(item.id),
  };
}

export function releaseUrls(ids: string[]): void {
  for (const id of ids) {
    ephemeralItemIds.delete(id);
    autoDownloadPresetByItem.delete(id);
    const thumb = thumbUrls.get(id);
    if (thumb !== undefined) URL.revokeObjectURL(thumb.url);
    thumbUrls.delete(id);
    const result = resultThumbUrls.get(id);
    if (result !== undefined) URL.revokeObjectURL(result.url);
    resultThumbUrls.delete(id);
  }
}

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'QuotaExceededError';
}
