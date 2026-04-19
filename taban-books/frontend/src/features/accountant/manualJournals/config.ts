import { MANUAL_JOURNAL_TYPE_OPTIONS } from "../manualJournalConfig";
import type { ManualJournalEntry } from "../manualJournalTypes";
import type {
  ManualJournalFormState,
  ManualJournalNewTaxState,
} from "./types";

export const MANUAL_JOURNAL_REPORTING_METHOD_OPTIONS = [
  { label: "Accrual and Cash", value: "accrual-and-cash" },
  { label: "Accrual Only", value: "accrual-only" },
  { label: "Cash Only", value: "cash-only" },
] as const;

export const MANUAL_JOURNAL_ENTRY_TYPE_OPTIONS = [...MANUAL_JOURNAL_TYPE_OPTIONS];

export const DEFAULT_MANUAL_JOURNAL_NEW_TAX: ManualJournalNewTaxState = {
  name: "",
  rate: "",
  isCompound: false,
};

export const createDefaultManualJournalForm = (): ManualJournalFormState => ({
  date: new Date().toISOString().split("T")[0],
  journalNumber: "1",
  reference: "",
  notes: "",
  reportingMethod: "accrual-and-cash",
  currency: "SOS",
});

export const createEmptyManualJournalEntry = (
  id: number,
): ManualJournalEntry => ({
  id,
  account: "",
  accountId: "",
  description: "",
  contact: "",
  type: "",
  tax: "",
  project: "",
  reportingTags: "",
  debits: "",
  credits: "",
});

export const createInitialManualJournalEntries = (): ManualJournalEntry[] => [
  createEmptyManualJournalEntry(1),
  createEmptyManualJournalEntry(2),
];
