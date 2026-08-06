import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMockChrome } from '../test/mock-chrome-storage';
import {
  beginImageHostAccess,
  extractImageForContextMenu,
} from './extract-image';

/** Minimal PNG header bytes */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('extractImageForContextMenu', () => {
  let chromeMock: ReturnType<typeof installMockChrome>;

  beforeEach(() => {
    chromeMock = installMockChrome();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('decodes data: URLs without host access', async () => {
    const b64 = btoa(String.fromCharCode(...PNG));
    const result = await extractImageForContextMenu(
      `data:image/png;base64,${b64}`,
      undefined,
      Promise.resolve(false),
    );
    expect(result.mime).toBe('image/png');
    expect(result.base64.length).toBeGreaterThan(0);
  });

  it('reads blob: via scripting.executeScript', async () => {
    chromeMock.scripting.executeScript = vi.fn(async () => [
      {
        result: {
          ok: true as const,
          base64: btoa('x'),
          mime: 'image/png',
          name: 'image.png',
        },
      },
    ]) as typeof chromeMock.scripting.executeScript;

    const result = await extractImageForContextMenu(
      'blob:https://example.com/uuid',
      3,
      Promise.resolve(true),
    );
    expect(result).toEqual({
      base64: btoa('x'),
      mime: 'image/png',
      name: 'image.png',
    });
    expect(chromeMock.scripting.executeScript).toHaveBeenCalled();
  });

  it('throws when blob: has no tab', async () => {
    await expect(
      extractImageForContextMenu('blob:https://x/1', undefined, Promise.resolve(true)),
    ).rejects.toThrow(/No tab/);
  });

  it('throws when host access denied', async () => {
    await expect(
      extractImageForContextMenu(
        'https://cdn.example/a.png',
        1,
        Promise.resolve(false),
      ),
    ).rejects.toThrow(/Need permission/);
  });

  it('fetches http(s) in service worker when granted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(PNG, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      ),
    );

    const result = await extractImageForContextMenu(
      'https://cdn.example/photo.png',
      1,
      Promise.resolve(true),
    );
    expect(result.mime).toBe('image/png');
    expect(result.name).toBe('photo.png');
  });
});

describe('beginImageHostAccess', () => {
  beforeEach(() => {
    installMockChrome();
  });

  it('resolves true for data/blob without permissions.request', async () => {
    const request = vi.spyOn(chrome.permissions, 'request');
    await expect(beginImageHostAccess('data:image/png;base64,AA==', '')).resolves.toBe(
      true,
    );
    await expect(beginImageHostAccess('blob:https://x/1', '')).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('requests optional origin for http(s)', async () => {
    const request = vi.spyOn(chrome.permissions, 'request').mockImplementation(async () => true);
    await expect(
      beginImageHostAccess('https://cdn.example/a.png', 'https://page.example/'),
    ).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith({ origins: ['https://cdn.example/*'] });
  });
});
