import { documentsAPI } from "../services/api";
import { API_BASE_URL } from "../services/auth";
import {
  SyncEngine,
  isSyncAuthTokenValid,
  type SyncManifestEntry,
  type SyncResourcePayload,
} from "../sync/SyncEngine";
import {
  createAdaptiveStorageAdapter,
  deleteBinaryAsset,
  deletePendingOperation,
  listBinaryAssets,
  listPendingOperations,
  type SyncBinaryAssetRecord,
  type SyncPendingOperationRecord,
  upsertBinaryAsset,
  upsertPendingOperation,
} from "../sync/persistence";
import { createVersionStamp } from "../sync/versioning";

type DocumentRecord = {
  id: string;
  name: string;
  type?: string;
  folder?: string;
  associatedTo?: string;
  uploadedBy?: string;
  size?: number;
  status?: string;
  module?: string;
  fileName?: string;
  filePath?: string;
  file_hash?: string;
  file_hash_algorithm?: string;
  download_url?: string;
  mimeType?: string;
  mime_type?: string;
  relatedTo?: {
    type?: string;
    id?: string;
  };
  tags?: string[];
  description?: string;
  uploadedOn?: string;
  uploadedTime?: string;
  uploadedOnFormatted?: string;
  createdAt?: string;
  updatedAt?: string;
  version_id: string;
  last_updated: string;
  pending_sync?: boolean;
  local_only?: boolean;
  [key: string]: unknown;
};

type DocumentSyncPayload = SyncResourcePayload<DocumentRecord>;

type PendingDocumentOperationPayload = {
  metadata?: Record<string, unknown>;
  updates?: Record<string, unknown>;
};

type PendingDocumentOperation = SyncPendingOperationRecord<PendingDocumentOperationPayload>;

const DOCUMENT_SYNC_RESOURCE = "documents";
const DOCUMENT_SYNC_CACHE_KEY = "sync:documents";
const DOCUMENT_BINARY_PREFIX = "documents:blob";

let cachedDocuments: DocumentRecord[] = [];
let flushPromise: Promise<void> | null = null;

