import { createIndexedDbAdapter } from "../sync/persistence";
import { getCurrentUser, getOrganization } from "./auth";

type CachedEnvelope<TResponse> = {
  response: TResponse;
  version_id?: string;
  last_updated?: string;
  updatedAt: number;
};

type Fetcher<TResponse> = () => Promise<TResponse>;

const inflight = new Map<string, Promise<any>>();
const UPDATED_EVENT = "taban:swr-list-updated";

const canUseBrowser = () => typeof window !== "undefined";

const getScopeKey = () => {
  if (!canUseBrowser()) return "server";

  const authMode = localStorage.getItem("taban_auth_mode") || "remote";
  const user = getCurrentUser();
  const organization = getOrganization();

  return [
    authMode,
    String((user as any)?.id || (user as any)?._id || "anonymous"),
    String((organization as any)?.id || (organization as any)?._id || "no-org"),
  ].join(":");
};

const buildStorageKey = (key: string) => `taban:swr:response:${getScopeKey()}:${key}`;

const dispatchUpdate = <TResponse,>(key: string, response: TResponse) => {
  if (!canUseBrowser()) return;
  window.dispatchEvent(
    new CustomEvent(UPDATED_EVENT, {
      detail: {
        key,
        response,
        updatedAt: Date.now(),
      },
    }),
  );
};

function normalizeResponse<TResponse>(response: TResponse) {
  return response;
}

export async function readCachedListResponse<TResponse>(key: string): Promise<TResponse | null> {
  if (!canUseBrowser()) return null;

  const storage = createIndexedDbAdapter<CachedEnvelope<TResponse>>(buildStorageKey(key));
  const envelope = await storage.read();
  return envelope?.response ? normalizeResponse(envelope.response) : null;
}

export async function writeCachedListResponse<TResponse>(
  key: string,
  response: TResponse,
  metadata?: { version_id?: string; last_updated?: string },
): Promise<void> {
  if (!canUseBrowser()) return;

  const storage = createIndexedDbAdapter<CachedEnvelope<TResponse>>(buildStorageKey(key));
  await storage.write({
    response: normalizeResponse(response),
    version_id: metadata?.version_id,
    last_updated: metadata?.last_updated,
    updatedAt: Date.now(),
  });
  dispatchUpdate(key, response);
}

export async function getCachedListResponse<TResponse>(
  key: string,
  fetcher: Fetcher<TResponse>,
  options: {
    version_id?: string;
    last_updated?: string;
    revalidateOnRead?: boolean;
  } = {},
): Promise<TResponse> {
  const storageKey = buildStorageKey(key);
  const storage = createIndexedDbAdapter<CachedEnvelope<TResponse>>(storageKey);

  const refresh = async () => {
    const request = (async () => {
      const response = await fetcher();
      await storage.write({
        response: normalizeResponse(response),
        version_id:
          options.version_id ||
          (response && typeof response === "object" ? (response as Record<string, unknown>).version_id as string | undefined : undefined),
        last_updated:
          options.last_updated ||
          (response && typeof response === "object" ? (response as Record<string, unknown>).last_updated as string | undefined : undefined),
        updatedAt: Date.now(),
      });
      dispatchUpdate(key, response);
      return response;
    })();

    inflight.set(storageKey, request);
    try {
      return await request;
    } finally {
      inflight.delete(storageKey);
    }
  };

  const cached = await storage.read();
  if (cached?.response) {
    if (options.revalidateOnRead !== false && !inflight.has(storageKey)) {
      void refresh();
    }
    return cached.response;
  }

  const existingInflight = inflight.get(storageKey);
  if (existingInflight) {
    return existingInflight as Promise<TResponse>;
  }

  return refresh();
}
