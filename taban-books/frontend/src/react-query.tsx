import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createIndexedDbAdapter } from "./sync/persistence";
import { keepPreviousData as salesKeepPreviousData } from "./pages/sales/salesModel";

type QueryKey = readonly unknown[] | unknown;
type QueryStatus = "pending" | "success" | "error";

type PersistedQueryEnvelope<TData = unknown> = {
  response: {
    data?: TData;
    errorMessage?: string | null;
    status?: QueryStatus;
    isPlaceholderData?: boolean;
    updatedAt?: number;
  };
  updatedAt: number;
};

type QueryRecord<TData = any> = {
  key: readonly unknown[];
  cacheId: string;
  storageKey: string;
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isFetching: boolean;
  updatedAt: number;
  promise?: Promise<TData>;
  queryFn?: () => Promise<TData>;
  hydratePromise?: Promise<void>;
  listeners: Set<() => void>;
};

type QueryClientLike = {
  getQueriesData<T = any>(filters?: { queryKey?: QueryKey }): Array<[readonly unknown[], T | undefined]>;
  getQueryData<T = any>(queryKey: QueryKey): T | undefined;
  setQueryData<T = any>(
    queryKey: QueryKey,
    updater: T | ((previousData: T | undefined) => T | undefined),
  ): T | undefined;
  removeQueries(filters?: { queryKey?: QueryKey }): void;
  clear(): void;
  invalidateQueries(filters?: { queryKey?: QueryKey }): Promise<void>;
  prefetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }): Promise<T>;
  fetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }): Promise<T>;
};

type QueryClientProviderProps = {
  client: QueryClient;
  children: ReactNode;
};

type UseQueryOptions<TData = any> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: unknown;
  initialData?: TData | (() => TData | undefined);
  select?: (data: TData) => unknown;
  [key: string]: unknown;
};

type UseQueryResult<TData = any> = {
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isPending: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isPlaceholderData: boolean;
  refetch: () => Promise<{ data?: TData; error?: unknown }>;
};

type UseMutationOptions<TData = any, TVariables = void> = {
  mutationKey?: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: unknown, variables: TVariables) => void | Promise<void>;
  [key: string]: unknown;
};

type UseMutationResult<TData = any, TVariables = void> = {
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
};

const queryKeyToArray = (key: QueryKey): readonly unknown[] =>
  Array.isArray(key) ? key : [key];

const normalizePrimitive = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "symbol") return `symbol:${String(value.description || "")}`;
  if (typeof value === "function") return `function:${String(value.name || "anonymous")}`;
  return "";
};

const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const walk = (input: unknown): string => {
    const primitive = normalizePrimitive(input);
    if (primitive) return primitive;

    if (Array.isArray(input)) {
      return `[${input.map((entry) => walk(entry)).join(",")}]`;
    }

    if (input && typeof input === "object") {
      if (seen.has(input as object)) return '"[Circular]"';
      seen.add(input as object);
      const entries = Object.entries(input as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
      );
      return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${walk(entry)}`).join(",")}}`;
    }

    return "null";
  };

  return walk(value);
};

const isPrefixMatch = (candidate: readonly unknown[], partial?: QueryKey): boolean => {
  if (partial === undefined) return true;
  const partialKey = queryKeyToArray(partial);
  if (partialKey.length > candidate.length) return false;
  return partialKey.every((entry, index) => stableStringify(entry) === stableStringify(candidate[index]));
};

const resolveInitialValue = <TData,>(value: TData | (() => TData | undefined) | undefined): TData | undefined => {
  if (typeof value === "function") {
    try {
      return (value as () => TData | undefined)();
    } catch {
      return undefined;
    }
  }
  return value;
};

const normalizeErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (error instanceof Error) return error.message || error.name || "Unknown error";
  return String((error as any)?.message || error || "Unknown error");
};

const isBrowser = () => typeof window !== "undefined";

export const keepPreviousData = salesKeepPreviousData;

export class QueryClient implements QueryClientLike {
  private readonly queryCache = new Map<string, QueryRecord<any>>();

  private readonly persistencePrefix = "taban:react-query";

