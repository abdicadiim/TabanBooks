import { useMemo } from "react";
import { useSyncEngine } from "./useSyncEngine";
import { getDocumentsSyncEngine } from "../utils/documentStorage";

export function useDocumentsSync() {
  const engine = useMemo(() => getDocumentsSyncEngine(), []);
  return useSyncEngine(engine);
}
