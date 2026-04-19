export interface SyncStorageAdapter<TValue> {
  read: () => Promise<TValue | null>;
  write: (value: TValue) => Promise<void>;
  clear: () => Promise<void>;
}

type SyncCacheRecord<TValue> = {
  key: string;
  value: TValue;
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
};

export type SyncBinaryAssetRecord = {
  key: string;
  resource: string;
  itemId: string;
  fileHash: string;
  blob: Blob;
  mimeType?: string;
  updatedAt: string;
};

const SYNC_DB_NAME = "taban-sync-engine";
const SYNC_DB_VERSION = 1;
const CACHE_STORE = "sync-cache";
const PENDING_STORE = "sync-pending-operations";
const BINARY_STORE = "sync-binary-assets";
const BINARY_RESOURCE_INDEX = "by-resource";

let dbPromise: Promise<IDBDatabase> | null = null;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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

        if (!db.objectStoreNames.contains(BINARY_STORE)) {
          const binaryStore = db.createObjectStore(BINARY_STORE, { keyPath: "key" });
          binaryStore.createIndex(BINARY_RESOURCE_INDEX, "resource", { unique: false });
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

export async function readCacheValue<TValue>(key: string) {
  const record = await withStore<SyncCacheRecord<TValue> | undefined>(CACHE_STORE, "readonly", (store) =>
    wrapRequest(store.get(key)),
  );
  return record?.value ?? null;
}

export async function writeCacheValue<TValue>(key: string, value: TValue) {
  await withStore<void>(CACHE_STORE, "readwrite", (store) =>
    wrapRequest(
      store.put({
        key,
        value,
        updatedAt: Date.now(),
      } satisfies SyncCacheRecord<TValue>),
    ).then(() => undefined),
  );
}

export async function clearCacheValue(key: string) {
  await withStore<void>(CACHE_STORE, "readwrite", (store) => wrapRequest(store.delete(key)).then(() => undefined));
}

export async function listPendingOperations<TPayload = unknown>(resource: string) {
  const operations = await withStore<SyncPendingOperationRecord<TPayload>[]>(PENDING_STORE, "readonly", (store) =>
    wrapRequest(store.index(BINARY_RESOURCE_INDEX).getAll(resource)),
  );
  return operations.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function upsertPendingOperation<TPayload = unknown>(operation: SyncPendingOperationRecord<TPayload>) {
  await withStore<void>(PENDING_STORE, "readwrite", (store) => wrapRequest(store.put(operation)).then(() => undefined));
}

export async function deletePendingOperation(operationId: string) {
  await withStore<void>(PENDING_STORE, "readwrite", (store) => wrapRequest(store.delete(operationId)).then(() => undefined));
}

export async function getBinaryAsset(key: string) {
  return withStore<SyncBinaryAssetRecord | undefined>(BINARY_STORE, "readonly", (store) => wrapRequest(store.get(key)));
}

export async function listBinaryAssets(resource: string) {
  return withStore<SyncBinaryAssetRecord[]>(BINARY_STORE, "readonly", (store) =>
    wrapRequest(store.index(BINARY_RESOURCE_INDEX).getAll(resource)),
  );
}

export async function upsertBinaryAsset(record: SyncBinaryAssetRecord) {
  await withStore<void>(BINARY_STORE, "readwrite", (store) => wrapRequest(store.put(record)).then(() => undefined));
}

export async function deleteBinaryAsset(key: string) {
  await withStore<void>(BINARY_STORE, "readwrite", (store) => wrapRequest(store.delete(key)).then(() => undefined));
}

export function createSecureLocalStorageAdapter<TValue>(options: {
  key: string;
  sensitive?: boolean;
}): SyncStorageAdapter<TValue> {
  const storageKey = options.key;
  const tempKey = `${storageKey}:tmp`;
  const isSensitive = Boolean(options.sensitive);

  const parse = async (raw: string | null) => {
    if (!raw) return null;
    const value = isSensitive ? await decryptString(storageKey, raw) : raw;
    return JSON.parse(value) as TValue;
  };

  return {
    async read() {
      if (!canUseWindow()) return null;
      try {
        const primaryValue = localStorage.getItem(storageKey);
        if (primaryValue) {
          return await parse(primaryValue);
        }

        const tempValue = localStorage.getItem(tempKey);
        if (!tempValue) return null;
        const recovered = await parse(tempValue);
        localStorage.setItem(storageKey, tempValue);
        localStorage.removeItem(tempKey);
        return recovered;
      } catch (error) {
        console.error(`Failed to read sync cache for ${storageKey}`, error);
        localStorage.removeItem(storageKey);
        localStorage.removeItem(tempKey);
        return null;
      }
    },
    async write(value) {
      if (!canUseWindow()) return;
      const serialized = JSON.stringify(value);
      const storageValue = isSensitive ? await encryptString(storageKey, serialized) : serialized;

      localStorage.setItem(tempKey, storageValue);
      localStorage.setItem(storageKey, storageValue);
      localStorage.removeItem(tempKey);
    },
    async clear() {
      if (!canUseWindow()) return;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(tempKey);
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
