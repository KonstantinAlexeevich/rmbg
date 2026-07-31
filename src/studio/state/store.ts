import { create } from 'zustand';
import type { Backend, ItemStatus } from '../../core/types';
import { defaultSettings, type Settings } from '../../core/storage/settings';

// Проекция ItemRecord для интерфейса: блобы остаются в IndexedDB,
// в памяти живут только миниатюры (object URL).
export type ItemView = {
  id: string;
  name: string;
  status: ItemStatus;
  error: string;
  selected: boolean;
  width: number;
  height: number;
  thumbnailUrl: string;
  resultThumbnailUrl: string; // '' = результата ещё нет
  hasMask: boolean;
  maskEmpty: boolean;
  stale: boolean;
};

export type ModelPhase =
  | { phase: 'detecting' }
  | { phase: 'downloading'; loadedBytes: number; totalBytes: number }
  | { phase: 'verifying' }
  | { phase: 'creating' } // создание сессии и прогрев
  | { phase: 'ready' }
  | { phase: 'evicted' } // кэш вытеснен браузером, нужно скачать снова
  | { phase: 'canceled' } // пользователь отменил загрузку
  | { phase: 'failed'; reason: 'network' | 'hash-mismatch' | 'session'; message: string };

export type Diagnostics = {
  adapterName: string;
  crossOriginIsolated: boolean;
  wasmThreads: number;
  modelUrl: string;
  downloadMs: number;
  warmupMs: number;
  lastRunMs: number;
  fallbackReason: string; // пустая строка = фолбэка не было
};

export type BatchProgress = {
  running: boolean;
  done: number;
  total: number;
  etaMs: number; // 0 = оценки ещё нет
  stopRequested: boolean;
};

export type ExportProgress = {
  running: boolean;
  done: number;
  total: number;
};

export type Toast = {
  id: number;
  kind: 'info' | 'warning' | 'error';
  text: string;
};

type StudioState = {
  settings: Settings;
  settingsLoaded: boolean;
  items: ItemView[];
  backend: Backend;
  model: ModelPhase;
  diagnostics: Diagnostics;
  batch: BatchProgress;
  exporting: ExportProgress;
  toasts: Toast[];
  compareItemId: string; // '' = модалка закрыта
  diagnosticsOpen: boolean;
  exportPickerOpen: boolean;
  processRequested: boolean; // файлы добавлены до готовности модели

  setSettings: (settings: Settings) => void;
  setItems: (items: ItemView[]) => void;
  upsertItem: (item: ItemView) => void;
  patchItem: (id: string, patch: Partial<ItemView>) => void;
  removeItems: (ids: string[]) => void;
  setBackend: (backend: Backend) => void;
  setModel: (model: ModelPhase) => void;
  patchDiagnostics: (patch: Partial<Diagnostics>) => void;
  setBatch: (patch: Partial<BatchProgress>) => void;
  setExporting: (patch: Partial<ExportProgress>) => void;
  addToast: (kind: Toast['kind'], text: string) => void;
  dismissToast: (id: number) => void;
  setCompareItemId: (id: string) => void;
  setDiagnosticsOpen: (open: boolean) => void;
  setExportPickerOpen: (open: boolean) => void;
  setProcessRequested: (requested: boolean) => void;
};

let nextToastId = 1;

export const useStudioStore = create<StudioState>((set) => ({
  settings: defaultSettings(),
  settingsLoaded: false,
  items: [],
  backend: 'wasm',
  model: { phase: 'detecting' },
  diagnostics: {
    adapterName: '',
    crossOriginIsolated: false,
    wasmThreads: 1,
    modelUrl: '',
    downloadMs: 0,
    warmupMs: 0,
    lastRunMs: 0,
    fallbackReason: '',
  },
  batch: { running: false, done: 0, total: 0, etaMs: 0, stopRequested: false },
  exporting: { running: false, done: 0, total: 0 },
  toasts: [],
  compareItemId: '',
  diagnosticsOpen: false,
  exportPickerOpen: false,
  processRequested: false,

  setSettings: (settings) => set({ settings, settingsLoaded: true }),
  setItems: (items) => set({ items }),
  upsertItem: (item) =>
    set((state) => {
      const index = state.items.findIndex((i) => i.id === item.id);
      if (index < 0) return { items: [...state.items, item] };
      const items = state.items.slice();
      items[index] = item;
      return { items };
    }),
  patchItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  removeItems: (ids) =>
    set((state) => ({ items: state.items.filter((i) => !ids.includes(i.id)) })),
  setBackend: (backend) => set({ backend }),
  setModel: (model) => set({ model }),
  patchDiagnostics: (patch) =>
    set((state) => ({ diagnostics: { ...state.diagnostics, ...patch } })),
  setBatch: (patch) => set((state) => ({ batch: { ...state.batch, ...patch } })),
  setExporting: (patch) =>
    set((state) => ({ exporting: { ...state.exporting, ...patch } })),
  addToast: (kind, text) =>
    set((state) => ({
      toasts: [...state.toasts, { id: nextToastId++, kind, text }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  setCompareItemId: (id) => set({ compareItemId: id }),
  setDiagnosticsOpen: (open) => set({ diagnosticsOpen: open }),
  setExportPickerOpen: (open) => set({ exportPickerOpen: open }),
  setProcessRequested: (requested) => set({ processRequested: requested }),
}));
