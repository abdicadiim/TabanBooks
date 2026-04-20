import { apiRequest } from "../services/api";
import type { SyncEngineOptions, SyncFetchResponse, SyncResourcePayload } from "./SyncEngine";
import { SyncEngine, isSyncAuthTokenValid } from "./SyncEngine";
import { createAdaptiveStorageAdapter, type SyncStorageAdapter } from "./persistence";
import { attachVersionStamp } from "./versioning";

type VersionedApiResponse<TData> = {
  success?: boolean;
  data?: TData;
  version_id?: string;
  last_updated?: string;
  [key: string]: unknown;
};

export function createApiFetchRemote<TItem>(options: {
  resource: string;
  endpoint: string;
  mapResponseToItems: (response: VersionedApiResponse<any>) => TItem[];
  mapResponseToManifest?: (response: VersionedApiResponse<any>) => any[] | undefined;
  dedupeKey?: string;
  source?: string;
}) {
  return async (input: { ifModifiedSince?: string; signal: AbortSignal }): Promise<SyncFetchResponse<TItem>> => {
    const response = await apiRequest(options.endpoint, {
      meta: {
        source: options.source || `sync:${options.resource}`,
        dedupeKey: options.dedupeKey || `sync:${options.resource}:${options.endpoint}`,
        allowNotModified: true,
        skipCache: true,
      },
      headers: input.ifModifiedSince ? { "If-Modified-Since": input.ifModifiedSince } : undefined,
      signal: input.signal,
    });

    if (response?.notModified === true || response?.status === 304) {
      return { status: 304 };
    }

    const items = options.mapResponseToItems(response || {});
    const manifest = options.mapResponseToManifest?.(response || {});
    const version_id = String(response?.version_id || "");
    const last_updated = String(response?.last_updated || "");

    const payload: SyncResourcePayload<TItem> = attachVersionStamp({
      resource: options.resource,
      version_id,
      last_updated,
      items: Array.isArray(items) ? items : [],
      manifest: Array.isArray(manifest) ? (manifest as any[]) : undefined,
    });

    return { status: 200, payload };
  };
}

export function createApiSyncEngine<TItem>(options: {
  resource: string;
  endpoint: string;
  storageKey?: string;
  sensitive?: boolean;
  maxLocalStorageBytes?: number;
  mapResponseToItems: (response: VersionedApiResponse<any>) => TItem[];
  mapResponseToManifest?: (response: VersionedApiResponse<any>) => any[] | undefined;
  debounceMs?: number;
  staleAfterMs?: number;
  binaryHandler?: SyncEngineOptions<TItem>["binaryHandler"];
}): { engine: SyncEngine<TItem>; storage: SyncStorageAdapter<SyncResourcePayload<TItem>> } {
  const storageKey = options.storageKey || `taban:swr:${options.resource}:${options.endpoint}`;
  const storage = createAdaptiveStorageAdapter<SyncResourcePayload<TItem>>({
    key: storageKey,
    sensitive: options.sensitive,
    maxLocalStorageBytes: options.maxLocalStorageBytes,
  });

  const engine = new SyncEngine<TItem>({
    resource: options.resource,
    storage,
    fetchRemote: createApiFetchRemote<TItem>({
      resource: options.resource,
      endpoint: options.endpoint,
      mapResponseToItems: options.mapResponseToItems,
      mapResponseToManifest: options.mapResponseToManifest,
    }),
    debounceMs: options.debounceMs,
    staleAfterMs: options.staleAfterMs,
    binaryHandler: options.binaryHandler,
    validateAuth: isSyncAuthTokenValid,
  });

  return { engine, storage };
}

