import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openDB, type IDBPDatabase } from 'idb';
import type { ItemRecord } from '../types';
import {
  clearAll,
  createSession,
  deleteItems,
  deleteSession,
  getItem,
  latestSession,
  openDatabase,
  putItem,
  sessionItems,
  touchSession,
  type Database,
} from './db';

function makeItem(partial: Partial<ItemRecord> & Pick<ItemRecord, 'id' | 'sessionId'>): ItemRecord {
  const blob = new Blob([new Uint8Array([1])], { type: 'image/png' });
  return {
    name: 'a.png',
    mimeType: 'image/png',
    createdAt: Date.now(),
    status: 'queued',
    error: '',
    selected: false,
    source: { blob, width: 1, height: 1 },
    thumbnail: blob,
    mask: null,
    result: null,
    overrides: [],
    ...partial,
  };
}

async function deleteRmbgDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('rmbg');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('deleteDatabase failed'));
    req.onblocked = () => resolve();
  });
}

describe('db', () => {
  let db: Database | undefined;

  afterEach(async () => {
    db?.close();
    db = undefined;
    await deleteRmbgDb();
  });

  it('createSession and latestSession pick most recently updated', async () => {
    db = await openDatabase();
    const older = await createSession(db, 'p1');
    await touchSession(db, older.id);
    // bump clock via second create after touch on first
    const newer = await createSession(db, 'p2');
    const latest = await latestSession(db);
    expect(latest?.id).toBe(newer.id);
    expect(older.id).not.toBe(newer.id);
  });

  it('latestSession returns null when empty', async () => {
    db = await openDatabase();
    expect(await latestSession(db)).toBeNull();
  });

  it('touchSession bumps updatedAt', async () => {
    db = await openDatabase();
    const session = await createSession(db, 'p1');
    const before = session.updatedAt;
    await touchSession(db, session.id);
    const latest = await latestSession(db);
    expect(latest?.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('putItem / getItem / sessionItems order by createdAt', async () => {
    db = await openDatabase();
    const session = await createSession(db, 'p1');
    const a = makeItem({ id: 'a', sessionId: session.id, createdAt: 20, name: 'a.png' });
    const b = makeItem({ id: 'b', sessionId: session.id, createdAt: 10, name: 'b.png' });
    await putItem(db, a);
    await putItem(db, b);
    const items = await sessionItems(db, session.id);
    expect(items.map((i) => i.id)).toEqual(['b', 'a']);
    expect(await getItem(db, 'a')).toMatchObject({ name: 'a.png' });
    expect(await getItem(db, 'missing')).toBeNull();
  });

  it('deleteSession removes session and its items', async () => {
    db = await openDatabase();
    const session = await createSession(db, 'p1');
    const other = await createSession(db, 'p2');
    await putItem(db, makeItem({ id: 'keep', sessionId: other.id }));
    await putItem(db, makeItem({ id: 'gone', sessionId: session.id }));
    await deleteSession(db, session.id);
    expect(await getItem(db, 'gone')).toBeNull();
    expect(await getItem(db, 'keep')).not.toBeNull();
    expect(await latestSession(db)).toMatchObject({ id: other.id });
  });

  it('deleteItems and clearAll', async () => {
    db = await openDatabase();
    const session = await createSession(db, 'p1');
    await putItem(db, makeItem({ id: '1', sessionId: session.id }));
    await putItem(db, makeItem({ id: '2', sessionId: session.id }));
    await deleteItems(db, ['1']);
    expect(await getItem(db, '1')).toBeNull();
    expect(await getItem(db, '2')).not.toBeNull();
    await clearAll(db);
    expect(await latestSession(db)).toBeNull();
    expect(await getItem(db, '2')).toBeNull();
  });

  it('upgrade v1→v2 fills missing overrides', async () => {
    let v1: IDBPDatabase | undefined = await openDB('rmbg', 1, {
      upgrade(database) {
        database.createObjectStore('sessions', { keyPath: 'id' });
        const items = database.createObjectStore('items', { keyPath: 'id' });
        items.createIndex('by-session', 'sessionId');
        items.createIndex('by-status', 'status');
      },
    });
    const blob = new Blob([new Uint8Array([1])], { type: 'image/png' });
    await v1.put('sessions', {
      id: 's1',
      createdAt: 1,
      updatedAt: 1,
      presetId: 'p',
    });
    await v1.put('items', {
      id: 'legacy',
      sessionId: 's1',
      name: 'x.png',
      mimeType: 'image/png',
      createdAt: 1,
      status: 'queued',
      error: '',
      selected: false,
      source: { blob, width: 1, height: 1 },
      thumbnail: blob,
      mask: null,
      result: null,
    });
    v1.close();
    v1 = undefined;

    db = await openDatabase();
    const item = await getItem(db, 'legacy');
    expect(item?.overrides).toEqual([]);
  });
});
