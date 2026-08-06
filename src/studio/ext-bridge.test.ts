import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIDGE_SOURCE } from '../shared/ext-protocol';
import { defaultSettings } from '../core/storage/settings';
import { useStudioStore } from './state/store';
import { startExtBridge, notifyExtBridgeReady } from './ext-bridge';

const addFiles = vi.hoisted(() =>
  vi.fn(async (_files: File[], _options?: { autoDownloadPresetId?: string; ephemeral?: boolean }) => {}),
);

vi.mock('./state/orchestrator', () => ({
  addFiles: (files: File[], options?: { autoDownloadPresetId?: string; ephemeral?: boolean }) =>
    addFiles(files, options),
}));

vi.mock('./ext-sync', () => ({
  syncExportsToExtension: vi.fn(),
  postPageReady: vi.fn(),
}));

describe('ext-bridge', () => {
  beforeEach(() => {
    addFiles.mockClear();
    useStudioStore.getState().setSettings(defaultSettings());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buffers JOB until notifyExtBridgeReady then flushes', async () => {
    startExtBridge();

    const job = {
      id: `j-${Math.random()}`,
      kind: 'add' as const,
      base64: btoa('x'),
      mime: 'image/png',
      name: 'a.png',
    };

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: BRIDGE_SOURCE, type: 'JOB', job },
        origin: window.location.origin,
      }),
    );

    if (addFiles.mock.calls.length === 0) {
      notifyExtBridgeReady();
      await vi.waitFor(() => expect(addFiles).toHaveBeenCalled());
    }
    const files = addFiles.mock.calls[0]?.[0];
    expect(files?.[0]).toBeInstanceOf(File);
  });

  it('handles save jobs as ephemeral with preset', async () => {
    startExtBridge();
    notifyExtBridgeReady();
    addFiles.mockClear();

    const settings = useStudioStore.getState().settings;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          source: BRIDGE_SOURCE,
          type: 'JOB',
          job: {
            id: `j-${Math.random()}`,
            kind: 'save',
            base64: btoa('y'),
            mime: 'image/png',
            name: 'b.png',
            presetId: settings.activePresetId,
          },
        },
        origin: window.location.origin,
      }),
    );

    await vi.waitFor(() => expect(addFiles).toHaveBeenCalled());
    expect(addFiles.mock.calls[0]?.[1]).toEqual({
      ephemeral: true,
      autoDownloadPresetId: settings.activePresetId,
    });
  });

  it('ignores messages from other origins', async () => {
    startExtBridge();
    notifyExtBridgeReady();
    addFiles.mockClear();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          source: BRIDGE_SOURCE,
          type: 'JOB',
          job: {
            id: `j-${Math.random()}`,
            kind: 'add',
            base64: btoa('z'),
            mime: 'image/png',
            name: 'c.png',
          },
        },
        origin: 'https://evil.example',
      }),
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(addFiles).not.toHaveBeenCalled();
  });
});
