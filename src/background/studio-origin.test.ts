import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STUDIO_ORIGIN_KEY } from '../shared/ext-protocol';
import { installMockChrome, type MockChrome } from '../test/mock-chrome-storage';
import { resolveStudioOrigin, saveStudioOrigin } from './studio-origin';

describe('studio origin storage', () => {
  let chromeMock: MockChrome;

  beforeEach(() => {
    chromeMock = installMockChrome();
  });

  afterEach(() => {
    chromeMock.storage.local.clear();
  });

  it('falls back to configured build-time origin', async () => {
    expect(await resolveStudioOrigin()).toBe('http://localhost:5173');
  });

  it('prefers non-empty stored origin', async () => {
    await saveStudioOrigin('https://studio.example');
    expect(await resolveStudioOrigin()).toBe('https://studio.example');
    expect(chromeMock.storage.local.snapshot()[STUDIO_ORIGIN_KEY]).toBe(
      'https://studio.example',
    );
  });

  it('ignores empty stored value', async () => {
    await chromeMock.storage.local.set({ [STUDIO_ORIGIN_KEY]: '' });
    expect(await resolveStudioOrigin()).toBe('http://localhost:5173');
  });
});
