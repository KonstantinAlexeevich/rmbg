import type { EdgeSettings, ModelAsset } from '../types';
import { defaultPreset, type Preset } from '../preset/types';

export type Settings = {
  version: 1;
  presets: Preset[];
  activePresetId: string;
  // пресеты, по которым идёт экспорт ZIP (каждый — своя папка)
  exportPresetIds: string[];
  edge: EdgeSettings;
  ui: { locale: 'ru' | 'en' };
  backendOverride: 'auto' | 'webgpu' | 'wasm'; // для диагностики
  modelAssets: ModelAsset[]; // скачанные варианты; пустой массив = ещё ничего нет
};

const STORAGE_KEY = 'settings';

export function defaultSettings(): Settings {
  const preset = defaultPreset();
  return {
    version: 1,
    presets: [preset],
    activePresetId: preset.id,
    exportPresetIds: [preset.id],
    edge: { threshold: 0, erode: 1, feather: 0 },
    ui: { locale: 'ru' },
    backendOverride: 'auto',
    modelAssets: [],
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Settings | undefined;
  if (value === undefined || value.version !== 1) return defaultSettings();
  return migrateSettings(value);
}

function migrateSettings(value: Settings): Settings {
  const rawPresets = value.presets.length > 0 ? value.presets : [defaultPreset()];
  // старые пресеты без sizeMode считаем fixed — сохраняем прежнее поведение
  const presets = rawPresets.map((p) =>
    p.sizeMode === 'original' || p.sizeMode === 'fixed'
      ? p
      : { ...p, sizeMode: 'fixed' as const },
  );
  const [fallback] = presets;
  if (fallback === undefined) throw new Error('Нет пресетов');
  const activePresetId = presets.some((p) => p.id === value.activePresetId)
    ? value.activePresetId
    : fallback.id;

  const rawExport = Array.isArray(value.exportPresetIds) ? value.exportPresetIds : [];
  const exportPresetIds = rawExport.filter((id) => presets.some((p) => p.id === id));
  const locale = value.ui?.locale === 'en' ? 'en' : 'ru';
  return {
    ...value,
    presets,
    activePresetId,
    exportPresetIds: exportPresetIds.length > 0 ? exportPresetIds : [activePresetId],
    ui: { locale },
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

export function activePreset(settings: Settings): Preset {
  const preset = settings.presets.find((p) => p.id === settings.activePresetId);
  if (preset === undefined) {
    throw new Error(`Активный пресет ${settings.activePresetId} не найден`);
  }
  return preset;
}

export function exportPresets(settings: Settings): Preset[] {
  return settings.exportPresetIds
    .map((id) => settings.presets.find((p) => p.id === id))
    .filter((p): p is Preset => p !== undefined);
}

// один пресет — всегда он; несколько — только отмеченные в exportPresetIds
export function resolveExportPresets(settings: Settings): Preset[] {
  if (settings.presets.length <= 1) return settings.presets;
  return exportPresets(settings);
}

export function duplicatePreset(preset: Preset): Preset {
  return {
    ...preset,
    id: crypto.randomUUID(),
    name: `${preset.name} (копия)`,
    canvas: { ...preset.canvas },
    fit: {
      ...preset.fit,
      margin: { ...preset.fit.margin },
    },
    background:
      preset.background.kind === 'solid'
        ? { kind: 'solid', color: preset.background.color }
        : { kind: 'transparent' },
    output: { ...preset.output },
  };
}

export function addPreset(settings: Settings): Settings {
  const copy = duplicatePreset(activePreset(settings));
  return {
    ...settings,
    presets: [...settings.presets, copy],
    activePresetId: copy.id,
    exportPresetIds: [...settings.exportPresetIds, copy.id],
  };
}

export function removePreset(settings: Settings, id: string): Settings {
  if (settings.presets.length <= 1) return settings;
  const presets = settings.presets.filter((p) => p.id !== id);
  const [fallback] = presets;
  if (fallback === undefined) return settings;
  let activePresetId = settings.activePresetId;
  if (activePresetId === id) {
    activePresetId = fallback.id;
  }
  const exportPresetIds = settings.exportPresetIds.filter((x) => x !== id);
  return {
    ...settings,
    presets,
    activePresetId,
    exportPresetIds: exportPresetIds.length > 0 ? exportPresetIds : [activePresetId],
  };
}

export function setActivePresetId(settings: Settings, id: string): Settings {
  if (!settings.presets.some((p) => p.id === id)) return settings;
  return { ...settings, activePresetId: id };
}

export function toggleExportPresetId(settings: Settings, id: string): Settings {
  if (!settings.presets.some((p) => p.id === id)) return settings;
  const has = settings.exportPresetIds.includes(id);
  if (has) {
    return {
      ...settings,
      exportPresetIds: settings.exportPresetIds.filter((x) => x !== id),
    };
  }
  return { ...settings, exportPresetIds: [...settings.exportPresetIds, id] };
}

export function renamePreset(settings: Settings, id: string, name: string): Settings {
  return {
    ...settings,
    presets: settings.presets.map((p) => (p.id === id ? { ...p, name } : p)),
  };
}

// Хэш той части настроек, которая влияет на пиксели результата:
// пресет без id/name плюс блок edge. Локаль и тема не входят.
export function settingsHash(preset: Preset, edge: EdgeSettings): string {
  const { id: _id, name: _name, ...pixelPreset } = preset;
  const payload = stableStringify({ preset: pixelPreset, edge });
  // djb2: криптостойкость здесь не нужна, важна стабильность
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash + payload.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}
