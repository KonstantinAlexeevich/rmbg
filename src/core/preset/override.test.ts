import { describe, expect, it } from 'vitest';
import {
  createOverride,
  dropOverride,
  findOverride,
  putOverride,
  resolveComposition,
} from './override';
import type { Preset } from './types';
import type { EdgeSettings } from '../types';

const edge: EdgeSettings = { threshold: 0.1, erode: 2, feather: 1 };

function preset(partial: Partial<Preset> = {}): Preset {
  return {
    id: 'default',
    name: 'Default',
    sizeMode: 'original',
    canvas: { width: 1200, height: 1600 },
    fit: {
      margin: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
      mode: 'contain',
      allowZoom: false,
    },
    anchor: 'center',
    background: { kind: 'transparent' },
    output: { format: 'png', quality: 0.92 },
    ...partial,
  };
}

describe('override helpers', () => {
  it('createOverride snapshots preset + edge without output/name', () => {
    const o = createOverride(
      preset({
        sizeMode: 'fixed',
        background: { kind: 'solid', color: '#112233' },
        fit: {
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          mode: 'cover-width',
          allowZoom: true,
        },
      }),
      edge,
    );
    expect(o.presetId).toBe('default');
    expect(o.sizeMode).toBe('fixed');
    expect(o.background).toEqual({ kind: 'solid', color: '#112233' });
    expect(o.fit.allowZoom).toBe(true);
    expect(o.edge).toEqual(edge);
  });

  it('putOverride replaces by presetId; dropOverride removes', () => {
    const a = createOverride(preset(), edge);
    const b = createOverride(preset({ id: 'other' }), { ...edge, erode: 0 });
    const withBoth = putOverride([a], b);
    expect(withBoth).toHaveLength(2);

    const replaced = putOverride(withBoth, { ...a, edge: { ...edge, feather: 9 } });
    expect(replaced).toHaveLength(2);
    expect(findOverride(replaced, 'default')?.edge.feather).toBe(9);

    expect(dropOverride(replaced, 'default')).toEqual([b]);
  });

  it('resolveComposition returns base when no override', () => {
    const p = preset();
    expect(resolveComposition(p, edge, [])).toEqual({ preset: p, edge });
  });

  it('resolveComposition applies override and legacy allowUpscale', () => {
    const p = preset({ id: 'p1' });
    const override = createOverride(
      preset({
        id: 'p1',
        sizeMode: 'fixed',
        anchor: 'top',
        background: { kind: 'solid', color: '#fff' },
      }),
      { threshold: 0.2, erode: 0, feather: 3 },
    );
    // legacy field still accepted via resolveAllowZoom
    (override.fit as { allowUpscale?: boolean }).allowUpscale = true;
    override.fit.allowZoom = false;

    const resolved = resolveComposition(p, edge, [override]);
    expect(resolved.preset.sizeMode).toBe('fixed');
    expect(resolved.preset.anchor).toBe('top');
    expect(resolved.preset.fit.allowZoom).toBe(true);
    expect(resolved.edge.feather).toBe(3);
    expect(resolved.preset.output).toEqual(p.output);
  });
});
