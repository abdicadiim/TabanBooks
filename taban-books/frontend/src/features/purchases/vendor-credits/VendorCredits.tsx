import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Play, Star, X, ArrowUpDown, Search, Trash2, Download, Upload, Settings, RefreshCw, ChevronRight, CreditCard, GripVertical, User, Users, Lock, Check, FileText, Copy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, EyeOff, Info } from "lucide-react";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import SearchItemsModal from "../shared/SearchItemsModal";
import ExportVendorCredits from "./ExportVendorCredits";
import { settingsAPI, vendorCreditsAPI } from "../../../services/api";
import toast from "react-hot-toast";
import { downloadVendorCreditsPaperPdf } from "./vendorCreditPdf";

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
  const sortSubmenuRef = useRef(null);
  const importSubmenuRef = useRef(null);
  const exportSubmenuRef = useRef(null);
  const [selectedView, setSelectedView] = useState("All");
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [vendorCredits, setVendorCredits] = useState<any[]>([]);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [selectedCredits, setSelectedCredits] = useState<any[]>([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
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
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);

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
      setSelectedCredits(filteredCredits.map((credit) => credit.id));
    } else {
      setSelectedCredits([]);
    }
  };

  const handleSelectItem = (creditId: any, e: any) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedCredits([...selectedCredits, creditId]);
    } else {
      setSelectedCredits(selectedCredits.filter((id) => id !== creditId));
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
        selectedIds.map((creditId) =>
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
    ).map((name) => ({ label: name, value: name }));

    const currencyOptions = Array.from(
      new Set(
        (vendorCredits || [])
          .map((credit: any) => String(credit?.currency || "").trim().toUpperCase())
          .filter(Boolean)
      )
    ).map((code) => ({ label: code, value: code }));

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

    sorted.sort((a, b) => {
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
    const filtered = vendorCredits.filter((credit) => {
      if (selectedView === "All") return true;
      if (selectedView === "Draft") return credit.status === "Draft";
      if (selectedView === "Open") return credit.status === "Open";
      if (selectedView === "Closed") return credit.status === "Closed";
      if (selectedView === "Void") return credit.status === "Void";
      if (selectedView === "Pending Approval") return credit.status === "Pending Approval";
      return true;
    });

    return getSortedCredits(filtered);
  }, [vendorCredits, selectedView, selectedSort, sortDirection]);

  // Handle sort selection
  const handleSortSelect = (sortOption: string) => {
    const sortMap: Record<string, string> = {
      'Credit Note #': 'creditNote',
      'Date': 'date',
      'Vendor Name': 'vendor',
      'Amount': 'amount',
      'Status': 'status'
    };
    const sortKey = sortMap[sortOption] || 'date';

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
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      position: "sticky" as const,
      top: 0,
      zIndex: 100,
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      minHeight: "80px",
      display: "flex",
      alignItems: "center",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      width: "100%",
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
      fontSize: "20px",
      fontWeight: "700",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: 0,
      margin: "0 auto", // Center the title if it's the only thing in its flex container
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
      padding: "8px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "background-color 0.2s",
    },
    moreButton: {
      padding: "8px",
      color: "#111827",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
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
    // Premium Empty State (Zoho Style)
    emptyStateContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      textAlign: "center" as const,
      backgroundColor: "#fff",
      minHeight: "400px",
    },
    emptyStateImageWrapper: {
      position: "relative" as const,
      width: "100%",
      maxWidth: "400px",
      height: "220px",
      marginBottom: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      borderRadius: "12px",
      border: "1px solid #f1f5f9",
      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
    },
    playButtonCircle: {
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      backgroundColor: "#156372",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      cursor: "pointer",
      boxShadow: "0 4px 6px -1px rgba(21, 99, 114, 0.4)",
    },
    emptyStateTitle: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "12px",
    },
    emptyStateText: {
      fontSize: "15px",
      color: "#64748b",
      maxWidth: "500px",
      marginBottom: "32px",
      lineHeight: "1.5",
    },
    primaryActionBtn: {
      padding: "12px 24px",
      backgroundColor: "#156372",
      color: "#fff",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "600",
      border: "none",
      cursor: "pointer",
      marginBottom: "16px",
      textTransform: "uppercase" as const,
      transition: "background-color 0.2s",
    },
    secondaryLink: {
      color: "#156372",
      fontSize: "14px",
      textDecoration: "none",
      cursor: "pointer",
      background: "none",
      border: "none",
      fontWeight: "500",
    },

    // High Density List Style (Image 1)
    listContainer: {
      display: "flex",
      flexDirection: "column" as const,
      width: "100%",
      maxWidth: "100%",
      backgroundColor: "#fff",
    },
    listItem: {
      display: "flex",
      alignItems: "flex-start",
      padding: "12px 16px",
      borderBottom: "1px solid #f1f5f9",
      transition: "background-color 0.2s",
      cursor: "pointer",
      gap: "12px",
    },
    listItemCheckbox: {
      marginTop: "4px",
    },
    listItemMain: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      gap: "2px",
    },
    listItemHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    listItemVendor: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#1e293b",
    },
    listItemAmount: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#1e293b",
    },
    listItemSubText: {
      fontSize: "13px",
      color: "#64748b",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    listItemStatus: {
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase" as const,
      marginTop: "4px",
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
        .animate-spin {
          animation: spin 1s linear infinite;
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
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#156372", marginRight: "8px" }}>
              {selectedCredits.length} Selected
            </span>
            <button
              onClick={handleBulkUpdate}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
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
            >
              Bulk Update
            </button>
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#ef4444",
                backgroundColor: "#ffffff",
                border: "1px solid #fee2e2",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelectedCredits([])}
            style={{
              padding: "4px 8px",
              fontSize: "13px",
              color: "#64748b",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <X size={16} />
            <span>Clear</span>
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
                  {dropdownOpen ? (
                    <ChevronUp size={20} style={{ color: "#156372" }} />
                  ) : (
                    <ChevronDown size={20} style={{ color: "#156372" }} />
                  )}
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    <button
                      style={{
                        ...styles.dropdownItem,
                        ...(selectedView === "All" ? { borderLeft: "3px solid #156372", backgroundColor: "#f9fafb" } : {}),
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
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedView === view ? { borderLeft: "3px solid #156372", backgroundColor: "#f9fafb" } : {}),
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        onClick={() => {
                          setSelectedView(view);
                          setDropdownOpen(false);
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <span>{view}</span>
                          <Star size={14} style={{ color: "#9ca3af" }} />
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
                onClick={() => navigate("/purchases/vendor-credits/new")}
              >
                <Plus size={16} />
                New
              </button>
              <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
                <button
                  style={styles.moreButton}
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
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
                            const sortMap = {
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
                                    {sortDirection === "asc" ? "â†‘" : "â†“"}
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
      <div style={{ padding: "0", backgroundColor: "#fff", minHeight: "calc(100vh - 120px)" }}>
        {isRefreshing ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 12px" }} />
            <p>Loading vendor credits...</p>
          </div>
        ) : vendorCredits.length === 0 ? (
          <div style={styles.emptyStateContainer}>
            <div style={styles.emptyStateImageWrapper}>
              {/* Pattern Background */}
              <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 3h4v4H3V3zm8 0h4v4h-4V3zm8 0h4v4h-4V3zM3 11h4v4H3v-4zm8 0h4v4h-4v-4zm8 0h4v4h-4v-4zM3 19h4v4H3v-4zm8 0h4v4h-4v-4zm8 0h4v4h-4v-4z\' fill=\'%23000000\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")', backgroundSize: '24px 24px', borderRadius: '12px' }} />
              
              <div style={{ display: "flex", alignItems: "center", gap: "16px", zIndex: 1 }}>
                <div style={styles.playButtonCircle}>
                  <Play fill="currentColor" size={22} style={{ marginLeft: "4px" }} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <div style={{ width: "22px", height: "22px", backgroundColor: "#007be5", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: "13px", fontWeight: "bold" }}>B</span>
                    </div>
                    <span style={{ fontSize: "17px", fontWeight: "600", color: "#1e293b", letterSpacing: "-0.3px" }}>Zoho Books</span>
                  </div>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>How to create a vendor credit</span>
                </div>
              </div>
            </div>
            <h3 style={styles.emptyStateTitle}>You deserve some credit too.</h3>
            <p style={styles.emptyStateText}>
              Create vendor credits and apply them to multiple bills when buying stuff from your vendor.
            </p>
            <button 
              style={styles.primaryActionBtn}
              onClick={() => navigate("/purchases/vendor-credits/new")}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0f4a55"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#156372"}
            >
              CREATE VENDOR CREDITS
            </button>
            <button
              style={styles.secondaryLink}
              onClick={() => navigate("/purchases/vendor-credits/import")}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              Import Vendor Credits
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#fff" }}>
                  <th style={{ padding: "12px 16px", width: "40px" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedCredits.length === filteredCredits.length && filteredCredits.length > 0}
                      onChange={handleSelectAll}
                      style={{ width: "14px", height: "14px", cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>DATE <ArrowUpDown size={12} style={{ display: "inline", marginLeft: "4px", verticalAlign: "middle", cursor: "pointer" }}/></th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>CREDIT NOTE#</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>REFERENCE NUMBER</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>VENDOR NAME</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>AMOUNT</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase" }}>BALANCE <Search size={12} style={{ display: "inline", marginLeft: "4px", verticalAlign: "middle", cursor: "pointer" }}/></th>
                </tr>
              </thead>
              <tbody>
                {filteredCredits.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", fontSize: "13px", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                      No vendor credits found
                    </td>
                  </tr>
                ) : (
                  filteredCredits.map((credit: any) => {
                    const isSelected = selectedCredits.includes(credit.id || credit._id);
                    const status = (credit.status || "DRAFT").toUpperCase();
                    
                    return (
                      <tr 
                        key={credit.id || credit._id}
                        style={{
                          backgroundColor: isSelected ? "#f8fafc" : "#fff",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          transition: "background-color 0.2s"
                        }}
                        onClick={() => {
                          if (selectedCredits.length === 0) {
                            navigate(`/purchases/vendor-credits/${credit.id || credit._id}`);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#fff";
                        }}
                      >
                        <td onClick={(e) => e.stopPropagation()} style={{ padding: "12px 16px" }}>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectItem(credit.id || credit._id, e)}
                            style={{ width: "14px", height: "14px", cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{formatDate(credit.date)}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#3b82f6" }}>{credit.creditNote || credit.vendorCreditNumber || credit.id}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{credit.referenceNumber || ""}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{credit.vendorName || "Unknown Vendor"}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                          <span style={{ color: status === "CLOSED" || status === "APPLIED" ? "#10b981" : status === "OPEN" ? "#3b82f6" : status === "VOID" ? "#ef4444" : "#64748b" }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151", textAlign: "right" }}>{formatCurrency(credit.amount, credit.currency)}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151", textAlign: "right" }}>{formatCurrency(credit.balance || credit.amount, credit.currency)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Custom View Modal */}
      {showCustomViewModal && (
        <NewCustomViewModal
          onClose={() => setShowCustomViewModal(false)}
          onSave={(customView) => {
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
        onItemSelect={(item) => {
          navigate(`/purchases/vendor-credits/${item.id}`);
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
  const userTypeDropdownRef = useRef(null);

  // Required columns that cannot be removed
  const requiredColumns = ["Date", "CreditNote#", "Vendor Name", "Vendor Credits Status", "Vendor Credit Amount"];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userTypeDropdownRef.current && !userTypeDropdownRef.current.contains(event.target)) {
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

  const handleRemoveUser = (index) => {
    setSelectedUsersList(selectedUsersList.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCriterion = () => {
    setFormData((prev) => ({
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

  const removeCriterion = (id) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c !== id),
    }));
  };

  const moveColumnToSelected = (column) => {
    setFormData((prev) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((c) => c !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column) => {
    // Don't allow removing required columns
    if (requiredColumns.includes(column)) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      availableColumns: [...prev.availableColumns, column],
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
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
                }}>
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

