import { describe, expect, it } from 'vitest';
import { isLegacyRootShellScript } from './register-sw';

describe('isLegacyRootShellScript', () => {
  it('detects root /sw.js but not /studio/sw.js', () => {
    expect(isLegacyRootShellScript('https://example.com/sw.js')).toBe(true);
    expect(isLegacyRootShellScript('https://example.com/studio/sw.js')).toBe(false);
    expect(isLegacyRootShellScript('https://example.com/assets/app.js')).toBe(false);
  });
});