  private createStorageKey(queryKey: readonly unknown[]) {
    return `${this.persistencePrefix}:${stableStringify(queryKey)}`;
  }

  private getOrCreateQueryRecord<TData>(key: QueryKey): QueryRecord<TData> {
    const normalizedKey = queryKeyToArray(key);
    const cacheId = stableStringify(normalizedKey);
    const existing = this.queryCache.get(cacheId);
    if (existing) {
      return existing as QueryRecord<TData>;
    }

    const record: QueryRecord<TData> = {
      key: normalizedKey,
      cacheId,
      storageKey: this.createStorageKey(normalizedKey),
      status: "pending",
      isFetching: false,
      updatedAt: 0,
      listeners: new Set(),
    };

    this.queryCache.set(cacheId, record);
    void this.hydrateRecord(record);
    return record;
  }

  private notify(record: QueryRecord<any>) {
    record.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("Error notifying query listener:", error);
      }
    });
  }

  private async readPersistedRecord<TData>(record: QueryRecord<TData>) {
    const storage = createIndexedDbAdapter<PersistedQueryEnvelope<TData>>(record.storageKey);
    return storage.read();
  }

  private async writePersistedRecord<TData>(record: QueryRecord<TData>) {
    const storage = createIndexedDbAdapter<PersistedQueryEnvelope<TData>>(record.storageKey);
    await storage.write({
      response: {
        data: record.data,
        errorMessage: normalizeErrorMessage(record.error),
        status: record.status,
        updatedAt: record.updatedAt,
      },
      updatedAt: Date.now(),
    });
  }

  private async clearPersistedRecord(record: QueryRecord<any>) {
    const storage = createIndexedDbAdapter<PersistedQueryEnvelope<any>>(record.storageKey);
    await storage.clear();
  }

  private async hydrateRecord<TData>(record: QueryRecord<TData>) {
    if (record.hydratePromise) return record.hydratePromise;

    record.hydratePromise = (async () => {
      if (!isBrowser()) return;

      try {
        const envelope = await this.readPersistedRecord(record);
        const response = envelope?.response;
        if (!response || response.data === undefined) {
          return;
        }

        if (record.updatedAt > 0 && response.updatedAt && response.updatedAt <= record.updatedAt) {
          return;
        }

        record.data = response.data as TData;
        record.error = response.errorMessage ? new Error(response.errorMessage) : undefined;
        record.status = response.status || "success";
        record.updatedAt = response.updatedAt || envelope.updatedAt || Date.now();
        this.notify(record);
      } catch (error) {
        console.warn("Failed to hydrate query cache from IndexedDB.", error);
      }
    })();

    try {
      return await record.hydratePromise;
    } finally {
      record.hydratePromise = undefined;
    }
  }

  private async fetchQueryRecord<TData>(
    record: QueryRecord<TData>,
    queryFn: () => Promise<TData>,
    options?: { force?: boolean; staleTime?: number },
  ): Promise<TData> {
    const staleTime = Number(options?.staleTime ?? 0);
    const isFresh = record.data !== undefined && staleTime > 0 && Date.now() - record.updatedAt < staleTime;
    if (!options?.force && isFresh) {
      return Promise.resolve(record.data as TData);
    }

    if (record.promise) {
      return record.promise;
    }

    record.queryFn = queryFn;
    record.error = undefined;
    record.status = record.data === undefined ? "pending" : "success";
    record.isFetching = true;
    this.notify(record);

    const promise = Promise.resolve()
      .then(() => queryFn())
      .then(async (data) => {
        record.data = data;
        record.error = undefined;
        record.status = "success";
        record.isFetching = false;
        record.updatedAt = Date.now();
        record.promise = undefined;
        this.notify(record);
        void this.writePersistedRecord(record);
        return data;
      })
      .catch((error) => {
        record.error = error;
        record.isFetching = false;
        record.promise = undefined;
        if (record.data === undefined) {
          record.status = "error";
        } else {
          record.status = "success";
        }
        this.notify(record);
        throw error;
      });

    record.promise = promise;
    return promise;
  }

  getQueriesData<T = any>(filters?: { queryKey?: QueryKey }) {
    return Array.from(this.queryCache.values())
      .filter((record) => isPrefixMatch(record.key, filters?.queryKey))
      .map((record) => [record.key, record.data as T | undefined] as [readonly unknown[], T | undefined]);
  }

  getQueryData<T = any>(queryKey: QueryKey) {
    const record = this.queryCache.get(stableStringify(queryKeyToArray(queryKey)));
    return record?.data as T | undefined;
  }

  setQueryData<T = any>(
    queryKey: QueryKey,
    updater: T | ((previousData: T | undefined) => T | undefined),
  ) {
    const record = this.getOrCreateQueryRecord<T>(queryKey);
    const previousData = record.data as T | undefined;
    const nextValue =
      typeof updater === "function"
        ? (updater as (previousData: T | undefined) => T | undefined)(previousData)
        : updater;

    if (previousData === nextValue || stableStringify(previousData) === stableStringify(nextValue)) {
      return previousData as T | undefined;
    }

    record.data = nextValue;
    record.error = undefined;
    record.status = "success";
    record.isFetching = false;
    record.updatedAt = Date.now();
    this.notify(record);
    void this.writePersistedRecord(record);
    return nextValue;
  }

  removeQueries(filters?: { queryKey?: QueryKey }) {
    Array.from(this.queryCache.entries()).forEach(([cacheId, record]) => {
      if (isPrefixMatch(record.key, filters?.queryKey)) {
        this.queryCache.delete(cacheId);
        void this.clearPersistedRecord(record);
      }
    });
  }

  clear() {
    this.queryCache.clear();
  }

  async invalidateQueries(filters?: { queryKey?: QueryKey }) {
    const matches = Array.from(this.queryCache.values()).filter((record) =>
      isPrefixMatch(record.key, filters?.queryKey),
    );
    await Promise.all(
      matches.map((record) => {
        if (!record.queryFn) return Promise.resolve();
        return this.fetchQueryRecord(record, record.queryFn, { force: true });
      }),
    );
  }

  prefetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }) {
    const record = this.getOrCreateQueryRecord<T>(options.queryKey);
    return this.fetchQueryRecord(record, options.queryFn, { staleTime: options.staleTime });
  }

  fetchQuery<T = any>(options: { queryKey: QueryKey; queryFn: () => Promise<T>; staleTime?: number }) {
    const record = this.getOrCreateQueryRecord<T>(options.queryKey);
    return this.fetchQueryRecord(record, options.queryFn, { force: true, staleTime: options.staleTime });
  }

  subscribeToQuery<TData>(queryKey: QueryKey, listener: () => void) {
    const record = this.getOrCreateQueryRecord<TData>(queryKey);
    record.listeners.add(listener);
    return () => {
      record.listeners.delete(listener);
    };
  }

  getRecord<TData>(queryKey: QueryKey) {
    return this.getOrCreateQueryRecord<TData>(queryKey);
  }
}

