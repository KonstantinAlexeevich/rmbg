import { describe, expect, it } from 'vitest';
import { defaultPreset } from '../../../core/preset/types';
import type { Settings } from '../../../core/storage/settings';
import {
  computeEtaMs,
  downloadFileName,
  isResultStale,
  recomposePriorityScore,
  resolveComposePreset,
  selectExportableIds,
  selectPendingItemIds,
  selectRecomposeCandidates,
  shouldRecordRunDuration,
} from './selectors';

function settingsWith(...presets: ReturnType<typeof defaultPreset>[]): Settings {
  const [first] = presets;
  if (first === undefined) throw new Error('need presets');
  return {
    version: 1,
    presets,
    activePresetId: first.id,
    exportPresetIds: presets.map((p) => p.id),
    edge: { threshold: 0, erode: 0, feather: 0 },
    ui: { locale: 'en' },
    backendOverride: 'auto',
    modelAssets: [],
  };
}

describe('selectPendingItemIds', () => {
  it('includes queued, failed, and stale; skips clean done', () => {
    expect(
      selectPendingItemIds([
        { id: 'q', status: 'queued', stale: false },
        { id: 'f', status: 'failed', stale: false },
        { id: 's', status: 'done', stale: true },
        { id: 'd', status: 'done', stale: false },
        { id: 'g', status: 'segmenting', stale: false },
      ]),
    ).toEqual(['q', 'f', 's']);
  });
});

describe('selectExportableIds', () => {
  it('requires selected + done', () => {
    expect(
      selectExportableIds([
        { id: 'a', selected: true, status: 'done' },
        { id: 'b', selected: false, status: 'done' },
        { id: 'c', selected: true, status: 'queued' },
      ]),
    ).toEqual(['a']);
  });
});

describe('selectRecomposeCandidates', () => {
  it('filters and sorts compare > visible > rest', () => {
    const items = [
      { id: 'rest', hasMask: true, status: 'done' as const, stale: false },
      { id: 'vis', hasMask: true, status: 'done' as const, stale: true },
      { id: 'cmp', hasMask: true, status: 'done' as const, stale: true },
      { id: 'nomask', hasMask: false, status: 'done' as const, stale: true },
      { id: 'queued', hasMask: true, status: 'queued' as const, stale: false },
    ];
    const ids = selectRecomposeCandidates(items, 'cmp', new Set(['vis'])).map(
      (i) => i.id,
    );
    expect(ids).toEqual(['cmp', 'vis', 'rest']);
  });
});

describe('recomposePriorityScore / ETA / wasm warmup', () => {
  it('scores compare and visibility', () => {
    expect(recomposePriorityScore('a', 'a', new Set(['a']))).toBe(3);
    expect(recomposePriorityScore('b', 'a', new Set(['b']))).toBe(1);
    expect(recomposePriorityScore('c', 'a', new Set())).toBe(0);
  });

  it('computes ETA from rolling average', () => {
    expect(computeEtaMs([], 3)).toBe(0);
    expect(computeEtaMs([1000, 3000], 2)).toBe(4000);
  });

  it('skips first wasm run in duration samples', () => {
    expect(shouldRecordRunDuration(false, 1)).toBe(true);
    expect(shouldRecordRunDuration(true, 1)).toBe(false);
    expect(shouldRecordRunDuration(true, 2)).toBe(true);
  });
});

describe('resolveComposePreset / stale / downloadFileName', () => {
  it('prefers auto preset when present', () => {
    const a = defaultPreset('A');
    const b = defaultPreset('B');
    const settings = settingsWith(a, b);
    expect(resolveComposePreset(settings, b.id).id).toBe(b.id);
    expect(resolveComposePreset(settings, 'missing').id).toBe(a.id);
    expect(resolveComposePreset(settings, undefined).id).toBe(a.id);
  });

  it('detects stale results', () => {
    expect(isResultStale(null, 'h')).toBe(false);
    expect(isResultStale({ settingsHash: 'h' }, 'h')).toBe(false);
    expect(isResultStale({ settingsHash: 'old' }, 'h')).toBe(true);
  });

  it('builds download names with format extension', () => {
    expect(downloadFileName('photo.JPEG', 'png')).toBe('photo.png');
    expect(downloadFileName('a.b.webp', 'jpeg')).toBe('a.b.jpg');
  });
});
