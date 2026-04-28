import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchRetainerInvoices, retainerInvoiceQueryKeys } from "./retainerInvoiceQueries";

const RETAINER_QUERY_WARMUP_SESSION_KEY = "billing_retainer_invoice_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function RetainerInvoiceQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const warmed = sessionStorage.getItem(RETAINER_QUERY_WARMUP_SESSION_KEY) === "1";
    if (warmed) return;

    sessionStorage.setItem(RETAINER_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: retainerInvoiceQueryKeys.list(),
      queryFn: fetchRetainerInvoices,
      staleTime: 30_000,
    });

    void import("./RetainerInvoiceRoutes");
  }, [queryClient]);

  return null;
}
