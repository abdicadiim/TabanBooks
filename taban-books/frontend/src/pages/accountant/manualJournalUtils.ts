import type {
  ManualJournal,
  ManualJournalAccount,
  ManualJournalContact,
  ManualJournalCurrency,
  ManualJournalEntry,
  ManualJournalGroupedAccount,
  ManualJournalTax,
} from "./manualJournalTypes";

export const extractManualJournalArray = (response: any): any[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.accounts && Array.isArray(response.accounts)) return response.accounts;
  if (response.bankaccounts && Array.isArray(response.bankaccounts)) {
    return response.bankaccounts;
  }
  if (response.data && response.data.items && Array.isArray(response.data.items)) {
    return response.data.items;
  }
  return [];
};

export const mergeManualJournalAccounts = (
  chartAccounts: any[],
  bankAccounts: any[],
): ManualJournalAccount[] => {
  const normalizedBankAccounts = bankAccounts.map((account: any) => ({
    _id: account._id || account.id || account._doc?._id,
    id: account.id || account._id || account._doc?.id,
    accountName:
      account.name ||
      account.accountName ||
      account.bankName ||
      account.bankAccountName,
    accountCode: account.code || account.accountCode || account.accountNumber || "",
    code: account.code || account.accountCode || account.accountNumber || "",
    accountType:
      account.accountType === "credit_card" ? "Credit Card" : "Bank Account",
    currencyCode: account.currencyCode || account.currencyId?.code || "",
    currencySymbol: account.currencySymbol || account.currencyId?.symbol || "",
    balance: Number(account.balance || 0),
    bankBalance: Number(account.bankBalance || 0),
    accountNumber: account.accountNumber || "",
    bankName: account.bankName || "",
    isBankAccount: true,
  }));

  const mergedAccounts = [...chartAccounts, ...normalizedBankAccounts];
  const uniqueById: Record<string, ManualJournalAccount> = {};

  mergedAccounts.forEach((account: ManualJournalAccount) => {
    const key =
      account.id ||
      account._id ||
      account.accountCode ||
      account.accountName ||
      account.name;

    if (key) {
      uniqueById[String(key)] = account;
    }
  });

  return Object.values(uniqueById);
};

export const buildManualJournalContacts = (
  customers: any[] = [],
  vendors: any[] = [],
): ManualJournalContact[] => [
  ...customers.map((customer: any) => ({
    id: customer.id || customer._id,
    name: customer.displayName || customer.name,
    type: "Customer" as const,
  })),
  ...vendors.map((vendor: any) => ({
    id: vendor.id || vendor._id,
    name: vendor.displayName || vendor.name,
    type: "Vendor" as const,
  })),
];

export const buildManualJournalTaxOptions = (
  taxes: ManualJournalTax[],
): string[] => ["No Tax", ...taxes.map((tax) => tax.name)];

export const buildManualJournalFormData = (journal: ManualJournal) => ({
  date: journal.date
    ? new Date(journal.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  journalNumber: journal.journalNumber || journal.entryNumber || journal.id || "1",
  reference: journal.reference || journal.referenceNumber || "",
  notes: journal.notes || journal.description || "",
  reportingMethod: journal.reportingMethod || "accrual-and-cash",
  currency: journal.currency || "SOS",
});

export const mapManualJournalEntries = (
  entries: any[] | undefined,
): ManualJournalEntry[] =>
  (entries || []).map((entry: any, index: number) => ({
    id: entry.id || entry._id || index + 1,
    account: entry.accountName || entry.account || "",
    accountId: entry.account || "",
    description: entry.description || "",
    contact: entry.contact || "",
    type: entry.type || "",
    tax:
      entry.tax && typeof entry.tax !== "string" ? entry.tax.name || "" : entry.tax || "",
    project: entry.project || "",
    reportingTags: entry.reportingTags || "",
    debits:
      entry.debits !== undefined || entry.debit !== undefined
        ? String(entry.debits ?? entry.debit ?? "")
        : "",
    credits:
      entry.credits !== undefined || entry.credit !== undefined
        ? String(entry.credits ?? entry.credit ?? "")
        : "",
  }));

export const groupManualJournalAccounts = (
  allAccounts: ManualJournalAccount[],
): ManualJournalGroupedAccount[] => {
  const groups: Record<string, ManualJournalGroupedAccount["items"]> = {};

  allAccounts.forEach((account) => {
    const category = account.accountType || "Other";
    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push({
      name: account.accountName || account.name || account.accountCode || "",
      id: account._id || account.id,
      code: account.accountCode || account.code || "",
      currencyCode: account.currencyCode || "",
      currencySymbol: account.currencySymbol || "",
      balance: Number(account.balance || 0),
      bankBalance: Number(account.bankBalance || 0),
      accountNumber: account.accountNumber || "",
      bankName: account.bankName || "",
      isBankAccount: Boolean(account.isBankAccount),
    });
  });

  return Object.keys(groups).map((category) => ({
    category:
      category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " "),
    items: groups[category],
  }));
};

export const buildManualJournalAccountLookup = (
  allAccounts: ManualJournalAccount[],
): Map<string, ManualJournalAccount> => {
  const lookup = new Map<string, ManualJournalAccount>();

  allAccounts.forEach((account) => {
    [
      account._id,
      account.id,
      account.accountName,
      account.name,
      account.accountCode,
      account.code,
    ]
      .filter(Boolean)
      .forEach((key) => {
        lookup.set(String(key), account);
      });
  });

  return lookup;
};

interface FormatManualJournalAccountMoneyOptions {
  account?: Partial<ManualJournalAccount>;
  baseCurrencyCode?: string;
  baseCurrencySymbol?: string;
  selectedCurrency?: ManualJournalCurrency;
  value?: number;
}

export const formatManualJournalAccountMoney = ({
  account,
  baseCurrencyCode,
  baseCurrencySymbol,
  selectedCurrency,
  value,
}: FormatManualJournalAccountMoneyOptions): string => {
  const amount = Number(value || 0);
  const currencyCode =
    account?.currencyCode ||
    selectedCurrency?.code ||
    baseCurrencyCode ||
    "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    const symbol =
      account?.currencySymbol ||
      selectedCurrency?.code ||
      baseCurrencySymbol ||
      currencyCode;

    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

export const getManualJournalEntryAccountMeta = (
  entry: ManualJournalEntry,
  accountLookup: Map<string, ManualJournalAccount>,
): ManualJournalAccount | undefined =>
  accountLookup.get(entry.accountId) ||
  accountLookup.get(entry.account) ||
  undefined;
