import type {
  ManualJournal,
  ManualJournalContact,
  ManualJournalEntry,
  ManualJournalTax,
} from "../manualJournalTypes";

export interface ManualJournalFormState {
  date: string;
  journalNumber: string;
  reference: string;
  notes: string;
  reportingMethod: string;
  currency: string;
}

export interface ManualJournalTotals {
  totalDebits: number;
  totalCredits: number;
  difference: number;
}

export interface ManualJournalNewTaxState {
  name: string;
  rate: string;
  isCompound: boolean;
}

export interface ManualJournalTemplateRecord {
  _id?: string;
  id?: string;
  name?: string;
  templateName?: string;
  reference?: string;
  referenceNumber?: string;
  notes?: string;
  description?: string;
  reportingMethod?: string;
  currency?: string;
  line_items?: any[];
  lines?: any[];
  entries?: any[];
  createdBy?: { name?: string; email?: string };
}

export interface BuildManualJournalPayloadArgs {
  attachmentsCount: number;
  availableContacts: ManualJournalContact[];
  availableTaxes: ManualJournalTax[];
  entries: ManualJournalEntry[];
  formData: ManualJournalFormState;
  journal: ManualJournal | null;
  status: "draft" | "posted";
}

export interface BuildManualJournalPayloadResult {
  error?: string;
  payload?: ManualJournal;
}