const formatDateGB = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return {
      uploadedOn: "",
      uploadedTime: "",
      uploadedOnFormatted: "",
    };
  }
  return {
    uploadedOn: date.toLocaleDateString("en-GB"),
    uploadedTime: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    uploadedOnFormatted: date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

const canUseBrowser = () => typeof window !== "undefined";

const buildBinaryAssetKey = (documentId: string) => `${DOCUMENT_BINARY_PREFIX}:${documentId}`;

const isOfflineSyncError = (error: unknown) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  if (error && typeof error === "object" && "status" in error && typeof (error as { status?: number }).status === "number") {
    return false;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("failed to fetch") || message.includes("network") || message.includes("fetch");
};

const applyFilters = (docs: DocumentRecord[], filters: Record<string, unknown> = {}) => {
  if (!filters) return docs;
  return docs.filter((document) => {
    if (filters.module && document.module !== filters.module) return false;
    if (filters.relatedToType && document.relatedTo?.type !== filters.relatedToType) return false;
    if (filters.relatedToId && String(document.relatedTo?.id) !== String(filters.relatedToId)) return false;
    return true;
  });
};

const sortDocumentsByFreshness = (documents: DocumentRecord[]) =>
  [...documents].sort((left, right) =>
    String(right.last_updated || right.createdAt || "").localeCompare(String(left.last_updated || left.createdAt || "")),
  );

const buildManifestEntryFromDocument = (document: DocumentRecord): SyncManifestEntry => ({
  id: document.id,
  version_id: document.version_id,
  last_updated: document.last_updated,
  file_hash: document.file_hash,
  file_hash_algorithm: String(document.file_hash_algorithm || "sha256"),
  file_size: document.size,
  mime_type: String(document.mimeType || document.mime_type || ""),
  download_url: document.download_url,
});

const createEmptyPayload = (): DocumentSyncPayload => {
  const stamp = createVersionStamp();
  return {
    resource: DOCUMENT_SYNC_RESOURCE,
    version_id: stamp.version_id,
    last_updated: stamp.last_updated,
    items: [],
    manifest: [],
    pending_operations: 0,
  };
};

const normalizeManifestEntry = (entry: any): SyncManifestEntry => ({
  ...entry,
  id: String(entry?.id || entry?._id || ""),
  version_id: String(entry?.version_id || createVersionStamp().version_id),
  last_updated: String(entry?.last_updated || new Date().toISOString()),
  file_hash: entry?.file_hash ? String(entry.file_hash) : undefined,
  file_hash_algorithm: entry?.file_hash_algorithm ? String(entry.file_hash_algorithm) : undefined,
  file_size: typeof entry?.file_size === "number" ? entry.file_size : undefined,
  mime_type: entry?.mime_type ? String(entry.mime_type) : undefined,
  download_url: entry?.download_url ? String(entry.download_url) : undefined,
});

const normalizeDocument = (raw: any): DocumentRecord => {
  const stamp = createVersionStamp();
  const createdAt = raw?.createdAt || raw?.uploadedOn || raw?.last_updated || stamp.last_updated;
  const name = raw?.name || raw?.fileName || "Untitled";
  const fileTypeFromName = String(name).includes(".") ? String(name).split(".").pop() : "";
  const id = String(raw?.id || raw?._id || raw?.documentId || stamp.version_id);
  const folder = raw?.folder && raw.folder !== "root" ? String(raw.folder) : "Inbox";

  return {
    ...raw,
    id,
    _id: id,
    name,
    type: String(raw?.type || fileTypeFromName || "other"),
    folder,
    associatedTo: raw?.associatedTo || raw?.relatedTo?.type || "",
    uploadedBy:
      raw?.uploadedByName ||
      raw?.uploadedBy?.name ||
      raw?.uploadedBy ||
      raw?.uploadedByEmail ||
      "Me",
    size:
      typeof raw?.fileSize === "number"
        ? raw.fileSize
        : typeof raw?.size === "number"
          ? raw.size
          : undefined,
    file_hash: raw?.file_hash ? String(raw.file_hash) : undefined,
    file_hash_algorithm: raw?.file_hash_algorithm ? String(raw.file_hash_algorithm) : undefined,
    download_url:
      raw?.download_url ||
      (id ? `${API_BASE_URL}/documents/${encodeURIComponent(id)}/download` : undefined),
    mimeType: raw?.mimeType || raw?.mime_type,
    mime_type: raw?.mime_type || raw?.mimeType,
    version_id: String(raw?.version_id || stamp.version_id),
    last_updated: String(raw?.last_updated || raw?.updatedAt || createdAt || stamp.last_updated),
    pending_sync: Boolean(raw?.pending_sync),
    local_only: Boolean(raw?.local_only),
    relatedTo: raw?.relatedTo
      ? {
          type: raw.relatedTo.type ? String(raw.relatedTo.type) : undefined,
          id: raw.relatedTo.id ? String(raw.relatedTo.id) : undefined,
        }
      : undefined,
    ...formatDateGB(createdAt),
  };
};

const normalizePayload = (raw: any): DocumentSyncPayload => {
  const stamp = createVersionStamp();
  const items = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => normalizeDocument(item))
    : Array.isArray(raw?.data)
      ? raw.data.map((item: any) => normalizeDocument(item))
      : [];

  const manifest = Array.isArray(raw?.manifest)
    ? raw.manifest.map((entry: any) => normalizeManifestEntry(entry))
    : items.map((item) => buildManifestEntryFromDocument(item));

  return {
    ...raw,
    resource: DOCUMENT_SYNC_RESOURCE,
    version_id: String(raw?.version_id || stamp.version_id),
    last_updated: String(raw?.last_updated || stamp.last_updated),
    items: sortDocumentsByFreshness(items),
    manifest,
    pending_operations:
      typeof raw?.pending_operations === "number"
        ? raw.pending_operations
        : items.filter((item) => item.pending_sync).length,
  };
};

const dispatchDocumentEvent = (eventName: string, detail: unknown) => {
  if (!canUseBrowser()) return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

const buildAuthHeaders = (headers: Record<string, string> = {}) => {
  if (!canUseBrowser()) return headers;
  const authMode = localStorage.getItem("taban_auth_mode");
  const token = localStorage.getItem("auth_token");
  if (!token || authMode === "local") return headers;
  return {
    Authorization: `Bearer ${token}`,
    ...headers,
  };
};

const readResponsePayload = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return { success: response.ok, message: text };
};

