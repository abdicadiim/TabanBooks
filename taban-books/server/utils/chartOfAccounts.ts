export type AccountTypeCategory =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

const ACCOUNT_TYPE_CATEGORY_VALUES: Record<AccountTypeCategory, string[]> = {
  asset: [
    "asset",
    "other_asset",
    "other_current_asset",
    "intangible_asset",
    "right_to_use_asset",
    "financial_asset",
    "contingent_asset",
    "contract_asset",
    "cash",
    "bank",
    "fixed_asset",
    "accounts_receivable",
    "stock",
    "payment_clearing_account",
    "input_tax",
    "non_current_asset",
    "deferred_tax_asset",
  ],
  liability: [
    "liability",
    "other_current_liability",
    "contract_liability",
    "refund_liability",
    "credit_card",
    "long_term_liability",
    "loans_and_borrowing",
    "lease_liability",
    "employee_benefit_liability",
    "contingent_liability",
    "financial_liability",
    "other_liability",
    "accounts_payable",
    "non_current_liability",
    "overseas_tax_payable",
    "output_tax",
    "deferred_tax_liability",
  ],
  equity: [
    "equity",
  ],
  income: [
    "income",
    "finance_income",
    "other_comprehensive_income",
    "other_income",
  ],
  expense: [
    "expense",
    "manufacturing_expense",
    "impairment_expense",
    "depreciation_expense",
    "employee_benefit_expense",
    "lease_expense",
    "finance_expense",
    "tax_expense",
    "cost_of_goods_sold",
    "other_expense",
  ],
};

export const CHART_OF_ACCOUNT_TYPES = Array.from(
  new Set(Object.values(ACCOUNT_TYPE_CATEGORY_VALUES).flat())
);

const ACCOUNT_TYPE_CATEGORIES = Object.keys(
  ACCOUNT_TYPE_CATEGORY_VALUES
) as AccountTypeCategory[];

const FILTER_BY_MAP: Record<string, { category?: AccountTypeCategory; isActive?: boolean }> = {
  accounttypeall: {},
  accounttypeactive: { isActive: true },
  accounttypeinactive: { isActive: false },
  accounttypeasset: { category: "asset" },
  accounttypeliability: { category: "liability" },
  accounttypeequity: { category: "equity" },
  accounttypeincome: { category: "income" },
  accounttypeexpense: { category: "expense" },
};

const SORT_FIELD_MAP: Record<string, string> = {
  accountcode: "accountCode",
  accountname: "accountName",
  accounttype: "accountType",
  currentbalance: "balance",
  balance: "balance",
  lastmodifiedtime: "updatedAt",
  createdtime: "createdAt",
};

const CATEGORY_DEFAULTS: Record<AccountTypeCategory, string> = {
  asset: "asset",
  liability: "liability",
  equity: "equity",
  income: "income",
  expense: "expense",
};

const normalizeIdentifier = (value: any): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.-]+/g, "");

export const normalizeAccountType = (value: any): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const getAccountTypeCategory = (
  value: any
): AccountTypeCategory | null => {
  const normalizedValue = normalizeAccountType(value);
  if (!normalizedValue) return null;

  for (const category of ACCOUNT_TYPE_CATEGORIES) {
    if (ACCOUNT_TYPE_CATEGORY_VALUES[category].includes(normalizedValue)) {
      return category;
    }
  }

  return null;
};

export const getAccountTypesForCategory = (
  category: AccountTypeCategory
): string[] => [...ACCOUNT_TYPE_CATEGORY_VALUES[category]];

export const isDebitNormalAccountType = (value: any): boolean => {
  const category = getAccountTypeCategory(value);
  return category === "asset" || category === "expense";
};

export const coerceOptionalBoolean = (value: any): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalizedValue = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalizedValue)) return true;
  if (["false", "0", "no", "n"].includes(normalizedValue)) return false;

  return undefined;
};

