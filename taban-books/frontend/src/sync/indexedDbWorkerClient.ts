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

type WorkerRequest = {
  requestId: string;
  action: WorkerAction;
  payload?: unknown;
};

type WorkerResponse = {
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let workerInitError: Error | null = null;
const pendingRequests = new Map<string, PendingRequest>();

function canUseWorker() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function getWorker() {
  if (workerInitError) throw workerInitError;
  if (worker) return worker;
  if (!canUseWorker()) {
    throw new Error("Web Worker is not available in this environment.");
  }

  try {
    worker = new Worker(new URL("./indexedDb.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, ok, data, error } = event.data || {};
      if (!requestId) return;
      const pending = pendingRequests.get(requestId);
      if (!pending) return;
      pendingRequests.delete(requestId);
      if (ok) {
        pending.resolve(data);
      } else {
        pending.reject(new Error(error || "IndexedDB worker action failed."));
      }
    };
    worker.onerror = (event) => {
      const error = new Error(`IndexedDB worker crashed: ${event.message}`);
      workerInitError = error;
      pendingRequests.forEach(({ reject }) => reject(error));
      pendingRequests.clear();
    };
  } catch (error) {
    workerInitError = error as Error;
    throw error;
  }

  return worker;
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function callIndexedDbWorker<TValue = unknown>(action: WorkerAction, payload?: unknown): Promise<TValue> {
  const activeWorker = getWorker();
  const requestId = createRequestId();

  return new Promise<TValue>((resolve, reject) => {
    pendingRequests.set(requestId, {
      resolve: (value) => resolve(value as TValue),
      reject,
    });

    const request: WorkerRequest = { requestId, action, payload };
    activeWorker.postMessage(request);
  });
}

export function terminateIndexedDbWorker() {
  if (!worker) return;
  worker.terminate();
  worker = null;
  workerInitError = null;
  pendingRequests.clear();
}

