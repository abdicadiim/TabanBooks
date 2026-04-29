import { useEffect } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { vendorCreditsAPI } from "../../../services/api";

const VENDOR_CREDIT_LIST_STALE_TIME_MS = 30_000;
const VENDOR_CREDIT_DETAIL_STALE_TIME_MS = 30_000;

export const vendorCreditQueryKeys = {
  all: ["vendor-credits"] as const,
  lists: () => [...vendorCreditQueryKeys.all, "list"] as const,
  list: () => [...vendorCreditQueryKeys.lists(), "all"] as const,
  detail: (id?: string | null) => [...vendorCreditQueryKeys.all, "detail", String(id || "")] as const,
};

const extractVendorCreditsRows = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const normalizeVendorCreditId = (creditId: any): string => String(creditId || "").trim();

const vendorCreditMatchesId = (credit: any, creditId: string): boolean => {
  const normalized = normalizeVendorCreditId(creditId);
  if (!normalized) return false;
  return [credit?.id, credit?._id, credit?.creditNote, credit?.vendorCreditNumber]
    .map((value) => normalizeVendorCreditId(value))
    .includes(normalized);
};

export const normalizeVendorCreditForCache = (credit: any, fallbackId?: string | null) => {
  if (!credit || typeof credit !== "object") return null;

  const normalizedId =
    normalizeVendorCreditId(credit.id) ||
    normalizeVendorCreditId(credit._id) ||
    normalizeVendorCreditId(fallbackId);

  if (!normalizedId) return null;

  return {
    ...credit,
    id: normalizedId,
    _id: credit._id || normalizedId,
    creditNote: credit.creditNote || credit.vendorCreditNumber || normalizedId,
    vendorCreditNumber: credit.vendorCreditNumber || credit.creditNote || normalizedId,
    amount:
      credit.amount ??
      credit.total ??
      credit.balance ??
      0,
    vendorName:
      credit.vendorName ||
      credit.vendor?.displayName ||
      credit.vendor?.name ||
      "",
  };
};

const upsertVendorCreditInList = (existing: any[] | undefined, credit: any) => {
  if (!Array.isArray(existing)) return [credit];
  const index = existing.findIndex((row) => vendorCreditMatchesId(row, credit.id));
  if (index >= 0) {
    const copy = [...existing];
    copy[index] = { ...copy[index], ...credit };
    return copy;
  }
  return [credit, ...existing];
};

const removeVendorCreditFromList = (existing: any[] | undefined, creditId: string) => {
  if (!Array.isArray(existing)) return existing;
  return existing.filter((row) => !vendorCreditMatchesId(row, creditId));
};

const readVendorCreditFromAnyCachedList = (queryClient: QueryClient, creditId: string) => {
  const normalizedId = normalizeVendorCreditId(creditId);
  if (!normalizedId) return undefined;

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: vendorCreditQueryKeys.lists(),
  });

  for (const [, rows] of cachedLists) {
    if (!Array.isArray(rows)) continue;
    const match = rows.find((row) => vendorCreditMatchesId(row, normalizedId));
    if (match) return normalizeVendorCreditForCache(match, normalizedId);
  }

  return undefined;
};

const fetchVendorCreditsList = async () => {
  const response = await vendorCreditsAPI.getAll();
  return extractVendorCreditsRows(response).map((row) => normalizeVendorCreditForCache(row)).filter(Boolean);
};

const fetchVendorCreditDetail = async (creditId: string | undefined) => {
  const normalizedId = normalizeVendorCreditId(creditId);
  if (!normalizedId) throw new Error("Vendor credit not found");

  const response = await vendorCreditsAPI.getById(normalizedId);
  const normalized = normalizeVendorCreditForCache(response?.data, normalizedId);
  if (!normalized) throw new Error("Vendor credit not found");
  return normalized;
};

