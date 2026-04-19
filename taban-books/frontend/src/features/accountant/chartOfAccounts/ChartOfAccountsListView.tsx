import React, { useMemo, useState } from "react";
import { ArrowUpDown, Download, Plus, Search, Upload, Users, X } from "lucide-react";

import { applyChartOfAccountsCustomViewCriteria } from "../chartOfAccountsUtils";
import type {
  ChartOfAccountsAccount,
  ChartOfAccountsCustomView,
} from "../chartOfAccountsTypes";

const VIEW_OPTIONS = [
  "All Accounts",
  "Active Accounts",
  "Inactive Accounts",
  "Asset Accounts",
  "Liability Accounts",
  "Equity Accounts",
  "Income Accounts",
  "Expense Accounts",
];

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#334155",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

interface ChartOfAccountsListViewProps {
  accounts: ChartOfAccountsAccount[];
  currentPage: number;
  customViews: ChartOfAccountsCustomView[];
  isLoading: boolean;
  itemsPerPage: number;
  onBulkDelete: () => void;
  onBulkStatusChange: (nextStatus: string) => void;
  onCreateAccount: () => void;
  onCreateCustomView: () => void;
  onDeleteAccount: (account: ChartOfAccountsAccount) => void;
  onEditAccount: (account: ChartOfAccountsAccount) => void;
  onImportAccounts: () => void;
  onOpenExportCurrentView: () => void;
  onOpenExportModal: () => void;
  onOpenFindAccountants: () => void;
  onOpenNewTemplateModal: () => void;
  onSelectAccount: (account: ChartOfAccountsAccount) => void;
  onViewChange: (value: string) => void;
  searchTerm: string;
  selectedAccountIds: string[];
  selectedCustomView: ChartOfAccountsCustomView | null;
  selectedSortBy: string;
  selectedView: string;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedSortBy: React.Dispatch<React.SetStateAction<string>>;
  setSortOrder: React.Dispatch<React.SetStateAction<string>>;
  sortOrder: string;
  totalPages: number;
  totalRecords: number;
}

