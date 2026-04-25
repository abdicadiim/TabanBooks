export interface ManualJournalContact {
  id: string;
  name: string;
  type: "Customer" | "Vendor";
}

export interface ManualJournalCurrency {
  code: string;
  name: string;
}

export interface ManualJournalTax {
  _id?: string;
  id?: string;
  name: string;
  rate: number;
  isCompound?: boolean;
}

export interface ManualJournalAccount {
  _id?: string;
  id?: string;
  accountName?: string;
  name?: string;
  accountCode?: string;
  code?: string;
  accountType?: string;
  currencyCode?: string;
  currencySymbol?: string;
  balance?: number;
  bankBalance?: number;
  accountNumber?: string;
  bankName?: string;
  isBankAccount?: boolean;
}

export interface ManualJournalEntry {
  id: number;
  account: string;
  accountId: string;
  description: string;
  contact: string;
  type: string;
  tax?: string;
  project?: string;
  reportingTags?: string;
  debits: string;
  credits: string;
}

export interface ManualJournal {
  _id?: string;
  id?: string;
  date: string;
  journalNumber: string;
  entryNumber?: string;
  reference?: string;
  referenceNumber?: string;
  notes: string;
  description?: string;
  reportingMethod?: string;
  currency?: string;
  lines?: any[];
  entries?: any[];
  amount?: number;
  status?: string;
  attachments?: number;
  createdBy?: string;
  [key: string]: any;
}

export interface ManualJournalGroupedAccount {
  category: string;
  items: Array<{
    name: string;
    id?: string;
    code: string;
    currencyCode: string;
    currencySymbol: string;
    balance: number;
    bankBalance: number;
    accountNumber: string;
    bankName: string;
    isBankAccount: boolean;
  }>;
}

export interface ManualJournalCustomView {
  id?: string;
  name?: string;
  criteria: Array<{
    field: string;
    comparator: string;
    value: any;
  }>;
  logicalOperators?: Record<number, string>;
}
