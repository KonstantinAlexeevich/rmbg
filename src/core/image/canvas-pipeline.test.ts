import { describe, expect, it } from 'vitest';
import { composeOnCanvas, cutout } from './compose';
import { expandMask, refineMask } from './mask';
import type { Preset } from '../preset/types';

async function solidBitmap(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d');
  ctx.fillStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] / 255})`;
  ctx.fillRect(0, 0, width, height);
  return createImageBitmap(canvas);
}

function alphaAt(canvas: OffscreenCanvas, x: number, y: number): number {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d');
  return ctx.getImageData(x, y, 1, 1).data[3]!;
}

function grayMaskBitmap(width: number, height: number, gray: number): Promise<ImageBitmap> {
  return solidBitmap(width, height, [gray, gray, gray, 255]);
}

const fixedPreset: Preset = {
  id: 'p',
  name: 'p',
  sizeMode: 'fixed',
  canvas: { width: 40, height: 40 },
  fit: {
    margin: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 },
    mode: 'contain',
    allowZoom: true,
  },
  anchor: 'center',
  background: { kind: 'solid', color: '#ff0000' },
  output: { format: 'png', quality: 0.9 },
};

describe('expandMask', () => {
  it('places mask alpha into coverage region', async () => {
    const mask = await grayMaskBitmap(4, 4, 200);
    const expanded = expandMask(
      mask,
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      8,
      8,
    );
    // outside coverage → alpha 0
    expect(alphaAt(expanded, 0, 0)).toBe(0);
    // inside coverage → gray mapped to alpha (~200)
    expect(alphaAt(expanded, 4, 4)).toBeGreaterThan(150);
    mask.close();
  });
});

describe('refineMask feather', () => {
  it('returns a new canvas when feather > 0', async () => {
    const canvas = new OffscreenCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('no 2d');
    const image = ctx.createImageData(8, 8);
    for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
    ctx.putImageData(image, 0, 0);

    const out = refineMask(canvas, { threshold: 0, erode: 0, feather: 1 });
    expect(out).not.toBe(canvas);
    expect(out.width).toBe(8);
  });
});

describe('cutout / composeOnCanvas', () => {
  it('applies mask alpha via destination-in', async () => {
    const source = await solidBitmap(4, 4, [0, 255, 0, 255]);
    const maskCanvas = new OffscreenCanvas(4, 4);
    const mctx = maskCanvas.getContext('2d');
    if (mctx === null) throw new Error('no 2d');
    const image = mctx.createImageData(4, 4);
    // left half opaque, right half transparent
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        image.data[i + 3] = x < 2 ? 255 : 0;
      }
    }
    mctx.putImageData(image, 0, 0);

    const cut = cutout(source, maskCanvas);
    expect(alphaAt(cut, 0, 0)).toBe(255);
    expect(alphaAt(cut, 3, 0)).toBe(0);
    source.close();
  });

  it('composites subject onto solid fixed canvas', async () => {
    const cut = new OffscreenCanvas(20, 20);
    const ctx = cut.getContext('2d');
    if (ctx === null) throw new Error('no 2d');
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, 20, 20);

    const out = composeOnCanvas(
      cut,
      { x: 0, y: 0, width: 1, height: 1 },
      fixedPreset,
    );
    expect(out.width).toBe(40);
    expect(out.height).toBe(40);
    // 25% margin → subject in center 20×20; corner stays solid red
    const corner = out.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    const center = out.getContext('2d')!.getImageData(20, 20, 1, 1).data;
    expect(corner[0]).toBeGreaterThan(200);
    expect(corner[1]).toBeLessThan(50);
    expect(center[1]).toBeGreaterThan(200);
  });
});
