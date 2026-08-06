import { describe, expect, it } from 'vitest';
import { defaultPreset } from '../core/preset/types';
import type { Settings } from '../core/storage/settings';
import { resolvePresetId } from './resolve-preset-id';

function settings(): Settings {
  const a = defaultPreset('A');
  const b = defaultPreset('B');
  return {
    version: 1,
    presets: [a, b],
    activePresetId: a.id,
    exportPresetIds: [a.id],
    edge: { threshold: 0, erode: 0, feather: 0 },
    ui: { locale: 'en' },
    backendOverride: 'auto',
    modelAssets: [],
  };
}

describe('resolvePresetId', () => {
  it('keeps known ids and falls back to active', () => {
    const s = settings();
    expect(resolvePresetId(s.presets[1]!.id, s)).toBe(s.presets[1]!.id);
    expect(resolvePresetId('unknown', s)).toBe(s.activePresetId);
  });
});
