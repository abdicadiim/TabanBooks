export type BankAccount = {
  _id?: string;
  id?: string;
  accountName?: string;
  accountNumber?: string;
  accountCode?: string;
  balance?: number;
  bankBalance?: number;
  uncategorizedTransactions?: number;
  uncategorized?: number;
  currencySymbol?: string;
  icon?: string;
  isActive?: boolean | string | number;
  active?: boolean | string | number;
  isInactive?: boolean | string | number;
  status?: string;
};

export type BankAccountsSummary = {
  totalBalance?: number;
  count?: number;
};

export type BankAccountsResponse = {
  bankaccounts?: BankAccount[];
};

export type BankAccountsSummaryResponse = {
  success?: boolean;
  data?: BankAccountsSummary;
};

export type BankingPageController = ReturnType<
  typeof import("./useBankingPageController").useBankingPageController
>;
