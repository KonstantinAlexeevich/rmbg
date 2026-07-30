import type { Rect } from '../types';
import type { Preset } from './types';

export type Placement = {
  // прямоугольник на холсте пресета, в который рисуется bbox субъекта
  dest: Rect;
  scale: number;
};

// Расчёт масштаба и позиции субъекта на холсте пресета.
// bboxPx — bbox субъекта в пикселях исходника.
export function layoutSubject(bboxPx: Rect, preset: Preset): Placement {
  const { width: cw, height: ch } = preset.canvas;
  const { margin, mode, allowUpscale } = preset.fit;

  const availW = cw - (margin.left + margin.right) * cw;
  const availH = ch - (margin.top + margin.bottom) * ch;

  let scale =
    mode === 'cover-width'
      ? availW / bboxPx.width
      : Math.min(availW / bboxPx.width, availH / bboxPx.height);
  if (!allowUpscale) scale = Math.min(scale, 1);

  const destW = bboxPx.width * scale;
  const destH = bboxPx.height * scale;

  // по горизонтали — всегда центр доступной области
  const areaLeft = margin.left * cw;
  const x = areaLeft + (availW - destW) / 2;

  const areaTop = margin.top * ch;
  let y: number;
  switch (preset.anchor) {
    case 'top':
      y = areaTop;
      break;
    case 'bottom':
      y = areaTop + availH - destH;
      break;
    case 'center':
      y = areaTop + (availH - destH) / 2;
      break;
  }

  return { dest: { x, y, width: destW, height: destH }, scale };
}
