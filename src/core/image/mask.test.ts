import { describe, expect, it } from 'vitest';
import { refineMaskAlpha } from './mask';

function rgba(width: number, height: number, alpha: number[][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = alpha[y]![x]!;
    }
  }
  return data;
}

function alphas(data: Uint8ClampedArray, width: number, height: number): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(data[(y * width + x) * 4 + 3]!);
    }
    out.push(row);
  }
  return out;
}

describe('refineMaskAlpha', () => {
  it('no-ops when threshold and erode are zero', () => {
    const data = rgba(2, 2, [
      [10, 20],
      [30, 40],
    ]);
    refineMaskAlpha(data, 2, 2, { threshold: 0, erode: 0 });
    expect(alphas(data, 2, 2)).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it('zeros alpha below threshold', () => {
    const data = rgba(3, 1, [[50, 128, 200]]);
    refineMaskAlpha(data, 3, 1, { threshold: 0.5, erode: 0 });
    // cutoff = round(0.5 * 255) = 128 → < 128 cleared
    expect(alphas(data, 3, 1)).toEqual([[0, 128, 200]]);
  });

  it('erodes solid block by one pixel (3x3 min)', () => {
    // 5x5: solid center 3x3 of 255, rest 0 → one erode leaves only center pixel
    const a = [
      [0, 0, 0, 0, 0],
      [0, 255, 255, 255, 0],
      [0, 255, 255, 255, 0],
      [0, 255, 255, 255, 0],
      [0, 0, 0, 0, 0],
    ];
    const data = rgba(5, 5, a);
    refineMaskAlpha(data, 5, 5, { threshold: 0, erode: 1 });
    expect(alphas(data, 5, 5)).toEqual([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 255, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
  });

  it('applies threshold before erode', () => {
    const a = [
      [50, 50, 50, 50, 50],
      [50, 200, 200, 200, 50],
      [50, 200, 200, 200, 50],
      [50, 200, 200, 200, 50],
      [50, 50, 50, 50, 50],
    ];
    const ordered = rgba(5, 5, a);
    refineMaskAlpha(ordered, 5, 5, { threshold: 0.5, erode: 1 });
    // threshold clears 50-halo → solid 3×3 → erode leaves center
    expect(alphas(ordered, 5, 5)).toEqual([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 200, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);

    const erodeOnly = rgba(5, 5, a);
    refineMaskAlpha(erodeOnly, 5, 5, { threshold: 0, erode: 1 });
    // without threshold the 50-halo survives into former block corners
    expect(alphas(erodeOnly, 5, 5)[1]![1]).toBe(50);
  });

  it('rounds fractional erode steps', () => {
    const a = [
      [0, 0, 0],
      [0, 255, 0],
      [0, 0, 0],
    ];
    const data = rgba(3, 3, a);
    refineMaskAlpha(data, 3, 3, { threshold: 0, erode: 0.4 });
    // round(0.4) = 0 → unchanged
    expect(alphas(data, 3, 3)).toEqual(a);
  });
});
