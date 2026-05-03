/**
 * Transactional CRUD for local IndexedDB projects.
 */

import {
  APP_META_KEY,
  getProjectDatabase,
  STORE_APP_META,
  STORE_PROJECT_PAYLOADS,
  STORE_PROJECTS_META,
} from './projectDb';

export interface ProjectMeta {
  projectId: string;
  displayName: string;
  createdAt: string;
  lastModified: string;
  presetForkedFrom?: string | null;
  /** Node graph icon id (see `iconsNodeRegistry` / project avatar picker). */
  avatarNodeIcon?: string;
  /** Design token suffix, e.g. `orange-red-gray-60` → `var(--color-orange-red-gray-60)`. */
  avatarBgToken?: string;
  avatarIconColorToken?: string;
}

export interface ProjectPayloadRecord {
  projectId: string;
  /** SerializedGraphFile JSON string (serializeGraph output) */
  json: string;
}

export interface AppMetaRecord {
  lastOpenedProjectId?: string;
  schemaVersion: number;
}

export const APP_META_SCHEMA_VERSION = 1;

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error ?? new Error('IDB request failed'));
  });
}

/** List metadata for all stored projects */
export async function listProjectMeta(): Promise<ProjectMeta[]> {
  const db = await getProjectDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS_META], 'readonly');
    const store = tx.objectStore(STORE_PROJECTS_META);
    const req = store.getAll();
    req.onsuccess = (): void => {
      resolve((req.result ?? []) as ProjectMeta[]);
    };
    req.onerror = (): void => reject(req.error ?? new Error('listProjectMeta failed'));
  });
}

export async function getProjectMeta(projectId: string): Promise<ProjectMeta | undefined> {
  const db = await getProjectDatabase();
  const tx = db.transaction([STORE_PROJECTS_META], 'readonly');
  const store = tx.objectStore(STORE_PROJECTS_META);
  return requestToPromise(store.get(projectId)) as Promise<ProjectMeta | undefined>;
}

export async function getProjectPayload(projectId: string): Promise<ProjectPayloadRecord | undefined> {
  const db = await getProjectDatabase();
  const tx = db.transaction([STORE_PROJECT_PAYLOADS], 'readonly');
  const store = tx.objectStore(STORE_PROJECT_PAYLOADS);
  return requestToPromise(store.get(projectId)) as Promise<ProjectPayloadRecord | undefined>;
}

/** Returns undefined if missing or corrupt (caller may repair/delete) */
export async function readAppMeta(): Promise<AppMetaRecord | undefined> {
  try {
    const db = await getProjectDatabase();
    const tx = db.transaction([STORE_APP_META], 'readonly');
    const store = tx.objectStore(STORE_APP_META);
    const raw = await requestToPromise(store.get(APP_META_KEY));
    if (!raw || typeof raw !== 'object') return undefined;
    const record = raw as AppMetaRecord;
    if (record.schemaVersion !== APP_META_SCHEMA_VERSION) return undefined;
    return record;
  } catch {
    return undefined;
  }
}

export async function writeAppMeta(partial: Partial<Pick<AppMetaRecord, 'lastOpenedProjectId'>>): Promise<void> {
  const db = await getProjectDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_APP_META], 'readwrite');
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error ?? new Error('writeAppMeta failed'));
    tx.onabort = (): void => reject(tx.error ?? new Error('writeAppMeta aborted'));
    const store = tx.objectStore(STORE_APP_META);
    const getReq = store.get(APP_META_KEY);
    getReq.onsuccess = (): void => {
      const prev =
        (getReq.result as AppMetaRecord | undefined) ??
        ({
          schemaVersion: APP_META_SCHEMA_VERSION,
        } satisfies AppMetaRecord);
      store.put(
        {
          ...prev,
          ...partial,
          schemaVersion: APP_META_SCHEMA_VERSION,
        } satisfies AppMetaRecord,
        APP_META_KEY
      );
    };
    getReq.onerror = (): void => reject(getReq.error ?? new Error('read app meta'));
  });
}

interface CreateProjectInput {
  projectId: string;
  json: string;
  displayName: string;
  createdAtISO: string;
  lastModifiedISO: string;
  presetForkedFrom?: string | null;
  avatarNodeIcon?: string;
  avatarBgToken?: string;
  avatarIconColorToken?: string;
  /** When true (default), set lastOpenedProjectId */
  setLastOpened?: boolean;
}

/** Atomic insert meta + payload; optionally bump lastOpened */
export async function createProjectAtomic(input: CreateProjectInput): Promise<void> {
  const db = await getProjectDatabase();
  const storeNames =
    input.setLastOpened === false
      ? [STORE_PROJECTS_META, STORE_PROJECT_PAYLOADS]
      : [STORE_PROJECTS_META, STORE_PROJECT_PAYLOADS, STORE_APP_META];

  let appRecord: AppMetaRecord | undefined;
  if (input.setLastOpened !== false) {
    const prev = (await readAppMeta()) ?? ({ schemaVersion: APP_META_SCHEMA_VERSION } satisfies AppMetaRecord);
    appRecord = {
      ...prev,
      lastOpenedProjectId: input.projectId,
      schemaVersion: APP_META_SCHEMA_VERSION,
    };
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error ?? new Error('createProjectAtomic failed'));
    tx.onabort = (): void => reject(tx.error ?? new Error('createProjectAtomic aborted'));

    tx.objectStore(STORE_PROJECTS_META).put({
      projectId: input.projectId,
      displayName: input.displayName,
      createdAt: input.createdAtISO,
      lastModified: input.lastModifiedISO,
      ...(input.presetForkedFrom !== undefined ? { presetForkedFrom: input.presetForkedFrom } : {}),
      ...(input.avatarNodeIcon !== undefined ? { avatarNodeIcon: input.avatarNodeIcon } : {}),
      ...(input.avatarBgToken !== undefined ? { avatarBgToken: input.avatarBgToken } : {}),
      ...(input.avatarIconColorToken !== undefined ? { avatarIconColorToken: input.avatarIconColorToken } : {}),
    } satisfies ProjectMeta);

    tx.objectStore(STORE_PROJECT_PAYLOADS).put({
      projectId: input.projectId,
      json: input.json,
    });

    if (appRecord) {
      tx.objectStore(STORE_APP_META).put(appRecord, APP_META_KEY);
    }
  });
}

