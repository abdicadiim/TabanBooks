const DEFAULT_DATE = "29/12/2025";

export const ACCOUNT_DETAIL_DEFAULT_DATE = DEFAULT_DATE;

export function createCreditNoteRefundFormData() {
  return {
    customer: "",
    date: DEFAULT_DATE,
    reference: "",
    paidVia: "Cash",
    selectedCreditNote: "",
    creditNotes: [{ id: 1, number: "CN00001", amount: "3900", balance: "3900", refundAmount: "" }],
    description: "",
  };
}

export function createPaymentRefundFormData() {
  return {
    customer: "",
    date: DEFAULT_DATE,
    reference: "",
    paidVia: "Cash",
    selectedPayment: "",
    payments: [] as any[],
    description: "",
  };
}

export function createEmployeeReimbursementFormData() {
  return {
    employeeName: "",
    date: DEFAULT_DATE,
    reference: "",
    description: "",
  };
}

export function createCustomerAdvanceFormData() {
  return {
    customer: "",
    amountReceived: "",
    bankCharges: "",
    exchangeRate: "",
    date: DEFAULT_DATE,
    paymentNumber: "2",
    reference: "",
    receivedVia: "Cash",
    description: "",
    attachments: [] as any[],
  };
}

export function createCustomerPaymentFormData() {
  return {
    customer: "",
    amountReceived: "",
    bankCharges: "",
    date: DEFAULT_DATE,
    paymentNumber: "2",
    reference: "",
    receivedVia: "Cash",
    description: "",
    sendThankYouNote: false,
    attachments: [] as any[],
  };
}

export function createTransferFromAnotherAccountFormData(resolvedBaseCurrency: string) {
  return {
    toAccount: "",
    fromAccount: "",
    date: DEFAULT_DATE,
    currency: resolvedBaseCurrency,
    amount: "",
    reference: "",
    description: "",
    attachments: [] as any[],
  };
}

export function createMoneyInFormData(resolvedBaseCurrency: string) {
  return {
    date: DEFAULT_DATE,
    currency: resolvedBaseCurrency,
    amount: "",
    receivedVia: "Cash",
    reference: "",
    description: "",
    attachments: [] as any[],
  };
}
