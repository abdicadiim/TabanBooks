export const CANONICAL_PAYMENT_MODE_LABELS = [
  "Cash",
  "Check",
  "Credit Card",
  "Bank Transfer",
  "Others",
] as const;

export type PaymentModeLabel = (typeof CANONICAL_PAYMENT_MODE_LABELS)[number];
export type PaymentMethodCode =
  | "cash"
  | "check"
  | "card"
  | "bank_transfer"
  | "other";

export const DEFAULT_PAYMENT_MODES = CANONICAL_PAYMENT_MODE_LABELS.map((name) => ({
  name,
  isDefault: name === "Cash",
}));

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const isCanonicalPaymentModeLabel = (
  value: unknown
): value is PaymentModeLabel =>
  CANONICAL_PAYMENT_MODE_LABELS.includes(String(value || "").trim() as PaymentModeLabel);

export const getRecognizedPaymentModeLabel = (
  value: unknown
): PaymentModeLabel | null => {
  const normalized = normalizeToken(value);

  if (!normalized) return null;

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

  return null;
};

export const toPaymentModeLabel = (
  value: unknown,
  fallback: PaymentModeLabel = "Others"
): PaymentModeLabel => getRecognizedPaymentModeLabel(value) || fallback;

export const toPaymentMethodCode = (
  value: unknown,
  fallback: PaymentMethodCode = "cash"
): PaymentMethodCode => {
  const label = getRecognizedPaymentModeLabel(value);

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