interface SavePayloadInput {
  projectId: string;
  json: string;
  displayName: string;
  lastModifiedISO: string;
}

/** Atomic payload save + meta name/time */
export async function saveProjectPayloadAtomic(input: SavePayloadInput): Promise<void> {
  const prev = await getProjectMeta(input.projectId);
  if (!prev) {
    throw new Error(`Project not found: ${input.projectId}`);
  }
  const db = await getProjectDatabase();
  const metaRow: ProjectMeta = {
    ...prev,
    displayName: input.displayName,
    lastModified: input.lastModifiedISO,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS_META, STORE_PROJECT_PAYLOADS], 'readwrite');
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error ?? new Error('saveProjectPayloadAtomic failed'));
    tx.onabort = (): void => reject(tx.error ?? new Error('saveProjectPayloadAtomic aborted'));
    tx.objectStore(STORE_PROJECTS_META).put(metaRow);
    tx.objectStore(STORE_PROJECT_PAYLOADS).put({
      projectId: input.projectId,
      json: input.json,
    });
  });
}

/** Delete meta + payload; clear lastOpened if it matches */
export async function deleteProjectAtomic(projectId: string): Promise<void> {
  const db = await getProjectDatabase();
  const appBefore = await readAppMeta();
  const clearLastOpened = appBefore?.lastOpenedProjectId === projectId;
  const nextApp: AppMetaRecord | undefined =
    clearLastOpened && appBefore
      ? { ...appBefore, lastOpenedProjectId: undefined, schemaVersion: APP_META_SCHEMA_VERSION }
      : undefined;

  await new Promise<void>((resolve, reject) => {
    const stores = nextApp
      ? [STORE_PROJECTS_META, STORE_PROJECT_PAYLOADS, STORE_APP_META]
      : [STORE_PROJECTS_META, STORE_PROJECT_PAYLOADS];
    const tx = db.transaction(stores, 'readwrite');
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error ?? new Error('deleteProjectAtomic failed'));
    tx.onabort = (): void => reject(tx.error ?? new Error('deleteProjectAtomic aborted'));

    tx.objectStore(STORE_PROJECTS_META).delete(projectId);
    tx.objectStore(STORE_PROJECT_PAYLOADS).delete(projectId);
    if (nextApp) {
      tx.objectStore(STORE_APP_META).put(nextApp, APP_META_KEY);
    }
  });
}

export interface UpdateProjectAppearanceInput {
  projectId: string;
  avatarNodeIcon: string;
  avatarBgToken: string;
  avatarIconColorToken: string;
  lastModifiedISO: string;
}

/** Meta-only update (avatar); bumps `lastModified`. */
export async function updateProjectAppearanceAtomic(input: UpdateProjectAppearanceInput): Promise<void> {
  const prev = await getProjectMeta(input.projectId);
  if (!prev) {
    throw new Error(`Project not found: ${input.projectId}`);
  }
  const db = await getProjectDatabase();
  const metaRow: ProjectMeta = {
    ...prev,
    avatarNodeIcon: input.avatarNodeIcon,
    avatarBgToken: input.avatarBgToken,
    avatarIconColorToken: input.avatarIconColorToken,
    lastModified: input.lastModifiedISO,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS_META], 'readwrite');
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error ?? new Error('updateProjectAppearanceAtomic failed'));
    tx.onabort = (): void => reject(tx.error ?? new Error('updateProjectAppearanceAtomic aborted'));
    tx.objectStore(STORE_PROJECTS_META).put(metaRow);
  });
}

interface DuplicateProjectInput {
  sourceProjectId: string;
  newProjectId: string;
  createdAtISO: string;
  lastModifiedISO: string;
}

/** Copies payload verbatim into a new UUID row */
export async function duplicateProjectAtomic(input: DuplicateProjectInput): Promise<void> {
  const payload = await getProjectPayload(input.sourceProjectId);
  const meta = await getProjectMeta(input.sourceProjectId);
  if (!payload?.json || !meta) {
    throw new Error(`Source project missing: ${input.sourceProjectId}`);
  }
  const copyName = `${meta.displayName.trim() || 'Project'} copy`;
  await createProjectAtomic({
    projectId: input.newProjectId,
    json: payload.json,
    displayName: copyName.slice(0, 200),
    createdAtISO: input.createdAtISO,
    lastModifiedISO: input.lastModifiedISO,
    presetForkedFrom: meta.presetForkedFrom ?? null,
    ...(meta.avatarNodeIcon !== undefined ? { avatarNodeIcon: meta.avatarNodeIcon } : {}),
    ...(meta.avatarBgToken !== undefined ? { avatarBgToken: meta.avatarBgToken } : {}),
    ...(meta.avatarIconColorToken !== undefined ? { avatarIconColorToken: meta.avatarIconColorToken } : {}),
    setLastOpened: true,
  });
}
