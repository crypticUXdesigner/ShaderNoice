/**
 * IndexedDB schema for local user projects (see docs/implementation/ for related specs when present).
 */

export const PROJECT_DB_NAME = 'shadernoice-projects';
export const PROJECT_DB_VERSION = 1;

export const STORE_PROJECTS_META = 'projectsMeta';
export const STORE_PROJECT_PAYLOADS = 'projectPayloads';
export const STORE_APP_META = 'appMeta';

/** Single key row for app-wide metadata */
export const APP_META_KEY = 'app';

/** All object store names — keep in dependency order for version opens */
export const ALL_PROJECT_STORES = [
  STORE_PROJECTS_META,
  STORE_PROJECT_PAYLOADS,
  STORE_APP_META,
] as const;

export function openProjectDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION);
    req.onblocked = (): void => {
      reject(new Error('IndexedDB open blocked (another tab may be upgrading)'));
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
    req.onsuccess = (): void => {
      resolve(req.result);
    };
    req.onupgradeneeded = (ev): void => {
      const db = req.result;
      const oldVersion = ev.oldVersion;
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS_META)) {
          db.createObjectStore(STORE_PROJECTS_META, { keyPath: 'projectId' });
        }
        if (!db.objectStoreNames.contains(STORE_PROJECT_PAYLOADS)) {
          db.createObjectStore(STORE_PROJECT_PAYLOADS, { keyPath: 'projectId' });
        }
        if (!db.objectStoreNames.contains(STORE_APP_META)) {
          db.createObjectStore(STORE_APP_META);
        }
      }
    };
  });
}

let dbSingleton: Promise<IDBDatabase> | null = null;

/** Shared DB handle; reuse across reads/writes. */
export function getProjectDatabase(): Promise<IDBDatabase> {
  dbSingleton ??= openProjectDatabase();
  return dbSingleton;
}

/** For tests — close open handle(s), delete DB, clear singleton */
export async function resetProjectDatabaseForTests(): Promise<void> {
  if (dbSingleton) {
    try {
      const db = await dbSingleton;
      db.close();
    } catch {
      // Opening may have failed — still try deleteDatabase
    }
  }
  dbSingleton = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(PROJECT_DB_NAME);
    req.onsuccess = (): void => resolve();
    req.onerror = (): void => reject(req.error ?? new Error('deleteDatabase failed'));
    req.onblocked = (): void => resolve();
  });
}
