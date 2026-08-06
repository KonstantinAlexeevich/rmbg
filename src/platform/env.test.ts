import { describe, expect, it } from 'vitest';
import { appTarget, appVersion, isExtension, isWeb } from './env';

describe('env (vitest web defines)', () => {
  it('exposes web target and package version', () => {
    expect(appTarget).toBe('web');
    expect(isWeb).toBe(true);
    expect(isExtension).toBe(false);
    expect(appVersion()).toBe('0.1.0');
  });
});
