import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";


import {
  getAccounts,
  getBaseCurrency,
  getJournals,
  bulkDeleteAccounts as apiBulkDeleteAccounts,
  bulkUpdateAccountStatus as apiBulkUpdateAccountStatus,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
} from "./accountantModel";
import { ChartOfAccountsListView } from "./chartOfAccounts/ChartOfAccountsListView";
import { ChartOfAccountsDetailView } from "./chartOfAccounts/ChartOfAccountsDetailView";
import { ChartOfAccountsAccountModal } from "./chartOfAccounts/ChartOfAccountsAccountModal";
import type { ChartOfAccountsAccount as Account, ChartOfAccountsFormData } from "./chartOfAccountsTypes";
import { mapChartOfAccountsResponse } from "./chartOfAccountsUtils";
import { normalizeAccountTypeValue } from "./chartOfAccountsConfig";
import { useChartOfAccountsData } from "./useChartOfAccountsData";

const EMPTY_FORM_DATA: ChartOfAccountsFormData = {
  accountType: "",
  accountName: "",
  accountCode: "",
  description: "",
  addToWatchlist: false,
  isSubAccount: false,
  parentAccountId: "",
};

export default function ChartOfAccounts() {
  const navigate = useNavigate();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedView, setSelectedView] = useState("All Accounts");
  const [selectedSortBy, setSelectedSortBy] = useState("Account Name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedCustomView, setSelectedCustomView] = useState<any>(null);
  const [customViews] = useState<any[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] =
    useState(false);
  const [isFindAccountantsOpen, setIsFindAccountantsOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

  const {
    accountTransactions,
    accounts,
    allAccounts,
    baseCurrency,
    fetchAccounts,
    isLoading,
    isTransactionsLoading,
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

  const isEditModalOpen = !!editingAccount;

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
  };

  const handleEditClick = (account: Account) => {
    setEditingAccount(account);
  };

  const handleViewSelection = (view: string) => {
    setSelectedView(view);
    setCurrentPage(1);
  };

  const handleSaveNew = async (formData: any) => {
    setIsLoading(true);

    try {
      const newAccount = await apiUpdateAccount("", {
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

  const handleSaveEdit = async (formData: any) => {
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

  const handleBulkStatusChange = async (nextStatus: string, targetIds?: string[]) => {
    const idsToUpdate = targetIds || selectedAccountIds;
    if (!idsToUpdate.length) {
      return;
    }

    setIsLoading(true);

    try {
      // Strict ID check to avoid sending names or invalid identifiers
      const validIds = idsToUpdate.filter(id => id && id.length >= 12); // Assuming MongoDB IDs or similar
      
      if (validIds.length === 0) {
        toast.error("Invalid account IDs selected");
        return;
      }

      const result = await apiBulkUpdateAccountStatus(
        validIds,
        nextStatus === "active",
      );

      if (result.success) {
        // Parse the message to get the actual number of updated accounts if possible
        const updatedCount = result.updatedCount || (result.message?.match(/(\d+) accounts updated/)?.[1]) || validIds.length;
        const statusText = nextStatus === "active" ? "Active" : "Inactive";
        
        if (result.message && (result.message.includes("protected") || result.message.includes("0 accounts updated"))) {
          toast.success(result.message, { icon: '🛡️', duration: 4000 });
        } else {
          toast.success(`${updatedCount} ${Number(updatedCount) === 1 ? 'account' : 'accounts'} marked as ${statusText}`);
        }

        if (!targetIds) {
          setSelectedAccountIds([]);
        }
        await fetchAccounts();
      } else {
        toast.error(result.message || "Failed to update accounts status");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during status update");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTransactionReport = () => {
    if (!selectedAccount) return;
    navigate(`/accountant/reports/account-transactions?accountId=${selectedAccount.id || selectedAccount._id}`);
  };

  const initialEditFormData = useMemo(() => {
    if (!editingAccount) return null;
    return {
      accountType: editingAccount.type || editingAccount.accountType || "",
      accountName: editingAccount.name || editingAccount.accountName || "",
      accountCode: editingAccount.code || editingAccount.accountCode || "",
      description: editingAccount.description || "",
      addToWatchlist: editingAccount.showInWatchlist || editingAccount.addToWatchlist || false,
      isSubAccount: !!editingAccount.parent,
      parentAccountId: editingAccount.parentAccountId || "",
    };
  }, [editingAccount]);

  if (selectedAccount) {
    return (
      <>
        <ChartOfAccountsDetailView
          accountTransactions={accountTransactions}
          accounts={allAccounts}
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
          initialFormData={EMPTY_FORM_DATA}
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleSaveNew}
          open={isCreateModalOpen}
          submitting={isLoading}
        />

        <ChartOfAccountsAccountModal
          allAccounts={allAccounts}
          initialFormData={initialEditFormData || EMPTY_FORM_DATA}
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
        initialFormData={EMPTY_FORM_DATA}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleSaveNew}
        open={isCreateModalOpen}
        submitting={isLoading}
      />

      <ChartOfAccountsAccountModal
        allAccounts={allAccounts}
        initialFormData={initialEditFormData || EMPTY_FORM_DATA}
        mode="edit"
        onClose={() => setEditingAccount(null)}
        onSubmit={handleSaveEdit}
        open={isEditModalOpen}
        submitting={isLoading}
      />
    </>
  );
}
