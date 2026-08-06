import { describe, expect, it } from 'vitest';
import { fileNameFromUrl, guessMime, sniffMime } from './extract-image';

describe('fileNameFromUrl', () => {
  it('keeps image extensions from the path', () => {
    expect(fileNameFromUrl('https://cdn.example/a/b/photo.JPEG?x=1')).toBe(
      'photo.JPEG',
    );
    expect(fileNameFromUrl('https://cdn.example/img.webp')).toBe('img.webp');
  });

  it('appends .png when extension is missing or unknown', () => {
    expect(fileNameFromUrl('https://cdn.example/assets/hero')).toBe('hero.png');
    expect(fileNameFromUrl('https://cdn.example/x.gif')).toBe('x.png');
  });

  it('decodes URI components and falls back on invalid URL', () => {
    expect(fileNameFromUrl('https://cdn.example/a%20b.png')).toBe('a b.png');
    expect(fileNameFromUrl('not a url')).toBe('image.png');
  });
});

describe('guessMime', () => {
  it('prefers content-type without parameters', () => {
    expect(guessMime('image/jpeg; charset=binary', 'x.png')).toBe('image/jpeg');
  });

  it('falls back to extension then png', () => {
    expect(guessMime('', 'shot.jpg')).toBe('image/jpeg');
    expect(guessMime('', 'shot.webp')).toBe('image/webp');
    expect(guessMime('application/octet-stream', 'shot.bin')).toBe('image/png');
  });
});

describe('sniffMime', () => {
  it('detects jpeg / png / webp magic bytes', () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), 'image/png')).toBe(
      'image/jpeg',
    );
    expect(
      sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), 'image/jpeg'),
    ).toBe('image/png');

    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffMime(webp, 'image/png')).toBe('image/webp');
  });

  it('uses valid fallback or png', () => {
    expect(sniffMime(new Uint8Array([1, 2, 3]), 'image/jpeg')).toBe('image/jpeg');
    expect(sniffMime(new Uint8Array([1, 2, 3]), 'text/plain')).toBe('image/png');
  });
});
