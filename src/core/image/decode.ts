export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function isAcceptedType(mimeType: string): boolean {
  return ACCEPTED_MIME_TYPES.includes(mimeType);
}

// Отключение конвертации цветового профиля обязательно: у фотографий со
// встроенным ICC браузер иначе перегонит цвета, и cutout уедет от оригинала.
export function decodeImage(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { colorSpaceConversion: 'none' });
}

// Миниатюра для грида: длинная сторона 256 px.
export async function makeThumbnail(
  source: ImageBitmap | OffscreenCanvas,
  longSide = 256,
): Promise<Blob> {
  const scale = Math.min(1, longSide / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Не удалось создать 2d-контекст');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.convertToBlob({ type: 'image/png' });
}