export const syncVendorCreditIntoQueries = (queryClient: QueryClient, credit: any) => {
  const normalized = normalizeVendorCreditForCache(credit);
  if (!normalized) return null;

  queryClient.setQueryData(vendorCreditQueryKeys.detail(normalized.id), normalized);

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: vendorCreditQueryKeys.lists(),
  });

  if (cachedLists.length === 0) {
    queryClient.setQueryData(vendorCreditQueryKeys.list(), [normalized]);
    return normalized;
  }

  cachedLists.forEach(([queryKey]) => {
    queryClient.setQueryData(queryKey, (previous: any[] | undefined) =>
      upsertVendorCreditInList(previous, normalized)
    );
  });

  return normalized;
};

export const removeVendorCreditFromQueries = (queryClient: QueryClient, creditId: string) => {
  const normalizedId = normalizeVendorCreditId(creditId);
  if (!normalizedId) return;

  queryClient.removeQueries({
    queryKey: vendorCreditQueryKeys.detail(normalizedId),
  });

  const cachedLists = queryClient.getQueriesData<any[]>({
    queryKey: vendorCreditQueryKeys.lists(),
  });

  cachedLists.forEach(([queryKey]) => {
    queryClient.setQueryData(queryKey, (previous: any[] | undefined) =>
      removeVendorCreditFromList(previous, normalizedId)
    );
  });
};

export const invalidateVendorCreditQueries = async (queryClient: QueryClient, creditId?: string) => {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: vendorCreditQueryKeys.lists() }),
  ];

  const normalizedId = normalizeVendorCreditId(creditId);
  if (normalizedId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: vendorCreditQueryKeys.detail(normalizedId),
      })
    );
  }

  await Promise.all(tasks);
};

export const useVendorCreditsListQuery = (options?: { enabled?: boolean; initialData?: any[] }) =>
  useQuery({
    queryKey: vendorCreditQueryKeys.list(),
    queryFn: fetchVendorCreditsList,
    enabled: options?.enabled ?? true,
    staleTime: VENDOR_CREDIT_LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    initialData: options?.initialData,
  });

export const useVendorCreditDetailQuery = (
  creditId: string | undefined,
  options?: { enabled?: boolean; initialCredit?: any }
) => {
  const queryClient = useQueryClient();
  const normalizedId = normalizeVendorCreditId(creditId);
  const initialData = normalizedId
    ? normalizeVendorCreditForCache(options?.initialCredit, normalizedId) ??
      readVendorCreditFromAnyCachedList(queryClient, normalizedId)
    : undefined;

  const query = useQuery({
    queryKey: vendorCreditQueryKeys.detail(normalizedId),
    queryFn: () => fetchVendorCreditDetail(normalizedId),
    enabled: Boolean(normalizedId) && (options?.enabled ?? true),
    staleTime: VENDOR_CREDIT_DETAIL_STALE_TIME_MS,
    initialData,
  });

  useEffect(() => {
    if (query.data) {
      syncVendorCreditIntoQueries(queryClient, query.data);
    }
  }, [query.data, queryClient]);

  return query;
};

type SaveVendorCreditVariables = {
  id?: string;
  data: any;
  optimisticRecord: any;
};

