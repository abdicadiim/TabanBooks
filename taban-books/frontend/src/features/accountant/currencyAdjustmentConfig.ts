export const CURRENCY_ADJUSTMENT_ROUTE = "/accountant/currency-adjustments";
export const CURRENCY_ADJUSTMENT_TITLE = "CURRENCY ADJUSTMENT";
export const CURRENCY_ADJUSTMENT_EMPTY_NOTES_LABEL = "no note";
export const CURRENCY_ADJUSTMENT_ATTACHMENT_COUNT = 0;

export const CURRENCY_ADJUSTMENT_CURRENCIES = [
  "AED - UAE Dirham",
  "AUD - Australian Dollar",
  "CAD - Canadian Dollar",
  "EUR - Euro",
  "GBP - Pound Sterling",
  "INR - Indian Rupee",
  "KES - Kenyan Shilling",
  "USD - United States Dollar",
] as const;

export const CURRENCY_ADJUSTMENT_PERIOD_OPTIONS = [
  "All",
  "Today",
  "This Week",
  "This Month",
  "This Quarter",
  "This Year",
  "Custom",
] as const;

export type CurrencyAdjustmentPeriod =
  (typeof CURRENCY_ADJUSTMENT_PERIOD_OPTIONS)[number];

export const CURRENCY_ADJUSTMENT_LIST_PERIOD_OPTIONS: readonly CurrencyAdjustmentPeriod[] =
  [
    "All",
    "Today",
    "This Week",
    "This Month",
    "This Quarter",
    "This Year",
  ];

export const CURRENCY_ADJUSTMENT_EXPORT_ACTIONS = [
  { id: "download", label: "Download PDF" },
  { id: "print", label: "Print" },
] as const;

export type CurrencyAdjustmentExportAction =
  (typeof CURRENCY_ADJUSTMENT_EXPORT_ACTIONS)[number]["id"];
