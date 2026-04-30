import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";

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

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  minHeight: "42px",
  borderRadius: "10px",
  border: "1px solid #d6dbe7",
  padding: "0 14px",
  fontSize: "14px",
  color: "#1f2937",
  backgroundColor: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const ghostIconButtonStyle: React.CSSProperties = {
  width: "38px",
  height: "38px",
  border: "1px solid #d8dce7",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#4b5563",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const dropdownItemStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  backgroundColor: "transparent",
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "14px",
  color: "#334155",
  cursor: "pointer",
};

const columnHeaderButtonStyle: React.CSSProperties = {
  border: "none",
  backgroundColor: "transparent",
  padding: 0,
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

interface ChartOfAccountsListViewProps {
  accounts: ChartOfAccountsAccount[];
  currentPage: number;
  customViews: ChartOfAccountsCustomView[];
  isLoading: boolean;
  itemsPerPage: number;
  onBulkDelete: () => void;
  onBulkStatusChange: (nextStatus: string, targetIds?: string[]) => void;
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const topMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isTopMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!topMenuRef.current?.contains(event.target as Node)) {
        setIsTopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isTopMenuOpen]);

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

  const visibleAccountsCount = displayAccounts.length;
  const hasLocalFilters = Boolean(nameFilter || codeFilter || typeFilter || selectedCustomView);

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

  const clearLocalFilters = () => {
    setNameFilter("");
    setCodeFilter("");
    setTypeFilter("");
  };

  const handleSortSelection = (field: string) => {
    if (selectedSortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSelectedSortBy(field);
    setSortOrder("asc");
  };

  const summaryText = hasLocalFilters
    ? `Showing ${visibleAccountsCount} filtered account${visibleAccountsCount === 1 ? "" : "s"}`
    : `Showing ${visibleAccountsCount} of ${totalRecords} account${totalRecords === 1 ? "" : "s"}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 28px",
          borderBottom: "1px solid #e8ecf2",
        }}
      >
        <div style={{ position: "relative" }} ref={topMenuRef}>
          <button
            type="button"
            onClick={() => setIsTopMenuOpen((current) => !current)}
            style={{
              border: "none",
              backgroundColor: "transparent",
              fontSize: "19px",
              fontWeight: 800,
              color: "#000000",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: 0,
            }}
          >
            {selectedCustomView ? selectedCustomView.name : selectedView}
            <ChevronDown size={20} color="#000000" />
          </button>

          {isTopMenuOpen ? (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "12px",
                width: "280px",
                backgroundColor: "#ffffff",
                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                borderRadius: "12px",
                padding: "10px 0",
                zIndex: 100,
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "6px 16px",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Views
              </div>
              {VIEW_OPTIONS.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => {
                    onViewChange(view);
                    setIsTopMenuOpen(false);
                  }}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor: selectedView === view ? "#f1f5f9" : "transparent",
                    fontWeight: selectedView === view ? 700 : 500,
                  }}
                >
                  {view}
                </button>
              ))}

              <div
                style={{
                  margin: "8px 0",
                  height: "1px",
                  backgroundColor: "#f1f5f9",
                }}
              />

              <button
                type="button"
                onClick={() => {
                  onCreateCustomView();
                  setIsTopMenuOpen(false);
                }}
                style={{
                  ...dropdownItemStyle,
                  color: "#3b82f6",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Plus size={16} /> New Custom View
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={onCreateAccount}
            style={{
              backgroundColor: "#156372",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "0 18px",
              height: "40px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 6px rgba(21, 99, 114, 0.2)",
            }}
          >
            <Plus size={18} strokeWidth={3} /> New Account
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              style={ghostIconButtonStyle}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Area */}
      {isFiltersOpen && (
        <div
          style={{
            padding: "20px 28px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e8ecf2",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
          }}
        >
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px", display: "block" }}>ACCOUNT NAME</label>
            <input
              type="text"
              placeholder="Search by name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px", display: "block" }}>ACCOUNT CODE</label>
            <input
              type="text"
              placeholder="Search by code"
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px", display: "block" }}>ACCOUNT TYPE</label>
            <input
              type="text"
              placeholder="Search by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <button
              onClick={clearLocalFilters}
              style={{
                ...INPUT_STYLE,
                backgroundColor: "#f1f5f9",
                border: "none",
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Selection Info Bar */}
      {selectedAccountIds.length > 0 ? (
        <div
          style={{
            padding: "12px 28px",
            backgroundColor: "#f0f9ff",
            borderBottom: "1px solid #bae6fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0369a1" }}>
              {selectedAccountIds.length} account{selectedAccountIds.length === 1 ? "" : "s"} selected
            </span>
            <div style={{ height: "16px", width: "1px", backgroundColor: "#bae6fd" }} />
            <button
              onClick={() => onBulkStatusChange("active")}
              style={{ background: "none", border: "none", color: "#0369a1", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              Mark as Active
            </button>
            <button
              onClick={() => onBulkStatusChange("inactive")}
              style={{ background: "none", border: "none", color: "#0369a1", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              Mark as Inactive
            </button>
            <button
              onClick={onBulkDelete}
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelectedAccountIds([])}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <X size={14} /> Clear selection
          </button>
        </div>
      ) : null}

      {/* Table Area */}
      <div style={{ flex: 1, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "1000px" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "#fafbfe",
                borderBottom: "1px solid #e7eaf1",
              }}
            >
              <th style={{ width: "62px", padding: "14px 20px", textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                />
              </th>
              <th style={{ width: "25%", padding: "14px 18px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => handleSortSelection("Account Name")}
                  style={columnHeaderButtonStyle}
                >
                  Account Name
                  {selectedSortBy === "Account Name" ? (
                    <ArrowUpDown size={13} color="#156372" />
                  ) : <ArrowUpDown size={13} color="#94a3b8" />}
                </button>
              </th>
              <th style={{ width: "15%", padding: "14px 18px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => handleSortSelection("Account Code")}
                  style={columnHeaderButtonStyle}
                >
                  Account Code
                  {selectedSortBy === "Account Code" ? (
                    <ArrowUpDown size={13} color="#156372" />
                  ) : <ArrowUpDown size={13} color="#94a3b8" />}
                </button>
              </th>
              <th style={{ width: "20%", padding: "14px 18px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => handleSortSelection("Account Type")}
                  style={columnHeaderButtonStyle}
                >
                  Account Type
                  {selectedSortBy === "Account Type" ? (
                    <ArrowUpDown size={13} color="#156372" />
                  ) : <ArrowUpDown size={13} color="#94a3b8" />}
                </button>
              </th>
              <th
                style={{
                  width: "15%",
                  padding: "14px 18px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                }}
              >
                Status
              </th>
              <th
                style={{
                  width: "15%",
                  padding: "14px 18px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                }}
              >
                Parent Account
              </th>
              <th style={{ width: "80px", padding: "14px 18px", textAlign: "right" }}>
                <Settings2 size={16} color="#6b7280" />
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={`skeleton-${index}`} style={{ borderBottom: "1px solid #edf1f6" }}>
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <td key={cellIndex} style={{ padding: "18px 20px" }}>
                      <div
                        style={{
                          height: "14px",
                          width: "100%",
                          borderRadius: "999px",
                          backgroundColor: "#e8ecf4",
                          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayAccounts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "100px 18px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  No accounts found. Try adjusting your filters.
                </td>
              </tr>
            ) : (
              displayAccounts.map((account, index) => {
                const accountId = String(account.id || account._id || account.accountName);
                const isSelected = selectedAccountIds.includes(accountId);

                return (
                  <tr
                    key={accountId || index}
                    onClick={() => onSelectAccount(account)}
                    onMouseEnter={() => setHoveredRowId(accountId)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    style={{
                      borderBottom: "1px solid #edf1f6",
                      backgroundColor: isSelected
                        ? "#f0f9ff"
                        : hoveredRowId === accountId
                          ? "#f8fafc"
                          : "#ffffff",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td
                      style={{ padding: "16px 20px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedAccountIds((current) =>
                            current.includes(accountId)
                              ? current.filter((id) => id !== accountId)
                              : [...current, accountId],
                          )
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      />
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{account.name}</div>
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: "14px", color: "#64748b" }}>
                      {account.code}
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: "14px", color: "#1e293b" }}>
                      {account.type}
                    </td>
                    <td style={{ padding: "16px 18px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 700,
                          backgroundColor: account.isActive ? "#ecfdf5" : "#fef2f2",
                          color: account.isActive ? "#10b981" : "#ef4444",
                        }}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: "14px", color: "#64748b" }}>
                      {account.parent || "-"}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", opacity: hoveredRowId === accountId ? 1 : 0, transition: "opacity 0.2s" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditAccount(account); }}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <Settings2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && (
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid #e8ecf2",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>{summaryText}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                ...INPUT_STYLE,
                width: "auto",
                minWidth: "120px",
                height: "36px",
                minHeight: "36px",
                cursor: "pointer",
              }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                ...ghostIconButtonStyle,
                width: "auto",
                padding: "0 14px",
                height: "36px",
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", margin: "0 8px" }}>
              Page {currentPage} of {Math.max(totalPages, 1)}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                ...ghostIconButtonStyle,
                width: "auto",
                padding: "0 14px",
                height: "36px",
                opacity: currentPage >= totalPages ? 0.5 : 1,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
