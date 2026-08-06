import { describe, expect, it } from 'vitest';
import {
  computeBbox,
  letterboxGeometry,
  secondPassRect,
  toOriginalCoords,
} from './isnet';
import { INPUT_SIZE } from './session';

function grayMask(
  width: number,
  height: number,
  paint: (set: (x: number, y: number, gray: number) => void) => void,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const set = (x: number, y: number, gray: number) => {
    const i = (y * width + x) * 4;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  };
  paint(set);
  return { width, height, data, colorSpace: 'srgb' } as ImageData;
}

describe('letterboxGeometry', () => {
  it('fits landscape into INPUT_SIZE square', () => {
    const g = letterboxGeometry(2000, 1000);
    expect(g.scale).toBe(INPUT_SIZE / 2000);
    expect(g.sw).toBe(INPUT_SIZE);
    expect(g.sh).toBe(INPUT_SIZE / 2);
    expect(g.dx).toBe(0);
    expect(g.dy).toBe((INPUT_SIZE - g.sh) / 2);
  });

  it('fits portrait into INPUT_SIZE square', () => {
    const g = letterboxGeometry(500, 1000);
    expect(g.scale).toBe(INPUT_SIZE / 1000);
    expect(g.sw).toBe(INPUT_SIZE / 2);
    expect(g.sh).toBe(INPUT_SIZE);
    expect(g.dx).toBe((INPUT_SIZE - g.sw) / 2);
    expect(g.dy).toBe(0);
  });
});

describe('computeBbox', () => {
  it('returns null for empty mask', () => {
    expect(computeBbox(grayMask(4, 4, () => undefined))).toBeNull();
  });

  it('returns normalized bounds for significant pixels', () => {
    const bbox = computeBbox(
      grayMask(10, 10, (set) => {
        set(2, 3, 200);
        set(5, 7, 128);
      }),
    );
    expect(bbox).toEqual({
      x: 0.2,
      y: 0.3,
      width: 0.4,
      height: 0.5,
    });
  });

  it('ignores pixels below threshold 128', () => {
    expect(
      computeBbox(
        grayMask(4, 4, (set) => {
          set(1, 1, 127);
        }),
      ),
    ).toBeNull();
  });
});

describe('toOriginalCoords', () => {
  it('maps coverage-local rect into original space', () => {
    expect(
      toOriginalCoords(
        { x: 0.25, y: 0.5, width: 0.5, height: 0.25 },
        { x: 0.1, y: 0.2, width: 0.8, height: 0.4 },
      ),
    ).toEqual({
      x: 0.1 + 0.25 * 0.8,
      y: 0.2 + 0.5 * 0.4,
      width: 0.5 * 0.8,
      height: 0.25 * 0.4,
    });
  });
});

describe('secondPassRect', () => {
  it('returns null when subject covers too much of the frame', () => {
    expect(
      secondPassRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, 1000, 1000),
    ).toBeNull();
  });

  it('returns a square-ish crop for a small subject', () => {
    const rect = secondPassRect(
      { x: 0.4, y: 0.4, width: 0.1, height: 0.1 },
      1000,
      1000,
    );
    expect(rect).not.toBeNull();
    if (rect === null) return;
    expect(rect.width).toBe(rect.height);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1000);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1000);
    const gain = 1000 / Math.max(rect.width, rect.height);
    expect(gain).toBeGreaterThanOrEqual(1.3);
  });

  it('returns null when gain would be too small', () => {
    // Large-but-under-area-limit subject on a small canvas → little resolution gain
    expect(
      secondPassRect({ x: 0.05, y: 0.05, width: 0.7, height: 0.7 }, 100, 100),
    ).toBeNull();
  });
});
