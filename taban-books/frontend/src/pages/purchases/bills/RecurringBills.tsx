import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Star, X, Printer, Trash2, Play, Square, Check, Download, Upload, Settings, RefreshCw, ChevronRight, ArrowUpDown, Search, Lock, User, Users, FileText, CheckCircle } from "lucide-react";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import ExportBills from "./ExportBills";
import { recurringBillsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

const RECURRING_BILLS_KEY = "recurring_bills_v1";

let cachedRecurringBills = [];

const normalizeRecurringBill = (bill: any, fallbackCurrency: string) => ({
  ...bill,
  id: bill?.id || bill?._id || bill?.recurring_bill_id || "",
  profileName: bill?.profile_name || bill?.profileName || "",
  vendorName: bill?.vendor_name || bill?.vendorName || bill?.vendor?.displayName || bill?.vendor?.name || "",
  vendorId: bill?.vendor?._id || bill?.vendor?.id || bill?.vendor || bill?.vendorId || bill?.vendor_id || "",
  frequency: bill?.repeat_every || bill?.repeatEvery || "",
  startDate: bill?.start_date || bill?.startDate || "",
  lastBillDate: bill?.last_created_date || bill?.lastBillDate || "",
  nextBillDate: bill?.next_bill_date || bill?.nextBillDate || "",
  amount: bill?.total ?? bill?.amount ?? 0,
  currency: bill?.currency || fallbackCurrency,
  status: bill?.status ? String(bill.status).toUpperCase() : "ACTIVE",
  createdTime: bill?.createdAt || bill?.created_time || "",
});

const getLS = (k) => {
  if (typeof window !== "undefined" && window.localStorage) {
    const data = window.localStorage.getItem(k);
    try {
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const setLS = (k, v) => {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(k, JSON.stringify(v));
  }
};

export default function RecurringBills() {
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const displayCurrencyCode = baseCurrencyCode || "USD";
  const displayCurrencySymbol = baseCurrencySymbol || displayCurrencyCode;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [recurringBills, setRecurringBills] = useState(() => {
    if (cachedRecurringBills.length > 0) return cachedRecurringBills;
    const localData = getLS(RECURRING_BILLS_KEY);
    if (Array.isArray(localData) && localData.length > 0) {
      cachedRecurringBills = localData;
      return localData;
    }
    return [];
  });
  const [selectedBills, setSelectedBills] = useState([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [showExportRecurringBillsModal, setShowExportRecurringBillsModal] = useState(false);
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Created Time");
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"
  const [searchModalData, setSearchModalData] = useState({
    name: "",
    startDateFrom: "",
    startDateTo: "",
    endDateFrom: "",
    endDateTo: "",
    notes: "",
    vendor: "",
    status: "",
    account: "",
    taxExemptions: "",
    attention: "",
    addressLine: "",
  });
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const statusDropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);

  const statusOptions = ["Active", "Stopped", "Expired", "Suspended"];
  const accountOptions = [
    { category: "Other Current Asset", items: ["Advance Tax", "Employee Advance", "Prepaid Expenses"] },
    { category: "Bank", items: ["Cash", "Petty Cash", "Sales to Customers (Cash)"] },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
        setStatusSearch("");
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
        setAccountSearch("");
      }
    };

    if (statusDropdownOpen || accountDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [statusDropdownOpen, accountDropdownOpen]);
  const exportSubmenuTimeoutRef = useRef(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const exportSubmenuClickedRef = useRef(false);
  const exportSubmenuRef = useRef(null);
  const sortSubmenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Load recurring bills from API
  const loadRecurringBills = async () => {
    setIsRefreshing(true);
    try {
      const response = await recurringBillsAPI.getAll();
      if (response && (response.code === 0 || response.success)) {
        const loadedBills = response.recurring_bills || response.data || [];
        const mappedBills = Array.isArray(loadedBills)
          ? loadedBills.map((b: any) => normalizeRecurringBill(b, displayCurrencyCode))
          : [];
        setRecurringBills(mappedBills);
        cachedRecurringBills = mappedBills;
        setLS(RECURRING_BILLS_KEY, mappedBills);
      }
    } catch (error) {
      console.error("Error loading recurring bills:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format date to show only day, month, year
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    // Handle both YYYY-MM-DD and ISO timestamp formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if invalid
    }
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    loadRecurringBills();

    const handleRecurringBillsUpdated = () => {
      loadRecurringBills();
    };
    window.addEventListener("recurringBillsUpdated", handleRecurringBillsUpdated);
    return () => window.removeEventListener("recurringBillsUpdated", handleRecurringBillsUpdated);
  }, []);

  // Automation Engine - Check for due recurring bills on load
  useEffect(() => {
    const runAutomation = async () => {
      if (recurringBills.length > 0 && !isRefreshing) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueBills = recurringBills.filter(bill => {
          if (bill.status !== 'ACTIVE' || !bill.nextBillDate) return false;
          const nextDate = new Date(bill.nextBillDate);
          nextDate.setHours(0, 0, 0, 0);
          return nextDate <= today;
        });

        if (dueBills.length > 0) {
          console.log(`[Automation] Found ${dueBills.length} due recurring bills. Generating...`);
          let successCount = 0;

          for (const bill of dueBills) {
            try {
              const res = await recurringBillsAPI.generateBill(bill.id);
              if (res && (res.code === 0 || res.success)) {
                successCount++;
              }
            } catch (err) {
              console.error(`[Automation] Failed to generate bill for profile ${bill.profileName}:`, err);
            }
          }

          if (successCount > 0) {
            setNotification(`Successfully generated ${successCount} due bill(s) automatically.`);
            setTimeout(() => setNotification(null), 5000);
            loadRecurringBills(); // Refresh the list
          }
        }
      }
    };

    const timer = setTimeout(runAutomation, 2000);
    return () => clearTimeout(timer);
  }, [recurringBills.length]);

  const handleRefresh = () => {
    loadRecurringBills();
  };

  // ... (Existing useEffects for dropdowns)

  // ... (Existing useEffect for Esc)

  const handleDeleteSelected = async () => {
    if (selectedBills.length === 0) {
      alert("Please select at least one recurring bill to delete.");
      return;
    }
    if (window.confirm("Are you sure you want to delete the selected recurring bills?")) {
      try {
        await Promise.all(selectedBills.map(id => recurringBillsAPI.delete(id)));
        setNotification("Selected recurring bills deleted successfully.");
        setTimeout(() => setNotification(null), 3000);
        setSelectedBills([]);
        loadRecurringBills();
      } catch (error) {
        console.error("Error deleting recurring bills:", error);
        alert("Failed to delete recurring bills.");
      }
    }
  };

  const handleBulkUpdate = () => {
    if (selectedBills.length === 0) {
      alert("Please select at least one recurring bill to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const handleBulkUpdateSubmit = async (field, value) => {
    // Implement API bulk update if available or loop
    // For now simple alert as we migth not have bulk update API
    // Or loop update
    try {
      await Promise.all(selectedBills.map(id => recurringBillsAPI.update(id, { [field]: value })));
      loadRecurringBills();
      setSelectedBills([]);
    } catch (err) {
      console.error("Error updating bills", err);
    }
  };

  const recurringBillFieldOptions = [
    { value: "vendor", label: "Vendor" },
    { value: "currency", label: "Currency" },
    { value: "frequency", label: "Frequency" },
    { value: "paymentTerms", label: "Payment Terms" },
    { value: "notes", label: "Notes" },
  ];

  const handlePrint = () => {
    console.log("Print bills:", selectedBills);
    // Implement print functionality
  };

  const handleResume = async () => {
    if (selectedBills.length === 0) {
      alert("Please select at least one recurring bill to resume.");
      return;
    }

    try {
      await Promise.all(selectedBills.map(id => recurringBillsAPI.updateStatus(id, 'active')));
      setNotification("Selected recurring bills have been activated.");
      setTimeout(() => setNotification(null), 3000);
      setSelectedBills([]);
      loadRecurringBills();
    } catch (error) {
      console.error("Error resuming bills:", error);
      alert("Failed to resume recurring bills.");
    }
  };

  const handleStop = async () => {
    if (selectedBills.length === 0) {
      alert("Please select at least one recurring bill to stop.");
      return;
    }

    try {
      await Promise.all(selectedBills.map(id => recurringBillsAPI.updateStatus(id, 'stopped')));
      setNotification("Selected recurring bills have been stopped.");
      setTimeout(() => setNotification(null), 3000);
      setSelectedBills([]);
      loadRecurringBills();
    } catch (error) {
      console.error("Error stopping bills:", error);
      alert("Failed to stop recurring bills.");
    }
  };

  const handleClearSelection = () => {
    setSelectedBills([]);
  };

  const sortOptions = [
    "Created Time",
    "Vendor Name",
    "Profile Name",
    "Next Bill Date",
    "Amount",
  ];

  // Sort bills based on selected sort option
  const getSortedBills = (bills) => {
    const sorted = [...bills];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (selectedSort) {
        case "Created Time":
          aValue = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          bValue = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          break;
        case "Vendor Name":
          aValue = (a.vendorName || "").toLowerCase();
          bValue = (b.vendorName || "").toLowerCase();
          break;
        case "Profile Name":
          aValue = (a.profileName || "").toLowerCase();
          bValue = (b.profileName || "").toLowerCase();
          break;
        case "Next Bill Date":
          // Parse date in dd/MM/yyyy format
          const parseDate = (dateStr) => {
            if (!dateStr || dateStr === "--") return 0;
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month, day).getTime();
              }
            }
            return 0;
          };
          aValue = parseDate(a.nextBillDate);
          bValue = parseDate(b.nextBillDate);
          break;
        case "Amount":
          aValue = parseFloat(a.amount || 0);
          bValue = parseFloat(b.amount || 0);
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  };

  // Handle sort selection
  const handleSortSelect = (sortOption) => {
    if (selectedSort === sortOption) {
      // Toggle sort direction if same option is selected
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSelectedSort(sortOption);
      setSortDirection("desc"); // Default to descending
    }
    setSortSubmenuOpen(false);
    setMoreMenuOpen(false);
  };

  const filteredBills = getSortedBills(recurringBills.filter((bill) => {
    if (selectedView === "All") return true;
    return bill.status === selectedView.toUpperCase();
  }));

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      borderRadius: "0",
      border: "1px solid #e5e7eb",
      borderLeft: "none",
      borderRight: "none",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 50,
      marginBottom: "20px", // Space for the first header
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
    title: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
      background: "none",
      border: "none",
      padding: 0,
    },
    chevronButton: {
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      color: "#156372",
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
      backgroundColor: "#f3f4f6",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
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
      minWidth: "200px",
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
    moreDropdownWrapper: {
      position: "relative",
      display: "inline-block",
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
      width: "100%",
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left",
      gap: "8px",
    },
    submenu: {
      position: "absolute",
      right: "100%",
      top: 0,
      marginRight: "4px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      maxHeight: "400px",
      overflowY: "auto",
      overflowX: "hidden",
      zIndex: 101,
      padding: "4px 0",
    },
    submenuItem: {
      display: "block",
      width: "100%",
      padding: "10px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left",
      transition: "background-color 0.2s",
    },
    content: {
      padding: "80px 32px",
      textAlign: "center",
      backgroundColor: "#ffffff",
      minHeight: "500px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    heading: {
      fontSize: "32px",
      fontWeight: "700",
      color: "#111827",
      margin: "0 0 16px",
      letterSpacing: "-0.5px",
    },
    description: {
      fontSize: "15px",
      color: "#6b7280",
      margin: "0 0 32px",
      maxWidth: "500px",
    },
    actions: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    },
    createButton: {
      padding: "12px 32px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#ffffff",
      background: "#156372",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      transition: "background 0.15s ease",
    },
    importLink: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      textDecoration: "none",
      transition: "color 0.15s ease",
    },
    tableContainer: {
      padding: "0",
      backgroundColor: "#ffffff",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    tableHeaderRow: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "12px 16px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textAlign: "left",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      position: "sticky",
      top: "74px", // Height of the sticky main header + space
      backgroundColor: "#f9fafb",
      zIndex: 40,
    },
    tableRow: {
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
    },
    tableCell: {
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
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
    // Advanced Empty State Styles
    advancedEmptyState: {
      padding: "60px 24px",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      maxWidth: "1000px",
      margin: "0 auto",
    },
    emptyStateIconBox: {
      width: "64px",
      height: "64px",
      backgroundColor: "#f3f4f6",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "24px",
      color: "#156372",
    },
    emptyStateHeading: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#111827",
      marginBottom: "12px",
    },
    emptyStateSubheading: {
      fontSize: "16px",
      color: "#4b5563",
      marginBottom: "32px",
      maxWidth: "600px",
      lineHeight: "1.5",
    },
    emptyStateMainButton: {
      backgroundColor: "#156372", // System color
      color: "#ffffff",
      padding: "12px 24px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      border: "none",
      cursor: "pointer",
      textTransform: "uppercase",
      marginBottom: "16px",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      transition: "background-color 0.2s",
    },
    emptyStateLink: {
      color: "#156372", // System color
      fontSize: "14px",
      fontWeight: "500",
      textDecoration: "none",
      cursor: "pointer",
      marginBottom: "60px",
    },
    lifecycleSection: {
      width: "100%",
      borderTop: "1px solid #f3f4f6",
      paddingTop: "60px",
      marginBottom: "60px",
    },
    lifecycleTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "40px",
    },
    diagramContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0",
      width: "100%",
      maxWidth: "800px",
      margin: "0 auto",
    },
    diagramStep: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      width: "140px",
      position: "relative",
    },
    diagramIconWrapper: {
      width: "48px",
      height: "48px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#156372",
      backgroundColor: "#eff6ff",
      border: "1px solid #dbeafe",
    },
    diagramIconWrapperGreen: {
      width: "48px",
      height: "48px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#156372",
      backgroundColor: "#eff6ff",
      border: "1px solid #dbeafe",
    },
    diagramLabel: {
      fontSize: "10px",
      fontWeight: "700",
      color: "#4b5563",
      textTransform: "uppercase",
      textAlign: "center",
      lineHeight: "1.2",
    },
    diagramConnector: {
      flex: 1,
      height: "1px",
      borderTop: "1px dashed #d1d5db",
      margin: "0 -20px 24px -20px",
      minWidth: "40px",
      position: "relative",
      top: "-12px",
    },
    connectorArrow: {
      position: "absolute",
      right: "-2px",
      top: "-4.5px",
      width: "0",
      height: "0",
      borderTop: "4px solid transparent",
      borderBottom: "4px solid transparent",
      borderLeft: "6px solid #d1d5db",
    },
    capabilitiesSection: {
      textAlign: "left",
      width: "100%",
      maxWidth: "500px",
      margin: "0 auto",
    },
    capabilitiesTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "20px",
    },
    capabilityList: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    capabilityItem: {
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      fontSize: "14px",
      color: "#4b5563",
    },
    capabilityIcon: {
      color: "#156372",
      marginTop: "2px",
      flexShrink: 0,
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
      {/* Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 10001,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Check size={16} style={{ color: "#ffffff" }} />
          </div>
          <span
            style={{
              fontSize: "14px",
              color: "#065f46",
              fontWeight: "500",
            }}
          >
            {notification}
          </span>
        </div>
      )}
      {selectedBills.length > 0 && (
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 60,
          marginBottom: "10px"
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
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Bulk Update
            </button>
            <div style={{
              width: "1px",
              height: "20px",
              backgroundColor: "#e5e7eb"
            }}></div>
            <button
              onClick={handleResume}
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
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Resume
            </button>
            <button
              onClick={handleStop}
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
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Stop
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
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
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
              {selectedBills.length} Selected
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
              e.target.style.backgroundColor = "#e5e7eb";
              e.target.style.borderRadius = "4px";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            <span>Esc</span>
            <X size={16} style={{ color: "#156372" }} />
          </button>
        </div>
      )}
      {/* Header */}
      {selectedBills.length === 0 && (
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  style={styles.title}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#156372";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "#111827";
                  }}
                >
                  All Recurring Bills
                  {dropdownOpen ? (
                    <ChevronUp size={16} style={{ color: "#156372" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "#156372" }} />
                  )}
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    {["All", "Active", "Stopped", "Expired"].map((option) => (
                      <button
                        key={option}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedView === option ? {
                            borderLeft: "3px solid #156372",
                            paddingLeft: "13px",
                            color: "#156372",
                            backgroundColor: "#eff6ff",
                          } : {}),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onClick={() => {
                          setSelectedView(option);
                          setDropdownOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (selectedView !== option) {
                            e.target.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedView !== option) {
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <span>{option}</span>
                        <Star size={16} style={{ color: "#9ca3af", opacity: 0.5 }} />
                      </button>
                    ))}
                    <div style={{
                      height: "1px",
                      backgroundColor: "#e5e7eb",
                      margin: "4px 0",
                    }} />
                    <button
                      style={{
                        ...styles.dropdownItem,
                        color: "#111827",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onClick={() => {
                        setShowCustomViewModal(true);
                        setDropdownOpen(false);
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      <Plus size={16} style={{ color: "#156372" }} />
                      New Custom View
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.headerRight}>
              <button
                style={styles.newButton}
                onClick={() => {
                  navigate("/purchases/recurring-bills/new");
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0D4A52")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#156372")}
              >
                <Plus size={16} />
                New
              </button>
              <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
                <button
                  style={styles.moreButton}
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e5e7eb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#f3f4f6";
                  }}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div style={styles.moreDropdown}>
                    {/* Sort by */}
                    <div
                      ref={sortSubmenuRef}
                      style={{ position: "relative" }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => {
                        setSortSubmenuOpen(true);
                        setHoveredMenuItem('sort');
                      }}
                      onMouseLeave={() => {
                        setSortSubmenuOpen(false);
                        setHoveredMenuItem(null);
                      }}
                    >
                      <button
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#e3f2fd" : "transparent",
                          color: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#1976d2" : "#111827",
                          justifyContent: "space-between",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <ArrowUpDown size={16} style={{ color: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#1976d2" : "#6b7280" }} />
                          <span>Sort by</span>
                        </div>
                        <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#1976d2" : "#6b7280" }} />
                      </button>
                      {sortSubmenuOpen && (
                        <div style={{
                          ...styles.submenu,
                          maxHeight: "400px",
                          overflowY: "auto",
                        }}>
                          {sortOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              style={{
                                ...styles.submenuItem,
                                backgroundColor: selectedSort === option ? "#e3f2fd" : "transparent",
                                color: selectedSort === option ? "#1976d2" : "#111827",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSortSelect(option);
                              }}
                              onMouseEnter={(e) => {
                                if (selectedSort !== option) {
                                  e.target.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedSort !== option) {
                                  e.target.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              <span>{option}</span>
                              {selectedSort === option && (
                                <span style={{ fontSize: "12px", color: "#1976d2" }}>
                                  {sortDirection === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Import Recurring Bills */}
                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        justifyContent: "space-between",
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        navigate("/purchases/recurring-bills/import");
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Download size={16} style={{ color: "#6b7280" }} />
                        <span>Import Recurring Bills</span>
                      </div>
                      <ChevronRight size={16} style={{ color: "#6b7280" }} />
                    </button>

                    {/* Export */}
                    <div
                      ref={exportSubmenuRef}
                      style={{ position: "relative" }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => {
                        if (exportSubmenuTimeoutRef.current) {
                          clearTimeout(exportSubmenuTimeoutRef.current);
                          exportSubmenuTimeoutRef.current = null;
                        }
                        if (!exportSubmenuClickedRef.current) {
                          setShowExportSubmenu(true);
                          setHoveredMenuItem('export');
                        }
                      }}
                      onMouseLeave={() => {
                        if (!exportSubmenuClickedRef.current) {
                          exportSubmenuTimeoutRef.current = setTimeout(() => {
                            setShowExportSubmenu(false);
                            setHoveredMenuItem(null);
                          }, 200);
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newState = !showExportSubmenu;
                          exportSubmenuClickedRef.current = newState;
                          setShowExportSubmenu(newState);
                          setHoveredMenuItem('export');
                          if (exportSubmenuTimeoutRef.current) {
                            clearTimeout(exportSubmenuTimeoutRef.current);
                            exportSubmenuTimeoutRef.current = null;
                          }
                          // Prevent parent menu from closing
                          if (!newState) {
                            exportSubmenuClickedRef.current = false;
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#ffffff" : "#111827",
                          cursor: "pointer",
                          border: "none",
                          width: "100%",
                          textAlign: "left",
                          gap: "12px",
                          backgroundColor: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#156372" : "transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Upload size={16} style={{ color: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#ffffff" : "#6b7280" }} />
                          <span>Export</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#ffffff" : "#6b7280" }} />
                        </div>
                      </button>
                      {showExportSubmenu && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: "100%",
                            top: 0,
                            marginRight: "4px",
                            backgroundColor: "#ffffff",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            border: "1px solid #e5e7eb",
                            minWidth: "200px",
                            zIndex: 9999,
                            padding: "4px 0",
                          }}
                          onMouseEnter={() => {
                            if (exportSubmenuTimeoutRef.current) {
                              clearTimeout(exportSubmenuTimeoutRef.current);
                              exportSubmenuTimeoutRef.current = null;
                            }
                            setShowExportSubmenu(true);
                          }}
                          onMouseLeave={() => {
                            if (!exportSubmenuClickedRef.current) {
                              exportSubmenuTimeoutRef.current = setTimeout(() => {
                                setShowExportSubmenu(false);
                              }, 200);
                            }
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              backgroundColor: "transparent",
                              width: "100%",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#156372";
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              exportSubmenuClickedRef.current = false;
                              if (exportSubmenuTimeoutRef.current) {
                                clearTimeout(exportSubmenuTimeoutRef.current);
                                exportSubmenuTimeoutRef.current = null;
                              }
                              setShowExportSubmenu(false);
                              setMoreMenuOpen(false);
                              setShowExportRecurringBillsModal(true);
                            }}
                          >
                            <span>Export Recurring Bills</span>
                          </button>
                          <button
                            type="button"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 16px",
                              fontSize: "14px",
                              color: "#111827",
                              cursor: "pointer",
                              border: "none",
                              backgroundColor: "transparent",
                              width: "100%",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#156372";
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              exportSubmenuClickedRef.current = false;
                              if (exportSubmenuTimeoutRef.current) {
                                clearTimeout(exportSubmenuTimeoutRef.current);
                                exportSubmenuTimeoutRef.current = null;
                              }
                              setShowExportSubmenu(false);
                              setMoreMenuOpen(false);
                              setShowExportCurrentViewModal(true);
                            }}
                          >
                            <span>Export Current View</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Refresh List */}
                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                      onClick={() => {
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
        {recurringBills.length === 0 ? (
          <div style={styles.advancedEmptyState}>
            <div style={styles.emptyStateHeading}>Create. Set. Repeat.</div>
            <div style={styles.emptyStateSubheading}>
              Do you pay bills every so often? Start paying your vendors on time by creating recurring bills.
            </div>
            
            <button 
              style={styles.emptyStateMainButton}
              onClick={() => navigate("/purchases/recurring-bills/new")}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
            >
              CREATE RECURRING BILL
            </button>
            
            <button 
              style={styles.emptyStateLink}
              onClick={() => navigate("/purchases/recurring-bills/import")}
            >
              Import Recurring Bills
            </button>

            {/* Lifecycle Section */}
            <div style={styles.lifecycleSection}>
              <div style={styles.lifecycleTitle}>Life cycle of a Recurring Bill</div>
              
              <div style={styles.diagramContainer}>
                {/* Step 1 */}
                <div style={styles.diagramStep}>
                  <div style={styles.diagramIconWrapper}>
                    <RefreshCw size={20} />
                  </div>
                  <div style={styles.diagramLabel}>ROUTINE PURCHASE</div>
                </div>
                
                {/* Connector */}
                <div style={styles.diagramConnector}>
                  <div style={styles.connectorArrow}></div>
                </div>
                
                {/* Step 2 */}
                <div style={styles.diagramStep}>
                  <div style={styles.diagramIconWrapper}>
                    <User size={20} />
                  </div>
                  <div style={styles.diagramLabel}>CREATE RECURRING PROFILE</div>
                </div>
                
                {/* Connector */}
                <div style={styles.diagramConnector}>
                  <div style={styles.connectorArrow}></div>
                </div>
                
                {/* Step 3 */}
                <div style={styles.diagramStep}>
                  <div style={styles.diagramIconWrapper}>
                    <FileText size={20} />
                  </div>
                  <div style={styles.diagramLabel}>GENERATED BILL</div>
                </div>
                
                {/* Connector */}
                <div style={styles.diagramConnector}>
                  <div style={styles.connectorArrow}></div>
                </div>
                
                {/* Step 4 */}
                <div style={styles.diagramStep}>
                  <div style={styles.diagramIconWrapperGreen}>
                    <CheckCircle size={20} />
                  </div>
                  <div style={styles.diagramLabel}>RECORD PAYMENT</div>
                </div>
              </div>
            </div>

            {/* Capabilities Section */}
            <div style={styles.capabilitiesSection}>
              <div style={styles.capabilitiesTitle}>In the Recurring Bills module, you can:</div>
              <ul style={styles.capabilityList}>
                <li style={styles.capabilityItem}>
                  <CheckCircle size={16} style={styles.capabilityIcon} />
                  <span>Create a recurring profile to automatically generate bills.</span>
                </li>
                <li style={styles.capabilityItem}>
                  <CheckCircle size={16} style={styles.capabilityIcon} />
                  <span>View when each bill was generated under the recurring profile.</span>
                </li>
                <li style={styles.capabilityItem}>
                  <CheckCircle size={16} style={styles.capabilityIcon} />
                  <span>Create an individual bill within the recurring profile.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.tableHeaderCell}>
                  <input
                    type="checkbox"
                    checked={selectedBills.length === filteredBills.length && filteredBills.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBills(filteredBills.map(b => b.id));
                      } else {
                        setSelectedBills([]);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={styles.tableHeaderCell}>VENDOR NAME</th>
                <th style={styles.tableHeaderCell}>PROFILE NAME</th>
                <th style={styles.tableHeaderCell}>FREQUENCY</th>
                <th style={styles.tableHeaderCell}>LAST BILL DATE</th>
                <th style={styles.tableHeaderCell}>NEXT BILL DATE</th>
                <th style={styles.tableHeaderCell}>STATUS</th>
                <th style={styles.tableHeaderCell}>AMOUNT</th>
                <th style={styles.tableHeaderCell}>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      color: "#6b7280",
                    }}
                    onClick={() => setShowSearchModal(true)}
                  >
                    <Search size={16} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    style={{
                      ...styles.tableRow,
                      ...(selectedBills.includes(bill.id) ? { backgroundColor: "#eff6ff" } : {}),
                    }}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox
                      if (e.target.type !== "checkbox" && !e.target.closest('input[type="checkbox"]')) {
                        navigate(`/purchases/recurring-bills/${bill.id}`, { state: { bill } });
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedBills.includes(bill.id)) {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedBills.includes(bill.id)) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <td style={styles.tableCell} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedBills.includes(bill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBills([...selectedBills, bill.id]);
                          } else {
                            setSelectedBills(selectedBills.filter(id => id !== bill.id));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={styles.tableCell}>{bill.vendorName}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{ color: "#156372", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/recurring-bills/${bill.id}`, { state: { bill } });
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecoration = "none";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecoration = "none";
                        }}
                      >
                        {bill.profileName}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{bill.frequency}</td>
                    <td style={styles.tableCell}>{bill.lastBillDate || "-"}</td>
                    <td style={styles.tableCell}>{formatDate(bill.nextBillDate)}</td>
                    <td style={styles.tableCell}>
                      <span style={{
                        color: bill.status === "ACTIVE" ? "#10b981" :
                          bill.status === "STOPPED" ? "#156372" :
                            bill.status === "EXPIRED" ? "#f59e0b" : "#6b7280",
                        fontWeight: "500"
                      }}>
                        {bill.status}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {displayCurrencySymbol} {parseFloat(bill.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              {filteredBills.length === 0 && recurringBills.length > 0 && !isRefreshing && (
                <tr>
                  <td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                    No recurring bills found for the selected criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* New Custom View Modal */}
      {showCustomViewModal && (
        <NewCustomViewModal
          onClose={() => setShowCustomViewModal(false)}
          onSave={(customView) => {
            console.log("Custom view saved:", customView);
            setShowCustomViewModal(false);
          }}
        />
      )}

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Recurring Bills"
        fieldOptions={recurringBillFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="recurring bills"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          const count = selectedBills.length;
          const updatedBills = recurringBills.filter((bill) => !selectedBills.includes(bill.id));
          setRecurringBills(updatedBills);
          cachedRecurringBills = updatedBills;
          setLS(RECURRING_BILLS_KEY, updatedBills);

          // Show success notification
          setNotification(`The selected recurring bill${count > 1 ? "s have" : " has"} been deleted.`);
          setTimeout(() => setNotification(null), 3000);

          setSelectedBills([]);
        }}
        entityName="recurring bill(s)"
        count={selectedBills.length}
      />

      {/* Export Recurring Bills Modal */}
      {showExportRecurringBillsModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportBills
          onClose={() => setShowExportRecurringBillsModal(false)}
          exportType="bills"
          defaultModule="Recurring Bills"
          data={recurringBills}
        />,
        document.body
      )}

      {/* Export Current View Modal */}
      {showExportCurrentViewModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportBills
          onClose={() => setShowExportCurrentViewModal(false)}
          exportType="current-view"
          defaultModule="Recurring Bills"
          data={filteredBills}
        />,
        document.body
      )}

      {/* Search Modal */}
      {showSearchModal && typeof document !== 'undefined' && document.body && createPortal(
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
              setShowSearchModal(false);
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
                    <option value="recurring-bills">Recurring Bills</option>
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
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
                  {/* Name */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={searchModalData.name}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, name: e.target.value }))}
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

                  {/* End Date Range */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      End Date Range
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="dd/MM/yyyy"
                        value={searchModalData.endDateFrom}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, endDateFrom: e.target.value }))}
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
                        value={searchModalData.endDateTo}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, endDateTo: e.target.value }))}
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
                  {/* Start Date Range */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Start Date Range
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="dd/MM/yyyy"
                        value={searchModalData.startDateFrom}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, startDateFrom: e.target.value }))}
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
                        value={searchModalData.startDateTo}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, startDateTo: e.target.value }))}
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

                  {/* Status */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Status
                    </label>
                    <div style={{ position: "relative" }} ref={statusDropdownRef}>
                      <input
                        type="text"
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        onFocus={() => setStatusDropdownOpen(true)}
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
                      {statusDropdownOpen && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: "4px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          zIndex: 1000,
                          maxHeight: "200px",
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                        }}>
                          <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                            <div style={{ position: "relative" }}>
                              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={statusSearch}
                                onChange={(e) => setStatusSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px 6px 32px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                            {statusOptions
                              .filter(opt => opt.toLowerCase().includes(statusSearch.toLowerCase()))
                              .map((option) => (
                                <div
                                  key={option}
                                  onClick={() => {
                                    setSearchModalData(prev => ({ ...prev, status: option }));
                                    setStatusDropdownOpen(false);
                                    setStatusSearch("");
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    fontSize: "14px",
                                    color: searchModalData.status === option ? "#ffffff" : "#111827",
                                    backgroundColor: searchModalData.status === option ? "#156372" : "transparent",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (searchModalData.status !== option) {
                                      e.target.style.backgroundColor = "#f9fafb";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (searchModalData.status !== option) {
                                      e.target.style.backgroundColor = "transparent";
                                    }
                                  }}
                                >
                                  <span>{option}</span>
                                  {searchModalData.status === option && <Check size={16} style={{ color: "#ffffff" }} />}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Account
                    </label>
                    <div style={{ position: "relative" }} ref={accountDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: accountDropdownOpen ? "1px solid #156372" : "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          backgroundColor: "#ffffff",
                          color: searchModalData.account ? "#111827" : "#9ca3af",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <span>{searchModalData.account || "Select an account"}</span>
                        {accountDropdownOpen ? (
                          <ChevronUp size={16} style={{ color: "#6b7280", position: "absolute", right: "10px" }} />
                        ) : (
                          <ChevronDown size={16} style={{ color: "#6b7280", position: "absolute", right: "10px" }} />
                        )}
                      </button>
                      {accountDropdownOpen && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: "4px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          zIndex: 1000,
                          maxHeight: "300px",
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                        }}>
                          <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                            <div style={{ position: "relative" }}>
                              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={accountSearch}
                                onChange={(e) => setAccountSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px 6px 32px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                            {accountOptions.map((category) => {
                              const filteredItems = category.items.filter(item =>
                                item.toLowerCase().includes(accountSearch.toLowerCase())
                              );
                              if (filteredItems.length === 0) return null;

                              return (
                                <div key={category.category}>
                                  <div style={{
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#6b7280",
                                    backgroundColor: "#f9fafb",
                                    textTransform: "uppercase",
                                  }}>
                                    {category.category}
                                  </div>
                                  {filteredItems.map((item) => (
                                    <div
                                      key={item}
                                      onClick={() => {
                                        setSearchModalData(prev => ({ ...prev, account: item }));
                                        setAccountDropdownOpen(false);
                                        setAccountSearch("");
                                      }}
                                      style={{
                                        padding: "10px 12px",
                                        fontSize: "14px",
                                        color: searchModalData.account === item ? "#ffffff" : "#111827",
                                        backgroundColor: searchModalData.account === item ? "#156372" : "transparent",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (searchModalData.account !== item) {
                                          e.target.style.backgroundColor = "#f9fafb";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (searchModalData.account !== item) {
                                          e.target.style.backgroundColor = "transparent";
                                        }
                                      }}
                                    >
                                      <span>{item}</span>
                                      {searchModalData.account === item && <Check size={16} style={{ color: "#ffffff" }} />}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                  setShowSearchModal(false);
                  setSearchModalData({
                    name: "",
                    startDateFrom: "",
                    startDateTo: "",
                    endDateFrom: "",
                    endDateTo: "",
                    notes: "",
                    vendor: "",
                    status: "",
                    account: "",
                    taxExemptions: "",
                    attention: "",
                    addressLine: "",
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
                  e.target.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#ffffff";
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log("Search with:", searchModalData);
                  setShowSearchModal(false);
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
                  e.target.style.backgroundColor = "#0D4A52";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#156372";
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function NewCustomViewModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    availableColumns: [
      "Profile Name",
      "Start Date",
      "Recurring Bill Account",
      "End Date",
      "Next Bill Date",
      "Status",
      "Bill Amount",
      "Item Name",
      "Description",
      "Vendor Name",
      "Notes",
      "Currency",
      "Frequency",
      "Amount",
      "Created Time",
      "Last Modified Time",
    ],
    selectedColumns: ["Profile Name", "Vendor Name", "Frequency", "Next Bill Date", "Amount", "Status"],
    visibility: "Only Me",
    userType: "Users",
    selectUsers: "",
    selectedUsers: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [openFieldDropdown, setOpenFieldDropdown] = useState(null);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const fieldDropdownRef = useRef(null);

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
      criteria: prev.criteria.filter((c) => c.id !== id),
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
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
      availableColumns: [...prev.availableColumns, column],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const fieldOptions = [
    "Profile Name",
    "Start Date",
    "Recurring Bill Account",
    "End Date",
    "Next Bill Date",
    "Status",
    "Bill Amount",
    "Item Name",
    "Description",
    "Vendor Name",
    "Notes",
    "Currency",
    "Frequency",
    "Amount",
  ];

  const comparatorOptions = [
    "equals",
    "not equals",
    "contains",
    "does not contain",
    "starts with",
    "ends with",
    "is empty",
    "is not empty",
  ];

  const filteredAvailableColumns = formData.availableColumns.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFieldOptions = fieldOptions.filter((field) =>
    field.toLowerCase().includes(fieldSearchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(event.target)) {
        setOpenFieldDropdown(null);
        setFieldSearchQuery("");
      }
    };

    if (openFieldDropdown !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openFieldDropdown]);

  const modalStyles = {
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
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      width: "90%",
      maxWidth: "800px",
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      padding: "24px",
    },
    section: {
      marginBottom: "24px",
    },
    nameRow: {
      display: "flex",
      gap: "16px",
      alignItems: "flex-end",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flex: 1,
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
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      width: "100%",
      boxSizing: "border-box",
    },
    favoriteCheckbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      paddingBottom: "8px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    criteriaContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    criterionRow: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    criterionSelect: {
      padding: "6px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      flex: 1,
    },
    removeButton: {
      padding: "6px",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    fieldDropdownWrapper: {
      position: "relative",
      flex: 1,
    },
    fieldDropdownButton: {
      padding: "6px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      textAlign: "left",
    },
    fieldDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: "4px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 1000,
      maxHeight: "300px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    fieldDropdownSearch: {
      padding: "8px 12px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    fieldDropdownSearchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "14px",
      padding: "4px",
    },
    fieldDropdownList: {
      maxHeight: "250px",
      overflowY: "auto",
      padding: "4px 0",
    },
    fieldDropdownItem: {
      padding: "8px 12px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    addButton: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      background: "none",
      border: "1px solid #156372",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginTop: "8px",
    },
    columnsContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    columnSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "12px",
    },
    searchInput: {
      padding: "6px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      marginBottom: "8px",
      boxSizing: "border-box",
    },
    columnList: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      maxHeight: "200px",
      overflowY: "auto",
    },
    columnItem: {
      padding: "6px 8px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      borderRadius: "4px",
      border: "none",
      background: "none",
      textAlign: "left",
    },
    footer: {
      padding: "20px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
    },
    footerButton: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
    cancelButton: {
      backgroundColor: "#f3f4f6",
      color: "#111827",
    },
    saveButton: {
      backgroundColor: "#156372",
      color: "#ffffff",
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
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="favorite" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Star size={16} style={{ color: formData.markAsFavorite ? "#fbbf24" : "#9ca3af" }} />
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          {/* Define the criteria Section */}
          <div style={modalStyles.section}>
            <h3 style={modalStyles.sectionTitle}>Define the criteria (if any)</h3>
            <div style={modalStyles.criteriaContainer}>
              {formData.criteria.map((criterion, index) => (
                <div key={criterion.id} style={modalStyles.criterionRow}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>
                  <div style={modalStyles.fieldDropdownWrapper} ref={openFieldDropdown === criterion.id ? fieldDropdownRef : null}>
                    <button
                      type="button"
                      onClick={() => {
                        if (openFieldDropdown === criterion.id) {
                          setOpenFieldDropdown(null);
                          setFieldSearchQuery("");
                        } else {
                          setOpenFieldDropdown(criterion.id);
                          setFieldSearchQuery("");
                        }
                      }}
                      style={modalStyles.fieldDropdownButton}
                    >
                      <span>{criterion.field || "Select a field"}</span>
                      <ChevronDown size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                    </button>
                    {openFieldDropdown === criterion.id && (
                      <div style={modalStyles.fieldDropdown}>
                        <div style={modalStyles.fieldDropdownSearch}>
                          <Search size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                          <input
                            type="text"
                            placeholder="Search"
                            value={fieldSearchQuery}
                            onChange={(e) => setFieldSearchQuery(e.target.value)}
                            style={modalStyles.fieldDropdownSearchInput}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div style={modalStyles.fieldDropdownList}>
                          {filteredFieldOptions.length > 0 ? (
                            filteredFieldOptions.map((field) => (
                              <button
                                key={field}
                                type="button"
                                onClick={() => {
                                  handleCriterionChange(criterion.id, "field", field);
                                  setOpenFieldDropdown(null);
                                  setFieldSearchQuery("");
                                }}
                                style={{
                                  ...modalStyles.fieldDropdownItem,
                                  ...(criterion.field === field ? { backgroundColor: "#eff6ff", color: "#156372" } : {}),
                                }}
                                onMouseEnter={(e) => {
                                  if (criterion.field !== field) {
                                    e.target.style.backgroundColor = "#f9fafb";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (criterion.field !== field) {
                                    e.target.style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                {field}
                              </button>
                            ))
                          ) : (
                            <div style={{ padding: "8px 12px", fontSize: "14px", color: "#6b7280" }}>
                              No fields found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <select
                    value={criterion.comparator}
                    onChange={(e) => handleCriterionChange(criterion.id, "comparator", e.target.value)}
                    style={modalStyles.criterionSelect}
                    disabled={!criterion.field}
                  >
                    <option value="">Select Comparator</option>
                    {comparatorOptions.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={criterion.value}
                    onChange={(e) => handleCriterionChange(criterion.id, "value", e.target.value)}
                    style={modalStyles.criterionSelect}
                    placeholder="Value"
                    disabled={!criterion.comparator || ["is empty", "is not empty"].includes(criterion.comparator)}
                  />
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(criterion.id)}
                      style={modalStyles.removeButton}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addCriterion} style={modalStyles.addButton}>
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Select Columns Section */}
          <div style={modalStyles.section}>
            <h3 style={modalStyles.sectionTitle}>Select Columns</h3>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.label}>Available Columns</div>
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={modalStyles.searchInput}
                />
                <div style={modalStyles.columnList}>
                  {filteredAvailableColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => moveColumnToSelected(column)}
                      style={modalStyles.columnItem}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.label}>Selected Columns</div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => moveColumnToAvailable(column)}
                      style={modalStyles.columnItem}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.formGroup}>
              <label style={{ ...modalStyles.label, marginBottom: "4px" }}>Visibility Preference</label>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", display: "block" }}>Share With</label>
              <div style={{
                display: "flex",
                flexDirection: "row",
                gap: "8px",
                backgroundColor: "#f9fafb",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: formData.visibility === "Only Me" ? "#eff6ff" : "#ffffff",
                  border: formData.visibility === "Only Me" ? "1px solid #156372" : "1px solid #e5e7eb",
                  flex: 1,
                }}>
                  <input
                    type="radio"
                    name="visibility"
                    value="Only Me"
                    checked={formData.visibility === "Only Me"}
                    onChange={handleChange}
                    style={{ cursor: "pointer" }}
                  />
                  <Lock size={16} style={{ color: "#6b7280" }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>Only Me</span>
                </label>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: formData.visibility === "Only Selected Users & Roles" ? "#eff6ff" : "#ffffff",
                  border: formData.visibility === "Only Selected Users & Roles" ? "1px solid #156372" : "1px solid #e5e7eb",
                  flex: 1,
                }}>
                  <input
                    type="radio"
                    name="visibility"
                    value="Only Selected Users & Roles"
                    checked={formData.visibility === "Only Selected Users & Roles"}
                    onChange={handleChange}
                    style={{ cursor: "pointer" }}
                  />
                  <User size={16} style={{ color: "#6b7280" }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>Only Selected Users & Roles</span>
                </label>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: formData.visibility === "Everyone" ? "#eff6ff" : "#ffffff",
                  border: formData.visibility === "Everyone" ? "1px solid #156372" : "1px solid #e5e7eb",
                  flex: 1,
                }}>
                  <input
                    type="radio"
                    name="visibility"
                    value="Everyone"
                    checked={formData.visibility === "Everyone"}
                    onChange={handleChange}
                    style={{ cursor: "pointer" }}
                  />
                  <Users size={16} style={{ color: "#6b7280" }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>Everyone</span>
                </label>
              </div>

              {/* User Selection Interface - Shows when "Only Selected Users & Roles" is selected */}
              {formData.visibility === "Only Selected Users & Roles" && (
                <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ position: "relative" }}>
                    <select
                      name="userType"
                      value={formData.userType}
                      onChange={handleChange}
                      style={{
                        padding: "8px 32px 8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        outline: "none",
                        backgroundColor: "#ffffff",
                        cursor: "pointer",
                        appearance: "none",
                        minWidth: "100px",
                      }}
                    >
                      <option value="Users">Users</option>
                      <option value="Roles">Roles</option>
                    </select>
                    <ChevronDown
                      size={16}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "#6b7280"
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    name="selectUsers"
                    value={formData.selectUsers}
                    onChange={handleChange}
                    placeholder="Select Users"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: "14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.selectUsers.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          selectedUsers: [...prev.selectedUsers, prev.selectUsers],
                          selectUsers: "",
                        }));
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      color: "#156372",
                      backgroundColor: "#ffffff",
                      border: "1px solid #156372",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Plus size={16} />
                    Add Users
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={modalStyles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...modalStyles.footerButton, ...modalStyles.cancelButton }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...modalStyles.footerButton, ...modalStyles.saveButton }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


