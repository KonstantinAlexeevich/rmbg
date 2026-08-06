import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearMockCaches, installMockCaches } from '../../test/mock-caches';
import { hasCachedModel, readCachedModel, writeCachedModel } from './model-cache';

describe('model-cache', () => {
  beforeEach(() => {
    installMockCaches();
  });

  afterEach(() => {
    clearMockCaches();
  });

  it('write / has / read round-trip', async () => {
    const url = 'https://example.com/model.onnx';
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(await hasCachedModel(url)).toBe(false);
    expect(await readCachedModel(url)).toBeNull();

    await writeCachedModel(url, bytes);
    expect(await hasCachedModel(url)).toBe(true);
    const read = await readCachedModel(url);
    expect(read).toEqual(bytes);
  });

  it('isolates entries by url', async () => {
    await writeCachedModel('https://a', new Uint8Array([1]));
    await writeCachedModel('https://b', new Uint8Array([2]));
    expect(await readCachedModel('https://a')).toEqual(new Uint8Array([1]));
    expect(await readCachedModel('https://b')).toEqual(new Uint8Array([2]));
  });
});
