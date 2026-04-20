import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { tabanBillingDB } from "./TabanBillingDB";
import { databaseService } from "./DatabaseService";
import type { InvoiceSearchParams } from "./types";

export const useInvoicesLive = () => {
  return useLiveQuery(() => tabanBillingDB.invoices.toArray(), [], []);
};

export const useClientsLive = () => {
  return useLiveQuery(() => tabanBillingDB.clients.toArray(), [], []);
};

export const useSyncQueueLive = () => {
  return useLiveQuery(() => tabanBillingDB.syncQueue.orderBy("createdAt").toArray(), [], []);
};

export const useInvoiceSearchLive = (params: InvoiceSearchParams) => {
  const dependencyKey = useMemo(
    () => JSON.stringify(params || {}),
    [params],
  );

  return useLiveQuery(
    () => databaseService.searchInvoices(params),
    [dependencyKey],
    [],
  );
};

