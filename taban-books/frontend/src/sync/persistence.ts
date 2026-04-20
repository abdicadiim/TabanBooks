import { attachVersionStamp, createVersionStamp, isPlainObject, type SyncVersionStamp } from "./versioning";
import { callIndexedDbWorker } from "./indexedDbWorkerClient";

export interface SyncStorageAdapter<TValue> {
  read: () => Promise<TValue | null>;
  write: (value: TValue) => Promise<void>;
  clear: () => Promise<void>;
}

type SyncCacheRecord<TValue> = {
  key: string;
  value: TValue;
  version_id: string;
  last_updated: string;
  updatedAt: number;
};

export type SyncPendingOperationRecord<TPayload = unknown> = {
  id: string;
  resource: string;
  type: string;
  itemId?: string;
  payload?: TPayload;
  file?: Blob | null;
  createdAt: string;
  retryCount: number;
  version_id?: string;
  last_updated?: string;
};

export type SyncBinaryAssetRecord = {
  key: string;
  resource: string;
  resourceId?: string;
  itemId: string;
  fileHash: string;
  fileHashAlgorithm?: string;
  blob: Blob | ArrayBuffer;
  mimeType?: string;
  updatedAt: string;
  timestamp?: number;
  version_id?: string;
  last_updated?: string;
};

const SYNC_DB_NAME = "taban-sync-engine";
const SYNC_DB_VERSION = 2;
const CACHE_STORE = "sync-cache";
const PENDING_STORE = "sync-pending-operations";
const BINARY_STORE = "sync-binary-assets";
const BINARY_RESOURCE_INDEX = "by-resource";
const BINARY_RESOURCE_ID_INDEX = "by-resource-id";
const BINARY_TIMESTAMP_INDEX = "by-timestamp";

let dbPromise: Promise<IDBDatabase> | null = null;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const DEFAULT_LOCAL_STORAGE_MAX_BYTES = 64 * 1024;

function createLocalStorageEnvelope<TValue>(value: TValue): TValue & SyncVersionStamp {
  return attachVersionStamp(value) as TValue & SyncVersionStamp;
}

function serializeEnvelope<TValue>(value: TValue, sensitive: boolean, namespace: string) {
  const payload = JSON.stringify(createLocalStorageEnvelope(value));
  return sensitive ? encryptString(namespace, payload) : Promise.resolve(payload);
}

async function parseEnvelope<TValue>(namespace: string, raw: string, sensitive: boolean) {
  const payload = sensitive ? await decryptString(namespace, raw) : raw;
  const parsed = JSON.parse(payload) as TValue | Record<string, unknown>;
  return isPlainObject(parsed) ? (attachVersionStamp(parsed) as TValue) : parsed;
}

function canUseWindow() {
  return typeof window !== "undefined";
}

function canUseIndexedDb() {
  return canUseWindow() && typeof window.indexedDB !== "undefined";
}

function getAuthTokenFingerprint(namespace: string) {
  if (!canUseWindow()) return `anonymous:${namespace}`;
  const authMode = localStorage.getItem("taban_auth_mode");
  const token = localStorage.getItem("auth_token") || "anonymous";
  return `taban-sync:${namespace}:${authMode || "remote"}:${token}`;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function fromBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveEncryptionKey(namespace: string) {
  const seed = textEncoder.encode(getAuthTokenFingerprint(namespace));
  const digest = await window.crypto.subtle.digest("SHA-256", seed);
  return window.crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptString(namespace: string, plaintext: string) {
  const key = await deriveEncryptionKey(namespace);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(plaintext),
  );
  return JSON.stringify({
    iv: toBase64(iv),
    value: toBase64(new Uint8Array(cipherBuffer)),
  });
}

async function decryptString(namespace: string, payload: string) {
  const parsed = JSON.parse(payload) as { iv?: string; value?: string };
  if (!parsed.iv || !parsed.value) {
    throw new Error("Encrypted sync payload is malformed.");
  }
  const key = await deriveEncryptionKey(namespace);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(parsed.iv) },
    key,
    fromBase64(parsed.value),
  );
  return textDecoder.decode(decrypted);
}

function getDb() {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_STORE, { keyPath: "id" });
          pendingStore.createIndex(BINARY_RESOURCE_INDEX, "resource", { unique: false });
        }

        let binaryStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(BINARY_STORE)) {
          binaryStore = db.createObjectStore(BINARY_STORE, { keyPath: "key" });
        } else {
          binaryStore = request.transaction!.objectStore(BINARY_STORE);
        }
        if (!binaryStore.indexNames.contains(BINARY_RESOURCE_INDEX)) {
          binaryStore.createIndex(BINARY_RESOURCE_INDEX, "resource", { unique: false });
        }
        if (!binaryStore.indexNames.contains(BINARY_RESOURCE_ID_INDEX)) {
          binaryStore.createIndex(BINARY_RESOURCE_ID_INDEX, "resourceId", { unique: false });
        }
        if (!binaryStore.indexNames.contains(BINARY_TIMESTAMP_INDEX)) {
          binaryStore.createIndex(BINARY_TIMESTAMP_INDEX, "timestamp", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    });
  }

  return dbPromise;
}