const hashBlob = async (file: Blob) => {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return "";
  }
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const fetchDocumentSyncEnvelope = async ({
  ifModifiedSince,
  signal,
}: {
  ifModifiedSince?: string;
  signal: AbortSignal;
}) => {
  const syncUrl = new URL(`${API_BASE_URL}/documents/sync`, window.location.origin);
  if (ifModifiedSince) {
    syncUrl.searchParams.set("last_updated", ifModifiedSince);
  }

  const response = await fetch(syncUrl.toString(), {
    method: "GET",
    headers: buildAuthHeaders(
      ifModifiedSince
        ? {
            "If-Modified-Since": ifModifiedSince,
          }
        : {},
    ),
    signal,
  });

  if (response.status === 304) {
    return { status: 304 as const };
  }

  const payload = await readResponsePayload(response);
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Document sync failed with ${response.status}.`;
    throw new Error(message);
  }

  return {
    status: 200 as const,
    payload: normalizePayload(payload?.data || payload),
  };
};

const reconcileBinaryManifest = async (manifest: SyncManifestEntry[]) => {
  if (!canUseBrowser() || !navigator.onLine || !isSyncAuthTokenValid()) {
    return;
  }

  try {
    const serverEntries = manifest.filter((entry) => entry.id);
    const existingAssets = await listBinaryAssets(DOCUMENT_SYNC_RESOURCE);
    const existingById = new Map(existingAssets.map((asset) => [asset.itemId, asset]));
    const manifestIds = new Set(serverEntries.map((entry) => String(entry.id)));

    await Promise.all(
      existingAssets
        .filter((asset) => !manifestIds.has(asset.itemId))
        .map((asset) => deleteBinaryAsset(asset.key)),
    );

    for (const entry of serverEntries) {
      const entryId = String(entry.id);
      const existingAsset = existingById.get(entryId);
      if (!entry.file_hash || !entry.download_url) {
        continue;
      }

      const sameAlgorithm =
        !entry.file_hash_algorithm || existingAsset?.fileHashAlgorithm === entry.file_hash_algorithm;
      if (existingAsset?.fileHash === entry.file_hash && sameAlgorithm) {
        continue;
      }

      try {
        const response = await fetch(entry.download_url, {
          headers: buildAuthHeaders(),
        });
        if (!response.ok) {
          continue;
        }

        const blob = await response.blob();
        await upsertBinaryAsset({
          key: buildBinaryAssetKey(entryId),
          resource: DOCUMENT_SYNC_RESOURCE,
          itemId: entryId,
          fileHash: String(entry.file_hash),
          fileHashAlgorithm: String(entry.file_hash_algorithm || "sha256"),
          blob,
          mimeType: response.headers.get("content-type") || entry.mime_type?.toString(),
          updatedAt: String(entry.last_updated),
        } satisfies SyncBinaryAssetRecord);
      } catch (error) {
        console.warn(`Failed to refresh cached binary for document ${entryId}.`, error);
      }
    }
  } catch (error) {
    console.warn("Document binary manifest reconciliation failed.", error);
  }
};

const documentsSyncEngine = new SyncEngine<DocumentRecord>({
  resource: DOCUMENT_SYNC_RESOURCE,
  storage: createAdaptiveStorageAdapter<DocumentSyncPayload>({
    key: DOCUMENT_SYNC_CACHE_KEY,
    maxLocalStorageBytes: 48 * 1024,
  }),
  fetchRemote: fetchDocumentSyncEnvelope,
  validateAuth: isSyncAuthTokenValid,
  binaryHandler: {
    reconcile: reconcileBinaryManifest,
  },
  onPayloadUpdated: (payload) => {
    cachedDocuments = payload.items;
    dispatchDocumentEvent("documentsRefreshed", cachedDocuments);
  },
});

documentsSyncEngine.subscribe((snapshot) => {
  cachedDocuments = snapshot.data;
});

const mutateDocumentPayload = async (
  mutator: (payload: DocumentSyncPayload) => DocumentSyncPayload,
  options: { touchResource?: boolean } = {},
) => {
  const touchResource = options.touchResource ?? true;
  return documentsSyncEngine.updatePayload((currentPayload) => {
    const basePayload = normalizePayload(currentPayload || createEmptyPayload());
    const nextPayload = normalizePayload(mutator(basePayload));
    if (!touchResource) {
      nextPayload.version_id = basePayload.version_id;
      nextPayload.last_updated = basePayload.last_updated;
      return nextPayload;
    }

    const stamp = createVersionStamp();
    nextPayload.version_id = stamp.version_id;
    nextPayload.last_updated = stamp.last_updated;
    return nextPayload;
  });
};

const setPendingOperationCount = async () => {
  const operations = await listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);
  await mutateDocumentPayload(
    (payload) => ({
      ...payload,
      pending_operations: operations.length,
    }),
    { touchResource: false },
  );
};

const upsertDocumentLocally = async (document: DocumentRecord) => {
  await mutateDocumentPayload((payload) => {
    const items = sortDocumentsByFreshness([
      document,
      ...payload.items.filter((currentDocument) => currentDocument.id !== document.id),
    ]);
    const manifestEntries = [
      buildManifestEntryFromDocument(document),
      ...(payload.manifest || []).filter((entry) => String(entry.id) !== document.id),
    ];

    return {
      ...payload,
      items,
      manifest: manifestEntries,
    };
  });
  return document;
};

const removeDocumentLocally = async (documentId: string) => {
  await mutateDocumentPayload((payload) => ({
    ...payload,
    items: payload.items.filter((document) => document.id !== documentId),
    manifest: (payload.manifest || []).filter((entry) => String(entry.id) !== documentId),
  }));
};

const createPendingOperation = (operation: Partial<PendingDocumentOperation> & Pick<PendingDocumentOperation, "type">) => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  resource: DOCUMENT_SYNC_RESOURCE,
  createdAt: new Date().toISOString(),
  retryCount: 0,
  ...operation,
});

const queuePendingOperation = async (operation: PendingDocumentOperation) => {
  await upsertPendingOperation(operation);
  await setPendingOperationCount();
};

const cancelPendingOperationsForDocument = async (documentId: string) => {
  const operations = await listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);
  await Promise.all(
    operations
      .filter((operation) => operation.itemId === documentId)
      .map((operation) => deletePendingOperation(operation.id)),
  );
  await setPendingOperationCount();
};

const mergePendingUpdate = async (documentId: string, updates: Record<string, unknown>) => {
  const operations = await listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);
  const existingOperation = operations.find((operation) => operation.type === "update" && operation.itemId === documentId);

  if (existingOperation) {
    await upsertPendingOperation({
      ...existingOperation,
      payload: {
        ...existingOperation.payload,
        updates: {
          ...(existingOperation.payload?.updates || {}),
          ...updates,
        },
      },
    });
  } else {
    await queuePendingOperation(
      createPendingOperation({
        type: "update",
        itemId: documentId,
        payload: { updates },
      }),
    );
  }
};

const queuePendingDelete = async (documentId: string) => {
  const operations = await listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);
  const relatedOperations = operations.filter((operation) => operation.itemId === documentId);
  const createOperation = relatedOperations.find((operation) => operation.type === "create");

  if (createOperation) {
    await deletePendingOperation(createOperation.id);
    await Promise.all(
      relatedOperations
        .filter((operation) => operation.id !== createOperation.id)
        .map((operation) => deletePendingOperation(operation.id)),
    );
    await setPendingOperationCount();
    return;
  }

  await Promise.all(
    relatedOperations
      .filter((operation) => operation.type === "update")
      .map((operation) => deletePendingOperation(operation.id)),
  );

  const existingDelete = relatedOperations.find((operation) => operation.type === "delete");
  if (!existingDelete) {
    await queuePendingOperation(
      createPendingOperation({
        type: "delete",
        itemId: documentId,
      }),
    );
  } else {
    await setPendingOperationCount();
  }
};

const createOptimisticDocument = async (file: File, metadata: Record<string, unknown> = {}) => {
  const stamp = createVersionStamp();
  const fileHash = await hashBlob(file);

  return normalizeDocument({
    ...metadata,
    id: stamp.version_id,
    name: String(metadata.name || file.name || "Untitled"),
    module: metadata.module || "Documents",
    folder: metadata.folder || "Inbox",
    type: metadata.type || file.name.split(".").pop() || "other",
    status: metadata.status || "Processed",
    fileName: file.name,
    size: file.size,
    file_hash: fileHash || undefined,
    file_hash_algorithm: fileHash ? "sha256" : undefined,
    mimeType: file.type || "application/octet-stream",
    mime_type: file.type || "application/octet-stream",
    createdAt: stamp.last_updated,
    updatedAt: stamp.last_updated,
    version_id: stamp.version_id,
    last_updated: stamp.last_updated,
    pending_sync: true,
    local_only: true,
  });
};

const pushDocumentAdded = (document: DocumentRecord) => dispatchDocumentEvent("documentAdded", document);
const pushDocumentUpdated = (document: DocumentRecord) => dispatchDocumentEvent("documentUpdated", document);
const pushDocumentDeleted = (documentId: string) => dispatchDocumentEvent("documentDeleted", { id: documentId });

const replacePlaceholderDocument = async (placeholderId: string, serverDocument: DocumentRecord) => {
  await mutateDocumentPayload((payload) => {
    const items = sortDocumentsByFreshness([
      serverDocument,
      ...payload.items.filter((document) => document.id !== placeholderId && document.id !== serverDocument.id),
    ]);

    const manifest = [
      buildManifestEntryFromDocument(serverDocument),
      ...(payload.manifest || []).filter(
        (entry) => String(entry.id) !== placeholderId && String(entry.id) !== serverDocument.id,
      ),
    ];

    return {
      ...payload,
      items,
      manifest,
    };
  });
};

async function flushPendingDocumentOperations() {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (!canUseBrowser() || !navigator.onLine || !isSyncAuthTokenValid()) {
      return;
    }

    const operations = await listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);
    for (const operation of operations) {
      try {
        if (operation.type === "create") {
          if (!operation.file) {
            await deletePendingOperation(operation.id);
            continue;
          }

          const response = await documentsAPI.upload(operation.file, operation.payload?.metadata || {});
          const serverDocument = normalizeDocument(response?.data || response);
          await replacePlaceholderDocument(operation.itemId || operation.id, {
            ...serverDocument,
            pending_sync: false,
            local_only: false,
          });
          await deletePendingOperation(operation.id);
          pushDocumentAdded(serverDocument);
          continue;
        }

        if (operation.type === "update" && operation.itemId) {
          const response = await documentsAPI.update(operation.itemId, operation.payload?.updates || {});
          const updatedDocument = normalizeDocument(response?.data || response);
          await upsertDocumentLocally({
            ...updatedDocument,
            pending_sync: false,
            local_only: false,
          });
          await deletePendingOperation(operation.id);
          pushDocumentUpdated(updatedDocument);
          continue;
        }

        if (operation.type === "delete" && operation.itemId) {
          await documentsAPI.delete(operation.itemId);
          await deletePendingOperation(operation.id);
          pushDocumentDeleted(operation.itemId);
          continue;
        }
      } catch (error) {
        if (!isOfflineSyncError(error)) {
          console.error("Pending document sync failed.", error);
        }

        await upsertPendingOperation({
          ...operation,
          retryCount: operation.retryCount + 1,
        });
        break;
      }
    }

    await setPendingOperationCount();
  })();

  try {
    await flushPromise;
  } finally {
    flushPromise = null;
  }
}

if (canUseBrowser()) {
  void documentsSyncEngine.hydrate();

  window.addEventListener("online", () => {
    void flushPendingDocumentOperations();
    documentsSyncEngine.scheduleRevalidate("online");
  });

  window.addEventListener("focus", () => {
    if (documentsSyncEngine.shouldRevalidate()) {
      documentsSyncEngine.scheduleRevalidate("focus");
    }
  });

  window.addEventListener("taban:session-changed", () => {
    documentsSyncEngine.scheduleRevalidate("session");
    void flushPendingDocumentOperations();
  });
}

export const getAllDocuments = (filters: Record<string, unknown> = {}) => {
  if (documentsSyncEngine.shouldRevalidate() && isSyncAuthTokenValid()) {
    documentsSyncEngine.scheduleRevalidate("stale-read");
  }
  return applyFilters(cachedDocuments, filters);
};

export const refreshDocuments = async (filters: Record<string, unknown> = {}) => {
  await documentsSyncEngine.hydrate();
  await flushPendingDocumentOperations();
  await documentsSyncEngine.revalidate("manual-refresh");
  return applyFilters(cachedDocuments, filters);
};

export const addDocument = async (file: File, metadata: Record<string, unknown> = {}) => {
  const optimisticDocument = await createOptimisticDocument(file, metadata);

  if (!canUseBrowser() || !navigator.onLine || !isSyncAuthTokenValid()) {
    await upsertDocumentLocally(optimisticDocument);
    await queuePendingOperation(
      createPendingOperation({
        type: "create",
        itemId: optimisticDocument.id,
        payload: { metadata },
        file,
      }),
    );
    pushDocumentAdded(optimisticDocument);
    return optimisticDocument;
  }

  try {
    const response = await documentsAPI.upload(file, metadata);
    const document = normalizeDocument(response?.data || response);
    await upsertDocumentLocally({
      ...document,
      pending_sync: false,
      local_only: false,
    });
    pushDocumentAdded(document);
    return document;
  } catch (error) {
    if (!isOfflineSyncError(error)) {
      console.error("Error uploading document, reverting to queued offline sync.", error);
    }

    await upsertDocumentLocally(optimisticDocument);
    await queuePendingOperation(
      createPendingOperation({
        type: "create",
        itemId: optimisticDocument.id,
        payload: { metadata },
        file,
      }),
    );
    pushDocumentAdded(optimisticDocument);
    return optimisticDocument;
  }
};

export const addMultipleDocuments = async (files: File[], metadata: Record<string, unknown> = {}) => {
  const results: DocumentRecord[] = [];
  for (const file of files) {
    // Keep ordering stable and avoid IndexedDB contention.
    // eslint-disable-next-line no-await-in-loop
    const result = await addDocument(file, metadata);
    results.push(result);
  }
  return results;
};

export const deleteDocument = async (documentId: string) => {
  const existingDocument = getDocumentById(documentId);
  if (!existingDocument) return false;

  await removeDocumentLocally(documentId);
  await deleteBinaryAsset(buildBinaryAssetKey(documentId)).catch(() => undefined);

  if (existingDocument.local_only) {
    await cancelPendingOperationsForDocument(documentId);
    pushDocumentDeleted(documentId);
    return true;
  }

  if (!canUseBrowser() || !navigator.onLine || !isSyncAuthTokenValid()) {
    await queuePendingDelete(documentId);
    pushDocumentDeleted(documentId);
    return true;
  }

  try {
    const response = await documentsAPI.delete(documentId);
    await cancelPendingOperationsForDocument(documentId);
    pushDocumentDeleted(documentId);
    return Boolean(response?.success ?? true);
  } catch (error) {
    if (isOfflineSyncError(error)) {
      await queuePendingDelete(documentId);
      pushDocumentDeleted(documentId);
      return true;
    }

    await upsertDocumentLocally(existingDocument);
    console.error("Error deleting document via API:", error);
    return false;
  }
};

export const updateDocument = async (documentId: string, updates: Record<string, unknown>) => {
  const existingDocument = getDocumentById(documentId);
  if (!existingDocument) {
    return null;
  }

  const stamp = createVersionStamp();
  const optimisticDocument = normalizeDocument({
    ...existingDocument,
    ...updates,
    version_id: stamp.version_id,
    last_updated: stamp.last_updated,
    updatedAt: stamp.last_updated,
    pending_sync: true,
  });

  await upsertDocumentLocally(optimisticDocument);

  if (existingDocument.local_only) {
    const operations = await listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);
    const createOperation = operations.find((operation) => operation.type === "create" && operation.itemId === documentId);
    if (createOperation) {
      await upsertPendingOperation({
        ...createOperation,
        payload: {
          ...createOperation.payload,
          metadata: {
            ...(createOperation.payload?.metadata || {}),
            ...updates,
          },
        },
      });
      await setPendingOperationCount();
    }
    pushDocumentUpdated(optimisticDocument);
    return optimisticDocument;
  }

  if (!canUseBrowser() || !navigator.onLine || !isSyncAuthTokenValid()) {
    await mergePendingUpdate(documentId, updates);
    pushDocumentUpdated(optimisticDocument);
    return optimisticDocument;
  }

  try {
    const response = await documentsAPI.update(documentId, updates);
    const updatedDocument = normalizeDocument(response?.data || response);
    await upsertDocumentLocally({
      ...updatedDocument,
      pending_sync: false,
      local_only: false,
    });
    await cancelPendingOperationsForDocument(documentId);
    pushDocumentUpdated(updatedDocument);
    return updatedDocument;
  } catch (error) {
    if (isOfflineSyncError(error)) {
      await mergePendingUpdate(documentId, updates);
      pushDocumentUpdated(optimisticDocument);
      return optimisticDocument;
    }

    await upsertDocumentLocally(existingDocument);
    console.error("Error updating document via API:", error);
    return null;
  }
};

export const getDocumentById = (documentId: string) =>
  cachedDocuments.find((document) => String(document.id) === String(documentId)) || null;

export const getDocumentsByModule = (module: string) => getAllDocuments({ module });

export const getDocumentsSyncEngine = () => documentsSyncEngine;

export const getPendingDocumentOperations = () =>
  listPendingOperations<PendingDocumentOperationPayload>(DOCUMENT_SYNC_RESOURCE);

export const flushPendingDocuments = () => flushPendingDocumentOperations();
