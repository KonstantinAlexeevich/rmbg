import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ItemRecord, ItemStatus, SessionRecord } from '../types';

interface RmbgDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
  };
  items: {
    key: string;
    value: ItemRecord;
    indexes: { 'by-session': string; 'by-status': ItemStatus };
  };
}

const DB_NAME = 'rmbg';
const DB_VERSION = 2;

export type Database = IDBPDatabase<RmbgDB>;

export function openDatabase(): Promise<Database> {
  return openDB<RmbgDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        db.createObjectStore('sessions', { keyPath: 'id' });
        const items = db.createObjectStore('items', { keyPath: 'id' });
        items.createIndex('by-session', 'sessionId');
        items.createIndex('by-status', 'status');
      }
      // v2: у элементов появляется overrides (слепки настроек по пресету)
      if (oldVersion < 2) {
        const store = transaction.objectStore('items');
        for await (const cursor of store) {
          const value = cursor.value as ItemRecord & { overrides?: ItemRecord['overrides'] };
          if (!Array.isArray(value.overrides)) {
            await cursor.update({ ...value, overrides: [] });
          }
        }
      }
    },
  });
}

export async function latestSession(db: Database): Promise<SessionRecord | null> {
  const sessions = await db.getAll('sessions');
  if (sessions.length === 0) return null;
  return sessions.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b));
}

export async function createSession(
  db: Database,
  presetId: string,
): Promise<SessionRecord> {
  const now = Date.now();
  const session: SessionRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    presetId,
  };
  await db.put('sessions', session);
  return session;
}

export async function touchSession(db: Database, sessionId: string): Promise<void> {
  const session = await db.get('sessions', sessionId);
  if (session === undefined) return;
  session.updatedAt = Date.now();
  await db.put('sessions', session);
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  const tx = db.transaction(['sessions', 'items'], 'readwrite');
  await tx.objectStore('sessions').delete(sessionId);
  const index = tx.objectStore('items').index('by-session');
  for await (const cursor of index.iterate(sessionId)) {
    await cursor.delete();
  }
  await tx.done;
}

export async function sessionItems(
  db: Database,
  sessionId: string,
): Promise<ItemRecord[]> {
  const items = await db.getAllFromIndex('items', 'by-session', sessionId);
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putItem(db: Database, item: ItemRecord): Promise<void> {
  await db.put('items', item);
}

export async function getItem(db: Database, id: string): Promise<ItemRecord | null> {
  const item = await db.get('items', id);
  return item ?? null;
}

export async function deleteItems(db: Database, ids: string[]): Promise<void> {
  const tx = db.transaction('items', 'readwrite');
  for (const id of ids) await tx.store.delete(id);
  await tx.done;
}

export async function clearAll(db: Database): Promise<void> {
  const tx = db.transaction(['sessions', 'items'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('items').clear();
  await tx.done;
}