async function withStore<TValue>(
  storeName: string,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<TValue> | TValue,
) {
  const db = await getDb();
  return new Promise<TValue>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let handlerResult: TValue;
    let handlerError: unknown = null;

    transaction.oncomplete = () => {
      if (handlerError) {
        reject(handlerError);
        return;
      }
      resolve(handlerResult);
    };
    transaction.onerror = () => reject(transaction.error || new Error(`IndexedDB write failed for ${storeName}.`));
    transaction.onabort = () => reject(transaction.error || new Error(`IndexedDB transaction aborted for ${storeName}.`));

    Promise.resolve(handler(store))
      .then((result) => {
        handlerResult = result;
      })
      .catch((error) => {
        handlerError = error;
        try {
          transaction.abort();
        } catch {
          reject(error);
        }
      });
  });
}

function wrapRequest<TValue>(request: IDBRequest<TValue>) {
  return new Promise<TValue>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function normalizeVersionedValue<TValue>(value: TValue) {
  return isPlainObject(value) ? (attachVersionStamp(value) as TValue) : value;
}

async function readLocalStorageValue<TValue>(storageKey: string, sensitive: boolean) {
  if (!canUseWindow()) return null;

  const primaryValue = localStorage.getItem(storageKey);
  const tempKey = `${storageKey}:tmp`;
  const rawValue = primaryValue || localStorage.getItem(tempKey);
  if (!rawValue) return null;

  try {
    const parsedValue = (await parseEnvelope<TValue>(storageKey, rawValue, sensitive)) as TValue;
    if (!primaryValue) {
      localStorage.setItem(storageKey, rawValue);
      localStorage.removeItem(tempKey);
    }
    return parsedValue;
  } catch (error) {
    console.error(`Failed to read sync cache for ${storageKey}`, error);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(tempKey);
    return null;
  }
}

async function writeLocalStorageValue<TValue>(storageKey: string, value: TValue, sensitive: boolean) {
  if (!canUseWindow()) return;

  const tempKey = `${storageKey}:tmp`;
  const serialized = await serializeEnvelope(value, sensitive, storageKey);
  localStorage.setItem(tempKey, serialized);
  localStorage.setItem(storageKey, serialized);
  localStorage.removeItem(tempKey);
}

function getSerializedSize(value: string) {
  return typeof Blob !== "undefined" ? new Blob([value]).size : value.length;
}

export async function readCacheValue<TValue>(key: string) {
  const record = await callIndexedDbWorker<SyncCacheRecord<TValue> | undefined>("cache.read", { key });
  if (!record) return null;
  return normalizeVersionedValue(record.value);
}

export async function writeCacheValue<TValue>(key: string, value: TValue) {
  const nextValue = normalizeVersionedValue(value);
  const stamp = createVersionStamp();
  await callIndexedDbWorker<void>("cache.write", {
    record: {
      key,
      value: nextValue,
      version_id: String((nextValue as Record<string, unknown>)?.version_id || stamp.version_id),
      last_updated: String((nextValue as Record<string, unknown>)?.last_updated || stamp.last_updated),
      updatedAt: Date.now(),
    } satisfies SyncCacheRecord<TValue>,
  });
}

export async function clearCacheValue(key: string) {
  await callIndexedDbWorker<void>("cache.clear", { key });
}

export async function listPendingOperations<TPayload = unknown>(resource: string) {
  const operations = await callIndexedDbWorker<SyncPendingOperationRecord<TPayload>[]>("pending.list", { resource });
  const fallbackStamp = createVersionStamp();
  return operations
    .map((operation) => ({
      ...operation,
      version_id: operation.version_id || fallbackStamp.version_id,
      last_updated: operation.last_updated || fallbackStamp.last_updated,
    }))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function upsertPendingOperation<TPayload = unknown>(operation: SyncPendingOperationRecord<TPayload>) {
  const stamp = createVersionStamp();
  await callIndexedDbWorker<void>("pending.upsert", {
    record: {
      ...operation,
      version_id: operation.version_id || stamp.version_id,
      last_updated: operation.last_updated || stamp.last_updated,
    },
  });
}

export async function deletePendingOperation(operationId: string) {
  await callIndexedDbWorker<void>("pending.delete", { id: operationId });
}

export async function bulkUpsertPendingOperations<TPayload = unknown>(
  operations: Array<SyncPendingOperationRecord<TPayload>>,
) {
  const stamp = createVersionStamp();
  const records = (Array.isArray(operations) ? operations : []).map((operation) => ({
    ...operation,
    version_id: operation.version_id || stamp.version_id,
    last_updated: operation.last_updated || stamp.last_updated,
  }));
  await callIndexedDbWorker<void>("pending.bulkUpsert", { records });
}

export type SyncBinaryAssetMetadata = Omit<SyncBinaryAssetRecord, "blob">;

export async function getBinaryAsset(key: string, options: { metadataOnly: true }): Promise<SyncBinaryAssetMetadata | undefined>;
export async function getBinaryAsset(key: string, options?: { metadataOnly?: false }): Promise<SyncBinaryAssetRecord | undefined>;
export async function getBinaryAsset(key: string, options?: { metadataOnly?: boolean }) {
  return callIndexedDbWorker<SyncBinaryAssetRecord | SyncBinaryAssetMetadata | undefined>("binary.get", {
    key,
    metadataOnly: Boolean(options?.metadataOnly),
  });
}

export async function listBinaryAssets(resource: string, options: { metadataOnly: true }): Promise<SyncBinaryAssetMetadata[]>;
export async function listBinaryAssets(resource: string, options?: { metadataOnly?: false }): Promise<SyncBinaryAssetRecord[]>;
export async function listBinaryAssets(resource: string, options?: { metadataOnly?: boolean }) {
  return callIndexedDbWorker<Array<SyncBinaryAssetRecord | SyncBinaryAssetMetadata>>("binary.list", {
    resource,
    metadataOnly: options?.metadataOnly ?? true,
  }) as Promise<any>;
}

export async function upsertBinaryAsset(record: SyncBinaryAssetRecord) {
  const stamp = createVersionStamp();
  await callIndexedDbWorker<void>("binary.upsert", {
    record: {
      ...record,
      resourceId: record.resourceId || record.resource,
      timestamp: record.timestamp ?? (Date.parse(record.updatedAt || "") || Date.now()),
      version_id: record.version_id || stamp.version_id,
      last_updated: record.last_updated || stamp.last_updated,
    },
  });
}

export async function bulkUpsertBinaryAssets(records: SyncBinaryAssetRecord[]) {
  const stamp = createVersionStamp();
  const normalized = (Array.isArray(records) ? records : []).map((record) => ({
    ...record,
    resourceId: record.resourceId || record.resource,
    timestamp: record.timestamp ?? (Date.parse(record.updatedAt || "") || Date.now()),
    version_id: record.version_id || stamp.version_id,
    last_updated: record.last_updated || stamp.last_updated,
  }));
  await callIndexedDbWorker<void>("binary.bulkUpsert", { records: normalized });
}

export async function deleteBinaryAsset(key: string) {
  await callIndexedDbWorker<void>("binary.delete", { key });
}

export function createSecureLocalStorageAdapter<TValue>(options: {
  key: string;
  sensitive?: boolean;
}): SyncStorageAdapter<TValue> {
  const storageKey = options.key;
  const isSensitive = Boolean(options.sensitive);

  return {
    async read() {
      return readLocalStorageValue<TValue>(storageKey, isSensitive);
    },
    async write(value) {
      await writeLocalStorageValue(storageKey, value, isSensitive);
    },
    async clear() {
      if (!canUseWindow()) return;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}:tmp`);
    },
  };
}

export function createIndexedDbAdapter<TValue>(key: string): SyncStorageAdapter<TValue> {
  return {
    read: () => readCacheValue<TValue>(key),
    write: (value) => writeCacheValue(key, value),
    clear: () => clearCacheValue(key),
  };
}

export function createVersionedLocalStorageAdapter<TValue>(options: {
  key: string;
  sensitive?: boolean;
}): SyncStorageAdapter<TValue> {
  const storageKey = options.key;
  const isSensitive = Boolean(options.sensitive);

  return {
    async read() {
      return readLocalStorageValue<TValue>(storageKey, isSensitive);
    },
    async write(value) {
      await writeLocalStorageValue(storageKey, value, isSensitive);
    },
    async clear() {
      if (!canUseWindow()) return;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}:tmp`);
    },
  };
}

