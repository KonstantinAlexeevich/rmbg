import { describe, expect, it } from 'vitest';
import {
  addPreset,
  migrateSettings,
  removePreset,
  renamePreset,
  resolveExportPresets,
  setActivePresetId,
  settingsHash,
  toggleExportPresetId,
  type Settings,
} from './settings';
import { defaultPreset, type Preset } from '../preset/types';

function settingsFrom(presets: Preset[], activeId = presets[0]!.id): Settings {
  return {
    version: 1,
    presets,
    activePresetId: activeId,
    exportPresetIds: presets.map((p) => p.id),
    edge: { threshold: 0, erode: 1, feather: 0 },
    ui: { locale: 'en' },
    backendOverride: 'auto',
    modelAssets: [],
  };
}

describe('preset mutations', () => {
  it('addPreset duplicates active and selects the copy', () => {
    const base = settingsFrom([defaultPreset('A')]);
    const next = addPreset(base, 'A copy');
    expect(next.presets).toHaveLength(2);
    expect(next.activePresetId).toBe(next.presets[1]!.id);
    expect(next.presets[1]!.name).toBe('A copy');
    expect(next.exportPresetIds).toContain(next.presets[1]!.id);
  });

  it('removePreset refuses to delete the last preset', () => {
    const base = settingsFrom([defaultPreset('Only')]);
    expect(removePreset(base, base.activePresetId)).toBe(base);
  });

  it('removePreset reassigns active and export ids', () => {
    const a = defaultPreset('A');
    const b = defaultPreset('B');
    const base = settingsFrom([a, b], a.id);
    const next = removePreset(base, a.id);
    expect(next.presets.map((p) => p.id)).toEqual([b.id]);
    expect(next.activePresetId).toBe(b.id);
    expect(next.exportPresetIds).toEqual([b.id]);
  });

  it('setActivePresetId / toggleExportPresetId / renamePreset', () => {
    const a = defaultPreset('A');
    const b = defaultPreset('B');
    let s = settingsFrom([a, b], a.id);

    expect(setActivePresetId(s, 'missing')).toBe(s);
    s = setActivePresetId(s, b.id);
    expect(s.activePresetId).toBe(b.id);

    s = toggleExportPresetId(s, a.id);
    expect(s.exportPresetIds).toEqual([b.id]);
    s = toggleExportPresetId(s, a.id);
    expect(s.exportPresetIds).toEqual([b.id, a.id]);

    s = renamePreset(s, a.id, 'Renamed');
    expect(s.presets.find((p) => p.id === a.id)?.name).toBe('Renamed');
  });

  it('resolveExportPresets returns all when only one preset exists', () => {
    const only = defaultPreset('Only');
    const s = settingsFrom([only]);
    s.exportPresetIds = [];
    expect(resolveExportPresets(s)).toEqual([only]);
  });
});

describe('migrateSettings', () => {
  it('maps missing sizeMode to fixed and allowUpscale to allowZoom', () => {
    const legacy = defaultPreset('Legacy') as Preset & {
      sizeMode?: Preset['sizeMode'];
      fit: Preset['fit'] & { allowUpscale?: boolean };
    };
    delete (legacy as { sizeMode?: string }).sizeMode;
    legacy.fit = {
      mode: 'contain',
      allowZoom: false,
      allowUpscale: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    };

    const migrated = migrateSettings({
      version: 1,
      presets: [legacy],
      activePresetId: 'gone',
      exportPresetIds: ['gone', legacy.id],
      edge: { threshold: 0, erode: 0, feather: 0 },
      ui: { locale: 'ru' },
      backendOverride: 'auto',
      modelAssets: [],
    });

    expect(migrated.presets[0]!.sizeMode).toBe('fixed');
    expect(migrated.presets[0]!.fit.allowZoom).toBe(true);
    expect(migrated.activePresetId).toBe(legacy.id);
    expect(migrated.exportPresetIds).toEqual([legacy.id]);
    expect(migrated.ui.locale).toBe('ru');
  });
});

describe('settingsHash', () => {
  it('ignores id/name and is stable for same pixel settings', () => {
    const a = defaultPreset('A');
    const b = { ...a, id: 'other', name: 'B' };
    const edge = { threshold: 0.1, erode: 1, feather: 2 };
    expect(settingsHash(a, edge)).toBe(settingsHash(b, edge));
  });

  it('changes when edge or canvas changes', () => {
    const p = defaultPreset('A');
    const edge = { threshold: 0, erode: 0, feather: 0 };
    expect(settingsHash(p, edge)).not.toBe(
      settingsHash(p, { ...edge, feather: 1 }),
    );
    expect(settingsHash(p, edge)).not.toBe(
      settingsHash({ ...p, canvas: { width: 1, height: 1 } }, edge),
    );
  });
});
