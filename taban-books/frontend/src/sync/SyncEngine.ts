import type { SyncStorageAdapter } from "./persistence";
import { createVersionStamp } from "./versioning";

export type SyncManifestEntry = {
  id: string;
  version_id: string;
  last_updated: string;
  file_hash?: string;
  file_hash_algorithm?: string;
  file_size?: number;
  mime_type?: string;
  download_url?: string;
  [key: string]: unknown;
};

export type SyncResourcePayload<TItem> = {
  resource: string;
  version_id: string;
  last_updated: string;
  items: TItem[];
  manifest?: SyncManifestEntry[];
  pending_operations?: number;
  [key: string]: unknown;
};

export type SyncFetchResponse<TItem> =
  | { status: 304 }
  | { status: 200; payload: SyncResourcePayload<TItem> };

export type SyncEngineSnapshot<TItem> = {
  payload: SyncResourcePayload<TItem> | null;
  data: TItem[];
  manifest: SyncManifestEntry[];
  isHydrated: boolean;
  isSyncing: boolean;
  isOffline: boolean;
  pendingOperations: number;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
};

export type SyncBinaryManifestHandler = {
  reconcile: (manifest: SyncManifestEntry[]) => Promise<void>;
};

export type SyncEngineOptions<TItem> = {
  resource: string;
  storage: SyncStorageAdapter<SyncResourcePayload<TItem>>;
  fetchRemote: (input: { ifModifiedSince?: string; signal: AbortSignal }) => Promise<SyncFetchResponse<TItem>>;
  debounceMs?: number;
  staleAfterMs?: number;
  binaryHandler?: SyncBinaryManifestHandler;
  validateAuth?: () => boolean | Promise<boolean>;
  onPayloadUpdated?: (payload: SyncResourcePayload<TItem>) => void;
  onSyncError?: (error: unknown) => void;
};

type SyncListener<TItem> = (snapshot: SyncEngineSnapshot<TItem>) => void;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqual(left[index], right[index])) return false;
    }
    return true;
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (!deepEqual(leftKeys, rightKeys)) return false;
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

function cloneValue<TValue>(value: TValue): TValue {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function countPendingOperations<TItem>(payload: SyncResourcePayload<TItem> | null) {
  if (!payload) return 0;
  if (typeof payload.pending_operations === "number") {
    return payload.pending_operations;
  }
  return payload.items.reduce((count, item) => {
    if (item && typeof item === "object" && "pending_sync" in (item as Record<string, unknown>)) {
      return count + (((item as Record<string, unknown>).pending_sync as boolean) ? 1 : 0);
    }
    return count;
  }, 0);
}

function normalizePayloadMetadata<TItem>(payload: SyncResourcePayload<TItem>) {
  const stamp = createVersionStamp();
  return {
    ...payload,
    version_id: String(payload.version_id || stamp.version_id),
    last_updated: String(payload.last_updated || stamp.last_updated),
  };
}

export function isSyncAuthTokenValid() {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("taban_auth_mode") === "local") return false;

  const token = localStorage.getItem("auth_token");
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalizedPayload.length % 4 === 0 ? "" : "=".repeat(4 - (normalizedPayload.length % 4));
    const payload = JSON.parse(window.atob(`${normalizedPayload}${padding}`));
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 > Date.now() + 15_000;
  } catch (error) {
    console.warn("Could not validate auth token for sync engine.", error);
    return false;
  }
}

export class SyncEngine<TItem> {
  private readonly listeners = new Set<SyncListener<TItem>>();

  private readonly options: Required<
    Pick<SyncEngineOptions<TItem>, "resource" | "storage" | "fetchRemote" | "debounceMs" | "staleAfterMs">
  > &
    Omit<SyncEngineOptions<TItem>, "resource" | "storage" | "fetchRemote" | "debounceMs" | "staleAfterMs">;

  private hydratePromise: Promise<SyncResourcePayload<TItem> | null> | null = null;

  private revalidatePromise: Promise<SyncResourcePayload<TItem> | null> | null = null;

  private revalidateTimer: number | null = null;

  private payload: SyncResourcePayload<TItem> | null = null;

  private snapshot: SyncEngineSnapshot<TItem> = {
    payload: null,
    data: [],
    manifest: [],
    isHydrated: false,
    isSyncing: false,
    isOffline: false,
    pendingOperations: 0,
    lastSuccessfulSyncAt: null,
    lastError: null,
  };

  private lastValidatedAt = 0;

  constructor(options: SyncEngineOptions<TItem>) {
    this.options = {
      ...options,
      debounceMs: options.debounceMs ?? 250,
      staleAfterMs: options.staleAfterMs ?? 30_000,
    };
  }

  subscribe(listener: SyncListener<TItem>) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot() {
    return this.snapshot;
  }

  getPayload() {
    return this.payload ? cloneValue(this.payload) : null;
  }

  getItems() {
    return cloneValue(this.snapshot.data);
  }

