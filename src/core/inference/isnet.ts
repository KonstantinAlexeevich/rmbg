import type { Rect } from '../types';
import { INPUT_SIZE } from './session';

// Геометрия letterbox: кадр вписан целиком, недостающее до квадрата — поля.
export type LetterboxGeometry = {
  scale: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
};

export function letterboxGeometry(width: number, height: number): LetterboxGeometry {
  const scale = Math.min(INPUT_SIZE / width, INPUT_SIZE / height);
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);
  const dx = Math.floor((INPUT_SIZE - sw) / 2);
  const dy = Math.floor((INPUT_SIZE - sh) / 2);
  return { scale, sw, sh, dx, dy };
}

// Препроцессинг: letterbox 1024x1024 → NCHW float32.
// srcRect — область оригинала (в пикселях), которая уходит в модель:
// весь кадр в первом проходе, вырезка вокруг объекта во втором.
export function preprocess(
  source: ImageBitmap,
  srcRect: Rect,
): { tensor: Float32Array; geometry: LetterboxGeometry } {
  const geometry = letterboxGeometry(srcRect.width, srcRect.height);
  const { sw, sh, dx, dy } = geometry;

  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
  // уменьшение в 4+ раза с настройками по умолчанию даёт алиасинг на
  // тонких деталях, а именно они определяют качество кромки
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    source,
    srcRect.x,
    srcRect.y,
    srcRect.width,
    srcRect.height,
    dx,
    dy,
    sw,
    sh,
  );

  const pixels = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const plane = INPUT_SIZE * INPUT_SIZE;
  const tensor = new Float32Array(3 * plane);

  // Поля заполняются продолжением крайних пикселей (edge-replicate):
  // выборка с зажатыми координатами эквивалентна растягиванию крайних
  // строк и столбцов и не создаёт ложной границы на стыке кадра и поля.
  const maxX = dx + sw - 1;
  const maxY = dy + sh - 1;
  for (let y = 0; y < INPUT_SIZE; y++) {
    const sy = y < dy ? dy : y > maxY ? maxY : y;
    for (let x = 0; x < INPUT_SIZE; x++) {
      const sx = x < dx ? dx : x > maxX ? maxX : x;
      const src = (sy * INPUT_SIZE + sx) * 4;
      const dst = y * INPUT_SIZE + x;
      // нормализация: v/255, затем (v - 0.5) / 1.0 — mean 0.5, std 1.0
      tensor[dst] = (pixels[src]! / 255 - 0.5) / 1.0;
      tensor[plane + dst] = (pixels[src + 1]! / 255 - 0.5) / 1.0;
      tensor[2 * plane + dst] = (pixels[src + 2]! / 255 - 0.5) / 1.0;
    }
  }

  return { tensor, geometry };
}

// Постпроцессинг: min-max нормализация выхода и обрезка полей letterbox.
// Маска остаётся в родном разрешении прохода (sw x sh).
export function postprocess(
  output: Float32Array,
  geometry: LetterboxGeometry,
): ImageData {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < output.length; i++) {
    const v = output[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;

  const { sw, sh, dx, dy } = geometry;
  const mask = new ImageData(sw, sh);
  const data = mask.data;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const v = output[(y + dy) * INPUT_SIZE + (x + dx)]!;
      const gray = range > 0 ? Math.round(((v - min) / range) * 255) : 0;
      const i = (y * sw + x) * 4;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = 255;
    }
  }
  return mask;
}

// bbox пикселей с альфой выше порога значимости — фиксированный 0.5,
// независимо от пользовательского threshold, чтобы геометрия не прыгала.
// Координаты нормализованы (0..1) относительно самой маски.
// null = маска пустая, модель ничего не нашла.
export function computeBbox(mask: ImageData): Rect | null {
  const { width, height, data } = mask;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4]! >= 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  };
}

// перевод прямоугольника из координат покрытия (0..1 внутри coverage)
// в нормализованные координаты оригинала
export function toOriginalCoords(rect: Rect, coverage: Rect): Rect {
  return {
    x: coverage.x + rect.x * coverage.width,
    y: coverage.y + rect.y * coverage.height,
    width: rect.width * coverage.width,
    height: rect.height * coverage.height,
  };
}

const SECOND_PASS_AREA_LIMIT = 0.5; // bbox меньше половины площади кадра
const SECOND_PASS_MIN_GAIN = 1.3; // и прирост масштаба минимум в 1.3 раза
const SECOND_PASS_MARGIN = 0.12; // запас — 12% длинной стороны bbox

// Область второго прохода: bbox с запасом, расширенный до квадрата,
// насколько позволяют границы кадра. bboxNorm — в нормализованных
// координатах оригинала. null = второй проход не нужен.
export function secondPassRect(
  bboxNorm: Rect,
  width: number,
  height: number,
): Rect | null {
  if (bboxNorm.width * bboxNorm.height >= SECOND_PASS_AREA_LIMIT) return null;

  const bboxPx = {
    x: bboxNorm.x * width,
    y: bboxNorm.y * height,
    width: bboxNorm.width * width,
    height: bboxNorm.height * height,
  };
  // запас, чтобы объект не касался края входа: на самой границе модель
  // систематически ошибается
  const margin = Math.max(bboxPx.width, bboxPx.height) * SECOND_PASS_MARGIN;
  let x0 = bboxPx.x - margin;
  let y0 = bboxPx.y - margin;
  let x1 = bboxPx.x + bboxPx.width + margin;
  let y1 = bboxPx.y + bboxPx.height + margin;

  // расширение до квадрата в пределах кадра — объект попадает в модель
  // без искажения пропорций, остаток добирает letterbox
  const side = Math.max(x1 - x0, y1 - y0);
  const growX = (side - (x1 - x0)) / 2;
  const growY = (side - (y1 - y0)) / 2;
  x0 -= growX;
  x1 += growX;
  y0 -= growY;
  y1 += growY;

  x0 = Math.max(0, Math.floor(x0));
  y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(width, Math.ceil(x1));
  y1 = Math.min(height, Math.ceil(y1));

  const rect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };

  // второй проход должен давать реальный прирост разрешения
  const gain = Math.max(width, height) / Math.max(rect.width, rect.height);
  if (gain < SECOND_PASS_MIN_GAIN) return null;

  return rect;
}
