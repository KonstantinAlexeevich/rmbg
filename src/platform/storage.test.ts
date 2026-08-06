import { afterEach, describe, expect, it } from 'vitest';
import { storageGet, storageSet } from './storage';

afterEach(() => {
  localStorage.clear();
});

describe('web storageGet / storageSet', () => {
  it('round-trips JSON under rmbg: prefix', async () => {
    await storageSet('settings', { version: 1, ok: true });
    expect(localStorage.getItem('rmbg:settings')).toContain('"ok":true');
    expect(await storageGet('settings')).toEqual({ version: 1, ok: true });
  });

  it('returns undefined for missing keys', async () => {
    expect(await storageGet('missing')).toBeUndefined();
  });
});
