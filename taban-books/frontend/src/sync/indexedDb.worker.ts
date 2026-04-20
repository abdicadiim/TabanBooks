/// <reference lib="webworker" />

type SyncCacheRecord<TValue = unknown> = {
  key: string;
  value: TValue;
  version_id: string;
  last_updated: string;
  updatedAt: number;
};

type SyncPendingOperationRecord<TPayload = unknown> = {
  id: string;
  resource: string;
  type: string;
  itemId?: string;
  payload?: TPayload;
  file?: Blob | ArrayBuffer | null;
  createdAt: string;
  retryCount: number;
  version_id?: string;
  last_updated?: string;
};

type SyncBinaryAssetRecord = {
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

type SyncBinaryAssetMetadata = Omit<SyncBinaryAssetRecord, "blob">;

const SYNC_DB_NAME = "taban-sync-engine";
const SYNC_DB_VERSION = 2;
const CACHE_STORE = "sync-cache";
const PENDING_STORE = "sync-pending-operations";
const BINARY_STORE = "sync-binary-assets";

const PENDING_RESOURCE_INDEX = "by-resource";
const BINARY_RESOURCE_INDEX = "by-resource";
const BINARY_RESOURCE_ID_INDEX = "by-resource-id";
const BINARY_TIMESTAMP_INDEX = "by-timestamp";
const BINARY_RESOURCE_TIMESTAMP_INDEX = "by-resource-id-timestamp";

type WorkerAction =
  | "cache.read"
  | "cache.write"
  | "cache.clear"
  | "pending.list"
  | "pending.upsert"
  | "pending.bulkUpsert"
  | "pending.delete"
  | "binary.get"
  | "binary.list"
  | "binary.upsert"
  | "binary.bulkUpsert"
  | "binary.delete";

type WorkerMessage = {
  requestId: string;
  action: WorkerAction;
  payload?: any;
};

type WorkerResponse = {
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function wrapRequest<TValue>(request: IDBRequest<TValue>) {
  return new Promise<TValue>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function normalizeBinaryRecord(record: SyncBinaryAssetRecord): SyncBinaryAssetRecord {
  return {
    ...record,
    resourceId: record.resourceId || record.resource,
    timestamp: record.timestamp ?? (Date.parse(record.updatedAt || "") || Date.now()),
  };
}

function toMetadata(record: SyncBinaryAssetRecord): SyncBinaryAssetMetadata {
  const { blob: _blob, ...meta } = normalizeBinaryRecord(record);
  return meta;
}

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: "key" });
        }

        let pendingStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          pendingStore = db.createObjectStore(PENDING_STORE, { keyPath: "id" });
        } else {
          pendingStore = request.transaction!.objectStore(PENDING_STORE);
        }
        if (!pendingStore.indexNames.contains(PENDING_RESOURCE_INDEX)) {
          pendingStore.createIndex(PENDING_RESOURCE_INDEX, "resource", { unique: false });
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
        if (!binaryStore.indexNames.contains(BINARY_RESOURCE_TIMESTAMP_INDEX)) {
          binaryStore.createIndex(BINARY_RESOURCE_TIMESTAMP_INDEX, ["resourceId", "timestamp"], { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open sync IndexedDB."));
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
    let result: TValue;
    let handlerError: unknown = null;

    transaction.oncomplete = () => {
      if (handlerError) {
        reject(handlerError);
        return;
      }
      resolve(result);
    };
    transaction.onerror = () => reject(transaction.error || new Error(`IndexedDB transaction failed for ${storeName}.`));
    transaction.onabort = () => reject(transaction.error || new Error(`IndexedDB transaction aborted for ${storeName}.`));

    Promise.resolve(handler(store))
      .then((value) => {
        result = value;
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

async function withStores<TValue>(
  storeNames: string[],
  mode: IDBTransactionMode,
  handler: (tx: IDBTransaction) => Promise<TValue> | TValue,
) {
  const db = await getDb();
  return new Promise<TValue>((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result: TValue;
    let handlerError: unknown = null;

    tx.oncomplete = () => {
      if (handlerError) {
        reject(handlerError);
        return;
      }
      resolve(result);
    };
    tx.onerror = () => reject(tx.error || new Error("IndexedDB multi-store transaction failed."));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB multi-store transaction aborted."));

    Promise.resolve(handler(tx))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        handlerError = error;
        try {
          tx.abort();
        } catch {
          reject(error);
        }
      });
  });
}

async function handleAction(action: WorkerAction, payload: any) {
  switch (action) {
    case "cache.read":
      return withStore<SyncCacheRecord | undefined>(CACHE_STORE, "readonly", (store) =>
        wrapRequest(store.get(String(payload?.key || ""))),
      );

    case "cache.write":
      return withStore<void>(CACHE_STORE, "readwrite", async (store) => {
        await wrapRequest(store.put(payload?.record as SyncCacheRecord));
      });

    case "cache.clear":
      return withStore<void>(CACHE_STORE, "readwrite", async (store) => {
        await wrapRequest(store.delete(String(payload?.key || "")));
      });

    case "pending.list":
      return withStore<SyncPendingOperationRecord[]>(PENDING_STORE, "readonly", (store) =>
        wrapRequest(store.index(PENDING_RESOURCE_INDEX).getAll(String(payload?.resource || ""))),
      );

    case "pending.upsert":
      return withStore<void>(PENDING_STORE, "readwrite", async (store) => {
        await wrapRequest(store.put(payload?.record as SyncPendingOperationRecord));
      });

    case "pending.bulkUpsert":
      return withStore<void>(PENDING_STORE, "readwrite", async (store) => {
        const records = Array.isArray(payload?.records) ? (payload.records as SyncPendingOperationRecord[]) : [];
        await Promise.all(records.map((record) => wrapRequest(store.put(record))));
      });

    case "pending.delete":
      return withStore<void>(PENDING_STORE, "readwrite", async (store) => {
        await wrapRequest(store.delete(String(payload?.id || "")));
      });

    case "binary.get":
      return withStore<SyncBinaryAssetRecord | SyncBinaryAssetMetadata | undefined>(BINARY_STORE, "readonly", async (store) => {
        const record = (await wrapRequest(store.get(String(payload?.key || "")))) as SyncBinaryAssetRecord | undefined;
        if (!record) return undefined;
        return payload?.metadataOnly ? toMetadata(record) : record;
      });

    case "binary.list":
      return withStore<Array<SyncBinaryAssetRecord | SyncBinaryAssetMetadata>>(BINARY_STORE, "readonly", async (store) => {
        const resource = String(payload?.resource || "");
        const rows = (await wrapRequest(
          store.index(BINARY_RESOURCE_ID_INDEX).getAll(resource),
        )) as SyncBinaryAssetRecord[];
        const normalized = rows.map(normalizeBinaryRecord).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (payload?.metadataOnly) {
          return normalized.map(toMetadata);
        }
        return normalized;
      });

    case "binary.upsert":
      return withStore<void>(BINARY_STORE, "readwrite", async (store) => {
        const record = normalizeBinaryRecord(payload?.record as SyncBinaryAssetRecord);
        await wrapRequest(store.put(record));
      });

    case "binary.bulkUpsert":
      return withStores<void>([BINARY_STORE], "readwrite", async (tx) => {
        const store = tx.objectStore(BINARY_STORE);
        const records = Array.isArray(payload?.records) ? (payload.records as SyncBinaryAssetRecord[]) : [];
        await Promise.all(records.map((record) => wrapRequest(store.put(normalizeBinaryRecord(record)))));
      });

    case "binary.delete":
      return withStore<void>(BINARY_STORE, "readwrite", async (store) => {
        await wrapRequest(store.delete(String(payload?.key || "")));
      });

    default:
      throw new Error(`Unsupported worker action: ${String(action)}`);
  }
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { requestId, action, payload } = event.data || {};
  if (!requestId || !action) return;

  try {
    const data = await handleAction(action, payload);
    const response: WorkerResponse = { requestId, ok: true, data };
    (self as DedicatedWorkerGlobalScope).postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      requestId,
      ok: false,
      error: String((error as any)?.message || error || "Worker action failed."),
    };
    (self as DedicatedWorkerGlobalScope).postMessage(response);
  }
};

