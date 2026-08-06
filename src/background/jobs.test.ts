import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EXT_JOBS_KEY, MENU_EXPORTS_KEY, type ExtJob } from '../shared/ext-protocol';
import { installMockChrome, type MockChrome } from '../test/mock-chrome-storage';
import {
  claimJobs,
  enqueueJob,
  loadMenuExports,
  saveMenuExports,
} from './jobs';

const addJob = (id: string): ExtJob => ({
  id,
  kind: 'add',
  base64: 'YQ==',
  mime: 'image/png',
  name: `${id}.png`,
});

describe('jobs storage', () => {
  let chromeMock: MockChrome;

  beforeEach(() => {
    chromeMock = installMockChrome({ uiLanguage: 'en-US' });
  });

  afterEach(() => {
    chromeMock.storage.session.clear();
    chromeMock.storage.local.clear();
  });

  it('enqueueJob appends to session queue', async () => {
    await enqueueJob(addJob('1'));
    await enqueueJob(addJob('2'));
    expect(chromeMock.storage.session.snapshot()[EXT_JOBS_KEY]).toEqual([
      addJob('1'),
      addJob('2'),
    ]);
  });

  it('claimJobs returns and clears the queue', async () => {
    await enqueueJob(addJob('a'));
    await enqueueJob(addJob('b'));
    const claimed = await claimJobs();
    expect(claimed.map((j) => j.id)).toEqual(['a', 'b']);
    expect(await claimJobs()).toEqual([]);
    expect(chromeMock.storage.session.snapshot()[EXT_JOBS_KEY]).toEqual([]);
  });

  it('claimJobs treats missing/non-array as empty', async () => {
    expect(await claimJobs()).toEqual([]);
    await chromeMock.storage.session.set({ [EXT_JOBS_KEY]: 'bad' });
    expect(await claimJobs()).toEqual([]);
  });

  it('loadMenuExports falls back to default locale name', async () => {
    const list = await loadMenuExports();
    expect(list).toEqual([{ id: 'default', name: 'Original' }]);
  });

  it('loadMenuExports filters invalid entries', async () => {
    await saveMenuExports([
      { id: 'ok', name: 'OK' },
      { id: 1, name: 'bad' } as unknown as { id: string; name: string },
      null as unknown as { id: string; name: string },
    ]);
    expect(await loadMenuExports()).toEqual([{ id: 'ok', name: 'OK' }]);
    expect(chromeMock.storage.local.snapshot()[MENU_EXPORTS_KEY]).toHaveLength(3);
  });

  it('saveMenuExports persists to local storage', async () => {
    const exports = [{ id: 'p1', name: 'Portrait' }];
    await saveMenuExports(exports);
    expect(chromeMock.storage.local.snapshot()[MENU_EXPORTS_KEY]).toEqual(exports);
  });
});