export const resolveAccountQueryFilters = ({
  filterBy,
  type,
  isActive,
}: {
  filterBy?: any;
  type?: any;
  isActive?: any;
}): {
  accountTypes?: string[];
  isActive?: boolean;
} => {
  const resolved: {
    accountTypes?: string[];
    isActive?: boolean;
  } = {};

  const filterConfig = FILTER_BY_MAP[normalizeIdentifier(filterBy)];
  if (filterConfig?.category) {
    resolved.accountTypes = getAccountTypesForCategory(filterConfig.category);
  }
  if (filterConfig?.isActive !== undefined) {
    resolved.isActive = filterConfig.isActive;
  }

  const normalizedType = normalizeAccountType(type);
  if (normalizedType) {
    const category =
      ACCOUNT_TYPE_CATEGORIES.find((candidate) => candidate === normalizedType) ||
      getAccountTypeCategory(normalizedType);

    if (category) {
      resolved.accountTypes = getAccountTypesForCategory(category);
    } else {
      resolved.accountTypes = [normalizedType];
    }
  }

  const resolvedIsActive = coerceOptionalBoolean(isActive);
  if (resolvedIsActive !== undefined) {
    resolved.isActive = resolvedIsActive;
  }

  return resolved;
};

export const resolveAccountSortField = ({
  sortBy,
  sortColumn,
}: {
  sortBy?: any;
  sortColumn?: any;
}): string => {
  const normalizedSortColumn = normalizeIdentifier(sortColumn);
  if (SORT_FIELD_MAP[normalizedSortColumn]) {
    return SORT_FIELD_MAP[normalizedSortColumn];
  }

  const normalizedSortBy = normalizeIdentifier(sortBy);
  if (SORT_FIELD_MAP[normalizedSortBy]) {
    return SORT_FIELD_MAP[normalizedSortBy];
  }

  return "accountCode";
};

export const normalizeAccountPayload = (payload: any = {}) => {
  const normalized = { ...payload };

  if (normalized.account_name !== undefined && normalized.accountName === undefined) {
    normalized.accountName = normalized.account_name;
  }
  if (normalized.account_code !== undefined && normalized.accountCode === undefined) {
    normalized.accountCode = normalized.account_code;
  }
  if (normalized.account_type !== undefined && normalized.accountType === undefined) {
    normalized.accountType = normalized.account_type;
  }
  if (normalized.parent_account_id !== undefined && normalized.parentAccount === undefined) {
    normalized.parentAccount = normalized.parent_account_id;
  }
  if (normalized.parentAccountId !== undefined && normalized.parentAccount === undefined) {
    normalized.parentAccount = normalized.parentAccountId;
  }
  if (normalized.addToWatchlist !== undefined && normalized.showInWatchlist === undefined) {
    normalized.showInWatchlist = normalized.addToWatchlist;
  }

  if (normalized.accountName !== undefined) {
    normalized.accountName = String(normalized.accountName).trim();
  }
  if (normalized.accountCode !== undefined) {
    normalized.accountCode = String(normalized.accountCode).trim();
  }
  if (normalized.description !== undefined) {
    normalized.description = String(normalized.description).trim();
  }

  const normalizedAccountType = normalizeAccountType(normalized.accountType);
  if (normalizedAccountType) {
    normalized.accountType = normalizedAccountType;
  } else {
    delete normalized.accountType;
  }

  const normalizedIsActive = coerceOptionalBoolean(normalized.isActive);
  if (normalizedIsActive !== undefined) {
    normalized.isActive = normalizedIsActive;
  }

  const normalizedWatchlist = coerceOptionalBoolean(normalized.showInWatchlist);
  if (normalizedWatchlist !== undefined) {
    normalized.showInWatchlist = normalizedWatchlist;
  }

  if (normalized.parentAccount === "") {
    delete normalized.parentAccount;
  }

  delete normalized.account_name;
  delete normalized.account_code;
  delete normalized.account_type;
  delete normalized.parent_account_id;
  delete normalized.parentAccountId;
  delete normalized.addToWatchlist;

  return normalized;
};

export const getDefaultAccountTypeForCategory = (
  value: any
): string | undefined => {
  const normalizedValue = normalizeAccountType(value);
  if (!normalizedValue) return undefined;

  if (CHART_OF_ACCOUNT_TYPES.includes(normalizedValue)) {
    return normalizedValue;
  }

  return CATEGORY_DEFAULTS[normalizedValue as AccountTypeCategory];
};
