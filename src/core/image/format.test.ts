import { describe, expect, it } from 'vitest';
import { extensionForFormat, mimeForFormat } from './encode';
import { isAcceptedType } from './decode';

describe('mimeForFormat / extensionForFormat', () => {
  it('maps output formats', () => {
    expect(mimeForFormat('png')).toBe('image/png');
    expect(mimeForFormat('jpeg')).toBe('image/jpeg');
    expect(mimeForFormat('webp')).toBe('image/webp');
    expect(extensionForFormat('jpeg')).toBe('jpg');
    expect(extensionForFormat('png')).toBe('png');
  });
});

describe('isAcceptedType', () => {
  it('accepts png/jpeg/webp only', () => {
    expect(isAcceptedType('image/png')).toBe(true);
    expect(isAcceptedType('image/gif')).toBe(false);
  });
});
