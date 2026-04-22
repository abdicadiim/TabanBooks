import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRetainerInvoices, RetainerInvoice } from "../salesModel";

const RETAINER_LIST_STALE_TIME_MS = 30 * 1000;

const normalizeRetainerNumber = (value: string) =>
  String(value || "").toUpperCase().trim();

const isRetainerInvoiceRecord = (invoice: Invoice | any) => {
  const rawType = String(
    invoice?.invoiceType ||
      invoice?.type ||
      invoice?.documentType ||
      invoice?.module ||
      invoice?.source ||
      ""
  )
    .toLowerCase()
    .trim();
  const rawNumber = normalizeRetainerNumber(invoice?.invoiceNumber || invoice?.number || "");
  return Boolean(
    invoice?.isRetainerInvoice ||
      invoice?.isRetainer ||
      invoice?.is_retainer ||
      invoice?.retainer ||
      rawType.includes("retainer") ||
      /^RET[-\d]/.test(rawNumber)
  );
};

// No longer needed as we fetch from dedicated API
// const filterRetainers = (rows: Invoice[] = []) => rows.filter((invoice) => isRetainerInvoiceRecord(invoice));

export const retainerInvoiceQueryKeys = {
  all: () => ["retainer-invoices"] as const,
  lists: () => ["retainer-invoices", "list"] as const,
  list: () => ["retainer-invoices", "list", { limit: 1000, sort: "createdAt", order: "desc" }] as const,
};

export const fetchRetainerInvoices = async (): Promise<RetainerInvoice[]> => {
  return await getRetainerInvoices({ limit: 1000, sort: "createdAt", order: "desc" });
};

export const useRetainerListQuery = (options?: { enabled?: boolean }) =>
  useQuery<RetainerInvoice[]>({
    queryKey: retainerInvoiceQueryKeys.list(),
    queryFn: fetchRetainerInvoices,
    enabled: options?.enabled ?? true,
    staleTime: RETAINER_LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
