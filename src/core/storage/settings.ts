import type { EdgeSettings, ModelAsset } from '../types';
import { defaultPreset, type Preset } from '../preset/types';

export type Settings = {
  version: 1;
  presets: Preset[]; // в v1 ровно один пользовательский пресет
  activePresetId: string;
  edge: EdgeSettings;
  ui: { locale: 'ru' | 'en'; theme: 'system' | 'light' | 'dark' };
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
    edge: { threshold: 0, erode: 1, feather: 0 },
    ui: { locale: 'ru', theme: 'system' },
    backendOverride: 'auto',
    modelAssets: [],
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Settings | undefined;
  if (value === undefined || value.version !== 1) return defaultSettings();
  return value;
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

// Хэш той части настроек, которая влияет на пиксели результата:
// пресет целиком плюс блок edge. Локаль и тема не входят.
export function settingsHash(preset: Preset, edge: EdgeSettings): string {
  const payload = stableStringify({ preset, edge });
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
