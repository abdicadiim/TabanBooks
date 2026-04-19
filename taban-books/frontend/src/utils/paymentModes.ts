export const PAYMENT_MODE_OPTIONS = [
  "Cash",
  "Check",
  "Credit Card",
  "Bank Transfer",
  "Others",
] as const;

export type PaymentModeOption = (typeof PAYMENT_MODE_OPTIONS)[number];
export type PaymentMethodCode =
  | "cash"
  | "check"
  | "card"
  | "bank_transfer"
  | "other";

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const getPaymentModeLabel = (
  value: unknown,
  fallback: PaymentModeOption = "Others"
): PaymentModeOption => {
  const normalized = normalizeToken(value);

  if (!normalized) return fallback;
  if (normalized === "cash" || normalized.includes("cash")) return "Cash";
  if (
    normalized === "check" ||
    normalized === "cheque" ||
    normalized.includes("check") ||
    normalized.includes("cheque")
  ) {
    return "Check";
  }
  if (
    normalized === "card" ||
    normalized === "credit_card" ||
    normalized === "debit_card" ||
    normalized.includes("credit") ||
    normalized.includes("debit") ||
    normalized.includes("card")
  ) {
    return "Credit Card";
  }
  if (
    normalized === "bank_transfer" ||
    normalized === "bank_remittance" ||
    normalized.includes("bank") ||
    normalized.includes("transfer") ||
    normalized.includes("wire") ||
    normalized.includes("ach")
  ) {
    return "Bank Transfer";
  }
  if (
    normalized === "other" ||
    normalized === "others" ||
    normalized === "paypal" ||
    normalized === "pay_pal"
  ) {
    return "Others";
  }

  return fallback;
};

export const getPaymentMethodCode = (
  value: unknown,
  fallback: PaymentMethodCode = "cash"
): PaymentMethodCode => {
  const label = getPaymentModeLabel(value, fallback === "other" ? "Others" : "Cash");

  switch (label) {
    case "Cash":
      return "cash";
    case "Check":
      return "check";
    case "Credit Card":
      return "card";
    case "Bank Transfer":
      return "bank_transfer";
    case "Others":
      return "other";
    default:
      return fallback;
  }
};
