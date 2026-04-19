import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import InventoryAdjustments from "./InventoryAdjustments";
import AdjustmentDetail from "./AdjustmentDetail";
import ExportInventoryAdjustmentsModal from "./ExportInventoryAdjustments";
import { Plus, BarChart3, MoreVertical, ChevronDown, ChevronUp, Star, X, Trash2, ArrowUpDown, Download, Upload, RefreshCw, ChevronRight, Settings } from "lucide-react";
import { inventoryAdjustmentsAPI } from "../../services/api";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";

// Define interfaces for InventoryPage
interface Adjustment {
  id: string;
  _id?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  createdTime?: string;
  lastModifiedTime?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  referenceNumber: string;
  adjustmentNumber?: string;
  reference?: string;
  description: string;
  reason?: string;
  type: string;
  status: string;
  items?: any[]; // Refine if item structure is known
  notes?: string;
  [key: string]: any;
}

interface DeleteConfirmModalState {
  open: boolean;
  count: number;
  itemIds: string[];
}

// Helper function to parse date for sorting
const parseDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  try {
    if (dateString instanceof Date) return dateString;
    // Handle dd/MM/yyyy format
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // dd/MM/yyyy
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (e) {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Inventory Page Content                                             */
/* ------------------------------------------------------------------ */
declare global {
  interface Window {
    setInventorySearchCriteria: (criteria: any) => void;
  }
}

/* ------------------------------------------------------------------ */
/* Inventory Page Content                                             */
/* ------------------------------------------------------------------ */
function InventoryPageContent() {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModalState>({ open: false, count: 0, itemIds: [] });

  // Format date for display
  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return "";
    try {
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return String(dateString);
    }
  };

  // Format datetime for display
  const formatDateTime = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return "";
    try {
      if (dateString instanceof Date) {
        return dateString.toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateString);
    }
  };

  const fetchAdjustments = async (showToast = false) => {
    setLoading(true);
    try {
      // Add timestamp to prevent caching
      const response = await inventoryAdjustmentsAPI.getAll();
      console.log("API Response:", response);

      // Handle different response formats
      // Backend returns: { success: true, data: adjustments }
      let data = [];
      if (Array.isArray(response)) {
        data = response;
      } else if (response?.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response?.success && response?.data && Array.isArray(response.data)) {
        data = response.data;
      } else {
        console.warn("Unexpected response format:", response);
        data = [];
      }

      const formattedData = data.map((adj: any) => ({
        ...adj,
        id: adj._id || adj.id,
        rawDate: adj.date,
        rawCreatedAt: adj.createdAt,
        rawUpdatedAt: adj.updatedAt,
        date: formatDate(adj.date),
        createdAt: adj.createdAt ? formatDateTime(adj.createdAt) : "",
        updatedAt: adj.updatedAt ? formatDateTime(adj.updatedAt) : "",
        createdTime: adj.createdAt ? formatDateTime(adj.createdAt) : "",
        lastModifiedTime: adj.updatedAt ? formatDateTime(adj.updatedAt) : "",
        createdBy: (adj.createdBy && typeof adj.createdBy === 'object' ? adj.createdBy.name : adj.createdBy) || "System",
        lastModifiedBy: (adj.lastModifiedBy && typeof adj.lastModifiedBy === 'object' ? adj.lastModifiedBy.name : adj.lastModifiedBy) || (adj.updatedBy && typeof adj.updatedBy === 'object' ? adj.updatedBy.name : adj.updatedBy) || (adj.createdBy && typeof adj.createdBy === 'object' ? adj.createdBy.name : adj.createdBy) || "System",
        reason: adj.reason || "",
        status: adj.status || "",
        referenceNumber: adj.referenceNumber || adj.reference || adj.adjustmentNumber || "",
        description: adj.description || adj.notes || "",
        type: adj.type || "Quantity",
        account: adj.account || "Cost of Goods Sold",
        location: adj.locationName || adj.branchName || adj.location || "Head Office"
      }));

      // Update adjustments state
      setAdjustments(formattedData);

      if (showToast) {
        toast.success(`List refreshed successfully - ${formattedData.length} adjustment(s) loaded`);
      }
    } catch (error: any) {
      console.error("Error loading adjustments:", error);
      console.error("Error details:", {
        message: error?.message,
        data: error?.data,
        responseStatus: error?.response?.status || error?.status
      });

      // Show more specific error message
      // apiRequest throws error with error.data, not error.response.data
      const errorMessage = error.data?.message || error.data?.error || error.message || "Failed to load adjustments";

      // Only show error toast if not already showing (prevent duplicates)
      if (!error._toastShown) {
        toast.error(errorMessage);
        error._toastShown = true;
      }

      // Set empty array on error to prevent UI issues
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();

    // Expose search criteria setter to child component
    (window as any).setInventorySearchCriteria = (criteria: any) => {
      setSearchCriteria(criteria);
    };

    // Listen for import events to refresh the list
    const handleImport = () => {
      // Add a delay to ensure backend has processed the import
      setTimeout(() => {
        fetchAdjustments(true); // Show toast when refreshing after import
      }, 800);
    };

    window.addEventListener('inventoryAdjustmentsImported', handleImport);

    // Also check if we're coming from an import (check sessionStorage)
    const checkImportFlag = sessionStorage.getItem('inventoryImportCompleted');
    if (checkImportFlag === 'true') {
      const importCount = sessionStorage.getItem('inventoryImportCount') || '0';
      const importType = sessionStorage.getItem('inventoryImportType') || '';
      sessionStorage.removeItem('inventoryImportCompleted');
      sessionStorage.removeItem('inventoryImportCount');
      sessionStorage.removeItem('inventoryImportType');

      // Reset filters to show all adjustments (including newly imported ones)
      setSelectedType("All");
      setSelectedPeriod("All");

      // Refresh after a delay to ensure backend has processed
      setTimeout(() => {
        fetchAdjustments(true);
        // Show a specific message about imported items
        if (importCount !== '0') {
          setTimeout(() => {
            toast.success(`${importCount} ${importType || 'adjustment'}(s) imported successfully and added to the list`);
          }, 1000);
        }
      }, 800);
    }

    return () => {
      // @ts-ignore
      delete (window as any).setInventorySearchCriteria;
      window.removeEventListener('inventoryAdjustmentsImported', handleImport);
    };
  }, []);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("This Year");
  const [selectedAdjustment, setSelectedAdjustment] = useState<Adjustment | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number } | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Created Time");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchCriteria, setSearchCriteria] = useState<any>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sidebarMoreMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarMoreMenuOpen, setSidebarMoreMenuOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeDropdownOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }

      // Check if click is outside the more menu container (including submenus)
      const isClickInMoreMenu = moreMenuRef.current?.contains(event.target as Node);
      const isClickInSortMenu = sortMenuRef.current?.contains(event.target as Node);
      const isClickInImportMenu = importMenuRef.current?.contains(event.target as Node);

      if (!isClickInMoreMenu && !isClickInSortMenu && !isClickInImportMenu) {
        setMoreMenuOpen(false);
        setSortMenuOpen(false);
        setImportMenuOpen(false);
      }
    };
    const handleResize = () => setIsSmallScreen(window.innerWidth < 640);

    if (typeDropdownOpen || periodDropdownOpen || moreMenuOpen || sortMenuOpen || importMenuOpen || sidebarMoreMenuOpen) {
      // Use setTimeout to allow the click event to complete first
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 10);

      window.addEventListener('resize', handleResize);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [typeDropdownOpen, periodDropdownOpen, moreMenuOpen, sortMenuOpen, importMenuOpen, sidebarMoreMenuOpen]);

  // Handle escape key to clear selection
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedItems.length > 0) {
        setSelectedItems([]);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedItems.length]);

  // Parse date string like "19 Nov 2025" or "07/01/2026" to Date object
  const parseDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return null;
    try {
      // Handle dd/MM/yyyy format
      if (typeof dateString === 'string' && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          const year = parseInt(parts[2]);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      }

      // Handle format like "19 Nov 2025"
      if (typeof dateString === 'string') {
        const parts = dateString.split(" ");
        if (parts.length >= 3) {
          const day = parseInt(parts[0]);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = monthNames.indexOf(parts[1]);
          const year = parseInt(parts[2]);
          if (month !== -1 && !isNaN(day) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      }
      // Try parsing as ISO string or standard date
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Filter adjustments based on selected period and type
  const getFilteredAdjustments = () => {
    let filtered = [...adjustments];

    // Apply search criteria if available
    if (searchCriteria) {
      filtered = filtered.filter((adj) => {
        // Item Name filter
        if (searchCriteria.itemName) {
          const itemName = (adj.items?.[0]?.itemName || adj.items?.[0]?.item?.name || "").toLowerCase();
          if (!itemName.includes(searchCriteria.itemName.toLowerCase())) {
            return false;
          }
        }

        // Reference Number filter
        if (searchCriteria.referenceNumber) {
          const refNum = (adj.referenceNumber || adj.adjustmentNumber || "").toLowerCase();
          if (!refNum.includes(searchCriteria.referenceNumber.toLowerCase())) {
            return false;
          }
        }

        // Reason filter
        if (searchCriteria.reason && adj.reason !== searchCriteria.reason) {
          return false;
        }

        // Item Description filter
        if (searchCriteria.itemDescription) {
          const desc = (adj.description || adj.items?.[0]?.itemDescription || "").toLowerCase();
          if (!desc.includes(searchCriteria.itemDescription.toLowerCase())) {
            return false;
          }
        }

        // Date Range filter
        if (searchCriteria.dateFrom || searchCriteria.dateTo) {
          const adjDate = parseDate(adj.date);
          if (searchCriteria.dateFrom) {
            const fromDate = parseDate(searchCriteria.dateFrom);
            if (fromDate && adjDate && adjDate < fromDate) {
              return false;
            }
          }
          if (searchCriteria.dateTo) {
            const toDate = parseDate(searchCriteria.dateTo);
            if (toDate && adjDate && adjDate > toDate) {
              return false;
            }
          }
        }

        return true;
      });
    }

    // Filter by type first
    if (selectedType !== "All") {
      filtered = filtered.filter((adj) => {
        const adjType = adj.type || "";
        if (selectedType === "By Quantity") {
          return adjType.toLowerCase().includes("quantity") || adjType === "Quantity";
        } else if (selectedType === "By Value") {
          return adjType.toLowerCase().includes("value") || adjType === "Value";
        }
        return true;
      });
    }

    // Filter by period
    if (selectedPeriod === "All") {
      return filtered;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);

    return filtered.filter((adj) => {
      // Parse date from multiple possible formats
      let adjDate;
      try {
        const dateStr = adj.date || adj.createdAt || adj.createdTime;
        if (!dateStr) return false;

        // Handle dd/MM/yyyy format
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            adjDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
            adjDate = new Date(dateStr);
          }
        } else {
          adjDate = new Date(dateStr);
        }

        if (isNaN(adjDate.getTime())) return false;
      } catch (e) {
        console.error("Error parsing date:", e, adj);
        return false;
      }

      const adjMonth = adjDate.getMonth();
      const adjYear = adjDate.getFullYear();
      const adjQuarter = Math.floor(adjMonth / 3);

      switch (selectedPeriod) {
        case "Today":
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const adjDateOnly = new Date(adjDate);
          adjDateOnly.setHours(0, 0, 0, 0);
          return adjDateOnly.getTime() === today.getTime();
        case "This Week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          return adjDate >= weekStart && adjDate <= weekEnd;
        case "This Month":
          return adjMonth === currentMonth && adjYear === currentYear;
        case "This Quarter":
          return adjQuarter === currentQuarter && adjYear === currentYear;
        case "This Year":
          return adjYear === currentYear;
        default:
          return true;
      }
    });
  };

  const filteredAdjustments = getFilteredAdjustments();

  // Apply sorting to filtered adjustments
  const sortedAdjustments = useMemo(() => {
    const sorted = [...filteredAdjustments];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "Date":
          aValue = a.rawDate ? new Date(a.rawDate) : parseDate(a.date || a.createdAt || a.createdTime);
          bValue = b.rawDate ? new Date(b.rawDate) : parseDate(b.date || b.createdAt || b.createdTime);
          break;
        case "Reason":
          aValue = (a.reason || '').toLowerCase();
          bValue = (b.reason || '').toLowerCase();
          break;
        case "Created Time":
          aValue = a.rawCreatedAt ? new Date(a.rawCreatedAt) : parseDate(a.createdAt || a.createdTime || a.date);
          bValue = b.rawCreatedAt ? new Date(b.rawCreatedAt) : parseDate(b.createdAt || b.createdTime || b.date);
          break;
        case "Last Modified Time":
          aValue = a.rawUpdatedAt ? new Date(a.rawUpdatedAt) : parseDate(a.updatedAt || a.lastModifiedTime || a.date);
          bValue = b.rawUpdatedAt ? new Date(b.rawUpdatedAt) : parseDate(b.updatedAt || b.lastModifiedTime || b.date);
          break;
        default:
          // Try to access property directly if no specific case matches
          // Handle specific mappings if needed, or rely on property name
          const key = sortBy.charAt(0).toLowerCase() + sortBy.slice(1).replace(/ /g, '');
          aValue = a[key] || a[sortBy] || '';
          bValue = b[key] || b[sortBy] || '';

          if (sortBy === "DATE" || sortBy === "Date") {
            aValue = parseDate(a.date || a.createdAt || a.createdTime);
            bValue = parseDate(b.date || b.createdAt || b.createdTime);
          }
          break;
      }

      // Handle date comparisons
      if (aValue instanceof Date && bValue instanceof Date) {
        if (isNaN(aValue.getTime()) || isNaN(bValue.getTime())) {
          return 0;
        }
        const diff = aValue.getTime() - bValue.getTime();
        return sortOrder === "asc" ? diff : -diff;
      }

      // Handle string comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortOrder === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }

      return 0;
    });

    return sorted;
  }, [filteredAdjustments, sortBy, sortOrder]);
  const hasAdjustments = adjustments.length > 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(sortedAdjustments.map(adj => adj.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    setDeleteConfirmModal({ open: true, count: selectedItems.length, itemIds: selectedItems });
  };

  const confirmDeleteSelected = async () => {
    if (deleteConfirmModal.itemIds.length === 0) return;
    try {
      await Promise.all(deleteConfirmModal.itemIds.map(id => inventoryAdjustmentsAPI.delete(id)));
      await fetchAdjustments();
      setSelectedItems([]);
      if (selectedAdjustment && deleteConfirmModal.itemIds.includes(selectedAdjustment.id)) {
        setSelectedAdjustment(null);
      }
      toast.success("Adjustments deleted successfully");
      setDeleteConfirmModal({ open: false, count: 0, itemIds: [] });
    } catch (error) {
      console.error("Error deleting adjustments:", error);
      toast.error("Failed to delete adjustments: " + ((error as any).message || "Unknown error"));
    }
  };

  // Show split view only when adjustment is selected
  if (selectedAdjustment) {
    return (
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-40px)] p-3 md:p-6 gap-3 md:gap-6 overflow-visible bg-[#f6f7fb]">
        {/* Left Panel - List */}
        <div className="w-full md:w-[400px] md:border-r border-gray-200 flex flex-col overflow-visible md:shrink-0 bg-transparent">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 min-h-[65px] flex items-center">
            {selectedItems.length > 0 ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="relative" ref={sidebarMoreMenuRef}>
                    <button
                      onClick={() => setSidebarMoreMenuOpen(!sidebarMoreMenuOpen)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    >
                      <span>Bulk Actions</span>
                      <ChevronDown size={14} />
                    </button>
                    {sidebarMoreMenuOpen && (
                      <div
                        className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1001] min-w-[160px] py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            handleDeleteSelected();
                            setSidebarMoreMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                    <span className="font-bold">{selectedItems.length}</span>
                    <span>Selected</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItems([])}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900 m-0">
                    Inventory Adjustments
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/inventory/new")}
                    className="px-3 py-1.5 text-sm font-medium text-white border-none rounded-md cursor-pointer flex items-center gap-1.5"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <Plus size={16} />
                    New
                  </button>
                  <div className="relative" ref={sidebarMoreMenuRef}>
                    <button
                      onClick={() => setSidebarMoreMenuOpen(!sidebarMoreMenuOpen)}
                      className="p-1.5 text-sm font-medium text-gray-500 bg-gray-100 border-none rounded-md cursor-pointer flex items-center justify-center hover:bg-gray-200"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {sidebarMoreMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-[calc(100%+8px)] right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] min-w-[220px] py-1 overflow-visible"
                      >
                        {/* Sort Submenu */}
                        <div className="relative">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortMenuOpen(!sortMenuOpen);
                              setImportMenuOpen(false);
                            }}
                            className={`px-3 py-2 text-sm font-medium cursor-pointer flex items-center justify-between group transition-colors ${sortMenuOpen ? "bg-[#156372] text-white" : "text-gray-800 hover:bg-gray-300 hover:text-gray-900"}`}
                          >
                            <div className="flex items-center gap-2">
                              <ArrowUpDown size={14} className={sortMenuOpen ? "text-white" : "text-gray-500 group-hover:text-white"} />
                              <span>Sort by</span>
                            </div>
                            <ChevronRight size={14} className={sortMenuOpen ? "text-white" : "text-gray-400 group-hover:text-white"} />
                          </div>

                          {sortMenuOpen && (
                            <div
                              className="absolute top-0 right-full mr-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[1001] min-w-[180px] overflow-hidden"
                            >
                              {["Date", "Reason", "Created Time", "Last Modified Time"].map((option) => {
                                const isSelected = sortBy === option;
                                return (
                                  <div
                                    key={option}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (sortBy === option) {
                                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                      } else {
                                        setSortBy(option);
                                        setSortOrder("asc");
                                      }
                                      setSortMenuOpen(false);
                                      setSidebarMoreMenuOpen(false);
                                    }}
                                    className={`px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors ${isSelected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-gray-300 hover:text-gray-900"}`}
                                  >
                                    <span>{option}</span>
                                    {isSelected && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Import Submenu */}
                        <div className="relative border-t border-gray-100">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportMenuOpen(!importMenuOpen);
                              setSortMenuOpen(false);
                            }}
                            className={`px-3 py-2 text-sm font-medium cursor-pointer flex items-center justify-between group transition-colors ${importMenuOpen ? "bg-[#156372] text-white" : "text-gray-800 hover:bg-gray-300 hover:text-gray-900"}`}
                          >
                            <div className="flex items-center gap-2">
                              <Download size={14} className={importMenuOpen ? "text-white" : "text-gray-500 group-hover:text-white"} />
                              <span>Import</span>
                            </div>
                            <ChevronRight size={14} className={importMenuOpen ? "text-white" : "text-gray-400 group-hover:text-white"} />
                          </div>
                          {importMenuOpen && (
                            <div
                              className="absolute top-0 right-full mr-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[1001] min-w-[200px] overflow-hidden"
                            >
                              {["Import Quantity Adjustments", "Import Value Adjustments"].map((option, index) => (
                                <div
                                  key={option}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImportMenuOpen(false);
                                    setSidebarMoreMenuOpen(false);
                                    navigate(option.includes('Quantity') ? "/inventory/import/quantity" : "/inventory/import/value");
                                  }}
                                  className={`px-4 py-2.5 text-[13px] text-gray-700 cursor-pointer transition-colors hover:bg-gray-300 hover:text-gray-900 border-b border-gray-50 last:border-0`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Export */}
                        <div
                          onClick={() => {
                            setSidebarMoreMenuOpen(false);
                            setIsExportModalOpen(true);
                          }}
                          className="px-3 py-2 text-sm font-medium cursor-pointer flex items-center gap-2 border-t border-gray-100 text-gray-800 hover:bg-gray-300 hover:text-gray-900 group transition-colors"
                        >
                          <Upload size={14} className="text-gray-500 group-hover:text-white" />
                          <span>Export Adjustments</span>
                        </div>

                        {/* Refresh */}
                        <div
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSidebarMoreMenuOpen(false);
                            await fetchAdjustments(true);
                          }}
                          className="px-3 py-2 text-sm font-medium cursor-pointer flex items-center gap-2 border-t border-gray-100 text-gray-800 hover:bg-gray-300 hover:text-gray-900 group transition-colors"
                        >
                          <RefreshCw size={14} className="text-gray-500 group-hover:text-white" />
                          <span>Refresh List</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="px-3 md:px-4 py-3 border-b border-gray-200 flex flex-wrap gap-2 items-center">
            {/* ... (Keep Dropdowns) ... */}
            < div className="relative inline-block" ref={typeDropdownRef} >
              <button
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 cursor-pointer flex items-center gap-1 hover:border-gray-400"
              >
                <span>Type: {selectedType}</span>
                {typeDropdownOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {
                typeDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    zIndex: 1000,
                    minWidth: "180px",
                    overflow: "hidden"
                  }}>
                    {/* All option */}
                    <div
                      onClick={() => {
                        setSelectedType("All");
                        setTypeDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: selectedType === "All" ? "#156372" : "#1f2937",
                        backgroundColor: selectedType === "All" ? "rgba(21, 99, 114, 0.1)" : "transparent",
                        borderLeft: selectedType === "All" ? "3px solid #156372" : "3px solid transparent",
                        paddingLeft: selectedType === "All" ? "9px" : "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <span>All</span>

                    </div>
                    {/* By Quantity option */}
                    <div
                      onClick={() => {
                        setSelectedType("By Quantity");
                        setTypeDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: selectedType === "By Quantity" ? "#156372" : "#1f2937",
                        backgroundColor: selectedType === "By Quantity" ? "rgba(21, 99, 114, 0.1)" : "transparent",
                        borderLeft: selectedType === "By Quantity" ? "3px solid #156372" : "3px solid transparent",
                        paddingLeft: selectedType === "By Quantity" ? "9px" : "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <span>By Quantity</span>
                    </div>
                    {/* By Value option */}
                    <div
                      onClick={() => {
                        setSelectedType("By Value");
                        setTypeDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: selectedType === "By Value" ? "#156372" : "#1f2937",
                        backgroundColor: selectedType === "By Value" ? "rgba(21, 99, 114, 0.1)" : "transparent",
                        borderLeft: selectedType === "By Value" ? "3px solid #156372" : "3px solid transparent",
                        paddingLeft: selectedType === "By Value" ? "9px" : "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <span>By Value</span>
                    </div>
                  </div>
                )
              }
            </div >
            <div className="relative inline-block align-top z-30" ref={periodDropdownRef}>
              <button
                onClick={() => {
                  const nextOpen = !periodDropdownOpen;
                  setPeriodDropdownOpen(nextOpen);
                  if (nextOpen && periodDropdownRef.current) {
                    const rect = periodDropdownRef.current.getBoundingClientRect();
                    setPeriodMenuPos({
                      top: rect.bottom + 6,
                      left: rect.left,
                      width: rect.width
                    });
                  } else {
                    setPeriodMenuPos(null);
                  }
                }}
                className="px-3 py-[5px] text-[13px] border border-gray-300 rounded-md bg-white text-gray-900 cursor-pointer flex items-center gap-2 min-w-[100px] justify-between hover:border-gray-400"
              >
                <span>Period: {selectedPeriod}</span>
                {periodDropdownOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </button>
              {periodDropdownOpen && (
                <div style={{
                  position: "fixed",
                  top: `${periodMenuPos?.top ?? 0}px`,
                  left: `${periodMenuPos?.left ?? 0}px`,
                  width: `${periodMenuPos?.width ?? 160}px`,
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  zIndex: 3000,
                  minWidth: "160px",
                  overflow: "hidden"
                }}>
                  {["All", "Today", "This Week", "This Month", "This Quarter", "This Year"].map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setSelectedPeriod(option);
                        setPeriodDropdownOpen(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: selectedPeriod === option ? "#156372" : "#1f2937",
                        backgroundColor: selectedPeriod === option ? "rgba(21, 99, 114, 0.1)" : "transparent",
                        borderLeft: selectedPeriod === option ? "3px solid #156372" : "3px solid transparent",
                        paddingLeft: selectedPeriod === option ? "9px" : "12px"
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div >

          {/* List */}
          < div className="flex-1 overflow-y-auto" >
            {
              sortedAdjustments.map((adj) => {
                const isSelected = selectedItems.includes(adj.id);
                const isActive = selectedAdjustment?.id === adj.id;

                return (
                  <div
                    key={adj.id}
                    onClick={() => setSelectedAdjustment(adj)}
                    className={`p-3 px-4 border-b border-gray-100 cursor-pointer transition-colors ${isActive ? "bg-[#156372]/5" : "bg-white hover:bg-gray-50"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(adj.id, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                          style={{ accentColor: '#156372' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-0.5">
                          <span className="text-[13px] font-semibold text-[#156372] truncate">
                            {adj.referenceNumber}
                          </span>
                          <span className="text-[11px] text-gray-500 whitespace-nowrap">
                            {formatDate(adj.date)}
                          </span>
                        </div>
                        <div className="text-[13px] text-gray-700 truncate mb-1">
                          {adj.reason}
                        </div>
                        <div className="text-[11px] font-bold text-[#156372] uppercase tracking-wider">
                          {adj.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div >
        </div >

        {/* Right Panel - Detail */}
        < div className="flex-1 overflow-visible min-h-0 flex flex-col bg-transparent relative z-0" >
          <AdjustmentDetail
            adjustment={selectedAdjustment}
            onClose={() => setSelectedAdjustment(null)}
            onEdit={() => {
              navigate(`/inventory/edit/${selectedAdjustment.id || selectedAdjustment._id}`, {
                state: { adjustment: selectedAdjustment },
              });
            }}
            onRefresh={fetchAdjustments}
            onDelete={async () => {
              if (selectedAdjustment?.id || selectedAdjustment?._id) {
                await inventoryAdjustmentsAPI.delete(selectedAdjustment.id || selectedAdjustment._id);
                setSelectedAdjustment(null);
                await fetchAdjustments();
                toast.success("Adjustment deleted successfully");
              }
            }}
          />

          <ExportInventoryAdjustmentsModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
          />
        </div >
      </div >
    );
  }

  // Helper for single delete from detail view
  const onDeleteConfirm = async (id: string) => {
    try {
      await inventoryAdjustmentsAPI.delete(id);
      await fetchAdjustments();
      setSelectedAdjustment(null);
      toast.success("Adjustment deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      toast.error("Failed to delete adjustment");
      return false;
    }
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-transparent">
      <div className="sticky top-0 z-40 -mx-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-3 md:px-6 pt-3 md:pt-6 pb-4">
      {/* Selection Bar - Above Header */}
      {selectedItems.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-2 pl-3 mb-5 flex items-center justify-between shadow-sm h-[52px] bg-transparent">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
            >
              Delete
            </button>
            <div className="h-5 w-px bg-gray-300 mx-1"></div>
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
              <span className="font-bold text-slate-900">{selectedItems.length}</span>
              <span className="font-medium text-slate-600">Selected</span>
            </div>
          </div>

          <button
            onClick={() => setSelectedItems([])}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-medium text-sm px-3 py-1.5 rounded hover:bg-slate-50 transition-colors mr-1"
          >
            <span className="text-xs font-semibold tracking-wide">Esc</span>
            <X size={18} className="text-red-500" />
          </button>
        </div>
      )}

      {/* Header */}
      {selectedItems.length === 0 && (
      <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-5 pb-4 bg-transparent">
          <h1 className="flex-1 min-w-0 text-xl sm:text-2xl md:text-[28px] font-bold text-black m-0">
            Inventory Adjustments
          </h1>
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Removed: FIFO Cost Lot Tracking Report link */}
            <button
              onClick={() => navigate("/inventory/new")}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white border-none rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              <Plus size={16} />
              New
            </button>
            <div style={{ position: "relative" }} ref={moreMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newOpen = !moreMenuOpen;
                  setMoreMenuOpen(newOpen);
                  if (newOpen && typeof window !== 'undefined' && moreMenuRef.current) {
                    const rect = moreMenuRef.current.getBoundingClientRect();
                    setMoreMenuPos({ top: rect.bottom + window.scrollY });
                  } else {
                    setMoreMenuPos(null);
                  }
                }}
                style={{
                  padding: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6b7280",
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
              >
                <MoreVertical size={16} />
              </button>
              {moreMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={(() => {
                    if (isSmallScreen && moreMenuPos) {
                      return {
                        position: "fixed",
                        top: `${moreMenuPos.top}px`,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "min(360px, calc(100vw - 32px))",
                        marginTop: 0,
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        zIndex: 2000,
                        overflow: "visible"
                      };
                    }
                    return {
                      position: "absolute",
                      top: "100%",
                      right: isSmallScreen ? "8px" : 0,
                      left: isSmallScreen ? "8px" : "auto",
                      marginTop: "8px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      zIndex: 1000,
                      minWidth: isSmallScreen ? "calc(100vw - 32px)" : "240px",
                      overflow: "visible"
                    };
                  })()}
                >
                  {/* Sort by */}
                  <div
                    style={{ position: "relative" }}
                    ref={sortMenuRef}
                  >
                    <div
                      data-sort-button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortMenuOpen(!sortMenuOpen);
                        setImportMenuOpen(false);
                      }}
                      className={`px-3 py-2.5 text-sm font-medium cursor-pointer flex items-center justify-between group transition-colors ${sortMenuOpen ? "bg-[#156372] text-white" : "text-gray-800 hover:bg-gray-300 hover:text-gray-900"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpDown size={16} className={sortMenuOpen ? "text-white" : "text-gray-500 group-hover:text-white"} />
                        <span>Sort by</span>
                      </div>
                      <ChevronRight size={16} className={sortMenuOpen ? "text-white" : "text-gray-400 group-hover:text-white"} />
                    </div>

                    {/* Sort Options Submenu */}
                    {sortMenuOpen && (
                      <div
                        data-sort-menu
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: isSmallScreen ? "100%" : 0,
                          left: isSmallScreen ? 0 : "auto",
                          right: isSmallScreen ? "auto" : "100%",
                          marginRight: isSmallScreen ? "0" : "8px",
                          marginTop: isSmallScreen ? "8px" : "0",
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          zIndex: 1001,
                          minWidth: isSmallScreen ? "100%" : "180px",
                          overflow: "hidden"
                        }}
                      >
                        {["Date", "Reason", "Created Time", "Last Modified Time"].map((option) => {
                          const isSelected = sortBy === option;
                          return (
                            <div
                              key={option}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (sortBy === option) {
                                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setSortBy(option);
                                  setSortOrder("asc");
                                }
                                setSortMenuOpen(false);
                                setMoreMenuOpen(false);
                              }} style={{
                                padding: "10px 12px",
                                fontSize: "14px",
                                color: isSelected ? "#ffffff" : "#1f2937",
                                backgroundColor: isSelected ? "#156372" : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderBottom: option !== "Last Modified Time" ? "1px solid #e5e7eb" : "none"
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = "#f9fafb";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              <span>{option}</span>
                              {isSelected && (
                                sortOrder === "asc" ? (
                                  <ChevronUp size={16} style={{ color: "#ffffff" }} />
                                ) : (
                                  <ChevronDown size={16} style={{ color: "#ffffff" }} />
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Import */}
                  <div
                    style={{ position: "relative" }}
                    ref={importMenuRef}
                  >
                    <div
                      data-import-button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImportMenuOpen(!importMenuOpen);
                        setSortMenuOpen(false);
                      }}
                      className={`px-3 py-2.5 text-sm font-medium cursor-pointer flex items-center justify-between border-t border-gray-200 group transition-colors ${importMenuOpen ? "bg-[#156372] text-white" : "text-gray-800 hover:bg-gray-300 hover:text-gray-900"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Download size={16} className={importMenuOpen ? "text-white" : "text-gray-500 group-hover:text-white"} />
                        <span>Import</span>
                      </div>
                      <ChevronRight size={16} className={importMenuOpen ? "text-white" : "text-gray-400 group-hover:text-white"} />
                    </div>

                    {/* Import Options Submenu */}
                    {importMenuOpen && (
                      <div
                        data-import-menu
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: isSmallScreen ? "100%" : 0,
                          left: isSmallScreen ? 0 : "auto",
                          right: isSmallScreen ? "auto" : "100%",
                          marginRight: isSmallScreen ? "0" : "8px",
                          marginTop: isSmallScreen ? "8px" : "0",
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          zIndex: 1001,
                          minWidth: isSmallScreen ? "100%" : "220px",
                          overflow: "hidden"
                        }}
                      >
                        {["Import Quantity Adjustments", "Import Value Adjustments"].map((option, index) => {
                          const isQuantity = option.includes('Quantity');
                          const importPath = isQuantity
                            ? "/inventory/import/quantity"
                            : "/inventory/import/value";

                          return (
                            <div
                              key={option}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                // Close menus
                                setImportMenuOpen(false);
                                setMoreMenuOpen(false);

                                // Navigate to the appropriate import page
                                navigate(importPath);
                              }}
                              style={{
                                padding: "10px 12px",
                                fontSize: "14px",
                                color: "#1f2937",
                                backgroundColor: "transparent",
                                cursor: "pointer",
                                borderBottom: index === 0 ? "1px solid #e5e7eb" : "none"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#156372";
                                e.currentTarget.style.color = "#ffffff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.color = "#1f2937";
                              }}
                            >
                              <span style={{ color: "inherit" }}>{option}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setIsExportModalOpen(true);
                    }}
                    className="px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between border-t border-gray-200 text-gray-800 hover:bg-gray-300 hover:text-gray-900 group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Upload size={16} className="text-gray-500 group-hover:text-white" />
                      <span>Export Adjustments</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-white" />
                  </div>

                  {/* Preferences */}
                  {/* <div
                    onClick={() => {
                      setMoreMenuOpen(false);
                      const inventorySettingsPath = "/settings/inventory-adjustments";
                      navigate(inventorySettingsPath);
                    }}
                    className="px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2 border-t border-gray-200 text-gray-800 hover:bg-gray-300 hover:text-gray-900 group transition-colors"
                  >
                    <Settings size={16} className="text-gray-500 group-hover:text-white" />
                    <span>Preferences</span>
                  </div> */}

                  {/* Refresh List */}
                  <div
                    onClick={async () => {
                      setMoreMenuOpen(false);
                      // Clear selected items
                      setSelectedItems([]);
                      // Clear selected adjustment if any
                      setSelectedAdjustment(null);
                      // Fetch fresh data from database with toast notification
                      await fetchAdjustments(true);
                    }}
                    className="px-3 py-2.5 text-sm cursor-pointer flex items-center gap-2 border-t border-gray-200 text-gray-800 hover:bg-gray-300 hover:text-gray-900 group transition-colors"
                  >
                    <RefreshCw size={16} className="text-gray-500 group-hover:text-white" />
                    <span>Refresh List</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="relative z-20 flex flex-wrap gap-3 mb-5 items-center bg-transparent py-1">
        <div className="relative z-20 flex items-center gap-2">
          <label className="text-[13px] text-gray-500 font-medium">
            Filter By :
          </label>
          <div className="relative inline-block align-top" ref={typeDropdownRef}>
            <button
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              style={{
                padding: "5px 12px",
                fontSize: "13px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                color: "#1f2937",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "100px",
                justifyContent: "space-between"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
            >
              <span>Type: {selectedType}</span>
              {typeDropdownOpen ? (
                <ChevronUp size={14} style={{ color: "#6b7280" }} />
              ) : (
                <ChevronDown size={14} style={{ color: "#6b7280" }} />
              )}
            </button>
            {typeDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                zIndex: 1001,
                minWidth: "160px",
                overflow: "hidden"
              }}>
                {/* All option */}
                <div
                  onClick={() => {
                    setSelectedType("All");
                    setTypeDropdownOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: selectedType === "All" ? "#2563eb" : "#1f2937",
                    backgroundColor: selectedType === "All" ? "#eff6ff" : "transparent",
                    borderLeft: selectedType === "All" ? "3px solid #2563eb" : "3px solid transparent",
                    paddingLeft: selectedType === "All" ? "9px" : "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== "All") {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== "All") {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span>All</span>
                  <Star
                    size={14}
                    style={{
                      color: "#9ca3af",
                      fill: "none",
                      strokeWidth: 1.5
                    }}
                  />
                </div>
                {/* By Quantity option */}
                <div
                  onClick={() => {
                    setSelectedType("By Quantity");
                    setTypeDropdownOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: selectedType === "By Quantity" ? "#2563eb" : "#1f2937",
                    backgroundColor: selectedType === "By Quantity" ? "#eff6ff" : "transparent",
                    borderLeft: selectedType === "By Quantity" ? "3px solid #2563eb" : "3px solid transparent",
                    paddingLeft: selectedType === "By Quantity" ? "9px" : "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== "By Quantity") {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== "By Quantity") {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span>By Quantity</span>
                  <Star
                    size={14}
                    style={{
                      color: "#9ca3af",
                      fill: "none",
                      strokeWidth: 1.5
                    }}
                  />
                </div>
                {/* By Value option */}
                <div
                  onClick={() => {
                    setSelectedType("By Value");
                    setTypeDropdownOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: selectedType === "By Value" ? "#2563eb" : "#1f2937",
                    backgroundColor: selectedType === "By Value" ? "#eff6ff" : "transparent",
                    borderLeft: selectedType === "By Value" ? "3px solid #2563eb" : "3px solid transparent",
                    paddingLeft: selectedType === "By Value" ? "9px" : "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== "By Value") {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== "By Value") {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span>By Value</span>
                  <Star
                    size={14}
                    style={{
                      color: "#9ca3af",
                      fill: "none",
                      strokeWidth: 1.5
                    }}
                  />
                </div>
                {/* Divider */}
                <div style={{
                  height: "1px",
                  backgroundColor: "#e5e7eb",
                  margin: "4px 0"
                }} />
                {/* New Custom View option */}
                <div
                  onClick={() => {
                    setTypeDropdownOpen(false);
                    navigate("/inventory/new-custom-view");
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#1f2937",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Plus size={14} style={{ color: "#2563eb" }} />
                  <span>New Custom View</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative z-20 flex items-center gap-2">
          <div className="relative inline-block align-top z-30" ref={periodDropdownRef}>
            <button
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="px-3 py-[5px] text-[13px] border border-gray-300 rounded-md bg-white text-gray-900 cursor-pointer flex items-center gap-2 min-w-[100px] justify-between hover:border-gray-400"
            >
              <span>Period: {selectedPeriod}</span>
              {periodDropdownOpen ? (
                <ChevronUp size={14} className="text-gray-500" />
              ) : (
                <ChevronDown size={14} className="text-gray-500" />
              )}
            </button>
            {periodDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                zIndex: 1001,
                minWidth: "160px",
                overflow: "hidden"
              }}>
                {["All", "Today", "This Week", "This Month", "This Quarter", "This Year"].map((option) => (
                  <div
                    key={option}
                    onClick={() => {
                      setSelectedPeriod(option);
                      setPeriodDropdownOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: selectedPeriod === option ? "#2563eb" : "#1f2937",
                      backgroundColor: selectedPeriod === option ? "#eff6ff" : "transparent",
                      borderLeft: selectedPeriod === option ? "3px solid #2563eb" : "3px solid transparent",
                      paddingLeft: selectedPeriod === option ? "9px" : "12px"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPeriod !== option) {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPeriod !== option) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Content */}
      <InventoryAdjustments
        rows={sortedAdjustments}
        onRowClick={(adjustment) => {
          if (selectedItems.length === 0) {
            setSelectedAdjustment(adjustment);
          }
        }}
        onCreateNew={() => navigate("/inventory/new")}
        selectedItems={selectedItems}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        onSort={(field) => {
          if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          } else {
            setSortBy(field);
            setSortOrder("asc");
          }
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={loading}
        currentTypeFilter={selectedType}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Adjustment{deleteConfirmModal.count > 1 ? 's' : ''}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete {deleteConfirmModal.count} adjustment{deleteConfirmModal.count > 1 ? 's' : ''}?
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmModal({ open: false, count: 0, itemIds: [] })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSelected}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      <ExportInventoryAdjustmentsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}

export default function InventoryPage() {
  return <InventoryPageContent />;
}
