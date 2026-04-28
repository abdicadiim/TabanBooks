import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchInvoicesList, invoiceQueryKeys } from "./invoiceQueries";

const INVOICE_QUERY_WARMUP_SESSION_KEY = "billing_invoice_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function InvoiceQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const warmed = sessionStorage.getItem(INVOICE_QUERY_WARMUP_SESSION_KEY) === "1";
    if (warmed) return;

    sessionStorage.setItem(INVOICE_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: invoiceQueryKeys.list({
        page: 1,
        limit: 10000,
        search: "",
        sort: "Date",
        order: "desc",
      }),
      queryFn: () =>
        fetchInvoicesList({
          page: 1,
          limit: 10000,
          search: "",
          sort: "Date",
          order: "desc",
        }),
      staleTime: 30_000,
    });

    void import("./InvoicesRoutes");
  }, [queryClient]);

  return null;
}