  shouldRevalidate() {
    if (!this.lastValidatedAt) return true;
    return Date.now() - this.lastValidatedAt >= this.options.staleAfterMs;
  }

  async hydrate() {
    if (this.hydratePromise) {
      return this.hydratePromise;
    }

    this.hydratePromise = (async () => {
      const cachedPayload = await this.options.storage.read();
      if (cachedPayload) {
        this.payload = normalizePayloadMetadata(cloneValue(cachedPayload));
        this.publish({
          payload: this.payload,
          data: cloneValue(this.payload.items),
          manifest: cloneValue(this.payload.manifest || []),
          pendingOperations: countPendingOperations(this.payload),
          isHydrated: true,
          lastError: null,
        });
      } else {
        this.publish({
          isHydrated: true,
        });
      }

      this.scheduleRevalidate("hydrate");
      return this.payload ? cloneValue(this.payload) : null;
    })();

    try {
      return await this.hydratePromise;
    } finally {
      this.hydratePromise = null;
    }
  }

  scheduleRevalidate(reason = "manual") {
    if (this.revalidateTimer) {
      window.clearTimeout(this.revalidateTimer);
    }

    if (typeof window === "undefined") {
      return;
    }

    this.revalidateTimer = window.setTimeout(() => {
      this.revalidateTimer = null;
      void this.revalidate(reason);
    }, this.options.debounceMs);
  }

  async revalidate(reason = "manual") {
    if (this.revalidatePromise) {
      return this.revalidatePromise;
    }

    this.revalidatePromise = (async () => {
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      if (!isOnline) {
        this.publish({
          isOffline: true,
          lastError: null,
        });
        return this.payload ? cloneValue(this.payload) : null;
      }

      if (this.options.validateAuth) {
        const isValid = await this.options.validateAuth();
        if (!isValid) {
          return this.payload ? cloneValue(this.payload) : null;
        }
      }

      const controller = new AbortController();
      this.publish({
        isSyncing: true,
        isOffline: false,
        lastError: null,
      });

      try {
        const response = await this.options.fetchRemote({
          ifModifiedSince: this.payload?.last_updated,
          signal: controller.signal,
        });

        this.lastValidatedAt = Date.now();

        if (response.status === 304) {
          this.publish({
            isSyncing: false,
            isOffline: false,
            lastError: null,
            lastSuccessfulSyncAt: new Date().toISOString(),
          });
          return this.payload ? cloneValue(this.payload) : null;
        }

        const nextPayload = normalizePayloadMetadata(cloneValue(response.payload));
        const hasChanged = !deepEqual(this.payload, nextPayload);

        if (hasChanged) {
          await this.options.storage.write(nextPayload);
          this.payload = nextPayload;
          if (this.options.binaryHandler && nextPayload.manifest?.length) {
            await this.options.binaryHandler.reconcile(nextPayload.manifest);
          }
          this.options.onPayloadUpdated?.(cloneValue(nextPayload));
        }

        this.publish({
          payload: this.payload,
          data: cloneValue(this.payload?.items || []),
          manifest: cloneValue(this.payload?.manifest || []),
          pendingOperations: countPendingOperations(this.payload),
          isSyncing: false,
          isOffline: false,
          lastError: null,
          lastSuccessfulSyncAt: new Date().toISOString(),
        });

        return this.payload ? cloneValue(this.payload) : null;
      } catch (error) {
        const offlineFallback = typeof navigator !== "undefined" && !navigator.onLine;
        this.publish({
          isSyncing: false,
          isOffline: offlineFallback,
          lastError: offlineFallback ? null : error instanceof Error ? error.message : "Sync failed",
        });
        this.options.onSyncError?.(error);
        if (!offlineFallback) {
          console.error(`[SyncEngine:${this.options.resource}] Failed to revalidate after ${reason}.`, error);
        }
        return this.payload ? cloneValue(this.payload) : null;
      }
    })();

    try {
      return await this.revalidatePromise;
    } finally {
      this.revalidatePromise = null;
    }
  }

  async replacePayload(payload: SyncResourcePayload<TItem>) {
    const nextPayload = normalizePayloadMetadata(cloneValue(payload));
    await this.options.storage.write(nextPayload);
    this.payload = nextPayload;
    this.publish({
      payload: this.payload,
      data: cloneValue(nextPayload.items),
      manifest: cloneValue(nextPayload.manifest || []),
      pendingOperations: countPendingOperations(nextPayload),
      lastError: null,
    });
    this.options.onPayloadUpdated?.(cloneValue(nextPayload));
    return cloneValue(nextPayload);
  }

  async updatePayload(
    updater: (current: SyncResourcePayload<TItem> | null) => SyncResourcePayload<TItem>,
  ) {
    const nextPayload = normalizePayloadMetadata(updater(this.payload ? cloneValue(this.payload) : null));
    return this.replacePayload(nextPayload);
  }

  private publish(partial: Partial<SyncEngineSnapshot<TItem>>) {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
    };

    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
