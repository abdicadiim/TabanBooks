import { useCallback, useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";
import { getAccounts, getBaseCurrency, getJournals } from "./accountantModel";
import { getAccountFilterByForView } from "./chartOfAccountsConfig";
import type { ChartOfAccountsAccount } from "./chartOfAccountsTypes";
import {
  calculateChartAccountTransactionTotals,
  getChartAccountReportDateRange,
  mapChartOfAccountsResponse,
} from "./chartOfAccountsUtils";

interface UseChartOfAccountsDataOptions {
  currentPage: number;
  itemsPerPage: number;
  searchTerm: string;
  selectedAccount: ChartOfAccountsAccount | null;
  selectedSortBy: string;
  selectedView: string;
  sortOrder: string;
}

export function useChartOfAccountsData({
  currentPage,
  itemsPerPage,
  searchTerm,
  selectedAccount,
  selectedSortBy,
  selectedView,
  sortOrder,
}: UseChartOfAccountsDataOptions) {
  const [accounts, setAccounts] = useState<ChartOfAccountsAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<ChartOfAccountsAccount[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    const loadBaseCurrency = async () => {
      const currency = await getBaseCurrency();
      if (currency) {
        setBaseCurrency(currency);
      }
    };

    loadBaseCurrency();
  }, []);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);

    try {
      const filterBy = getAccountFilterByForView(selectedView);
      const response = await getAccounts({
        search: searchTerm,
        sort_column:
          selectedSortBy === "Account Code"
            ? "account_code"
            : selectedSortBy === "Account Name"
              ? "account_name"
              : "account_type",
        sortOrder,
        page: currentPage,
        per_page: itemsPerPage,
        filter_by: filterBy,
      });

      if (!response?.success) {
        setAccounts([]);
        toast.error("Failed to fetch accounts");
        return;
      }

      setAccounts((response.data || []).map(mapChartOfAccountsResponse));
      if (response.pagination) {
        setTotalPages(response.pagination.pages);
        setTotalRecords(response.pagination.total);
      }
    } catch (error) {
      console.error("fetchAccounts error:", error);
      setAccounts([]);
      toast.error("Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, selectedSortBy, selectedView, sortOrder]);

  const fetchAllAccounts = useCallback(async () => {
    try {
      const response = await getAccounts({
        per_page: 1000,
        filter_by: "AccountType.Active",
        sort_column: "account_name",
      });

      if (response?.success) {
        setAllAccounts((response.data || []).map(mapChartOfAccountsResponse));
      }
    } catch (error) {
      console.error("fetchAllAccounts error:", error);
    }
  }, []);

  const fetchAccountTransactions = useCallback(async (accountId: string) => {
    setIsTransactionsLoading(true);

    try {
      const response = await getJournals({ accountId, status: "posted" });
      if (response?.success) {
        setAccountTransactions(response.data || []);
        return;
      }

      setAccountTransactions([]);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      setAccountTransactions([]);
    } finally {
      setIsTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchAllAccounts();
  }, [fetchAccounts, fetchAllAccounts]);

  useEffect(() => {
    if (!selectedAccount) {
      setAccountTransactions([]);
      return;
    }

    fetchAccountTransactions(String(selectedAccount.id || selectedAccount._id));
  }, [fetchAccountTransactions, selectedAccount]);

  const transactionTotals = useMemo(
    () =>
      calculateChartAccountTransactionTotals(accountTransactions, selectedAccount),
    [accountTransactions, selectedAccount],
  );

  const reportDateRange = useMemo(
    () => getChartAccountReportDateRange(accountTransactions),
    [accountTransactions],
  );

  return {
    accountTransactions,
    accounts,
    allAccounts,
    baseCurrency,
    fetchAccounts,
    fetchAllAccounts,
    isLoading,
    isTransactionsLoading,
    reportDateRange,
    setIsLoading,
    totalPages,
    totalRecords,
    transactionTotals,
  };
}
