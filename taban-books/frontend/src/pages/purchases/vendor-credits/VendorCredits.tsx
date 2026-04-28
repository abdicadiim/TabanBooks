import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Play, Star, X, ArrowUpDown, Search, Trash2, Download, Upload, Settings, RefreshCw, ChevronRight, CreditCard, GripVertical, User, Users, Lock, Check, FileText, Copy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, EyeOff, Info, SlidersHorizontal } from "lucide-react";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import SearchItemsModal from "../shared/SearchItemsModal";
import ExportVendorCredits from "./ExportVendorCredits";
import { settingsAPI, vendorCreditsAPI } from "../../../services/api";
import toast from "react-hot-toast";
import { downloadVendorCreditsPaperPdf } from "./vendorCreditPdf";
import emptyIllustration from "../../../assets/vendor_credits_empty.png";

const VENDOR_CREDITS_LIST_CACHE_KEY = "vendor-credits-list-cache";

const readCachedVendorCredits = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(VENDOR_CREDITS_LIST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse cached vendor credits:", error);
    return [];
  }
};

export default function VendorCredits() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('date'); // 'date', 'vendor', 'amount', 'status', 'creditNote'
  const [sortDirection, setSortDirection] = useState('desc');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showPaymentModeModal, setShowPaymentModeModal] = useState(false);
  const sortSubmenuRef = useRef<any>(null);
  const importSubmenuRef = useRef<any>(null);
  const exportSubmenuRef = useRef<any>(null);
  const [selectedView, setSelectedView] = useState("All");
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [vendorCredits, setVendorCredits] = useState<any[]>(() => readCachedVendorCredits());
  const [hasLoadedInitialCredits, setHasLoadedInitialCredits] = useState(() => readCachedVendorCredits().length > 0);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [selectedCredits, setSelectedCredits] = useState<any[]>([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSearchFormModal, setShowSearchFormModal] = useState(false);
  const [searchModalData, setSearchModalData] = useState({
    creditNoteNumber: "",
    dateRangeFrom: "",
    dateRangeTo: "",
    itemName: "",
    totalRangeFrom: "",
    totalRangeTo: "",
    account: "",
    projectName: "",
    billingAddressType: "Billing and Shipping",
    attention: "",
    addressLine: "",
    referenceNumber: "",
    status: "",
    itemDescription: "",
    notes: "",
    vendor: "",
    taxExemptions: "",
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalType, setExportModalType] = useState<any>(null); // 'vendor-credits', 'applied', 'current-view', 'refunds'
  const dropdownRef = useRef<any>(null);
  const moreMenuRef = useRef<any>(null);

  const loadVendorCredits = async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const response = await vendorCreditsAPI.getAll();
      if (response && response.data) {
        setVendorCredits(response.data);
      } else {
        setVendorCredits([]);
      }
    } catch (error) {
      console.error("Error loading vendor credits:", error);
      toast.error("Failed to load vendor credits");
      setVendorCredits([]);
    } finally {
      setHasLoadedInitialCredits(true);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await loadVendorCredits();
    setSelectedCredits([]);
  };

  const loadOrganizationInfo = async () => {
    try {
      const response = await settingsAPI.getOrganizationProfile();
      if (response && response.data) {
        setOrganizationInfo(response.data);
      }
    } catch (error) {
      console.error("Error loading organization profile:", error);
    }
  };

  useEffect(() => {
    loadVendorCredits();
    loadOrganizationInfo();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(VENDOR_CREDITS_LIST_CACHE_KEY, JSON.stringify(vendorCredits));
    } catch (error) {
      console.error("Failed to cache vendor credits:", error);
    }
  }, [vendorCredits]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === "Escape" && selectedCredits.length > 0) {
        setSelectedCredits([]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCredits.length]);

  const handleSelectAll = (e: any) => {
    if (e.target.checked) {
      setSelectedCredits(filteredCredits.map((credit: any) => credit.id));
    } else {
      setSelectedCredits([]);
    }
  };

  const handleSelectItem = (creditId: any, e: any) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedCredits([...selectedCredits, creditId]);
    } else {
      setSelectedCredits(selectedCredits.filter((id: any) => id !== creditId));
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCredits.length} vendor credit(s)?`)) {
      try {
        await vendorCreditsAPI.bulkDelete(selectedCredits);
        toast.success("Vendor credit(s) deleted successfully");
        loadVendorCredits();
        setSelectedCredits([]);
      } catch (error: any) {
        console.error("Error deleting vendor credits:", error);
        toast.error(error.message || "Failed to delete vendor credits");
      }
    }
  };

  const handleBulkUpdate = () => {
    if (selectedCredits.length === 0) {
      alert("Please select at least one vendor credit to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const handleBulkUpdateSubmit = async (field: any, value: any) => {
    const selectedIds = selectedCredits.map(String);
    if (!selectedIds.length) return;

    const fieldMap: Record<string, string> = {
      creditNote: "vendorCreditNumber",
      date: "date",
      notes: "notes",
      vendorName: "vendorName",
      currency: "currency",
      status: "status",
    };
    const targetField = fieldMap[field] || field;

    try {
      await Promise.all(
        selectedIds.map((creditId: any) =>
          vendorCreditsAPI.update(creditId, {
            [targetField]:
              targetField === "date"
                ? new Date(value).toISOString()
                : value,
          })
        )
      );
      await loadVendorCredits(true);
      setSelectedCredits([]);
      toast.success(`Updated ${selectedIds.length} vendor credit(s)`);
      window.dispatchEvent(new Event("vendorCreditsUpdated"));
    } catch (error: any) {
      console.error("Error bulk updating vendor credits:", error);
      toast.error(error?.message || "Failed to bulk update vendor credits");
    }
  };

  const vendorCreditFieldOptions = useMemo(() => {
    const vendorOptions = Array.from(
      new Set(
        (vendorCredits || [])
          .map((credit: any) => String(credit?.vendorName || credit?.vendor || "").trim())
          .filter(Boolean)
      )
    ).map((name: any) => ({ label: name, value: name }));

    const currencyOptions = Array.from(
      new Set(
        (vendorCredits || [])
          .map((credit: any) => String(credit?.currency || "").trim().toUpperCase())
          .filter(Boolean)
      )
    ).map((code: any) => ({ label: code, value: code }));

    return [
      { value: "creditNote", label: "Credit Note #", type: "text", placeholder: "Enter credit note number" },
      { value: "date", label: "Date", type: "date" },
      {
        value: "vendorName",
        label: "Vendor",
        type: "select",
        options: vendorOptions,
      },
      {
        value: "currency",
        label: "Currency",
        type: "select",
        options: currencyOptions.length > 0 ? currencyOptions : [{ label: "USD", value: "USD" }],
      },
      {
        value: "status",
        label: "Status",
        type: "select",
        options: ["draft", "open", "applied", "closed", "refunded", "cancelled"],
      },
      { value: "notes", label: "Notes", type: "text", placeholder: "Enter notes" },
    ];
  }, [vendorCredits]);

  const handleDownloadSelectedPdf = async () => {
    if (selectedCredits.length === 0) {
      alert("Please select at least one vendor credit.");
      return;
    }

    const selectedSet = new Set(selectedCredits.map(String));
    const records = filteredCredits.filter((credit: any) => selectedSet.has(String(credit.id || credit._id)));
    if (!records.length) {
      alert("No selected vendor credits found.");
      return;
    }

    try {
      await downloadVendorCreditsPaperPdf(records as any[], organizationInfo);
    } catch (error: any) {
      console.error("Error generating vendor credit PDF:", error);
      toast.error(error?.message || "Failed to generate PDF");
    }
  };

  const handleUserSelect = (id: any) => {
    setSelectedCredits([]);
  };

  const handleClearSelection = () => {
    setSelectedCredits([]);
  };

  // Format date
  const formatDate = (dateString: any) => {
    if (!dateString) return "";

    // Check if it's already an ISO string or similar
    let date;
    if (dateString.includes("T")) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString + "T00:00:00");
    }

    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount: any, currency = "CAD") => {
    const symbol = currency === "CAD" ? "$" : currency === "USD" ? "$" : currency === "AWG" ? "AWG" : currency;
    const formattedAmount = parseFloat(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol}${formattedAmount}`;
  };

  // Sort options for vendor credits
  const sortOptions = ['Credit Note #', 'Date', 'Vendor Name', 'Amount', 'Status'];

  // Sorting function
  const getSortedCredits = (creditsList: any) => {
    const sorted = [...creditsList];

    sorted.sort((a: any, b: any) => {
      let aValue, bValue;

      switch (selectedSort) {
        case 'creditNote':
          aValue = (a.creditNote || a.id || "").toLowerCase();
          bValue = (b.creditNote || b.id || "").toLowerCase();
          break;
        case 'date':
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case 'vendor':
          aValue = (a.vendorName || a.vendor || "").toLowerCase();
          bValue = (b.vendorName || b.vendor || "").toLowerCase();
          break;
        case 'amount':
          aValue = parseFloat(a.amount || a.balance || 0);
          bValue = parseFloat(b.amount || b.balance || 0);
          break;
        case 'status':
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  };

  // Filter and sort vendor credits (memoized)
  const filteredCredits = useMemo(() => {
    const normalizeStatus = (value: any) => String(value || "").trim().toLowerCase();
    const filtered = vendorCredits.filter((credit: any) => {
      const creditStatus = normalizeStatus(credit.status);
      if (selectedView === "All") return true;
      if (selectedView === "Draft") return creditStatus === "draft";
      if (selectedView === "Open") return creditStatus === "open";
      if (selectedView === "Closed") return creditStatus === "closed";
      if (selectedView === "Void") return creditStatus === "void";
      if (selectedView === "Pending Approval") return creditStatus === "pending approval";
      return true;
    });

    return getSortedCredits(filtered);
  }, [vendorCredits, selectedView, selectedSort, sortDirection]);

  // Handle sort selection
  const handleSortSelect = (sortOption: any) => {
    const sortMap: any = {
      'Credit Note #': 'creditNote',
      'Date': 'date',
      'Vendor Name': 'vendor',
      'Amount': 'amount',
      'Status': 'status'
    };
    const sortKey = (sortMap)[sortOption] || 'date';

    if (selectedSort === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSelectedSort(sortKey);
      setSortDirection('desc');
    }
    setSortSubmenuOpen(false);
  };

  // Export function
  const exportVendorCredits = (format: any, creditsToExport: any) => {
    const exportData = creditsToExport.slice(0, 25000);

    if (format === "csv") {
      const headers = ["Credit Note #", "Date", "Vendor Name", "Amount", "Currency", "Status"];

      let csvContent = headers.join(",") + "\n";

      exportData.forEach((credit: any) => {
        const row = [
          `"${(credit.creditNote || credit.id || "").replace(/"/g, '""')}"`,
          `"${(credit.date || "").replace(/"/g, '""')}"`,
          `"${(credit.vendorName || credit.vendor || "").replace(/"/g, '""')}"`,
          credit.amount || credit.balance || "0.00",
          `"${(credit.currency || "").replace(/"/g, '""')}"`,
          `"${(credit.status || "").replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `vendor_credits_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "json") {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vendor_credits_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen]);

  const styles: any = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
    },
    header: {
      padding: "18px 0 20px 12px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flex: 1,
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    headerTitle: {
      fontSize: "17px",
      fontWeight: "700",
      color: "#1f2937",
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: 0,
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "180px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "block",
      width: "100%",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    newButton: {
      padding: "9px 18px",
      backgroundColor: "#22c55e",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "background-color 0.2s",
      boxShadow: "none",
    },
    moreButton: {
      padding: "8px",
      color: "#4b5563",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "34px",
      height: "34px",
    },
    moreDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 100,
      padding: "4px 0",
    },
    moreDropdownItem: {
      display: "flex",
      alignItems: "center",
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
      gap: "8px",
    },
    moreDropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    content: {
      padding: "48px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 200px)",
      backgroundColor: "#ffffff",
    },
    videoCard: {
      marginBottom: "32px",
      width: "100%",
      maxWidth: "700px",
    },
    videoThumbnail: {
      position: "relative",
      width: "100%",
      paddingBottom: "40%",
      backgroundColor: "#f3f4f6",
      borderRadius: "8px",
      overflow: "hidden",
    },
    videoPattern: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        radial-gradient(circle at 10% 20%, rgba(200, 200, 200, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(200, 200, 200, 0.15) 0%, transparent 40%),
        linear-gradient(135deg, transparent 30%, rgba(200, 200, 200, 0.08) 50%, transparent 70%),
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(200, 200, 200, 0.03) 10px, rgba(200, 200, 200, 0.03) 20px)
      `,
      backgroundSize: "150px 150px, 180px 180px, 100px 100px, 40px 40px",
    },
    videoOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "32px",
    },
    videoLeft: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    playButton: {
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      backgroundColor: "#10b981",
      color: "#ffffff",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      transition: "transform 0.2s",
    },
    videoRight: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
    },
    videoLogo: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    logoIcon: {
      width: "32px",
      height: "32px",
      borderRadius: "6px",
      backgroundColor: "#156372",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      fontWeight: "700",
      position: "relative",
    },
    logoIconLines: {
      position: "absolute",
      bottom: "4px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "20px",
      height: "2px",
      backgroundColor: "#ffffff",
      borderRadius: "1px",
    },
    logoText: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    },
    logoTabanBooks: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#111827",
      lineHeight: 1.2,
    },
    logoBooks: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#111827",
      lineHeight: 1.2,
    },
    videoTitle: {
      fontSize: "14px",
      color: "#6b7280",
      textAlign: "right",
    },
    mainHeading: {
      fontSize: "28px",
      fontWeight: "600",
      color: "#111827",
      margin: "0 0 16px 0",
      textAlign: "center",
    },
    description: {
      fontSize: "16px",
      color: "#6b7280",
      textAlign: "center",
      maxWidth: "600px",
      margin: "0 0 32px 0",
      lineHeight: 1.6,
    },
    actions: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    },
    createButton: {
      padding: "12px 24px",
      fontSize: "14px",
      fontWeight: "600",
      backgroundColor: "#156372",
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      transition: "background-color 0.2s",
    },
    importLink: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      textDecoration: "none",
    },
    tableContainer: {
      padding: "26px 0 0",
    },
    tableWrapper: {
      overflowX: "auto",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      backgroundColor: "#ffffff",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#ffffff",
    },
    tableHeader: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "14px 14px",
      textAlign: "left",
      fontSize: "11px",
      fontWeight: "600",
      color: "#677489",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      letterSpacing: "0.02em",
    },
    tableRow: {
      borderBottom: "1px solid #e5e7eb",
      cursor: "pointer",
    },
    tableCell: {
      padding: "14px 14px",
      fontSize: "13px",
      color: "#1f2937",
      whiteSpace: "nowrap",
      lineHeight: 1.35,
    },
    tableCheckbox: {
      width: "17px",
      height: "17px",
      cursor: "pointer",
      accentColor: "#2563eb",
    },
    statusBadge: {
      padding: 0,
      borderRadius: 0,
      fontSize: "13px",
      fontWeight: "500",
      display: "inline-block",
      background: "transparent",
    },
    skeletonCell: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonCheckbox: {
      width: "16px",
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
  };

  return (
    <div style={styles.container}>
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />
      {selectedCredits.length > 0 && (
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <button
              onClick={handleBulkUpdate}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              Bulk Update
            </button>
            <button
              onClick={handleDownloadSelectedPdf}
              style={{
                padding: "6px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
              title="Download PDF"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }}
            >
              Delete
            </button>
            <div style={{
              width: "1px",
              height: "20px",
              backgroundColor: "#e5e7eb",
              marginLeft: "4px"
            }}></div>
            <span style={{
              fontSize: "14px",
              color: "#374151",
              fontWeight: "500",
              marginLeft: "8px"
            }}>
              {selectedCredits.length} Selected
            </span>
          </div>
          <button
            onClick={handleClearSelection}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              fontSize: "14px",
              color: "#374151",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e5e7eb";
              e.currentTarget.style.borderRadius = "4px";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span>Esc</span>
            <X size={16} style={{ color: "#156372" }} />
          </button>
        </div>
      )}
      {/* Header */}
      {selectedCredits.length === 0 && (
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  style={styles.headerTitle}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedView === "All" ? "All Vendor Credits" : selectedView}
                  {dropdownOpen ? <ChevronUp size={16} style={{ color: "#156372" }} /> : <ChevronDown size={16} style={{ color: "#156372" }} />}
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    <button
                      style={{
                        ...styles.dropdownItem,
                        ...(selectedView === "All" ? { borderLeft: "3px solid #156372" } : {}),
                      }}
                      onMouseEnter={(e) => {
                        if (selectedView !== "All") {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedView !== "All") {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                      onClick={() => {
                        setSelectedView("All");
                        setDropdownOpen(false);
                      }}
                    >
                      All
                    </button>
                    {["Draft", "Pending Approval", "Open", "Closed", "Void"].map((view) => (
                      <button
                        key={view}
                        style={styles.dropdownItem}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        onClick={() => {
                          setSelectedView(view);
                          setDropdownOpen(false);
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <span>{view}</span>
                          <Star size={16} style={{ color: "#9ca3af" }} />
                        </div>
                      </button>
                    ))}

                  </div>
                )}
              </div>
            </div>

            <div style={styles.headerRight}>
              <button
                style={styles.newButton}
                onClick={() => {
                  navigate("/purchases/vendor-credits/new");
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
              >
                <Plus size={16} />
                New
              </button>
              <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
                <button
                  style={styles.moreButton}
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={styles.moreDropdown}>
                    {/* Sort by */}
                    <div style={{ position: "relative" }} ref={sortSubmenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortSubmenuOpen(!sortSubmenuOpen);
                        }}
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: sortSubmenuOpen ? "#e3f2fd" : "transparent",
                          color: sortSubmenuOpen ? "#1976d2" : "inherit",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          if (!sortSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sortSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <ArrowUpDown size={16} style={{ color: "#1976d2" }} />
                          <span>Sort by</span>
                        </div>
                        <ChevronRight size={16} style={{ color: "#1976d2" }} />
                      </button>
                      {sortSubmenuOpen && (
                        <div style={{
                          position: "absolute",
                          top: 0,
                          right: "100%",
                          marginRight: "8px",
                          backgroundColor: "#fff",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          minWidth: "180px",
                          border: "1px solid #e5e7eb",
                          zIndex: 1001,
                          padding: "4px 0"
                        }}>
                          {sortOptions.map((option) => {
                            const sortMap: any = {
                              'Credit Note #': 'creditNote',
                              'Date': 'date',
                              'Vendor Name': 'vendor',
                              'Amount': 'amount',
                              'Status': 'status'
                            };
                            const sortKey = sortMap[option];
                            const isSelected = selectedSort === sortKey;

                            return (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSortSelect(option);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 16px",
                                  fontSize: "14px",
                                  color: "#111827",
                                  cursor: "pointer",
                                  border: "none",
                                  background: isSelected ? "#e3f2fd" : "transparent",
                                  textAlign: "left",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between"
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "#f3f4f6";
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
                                  <span style={{ fontSize: "12px", color: "#1976d2" }}>
                                    {sortDirection === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Import */}
                    <div style={{ position: "relative" }} ref={importSubmenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportSubmenuOpen(!importSubmenuOpen);
                        }}
                        style={{
                          ...styles.moreDropdownItem,
                          justifyContent: "space-between",
                          backgroundColor: importSubmenuOpen ? "#f3f4f6" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (!importSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!importSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Download size={16} style={{ color: "#6b7280" }} />
                          <span>Import</span>
                        </div>
                        <ChevronRight size={16} style={{ color: "#6b7280" }} />
                      </button>
                      {importSubmenuOpen && (
                        <div style={{
                          position: "absolute",
                          top: 0,
                          right: "100%",
                          marginRight: "8px",
                          backgroundColor: "#fff",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          minWidth: "220px",
                          border: "1px solid #e5e7eb",
                          zIndex: 1001,
                          padding: "4px 0"
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle Import Applied Vendor Credits
                              navigate("/purchases/vendor-credits/import/applied");
                              setImportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Import Applied Vendor Credits
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle Import Refunds
                              navigate("/purchases/vendor-credits/import/refunds");
                              setImportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Import Refunds
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle Import Vendor Credits
                              navigate("/purchases/vendor-credits/import");
                              setImportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Import Vendor Credits
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Export */}
                    <div style={{ position: "relative" }} ref={exportSubmenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportSubmenuOpen(!exportSubmenuOpen);
                        }}
                        style={{
                          ...styles.moreDropdownItem,
                          justifyContent: "space-between",
                          backgroundColor: exportSubmenuOpen ? "#f3f4f6" : "transparent"
                        }}
                        onMouseEnter={(e) => {
                          if (!exportSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!exportSubmenuOpen) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Upload size={16} style={{ color: "#6b7280" }} />
                          <span>Export</span>
                        </div>
                        <ChevronRight size={16} style={{ color: "#6b7280" }} />
                      </button>
                      {exportSubmenuOpen && (
                        <div style={{
                          position: "absolute",
                          top: 0,
                          right: "100%",
                          marginRight: "8px",
                          backgroundColor: "#fff",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          minWidth: "240px",
                          border: "1px solid #e5e7eb",
                          zIndex: 1001,
                          padding: "4px 0"
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportModalType('vendor-credits');
                              setShowExportModal(true);
                              setExportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Export Vendor Credits
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportModalType('applied');
                              setShowExportModal(true);
                              setExportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Export Applied Vendor Credits
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportModalType('current-view');
                              setShowExportModal(true);
                              setExportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Export Current View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportModalType('refunds');
                              setShowExportModal(true);
                              setExportSubmenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              background: "none",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Export Refunds
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preferences */}
                    <button
                      style={styles.moreDropdownItem}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuOpen(false);
                        navigate("/settings/vendor-credits");
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Settings size={16} style={{ color: "#6b7280" }} />
                        <span>Preferences</span>
                      </div>
                    </button>

                    {/* Payment Mode */}
                    <button
                      style={styles.moreDropdownItem}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPaymentModeModal(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <CreditCard size={16} style={{ color: "#6b7280" }} />
                        <span>Payment Mode</span>
                      </div>
                    </button>

                    {/* Refresh List */}
                    <button
                      style={styles.moreDropdownItem}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuOpen(false);
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <RefreshCw
                          size={16}
                          style={{
                            color: "#6b7280",
                            animation: isRefreshing ? "spin 1s linear infinite" : "none"
                          }}
                        />
                        <span>Refresh List</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
<div style={styles.tableContainer}>
        {!hasLoadedInitialCredits ? null : filteredCredits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center max-w-2xl mx-auto animate-in fade-in duration-700">
            <div className="mb-8 relative group cursor-pointer" onClick={() => console.log("Video tutorial clicked")}>
              <div className="relative overflow-hidden rounded-xl shadow-xl border-4 border-white bg-white">
                <img 
                  src={emptyIllustration} 
                  alt="How to create a vendor credit" 
                  className="w-[320px] h-auto object-cover opacity-90 transition-opacity group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 bg-[#156372] rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(21,99,114,0.3)] transition-all group-hover:scale-110 group-hover:rotate-6">
                    <Play size={24} fill="white" className="ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/10 to-transparent p-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-white/20 backdrop-blur-md flex items-center justify-center">
                       <FileText size={14} className="text-white" />
                    </div>
                    <span className="text-white font-medium text-xs drop-shadow-sm">How to create a vendor credit</span>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 -bottom-4 -right-4 w-24 h-24 bg-teal-50 rounded-full blur-2xl opacity-50" />
              <div className="absolute -z-10 -top-4 -left-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-50" />
            </div>

            <h2 className="text-[19px] font-bold text-gray-900 mb-2 tracking-tight">You deserve some credit too.</h2>
            <p className="text-[13px] text-gray-500 mb-6 max-w-[400px] leading-relaxed">
              Create vendor credits and apply them to multiple bills when buying stuff from your vendor. Use them to track returns and overpayments.
            </p>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => navigate("/purchases/vendor-credits/new")}
                className="bg-[#156372] hover:bg-[#0D4A52] text-white font-bold py-2.5 px-6 rounded-lg uppercase text-[12px] tracking-widest shadow-lg shadow-[#156372]/10 transform transition-all active:scale-95"
              >
                Create Vendor Credits
              </button>
              <button
                onClick={() => navigate("/purchases/vendor-credits/import")}
                className="text-[#156372] hover:text-[#0D4A52] text-[13px] font-medium"
              >
                Import Vendor Credits
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={{ ...styles.tableHeaderCell, width: "50px", paddingLeft: "18px", paddingRight: "8px" }}>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3b82f6",
                      cursor: "pointer",
                    }}
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                </th>
                <th style={{ ...styles.tableHeaderCell, width: "44px", paddingLeft: "8px", paddingRight: "8px" }}>
                  <input
                    type="checkbox"
                    checked={selectedCredits.length === filteredCredits.length && filteredCredits.length > 0}
                    onChange={handleSelectAll}
                    style={styles.tableCheckbox}
                  />
                </th>
                <th style={styles.tableHeaderCell}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    DATE
                    <ArrowUpDown size={14} style={{ color: "#9ca3af" }} />
                  </div>
                </th>
                <th style={styles.tableHeaderCell}>LOCATION</th>
                <th style={styles.tableHeaderCell}>CREDIT NOTE#</th>
                <th style={styles.tableHeaderCell}>REFERENCE NUMBER</th>
                <th style={styles.tableHeaderCell}>VENDOR NAME</th>
                <th style={styles.tableHeaderCell}>STATUS</th>
                <th style={{ ...styles.tableHeaderCell, textAlign: "right" }}>AMOUNT</th>
                <th style={{ ...styles.tableHeaderCell, textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                    BALANCE
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        color: "#9ca3af",
                      }}
                      onClick={() => setShowSearchFormModal(true)}
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCredits.map((credit: any) => (
                  <tr
                    key={credit.id}
                    style={{
                      ...styles.tableRow,
                      ...(selectedCredits.includes(credit.id) ? { backgroundColor: "#eff6ff" } : {}),
                    }}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox or if items are selected
                      if ((e.target as any).type !== "checkbox" && selectedCredits.length === 0) {
                        navigate(`/purchases/vendor-credits/${credit.id}`, {
                          state: {
                            vendorCredit: credit,
                            vendorCredits: filteredCredits,
                          },
                        });
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedCredits.includes(credit.id)) {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedCredits.includes(credit.id)) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <td style={{ ...styles.tableCell, width: "44px", paddingLeft: "12px", paddingRight: "8px" }} />
                    <td style={styles.tableCell} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCredits.includes(credit.id)}
                        onChange={(e) => handleSelectItem(credit.id, e)}
                        style={styles.tableCheckbox}
                      />
                    </td>
                    <td style={styles.tableCell}>{formatDate(credit.date)}</td>
                    <td style={styles.tableCell}>{credit.locationName || credit.location || credit.warehouseLocation || "Head Office"}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/vendor-credits/${credit.id}`, {
                            state: {
                              vendorCredit: credit,
                              vendorCredits: filteredCredits,
                            },
                          });
                        }}
                      >
                        {credit.creditNote}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{credit.referenceNumber || "-"}</td>
                    <td style={styles.tableCell}>{credit.vendorName}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(String(credit.status || "").toLowerCase() === "open"
                            ? { color: "#2563eb" }
                            : String(credit.status || "").toLowerCase() === "closed"
                              ? { color: "#10b981" }
                              : String(credit.status || "").toLowerCase() === "void"
                                ? { color: "#ef4444" }
                                : { color: "#6b7280" }),
                        }}
                      >
                        {credit.status ? credit.status.toUpperCase() : "DRAFT"}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: "right" }}>
                      {formatCurrency(credit.amount, credit.currency)}
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: "right" }}>
                      {formatCurrency(credit.balance, credit.currency)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
)}
    </div>

      {/* New Custom View Modal */}
      {showCustomViewModal && (
        <NewCustomViewModal
          onClose={() => setShowCustomViewModal(false)}
          onSave={(customView: any) => {
            // Handle saving custom view
            console.log("Custom view saved:", customView);
            setShowCustomViewModal(false);
          }}
        />
      )}

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Vendor Credits"
        fieldOptions={vendorCreditFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="vendor credits"
      />

      {/* Search Items Modal */}
      <SearchItemsModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        items={vendorCredits}
        onItemSelect={(item: any) => {
          navigate(`/purchases/vendor-credits/${item.id}`, {
            state: {
              vendorCredit: item,
              vendorCredits: filteredCredits,
            },
          });
        }}
        searchFields={["creditNote", "vendorName", "referenceNumber"]}
        placeholder="Search vendor credits by note, vendor, or reference..."
      />

      {/* Search Form Modal */}
      {showSearchFormModal && typeof document !== 'undefined' && document.body && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchFormModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "650px",
              maxHeight: "85vh",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                    Search
                  </label>
                  <select
                    style={{
                      padding: "6px 28px 6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      outline: "none",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                    }}
                  >
                    <option value="vendor-credits">Vendor Credits</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                    Filter
                  </label>
                  <select
                    style={{
                      padding: "6px 28px 6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      outline: "none",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                    }}
                  >
                    <option value="all">All</option>
                    <option value="open">Open</option>
                    <option value="applied">Applied</option>
                    <option value="void">Void</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowSearchFormModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} style={{ color: "#156372" }} strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", gap: "20px" }}>
                {/* Left Column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Credit Note# */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Credit Note#
                    </label>
                    <input
                      type="text"
                      value={searchModalData.creditNoteNumber}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, creditNoteNumber: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #156372",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Date Range */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Date Range
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="dd/MM/yyyy"
                        value={searchModalData.dateRangeFrom}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <span style={{ color: "#6b7280" }}>-</span>
                      <input
                        type="text"
                        placeholder="dd/MM/yyyy"
                        value={searchModalData.dateRangeTo}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Item Name */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Item Name
                    </label>
                    <select
                      value={searchModalData.itemName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, itemName: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 28px 8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                      }}
                    >
                      <option value="">Select an item</option>
                    </select>
                  </div>

                  {/* Total Range */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Total Range
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        value={searchModalData.totalRangeFrom}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFrom: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <span style={{ color: "#6b7280" }}>-</span>
                      <input
                        type="text"
                        value={searchModalData.totalRangeTo}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeTo: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Account */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Account
                    </label>
                    <select
                      value={searchModalData.account}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, account: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 28px 8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                      }}
                    >
                      <option value="">Select an account</option>
                    </select>
                  </div>

                  {/* Project Name */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Project Name
                    </label>
                    <select
                      value={searchModalData.projectName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 28px 8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                      }}
                    >
                      <option value="">Select a project</option>
                    </select>
                  </div>

                  {/* Billing Address */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Billing Address
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <select
                        value={searchModalData.attention}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, attention: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Attention</option>
                      </select>
                      <input
                        type="text"
                        value={searchModalData.addressLine}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, addressLine: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <a
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        style={{
                          fontSize: "13px",
                          color: "#156372",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                      >
                        + Address Line
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                  {/* Reference# */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Reference#
                    </label>
                    <input
                      type="text"
                      value={searchModalData.referenceNumber}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Status
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      />
                    </div>
                  </div>

                  {/* Item Description */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Item Description
                    </label>
                    <input
                      type="text"
                      value={searchModalData.itemDescription}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescription: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Notes
                    </label>
                    <input
                      type="text"
                      value={searchModalData.notes}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Vendor */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Vendor
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={searchModalData.vendor}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, vendor: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      />
                    </div>
                  </div>

                  {/* Tax Exemptions */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Tax Exemptions
                    </label>
                    <select
                      value={searchModalData.taxExemptions}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, taxExemptions: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 28px 8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                      }}
                    >
                      <option value="">Select a Tax Exemption</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  setShowSearchFormModal(false);
                  setSearchModalData({
                    creditNoteNumber: "",
                    dateRangeFrom: "",
                    dateRangeTo: "",
                    itemName: "",
                    totalRangeFrom: "",
                    totalRangeTo: "",
                    account: "",
                    projectName: "",
                    billingAddressType: "Billing and Shipping",
                    attention: "",
                    addressLine: "",
                    referenceNumber: "",
                    status: "",
                    itemDescription: "",
                    notes: "",
                    vendor: "",
                    taxExemptions: "",
                  });
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log("Search with:", searchModalData);
                  setShowSearchFormModal(false);
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  backgroundColor: "#156372",
                  color: "#ffffff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0D4A52";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#156372";
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
          onClick={() => setShowPreferencesModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Vendor Credit Preferences
              </h2>
              <button
                onClick={() => setShowPreferencesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} style={{ color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Default Currency
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                defaultValue="CAD"
              >
                <option value="CAD">CAD ($)</option>
                <option value="USD">USD ($)</option>
                <option value="AWG">AWG</option>
                <option value="USD">KES</option>
              </select>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowPreferencesModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreferencesModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#156372',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && exportModalType && typeof document !== 'undefined' && document.body && createPortal(
        <ExportVendorCredits
          onClose={() => {
            setShowExportModal(false);
            setExportModalType(null);
          }}
          exportType={exportModalType}
          data={exportModalType === 'current-view' ? filteredCredits : vendorCredits}
        />,
        document.body
      )}

      {/* Payment Mode Modal */}
      {showPaymentModeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
          onClick={() => setShowPaymentModeModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Payment Mode
              </h2>
              <button
                onClick={() => setShowPaymentModeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} style={{ color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                Configure payment modes for vendor credits. Payment modes determine how credits are applied to bills.
              </p>
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#111827',
                  margin: 0
                }}>
                  Payment mode configuration will be available in a future update.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowPaymentModeModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewCustomViewModal({ onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    availableColumns: [
      "Vendor Credits Account",
      "Reference#",
      "Item Description",
      "Notes",
      "Item Name",
      "Tax",
      "Project Name",
      "Currency",
      "Transaction Posting Date",
    ],
    selectedColumns: ["Date", "CreditNote#", "Vendor Name", "Vendor Credits Status", "Vendor Credit Amount"],
    visibility: "Only Me",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [userType, setUserType] = useState("Users");
  const [selectedUserInput, setSelectedUserInput] = useState("");
  const [selectedUsersList, setSelectedUsersList] = useState<any[]>([]);
  const [isUserTypeDropdownOpen, setIsUserTypeDropdownOpen] = useState(false);
  const userTypeDropdownRef = useRef<any>(null);

  // Required columns that cannot be removed
  const requiredColumns = ["Date", "CreditNote#", "Vendor Name", "Vendor Credits Status", "Vendor Credit Amount"];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (userTypeDropdownRef.current && !(userTypeDropdownRef.current as any).contains(event.target)) {
        setIsUserTypeDropdownOpen(false);
      }
    };

    if (isUserTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserTypeDropdownOpen]);

  const handleAddUser = () => {
    if (selectedUserInput.trim()) {
      setSelectedUsersList([...selectedUsersList, selectedUserInput.trim()]);
      setSelectedUserInput("");
    }
  };

  const handleRemoveUser = (index: any) => {
    setSelectedUsersList(selectedUsersList.filter((_, i) => i !== index));
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id: any, field: any, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      criteria: prev.criteria.map((c: any) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCriterion = () => {
    setFormData((prev: any) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          id: Date.now(),
          field: "",
          comparator: "",
          value: "",
        },
      ],
    }));
  };

  const removeCriterion = (id: any) => {
    setFormData((prev: any) => ({
      ...prev,
      criteria: prev.criteria.filter((c: any) => c.id !== id),
    }));
  };

  const moveColumnToSelected = (column: any) => {
    setFormData((prev: any) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((c: any) => c !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column: any) => {
    // Don't allow removing required columns
    if (requiredColumns.includes(column)) {
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      availableColumns: [...prev.availableColumns, column],
      selectedColumns: prev.selectedColumns.filter((c: any) => c !== column),
    }));
  };

  // Vendor credit fields for criteria
  const vendorCreditFields = [
    "CreditNote#",
    "Date",
    "Vendor Credits Status",
    "Vendor Credits Account",
    "Vendor Credit Amount",
    "Reference#",
    "Item Description",
    "Notes",
    "Vendor Name",
    "Item Name",
    "Tax",
    "Project Name",
    "Currency",
    "Transaction Posting Date",
  ];

  // Comparator options
  const comparators = [
    "is",
    "is not",
    "contains",
    "does not contain",
    "starts with",
    "ends with",
    "is empty",
    "is not empty",
  ];

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSave(formData);
  };

  const filteredAvailableColumns = formData.availableColumns.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalStyles: any = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      width: "100%",
      maxWidth: "1000px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#6b7280",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      padding: "32px",
      overflowY: "auto",
      flex: 1,
    },
    section: {
      marginBottom: "32px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "16px",
    },
    nameRow: {
      display: "flex",
      gap: "16px",
      alignItems: "flex-end",
      marginBottom: "8px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    nameInput: {
      flex: 1,
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
    },
    input: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      fontFamily: "inherit",
    },
    favoriteCheckbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      paddingBottom: "8px",
      cursor: "pointer",
    },
    criteriaRow: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
      marginBottom: "12px",
    },
    criteriaField: {
      flex: 1,
    },
    criteriaComparator: {
      width: "160px",
    },
    criteriaValue: {
      flex: 1,
    },
    select: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      backgroundColor: "#ffffff",
      fontFamily: "inherit",
      cursor: "pointer",
    },
    removeButton: {
      padding: "4px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#156372",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    addButton: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      background: "none",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
    },
    columnsContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    columnsBox: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "12px",
      minHeight: "250px",
      maxHeight: "350px",
      overflowY: "auto",
      backgroundColor: "#ffffff",
    },
    columnItem: {
      padding: "8px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      borderRadius: "4px",
      marginBottom: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    searchInput: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      marginBottom: "12px",
      width: "100%",
    },
    actions: {
      display: "flex",
      gap: "12px",
      paddingTop: "20px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "20px",
    },
    cancelButton: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    saveButton: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>New Custom View</h2>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.body}>
          {/* Name Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.nameRow}>
              <div style={{ ...modalStyles.formGroup, ...modalStyles.nameInput }}>
                <label style={modalStyles.label}>
                  Name <span style={{ color: "#156372" }}>*</span>
                </label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.favoriteCheckbox}>
                <input
                  type="checkbox"
                  name="markAsFavorite"
                  checked={formData.markAsFavorite}
                  onChange={handleChange}
                  id="favorite"
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
                <label htmlFor="favorite" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#374151" }}>
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          {/* Define the criteria Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Define the criteria (if any)</div>
            {formData.criteria.map((criterion, index) => (
              <div key={criterion.id} style={modalStyles.criteriaRow}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#6b7280",
                }}>
                  {index + 1}
                </div>
                <select
                  style={{ ...modalStyles.select, ...modalStyles.criteriaField }}
                  value={criterion.field}
                  onChange={(e) => handleCriterionChange(criterion.id, "field", e.target.value)}
                >
                  <option value="">Select a field</option>
                  {vendorCreditFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <select
                  style={{ ...modalStyles.select, ...modalStyles.criteriaComparator }}
                  value={criterion.comparator}
                  onChange={(e) => handleCriterionChange(criterion.id, "comparator", e.target.value)}
                  disabled={!criterion.field}
                >
                  <option value="">Select a comparator</option>
                  {comparators.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  style={{ ...modalStyles.input, ...modalStyles.criteriaValue }}
                  value={criterion.value}
                  onChange={(e) => handleCriterionChange(criterion.id, "value", e.target.value)}
                  placeholder={criterion.comparator === "is empty" || criterion.comparator === "is not empty" ? "" : "Enter value"}
                  disabled={!criterion.comparator || criterion.comparator === "is empty" || criterion.comparator === "is not empty"}
                />
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={addCriterion}
                    style={{
                      padding: "4px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#156372",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Add criterion"
                  >
                    <Plus size={16} />
                  </button>
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(criterion.id)}
                      style={modalStyles.removeButton}
                      title="Remove criterion"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addCriterion} style={modalStyles.addButton}>
              + Add Criterion
            </button>
          </div>

          {/* Columns Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Columns Preference:</div>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnsBox}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}>
                  AVAILABLE COLUMNS
                </div>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <Search size={16} style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                  }} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      ...modalStyles.searchInput,
                      paddingLeft: "36px",
                      marginBottom: 0,
                    }}
                  />
                </div>
                <div>
                  {filteredAvailableColumns.map((column) => (
                    <div
                      key={column}
                      style={{
                        ...modalStyles.columnItem,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onClick={() => moveColumnToSelected(column)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af", cursor: "grab" }} />
                      <span style={{ flex: 1 }}>{column}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnsBox}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}>
                  <Check size={16} style={{ color: "#10b981" }} />
                  SELECTED COLUMNS
                </div>
                <div>
                  {formData.selectedColumns.map((column) => {
                    const isRequired = requiredColumns.includes(column);
                    return (
                      <div
                        key={column}
                        style={{
                          ...modalStyles.columnItem,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: isRequired ? "default" : "pointer",
                          opacity: isRequired ? 1 : 1,
                        }}
                        onClick={() => !isRequired && moveColumnToAvailable(column)}
                        onMouseEnter={(e) => {
                          if (!isRequired) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isRequired) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <GripVertical size={16} style={{ color: "#9ca3af", cursor: "grab" }} />
                        <span style={{ flex: 1 }}>{column}{isRequired && <span style={{ color: "#156372" }}>*</span>}</span>
                        {!isRequired && (
                          <X size={16} style={{ color: "#156372", cursor: "pointer" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Visibility Preference</div>
            <div style={{
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              padding: "12px",
              marginBottom: "12px",
            }}>
              <div style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
              }}>
                Share With
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: formData.visibility === "Only Me" ? "#eff6ff" : "#f9fafb",
                border: formData.visibility === "Only Me" ? "1px solid #156372" : "1px solid #e5e7eb",
                flex: "1",
                minWidth: "150px",
              }}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Me"
                  checked={formData.visibility === "Only Me"}
                  onChange={handleChange}
                  style={{ cursor: "pointer" }}
                />
                <Lock size={16} style={{ color: formData.visibility === "Only Me" ? "#156372" : "#6b7280" }} />
                <span style={{
                  fontSize: "14px",
                  color: formData.visibility === "Only Me" ? "#156372" : "#374151",
                  fontWeight: formData.visibility === "Only Me" ? "500" : "400",
                }}>
                  Only Me
                </span>
              </label>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: formData.visibility === "Only Selected Users & Roles" ? "#eff6ff" : "#f9fafb",
                border: formData.visibility === "Only Selected Users & Roles" ? "1px solid #156372" : "1px solid #e5e7eb",
                flex: "1",
                minWidth: "150px",
              }}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Selected Users & Roles"
                  checked={formData.visibility === "Only Selected Users & Roles"}
                  onChange={handleChange}
                  style={{ cursor: "pointer" }}
                />
                <User size={16} style={{ color: formData.visibility === "Only Selected Users & Roles" ? "#156372" : "#6b7280" }} />
                <span style={{
                  fontSize: "14px",
                  color: formData.visibility === "Only Selected Users & Roles" ? "#156372" : "#374151",
                  fontWeight: formData.visibility === "Only Selected Users & Roles" ? "500" : "400",
                }}>
                  Only Selected Users & Roles
                </span>
              </label>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: formData.visibility === "Everyone" ? "#eff6ff" : "#f9fafb",
                border: formData.visibility === "Everyone" ? "1px solid #156372" : "1px solid #e5e7eb",
                flex: "1",
                minWidth: "150px",
              }}>
                <input
                  type="radio"
                  name="visibility"
                  value="Everyone"
                  checked={formData.visibility === "Everyone"}
                  onChange={handleChange}
                  style={{ cursor: "pointer" }}
                />
                <Copy size={16} style={{ color: formData.visibility === "Everyone" ? "#156372" : "#6b7280" }} />
                <span style={{
                  fontSize: "14px",
                  color: formData.visibility === "Everyone" ? "#156372" : "#374151",
                  fontWeight: formData.visibility === "Everyone" ? "500" : "400",
                  textDecoration: formData.visibility === "Everyone" ? "none" : "underline",
                  textDecorationStyle: formData.visibility === "Everyone" ? "none" : "dashed",
                  textUnderlineOffset: "2px",
                } as any}>
                  Everyone
                </span>
              </label>
            </div>

            {/* User/Role Selection Area - Only shown when "Only Selected Users & Roles" is selected */}
            {formData.visibility === "Only Selected Users & Roles" && (
              <div style={{
                marginTop: "16px",
                padding: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ position: "relative" }} ref={userTypeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsUserTypeDropdownOpen(!isUserTypeDropdownOpen)}
                      style={{
                        padding: "8px 32px 8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: "100px",
                      }}
                    >
                      <span>{userType}</span>
                      <ChevronDown size={16} style={{ color: "#6b7280" }} />
                    </button>
                    {isUserTypeDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        zIndex: 100,
                        minWidth: "100px",
                      }}>
                        <div
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: userType === "Users" ? "#156372" : "#374151",
                            backgroundColor: userType === "Users" ? "#eff6ff" : "transparent",
                          }}
                          onClick={() => {
                            setUserType("Users");
                            setIsUserTypeDropdownOpen(false);
                          }}
                          onMouseEnter={(e) => {
                            if (userType !== "Users") {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (userType !== "Users") {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          Users
                        </div>
                        <div
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: userType === "Roles" ? "#156372" : "#374151",
                            backgroundColor: userType === "Roles" ? "#eff6ff" : "transparent",
                          }}
                          onClick={() => {
                            setUserType("Roles");
                            setIsUserTypeDropdownOpen(false);
                          }}
                          onMouseEnter={(e) => {
                            if (userType !== "Roles") {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (userType !== "Roles") {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          Roles
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Select Users"
                    value={selectedUserInput}
                    onChange={(e) => setSelectedUserInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddUser();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: "14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      outline: "none",
                    }}
                  />
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}>
                    <ArrowUp size={12} style={{ color: "#9ca3af", cursor: "pointer" }} />
                    <ArrowDown size={12} style={{ color: "#9ca3af", cursor: "pointer" }} />
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}>
                    <ArrowLeft size={12} style={{ color: "#9ca3af", cursor: "pointer" }} />
                    <ArrowRight size={12} style={{ color: "#9ca3af", cursor: "pointer" }} />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddUser}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      backgroundColor: "#156372",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "500",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
                  >
                    <Plus size={16} />
                    Add Users
                  </button>
                </div>

                {/* Selected Users/Roles List */}
                {selectedUsersList.length > 0 && (
                  <div style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #e5e7eb",
                  }}>
                    {selectedUsersList.map((user, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontSize: "14px", color: "#374151" }}>{user}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(index)}
                          style={{
                            padding: "4px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#156372",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={modalStyles.actions}>
            <button
              type="submit"
              style={modalStyles.saveButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelButton}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

