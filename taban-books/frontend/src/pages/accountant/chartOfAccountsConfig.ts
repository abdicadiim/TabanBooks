export type AccountTypeCategory =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

export interface AccountTypeOption {
  value: string;
  label: string;
  category: AccountTypeCategory;
}

const ACCOUNT_TYPE_OPTIONS_SOURCE: AccountTypeOption[] = [
  { value: "asset", label: "Asset", category: "asset" },
  { value: "other_asset", label: "Other Asset", category: "asset" },
  { value: "other_current_asset", label: "Other Current Asset", category: "asset" },
  { value: "intangible_asset", label: "Intangible Asset", category: "asset" },
  { value: "right_to_use_asset", label: "Right To Use Asset", category: "asset" },
  { value: "financial_asset", label: "Financial Asset", category: "asset" },
  { value: "contingent_asset", label: "Contingent Asset", category: "asset" },
  { value: "contract_asset", label: "Contract Asset", category: "asset" },
  { value: "cash", label: "Cash", category: "asset" },
  { value: "bank", label: "Bank", category: "asset" },
  { value: "fixed_asset", label: "Fixed Asset", category: "asset" },
  { value: "accounts_receivable", label: "Accounts Receivable", category: "asset" },
  { value: "stock", label: "Stock", category: "asset" },
  { value: "payment_clearing_account", label: "Payment Clearing Account", category: "asset" },
  { value: "input_tax", label: "Input Tax", category: "asset" },
  { value: "non_current_asset", label: "Non Current Asset", category: "asset" },
  { value: "deferred_tax_asset", label: "Deferred Tax Asset", category: "asset" },

  { value: "liability", label: "Liability", category: "liability" },
  { value: "other_current_liability", label: "Other Current Liability", category: "liability" },
  { value: "contract_liability", label: "Contract Liability", category: "liability" },
  { value: "refund_liability", label: "Refund Liability", category: "liability" },
  { value: "credit_card", label: "Credit Card", category: "liability" },
  { value: "long_term_liability", label: "Long Term Liability", category: "liability" },
  { value: "loans_and_borrowing", label: "Loans And Borrowing", category: "liability" },
  { value: "lease_liability", label: "Lease Liability", category: "liability" },
  { value: "employee_benefit_liability", label: "Employee Benefit Liability", category: "liability" },
  { value: "contingent_liability", label: "Contingent Liability", category: "liability" },
  { value: "financial_liability", label: "Financial Liability", category: "liability" },
  { value: "other_liability", label: "Other Liability", category: "liability" },
  { value: "accounts_payable", label: "Accounts Payable", category: "liability" },
  { value: "non_current_liability", label: "Non Current Liability", category: "liability" },
  { value: "overseas_tax_payable", label: "Overseas Tax Payable", category: "liability" },
  { value: "output_tax", label: "Output Tax", category: "liability" },
  { value: "deferred_tax_liability", label: "Deferred Tax Liability", category: "liability" },

  { value: "equity", label: "Equity", category: "equity" },

  { value: "income", label: "Income", category: "income" },
  { value: "finance_income", label: "Finance Income", category: "income" },
  { value: "other_comprehensive_income", label: "Other Comprehensive Income", category: "income" },
  { value: "other_income", label: "Other Income", category: "income" },

  { value: "expense", label: "Expense", category: "expense" },
  { value: "manufacturing_expense", label: "Manufacturing Expense", category: "expense" },
  { value: "impairment_expense", label: "Impairment Expense", category: "expense" },
  { value: "depreciation_expense", label: "Depreciation Expense", category: "expense" },
  { value: "employee_benefit_expense", label: "Employee Benefit Expense", category: "expense" },
  { value: "lease_expense", label: "Lease Expense", category: "expense" },
  { value: "finance_expense", label: "Finance Expense", category: "expense" },
  { value: "tax_expense", label: "Tax Expense", category: "expense" },
  { value: "cost_of_goods_sold", label: "Cost Of Goods Sold", category: "expense" },
  { value: "other_expense", label: "Other Expense", category: "expense" },
];

