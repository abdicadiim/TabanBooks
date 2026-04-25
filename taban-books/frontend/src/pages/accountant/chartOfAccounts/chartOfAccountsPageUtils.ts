import { normalizeAccountTypeValue } from "../chartOfAccountsConfig";
import type {
  ChartOfAccountsAccount,
  ChartOfAccountsFormData,
} from "../chartOfAccountsTypes";

export interface ChartOfAccountsColumnFilters {
  accountCode: string[];
  accountName: string[];
  accountType: string[];
}

export const getDefaultChartOfAccountsFormData =
  (): ChartOfAccountsFormData => ({
    accountType: "",
    accountName: "",
    accountCode: "",
    description: "",
    addToWatchlist: false,
    isSubAccount: false,
    parentAccountId: "",
  });

export const getDefaultChartOfAccountsFilters =
  (): ChartOfAccountsColumnFilters => ({
    accountCode: [],
    accountName: [],
    accountType: [],
  });

export const buildChartOfAccountsPayload = (
  formData: ChartOfAccountsFormData,
  isActive = true,
) => ({
  accountName: formData.accountName,
  accountCode: formData.accountCode,
  accountType: normalizeAccountTypeValue(formData.accountType),
  description: formData.description,
  isActive,
  parentAccount: formData.isSubAccount ? formData.parentAccountId || undefined : undefined,
  showInWatchlist: formData.addToWatchlist,
});

export const getChartOfAccountsAccountId = (
  account: ChartOfAccountsAccount,
): string => String(account.id || account._id || account.accountName || account.name || "");

export const filterChartOfAccounts = (
  accounts: ChartOfAccountsAccount[],
  filters: ChartOfAccountsColumnFilters,
) =>
  accounts.filter((account) => {
    const matchesName =
      filters.accountName.length === 0 ||
      filters.accountName.includes(account.name || "");
    const matchesCode =
      filters.accountCode.length === 0 ||
      filters.accountCode.includes(account.code || "");
    const matchesType =
      filters.accountType.length === 0 ||
      filters.accountType.includes(account.type || "");

    return matchesName && matchesCode && matchesType;
  });

export const getChartOfAccountsPageNumbers = (
  currentPage: number,
  totalPages: number,
) => {
  const visiblePages = Math.min(5, totalPages);
  return Array.from({ length: visiblePages }, (_, index) => {
    if (totalPages <= 5) return index + 1;
    if (currentPage <= 3) return index + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + index;
    return currentPage - 2 + index;
  });
};

export const formatChartOfAccountsCurrency = (
  amount: number,
  currencyCode?: string,
  currencySymbol?: string,
) => {
  const prefix =
    currencySymbol || (currencyCode ? currencyCode.split(" ")[0] : "USD");
  return `${prefix} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
