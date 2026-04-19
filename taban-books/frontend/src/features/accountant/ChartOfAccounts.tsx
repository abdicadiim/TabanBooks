import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  bulkDeleteAccounts as apiBulkDeleteAccounts,
  bulkUpdateAccountStatus as apiBulkUpdateAccountStatus,
  createAccount as apiCreateAccount,
  deleteAccount as apiDeleteAccount,
  updateAccount as apiUpdateAccount,
} from "./accountantModel";
import { normalizeAccountTypeValue } from "./chartOfAccountsConfig";
import { ChartOfAccountsAccountModal } from "./chartOfAccounts/ChartOfAccountsAccountModal";
import { ChartOfAccountsDetailView } from "./chartOfAccounts/ChartOfAccountsDetailView";
import { ChartOfAccountsExportModals } from "./chartOfAccounts/ChartOfAccountsExportModals";
import { ChartOfAccountsFindAccountantsSidebar } from "./chartOfAccounts/ChartOfAccountsFindAccountantsSidebar";
import { ChartOfAccountsListView } from "./chartOfAccounts/ChartOfAccountsListView";
import type {
  ChartOfAccountsAccount as Account,
  ChartOfAccountsCustomView as CustomView,
  ChartOfAccountsFormData as FormData,
} from "./chartOfAccountsTypes";
import {
  buildChartOfAccountsFormData,
  EMPTY_CHART_OF_ACCOUNTS_FORM_DATA,
  mapChartOfAccountsResponse,
} from "./chartOfAccountsUtils";
import { useChartOfAccountsData } from "./useChartOfAccountsData";

