import {
  formatAccountTypeLabel,
  normalizeAccountTypeValue,
  resolveAccountTypeLabel,
} from "./chartOfAccountsConfig";
import type {
  ChartOfAccountsAccount,
  ChartOfAccountsCustomView,
  ChartOfAccountsFormData,
} from "./chartOfAccountsTypes";

export const EMPTY_CHART_OF_ACCOUNTS_FORM_DATA: ChartOfAccountsFormData = {
  accountType: "",
  accountName: "",
  accountCode: "",
  description: "",
  addToWatchlist: false,
  isSubAccount: false,
  parentAccountId: "",
};

export const buildChartOfAccountsFormData = (
  account?: ChartOfAccountsAccount | null,
): ChartOfAccountsFormData => {
  if (!account) {
    return { ...EMPTY_CHART_OF_ACCOUNTS_FORM_DATA };
  }

  return {
    accountType: resolveAccountTypeLabel(account.accountType || account.type || ""),
    accountName: account.name || account.accountName || "",
    accountCode: account.code || account.accountCode || "",
    description: account.description || "",
    addToWatchlist: account.showInWatchlist || account.addToWatchlist || false,
    isSubAccount: account.isSubAccount || false,
    parentAccountId: account.parentAccountId || "",
  };
};

export const mapChartOfAccountsResponse = (
  account: any,
): ChartOfAccountsAccount => {
  const rawActive = account.isActive ?? account.is_active ?? account.is_active_account;
  const isActive = rawActive === true || rawActive === 1 || rawActive === "true" || rawActive === undefined;
  
  return {
    ...account,
    id: account._id || account.id || account.account_id,
    name: account.accountName || account.name || account.account_name,
    code: account.accountCode || account.code || account.account_code,
    accountType: normalizeAccountTypeValue(
      account.accountType || account.account_type || account.type,
    ),
    type: formatAccountTypeLabel(
      account.accountType || account.account_type || account.type,
    ),
    parent: account.parentAccount
      ? account.parentAccount.accountName || account.parentAccount.name
      : account.parent_account_name || "-",
    isActive,
    status: isActive ? "active" : "inactive",
  };
};

export const calculateChartAccountTransactionTotals = (
  accountTransactions: any[],
  selectedAccount: ChartOfAccountsAccount | null,
) =>
  accountTransactions.reduce(
    (totals, transaction) => {
      if (!selectedAccount) return totals;

      const selectedAccountId = selectedAccount.id || selectedAccount._id;
      const matchedLine = transaction.lines?.find(
        (line: any) =>
          line.account === selectedAccountId ||
          (line.accountName &&
            line.accountName ===
              (selectedAccount.name || selectedAccount.accountName)) ||
          (line.account &&
            line.account === (selectedAccount.name || selectedAccount.accountName)),
      );

      return {
        debit: totals.debit + (matchedLine?.debit || 0),
        credit: totals.credit + (matchedLine?.credit || 0),
      };
    },
    { debit: 0, credit: 0 },
  );

export const getChartAccountReportDateRange = (accountTransactions: any[]) => {
  if (!accountTransactions.length) return null;

  const parsedDates = accountTransactions
    .map((transaction: any) => new Date(transaction.date))
    .filter((date: Date) => !Number.isNaN(date.getTime()))
    .sort((leftDate: Date, rightDate: Date) => leftDate.getTime() - rightDate.getTime());

  if (!parsedDates.length) return null;

  const format = (date: Date) => date.toISOString().slice(0, 10);
  return {
    startDate: format(parsedDates[0]),
    endDate: format(parsedDates[parsedDates.length - 1]),
  };
};

export const getUniqueChartAccountValues = (
  accounts: ChartOfAccountsAccount[],
  key: "name" | "code" | "type",
): string[] =>
  [...new Set(accounts.map((account) => account[key]).filter(Boolean) as string[])].sort();

export const applyChartOfAccountsCustomViewCriteria = (
  accounts: ChartOfAccountsAccount[],
  customView: ChartOfAccountsCustomView,
): ChartOfAccountsAccount[] => {
  if (!customView?.criteria?.length) {
    return accounts;
  }

  let result = accounts;
  const operators = customView.logicalOperators || {};

  for (let index = 0; index < customView.criteria.length; index += 1) {
    const criterion = customView.criteria[index];
    if (!criterion.field || !criterion.comparator || !criterion.value) continue;

    const matches = accounts.filter((account) => {
      let fieldValue = "";
      switch (criterion.field) {
        case "Account Name":
          fieldValue = account.name || "";
          break;
        case "Account Code":
          fieldValue = account.code || "";
          break;
        case "Account Type":
          fieldValue = account.type || "";
          break;
        case "Parent Account Name":
          fieldValue = account.parent || "";
          break;
        default:
          return true;
      }

      const searchValue = String(criterion.value).toLowerCase();
      const accountValue = fieldValue.toLowerCase();

      switch (criterion.comparator) {
        case "is":
          return accountValue === searchValue;
        case "is not":
          return accountValue !== searchValue;
        case "starts with":
          return accountValue.startsWith(searchValue);
        case "contains":
          return accountValue.includes(searchValue);
        case "doesn't contain":
          return !accountValue.includes(searchValue);
        case "is in":
          return searchValue
            .split(",")
            .map((value) => value.trim())
            .includes(accountValue);
        case "is not in":
          return !searchValue
            .split(",")
            .map((value) => value.trim())
            .includes(accountValue);
        default:
          return true;
      }
    });

    if (index === 0) {
      result = matches;
      continue;
    }

    const operator = operators[index] || "AND";
    result =
      operator === "AND"
        ? result.filter((account) => matches.includes(account))
        : [...new Set([...result, ...matches])];
  }

  return result;
};
