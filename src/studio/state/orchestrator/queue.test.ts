import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemRecord } from '../../../core/types';
import {
  createSession,
  getItem,
  openDatabase,
  putItem,
  type Database,
} from '../../../core/storage/db';
import { defaultSettings } from '../../../core/storage/settings';
import type { SegmentPayload, ComposePayload } from '../../../workers/protocol';
import type { SegmentationWorkerClient } from '../workers';
import {
  clearAutoDownloadPreset,
  clearEphemeral,
  markEphemeral,
  setAutoDownloadPreset,
  setDb,
  setHadSuccessfulRun,
  setSegWorker,
  setSessionId,
  setWorkerInited,
  store,
} from './context';
import { processAll, retryItem, stopProcessing } from './queue';

vi.mock('./model', () => ({
  fallbackToWasm: vi.fn(async () => {
    const { setWorkerInited, store } = await import('./context');
    store.getState().setBackend('wasm');
    setWorkerInited(true);
    // leave segWorker as set by the test after fallback
  }),
}));

vi.mock('../../../platform/download', () => ({
  downloadBlob: vi.fn(async () => {}),
}));

const fullRect = { x: 0, y: 0, width: 1, height: 1 };

function segmentPayload(overrides: Partial<SegmentPayload> = {}): SegmentPayload {
  const blob = new Blob([new Uint8Array([1])], { type: 'image/png' });
  return {
    blob,
    coverage: fullRect,
    bbox: fullRect,
    empty: false,
    secondPassEmpty: false,
    passes: 1,
    durationMs: 10,
    ...overrides,
  };
}

function composePayload(): ComposePayload {
  const blob = new Blob([new Uint8Array([2])], { type: 'image/png' });
  return { blob, thumbnail: blob, width: 10, height: 10 };
}

function makeItem(id: string, sessionId: string): ItemRecord {
  const blob = new Blob([new Uint8Array([9])], { type: 'image/png' });
  return {
    id,
    sessionId,
    name: `${id}.png`,
    mimeType: 'image/png',
    createdAt: Date.now(),
    status: 'queued',
    error: '',
    selected: true,
    source: { blob, width: 10, height: 10 },
    thumbnail: blob,
    mask: null,
    result: null,
    overrides: [],
  };
}

function mockWorker(options?: {
  segment?: () => Promise<SegmentPayload>;
  compose?: () => Promise<ComposePayload>;
}): SegmentationWorkerClient {
  return {
    segment: options?.segment ?? (async () => segmentPayload()),
    compose: options?.compose ?? (async () => composePayload()),
    terminate: () => {},
  } as unknown as SegmentationWorkerClient;
}

async function deleteRmbgDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('rmbg');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('delete failed'));
    req.onblocked = () => resolve();
  });
}

