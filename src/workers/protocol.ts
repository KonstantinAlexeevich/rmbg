import type { Backend, EdgeSettings, Rect } from '../core/types';
import type { Preset } from '../core/preset/types';

// --- воркер сегментации ---

export type SegmentationRequest =
  | {
      type: 'init';
      requestId: number;
      backend: Backend;
      // ключ Cache Storage с проверенными байтами весов
      modelCacheUrl: string;
      // chrome.runtime.getURL('ort/') — воркер не трогает chrome.* сам
      ortWasmDir: string;
      warmup: boolean;
    }
  | { type: 'segment'; requestId: number; blob: Blob }
  | {
      type: 'compose';
      requestId: number;
      original: Blob;
      mask: Blob;
      coverage: Rect;
      bbox: Rect;
      edge: EdgeSettings;
      preset: Preset;
    }
  | {
      type: 'compose-compare';
      requestId: number;
      original: Blob;
      mask: Blob;
      coverage: Rect;
      bbox: Rect;
      edge: EdgeSettings;
      preset: Preset;
    };

export type SegmentPayload = {
  blob: Blob; // PNG в оттенках серого, родное разрешение прохода
  coverage: Rect;
  bbox: Rect;
  empty: boolean; // модель ничего не нашла
  secondPassEmpty: boolean; // второй проход вернул пусто, оставлен первый
  passes: 1 | 2;
  durationMs: number;
};

export type ComposePayload = {
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
};

export type ComposeComparePayload = {
  before: Blob;
  after: Blob;
  width: number;
  height: number;
};

export type SegmentationResponse =
  | {
      type: 'init-done';
      requestId: number;
      warmupMs: number;
      crossOriginIsolated: boolean;
      wasmThreads: number;
    }
  | { type: 'segment-done'; requestId: number; payload: SegmentPayload }
  | { type: 'compose-done'; requestId: number; payload: ComposePayload }
  | { type: 'compose-compare-done'; requestId: number; payload: ComposeComparePayload }
  | { type: 'error'; requestId: number; message: string };

// --- воркер экспорта ---

export type ExportRequest = {
  type: 'zip';
  requestId: number;
  // id элементов в порядке добавления; воркер читает блобы из IndexedDB
  // по одному, а не получает всю пачку в память разом
  itemIds: string[];
  // пресеты для экспорта — каждый в своей папке архива
  presets: Preset[];
  edge: EdgeSettings;
  // для активного пресета со свежим result берём кэш из IndexedDB
  activePresetId: string;
};

export type ExportResponse =
  | { type: 'zip-progress'; requestId: number; done: number; total: number }
  | { type: 'zip-done'; requestId: number; blob: Blob; fileName: string }
  | { type: 'error'; requestId: number; message: string };
