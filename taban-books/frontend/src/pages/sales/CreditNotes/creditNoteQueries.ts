import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCreditNotes } from "../salesModel";

const CREDIT_NOTES_STALE_TIME_MS = 30 * 1000;
const CREDIT_NOTES_QUERY_CACHE_KEY = "taban_books_credit_notes_v1";

export const readCachedCreditNotes = (): any[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CREDIT_NOTES_QUERY_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
    return rows.map((row: any) => ({
      ...row,
      id: row?._id || row?.id,
    }));
  } catch {
    return [];
  }
};

export const findCachedCreditNoteById = (creditNoteId: string) => {
  const normalizedId = String(creditNoteId || "").trim();
  if (!normalizedId) return null;

  return readCachedCreditNotes().find((row: any) => String(row?.id || row?._id || "").trim() === normalizedId) || null;
};

const writeCachedCreditNotes = (rows: any[]): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CREDIT_NOTES_QUERY_CACHE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
  } catch {
    // Ignore cache write failures.
  }
};

export const creditNoteQueryKeys = {
  all: () => ["credit-notes"] as const,
  lists: () => ["credit-notes", "list"] as const,
};

export const fetchCreditNotesList = async () => {
  const data = await getCreditNotes();
  if (!Array.isArray(data)) {
    throw new Error("Failed to load credit notes");
  }
  writeCachedCreditNotes(data);
  return data;
};

export const useCreditNotesListQuery = (options?: { enabled?: boolean }) => {
  const cachedCreditNotes = readCachedCreditNotes();

  return useQuery({
    queryKey: creditNoteQueryKeys.lists(),
    queryFn: fetchCreditNotesList,
    enabled: options?.enabled ?? true,
    staleTime: CREDIT_NOTES_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    initialData: cachedCreditNotes.length > 0 ? cachedCreditNotes : undefined,
  });
};
