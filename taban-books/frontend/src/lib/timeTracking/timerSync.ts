import { apiRequest } from "../../services/api";
import { getCurrentUser, setCurrentUser, setOrganization } from "../../services/auth";
import { createIndexedDbAdapter } from "../../sync/persistence";

export type RemoteTimerState = {
  isTimerRunning?: boolean;
  startTime?: number;
  elapsedTime?: number;
  pausedElapsedTime?: number;
  timerNotes?: string;
  associatedProject?: string;
  selectedProjectForTimer?: string;
  selectedTaskForTimer?: string;
  isBillable?: boolean;
  lastUpdated?: number;
  sourceEntryId?: string;
  entryId?: string;
  [key: string]: unknown;
};

const TIMER_STATE_EVENT = "timerStateUpdated";
const TIMER_REMOTE_ENDPOINT = "/auth/me";
const TIMER_DEBOUNCE_MS = 220;

let pendingTimerState: RemoteTimerState | null = null;
let flushTimer: number | null = null;
let flushPromise: Promise<void> | null = null;
let listenersInstalled = false;
let lastFlushedSignature = "";

const canUseBrowser = () => typeof window !== "undefined";

const getTimerScopeKey = () => {
  const currentUser = getCurrentUser();
  const userId = String(currentUser?.id || currentUser?._id || currentUser?.email || "anonymous").trim();
  return userId || "anonymous";
};

const getTimerStorageKey = () => `taban:timer-state:${getTimerScopeKey()}`;
const getTimerLastSyncKey = () => `taban:timer-state:${getTimerScopeKey()}:last-sync`;

const cloneTimerState = (timerState: RemoteTimerState | null): RemoteTimerState | null => {
  if (!timerState) return null;
  return typeof structuredClone === "function"
    ? structuredClone(timerState)
    : JSON.parse(JSON.stringify(timerState));
};

const normalizeTimerState = (timerState: RemoteTimerState | null): RemoteTimerState | null => {
  if (!timerState) return null;
  return {
    ...timerState,
    lastUpdated: Number(timerState.lastUpdated || Date.now()),
  };
};

const isOfflineSyncError = (error: unknown) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  return message.includes("failed to fetch") || message.includes("network") || message.includes("fetch");
};

const dispatchTimerEvent = (timerState: RemoteTimerState | null) => {
  if (!canUseBrowser()) return;
  window.dispatchEvent(new CustomEvent(TIMER_STATE_EVENT, { detail: timerState }));
};

const persistTimerSnapshotLocally = (timerState: RemoteTimerState | null) => {
  if (!canUseBrowser()) return;

  const storageKey = getTimerStorageKey();
  const lastSyncKey = getTimerLastSyncKey();

  if (!timerState) {
    localStorage.removeItem("timerState");
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}:pending`);
    localStorage.removeItem(lastSyncKey);
    dispatchTimerEvent(null);
    return;
  }

  const serialized = JSON.stringify(timerState);
  localStorage.setItem("timerState", serialized);
  localStorage.setItem(storageKey, serialized);
  localStorage.setItem(`${storageKey}:pending`, "1");
  dispatchTimerEvent(timerState);
};

const persistTimerSnapshotIndexedDb = async (timerState: RemoteTimerState | null) => {
  const storage = createIndexedDbAdapter<RemoteTimerState | null>(getTimerStorageKey());
  if (!timerState) {
    await storage.clear();
    return;
  }

  await storage.write(timerState);
};

const markTimerSnapshotSynced = (timerState: RemoteTimerState | null) => {
  if (!canUseBrowser()) return;

  const storageKey = getTimerStorageKey();
  const lastSyncKey = getTimerLastSyncKey();

  if (!timerState) {
    localStorage.removeItem(`${storageKey}:pending`);
    localStorage.removeItem(lastSyncKey);
    return;
  }

  localStorage.setItem(`${storageKey}:pending`, "0");
  localStorage.setItem(lastSyncKey, new Date().toISOString());
};

const shouldSyncRemote = () => {
  if (!canUseBrowser()) return false;
  if (!navigator.onLine) return false;
  if (localStorage.getItem("taban_auth_mode") === "local") return false;
  return Boolean(localStorage.getItem("auth_token"));
};

const flushPendingTimerState = async () => {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (!canUseBrowser()) {
      return;
    }

    const nextState = cloneTimerState(pendingTimerState);
    const signature = nextState ? JSON.stringify(nextState) : "__null__";
    if (nextState) {
      await persistTimerSnapshotIndexedDb(nextState);
    } else {
      await persistTimerSnapshotIndexedDb(null);
    }

    if (!shouldSyncRemote()) {
      return;
    }

    try {
      const response = await apiRequest(TIMER_REMOTE_ENDPOINT, {
        method: "PATCH",
        body: {
          activeTimer: nextState,
        },
        meta: {
          source: "timer-sync",
          dedupeKey: `timer-sync:${getTimerScopeKey()}`,
          skipCache: true,
        },
      });

      const returnedUser = response?.data?.user;
      const returnedOrganization = response?.data?.organization;
      if (returnedUser) {
        setCurrentUser(returnedUser);
      }
      if (returnedOrganization) {
        setOrganization(returnedOrganization);
      }
      markTimerSnapshotSynced(nextState);
    } catch (error) {
      if (!isOfflineSyncError(error)) {
        console.warn("Timer sync failed; keeping local snapshot queued.", error);
      }
    }

    lastFlushedSignature = signature;
  })();

  try {
    await flushPromise;
  } finally {
    flushPromise = null;
    if (pendingTimerState) {
      const currentSignature = JSON.stringify(pendingTimerState);
      if (currentSignature !== lastFlushedSignature) {
        scheduleTimerSyncFlush();
      }
    }
  }
};

const scheduleTimerSyncFlush = () => {
  if (flushTimer !== null && canUseBrowser()) {
    window.clearTimeout(flushTimer);
  }

  if (!canUseBrowser()) {
    void flushPendingTimerState();
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushPendingTimerState();
  }, TIMER_DEBOUNCE_MS);
};

const installTimerSyncListeners = () => {
  if (!canUseBrowser() || listenersInstalled) return;
  listenersInstalled = true;

  const retryFlush = () => {
    if (pendingTimerState) {
      void flushPendingTimerState();
    }
  };

  window.addEventListener("online", retryFlush);
  window.addEventListener("focus", retryFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      retryFlush();
    }
  });
  window.addEventListener("taban:session-changed", retryFlush);
};

export const syncRemoteTimer = async (timerState: RemoteTimerState | null): Promise<void> => {
  installTimerSyncListeners();
  pendingTimerState = normalizeTimerState(timerState);
  persistTimerSnapshotLocally(pendingTimerState);
  scheduleTimerSyncFlush();
};

export const getPersistedTimerState = async (): Promise<RemoteTimerState | null> => {
  if (!canUseBrowser()) return null;

  const storage = createIndexedDbAdapter<RemoteTimerState | null>(getTimerStorageKey());
  const indexedDbState = await storage.read();
  if (indexedDbState) {
    return normalizeTimerState(indexedDbState);
  }

  const localValue = localStorage.getItem("timerState");
  if (!localValue) return null;

  try {
    return normalizeTimerState(JSON.parse(localValue) as RemoteTimerState);
  } catch {
    return null;
  }
};

export default syncRemoteTimer;