describe('processAll / queue', () => {
  let db: Database;

  beforeEach(async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await deleteRmbgDb();
    db = await openDatabase();
    setDb(db);
    const session = await createSession(db, defaultSettings().activePresetId);
    setSessionId(session.id);
    setWorkerInited(true);
    setHadSuccessfulRun(false);
    setSegWorker(mockWorker());
    store.getState().setModel({ phase: 'ready' });
    store.getState().setBackend('wasm');
    store.getState().setSettings(defaultSettings());
    store.getState().setItems([]);
    store.getState().setBatch({
      running: false,
      done: 0,
      total: 0,
      etaMs: 0,
      stopRequested: false,
    });
    store.getState().setProcessRequested(false);
  });

  afterEach(async () => {
    clearAutoDownloadPreset('a');
    clearAutoDownloadPreset('b');
    clearEphemeral('a');
    clearEphemeral('b');
    setSegWorker(null);
    setWorkerInited(false);
    db.close();
    await deleteRmbgDb();
    vi.restoreAllMocks();
  });

  it('defers when model not ready', async () => {
    store.getState().setModel({ phase: 'downloading', loadedBytes: 0, totalBytes: 1 });
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    await putItem(db, makeItem('a', sessionId));
    store.getState().setItems([
      {
        id: 'a',
        name: 'a.png',
        status: 'queued',
        error: '',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: false,
      },
    ]);

    await processAll();
    expect(store.getState().processRequested).toBe(true);
    expect(store.getState().batch.running).toBe(false);
  });

  it('segments and composes pending items to done', async () => {
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    await putItem(db, makeItem('a', sessionId));
    store.getState().setItems([
      {
        id: 'a',
        name: 'a.png',
        status: 'queued',
        error: '',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: false,
      },
    ]);

    await processAll();

    const record = await getItem(db, 'a');
    expect(record?.status).toBe('done');
    expect(record?.mask).not.toBeNull();
    expect(record?.result).not.toBeNull();
    expect(store.getState().items.find((i) => i.id === 'a')?.status).toBe('done');
    expect(store.getState().batch.running).toBe(false);
  });

  it('stopProcessing skips remaining items', async () => {
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    await putItem(db, makeItem('a', sessionId));
    await putItem(db, makeItem('b', sessionId));
    store.getState().setItems(
      ['a', 'b'].map((id) => ({
        id,
        name: `${id}.png`,
        status: 'queued' as const,
        error: '',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: false,
      })),
    );

    let releaseSegment!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseSegment = resolve;
    });

    setSegWorker(
      mockWorker({
        segment: async () => {
          stopProcessing();
          await gate;
          return segmentPayload();
        },
      }),
    );

    const run = processAll();
    // allow first item to enter segment and request stop
    await Promise.resolve();
    releaseSegment();
    await run;

    expect((await getItem(db, 'a'))?.status).toBe('done');
    expect((await getItem(db, 'b'))?.status).toBe('queued');
  });

  it('retryItem processes a single id', async () => {
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    await putItem(db, makeItem('a', sessionId));
    store.getState().setItems([
      {
        id: 'a',
        name: 'a.png',
        status: 'failed',
        error: 'x',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: false,
      },
    ]);

    await retryItem('a');
    expect((await getItem(db, 'a'))?.status).toBe('done');
  });

  it('falls back to wasm on first webgpu segment failure', async () => {
    const { fallbackToWasm } = await import('./model');
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    await putItem(db, makeItem('a', sessionId));
    store.getState().setItems([
      {
        id: 'a',
        name: 'a.png',
        status: 'queued',
        error: '',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: false,
      },
    ]);
    store.getState().setBackend('webgpu');

    let calls = 0;
    setSegWorker(
      mockWorker({
        segment: async () => {
          calls++;
          if (calls === 1) throw new Error('gpu boom');
          return segmentPayload();
        },
      }),
    );

    await processAll();

    expect(fallbackToWasm).toHaveBeenCalled();
    expect((await getItem(db, 'a'))?.status).toBe('done');
    expect(store.getState().backend).toBe('wasm');
  });

  it('silent export downloads and removes ephemeral item', async () => {
    const { downloadBlob } = await import('../../../platform/download');
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    const settings = store.getState().settings;
    await putItem(db, makeItem('a', sessionId));
    markEphemeral('a');
    setAutoDownloadPreset('a', settings.activePresetId);
    store.getState().setItems([
      {
        id: 'a',
        name: 'a.png',
        status: 'queued',
        error: '',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: true,
      },
    ]);

    await processAll();

    expect(downloadBlob).toHaveBeenCalled();
    expect(await getItem(db, 'a')).toBeNull();
    expect(store.getState().items.find((i) => i.id === 'a')).toBeUndefined();
  });

  it('abortSilentExport removes ephemeral on failure', async () => {
    const sessionId = (await db.getAll('sessions'))[0]!.id;
    await putItem(db, makeItem('a', sessionId));
    markEphemeral('a');
    setAutoDownloadPreset('a', store.getState().settings.activePresetId);
    store.getState().setItems([
      {
        id: 'a',
        name: 'a.png',
        status: 'queued',
        error: '',
        selected: true,
        width: 10,
        height: 10,
        thumbnailUrl: '',
        resultThumbnailUrl: '',
        hasMask: false,
        maskEmpty: false,
        stale: false,
        override: null,
        ephemeral: true,
      },
    ]);
    setSegWorker(
      mockWorker({
        segment: async () => {
          throw new Error('seg fail');
        },
      }),
    );

    await processAll();

    expect(await getItem(db, 'a')).toBeNull();
    expect(store.getState().items.find((i) => i.id === 'a')).toBeUndefined();
  });
});
