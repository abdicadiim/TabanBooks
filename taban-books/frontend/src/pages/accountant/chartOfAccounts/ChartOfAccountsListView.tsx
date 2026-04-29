import React, { useMemo, useState } from "react";
import { ArrowUpDown, Download, Plus, Search, Upload, Users, X, MoreHorizontal, ChevronRight } from "lucide-react";

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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);

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

  const [openMenuAccountId, setOpenMenuAccountId] = useState<string | null>(null);
  const viewValue = selectedCustomView ? `custom:${selectedCustomView.id}` : selectedView;
  const selectedViewLabel = selectedCustomView?.name || selectedView;
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = totalRecords === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalRecords);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Matching target image */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 min-h-[57px]">
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-base font-bold text-slate-900 hover:text-blue-600 transition-colors">
              {selectedViewLabel}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {/* Dropdown Menu - Simplified implementation */}
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] py-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Views</div>
              {VIEW_OPTIONS.map((viewOption) => (
                <button
                  key={viewOption}
                  onClick={() => onViewChange(viewOption)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${selectedView === viewOption ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-600'}`}
                >
                  {viewOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateAccount}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#156372] hover:bg-[#0d4d59] text-white text-[13px] font-semibold rounded transition-colors shadow-sm"
            >
              <Plus size={16} strokeWidth={3} />
              New
            </button>
            <div className="relative">
              <button 
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`p-1.5 border border-gray-200 rounded text-slate-600 hover:bg-slate-50 transition-colors ${moreMenuOpen ? 'bg-slate-50' : 'bg-white'}`}
              >
                <MoreHorizontal size={18} />
              </button>

              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[120]" onClick={() => { setMoreMenuOpen(false); setSortSubMenuOpen(false); setExportSubMenuOpen(false); }} />
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-100 rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] z-[130] py-1.5 text-left ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* Sort By Item */}
                    <div className="relative group">
                      <button 
                        onMouseEnter={() => { setSortSubMenuOpen(true); setExportSubMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] flex items-center justify-between transition-all ${sortSubMenuOpen ? 'bg-slate-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={sortSubMenuOpen ? 'text-blue-600' : 'text-slate-400'}><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                          Sort by
                        </div>
                        <ChevronRight size={14} className={sortSubMenuOpen ? 'text-blue-600' : 'text-slate-400'} />
                      </button>

                      {sortSubMenuOpen && (
                        <div className="absolute right-full mr-1 top-0 w-48 bg-white border border-gray-100 rounded-lg shadow-xl py-1.5 animate-in slide-in-from-right-1 duration-150">
                          {["Account Name", "Account Code", "Account Type"].map(option => (
                            <button
                              key={option}
                              onClick={() => {
                                onSortChange(option);
                                setMoreMenuOpen(false);
                                setSortSubMenuOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-[13px] text-left flex items-center justify-between group/sort transition-all ${selectedSortBy === option ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                              {option}
                              {selectedSortBy === option && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="m5 12 5 5L20 7"/></svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button className="w-full px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3 group/item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/item:text-slate-600 transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Import Chart of Accounts
                    </button>

                    {/* Export Item */}
                    <div className="relative">
                      <button 
                        onMouseEnter={() => { setExportSubMenuOpen(true); setSortSubMenuOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] flex items-center justify-between transition-all ${exportSubMenuOpen ? 'bg-slate-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={exportSubMenuOpen ? 'text-blue-600' : 'text-slate-400'}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          Export
                        </div>
                        <ChevronRight size={14} className={exportSubMenuOpen ? 'text-blue-600' : 'text-slate-400'} />
                      </button>

                      {exportSubMenuOpen && (
                        <div className="absolute right-full mr-1 top-0 w-48 bg-white border border-gray-100 rounded-lg shadow-xl py-1.5 animate-in slide-in-from-right-1 duration-150">
                          <button className="w-full px-4 py-2 text-[13px] text-left text-slate-700 hover:bg-slate-50 transition-all">
                            Export Chart of Accounts
                          </button>
                          <button className="w-full px-4 py-2 text-[13px] text-left text-slate-700 hover:bg-slate-50 transition-all">
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar (Only visible when selected) */}
      {selectedAccountIds.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between animate-in slide-in-from-top-1 duration-200 h-[52px]">
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pr-4 border-r border-gray-100">
                <button 
                  onClick={() => onBulkStatusChange("active")} 
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded bg-white text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 group-hover:scale-110 transition-transform"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Mark as Active
                </button>
                <button 
                  onClick={() => onBulkStatusChange("inactive")} 
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded bg-white text-[11px] font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all shadow-sm group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 group-hover:scale-110 transition-transform"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Mark as Inactive
                </button>
                <button 
                  onClick={onBulkDelete} 
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-white transition-colors"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2-1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  Delete
                </button>
              </div>
             
             <div className="flex items-center gap-2.5 ml-1">
               <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e0f2fe] text-[10px] font-bold text-[#0369a1]">
                 {selectedAccountIds.length}
               </span>
               <span className="text-[13px] font-medium text-slate-600">Selected</span>
             </div>
          </div>
          
          <button 
            onClick={() => setSelectedAccountIds([])} 
            className="flex items-center gap-2 group transition-all"
          >
            <span className="text-[11px] text-slate-400 group-hover:text-slate-600">Esc</span>
            <div className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-50 transition-colors">
              <X size={14} className="text-rose-500" />
            </div>
          </button>
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#fcfcfc] border-b border-gray-100 sticky top-0 z-10">
            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-12 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
              </th>
              <th className="px-4 py-3 min-w-[200px]">Account Name</th>
              <th className="px-4 py-3">Account Code</th>
              <th className="px-4 py-3">Account Type</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Parent Account Name</th>
              <th className="px-4 py-3 w-10">
                <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400">
                  <Search size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3 skeleton-row">
                    <div className="h-4 bg-gray-50 rounded animate-pulse w-full"></div>
                  </td>
                </tr>
              ))
            ) : displayAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-slate-400 text-sm italic">
                  No accounts found in this view.
                </td>
              </tr>
            ) : (
              displayAccounts.map((account) => {
                const accountId = String(account.id || account._id || "");
                if (!accountId) return null; // Skip accounts without a valid ID
                const isSelected = selectedAccountIds.includes(accountId);
                return (
                  <tr 
                    key={accountId} 
                    onClick={() => onSelectAccount(account)}
                    className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedAccountIds((current) =>
                            current.includes(accountId)
                              ? current.filter((id) => id !== accountId)
                              : [...current, accountId]
                          )
                        }
                        className="rounded border-gray-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                          {account.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${account.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">{account.code || "-"}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">{account.type}</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">-</td>
                    <td className="px-4 py-2.5 text-[13px] text-slate-600">{account.parent || "-"}</td>
                    <td className="px-4 py-2.5 text-right relative">
                      <div className="flex justify-end">
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuAccountId(current => current === accountId ? null : accountId);
                            }}
                            className={`p-1 rounded transition-colors ${openMenuAccountId === accountId ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>

                          {openMenuAccountId === accountId && (
                            <>
                              <div 
                                className="fixed inset-0 z-[100]" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuAccountId(null);
                                }}
                              />
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] z-[110] py-1.5 text-left overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditAccount(account);
                                    setOpenMenuAccountId(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3 group/item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/item:text-slate-600 transition-colors"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                  Edit
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onBulkStatusChange(account.isActive ? "inactive" : "active", [accountId]);
                                    setOpenMenuAccountId(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3 group/item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/item:text-slate-600 transition-colors"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                                  Mark as {account.isActive ? 'Inactive' : 'Active'}
                                </button>
                                <div className="h-[1px] bg-slate-50 my-1 mx-2" />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteAccount(account);
                                    setOpenMenuAccountId(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-3 group/item"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400 group-hover/item:text-rose-600 transition-colors"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2-1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer - matching Item List style */}
      {!isLoading && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white text-xs text-slate-500">
           <div>Showing {startRecord} to {endRecord} of {totalRecords} accounts</div>
           <div className="flex items-center gap-2">
             <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-slate-50 disabled:opacity-30">First</button>
             <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1 hover:bg-slate-50 disabled:opacity-30">Prev</button>
             <span className="px-2 py-1 bg-slate-50 rounded border border-gray-200 text-slate-700 font-medium">{currentPage}</span>
             <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-1 hover:bg-slate-50 disabled:opacity-30">Next</button>
             <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="p-1 hover:bg-slate-50 disabled:opacity-30">Last</button>
           </div>
        </div>
      )}
    </div>
  );
}
