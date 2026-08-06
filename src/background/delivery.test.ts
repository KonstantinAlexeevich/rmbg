import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXT_JOBS_KEY, MSG_JOBS, type ExtJob } from '../shared/ext-protocol';
import { installMockChrome } from '../test/mock-chrome-storage';
import { deliverPendingJobsToStudio, openStudioTab } from './delivery';
import { enqueueJob } from './jobs';

const job = (id: string): ExtJob => ({
  id,
  kind: 'add',
  base64: 'YQ==',
  mime: 'image/png',
  name: `${id}.png`,
});

describe('delivery', () => {
  let chromeMock: ReturnType<typeof installMockChrome>;

  beforeEach(() => {
    chromeMock = installMockChrome({
      uiLanguage: 'en-US',
      local: { studioOrigin: 'http://localhost:5173' },
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    chromeMock.storage.session.clear();
    chromeMock.storage.local.clear();
  });

  it('openStudioTab focuses existing matching tab', async () => {
    chromeMock.controls.tabs = [
      { id: 7, windowId: 2, url: 'http://localhost:5173/studio' },
    ];
    const update = vi.spyOn(chromeMock.tabs, 'update');
    const windowsUpdate = vi.spyOn(chromeMock.windows, 'update');
    const create = vi.spyOn(chromeMock.tabs, 'create');

    const id = await openStudioTab({ focus: true });
    expect(id).toBe(7);
    expect(update).toHaveBeenCalledWith(7, { active: true });
    expect(windowsUpdate).toHaveBeenCalledWith(2, { focused: true });
    expect(create).not.toHaveBeenCalled();
  });

  it('openStudioTab without focus does not activate existing tab', async () => {
    chromeMock.controls.tabs = [
      { id: 7, windowId: 2, url: 'http://localhost:5173/studio' },
    ];
    const update = vi.spyOn(chromeMock.tabs, 'update');
    const id = await openStudioTab({ focus: false });
    expect(id).toBe(7);
    expect(update).not.toHaveBeenCalled();
  });

  it('openStudioTab creates a tab when none exist', async () => {
    const id = await openStudioTab();
    expect(id).toBe(100);
    expect(chromeMock.controls.tabs[0]?.url).toContain('/studio');
  });

  it('deliverPendingJobsToStudio no-ops for undefined tab or empty queue', async () => {
    await deliverPendingJobsToStudio(undefined);
    await deliverPendingJobsToStudio(1);
    expect(chromeMock.storage.session.snapshot()[EXT_JOBS_KEY]).toBeUndefined();
  });

  it('deliverPendingJobsToStudio sends claimed jobs', async () => {
    await enqueueJob(job('1'));
    const send = vi.fn(async () => undefined);
    chromeMock.controls.sendMessageImpl = send;

    await deliverPendingJobsToStudio(9);
    expect(send).toHaveBeenCalledWith(9, {
      type: MSG_JOBS,
      jobs: [job('1')],
    });
    expect(chromeMock.storage.session.snapshot()[EXT_JOBS_KEY] ?? []).toEqual([]);
  });

  it('deliverPendingJobsToStudio retries then re-enqueues on failure', async () => {
    await enqueueJob(job('1'));
    chromeMock.controls.sendMessageImpl = async () => {
      throw new Error('no receiver');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const done = deliverPendingJobsToStudio(9);
    await vi.runAllTimersAsync();
    await done;

    expect(chromeMock.storage.session.snapshot()[EXT_JOBS_KEY]).toEqual([job('1')]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
