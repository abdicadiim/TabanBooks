import { useMemo } from "react";
import { useSyncEngine } from "../../../hooks/useSyncEngine";
import { createApiSyncEngine } from "../../../sync/createApiSyncEngine";
import type { SyncEngineSnapshot } from "../../../sync/SyncEngine";
import type { CustomersListQueryResult } from "./customerQueries";

/**
 * SWR customers list:
 * - instantly renders cached customers from LocalStorage/IndexedDB
 * - then revalidates in background using 304 + version headers
 */
export function useCustomersSWR(params: { page: number; limit: number; search: string }): SyncEngineSnapshot<any> & {
  listResult: CustomersListQueryResult | null;
} {
  const endpoint = `/customers?page=${encodeURIComponent(params.page)}&limit=${encodeURIComponent(
    params.limit,
  )}&search=${encodeURIComponent(params.search || "")}`;

  const { engine } = useMemo(
    () =>
      createApiSyncEngine<any>({
        resource: "customers",
        endpoint,
        sensitive: false,
        mapResponseToItems: (response: any) => Array.isArray(response?.data) ? response.data : [],
      }),
    [endpoint],
  );

  const snapshot = useSyncEngine(engine);

  const listResult = useMemo<CustomersListQueryResult | null>(() => {
    const payload: any = snapshot.payload;
    const items = Array.isArray(snapshot.data) ? snapshot.data : [];
    if (!payload && !items.length) return null;
    const pagination = (payload as any)?.pagination || null;
    const total = Number(pagination?.total ?? payload?.total ?? items.length) || 0;
    const page = Number(pagination?.page ?? payload?.page ?? params.page) || params.page;
    const limit = Number(pagination?.limit ?? payload?.limit ?? params.limit) || params.limit;
    const pages = Number(pagination?.pages ?? payload?.totalPages ?? Math.max(1, Math.ceil(total / limit))) || 1;
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: pages,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }, [snapshot.payload, snapshot.data, params.page, params.limit]);

  return Object.assign(snapshot, { listResult });
}

