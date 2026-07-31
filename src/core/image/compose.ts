import type { Rect } from '../types';
import { effectiveBackground, type Preset } from '../preset/types';
import { layoutSubject } from '../preset/layout';

// Cutout: применение альфы маски к оригиналу в исходном разрешении.
// Промежуточный артефакт, на диск не сохраняется.
export function cutout(source: ImageBitmap, mask: OffscreenCanvas): OffscreenCanvas {
  const canvas = new OffscreenCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0, source.width, source.height);
  return canvas;
}

// Композиция по пресету: фон, масштаб, позиция. bboxNorm — bbox субъекта
// в нормализованных координатах оригинала.
export function composeOnCanvas(
  cut: OffscreenCanvas,
  bboxNorm: Rect,
  preset: Preset,
): OffscreenCanvas {
  if (preset.sizeMode === 'original') {
    const canvas = new OffscreenCanvas(cut.width, cut.height);
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Не удалось создать 2d-контекст');

    const background = effectiveBackground(preset);
    if (background.kind === 'solid') {
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(cut, 0, 0);
    return canvas;
  }

  const bboxPx: Rect = {
    x: bboxNorm.x * cut.width,
    y: bboxNorm.y * cut.height,
    width: Math.max(1, bboxNorm.width * cut.width),
    height: Math.max(1, bboxNorm.height * cut.height),
  };

  const canvas = new OffscreenCanvas(preset.canvas.width, preset.canvas.height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');

  const background = effectiveBackground(preset);
  if (background.kind === 'solid') {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const { dest } = layoutSubject(bboxPx, preset);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    cut,
    bboxPx.x,
    bboxPx.y,
    bboxPx.width,
    bboxPx.height,
    dest.x,
    dest.y,
    dest.width,
    dest.height,
  );
  return canvas;
}

// «До» для слайдера: тот же scale/смещение, что у результата (bbox → dest),
// но рисуем весь оригинал — края кадра продолжаются в поля холста.
export function composeCompareBefore(
  source: ImageBitmap,
  bboxNorm: Rect,
  preset: Preset,
): OffscreenCanvas {
  if (preset.sizeMode === 'original') {
    const canvas = new OffscreenCanvas(source.width, source.height);
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  const bboxPx: Rect = {
    x: bboxNorm.x * source.width,
    y: bboxNorm.y * source.height,
    width: Math.max(1, bboxNorm.width * source.width),
    height: Math.max(1, bboxNorm.height * source.height),
  };

  const canvas = new OffscreenCanvas(preset.canvas.width, preset.canvas.height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');

  const { dest, scale } = layoutSubject(bboxPx, preset);
  const ox = dest.x - bboxPx.x * scale;
  const oy = dest.y - bboxPx.y * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, ox, oy, source.width * scale, source.height * scale);
  return canvas;
}
