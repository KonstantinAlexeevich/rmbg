import { describe, expect, it } from 'vitest';
import { canonicalUrl, MODEL_MANIFEST, variantForBackend } from './model-manifest';

describe('variantForBackend', () => {
  it('maps webgpu → fp32 and wasm → q8', () => {
    expect(variantForBackend('webgpu')).toBe('fp32');
    expect(variantForBackend('wasm')).toBe('q8');
  });
});

describe('canonicalUrl', () => {
  it('returns the first mirror for each variant', () => {
    expect(canonicalUrl('fp32')).toBe(MODEL_MANIFEST.fp32.urls[0]);
    expect(canonicalUrl('q8')).toBe(MODEL_MANIFEST.q8.urls[0]);
  });

  it('keeps sha256 and size metadata present', () => {
    expect(MODEL_MANIFEST.fp32.sha256).toHaveLength(64);
    expect(MODEL_MANIFEST.q8.sizeBytes).toBeGreaterThan(0);
  });
});