const QueryClientContext = createContext<QueryClient | null>(null);
const defaultQueryClient = new QueryClient();

export function QueryClientProvider({ client, children }: QueryClientProviderProps) {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
}

export function useQueryClient(): QueryClient {
  return useContext(QueryClientContext) || defaultQueryClient;
}

export function useQuery<TData = any>(options: UseQueryOptions<TData>): UseQueryResult<TData> {
  const queryClient = useQueryClient();
  const queryFnRef = useRef(options.queryFn);
  queryFnRef.current = options.queryFn;
  const placeholderDataRef = useRef(options.placeholderData);
  placeholderDataRef.current = options.placeholderData;
  const initialDataRef = useRef(options.initialData);
  initialDataRef.current = options.initialData;
  const selectRef = useRef(options.select);
  selectRef.current = options.select;

  const queryKey = useMemo(() => queryKeyToArray(options.queryKey), [stableStringify(options.queryKey)]);
  const cacheId = stableStringify(queryKey);
  const record = useMemo(() => queryClient.getRecord<TData>(queryKey), [queryClient, cacheId, queryKey]);

  if (record.data === undefined) {
    const initialData = resolveInitialValue<TData>(options.initialData);
    if (initialData !== undefined) {
      record.data = initialData;
      record.status = "success";
      record.updatedAt = Date.now();
    }
  }

  const resolveFallbackData = (previousData?: TData) => {
    if (record.data !== undefined) {
      return record.data;
    }

    const placeholder = placeholderDataRef.current;
    if (placeholder === salesKeepPreviousData) {
      return previousData;
    }

    if (typeof placeholder === "function") {
      try {
        return (placeholder as (previousData: TData | undefined) => TData | undefined)(previousData);
      } catch {
        return undefined;
      }
    }

    return placeholder as TData | undefined;
  };

  const selectData = (value: TData | undefined) => {
    if (value === undefined) return value;
    const selector = selectRef.current;
    return selector ? (selector(value) as TData) : value;
  };

  const buildSnapshot = (previousData?: TData): UseQueryResult<TData> => {
    const data = selectData(record.data !== undefined ? record.data : resolveFallbackData(previousData));
    const hasData = data !== undefined;
    const isPlaceholderData = record.data === undefined && placeholderDataRef.current === salesKeepPreviousData && hasData;
    const isSuccess = record.status === "success" && hasData;
    const isError = record.status === "error" && !hasData;

    return {
      data,
      error: record.error,
      status: isError ? "error" : isSuccess ? "success" : "pending",
      isPending: !hasData && (record.status === "pending" || record.isFetching),
      isFetching: record.isFetching,
      isLoading: record.isFetching || (!hasData && record.status === "pending"),
      isError,
      isSuccess,
      isPlaceholderData,
      refetch: async () => {
        const nextData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => queryFnRef.current(),
          staleTime: Number(options.staleTime ?? 0),
        });
        return { data: selectData(nextData), error: undefined };
      },
    };
  };

  const [snapshot, setSnapshot] = useState<UseQueryResult<TData>>(() => buildSnapshot());
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    let active = true;

    const syncSnapshot = () => {
      if (!active) return;
      const nextSnapshot = buildSnapshot(snapshotRef.current.data);
      const currentSnapshot = snapshotRef.current;
      if (
        currentSnapshot.data === nextSnapshot.data &&
        currentSnapshot.error === nextSnapshot.error &&
        currentSnapshot.status === nextSnapshot.status &&
        currentSnapshot.isPending === nextSnapshot.isPending &&
        currentSnapshot.isFetching === nextSnapshot.isFetching &&
        currentSnapshot.isLoading === nextSnapshot.isLoading &&
        currentSnapshot.isError === nextSnapshot.isError &&
        currentSnapshot.isSuccess === nextSnapshot.isSuccess &&
        currentSnapshot.isPlaceholderData === nextSnapshot.isPlaceholderData
      ) {
        return;
      }
      setSnapshot(nextSnapshot);
    };

    const unsubscribe = queryClient.subscribeToQuery<TData>(queryKey, syncSnapshot);
    syncSnapshot();

    if (options.enabled !== false) {
      void queryClient.prefetchQuery({
        queryKey,
        queryFn: () => queryFnRef.current(),
        staleTime: Number(options.staleTime ?? 0),
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [cacheId, options.enabled, options.staleTime, queryClient, queryKey]);

  return snapshot;
}

export function useMutation<TData = any, TVariables = void>(
  options: UseMutationOptions<TData, TVariables>,
): UseMutationResult<TData, TVariables> {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [status, setStatus] = useState<QueryStatus>("pending");

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    setStatus("pending");
    setError(undefined);

    try {
      const result = await optionsRef.current.mutationFn(variables);
      setData(result);
      setStatus("success");
      await optionsRef.current.onSuccess?.(result, variables);
      return result;
    } catch (mutationError) {
      setError(mutationError);
      setStatus("error");
      await optionsRef.current.onError?.(mutationError, variables);
      throw mutationError;
    }
  };

  return {
    data,
    error,
    status,
    isPending: status === "pending",
    isLoading: status === "pending",
    isError: status === "error",
    isSuccess: status === "success",
    mutate: (variables: TVariables) => {
      void mutateAsync(variables);
    },
    mutateAsync,
    reset: () => {
      setData(undefined);
      setError(undefined);
      setStatus("pending");
    },
  };
}
