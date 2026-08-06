import type { EdgeSettings, Rect } from '../types';

// Разворачивание маски из родного разрешения прохода в полное разрешение
// оригинала: канва размера оригинала, вне coverage остаётся нулевая альфа.
// Возвращает канву, у которой маска лежит в альфа-канале (для destination-in).
export function expandMask(
  mask: ImageBitmap,
  coverage: Rect,
  width: number,
  height: number,
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    mask,
    Math.round(coverage.x * width),
    Math.round(coverage.y * height),
    Math.round(coverage.width * width),
    Math.round(coverage.height * height),
  );

  // маска хранится оттенками серого — переносим значение в альфа-канал;
  // существующая альфа (полупрозрачный край coverage после сглаживания)
  // учитывается множителем
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = Math.round((data[i]! * data[i + 3]!) / 255);
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Threshold → erode по альфа-каналу RGBA-буфера (in-place).
 * Feather остаётся в refineMask (нужен canvas blur).
 */
export function refineMaskAlpha(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edge: Pick<EdgeSettings, 'threshold' | 'erode'>,
): void {
  const erodeSteps = Math.round(edge.erode);
  if (edge.threshold <= 0 && erodeSteps <= 0) return;

  if (edge.threshold > 0) {
    const cutoff = Math.round(edge.threshold * 255);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! < cutoff) data[i] = 0;
    }
  }

  // поджатие внутрь: минимум по окну 3x3, N раз;
  // убирает светлый ореол от старого фона по контуру
  if (erodeSteps > 0) {
    let alpha = new Uint8ClampedArray(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]!;
    let next = new Uint8ClampedArray(width * height);
    for (let step = 0; step < erodeSteps; step++) {
      for (let y = 0; y < height; y++) {
        const y0 = Math.max(0, y - 1);
        const y1 = Math.min(height - 1, y + 1);
        for (let x = 0; x < width; x++) {
          const x0 = Math.max(0, x - 1);
          const x1 = Math.min(width - 1, x + 1);
          let min = 255;
          for (let yy = y0; yy <= y1; yy++) {
            for (let xx = x0; xx <= x1; xx++) {
              const v = alpha[yy * width + xx]!;
              if (v < min) min = v;
            }
          }
          next[y * width + x] = min;
        }
      }
      [alpha, next] = [next, alpha];
    }
    for (let i = 0; i < alpha.length; i++) data[i * 4 + 3] = alpha[i]!;
  }
}

// Уточнение края: threshold → erode → feather, именно в этом порядке.
// Применяется к полноразмерной маске, поэтому полностью обратимо.
export function refineMask(mask: OffscreenCanvas, edge: EdgeSettings): OffscreenCanvas {
  const ctx = mask.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
  const { width, height } = mask;

  const erodeSteps = Math.round(edge.erode);
  if (edge.threshold > 0 || erodeSteps > 0) {
    const image = ctx.getImageData(0, 0, width, height);
    refineMaskAlpha(image.data, width, height, edge);
    ctx.putImageData(image, 0, 0);
  }

  // сглаживание кромки — аппаратный blur при перерисовке, дёшево
  if (edge.feather > 0) {
    const blurred = new OffscreenCanvas(width, height);
    const blurCtx = blurred.getContext('2d');
    if (blurCtx === null) throw new Error('Не удалось создать 2d-контекст');
    blurCtx.filter = `blur(${edge.feather}px)`;
    blurCtx.drawImage(mask, 0, 0);
    return blurred;
  }

  return mask;
}