export function createAdaptiveStorageAdapter<TValue>(options: {
  key: string;
  sensitive?: boolean;
  maxLocalStorageBytes?: number;
}): SyncStorageAdapter<TValue> {
  const localStorageAdapter = createVersionedLocalStorageAdapter<TValue>({
    key: options.key,
    sensitive: options.sensitive,
  });
  const indexedDbAdapter = createIndexedDbAdapter<TValue>(options.key);
  const maxLocalStorageBytes = options.maxLocalStorageBytes ?? DEFAULT_LOCAL_STORAGE_MAX_BYTES;

  return {
    async read() {
      const localValue = await localStorageAdapter.read();
      if (localValue !== null) {
        return localValue;
      }
      return indexedDbAdapter.read();
    },
    async write(value) {
      const normalizedValue = normalizeVersionedValue(value);
      const serialized = JSON.stringify(normalizedValue);
      if (getSerializedSize(serialized) <= maxLocalStorageBytes) {
        try {
          await localStorageAdapter.write(normalizedValue);
          await indexedDbAdapter.clear();
          return;
        } catch (error) {
          console.warn(`LocalStorage write failed for ${options.key}, falling back to IndexedDB.`, error);
        }
      }

      await indexedDbAdapter.write(normalizedValue);
      await localStorageAdapter.clear();
    },
    async clear() {
      await Promise.all([localStorageAdapter.clear(), indexedDbAdapter.clear()]);
    },
  };
}
