import { describe, expect, it } from 'vitest';
import { letterboxGeometry, postprocess } from './isnet';
import { INPUT_SIZE } from './session';

describe('postprocess', () => {
  it('crops letterbox and min-max normalizes to gray', () => {
    const geometry = letterboxGeometry(100, 50);
    const output = new Float32Array(INPUT_SIZE * INPUT_SIZE);
    // fill content region with gradient values
    for (let y = 0; y < geometry.sh; y++) {
      for (let x = 0; x < geometry.sw; x++) {
        output[(y + geometry.dy) * INPUT_SIZE + (x + geometry.dx)] =
          x + y * 0.01;
      }
    }
    const mask = postprocess(output, geometry);
    expect(mask.width).toBe(geometry.sw);
    expect(mask.height).toBe(geometry.sh);
    // corners of content: low → ~0, high → ~255
    expect(mask.data[0]).toBeLessThan(40);
    const last = ((geometry.sh - 1) * geometry.sw + (geometry.sw - 1)) * 4;
    expect(mask.data[last]).toBeGreaterThan(200);
  });
});
