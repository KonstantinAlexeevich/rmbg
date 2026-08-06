import { describe, expect, it } from 'vitest';
import {
  normalizeStudioWebUrl,
  studioOriginPattern,
  DEFAULT_STUDIO_WEB_URL,
} from './studio-url';

describe('normalizeStudioWebUrl', () => {
  it('strips trailing slash on path', () => {
    expect(normalizeStudioWebUrl('https://example.com/studio/')).toBe(
      'https://example.com/studio',
    );
  });

  it('keeps root path slash', () => {
    expect(normalizeStudioWebUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('trims whitespace', () => {
    expect(normalizeStudioWebUrl('  http://localhost:5173/studio  ')).toBe(
      DEFAULT_STUDIO_WEB_URL,
    );
  });

  it('rejects empty and invalid URLs', () => {
    expect(() => normalizeStudioWebUrl('')).toThrow(/empty/i);
    expect(() => normalizeStudioWebUrl('not-a-url')).toThrow(/invalid/i);
  });

  it('rejects non-http(s) protocols', () => {
    expect(() => normalizeStudioWebUrl('file:///tmp/studio')).toThrow(/http\(s\)/i);
  });
});

describe('studioOriginPattern', () => {
  it('builds Chrome match pattern from studio URL', () => {
    expect(studioOriginPattern('https://png.example/studio')).toBe(
      'https://png.example/*',
    );
  });
});
