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
