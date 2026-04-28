import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { creditNoteQueryKeys, fetchCreditNotesList } from "./creditNoteQueries";

const CREDIT_NOTES_QUERY_WARMUP_SESSION_KEY = "billing_credit_notes_query_warmup_v1";

const hasStoredAuthToken = () => {
  if (typeof window === "undefined") return false;

  return Boolean(
    localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken")
  );
};

export default function CreditNotesQueryWarmup() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasStoredAuthToken()) return;

    const warmed = sessionStorage.getItem(CREDIT_NOTES_QUERY_WARMUP_SESSION_KEY) === "1";
    if (warmed) return;

    sessionStorage.setItem(CREDIT_NOTES_QUERY_WARMUP_SESSION_KEY, "1");

    void queryClient.prefetchQuery({
      queryKey: creditNoteQueryKeys.lists(),
      queryFn: fetchCreditNotesList,
      staleTime: 30_000,
    });

    void import("./CreditNotesRoutes");
  }, [queryClient]);

  return null;
}