function ChartOfAccounts() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedView, setSelectedView] = useState("Active Accounts");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomView, setSelectedCustomView] = useState<CustomView | null>(null);
  const [customViews, setCustomViews] = useState<CustomView[]>(() => {
    try {
      const saved = localStorage.getItem("customViews");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedSortBy, setSelectedSortBy] = useState("Account Code");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFindAccountantsOpen, setIsFindAccountantsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

  const {
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
  } = useChartOfAccountsData({
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedAccount,
    selectedSortBy,
    selectedView,
    sortOrder,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new") {
      setIsCreateModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("customViews");
      setCustomViews(saved ? JSON.parse(saved) : []);
    } catch {
      setCustomViews([]);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isCreateModalOpen || editingAccount) {
      fetchAllAccounts();
    }
  }, [editingAccount, fetchAllAccounts, isCreateModalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedView]);

  const selectedViewLabel = selectedCustomView?.name || selectedView;
  const isEditModalOpen = Boolean(editingAccount);
  const initialEditFormData = useMemo(
    () => buildChartOfAccountsFormData(editingAccount),
    [editingAccount],
  );

  const handleViewSelection = (value: string) => {
    if (value.startsWith("custom:")) {
      const customViewId = value.replace("custom:", "");
      setSelectedCustomView(
        customViews.find((customView) => customView.id === customViewId) || null,
      );
    } else {
      setSelectedView(value);
      setSelectedCustomView(null);
    }

    setCurrentPage(1);
    setSelectedAccountIds([]);
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
  };

  const handleEditClick = (account: Account) => {
    setEditingAccount(account);
  };

  const handleCreateAccount = async (formData: FormData) => {
    setIsLoading(true);

    try {
      const newAccount = await apiCreateAccount({
        accountName: formData.accountName,
        accountCode: formData.accountCode,
        accountType: normalizeAccountTypeValue(formData.accountType),
        description: formData.description,
        isActive: true,
        parentAccount: formData.isSubAccount ? formData.parentAccountId : undefined,
        showInWatchlist: formData.addToWatchlist,
      });

      if (!newAccount) {
        return;
      }

      toast.success("Account created successfully");
      setIsCreateModalOpen(false);
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (formData: FormData) => {
    if (!editingAccount) {
      return;
    }

    setIsLoading(true);

    try {
      const updated = await apiUpdateAccount(String(editingAccount._id || editingAccount.id), {
        accountName: formData.accountName,
        accountCode: formData.accountCode,
        accountType: normalizeAccountTypeValue(formData.accountType),
        description: formData.description,
        isActive: editingAccount.isActive,
        parentAccount: formData.isSubAccount ? formData.parentAccountId : undefined,
        showInWatchlist: formData.addToWatchlist,
      });

      if (!updated) {
        return;
      }

      const normalizedAccount = mapChartOfAccountsResponse(updated);
      toast.success("Account updated successfully");
      setEditingAccount(null);
      await fetchAccounts();

      if (
        selectedAccount &&
        String(selectedAccount._id || selectedAccount.id) ===
          String(normalizedAccount._id || normalizedAccount.id)
      ) {
        setSelectedAccount(normalizedAccount);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${account.name || account.accountName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await apiDeleteAccount(String(account._id || account.id));
      if (!success) {
        return;
      }

      toast.success("Account deleted successfully");
      await fetchAccounts();

      if (
        selectedAccount &&
        String(selectedAccount._id || selectedAccount.id) === String(account._id || account.id)
      ) {
        setSelectedAccount(null);
      }

      if (
        editingAccount &&
        String(editingAccount._id || editingAccount.id) === String(account._id || account.id)
      ) {
        setEditingAccount(null);
      }

      setSelectedAccountIds((current) =>
        current.filter((selectedId) => selectedId !== String(account._id || account.id)),
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (
      !selectedAccountIds.length ||
      !window.confirm(`Are you sure you want to delete ${selectedAccountIds.length} accounts?`)
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiBulkDeleteAccounts(selectedAccountIds);
      if (!result.success) {
        return;
      }

      toast.success(result.message);
      setSelectedAccountIds([]);
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkStatusChange = async (nextStatus: string) => {
    if (!selectedAccountIds.length) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiBulkUpdateAccountStatus(
        selectedAccountIds,
        nextStatus === "active",
      );
      if (!result.success) {
        return;
      }

      toast.success(result.message);
      setSelectedAccountIds([]);
      await fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to update accounts status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTransactionReport = () => {
    if (!selectedAccount) {
      return;
    }

    const params = new URLSearchParams();
    params.set("dateRange", "custom");

    if (reportDateRange?.startDate && reportDateRange?.endDate) {
      params.set("startDate", reportDateRange.startDate);
      params.set("endDate", reportDateRange.endDate);
    }

    params.set("reportBasis", "accrual");
    params.set(
      "accountName",
      String(selectedAccount.accountName || selectedAccount.name || ""),
    );
    navigate(`/reports/account_transactions?${params.toString()}`);
  };

  if (selectedAccount) {
    return (
      <>
        <ChartOfAccountsDetailView
          accountTransactions={accountTransactions}
          accounts={accounts}
          baseCurrency={baseCurrency}
          isTransactionsLoading={isTransactionsLoading}
          onClose={() => setSelectedAccount(null)}
          onDelete={handleDeleteAccount}
          onEdit={handleEditClick}
          onNewAccount={() => setIsCreateModalOpen(true)}
          onOpenTransactionReport={handleOpenTransactionReport}
          onSelectAccount={handleAccountClick}
          selectedAccount={selectedAccount}
          transactionTotals={transactionTotals}
        />

        <ChartOfAccountsAccountModal
          allAccounts={allAccounts}
          initialFormData={EMPTY_CHART_OF_ACCOUNTS_FORM_DATA}
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateAccount}
          open={isCreateModalOpen}
          submitting={isLoading}
        />

        <ChartOfAccountsAccountModal
          allAccounts={allAccounts}
          initialFormData={initialEditFormData}
          mode="edit"
          onClose={() => setEditingAccount(null)}
          onSubmit={handleSaveEdit}
          open={isEditModalOpen}
          submitting={isLoading}
        />
      </>
    );
  }

  return (
    <>
      <ChartOfAccountsListView
        accounts={accounts}
        currentPage={currentPage}
        customViews={customViews}
        isLoading={isLoading}
        itemsPerPage={itemsPerPage}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onCreateAccount={() => setIsCreateModalOpen(true)}
        onCreateCustomView={() =>
          navigate("/accountant/chart-of-accounts/new-custom-view")
        }
        onDeleteAccount={handleDeleteAccount}
        onEditAccount={handleEditClick}
        onImportAccounts={() => navigate("/accountant/chart-of-accounts/import")}
        onOpenExportCurrentView={() => setIsExportCurrentViewModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenFindAccountants={() => setIsFindAccountantsOpen(true)}
        onOpenNewTemplateModal={() => setIsNewTemplateModalOpen(true)}
        onSelectAccount={handleAccountClick}
        onViewChange={handleViewSelection}
        searchTerm={searchTerm}
        selectedAccountIds={selectedAccountIds}
        selectedCustomView={selectedCustomView}
        selectedSortBy={selectedSortBy}
        selectedView={selectedView}
        setCurrentPage={setCurrentPage}
        setItemsPerPage={setItemsPerPage}
        setSearchTerm={setSearchTerm}
        setSelectedAccountIds={setSelectedAccountIds}
        setSelectedSortBy={setSelectedSortBy}
        setSortOrder={setSortOrder}
        sortOrder={sortOrder}
        totalPages={totalPages}
        totalRecords={totalRecords}
      />

      <ChartOfAccountsAccountModal
        allAccounts={allAccounts}
        initialFormData={EMPTY_CHART_OF_ACCOUNTS_FORM_DATA}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAccount}
        open={isCreateModalOpen}
        submitting={isLoading}
      />

      <ChartOfAccountsAccountModal
        allAccounts={allAccounts}
        initialFormData={initialEditFormData}
        mode="edit"
        onClose={() => setEditingAccount(null)}
        onSubmit={handleSaveEdit}
        open={isEditModalOpen}
        submitting={isLoading}
      />

      <ChartOfAccountsFindAccountantsSidebar
        onClose={() => setIsFindAccountantsOpen(false)}
        open={isFindAccountantsOpen}
      />

      <ChartOfAccountsExportModals
        isExportCurrentViewModalOpen={isExportCurrentViewModalOpen}
        isExportModalOpen={isExportModalOpen}
        isNewTemplateModalOpen={isNewTemplateModalOpen}
        onCloseExportCurrentViewModal={() => setIsExportCurrentViewModalOpen(false)}
        onCloseExportModal={() => setIsExportModalOpen(false)}
        onCloseNewTemplateModal={() => setIsNewTemplateModalOpen(false)}
        onOpenNewTemplateModal={() => setIsNewTemplateModalOpen(true)}
        selectedViewLabel={selectedViewLabel}
      />
    </>
  );
}

export default ChartOfAccounts;
