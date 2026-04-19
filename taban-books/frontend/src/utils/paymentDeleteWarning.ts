interface PaymentDeleteWarningOptions {
  paymentCount?: number;
  billLabels?: string[];
}

export const buildPaymentDeleteWarning = ({
  paymentCount = 1,
  billLabels = [],
}: PaymentDeleteWarningOptions = {}) => {
  const normalizedBillLabels = billLabels
    .map((label) => String(label || "").trim())
    .filter(Boolean);

  const paymentLabel =
    paymentCount === 1 ? "this payment" : `${paymentCount} payment(s)`;
  const allocationLabel =
    paymentCount === 1 ? "the payment allocation" : "the selected payment allocations";

  const billSummary = normalizedBillLabels.length
    ? `\n\nLinked bill${normalizedBillLabels.length === 1 ? "" : "s"}: ${normalizedBillLabels.slice(0, 3).join(", ")}${normalizedBillLabels.length > 3 ? ", ..." : ""}.`
    : "";

  return `Are you sure you want to delete ${paymentLabel}?\n\nThis removes ${allocationLabel}. Any linked bill with a remaining balance will move back to unpaid/due or overdue status.${billSummary}`;
};
