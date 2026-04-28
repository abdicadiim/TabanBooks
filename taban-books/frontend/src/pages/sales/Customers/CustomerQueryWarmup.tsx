import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { customerQueryKeys, fetchCustomersList } from "./customerQueries";
import { customersAPI } from "../../../services/api";
import { getCachedListResponse } from "../../../services/swrListCache";

const CUSTOMER_QUERY_WARMUP_SESSION_KEY = "billing_customer_query_warmup_v1";
const CUSTOMER_CACHE_ENDPOINT = "/customers?page=1&limit=1000&search=";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function CustomerQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const hasWarmedUp = sessionStorage.getItem(CUSTOMER_QUERY_WARMUP_SESSION_KEY) === "1";
    if (hasWarmedUp) return;

    sessionStorage.setItem(CUSTOMER_QUERY_WARMUP_SESSION_KEY, "1");

    void getCachedListResponse(
      CUSTOMER_CACHE_ENDPOINT,
      async () => {
        const response = await customersAPI.getAll({ page: 1, limit: 1000, search: "" });
        const rows = Array.isArray(response?.data) ? response.data : [];
        return {
          items: rows,
          pagination: response?.pagination || {
            total: rows.length,
            page: 1,
            limit: 1000,
            pages: Math.max(1, Math.ceil(rows.length / 1000)),
          },
          total: Number(response?.pagination?.total ?? rows.length ?? 0) || 0,
          page: Number(response?.pagination?.page ?? 1) || 1,
          limit: Number(response?.pagination?.limit ?? 1000) || 1000,
          totalPages: Number(response?.pagination?.pages ?? Math.max(1, Math.ceil(rows.length / 1000))) || 1,
          version_id: response?.version_id,
          last_updated: response?.last_updated,
        };
      },
    );

    void queryClient.prefetchQuery({
      queryKey: customerQueryKeys.list({ page: 1, limit: 10, search: "" }),
      queryFn: () => fetchCustomersList({ page: 1, limit: 10, search: "" }),
    });

    void queryClient.prefetchQuery({
      queryKey: customerQueryKeys.list({ page: 1, limit: 1000, search: "" }),
      queryFn: () => fetchCustomersList({ page: 1, limit: 1000, search: "" }),
    });
  }, [queryClient]);

  return null;
}
