import { describe, expect, it } from 'vitest';
import { assetUrl } from './assets';

describe('assetUrl (web)', () => {
  it('builds absolute URL under origin and strips leading slash', () => {
    expect(assetUrl('ort/ort-wasm.wasm')).toBe(
      `${self.location.origin}/ort/ort-wasm.wasm`,
    );
    expect(assetUrl('/icons/icon.png')).toBe(
      `${self.location.origin}/icons/icon.png`,
    );
  });
});
