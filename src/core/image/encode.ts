import type { OutputFormat } from '../preset/types';

const MIME: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function mimeForFormat(format: OutputFormat): string {
  return MIME[format];
}

export function extensionForFormat(format: OutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

// Для png параметр quality игнорируется браузером.
export function encodeCanvas(
  canvas: OffscreenCanvas,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  return canvas.convertToBlob({ type: MIME[format], quality });
}
