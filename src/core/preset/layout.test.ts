import { describe, expect, it } from 'vitest';
import { layoutSubject } from './layout';
import type { Preset } from './types';

function fixedPreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p1',
    name: 'Test',
    sizeMode: 'fixed',
    canvas: { width: 1000, height: 1000 },
    fit: {
      margin: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
      mode: 'contain',
      allowZoom: false,
    },
    anchor: 'center',
    background: { kind: 'transparent' },
    output: { format: 'png', quality: 0.92 },
    ...overrides,
  };
}

describe('layoutSubject', () => {
  it('contains without upscaling when allowZoom is false', () => {
    const { dest, scale } = layoutSubject(
      { x: 0, y: 0, width: 400, height: 200 },
      fixedPreset(),
    );
    // avail 800x800 → scale would be 2, clamped to 1
    expect(scale).toBe(1);
    expect(dest.width).toBe(400);
    expect(dest.height).toBe(200);
    expect(dest.x).toBe(300); // centered in [100, 900]
    expect(dest.y).toBe(400);
  });

  it('allows upscale when allowZoom is true', () => {
    const { scale } = layoutSubject(
      { x: 0, y: 0, width: 400, height: 200 },
      fixedPreset({ fit: { margin: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 }, mode: 'contain', allowZoom: true } }),
    );
    expect(scale).toBe(2);
  });

  it('cover-width uses width-only scale', () => {
    const { scale, dest } = layoutSubject(
      { x: 0, y: 0, width: 400, height: 800 },
      fixedPreset({
        fit: {
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          mode: 'cover-width',
          allowZoom: true,
        },
        anchor: 'top',
      }),
    );
    expect(scale).toBe(2.5);
    expect(dest.width).toBe(1000);
    expect(dest.height).toBe(2000);
    expect(dest.y).toBe(0);
  });

  it('anchors top / bottom / center', () => {
    const bbox = { x: 0, y: 0, width: 200, height: 100 };
    const base = fixedPreset({
      fit: {
        margin: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
        mode: 'contain',
        allowZoom: false,
      },
    });

    expect(layoutSubject(bbox, { ...base, anchor: 'top' }).dest.y).toBe(100);
    expect(layoutSubject(bbox, { ...base, anchor: 'bottom' }).dest.y).toBe(800);
    expect(layoutSubject(bbox, { ...base, anchor: 'center' }).dest.y).toBe(450);
  });
});
