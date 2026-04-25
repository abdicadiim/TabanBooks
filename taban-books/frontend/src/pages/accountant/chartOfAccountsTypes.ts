export interface ChartOfAccountsAccount {
  id?: string;
  _id?: string;
  accountName?: string;
  name?: string;
  accountCode?: string;
  code?: string;
  accountType?: string;
  type?: string;
  description?: string;
  isActive?: boolean;
  status?: string;
  parentAccount?: {
    accountName?: string;
    name?: string;
  };
  parent?: string;
  addToWatchlist?: boolean;
  showInWatchlist?: boolean;
  isSubAccount?: boolean;
  parentAccountId?: string;
  documents?: any[];
}

export interface ChartOfAccountsCustomView {
  id: string;
  name: string;
  criteria: Array<{
    field: string;
    comparator: string;
    value: any;
  }>;
  logicalOperators?: Record<number, string>;
}

export interface ChartOfAccountsFormData {
  accountType: string;
  accountName: string;
  accountCode: string;
  description: string;
  addToWatchlist: boolean;
  isSubAccount: boolean;
  parentAccountId: string;
}
