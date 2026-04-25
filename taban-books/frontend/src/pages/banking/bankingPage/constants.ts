export const ACCOUNT_FILTER_OPTIONS = [
  "All Accounts",
  "Active Accounts",
  "Inactive Accounts",
] as const;

export type AccountFilterOption = (typeof ACCOUNT_FILTER_OPTIONS)[number];

export const TIME_PERIOD_OPTIONS = [
  "Last 30 days",
  "Last 12 months",
] as const;

export type TimePeriodOption = (typeof TIME_PERIOD_OPTIONS)[number];

export const BANK_STATEMENTS_INBOX_EMAIL =
  "taban.kbym5f2_d5r5ul5hb.secure@inbox.tabanreceipts.com";

export const CHART_MAX_VALUE = 3500;
