import type { EdgeSettings } from '../types';
import type { Background, Preset } from './types';

// Слепок настроек для одной картинки в одном пресете.
// output и name остаются пресетными — формат в папке архива предсказуем.
export type ItemOverride = {
  presetId: string;
  sizeMode: Preset['sizeMode'];
  canvas: Preset['canvas'];
  fit: Preset['fit'];
  anchor: Preset['anchor'];
  background: Background;
  edge: EdgeSettings;
};

export function createOverride(preset: Preset, edge: EdgeSettings): ItemOverride {
  return {
    presetId: preset.id,
    sizeMode: preset.sizeMode,
    canvas: { ...preset.canvas },
    fit: {
      ...preset.fit,
      margin: { ...preset.fit.margin },
    },
    anchor: preset.anchor,
    background:
      preset.background.kind === 'solid'
        ? { kind: 'solid', color: preset.background.color }
        : { kind: 'transparent' },
    edge: { ...edge },
  };
}

export function findOverride(
  overrides: ItemOverride[],
  presetId: string,
): ItemOverride | undefined {
  return overrides.find((o) => o.presetId === presetId);
}

export function putOverride(
  overrides: ItemOverride[],
  next: ItemOverride,
): ItemOverride[] {
  const without = overrides.filter((o) => o.presetId !== next.presetId);
  return [...without, next];
}

export function dropOverride(
  overrides: ItemOverride[],
  presetId: string,
): ItemOverride[] {
  return overrides.filter((o) => o.presetId !== presetId);
}

export function dropOverridesForPreset(
  overrides: ItemOverride[],
  presetId: string,
): ItemOverride[] {
  return dropOverride(overrides, presetId);
}

// Всегда возвращает готовую пару: при наличии слепка поля пресета
// (кроме id/name/output) и edge берутся из него.
export function resolveComposition(
  preset: Preset,
  edge: EdgeSettings,
  overrides: ItemOverride[],
): { preset: Preset; edge: EdgeSettings } {
  const override = findOverride(overrides, preset.id);
  if (override === undefined) return { preset, edge };
  return {
    preset: {
      ...preset,
      sizeMode: override.sizeMode,
      canvas: { ...override.canvas },
      fit: {
        ...override.fit,
        margin: { ...override.fit.margin },
      },
      anchor: override.anchor,
      background:
        override.background.kind === 'solid'
          ? { kind: 'solid', color: override.background.color }
          : { kind: 'transparent' },
    },
    edge: { ...override.edge },
  };
}
