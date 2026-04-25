import type { ManualJournalCurrency } from "./manualJournalTypes";

export const MANUAL_JOURNAL_CURRENCIES: ManualJournalCurrency[] = [
  { code: "AED", name: "UAE Dirham" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CNY", name: "Yuan Renminbi" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Pound Sterling" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "USD", name: "Kenyan Shilling" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "SOS", name: "Somali Shilling" },
  { code: "USD", name: "United States Dollar" },
  { code: "ZAR", name: "South African Rand" },
];

export const MANUAL_JOURNAL_TYPE_OPTIONS = ["Sales", "Purchases"] as const;

export const MANUAL_JOURNAL_PERIOD_OPTIONS = [
  "All",
  "Today",
  "This Week",
  "This Month",
  "This Quarter",
  "This Year",
  "Custom",
] as const;

export const MANUAL_JOURNAL_SORT_OPTIONS = [
  "Date",
  "Journal#",
  "Reference Number",
] as const;

export const MANUAL_JOURNAL_IMPORT_OPTIONS = [
  "Import Journals",
  "Import Applied Customer Credits",
  "Import Applied Vendor Credits",
] as const;

export const MANUAL_JOURNAL_EXPORT_OPTIONS = [
  "Export Journals",
  "Export Applied Customer Credits",
  "Export Applied Vendor Credits",
] as const;
