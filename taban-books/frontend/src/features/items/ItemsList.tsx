import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  Columns,
  MoreHorizontal,
  Download,
  Upload,
  ImageIcon,
  X,
  Star,
  ChevronRight,
  FileDown,
  SlidersHorizontal,
  AlignLeft,
  Layout,
  GripVertical,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Lock,
  Settings,
  RotateCcw
} from "lucide-react";
import ExportItemsModal from "./components/modals/ExportItemsModal";
import ExportCurrentViewModal from "./components/modals/ExportCurrentViewModal";
import AdvancedSearchModal from "../../components/modals/AdvancedSearchModal";
import { accountantAPI, taxesAPI, vendorsAPI } from "../../services/api";
import { useCurrency } from "../../hooks/useCurrency";
import { useOrganizationBranding } from "../../hooks/useOrganizationBranding";

const TableRowSkeleton = ({ columns }: { columns: any[] }) => (
  <>
    {[...Array(8)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-gray-50">
        <td className="px-4 py-3 w-16">
          <div className="h-4 w-4 bg-gray-100 rounded mx-auto" />
        </td>
        {columns.map((col, idx) => (
          <td
            key={idx}
            className="px-4 py-3"
            style={{ width: col.width }}
          >
            <div className={`h-4 bg-gray-100 rounded ${idx === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </td>
        ))}
        <td className="px-4 py-3 w-12 sticky right-0 bg-white" />
      </tr>
    ))}
  </>
);

const ItemsList = ({
  items,
  initialSearchTerm = "",
  onSelect,
  onNew,
  onBulkMarkActive,
  onBulkMarkInactive,
  onBulkDelete,
  onBulkUpdate,
  onRefresh,
  baseCurrency,
  isLoading,
  canCreate = true,
  canEdit = true,
  canDelete = true
}: any) => {
  const navigate = useNavigate();
  const { symbol: currencySymbol } = useCurrency();
  const { accentColor } = useOrganizationBranding();

  const fmtMoney = (amount: number) => {
    const val = typeof amount === "number" ? amount : Number(amount || 0);
    return `${currencySymbol || 'AED'}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [newTransactionOpen, setNewTransactionOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [favoriteViews, setFavoriteViews] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("taban_items_favorite_views_v1");
      return saved ? JSON.parse(saved) : ["Purchases"];
    } catch {
      return ["Purchases"];
    }
  });
  const [sortKey, setSortKey] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportCurrentViewModalOpen, setIsExportCurrentViewModalOpen] = useState(false);
  const [isBulkActiveLoading, setIsBulkActiveLoading] = useState(false);
  const [isBulkInactiveLoading, setIsBulkInactiveLoading] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  interface Column {
    key: string;
    label: string;
    visible: boolean;
    pinned: boolean;
    width: number;
  }

  const DEFAULT_COLUMNS: Column[] = [
    { key: "name", label: "NAME", visible: true, pinned: true, width: 220 },
    { key: "sku", label: "SKU", visible: true, pinned: false, width: 120 },
    { key: "purchaseDescription", label: "PURCHASE DESCRIPTION", visible: true, pinned: false, width: 250 },
    { key: "purchaseRate", label: "PURCHASE RATE", visible: true, pinned: false, width: 140 },
    { key: "description", label: "DESCRIPTION", visible: true, pinned: false, width: 250 },
    { key: "rate", label: "RATE", visible: true, pinned: false, width: 120 },
    { key: "stockQuantity", label: "STOCK ON HAND", visible: true, pinned: false, width: 140 },
    { key: "unit", label: "USAGE UNIT", visible: true, pinned: false, width: 120 },
    { key: "accountName", label: "SALES ACCOUNT", visible: false, pinned: false, width: 150 },
    { key: "purchaseAccountName", label: "PURCHASE ACCOUNT", visible: false, pinned: false, width: 200 },
    { key: "preferredVendor", label: "CUSTOMER", visible: false, pinned: false, width: 180 },
    { key: "type", label: "TYPE", visible: false, pinned: false, width: 100 },
  ];

  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem("taban_items_columns_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all default columns exist in parsed data (in case of schema updates)
        return DEFAULT_COLUMNS.map(def => {
          const found = parsed.find((p: any) => p.key === def.key);
          return found ? { ...def, ...found } : def;
        });
      } catch (e) {
        return DEFAULT_COLUMNS;
      }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("taban_items_columns_v3", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem("taban_items_favorite_views_v1", JSON.stringify(favoriteViews));
  }, [favoriteViews]);

  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [dbTaxes, setDbTaxes] = useState<any[]>([]);
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const handleToggleColumn = (key: string) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const handleTogglePin = (key: string) => {
    setColumns(prev => {
      const updated = prev.map(c => c.key === key ? { ...c, pinned: !c.pinned } : c);
      // Move pinned columns to the start
      const pinned = updated.filter(c => c.pinned);
      const unpinned = updated.filter(c => !c.pinned);
      return [...pinned, ...unpinned];
    });
  };

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    setColumns(prev => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, draggedItem);
      return updated;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNewTransactionOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
        setExportSubMenuOpen(false);
        setSortSubMenuOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setSettingsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      setColumnWidth(col, Math.max(80, startWidth + delta));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []); // Needs to depend on columns to access correct widths in mouse move if needed, 
  // though we use startWidth from resizingRef. Actually columns change re-renders effect.

  const startResizing = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find(c => c.key === key);
    if (!col) return;
    resizingRef.current = {
      col: key,
      startX: e.clientX,
      startWidth: col.width
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const setColumnWidth = (key: string, width: number) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, width } : c));
  };

  const FILTER_VIEWS: Record<string, string> = {
    "All": "All",
    "Active": "Active Items",
    "Inactive": "Inactive Items",
    "Low Stock": "Low Stock",
    "Sales": "Sales",
    "Purchases": "Purchases",
    "Services": "Services",
    "Taban CRM": "Taban CRM",
    "Inventory Items": "Inventory Items",
  };

  const getFilterLabel = (view: string) => {
    if (view === "All") return "All Items";
    if (view === "Active Items") return "Active Items";
    if (view === "Inactive Items") return "Inactive Items";
    return view;
  };

  const getFilterKey = (view: string) => {
    if (view === "Active") return "Active Items";
    if (view === "Inactive") return "Inactive Items";
    return view;
  };

  const SORT_OPTIONS: { label: string; key: string }[] = [
    { label: "Name", key: "name" },
    { label: "SKU", key: "sku" },
    { label: "Purchase Rate", key: "purchaseRate" },
    { label: "Rate", key: "rate" },
    { label: "Stock On Hand", key: "stockOnHand" },
    { label: "Last Modified Time", key: "updatedAt" },
    { label: "Created Time", key: "createdAt" },
  ];

  const sortOptionMap = SORT_OPTIONS.reduce<Record<string, string>>((acc, option) => {
    acc[option.label] = option.key;
    return acc;
  }, {});

  const sortLabelByKey = SORT_OPTIONS.reduce<Record<string, string>>((acc, option) => {
    acc[option.key] = option.label;
    return acc;
  }, {});

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const toggleFavoriteView = (view: string) => {
    const key = getFilterKey(view);
    setFavoriteViews(prev =>
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    );
  };

  const viewOptions = [
    "All", "Active", "Low Stock", "Inactive", "Sales", "Purchases", "Services", "Taban CRM", "Inventory Items"
  ];
  const sortedViewOptions = [
    ...viewOptions.filter(view => favoriteViews.includes(getFilterKey(view))),
    ...viewOptions.filter(view => !favoriteViews.includes(getFilterKey(view))),
  ];



  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [a, t, v] = await Promise.all([
          accountantAPI.getAccounts({ limit: 1000 }),
          taxesAPI.getAll(),
          vendorsAPI.getAll()
        ]);
        setDbAccounts(Array.isArray(a?.data || a) ? (a.data || a) : []);
        setDbTaxes(t.data || t || []);
        setDbVendors(v.data || v || []);
      } catch (e) {
        console.error("Lookup data fetch failed", e);
      }
    };
    fetchLookupData();
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        (item.name || "").toLowerCase().includes(term) ||
        (item.sku || "").toLowerCase().includes(term)
      );
    }

    // Filtering logic based on original design
    switch (filterType) {
      case "All":
        break;
      case "Active Items":
      case "Active":
        result = result.filter(item => item.active !== false && item.status !== "Inactive" && (item.active === undefined || item.active === true));
        break;
      case "Inactive Items":
      case "Inactive":
        result = result.filter(item => item.active === false || item.status === "Inactive");
        break;
      case "Low Stock":
        result = result.filter(item => item.trackInventory && (parseFloat(item.stockOnHand || item.stockQuantity || 0) <= parseFloat(item.reorderPoint || 0)));
        break;
      case "Sales":
        result = result.filter(item => item.sellable);
        break;
      case "Purchases":
        result = result.filter(item => item.purchasable);
        break;
      case "Services":
        result = result.filter(item => item.type === "Service");
        break;
      case "Inventory Items":
        result = result.filter(item => item.trackInventory);
        break;
      default:
        break;
    }

    // Sorting logic
    result.sort((a, b) => {
      let valA = getSortValue(a, sortKey);
      let valB = getSortValue(b, sortKey);

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchTerm, filterType, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleSortOptionSelect = (optionLabel: string) => {
    const key = sortOptionMap[optionLabel];
    if (!key) return;
    if (sortKey === key) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setSortSubMenuOpen(false);
    setMoreDropdownOpen(false);
  };

  const getSortValue = (item: any, key: string) => {
    const rawValue = item?.[key];

    switch (key) {
      case "purchaseRate":
      case "rate":
      case "stockOnHand":
        return Number(String(rawValue ?? item?.[key === "stockOnHand" ? "stockQuantity" : key === "purchaseRate" ? "purchasePrice" : "sellPrice"] ?? 0).replace(/[^0-9.-]/g, "")) || 0;
      case "updatedAt":
      case "createdAt":
        return rawValue ? new Date(rawValue).getTime() : 0;
      default:
        return String(rawValue ?? "").toLowerCase();
    }
  };

  const getHeaderSortDirection = (key: string) => {
    if (sortKey !== key) return null;
    return sortOrder;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id || item._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Matching Screenshot */}
      {/* Header - Matching Screenshot */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 gap-2 sm:h-[57px]">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-[#1b5e6a] hover:text-white bg-white shadow-sm transition-colors"
                onClick={() => onBulkUpdate(selectedIds)}
                title="Bulk Update"
              >
                <span className="hidden sm:inline">Bulk</span> Update
              </button>
            )}

            {canCreate && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setNewTransactionOpen(!newTransactionOpen)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-gray-100 bg-white shadow-sm transition-colors flex items-center gap-1"
                >
                  <span className="hidden sm:inline">New Transaction</span>
                  <span className="sm:hidden">New</span>
                  <ChevronDown size={12} />
                </button>
                {newTransactionOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                    <button
                      onClick={() => navigate('/sales/quotes/new')}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                    >
                      Quote
                    </button>
                    <button
                      onClick={() => navigate('/sales/invoices/new')}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                    >
                      Invoice
                    </button>
                    <button
                      onClick={() => navigate('/sales/sales-receipts/new')}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                    >
                      Sales Receipt
                    </button>
                    <button
                      onClick={() => navigate('/purchases/purchase-orders/new')}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                    >
                      Purchase Order
                    </button>
                    <button
                      onClick={() => navigate('/purchases/bills/new')}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-[#1b5e6a] hover:text-white transition-colors"
                    >
                      Bill
                    </button>
                  </div>
                )}
              </div>
            )}

            {canEdit && (
              <>
                <button
                  onClick={async () => {
                    setIsBulkActiveLoading(true);
                    try {
                      await onBulkMarkActive(selectedIds);
                    } finally {
                      setIsBulkActiveLoading(false);
                    }
                  }}
                  disabled={isBulkActiveLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-[#1b5e6a] hover:text-white bg-white shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5"
                  title="Mark as Active"
                >
                  {isBulkActiveLoading && <RefreshCw size={12} className="animate-spin" />}
                  Mark<span className="hidden sm:inline"> as Active</span>
                </button>
                <button
                  onClick={async () => {
                    setIsBulkInactiveLoading(true);
                    try {
                      await onBulkMarkInactive(selectedIds);
                    } finally {
                      setIsBulkInactiveLoading(false);
                    }
                  }}
                  disabled={isBulkInactiveLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-[#1b5e6a] hover:text-white bg-white shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5"
                  title="Mark as Inactive"
                >
                  {isBulkInactiveLoading && <RefreshCw size={12} className="animate-spin" />}
                  Mark<span className="hidden sm:inline"> as Inactive</span>
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={async () => {
                  setIsBulkDeleteLoading(true);
                  try {
                    await onBulkDelete(selectedIds);
                    setSelectedIds([]);
                  } finally {
                    setIsBulkDeleteLoading(false);
                  }
                }}
                disabled={isBulkDeleteLoading}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-slate-700 hover:bg-red-600 hover:text-white bg-white shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isBulkDeleteLoading && <RefreshCw size={12} className="animate-spin" />}
                Delete
              </button>
            )}

            <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2" />

            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
              <span className="text-sm text-slate-600 hidden sm:inline">Selected</span>
            </div>
          </div>

          <button onClick={() => setSelectedIds([])} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
            Esc <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="relative" ref={filterDropdownRef}>
                <div
                  className="flex items-center gap-1 cursor-pointer group"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  <h1 className="text-base font-semibold text-slate-900 transition-colors" style={{ color: filterDropdownOpen ? accentColor : undefined }}>
                {getFilterLabel(filterType)}
              </h1>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${filterDropdownOpen ? 'rotate-180' : ''}`} style={{ color: accentColor }} />
                </div>

            {filterDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-100 transition-all">
                    <Search size={14} className="text-gray-400" />
                    <input
                      autoFocus
                      placeholder="Search Views"
                      className="bg-transparent border-none outline-none text-sm w-full"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {sortedViewOptions.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase())).map(view => {
                    const resolvedView = getFilterKey(view);
                    const isFavorite = favoriteViews.includes(resolvedView);
                    const isActive = filterType === resolvedView;
                    return (
                      <div
                        key={view}
                        className="flex items-center justify-between px-4 py-2 hover:bg-teal-50 transition-colors w-full"
                      >
                        <button
                          type="button"
                          onClick={() => { setFilterType(resolvedView); setFilterDropdownOpen(false); }}
                          className="flex-1 text-left cursor-pointer group/item"
                        >
                          <span className={`text-sm ${isActive ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>{view}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteView(view);
                          }}
                          className="ml-3 rounded-full p-1 hover:bg-teal-50 transition-colors flex-shrink-0"
                          aria-label={isFavorite ? `Unfavorite ${view}` : `Favorite ${view}`}
                        >
                          <Star
                            size={14}
                            className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* <div className="px-2 pt-2 border-t border-gray-100 mt-1">
                  <button
                    className="flex items-center gap-2 px-3 py-2 w-full text-sm font-medium hover:bg-gray-50 rounded-md transition-colors"
                    style={{ color: '#1b5e6a' }}
                  >
                    <Plus size={16} className="text-white rounded-full p-0.5" strokeWidth={3} style={{ backgroundColor: '#1b5e6a' }} />
                    New Custom View
                  </button>
                </div> */}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-2">
            <>
              {canCreate && (
                <button
                  onClick={onNew}
                  className="cursor-pointer transition-all bg-[#1b5e6a] text-white px-3 sm:px-4 py-1.5 rounded-lg border-[#0f4e5a] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] flex items-center gap-1 text-sm font-semibold"
                >
                  <Plus size={16} strokeWidth={3} /> <span className="hidden sm:inline">New</span>
                </button>
              )}

              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors bg-white shadow-sm"
                >
                  <MoreHorizontal size={18} className="text-gray-500" />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-60 bg-white border border-gray-100 rounded-lg shadow-xl z-[110] py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Sort by */}
                    <div className="relative">
                      <button
                        onClick={() => { setSortSubMenuOpen(!sortSubMenuOpen); setExportSubMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${sortSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                        style={sortSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <ArrowUpDown size={16} className={sortSubMenuOpen ? 'text-white' : ''} style={!sortSubMenuOpen ? { color: '#1b5e6a' } : {}} />
                          <span className="font-medium">Sort by</span>
                        </div>
                        <ChevronRight size={14} className={sortSubMenuOpen ? 'text-white' : 'text-slate-400'} />
                      </button>

                      {sortSubMenuOpen && (
                        <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-52 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                          {SORT_OPTIONS.map((option) => {
                            const isActive = sortKey === option.key;
                            return (
                              <button
                                key={option.label}
                                onClick={() => handleSortOptionSelect(option.label)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${isActive ? 'bg-white text-[#1b5e6a] font-semibold border-l-4 border-[#1b5e6a] shadow-[inset_0_0_0_1px_rgba(27,94,106,0.08)]' : 'text-slate-600 hover:bg-teal-50/50'}`}
                              >
                                <span style={isActive ? { color: '#1b5e6a', fontWeight: 600 } : {}}>{option.label}</span>
                                {isActive && <span className="ml-3 h-1.5 w-1.5 rounded-full bg-[#1b5e6a]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-gray-50 my-1 mx-2" />

                    {/* Import Items */}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                      onClick={() => { navigate('/items/import'); setMoreDropdownOpen(false); }}
                    >
                      <Upload size={16} className="text-teal-600 group-hover:text-white" />
                      <span className="font-medium">Import Items</span>
                    </button>

                    {/* Export */}
                    <div className="relative">
                      <button
                        onClick={() => { setExportSubMenuOpen(!exportSubMenuOpen); setSortSubMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${exportSubMenuOpen ? 'text-white rounded-md mx-2 w-[calc(100%-16px)] shadow-sm' : 'text-slate-600 hover:bg-[#1b5e6a] hover:text-white'}`}
                        style={exportSubMenuOpen ? { backgroundColor: '#1b5e6a' } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <Download size={16} className={exportSubMenuOpen ? 'text-white' : ''} style={!exportSubMenuOpen ? { color: '#1b5e6a' } : {}} />
                          <span className="font-medium">Export</span>
                        </div>
                        <ChevronRight size={14} className={exportSubMenuOpen ? 'text-white' : 'text-slate-400'} />
                      </button>

                      {exportSubMenuOpen && (
                        <div className="md:absolute md:top-0 md:right-full md:mr-2 md:w-52 relative w-full bg-white md:border border-gray-100 rounded-lg md:shadow-xl py-2 z-[115] md:animate-in md:fade-in md:slide-in-from-right-1 duration-200">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white font-medium transition-colors"
                            onClick={() => { setIsExportModalOpen(true); setExportSubMenuOpen(false); setMoreDropdownOpen(false); }}
                          >
                            Export Items
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white font-medium transition-colors"
                            onClick={() => { setIsExportCurrentViewModalOpen(true); setExportSubMenuOpen(false); setMoreDropdownOpen(false); }}
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-gray-50 my-1 mx-2" />

                    {/* Preferences */}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                      onClick={() => navigate('/settings/items')}
                    >
                      <SlidersHorizontal size={16} className="text-teal-600 group-hover:text-white" />
                      <span className="font-medium">Preferences</span>
                    </button>

                    {/* Refresh List */}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                      onClick={() => { onRefresh(); setMoreDropdownOpen(false); }}
                    >
                      <RefreshCw size={16} className="text-teal-600 group-hover:text-white" />
                      <span className="font-medium">Refresh List</span>
                    </button>

                    {/* Reset Column Width */}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-[#1b5e6a] hover:text-white transition-colors group"
                      onClick={() => {
                        setColumns(DEFAULT_COLUMNS);
                        setMoreDropdownOpen(false);
                      }}
                    >
                      <RotateCcw size={16} className="group-hover:text-white" style={{ color: accentColor }} />
                      <span className="font-medium">Reset Column Width</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto bg-white min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-[78px] min-w-[78px]">
                <div className="flex items-center justify-start gap-1.5 relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomizeModalOpen(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    title="Manage columns"
                    aria-label="Manage columns"
                  >
                    <SlidersHorizontal size={13} style={{ color: accentColor }} />
                  </button>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    style={{ accentColor: accentColor }}
                    className="cursor-pointer h-4 w-4 rounded border-gray-300 transition-all focus:ring-0"
                  />
                </div>
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 relative group/header cursor-pointer select-none ${col.key !== 'name' && col.key !== 'rate' ? 'hidden md:table-cell' : ''}`}
                  style={{ width: col.width }}
                  onClick={() => {
                    if (sortLabelByKey[col.key]) {
                      handleSort(col.key);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-slate-900 font-bold">{col.label}</span>
                      {sortLabelByKey[col.key] && (
                        <ArrowUpDown
                          size={10}
                          className="flex-shrink-0 transition-colors"
                          style={{ color: sortKey === col.key ? accentColor : undefined, transform: getHeaderSortDirection(col.key) === "desc" ? "rotate(180deg)" : "none" }}
                        />
                      )}
                    </div>
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-[2px] cursor-col-resize hover:bg-teal-400/50 group-hover/header:border-r border-gray-100"
                    onMouseDown={(e) => startResizing(col.key, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
              <th className="px-4 py-3 w-12 sticky right-0 bg-white border-l border-gray-100 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-center">
                  <Search
                    size={14}
                    className="text-gray-300 cursor-pointer transition-colors hover:opacity-80"
                    style={{ color: isAdvancedSearchOpen ? accentColor : undefined }} // Optional: highlight if open
                    onClick={(e) => { e.stopPropagation(); setIsAdvancedSearchOpen(true); }}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableRowSkeleton columns={visibleColumns} />
            ) : (
              filteredItems.map(item => {
                const id = item.id || item._id;
                const isSelected = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    className="group transition-all hover:bg-slate-50/50 cursor-pointer"
                    style={isSelected ? { backgroundColor: `#1b5e6a1A` } : {}} // 1A is approx 10% opacity
                    onClick={() => onSelect(id)}
                  >
                    <td className="px-4 py-3 w-[78px] min-w-[78px]">
                      <div className="flex items-center justify-start pl-7">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: '#1b5e6a' }}
                          className="cursor-pointer h-4 w-4 rounded border-gray-300 transition-all focus:ring-0"
                        />
                      </div>
                    </td>
                    {visibleColumns.map(col => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 truncate ${col.key !== 'name' && col.key !== 'rate' ? 'hidden md:table-cell' : ''}`}
                        style={{ maxWidth: col.width }}
                      >
                        {col.key === 'name' ? (
                          <div className="flex items-center gap-2">
                            {item.images && item.images.length > 0 ? (
                              <img
                                src={item.images[0]}
                                alt={item.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={16} className="text-gray-400" />
                              </div>
                            )}
                            <span className="text-[13px] font-medium text-[#1b5e6a] no-underline cursor-pointer truncate">{item.name}</span>
                          </div>
                        ) : col.key === 'purchaseRate' ? (
                          <span className="text-[13px] text-slate-600">{fmtMoney(item.costPrice || 0)}</span>
                        ) : col.key === 'rate' ? (
                          <span className="text-[13px] text-slate-600">{fmtMoney(item.sellingPrice || 0)}</span>
                        ) : col.key === 'accountName' ? (
                          <span className="text-[13px] text-slate-600">
                            {dbAccounts.find(a => (a._id || a.id) === item.salesAccount || a.name === item.salesAccount || a.accountName === item.salesAccount)?.accountName
                              || item.salesAccount
                              || item.accountName
                              || "-"}
                          </span>
                        ) : col.key === 'purchaseAccountName' ? (
                          <span className="text-[13px] text-slate-600">
                            {dbAccounts.find(a => (a._id || a.id) === item.purchaseAccount || a.name === item.purchaseAccount || a.accountName === item.purchaseAccount)?.accountName
                              || item.purchaseAccount
                              || item.purchaseAccountName
                              || "-"}
                          </span>
                        ) : col.key === 'stockQuantity' ? (
                          <span className="text-[13px] text-slate-600 font-medium">
                            {item.trackInventory
                              ? (val => isNaN(val) ? "0.00" : val.toFixed(2))(parseFloat(String(item.stockQuantity ?? item.stockOnHand ?? 0)))
                              : ""}
                          </span>
                        ) : col.key === 'preferredVendor' ? (
                          <span className="text-[13px] text-slate-600">
                            {dbVendors.find(v => (v._id || v.id) === item.preferredVendor || v.name === item.preferredVendor)?.name
                              || item.preferredVendor
                              || "-"}
                          </span>
                        ) : (
                          <span className="text-[13px] text-slate-600">{(item as any)[col.key] || item[col.key === 'purchaseDescription' ? 'purchaseDescription' : col.key === 'description' ? 'salesDescription' : col.key] || "-"}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 w-12 sticky right-0 bg-white/95 backdrop-blur-sm border-l border-gray-50 group-hover:bg-slate-50/95 transition-colors shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]" />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-800">Customize Columns</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-medium">
                  {columns.filter(c => c.visible).length} of {columns.length} Selected
                </span>
                <button
                  onClick={() => setIsCustomizeModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-50">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Columns"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Columns List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {[...columns]
                .filter(c => c.label.toLowerCase().includes(filterSearch.toLowerCase()))
                .sort((a, b) => Number(b.visible) - Number(a.visible) || Number(a.key === 'name') - Number(b.key === 'name'))
                .map((col, index) => (
                  <div
                    key={col.key}
                    draggable={col.key !== 'name'}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      handleReorder(dragIndex, index);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg group transition-colors hover:bg-[#eef8f9] ${col.visible ? 'bg-[#eef8f9]/70' : ''} ${col.pinned ? 'ring-1 ring-[#1b5e6a]/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition-colors">
                        <GripVertical size={16} />
                      </div>
                      <input
                        type="checkbox"
                        checked={col.visible}
                        disabled={col.key === 'name'}
                        onChange={() => handleToggleColumn(col.key)}
                        className="cursor-pointer h-4 w-4 rounded border-gray-300 text-[#1b5e6a] focus:ring-[#1b5e6a] disabled:opacity-50"
                      />
                      <div className="flex items-center gap-2">
                        {col.key === 'name' && <Lock size={12} className="text-slate-400" />}
                        <span className={`text-sm font-medium ${col.visible ? 'text-slate-800' : 'text-slate-400'}`}>
                          {col.label}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTogglePin(col.key)}
                      className={`p-1.5 rounded-md transition-all ${col.pinned ? 'text-[#1b5e6a] bg-[#eef8f9]' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100'}`}
                    >
                      {col.pinned ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
                    </button>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="px-6 py-2 bg-teal-900 text-white rounded-lg text-sm font-medium hover:bg-teal-950 shadow-sm shadow-teal-100 transition-all active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        initialSearchIn="Items"
        initialFilter={filterType === "All" ? "All Items" : filterType}
        searchOptions={["Items", "Inventory Adjustments", "Units"]}
        filterOptionsBySearch={{
          Items: ["All Items", "Active Items", "Inactive Items", "Low Stock", "Inventory Items"],
          "Inventory Adjustments": ["All", "By Quantity", "By Value"],
          Units: ["All"],
        }}
        dbAccounts={dbAccounts}
        dbTaxes={dbTaxes}
        dbVendors={dbVendors}
        onSearch={(criteria) => {
          console.log("Advanced Search Criteria:", criteria);
          // Here you would implement the server-side or client-side filtering logic
          // For now, let's just use the name for simple filtering
          if (criteria.name) setSearchTerm(criteria.name);
          toast.success("Advanced search applied");
        }}
      />
      <ExportItemsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} data={items} accounts={dbAccounts} />
      <ExportCurrentViewModal isOpen={isExportCurrentViewModalOpen} onClose={() => setIsExportCurrentViewModalOpen(false)} data={filteredItems} columns={visibleColumns} accounts={dbAccounts} />
    </div>
  );
};

export default ItemsList;