export function ChartOfAccountsListView(props: ChartOfAccountsListViewProps) {
  const {
    accounts,
    currentPage,
    customViews,
    isLoading,
    itemsPerPage,
    onBulkDelete,
    onBulkStatusChange,
    onCreateAccount,
    onCreateCustomView,
    onDeleteAccount,
    onEditAccount,
    onImportAccounts,
    onOpenExportCurrentView,
    onOpenExportModal,
    onOpenFindAccountants,
    onOpenNewTemplateModal,
    onSelectAccount,
    onViewChange,
    searchTerm,
    selectedAccountIds,
    selectedCustomView,
    selectedSortBy,
    selectedView,
    setCurrentPage,
    setItemsPerPage,
    setSearchTerm,
    setSelectedAccountIds,
    setSelectedSortBy,
    setSortOrder,
    sortOrder,
    totalPages,
    totalRecords,
  } = props;

  const [nameFilter, setNameFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const displayAccounts = useMemo(() => {
    let nextAccounts = selectedCustomView
      ? applyChartOfAccountsCustomViewCriteria([...accounts], selectedCustomView)
      : [...accounts];

    if (nameFilter.trim()) {
      nextAccounts = nextAccounts.filter((account) =>
        String(account.name || account.accountName || "")
          .toLowerCase()
          .includes(nameFilter.trim().toLowerCase()),
      );
    }

    if (codeFilter.trim()) {
      nextAccounts = nextAccounts.filter((account) =>
        String(account.code || account.accountCode || "")
          .toLowerCase()
          .includes(codeFilter.trim().toLowerCase()),
      );
    }

    if (typeFilter.trim()) {
      nextAccounts = nextAccounts.filter((account) =>
        String(account.type || account.accountType || "")
          .toLowerCase()
          .includes(typeFilter.trim().toLowerCase()),
      );
    }

    return nextAccounts;
  }, [accounts, codeFilter, nameFilter, selectedCustomView, typeFilter]);

  const allVisibleSelected =
    displayAccounts.length > 0 &&
    displayAccounts.every((account) =>
      selectedAccountIds.includes(String(account.id || account._id || account.accountName)),
    );

  const toggleVisibleSelection = () => {
    const visibleIds = displayAccounts.map((account) =>
      String(account.id || account._id || account.accountName),
    );

    if (allVisibleSelected) {
      setSelectedAccountIds((current) =>
        current.filter((selectedId) => !visibleIds.includes(selectedId)),
      );
      return;
    }

    setSelectedAccountIds((current) => [...new Set([...current, ...visibleIds])]);
  };

  const viewValue = selectedCustomView ? `custom:${selectedCustomView.id}` : selectedView;
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = totalRecords === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalRecords);

  return (
    <div style={{ minHeight: "calc(100vh - 60px)" }}>
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "18px 20px", display: "grid", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select value={viewValue} onChange={(event) => onViewChange(event.target.value)} style={{ ...buttonStyle, minWidth: "240px", backgroundColor: "#f8fafc", color: "#0f172a" }}>
              <optgroup label="Built-in Views">
                {VIEW_OPTIONS.map((viewOption) => (
                  <option key={viewOption} value={viewOption}>
                    {viewOption}
                  </option>
                ))}
              </optgroup>
              {customViews.length > 0 && (
                <optgroup label="Custom Views">
                  {customViews.map((customView) => (
                    <option key={customView.id} value={`custom:${customView.id}`}>
                      {customView.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button type="button" onClick={onCreateCustomView} style={buttonStyle}>
              New Custom View
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={onOpenFindAccountants} style={{ ...buttonStyle, borderColor: "#fde68a", backgroundColor: "#fffbeb", color: "#b45309" }}>
              <Users size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              Find Accountants
            </button>
            <button type="button" onClick={onImportAccounts} style={buttonStyle}>
              <Upload size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              Import
            </button>
            <button type="button" onClick={onOpenExportModal} style={buttonStyle}>
              <Download size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              Export
            </button>
            <button type="button" onClick={onOpenExportCurrentView} style={buttonStyle}>
              Export Current View
            </button>
            <button type="button" onClick={onOpenNewTemplateModal} style={buttonStyle}>
              Templates
            </button>
            <button type="button" onClick={onCreateAccount} style={{ ...buttonStyle, border: "none", backgroundColor: "#156372", color: "#ffffff" }}>
              <Plus size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              New Account
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "minmax(0, 1fr) 180px auto", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search accounts"
              style={{ width: "100%", padding: "11px 12px 11px 38px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" }}
            />
          </div>
          <select value={selectedSortBy} onChange={(event) => setSelectedSortBy(event.target.value)} style={buttonStyle}>
            <option value="Account Name">Sort by Account Name</option>
            <option value="Account Code">Sort by Account Code</option>
            <option value="Account Type">Sort by Account Type</option>
          </select>
          <button type="button" onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))} style={buttonStyle}>
            <ArrowUpDown size={15} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            {sortOrder === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>
      </div>

      {selectedAccountIds.length > 0 && (
        <div style={{ marginTop: "18px", padding: "14px 18px", borderRadius: "14px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ borderRadius: "999px", backgroundColor: "#156372", color: "#ffffff", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>
              {selectedAccountIds.length}
            </span>
            <button type="button" onClick={() => onBulkStatusChange("active")} style={buttonStyle}>
              Mark Active
            </button>
            <button type="button" onClick={() => onBulkStatusChange("inactive")} style={buttonStyle}>
              Mark Inactive
            </button>
            <button type="button" onClick={onBulkDelete} style={{ ...buttonStyle, borderColor: "#fecaca", color: "#dc2626" }}>
              Delete Selected
            </button>
          </div>
          <button type="button" onClick={() => setSelectedAccountIds([])} style={{ border: "none", backgroundColor: "transparent", color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            <X size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Clear Selection
          </button>
        </div>
      )}

      <div style={{ marginTop: "18px", backgroundColor: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #e5e7eb", display: "grid", gap: "10px", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="Filter name" style={{ padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} />
          <input value={codeFilter} onChange={(event) => setCodeFilter(event.target.value)} placeholder="Filter code" style={{ padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} />
          <input value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} placeholder="Filter type" style={{ padding: "9px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }} />
          <button type="button" onClick={() => { setNameFilter(""); setCodeFilter(""); setTypeFilter(""); }} style={buttonStyle}>
            Clear Filters
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "14px 18px", textAlign: "left", width: "48px" }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", fontSize: "12px", color: "#64748b" }}>Account Name</th>
                <th style={{ padding: "14px 18px", textAlign: "left", fontSize: "12px", color: "#64748b" }}>Code</th>
                <th style={{ padding: "14px 18px", textAlign: "left", fontSize: "12px", color: "#64748b" }}>Type</th>
                <th style={{ padding: "14px 18px", textAlign: "left", fontSize: "12px", color: "#64748b" }}>Parent</th>
                <th style={{ padding: "14px 18px", textAlign: "right", fontSize: "12px", color: "#64748b" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <td key={cellIndex} style={{ padding: "16px 18px" }}>
                        <div style={{ height: "14px", width: cellIndex === 0 ? "16px" : "100%", borderRadius: "999px", backgroundColor: "#e2e8f0" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 18px", textAlign: "center", color: "#64748b" }}>
                    No accounts found. Try a different search or create a new account.
                  </td>
                </tr>
              ) : (
                displayAccounts.map((account, index) => {
                  const accountId = String(account.id || account._id || account.accountName);
                  return (
                    <tr key={accountId || index} onClick={() => onSelectAccount(account)} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc", cursor: "pointer" }}>
                      <td style={{ padding: "16px 18px" }} onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.includes(accountId)}
                          onChange={() =>
                            setSelectedAccountIds((current) =>
                              current.includes(accountId)
                                ? current.filter((selectedId) => selectedId !== accountId)
                                : [...current, accountId],
                            )
                          }
                        />
                      </td>
                      <td style={{ padding: "16px 18px", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{account.name}</td>
                      <td style={{ padding: "16px 18px", fontSize: "14px", color: "#475569" }}>{account.code || "-"}</td>
                      <td style={{ padding: "16px 18px", fontSize: "14px", color: "#475569" }}>{account.type}</td>
                      <td style={{ padding: "16px 18px", fontSize: "14px", color: "#475569" }}>{account.parent || "-"}</td>
                      <td style={{ padding: "16px 18px", textAlign: "right" }} onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => onSelectAccount(account)} style={{ ...buttonStyle, padding: "8px 10px", fontSize: "12px", marginRight: "8px" }}>View</button>
                        <button type="button" onClick={() => onEditAccount(account)} style={{ ...buttonStyle, padding: "8px 10px", fontSize: "12px", marginRight: "8px" }}>Edit</button>
                        <button type="button" onClick={() => onDeleteAccount(account)} style={{ ...buttonStyle, padding: "8px 10px", fontSize: "12px", borderColor: "#fecaca", color: "#dc2626" }}>Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <div style={{ padding: "16px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", backgroundColor: "#f8fafc" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#64748b" }}>
                Showing {startRecord} to {endRecord} of {totalRecords} accounts
              </span>
              <select value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1); }} style={buttonStyle}>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={buttonStyle}>First</button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} style={buttonStyle}>Previous</button>
              <span style={{ alignSelf: "center", fontSize: "13px", color: "#475569" }}>
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(Math.max(totalPages, 1), page + 1))} disabled={currentPage >= totalPages} style={buttonStyle}>Next</button>
              <button type="button" onClick={() => setCurrentPage(Math.max(totalPages, 1))} disabled={currentPage >= totalPages} style={buttonStyle}>Last</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