export const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPE_OPTIONS_SOURCE;
export const ACCOUNT_TYPE_LABELS = ACCOUNT_TYPE_OPTIONS.map((option) => option.label);

const ACCOUNT_TYPE_BY_VALUE = new Map(
  ACCOUNT_TYPE_OPTIONS.map((option) => [option.value, option])
);

const ACCOUNT_TYPE_BY_LABEL = new Map(
  ACCOUNT_TYPE_OPTIONS.map((option) => [option.label.toLowerCase(), option])
);

const CATEGORY_LABELS: Record<AccountTypeCategory, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

const CATEGORY_DESCRIPTIONS: Record<AccountTypeCategory, string> = {
  asset: "Track cash, receivables, inventory, and other resources owned by the business.",
  liability: "Track obligations, payables, and other amounts the business owes.",
  equity: "Track owner contributions, retained earnings, and other ownership balances.",
  income: "Track operating revenue and other income earned by the business.",
  expense: "Track operating costs, cost of goods sold, and other business expenses.",
};

const CATEGORY_DEFAULTS: Record<AccountTypeCategory, string> = {
  asset: "other_current_asset",
  liability: "other_current_liability",
  equity: "equity",
  income: "income",
  expense: "expense",
};

const VIEW_FILTERS: Record<string, string | undefined> = {
  "All Accounts": "AccountType.All",
  "Active Accounts": "AccountType.Active",
  "Inactive Accounts": "AccountType.Inactive",
  "Asset Accounts": "AccountType.Asset",
  "Liability Accounts": "AccountType.Liability",
  "Equity Accounts": "AccountType.Equity",
  "Income Accounts": "AccountType.Income",
  "Expense Accounts": "AccountType.Expense",
};

export const normalizeAccountTypeValue = (value?: string | null): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const formatAccountTypeLabel = (value?: string | null): string => {
  const normalizedValue = normalizeAccountTypeValue(value);
  if (!normalizedValue) return "-";

  const match = ACCOUNT_TYPE_BY_VALUE.get(normalizedValue);
  if (match) return match.label;

  return normalizedValue
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getAccountTypeCategory = (
  value?: string | null
): AccountTypeCategory | null => {
  const normalizedValue = normalizeAccountTypeValue(value);
  if (!normalizedValue) return null;

  const directMatch = ACCOUNT_TYPE_BY_VALUE.get(normalizedValue);
  if (directMatch) return directMatch.category;

  const categoryMatch = Object.keys(CATEGORY_LABELS).find(
    (category) => category === normalizedValue
  );

  return (categoryMatch as AccountTypeCategory) || null;
};

export const getAccountTypeCategoryLabel = (value?: string | null): string => {
  const category = getAccountTypeCategory(value);
  return category ? CATEGORY_LABELS[category] : "Account";
};

export const getAccountTypeCategoryDescription = (value?: string | null): string => {
  const category = getAccountTypeCategory(value);
  return category
    ? CATEGORY_DESCRIPTIONS[category]
    : "Track your accounts using the account type that best matches their reporting purpose.";
};

export const getAccountFilterByForView = (view: string): string | undefined =>
  VIEW_FILTERS[view];

export const resolveAccountTypeLabel = (value?: string | null): string => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const exactLabelMatch = ACCOUNT_TYPE_BY_LABEL.get(rawValue.toLowerCase());
  if (exactLabelMatch) return exactLabelMatch.label;

  return formatAccountTypeLabel(rawValue);
};

export const resolveDefaultAccountTypeLabel = (value?: string | null): string => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const exactLabelMatch = ACCOUNT_TYPE_BY_LABEL.get(rawValue.toLowerCase());
  if (exactLabelMatch) return exactLabelMatch.label;

  const normalizedValue = normalizeAccountTypeValue(rawValue);
  const exactValueMatch = ACCOUNT_TYPE_BY_VALUE.get(normalizedValue);
  if (exactValueMatch) return exactValueMatch.label;

  const category = getAccountTypeCategory(normalizedValue);
  if (category) {
    return formatAccountTypeLabel(CATEGORY_DEFAULTS[category]);
  }

  return rawValue;
};
