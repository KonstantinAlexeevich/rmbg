import { describe, expect, it } from 'vitest';
import {
  aboutWebPath,
  configuredStudioOrigin,
  contextMenuDocumentUrlPatterns,
  normalizeStudioWebUrl,
  originsMatch,
  studioWebPath,
} from './studio-url';

describe('studio web paths', () => {
  it('uses canonical paths without trailing slash', () => {
    expect(studioWebPath()).toBe('/studio');
    expect(aboutWebPath()).toBe('/about');
  });
});

describe('normalizeStudioWebUrl (shared with scripts)', () => {
  it('strips trailing slash and rejects invalid URLs', () => {
    expect(normalizeStudioWebUrl('https://example.com/studio/')).toBe(
      'https://example.com/studio',
    );
    expect(() => normalizeStudioWebUrl('')).toThrow(/empty/i);
  });
});

describe('configuredStudioOrigin', () => {
  it('reads origin from build-time studio URL', () => {
    expect(configuredStudioOrigin()).toBe('http://localhost:5173');
  });
});

describe('originsMatch', () => {
  it('matches same origin', () => {
    expect(originsMatch('https://a.test/studio', 'https://a.test')).toBe(true);
  });

  it('rejects different origin or invalid URL', () => {
    expect(originsMatch('https://b.test/', 'https://a.test')).toBe(false);
    expect(originsMatch('not-a-url', 'https://a.test')).toBe(false);
  });
});

describe('contextMenuDocumentUrlPatterns', () => {
  it('covers http and https pages', () => {
    expect(contextMenuDocumentUrlPatterns()).toEqual(['http://*/*', 'https://*/*']);
  });
});
