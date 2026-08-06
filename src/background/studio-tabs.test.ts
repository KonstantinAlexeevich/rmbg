import { describe, expect, it } from 'vitest';
import { studioTabUrlPatterns } from './studio-tabs';

describe('studioTabUrlPatterns', () => {
  it('uses origin match when studio URL is under that origin', () => {
    expect(
      studioTabUrlPatterns('https://app.example', 'https://app.example/studio'),
    ).toEqual(['https://app.example/*']);
  });

  it('adds studio URL pattern when origins diverge', () => {
    expect(
      studioTabUrlPatterns('https://stored.example', 'https://cdn.example/studio'),
    ).toEqual(['https://stored.example/*', 'https://cdn.example/studio*']);
  });
});
