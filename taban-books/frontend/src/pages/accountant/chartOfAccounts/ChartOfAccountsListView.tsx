import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
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
  const selectedViewValue = selectedCustomView ? `custom:${selectedCustomView.id}` : selectedView;

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
        minHeight: "calc(100vh - 60px)",
        backgroundColor: "#ffffff",
        border: "1px solid #e6e9f0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "22px 28px",
          borderBottom: "1px solid #ebeef5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative" }}>
          <select
            value={selectedViewValue}
            onChange={(event) => onViewChange(event.target.value)}
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#202632",
              fontSize: "27px",
              fontWeight: 700,
              padding: "0 32px 0 0",
              appearance: "none",
              outline: "none",
              cursor: "pointer",
              lineHeight: 1.2,
            }}
          >
            <optgroup label="Built-in Views">
              {VIEW_OPTIONS.map((viewOption) => (
                <option key={viewOption} value={viewOption}>
                  {viewOption}
                </option>
              ))}
            </optgroup>
            {customViews.length > 0 ? (
              <optgroup label="Custom Views">
                {customViews.map((customView) => (
                  <option key={customView.id} value={`custom:${customView.id}`}>
                    {customView.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <ChevronDown
            size={20}
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-42%)",
              color: "#3b82f6",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onOpenFindAccountants}
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#3d6fe5",
              fontSize: "16px",
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: 0,
            }}
          >
            <Users size={17} />
            Find Accountants
          </button>

          <button
            type="button"
            onClick={onCreateAccount}
            style={{
              border: "none",
              borderRadius: "10px",
              backgroundColor: "#55b776",
              color: "#ffffff",
              padding: "12px 18px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Plus size={20} />
            New
          </button>

          <div ref={topMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-expanded={isTopMenuOpen}
              onClick={() => setIsTopMenuOpen((current) => !current)}
              style={ghostIconButtonStyle}
            >
              <MoreHorizontal size={18} />
            </button>

            {isTopMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "220px",
                  borderRadius: "12px",
                  border: "1px solid #e3e7ef",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.12)",
                  overflow: "hidden",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsTopMenuOpen(false);
                    onImportAccounts();
                  }}
                  style={dropdownItemStyle}
                >
                  Import accounts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTopMenuOpen(false);
                    onOpenExportModal();
                  }}
                  style={dropdownItemStyle}
                >
                  Export all accounts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTopMenuOpen(false);
                    onOpenExportCurrentView();
                  }}
                  style={dropdownItemStyle}
                >
                  Export current view
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTopMenuOpen(false);
                    onCreateCustomView();
                  }}
                  style={dropdownItemStyle}
                >
                  New custom view
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTopMenuOpen(false);
                    onOpenNewTemplateModal();
                  }}
                  style={dropdownItemStyle}
                >
                  Templates
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isSearchOpen || isFiltersOpen ? (
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid #ebeef5",
            backgroundColor: "#fbfcfe",
            display: "grid",
            gap: "14px",
          }}
        >
          {isSearchOpen ? (
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search accounts"
                style={{
                  ...INPUT_STYLE,
                  paddingLeft: "40px",
                }}
              />
            </div>
          ) : null}

          {isFiltersOpen ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <input
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Filter account name"
                style={INPUT_STYLE}
              />
              <input
                value={codeFilter}
                onChange={(event) => setCodeFilter(event.target.value)}
                placeholder="Filter account code"
                style={INPUT_STYLE}
              />
              <input
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                placeholder="Filter account type"
                style={INPUT_STYLE}
              />
              <select
                value={selectedSortBy}
                onChange={(event) => setSelectedSortBy(event.target.value)}
                style={INPUT_STYLE}
              >
                <option value="Account Name">Sort by Account Name</option>
                <option value="Account Code">Sort by Account Code</option>
                <option value="Account Type">Sort by Account Type</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
                }
                style={{
                  ...INPUT_STYLE,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <ArrowUpDown size={16} />
                {sortOrder === "asc" ? "Ascending" : "Descending"}
              </button>
              <button
                type="button"
                onClick={clearLocalFilters}
                style={{
                  ...INPUT_STYLE,
                  cursor: "pointer",
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedAccountIds.length > 0 ? (
        <div
          style={{
            padding: "14px 28px",
            borderBottom: "1px solid #e6ebf3",
            backgroundColor: "#f8fbff",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                minWidth: "32px",
                height: "32px",
                borderRadius: "999px",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {selectedAccountIds.length}
            </span>
            <button
              type="button"
              onClick={() => onBulkStatusChange("active")}
              style={{ ...INPUT_STYLE, width: "auto", padding: "0 14px", cursor: "pointer" }}
            >
              Mark active
            </button>
            <button
              type="button"
              onClick={() => onBulkStatusChange("inactive")}
              style={{ ...INPUT_STYLE, width: "auto", padding: "0 14px", cursor: "pointer" }}
            >
              Mark inactive
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              style={{
                ...INPUT_STYLE,
                width: "auto",
                padding: "0 14px",
                cursor: "pointer",
                color: "#dc2626",
                borderColor: "#fecaca",
              }}
            >
              Delete selected
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedAccountIds([])}
            style={{
              border: "none",
              backgroundColor: "transparent",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <X size={14} />
            Clear selection
          </button>
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "#fafbfe",
                borderBottom: "1px solid #e7eaf1",
              }}
            >
              <th style={{ width: "62px", padding: "14px 20px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => setIsFiltersOpen((current) => !current)}
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#4c83f4",
                    padding: 0,
                    display: "inline-flex",
                    cursor: "pointer",
                  }}
                >
                  <Settings2 size={18} />
                </button>
              </th>
              <th style={{ width: "28%", padding: "14px 18px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => handleSortSelection("Account Name")}
                  style={columnHeaderButtonStyle}
                >
                  Account Name
                  {selectedSortBy === "Account Name" ? (
                    <ArrowUpDown size={13} color="#4c83f4" />
                  ) : null}
                </button>
              </th>
              <th style={{ width: "19%", padding: "14px 18px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => handleSortSelection("Account Code")}
                  style={columnHeaderButtonStyle}
                >
                  Account Code
                  {selectedSortBy === "Account Code" ? (
                    <ArrowUpDown size={13} color="#4c83f4" />
                  ) : null}
                </button>
              </th>
              <th style={{ width: "21%", padding: "14px 18px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => handleSortSelection("Account Type")}
                  style={columnHeaderButtonStyle}
                >
                  Account Type
                  <ArrowUpDown
                    size={13}
                    color={selectedSortBy === "Account Type" ? "#4c83f4" : "#94a3b8"}
                  />
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
                Documents
              </th>
              <th
                style={{
                  width: "17%",
                  padding: "14px 18px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                }}
              >
                Parent Account Name
              </th>
              <th style={{ width: "60px", padding: "14px 18px", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((current) => !current)}
                  style={{
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#6b7280",
                    padding: 0,
                    display: "inline-flex",
                    cursor: "pointer",
                  }}
                >
                  <Search size={16} />
                </button>
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
                          width: cellIndex === 0 ? "18px" : "100%",
                          borderRadius: "999px",
                          backgroundColor: "#e8ecf4",
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
                    padding: "56px 18px",
                    textAlign: "center",
                    color: "#667085",
                    fontSize: "14px",
                  }}
                >
                  No accounts found. Try a different filter or create a new account.
                </td>
              </tr>
            ) : (
              displayAccounts.map((account, index) => {
                const accountId = String(account.id || account._id || account.accountName);
                const accountName = account.name || account.accountName || "";
                const accountCode = account.code || account.accountCode || "";
                const accountType = account.type || account.accountType || "";
                const parentAccountName =
                  account.parent ||
                  account.parentAccount?.accountName ||
                  account.parentAccount?.name ||
                  "";
                const documentsCount = Array.isArray(account.documents)
                  ? account.documents.length
                  : 0;
                const isSelected = selectedAccountIds.includes(accountId);
                const showTrailingIcon = hoveredRowId === accountId || isSelected;

                return (
                  <tr
                    key={accountId || index}
                    onClick={() => onSelectAccount(account)}
                    onMouseEnter={() => setHoveredRowId(accountId)}
                    onMouseLeave={() => setHoveredRowId((current) => (current === accountId ? null : current))}
                    style={{
                      borderBottom: "1px solid #edf1f6",
                      backgroundColor: isSelected
                        ? "#f4f6fb"
                        : hoveredRowId === accountId
                          ? "#fafbff"
                          : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <td
                      style={{ padding: "18px 20px", textAlign: "left" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedAccountIds((current) =>
                            current.includes(accountId)
                              ? current.filter((selectedId) => selectedId !== accountId)
                              : [...current, accountId],
                          )
                        }
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "6px",
                          accentColor: "#97a0b2",
                          cursor: "pointer",
                        }}
                      />
                    </td>

                    <td
                      style={{
                        padding: "18px 18px",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "#3f74e5",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {accountName}
                    </td>

                    <td
                      style={{
                        padding: "18px 18px",
                        fontSize: "15px",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {accountCode}
                    </td>

                    <td
                      style={{
                        padding: "18px 18px",
                        fontSize: "16px",
                        color: "#111827",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {accountType}
                    </td>

                    <td
                      style={{
                        padding: "18px 18px",
                        fontSize: "15px",
                        color: "#64748b",
                      }}
                    >
                      {documentsCount > 0 ? documentsCount : ""}
                    </td>

                    <td
                      style={{
                        padding: "18px 18px",
                        fontSize: "15px",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {parentAccountName}
                    </td>

                    <td
                      style={{ padding: "18px 18px", textAlign: "right" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {showTrailingIcon ? (
                        <button
                          type="button"
                          onClick={() => onEditAccount(account)}
                          title="Edit account"
                          style={{
                            border: "none",
                            backgroundColor: "transparent",
                            color: "#8b95ab",
                            padding: 0,
                            display: "inline-flex",
                            cursor: "pointer",
                          }}
                        >
                          <Settings2 size={18} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading ? (
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid #e8ecf2",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", color: "#667085" }}>{summaryText}</span>
            <select
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
              style={{
                ...INPUT_STYLE,
                width: "auto",
                minWidth: "124px",
                cursor: "pointer",
              }}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={toggleVisibleSelection}
              style={{
                ...INPUT_STYLE,
                width: "auto",
                padding: "0 14px",
                cursor: "pointer",
              }}
            >
              {allVisibleSelected ? "Unselect visible" : "Select visible"}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              style={{
                ...INPUT_STYLE,
                width: "auto",
                padding: "0 14px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.55 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: "13px", color: "#667085" }}>
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(Math.max(totalPages, 1), page + 1))
              }
              disabled={currentPage >= totalPages}
              style={{
                ...INPUT_STYLE,
                width: "auto",
                padding: "0 14px",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                opacity: currentPage >= totalPages ? 0.55 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
