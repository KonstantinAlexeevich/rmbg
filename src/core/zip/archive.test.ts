import { describe, expect, it } from 'vitest';
import {
  archiveFileName,
  sanitizeFolderName,
  uniqueFolderNames,
  ZipBuilder,
} from './archive';

describe('sanitizeFolderName', () => {
  it('replaces forbidden characters and control chars', () => {
    expect(sanitizeFolderName('a/b\\c?d*e:f|"g"<h>')).toBe('a_b_c_d_e_f__g__h_');
    expect(sanitizeFolderName('ok\u0001name')).toBe('ok_name');
  });

  it('strips trailing dots and falls back to preset', () => {
    expect(sanitizeFolderName('  name...  ')).toBe('name');
    expect(sanitizeFolderName('   ')).toBe('preset');
    expect(sanitizeFolderName('...')).toBe('preset');
  });
});

describe('uniqueFolderNames', () => {
  it('dedupes collisions with -2, -3 suffixes', () => {
    expect(uniqueFolderNames(['A', 'A', 'B', 'A/X'])).toEqual([
      'A',
      'A-2',
      'B',
      'A_X',
    ]);
  });
});

describe('archiveFileName', () => {
  it('formats date stamp', () => {
    expect(archiveFileName(new Date(2026, 7, 5, 22, 5))).toBe('rmbg-20260805-2205.zip');
  });
});

describe('ZipBuilder.uniqueName', () => {
  it('replaces extension and suffixes collisions', () => {
    const zip = new ZipBuilder();
    expect(zip.uniqueName('photo.JPEG', 'png')).toBe('photo.png');
    expect(zip.uniqueName('photo.jpg', 'png')).toBe('photo-2.png');
    expect(zip.uniqueName('photo.webp', 'png', 'Export')).toBe('Export/photo.png');
  });
});
