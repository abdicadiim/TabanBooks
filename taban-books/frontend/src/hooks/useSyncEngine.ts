import { useEffect, useSyncExternalStore } from "react";
import type { SyncEngine, SyncEngineSnapshot } from "../sync/SyncEngine";

export function useSyncEngine<TItem>(engine: SyncEngine<TItem>): SyncEngineSnapshot<TItem> {
  const snapshot = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.getSnapshot(),
    () => engine.getSnapshot(),
  );

  useEffect(() => {
    void engine.hydrate();
  }, [engine]);

  return snapshot;
}
