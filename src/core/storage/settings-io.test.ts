import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  activePreset,
  duplicatePreset,
  exportPresets,
} from './settings';
import { defaultPreset } from '../preset/types';

afterEach(() => {
  localStorage.clear();
});

describe('loadSettings / saveSettings', () => {
  it('returns defaults when storage empty', async () => {
    const settings = await loadSettings();
    expect(settings.version).toBe(1);
    expect(settings.presets).toHaveLength(1);
    expect(settings.activePresetId).toBe(settings.presets[0]!.id);
  });

  it('round-trips through localStorage', async () => {
    const settings = defaultSettings();
    settings.presets[0]!.name = 'Saved';
    await saveSettings(settings);
    const loaded = await loadSettings();
    expect(loaded.presets[0]!.name).toBe('Saved');
    expect(loaded.activePresetId).toBe(settings.activePresetId);
  });

  it('migrates corrupt / wrong version to defaults', async () => {
    localStorage.setItem('rmbg:settings', JSON.stringify({ version: 99 }));
    const settings = await loadSettings();
    expect(settings.version).toBe(1);
    expect(settings.presets.length).toBeGreaterThan(0);
  });
});

describe('activePreset / exportPresets / duplicatePreset', () => {
  it('activePreset throws when id missing', () => {
    const settings = defaultSettings();
    settings.activePresetId = 'gone';
    expect(() => activePreset(settings)).toThrow(/не найден/);
  });

  it('exportPresets skips orphan ids', () => {
    const settings = defaultSettings();
    settings.exportPresetIds = [settings.activePresetId, 'orphan'];
    expect(exportPresets(settings)).toHaveLength(1);
  });

  it('duplicatePreset clones with new id and name', () => {
    const src = defaultPreset('Src');
    const copy = duplicatePreset(src, 'Copy');
    expect(copy.id).not.toBe(src.id);
    expect(copy.name).toBe('Copy');
    expect(copy.canvas).toEqual(src.canvas);
    expect(copy.canvas).not.toBe(src.canvas);
  });
});