export const useSaveVendorCreditMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["vendor-credits", "save"],
    mutationFn: async ({ id, data }: SaveVendorCreditVariables) => {
      const response = id
        ? await vendorCreditsAPI.update(id, data)
        : await vendorCreditsAPI.create(data);

      if (!response?.success) {
        throw new Error(response?.message || "Failed to save vendor credit");
      }

      const normalized = normalizeVendorCreditForCache(
        response?.data || data,
        response?.data?._id || response?.data?.id || id
      );

      if (!normalized) {
        throw new Error("Failed to normalize saved vendor credit");
      }

      return {
        ...normalized,
        meta: response?.meta,
      };
    },
    onMutate: async ({ id, optimisticRecord }: SaveVendorCreditVariables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: vendorCreditQueryKeys.lists() }),
        id ? queryClient.cancelQueries({ queryKey: vendorCreditQueryKeys.detail(id) }) : Promise.resolve(),
      ]);

      const normalizedId = normalizeVendorCreditId(id);
      const optimisticId = normalizedId || `temp-vendor-credit-${Date.now()}`;
      const optimistic = normalizeVendorCreditForCache(optimisticRecord, optimisticId);
      const previousLists = queryClient.getQueriesData<any[]>({
        queryKey: vendorCreditQueryKeys.lists(),
      });
      const previousDetail = normalizedId
        ? queryClient.getQueryData(vendorCreditQueryKeys.detail(normalizedId))
        : undefined;

      if (optimistic) {
        syncVendorCreditIntoQueries(queryClient, optimistic);
      }

      return {
        previousLists,
        previousDetail,
        optimisticId,
        editedId: normalizedId,
      };
    },
    onError: async (_error, _variables, context) => {
      context?.previousLists?.forEach(([queryKey, data]: any) => {
        queryClient.setQueryData(queryKey, data);
      });

      if (context?.editedId) {
        queryClient.setQueryData(vendorCreditQueryKeys.detail(context.editedId), context.previousDetail);
      } else if (context?.optimisticId) {
        queryClient.removeQueries({
          queryKey: vendorCreditQueryKeys.detail(context.optimisticId),
        });
      }
    },
    onSuccess: async (savedVendorCredit, _variables, context) => {
      if (context?.optimisticId && context.optimisticId !== savedVendorCredit.id) {
        removeVendorCreditFromQueries(queryClient, context.optimisticId);
      }
      syncVendorCreditIntoQueries(queryClient, savedVendorCredit);
      await invalidateVendorCreditQueries(queryClient, savedVendorCredit.id);
    },
  });
};

type DeleteVendorCreditVariables = {
  ids: string[];
};

export const useDeleteVendorCreditsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["vendor-credits", "delete"],
    mutationFn: async ({ ids }: DeleteVendorCreditVariables) => {
      const normalizedIds = ids.map((id) => normalizeVendorCreditId(id)).filter(Boolean);
      if (!normalizedIds.length) {
        throw new Error("No vendor credits selected");
      }

      if (normalizedIds.length === 1) {
        const response = await vendorCreditsAPI.delete(normalizedIds[0]);
        if (!response?.success) {
          throw new Error(response?.message || "Failed to delete vendor credit");
        }
      } else {
        const response = await vendorCreditsAPI.bulkDelete(normalizedIds);
        if (!response?.success) {
          throw new Error(response?.message || "Failed to delete vendor credits");
        }
      }

      return normalizedIds;
    },
    onMutate: async ({ ids }: DeleteVendorCreditVariables) => {
      await queryClient.cancelQueries({ queryKey: vendorCreditQueryKeys.lists() });
      const normalizedIds = ids.map((id) => normalizeVendorCreditId(id)).filter(Boolean);
      const previousLists = queryClient.getQueriesData<any[]>({
        queryKey: vendorCreditQueryKeys.lists(),
      });
      const previousDetails = normalizedIds.map((creditId) => [
        creditId,
        queryClient.getQueryData(vendorCreditQueryKeys.detail(creditId)),
      ]);

      normalizedIds.forEach((creditId) => removeVendorCreditFromQueries(queryClient, creditId));

      return {
        previousLists,
        previousDetails,
      };
    },
    onError: async (_error, _variables, context) => {
      context?.previousLists?.forEach(([queryKey, data]: any) => {
        queryClient.setQueryData(queryKey, data);
      });

      context?.previousDetails?.forEach(([creditId, data]: any) => {
        if (data !== undefined) {
          queryClient.setQueryData(vendorCreditQueryKeys.detail(creditId), data);
        }
      });
    },
    onSuccess: async (deletedIds: string[]) => {
      await Promise.all(deletedIds.map((creditId) => invalidateVendorCreditQueries(queryClient, creditId)));
    },
  });
};
