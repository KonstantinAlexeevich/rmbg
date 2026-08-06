import type { Settings } from '../core/storage/settings';

/** Неизвестный presetId из ПКМ → активный пресет студии. */
export function resolvePresetId(requested: string, settings: Settings): string {
  if (settings.presets.some((p) => p.id === requested)) return requested;
  return settings.activePresetId;
}
