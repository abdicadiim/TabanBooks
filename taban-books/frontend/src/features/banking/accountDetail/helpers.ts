export type MoneyInTransactionType =
  | "deposit"
  | "refund"
  | "sales_without_invoices"
  | "interest_income"
  | "other_income"
  | "expense_refund"
  | "owner_contribution";

export const ACCOUNT_DETAIL_CATEGORIES = [
  "Customers",
  "Items",
  "Inventory Adjustments",
  "Banking",
  "Quotes",
  "Invoices",
  "Payments Received",
  "Recurring Invoices",
  "Credit Notes",
  "Vendors",
  "Expenses",
  "Recurring Expenses",
  "Purchase Orders",
  "Bills",
  "Payments Made",
  "Recurring Bills",
  "Vendor Credits",
  "Projects",
  "Timesheet",
  "Journals",
  "Chart of Accounts",
  "Documents",
  "Tasks",
];

export const moneyInTitleByType: Record<MoneyInTransactionType, string> = {
  deposit: "Deposit",
  refund: "Refund",
  sales_without_invoices: "Sales Without Invoices",
  interest_income: "Interest Income",
  other_income: "Other Income",
  expense_refund: "Expense Refund",
  owner_contribution: "Owner's Contribution",
};

export const moneyInDefaultDescriptionByType: Record<MoneyInTransactionType, string> = {
  deposit: "Deposit",
  refund: "Refund",
  sales_without_invoices: "Sales without invoices",
  interest_income: "Interest income",
  other_income: "Other income",
  expense_refund: "Expense refund",
  owner_contribution: "Owner's contribution",
};

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const normalizeDateInput = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString();

  const isoLike = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoLike) {
    const [, y, m, d] = isoLike;
    return new Date(Number(y), Number(m) - 1, Number(d)).toISOString();
  }

  const dayFirst = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    return new Date(Number(y), Number(m) - 1, Number(d)).toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const parseAmountInput = (value: unknown): number => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
};

export const getAccountDisplayName = (account: any): string =>
  String(account?.accountName || account?.name || "").trim();

export const getChartAccountDisplayName = (account: any): string =>
  String(account?.displayName || account?.accountName || account?.name || "").trim();

export const getCustomerDisplayName = (customer: any): string =>
  String(
    customer?.displayName ||
      customer?.name ||
      customer?.companyName ||
      `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim(),
  ).trim();

export const getVendorDisplayName = (vendor: any): string =>
  String(
    vendor?.displayName ||
      vendor?.name ||
      vendor?.companyName ||
      `${vendor?.firstName || ""} ${vendor?.lastName || ""}`.trim(),
  ).trim();

export const getTransactionId = (transaction: any): string =>
  String(transaction?._id || transaction?.id || "");

export const formatTransactionTypeLabel = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const getTransactionCounterparty = (transaction: any): string => {
  const directionalAccountName =
    transaction?.debitOrCredit === "credit" ? transaction?.fromAccountName : transaction?.toAccountName;

  return String(
    transaction?.payee ||
      transaction?.customerName ||
      transaction?.vendorName ||
      directionalAccountName ||
      "",
  ).trim();
};

export const formatCurrencyAmount = (value: unknown): string => {
  const amount = Number(value || 0);
  return amountFormatter.format(Number.isFinite(amount) ? amount : 0);
};

export const formatTransactionDate = (value: unknown): string => {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
};

