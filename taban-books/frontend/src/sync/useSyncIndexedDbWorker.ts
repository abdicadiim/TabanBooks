import { useCallback, useMemo, useState } from "react";
import { callIndexedDbWorker } from "./indexedDbWorkerClient";
import type { SyncBinaryAssetRecord, SyncPendingOperationRecord } from "./persistence";

type WorkerState = "idle" | "running" | "error";

export function useSyncIndexedDbWorker() {
  const [state, setState] = useState<WorkerState>("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <TValue,>(action: any, payload?: unknown) => {
    try {
      setState("running");
      setError(null);
      const result = await callIndexedDbWorker<TValue>(action, payload);
      setState("idle");
      return result;
    } catch (err) {
      const message = String((err as any)?.message || err || "Worker call failed.");
      setError(message);
      setState("error");
      throw err;
    }
  }, []);

  const api = useMemo(
    () => ({
      // Pending operations (bulk + single)
      listPendingOperations: (resource: string) =>
        run<SyncPendingOperationRecord[]>("pending.list", { resource }),
      upsertPendingOperation: (record: SyncPendingOperationRecord) =>
        run<void>("pending.upsert", { record }),
      bulkUpsertPendingOperations: (records: SyncPendingOperationRecord[]) =>
        run<void>("pending.bulkUpsert", { records }),
      deletePendingOperation: (id: string) =>
        run<void>("pending.delete", { id }),

      // Binary assets: metadata first, binary on-demand
      listBinaryAssetMetadata: (resourceId: string) =>
        run<Array<Omit<SyncBinaryAssetRecord, "blob">>>("binary.list", { resource: resourceId, metadataOnly: true }),
      getBinaryAsset: (key: string) =>
        run<SyncBinaryAssetRecord | undefined>("binary.get", { key, metadataOnly: false }),
      upsertBinaryAsset: (record: SyncBinaryAssetRecord) =>
        run<void>("binary.upsert", { record }),
      bulkUpsertBinaryAssets: (records: SyncBinaryAssetRecord[]) =>
        run<void>("binary.bulkUpsert", { records }),
      deleteBinaryAsset: (key: string) =>
        run<void>("binary.delete", { key }),
    }),
    [run],
  );

  return {
    ...api,
    state,
    error,
    isRunning: state === "running",
  };
}

