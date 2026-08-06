import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('downloadBlob (web)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.doUnmock('./env');
  });

  it('uses showSaveFilePicker when saveAs and picker available', async () => {
    vi.doMock('./env', () => ({
      isExtension: false,
      isWeb: true,
      appTarget: 'web',
      appVersion: () => '0.1.0',
    }));

    const close = vi.fn(async () => {});
    const write = vi.fn(async () => {});
    const createWritable = vi.fn(async () => ({ write, close }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    Object.defineProperty(window, 'showSaveFilePicker', {
      value: showSaveFilePicker,
      configurable: true,
    });

    const { downloadBlob } = await import('./download');
    const blob = new Blob(['hi']);
    await downloadBlob(blob, 'out.png', true);

    expect(showSaveFilePicker).toHaveBeenCalledWith({ suggestedName: 'out.png' });
    expect(write).toHaveBeenCalledWith(blob);
    expect(close).toHaveBeenCalled();
  });

  it('falls back to anchor download when picker missing', async () => {
    vi.doMock('./env', () => ({
      isExtension: false,
      isWeb: true,
      appTarget: 'web',
      appVersion: () => '0.1.0',
    }));
    // ensure no picker
    Object.defineProperty(window, 'showSaveFilePicker', {
      value: undefined,
      configurable: true,
    });

    const click = vi.fn();
    const append = vi.spyOn(document.body, 'append').mockImplementation(() => {});
    const remove = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          rel: '',
          click,
          remove,
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    const { downloadBlob } = await import('./download');
    await downloadBlob(new Blob(['x']), 'file.png', false);

    expect(click).toHaveBeenCalled();
    expect(append).toHaveBeenCalled();
  });

  it('swallows AbortError from save picker', async () => {
    vi.doMock('./env', () => ({
      isExtension: false,
      isWeb: true,
      appTarget: 'web',
      appVersion: () => '0.1.0',
    }));
    Object.defineProperty(window, 'showSaveFilePicker', {
      value: vi.fn(async () => {
        throw new DOMException('User cancelled', 'AbortError');
      }),
      configurable: true,
    });

    const { downloadBlob } = await import('./download');
    await expect(downloadBlob(new Blob(['x']), 'a.png', true)).resolves.toBeUndefined();
  });

  it('uses chrome.downloads when isExtension', async () => {
    vi.doMock('./env', () => ({
      isExtension: true,
      isWeb: false,
      appTarget: 'extension',
      appVersion: () => '0.1.0',
    }));

    const { installMockChrome } = await import('../test/mock-chrome-storage');
    const chromeMock = installMockChrome();
    const download = vi.spyOn(chromeMock.downloads, 'download').mockResolvedValue(42);

    const { downloadBlob } = await import('./download');
    await downloadBlob(new Blob(['x']), 'a.png', true);

    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'a.png', saveAs: true }),
    );

    // complete → revoke path
    for (const listener of chromeMock.controls.downloadListeners) {
      listener({ id: 42, state: { current: 'complete' } });
    }
  });
});
