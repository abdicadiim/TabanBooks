import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Plus, MoreVertical, Star, X, Search, ArrowUpDown, Download, Upload, Settings, SlidersHorizontal, Columns, RefreshCw, ChevronRight, GripVertical, Trash2, Check, Lock, ChevronUp as ChevronUpIcon, ChevronDown as ChevronDownIcon, AlertTriangle, Eye, EyeOff, Info } from "lucide-react";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import ExportPayments from "./ExportPayments";
import { paymentsMadeAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { buildPaymentDeleteWarning } from "../../../utils/paymentDeleteWarning";

interface Payment {
  id: string | number;
  paymentNumber: string;
  vendorName: string;
  location?: string;
  locationName?: string;
  reference?: string;
  billNumber?: string;
  status: string;
  amount: number;
  currency?: string;
  date: string;
  mode: string;
  unusedAmount?: number;
}

let cachedPayments: Payment[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000;

export default function PaymentsMade() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const displayCurrencyCode = baseCurrencyCode || "USD";
  const displayCurrencySymbol = baseCurrencySymbol || displayCurrencyCode;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Payments");
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>(cachedPayments);
  const [selectedPayments, setSelectedPayments] = useState<(string | number)[]>([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(cachedPayments.length > 0);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [sortBySubmenuOpen, setSortBySubmenuOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [showImportExcessModal, setShowImportExcessModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("payments");
  const [preferencesDropdownOpen, setPreferencesDropdownOpen] = useState(false);
  const [preferencesDropdownPosition, setPreferencesDropdownPosition] = useState({ top: 0, left: 0 });

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchModule, setSearchModule] = useState("Payments Made");
  const [searchFilter, setSearchFilter] = useState("All Payments");
  const [appliedAdvancedSearch, setAppliedAdvancedSearch] = useState<any | null>(null);
  const [searchModalData, setSearchModalData] = useState({
    vendor: "",
    referenceNumber: "",
    totalRangeFrom: "",
    totalRangeTo: "",
    paymentMethod: "",
    paymentNumber: "",
    dateRangeFrom: "",
    dateRangeTo: "",
    status: "",
    notes: "",
  });

  // Custom View Modal State
  const [customViewName, setCustomViewName] = useState("");
  const [markAsFavorite, setMarkAsFavorite] = useState(false);
  const [criteria, setCriteria] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([
    "Payment #",
    "Reference#",
    "Bill#",
    "Status",
    "Unused Amount",
    "Paid Through Account"
  ]);
  const [selectedColumns, setSelectedColumns] = useState([
    "Date *",
    "Vendor Name *",
    "Mode *",
    "Amount *"
  ]);
  const [columnSearch, setColumnSearch] = useState("");
  const [visibilityPreference, setVisibilityPreference] = useState("Only Selected Users & Roles");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userInput, setUserInput] = useState("");

  const dropdownRef = useRef(null);
  // const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const exportSubmenuRef = useRef<HTMLDivElement>(null);
  const importSubmenuRef = useRef<HTMLDivElement>(null);
  const sortBySubmenuRef = useRef<HTMLDivElement>(null);
  const preferencesDropdownRef = useRef<HTMLDivElement>(null);

  // Load payments from API
  const loadPayments = async (force = false) => {
    const now = Date.now();
    const shouldRefresh = force || (now - lastFetchTime > CACHE_DURATION) || cachedPayments.length === 0;

    if (!shouldRefresh && cachedPayments.length > 0) {
      setPayments(cachedPayments);
      setHasLoadedOnce(true);
      return;
    }

    try {
      if (cachedPayments.length === 0) {
        setIsRefreshing(true);
      }
      const response = await paymentsMadeAPI.getAll();
      if (response && response.success && response.data) {
        setPayments(response.data);
        cachedPayments = response.data;
        lastFetchTime = now;
      } else {
        setPayments([]);
        cachedPayments = [];
        lastFetchTime = now;
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      setPayments([]);
    } finally {
      setIsRefreshing(false);
      setHasLoadedOnce(true);
    }
  };

  const handleRefresh = () => {
    loadPayments(true);
    setSelectedPayments([]);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Reload payments when location changes (e.g., coming back from new payment page)
  useEffect(() => {
    loadPayments();
  }, [location.pathname]);

  // Format date
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

  // Filter payments based on selected view and search query
  const filteredPayments = payments.filter((payment) => {
    const effectiveView = appliedAdvancedSearch?.filterType || selectedView;

    // Filter by view
    if (effectiveView === "All Payments") {
      // No view filter
    } else if (effectiveView === "Draft") {
      if (payment.status !== "DRAFT") return false;
    } else if (effectiveView === "Paid") {
      if (payment.status !== "PAID") return false;
    } else if (effectiveView === "Void") {
      if (payment.status !== "VOID") return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableFields = [
        payment.paymentNumber || "",
        payment.vendorName || "",
        payment.reference || "",
        payment.billNumber || "",
        payment.status || "",
        payment.amount.toString() || "", // Convert number to string for search
        payment.currency || "",
      ];
      const matches = searchableFields.some(field =>
        field.toString().toLowerCase().includes(query)
      );
      if (!matches) return false;
    }

    // Advanced search filters
    if (appliedAdvancedSearch) {
      const toLower = (v: any) => String(v || "").toLowerCase();
      const parseAmount = (v: any) => parseFloat(String(v || 0).replace(/[^0-9.-]/g, "")) || 0;
      const parseDate = (v: any) => {
        if (!v) return null;
        if (typeof v === "string" && v.includes("/")) {
          const [d, m, y] = v.split("/");
          if (d && m && y) {
            const dt = new Date(Number(y), Number(m) - 1, Number(d));
            return Number.isNaN(dt.getTime()) ? null : dt;
          }
        }
        const dt = new Date(v);
        return Number.isNaN(dt.getTime()) ? null : dt;
      };

      if (appliedAdvancedSearch.vendor && !toLower(payment.vendorName).includes(toLower(appliedAdvancedSearch.vendor))) return false;
      if (appliedAdvancedSearch.referenceNumber && !toLower(payment.reference || payment.referenceNumber).includes(toLower(appliedAdvancedSearch.referenceNumber))) return false;
      if (appliedAdvancedSearch.paymentMethod && !toLower(payment.mode || payment.paymentMethod).includes(toLower(appliedAdvancedSearch.paymentMethod))) return false;
      if (appliedAdvancedSearch.paymentNumber && !toLower(payment.paymentNumber).includes(toLower(appliedAdvancedSearch.paymentNumber))) return false;
      if (appliedAdvancedSearch.status && toLower(payment.status) !== toLower(appliedAdvancedSearch.status)) return false;
      if (appliedAdvancedSearch.notes && !toLower(payment.notes).includes(toLower(appliedAdvancedSearch.notes))) return false;

      const amount = parseAmount(payment.amount);
      const min = appliedAdvancedSearch.totalRangeFrom !== "" ? parseAmount(appliedAdvancedSearch.totalRangeFrom) : null;
      const max = appliedAdvancedSearch.totalRangeTo !== "" ? parseAmount(appliedAdvancedSearch.totalRangeTo) : null;
      if (min !== null && amount < min) return false;
      if (max !== null && amount > max) return false;

      const paymentDate = parseDate(payment.date);
      const fromDate = parseDate(appliedAdvancedSearch.dateRangeFrom);
      const toDate = parseDate(appliedAdvancedSearch.dateRangeTo);
      if (fromDate && paymentDate && paymentDate < fromDate) return false;
      if (toDate && paymentDate && paymentDate > toDate) return false;
    }

    return true;
  });

  // Export function
  const handleExport = (format: string, paymentsToExport: Payment[]) => {
    const exportData = paymentsToExport.slice(0, 25000);

    if (format === "csv") {
      const headers = ["Payment Number", "Date", "Vendor", "Amount", "Currency", "Payment Method", "Status"];

      let csvContent = headers.join(",") + "\n";

      exportData.forEach((payment) => {
        const row = [
          `"${(payment.paymentNumber || payment.id || "").toString().replace(/"/g, '""')}"`,
          `"${(payment.date || "").replace(/"/g, '""')}"`,
          `"${(payment.vendorName || "").replace(/"/g, '""')}"`, // Changed from payment.vendor to payment.vendorName
          payment.amount.toString() || "0.00",
          `"${displayCurrencyCode.replace(/"/g, '""')}"`,
          `"${(payment.mode || "").replace(/"/g, '""')}"`, // Changed from payment.paymentMethod to payment.mode
          `"${(payment.status || "").replace(/"/g, '""')}"`,
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `payments_${new Date().toISOString().split('T')[0]}.csv`);
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
      link.download = `payments_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPayments(filteredPayments.map((p) => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleSelectPayment = (id: string | number) => {
    setSelectedPayments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = () => {
    if (selectedPayments.length === 0) {
      alert("Please select at least one payment to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const handleBulkUpdateSubmit = async (field: string, value: any) => {
    if (!selectedPayments.length) {
      alert("Please select at least one payment.");
      return;
    }

    const payloadByField: Record<string, any> = {
      date: value,
      paymentMethod: value,
      paymentReference: value,
      currency: String(value || "").toUpperCase(),
      amount: Number(value),
      notes: value
    };

    const payloadValue = payloadByField[field];
    if (payloadValue === undefined || payloadValue === null || payloadValue === "") {
      alert("Please enter a valid value.");
      return;
    }
    if (field === "amount" && !Number.isFinite(payloadValue)) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      await Promise.all(
        selectedPayments.map((paymentId) =>
          paymentsMadeAPI.update(paymentId, { [field]: payloadValue })
        )
      );
      await loadPayments();
      setSelectedPayments([]);
      alert(`Successfully updated ${selectedPayments.length} payment(s).`);
    } catch (error: any) {
      console.error("Error bulk updating payments:", error);
      alert(error?.message || "Failed to bulk update payments.");
    }
  };

  const paymentFieldOptions = [
    { value: "date", label: "Payment Date", type: "date" },
    {
      value: "paymentMethod",
      label: "Payment Method",
      type: "select",
      options: [
        { label: "Cash", value: "cash" },
        { label: "Check", value: "check" },
        { label: "Credit Card", value: "card" },
        { label: "Bank Transfer", value: "bank_transfer" },
        { label: "Others", value: "other" }
      ]
    },
    { value: "paymentReference", label: "Reference Number", type: "text" },
    { value: "currency", label: "Currency", type: "text", placeholder: "USD" },
    { value: "amount", label: "Amount", type: "number", min: 0, step: "0.01" },
    { value: "notes", label: "Notes", type: "text" }
  ];

  // Custom View Modal Functions
  const addCriterion = () => {
    setCriteria([...criteria, { id: Date.now(), field: "", comparator: "", value: "" }]);
  };

  const removeCriteria = (id: number) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const handleCriteriaChange = (id: number, field: string, value: any) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const moveColumnToSelected = (column: string) => {
    if (!selectedColumns.includes(column)) {
      setSelectedColumns([...selectedColumns, column]);
      setAvailableColumns(availableColumns.filter(c => c !== column));
    }
  };

  const moveColumnToAvailable = (column: string) => {
    if (!availableColumns.includes(column)) {
      setAvailableColumns([...availableColumns, column]);
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    }
  };

  const handleSaveCustomView = () => {
    // Save custom view logic here
    console.log("Saving custom view:", {
      name: customViewName,
      favorite: markAsFavorite,
      criteria,
      columns: selectedColumns,
      visibility: visibilityPreference,
      users: selectedUsers
    });
    setShowCustomViewModal(false);
    // Reset form
    setCustomViewName("");
    setMarkAsFavorite(false);
    setCriteria([]);
  };

  const handleCancelCustomView = () => {
    setShowCustomViewModal(false);
    // Reset form
    setCustomViewName("");
    setMarkAsFavorite(false);
    setCriteria([]);
    setSelectedUsers([]);
    setUserInput("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        if (exportSubmenuRef.current && !exportSubmenuRef.current.contains(event.target as Node)) {
          setExportSubmenuOpen(false);
        }
        if (importSubmenuRef.current && !importSubmenuRef.current.contains(event.target as Node)) {
          setImportSubmenuOpen(false);
        }
        if (sortBySubmenuRef.current && !sortBySubmenuRef.current.contains(event.target as Node)) {
          setSortBySubmenuOpen(false);
        }
        if (!exportSubmenuRef.current?.contains(event.target as Node) && !importSubmenuRef.current?.contains(event.target as Node) && !sortBySubmenuRef.current?.contains(event.target as Node)) {
          setMoreMenuOpen(false);
        }
      }
      if (preferencesDropdownRef.current && !preferencesDropdownRef.current.contains(event.target as Node)) {
        setPreferencesDropdownOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen, exportSubmenuOpen, importSubmenuOpen, sortBySubmenuOpen]);

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      minHeight: "100vh",
    },
    header: {
      padding: "12px 24px",
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flex: 1,
    },
    refreshButton: {
      padding: "8px",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "6px",
      color: "#6b7280",
    },
    searchBar: {
      flex: 1,
      maxWidth: "400px",
      position: "relative",
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px 8px 36px",
      fontSize: "14px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#111827",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#9ca3af",
      pointerEvents: "none",
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    dropdownButton: {
      fontSize: "14px",
      fontWeight: "400",
      color: "#111827",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 8px",
      borderRadius: "4px",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      textAlign: "left",
      position: "relative",
    },
    dropdownItemSelected: {
      backgroundColor: "#eff6ff",
      borderLeft: "3px solid #156372",
      paddingLeft: "13px",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    newButton: {
      padding: "6px 14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "background-color 0.2s",
    },
    moreWrapper: {
      position: "relative",
      display: "inline-block",
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
    moreMenu: {
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
    moreMenuItem: {
      display: "flex",
      alignItems: "center",
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
      padding: "48px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 200px)",
      backgroundColor: "#ffffff",
    },
    heading: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#111827",
      margin: "0 0 12px 0",
      textAlign: "center",
    },
    description: {
      fontSize: "14px",
      color: "#6b7280",
      textAlign: "center",
      margin: "0 0 32px 0",
      lineHeight: 1.5,
    },
    actions: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    },
    actionButton: {
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
      padding: "0",
    },
    tableWrapper: {
      overflowX: "auto",
      width: "calc(100% + 16px)",
      marginLeft: "-16px",
    },
    table: {
      width: "100%",
      minWidth: "1500px",
      borderCollapse: "collapse",
      backgroundColor: "#ffffff",
    },
    tableHeader: {
      backgroundColor: "#f8fafc",
      borderBottom: "1px solid #dbe4ef",
    },
    tableHeaderCell: {
      padding: "14px 18px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#64748b",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      borderBottom: "1px solid #dbe4ef",
    },
    tableHeaderCellWithCheckbox: {
      padding: "14px 18px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#64748b",
      textTransform: "uppercase",
      borderBottom: "1px solid #dbe4ef",
      width: "86px",
    },
    tableHeaderCheckboxWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tableHeaderAmount: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "8px",
    },
    tableRow: {
      borderBottom: "1px solid #e2e8f0",
      cursor: "pointer",
      transition: "background-color 0.15s ease",
    },
    tableCell: {
      padding: "15px 18px",
      fontSize: "14px",
      color: "#374151",
      whiteSpace: "nowrap",
    },
    firstColumnCell: {
      width: "86px",
      padding: "15px 18px",
    },
    rowCheckboxWrap: {
      display: "flex",
      alignItems: "center",
      gap: 0,
    },
    rowCheckboxSpacer: {
      width: "24px",
      flexShrink: 0 as const,
    },
    tableCheckbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
      accentColor: "#156372",
      borderRadius: "4px",
    },
    paymentNumberLink: {
      color: "#2563eb",
      textDecoration: "none",
      cursor: "pointer",
      fontWeight: "500",
    },
    statusBadge: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#16a34a",
      backgroundColor: "transparent",
      padding: 0,
      borderRadius: 0,
      display: "inline",
      textTransform: "uppercase",
      letterSpacing: 0,
    },
    statusBadgeDraft: {
      backgroundColor: "transparent",
      color: "#64748b",
    },
    statusBadgeVoid: {
      backgroundColor: "transparent",
      color: "#ef4444",
    },
    tableAmount: {
      fontWeight: "500",
      textAlign: "right",
      color: "#111827",
    },
  };

  const handleDeleteSelected = async () => {
    if (selectedPayments.length === 0) {
      alert("Please select at least one payment to delete.");
      return;
    }

    const selectedBillLabels = payments
      .filter((payment) => selectedPayments.includes(payment.id))
      .flatMap((payment) =>
        String(payment.billNumber || "")
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
      );

    if (!window.confirm(buildPaymentDeleteWarning({
      paymentCount: selectedPayments.length,
      billLabels: selectedBillLabels,
    }))) {
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await paymentsMadeAPI.bulkDelete(selectedPayments);
      if (response && response.success) {
        setSelectedPayments([]);
        window.dispatchEvent(new Event("paymentsUpdated"));
        window.dispatchEvent(new Event("billsUpdated"));
        await loadPayments();
      } else {
        alert(response?.message || "Error deleting payments");
      }
    } catch (error) {
      console.error("Error in bulk delete:", error);
      alert("Error deleting payments. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
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
      {selectedPayments.length > 0 && (
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
            <div style={{
              width: "1px",
              height: "20px",
              backgroundColor: "#e5e7eb"
            }}></div>
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
              {selectedPayments.length} Selected
            </span>
          </div>
          <button
            onClick={() => setSelectedPayments([])}
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
      {selectedPayments.length === 0 && (
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "#fff",
          padding: "0",
          borderBottom: "1px solid #e5e7eb"
        }}>
          {/* Top Primary Header */}
          <div style={{ ...styles.header, borderBottom: "none", padding: "12px 24px" }}>
            <div style={styles.headerLeft}>
              <div style={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  style={{ ...styles.dropdownButton, fontSize: "18px", fontWeight: "600", color: "#111827" }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {selectedView}
                  {dropdownOpen ? (
                    <ChevronUp size={20} style={{ color: "#156372" }} />
                  ) : (
                    <ChevronDown size={20} style={{ color: "#156372" }} />
                  )}
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    {["All Payments", "Draft", "Paid", "Void"].map((option) => (
                      <button
                        key={option}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedView === option ? styles.dropdownItemSelected : {}),
                        }}
                        onClick={() => {
                          setSelectedView(option);
                          setDropdownOpen(false);
                        }}
                      >
                        <span style={{ flex: 1, textAlign: "left" }}>{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.headerRight}>
              <button
                style={{ ...styles.newButton, backgroundColor: "#156372" }}
                onClick={() => navigate("/purchases/payments-made/new")}
              >
                <Plus size={16} />
                New
              </button>
              <div style={styles.moreWrapper} ref={moreMenuRef}>
                <button
                  style={styles.moreButton}
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div style={styles.moreMenu}>
                    {/* Sort by */}
                    <div style={{ position: "relative" }} ref={sortBySubmenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortBySubmenuOpen(!sortBySubmenuOpen);
                        }}
                        style={{
                          ...styles.moreMenuItem,
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <ArrowUpDown size={16} style={{ color: "#6b7280" }} />
                          <span>Sort by</span>
                        </div>
                        <ChevronRight size={12} style={{ color: "#6b7280" }} />
                      </button>
                      {sortBySubmenuOpen && (
                        <div style={{
                          position: "absolute",
                          top: 0,
                          right: "100%",
                          marginRight: "8px",
                          backgroundColor: "#fff",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          minWidth: "200px",
                          border: "1px solid #e5e7eb",
                          zIndex: 1001,
                          padding: "4px 0"
                        }}>
                          {["Date", "Payment #", "Vendor Name", "Mode", "Amount"].map((field) => (
                            <button
                              key={field}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSortBySubmenuOpen(false);
                                setMoreMenuOpen(false);
                              }}
                              style={styles.moreMenuItem}
                            >
                              {field}
                            </button>
                          ))}
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
                          ...styles.moreMenuItem,
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Download size={16} style={{ color: "#6b7280" }} />
                          <span>Import</span>
                        </div>
                        <ChevronRight size={12} style={{ color: "#6b7280" }} />
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
                          minWidth: "200px",
                          border: "1px solid #e5e7eb",
                          zIndex: 1001,
                          padding: "4px 0"
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/purchases/payments-made/import");
                              setMoreMenuOpen(false);
                            }}
                            style={styles.moreMenuItem}
                          >
                            Import Payments
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preferences */}
                    <button
                      style={styles.moreMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuOpen(false);
                        navigate("/settings/payments-made");
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Settings size={16} style={{ color: "#6b7280" }} />
                        <span>Preferences</span>
                      </div>
                    </button>

                    {/* Refresh List */}
                    <button
                      style={styles.moreMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreMenuOpen(false);
                        handleRefresh();
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <RefreshCw size={16} style={{ color: "#6b7280" }} />
                        <span>Refresh List</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Filter Bar */}
          <div style={{ padding: "4px 0" }}>
            {/* Filter bar content removed as requested */}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.tableContainer}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCellWithCheckbox}>
                  <div style={{ ...styles.tableHeaderCheckboxWrapper, position: "relative" }}>
                    <button 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPreferencesDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                        setPreferencesDropdownOpen(!preferencesDropdownOpen);
                      }}
                      style={{ 
                        background: "none", 
                        border: "none", 
                        padding: 0, 
                        display: "flex", 
                        alignItems: "center", 
                        cursor: "pointer",
                      }}
                    >
                      <SlidersHorizontal size={16} style={{ color: "#156372" }} />
                    </button>

                    {preferencesDropdownOpen && createPortal(
                      <div 
                        ref={preferencesDropdownRef}
                        style={{
                          position: "absolute",
                          top: preferencesDropdownPosition.top + 8,
                          left: preferencesDropdownPosition.left,
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                          border: "1px solid #e5e7eb",
                          minWidth: "180px",
                          zIndex: 2000,
                          padding: "6px",
                        }}
                      >
                        <button
                          style={{
                            ...styles.dropdownItem,
                            backgroundColor: "#156372",
                            color: "#ffffff",
                            borderRadius: "6px",
                            marginBottom: "4px",
                            width: "100%",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => {
                            setShowPreferencesModal(true);
                            setPreferencesDropdownOpen(false);
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Columns size={16} style={{ color: "#ffffff" }} />
                            <span style={{ fontWeight: "500" }}>Customize Columns</span>
                          </div>
                        </button>
                        <button
                          style={{
                            ...styles.dropdownItem,
                            width: "100%",
                            whiteSpace: "nowrap",
                          }}
                          onClick={() => {
                            setPreferencesDropdownOpen(false);
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <RefreshCw size={16} style={{ color: "#156372" }} />
                            <span>Clip Text</span>
                          </div>
                        </button>
                      </div>,
                      document.body
                    )}

                    <input
                      type="checkbox"
                      checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                      onChange={handleSelectAll}
                      style={styles.tableCheckbox}
                    />
                  </div>
                </th>
                <th style={styles.tableHeaderCell}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    DATE
                    <ArrowUpDown size={14} style={{ color: "#9ca3af" }} />
                  </div>
                </th>
                <th style={styles.tableHeaderCell}>LOCATION</th>
                <th style={styles.tableHeaderCell}>PAYMENT #</th>
                <th style={styles.tableHeaderCell}>REFERENCE#</th>
                <th style={styles.tableHeaderCell}>VENDOR NAME</th>
                <th style={styles.tableHeaderCell}>BILL#</th>
                <th style={styles.tableHeaderCell}>MODE</th>
                <th style={styles.tableHeaderCell}>STATUS</th>
                <th style={{ ...styles.tableHeaderCell, textAlign: "right" }}>
                  <div style={styles.tableHeaderAmount}>
                    AMOUNT
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
                      onClick={() => {
                        setSearchModule("Payments Made");
                        setSearchFilter(selectedView || "All Payments");
                        setShowSearchModal(true);
                      }}
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </th>
                <th style={{ ...styles.tableHeaderCell, textAlign: "right" }}>UNUSED AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    style={styles.tableRow}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox
                      if (e.target instanceof HTMLElement && e.target.type !== "checkbox" && e.target.tagName !== "SPAN") {
                        navigate(`/purchases/payments-made/${payment.id}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ ...styles.tableCell, ...styles.firstColumnCell }} onClick={(e) => e.stopPropagation()}>
                      <div style={styles.rowCheckboxWrap}>
                        <div style={styles.rowCheckboxSpacer}></div>
                        <input
                          type="checkbox"
                          checked={selectedPayments.includes(payment.id)}
                          onChange={() => handleSelectPayment(payment.id)}
                          style={styles.tableCheckbox}
                        />
                      </div>
                    </td>
                    <td style={styles.tableCell}>{formatDate(payment.date)}</td>
                    <td style={styles.tableCell}>{payment.locationName || payment.location || "Head Office"}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={styles.paymentNumberLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/payments-made/${payment.id}`);
                        }}
                      >
                        {payment.paymentNumber}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{payment.reference || ""}</td>
                    <td style={styles.tableCell}>{payment.vendorName || ""}</td>
                    <td style={styles.tableCell}>{payment.billNumber || ""}</td>
                    <td style={styles.tableCell}>{payment.mode}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(payment.status === "PAID"
                            ? {}
                            : payment.status === "VOID"
                              ? styles.statusBadgeVoid
                              : styles.statusBadgeDraft),
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                  <td style={{ ...styles.tableCell, ...styles.tableAmount }}>
                      {displayCurrencySymbol}
                      {parseFloat(payment.amount.toString() || "0").toFixed(2)}
                    </td>
                    <td style={{ ...styles.tableCell, ...styles.tableAmount }}>
                      {displayCurrencySymbol}
                      {parseFloat(payment.unusedAmount?.toString() || "0").toFixed(2)}
                    </td>
                  </tr>
                ))}
              {filteredPayments.length === 0 && hasLoadedOnce && !isRefreshing && (
                <tr>
                  <td colSpan="10" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Payments"
        fieldOptions={paymentFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="payments"
      />

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
                Payment Preferences
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
                value={displayCurrencyCode}
                disabled
              >
                <option value={displayCurrencyCode}>
                  {displayCurrencyCode} ({displayCurrencySymbol})
                </option>
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

      {/* Manage Custom Fields Modal */}
      {showCustomFieldsModal && (
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
          onClick={() => setShowCustomFieldsModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
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
                Manage Custom Fields
              </h2>
              <button
                onClick={() => setShowCustomFieldsModal(false)}
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
                Manage custom fields for payments. Add, edit, or remove custom fields to track additional information.
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
                  Custom fields management will be available in a future update.
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
                onClick={() => setShowCustomFieldsModal(false)}
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

      {/* New Custom View Modal */}
      {showCustomViewModal && (
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
          zIndex: 2000,
          overflowY: 'auto',
          padding: '20px'
        }}
          onClick={() => handleCancelCustomView()}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            margin: 'auto'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                New Custom View
              </h2>
              <button
                onClick={handleCancelCustomView}
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
                <X size={24} style={{ color: '#6b7280' }} />
              </button>
            </div>

            {/* Name Section */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Name<span style={{ color: '#156372' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="text"
                  value={customViewName}
                  onChange={(e) => setCustomViewName(e.target.value)}
                  placeholder="Enter view name"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    color: '#111827'
                  }}
                />
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <input
                    type="checkbox"
                    checked={markAsFavorite}
                    onChange={(e) => setMarkAsFavorite(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Mark as Favorite</span>
                  <Star
                    size={16}
                    style={{
                      color: '#9ca3af',
                      fill: markAsFavorite ? '#fbbf24' : 'none',
                      stroke: markAsFavorite ? '#fbbf24' : '#9ca3af',
                      strokeWidth: 1.5
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Define the criteria Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px'
              }}>
                Define the criteria (if any)
              </h3>
              {criteria.map((criterion, index) => (
                <div key={criterion.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>
                  <select
                    value={criterion.field}
                    onChange={(e) => updateCriterion(criterion.id, 'field', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: '#111827'
                    }}
                  >
                    <option value="">Select a field</option>
                    <option value="date">Date</option>
                    <option value="vendor">Vendor Name</option>
                    <option value="amount">Amount</option>
                    <option value="status">Status</option>
                    <option value="mode">Mode</option>
                  </select>
                  <select
                    value={criterion.comparator}
                    onChange={(e) => updateCriterion(criterion.id, 'comparator', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: '#111827'
                    }}
                  >
                    <option value="">Select a comparator</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater">Greater than</option>
                    <option value="less">Less than</option>
                  </select>
                  <input
                    type="text"
                    value={criterion.value}
                    onChange={(e) => updateCriterion(criterion.id, 'value', e.target.value)}
                    placeholder="Enter value"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      color: '#111827'
                    }}
                  />
                  <button
                    onClick={() => addCriterion()}
                    style={{
                      padding: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => removeCriterion(criterion.id)}
                    style={{
                      padding: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button
                onClick={addCriterion}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#156372',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'underline',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} style={{ color: '#156372' }} />
                Add Criterion
              </button>
            </div>

            {/* Columns Preference Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px'
              }}>
                Columns Preference:
              </h3>
              <div style={{
                display: 'flex',
                gap: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '16px',
                minHeight: '400px'
              }}>
                {/* Available Columns */}
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    marginBottom: '12px'
                  }}>
                    AVAILABLE COLUMNS
                  </h4>
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={16} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      pointerEvents: 'none'
                    }} />
                    <input
                      type="text"
                      placeholder="Search"
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        color: '#111827'
                      }}
                    />
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                    {availableColumns
                      .filter(col => col.toLowerCase().includes(columnSearch.toLowerCase()))
                      .map((column) => (
                        <div
                          key={column}
                          onClick={() => moveColumnToSelected(column)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            marginBottom: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <GripVertical size={16} style={{ color: '#9ca3af' }} />
                          <span style={{ fontSize: '14px', color: '#111827' }}>{column}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Selected Columns */}
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Check size={14} style={{ color: '#10b981' }} />
                    SELECTED COLUMNS
                  </h4>
                  <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                    {selectedColumns.map((column) => (
                      <div
                        key={column}
                        onClick={() => moveColumnToAvailable(column)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <GripVertical size={16} style={{ color: '#9ca3af' }} />
                        <span style={{ fontSize: '14px', color: '#111827' }}>{column}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visibility Preference Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px'
              }}>
                Visibility Preference
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Share With
                </h4>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    <input
                      type="radio"
                      name="visibility"
                      value="Only Me"
                      checked={visibilityPreference === "Only Me"}
                      onChange={(e) => setVisibilityPreference(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Lock size={16} style={{ color: '#6b7280' }} />
                    <span>Only Me</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    <input
                      type="radio"
                      name="visibility"
                      value="Only Selected Users & Roles"
                      checked={visibilityPreference === "Only Selected Users & Roles"}
                      onChange={(e) => setVisibilityPreference(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Lock size={16} style={{ color: '#6b7280' }} />
                    <span>Only Selected Users & Roles</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151'
                  }}>
                    <input
                      type="radio"
                      name="visibility"
                      value="Everyone"
                      checked={visibilityPreference === "Everyone"}
                      onChange={(e) => setVisibilityPreference(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Lock size={16} style={{ color: '#6b7280' }} />
                    <span>Everyone</span>
                  </label>
                </div>

                {visibilityPreference === "Only Selected Users & Roles" && (
                  <div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                      <select
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          color: '#111827'
                        }}
                      >
                        <option>Users</option>
                        <option>Roles</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Select Users"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          color: '#111827'
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <ChevronUpIcon size={14} style={{ color: '#6b7280', cursor: 'pointer' }} />
                        <ChevronDownIcon size={14} style={{ color: '#6b7280', cursor: 'pointer' }} />
                      </div>
                      <button
                        onClick={() => {
                          if (userInput && !selectedUsers.includes(userInput)) {
                            setSelectedUsers([...selectedUsers, userInput]);
                            setUserInput("");
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#156372',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Plus size={16} style={{ color: '#156372' }} />
                        Add Users
                      </button>
                      {selectedUsers.length === 0 && (
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          margin: '8px 0 0 0'
                        }}>
                          You haven't shared this Custom View with any users yet. Select the users or roles to share it with and provide their access permissions.
                        </p>
                      )}
                      {selectedUsers.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          {selectedUsers.map((user, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '6px',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontSize: '14px', color: '#111827' }}>{user}</span>
                              <button
                                onClick={() => setSelectedUsers(selectedUsers.filter((_, i) => i !== index))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px'
                                }}
                              >
                                <X size={16} style={{ color: '#6b7280' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={handleSaveCustomView}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#0D4A52',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0D4A52'}
              >
                Save
              </button>
              <button
                onClick={handleCancelCustomView}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Applied Excess Payments Confirmation Modal */}
      {showImportExcessModal && (
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
          onClick={() => setShowImportExcessModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <AlertTriangle
                size={24}
                style={{
                  color: '#f59e0b',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              />
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 12px 0'
                }}>
                  Import Applied Excess Payments?
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#374151',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  When you import applied excess payments, the amount paid in excess will be added to the existing open or overdue bill amount if you've already recorded payment for it in Taban Books.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowImportExcessModal(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowImportExcessModal(false);
                  navigate("/purchases/payments-made/import/excess");
                }}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#0D4A52',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0D4A52'}
              >
                Proceed to Import
              </button>
            </div>
          </div>
        </div>
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
              maxWidth: "700px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
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
                    value={searchModule}
                    onChange={(e) => setSearchModule(e.target.value)}
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
                    <option value="Payments Made">Payments Made</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                    Filter
                  </label>
                  <select
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
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
                    <option value="All Payments">All Payments</option>
                    <option value="Draft">Draft</option>
                    <option value="Paid">Paid</option>
                    <option value="Void">Void</option>
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
            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", gap: "24px" }}>
                {/* Left Column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
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

                  {/* Payment Method */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Payment Method
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={searchModalData.paymentMethod}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, paymentMethod: e.target.value }))}
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
                </div>

                {/* Right Column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Payment # */}
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Payment #
                    </label>
                    <input
                      type="text"
                      value={searchModalData.paymentNumber}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, paymentNumber: e.target.value }))}
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
                    vendor: "",
                    referenceNumber: "",
                    totalRangeFrom: "",
                    totalRangeTo: "",
                    paymentMethod: "",
                    paymentNumber: "",
                    dateRangeFrom: "",
                    dateRangeTo: "",
                    status: "",
                    notes: "",
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
                  setAppliedAdvancedSearch({
                    ...searchModalData,
                    filterType: searchFilter,
                  });
                  setSelectedView(searchFilter);
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

      {
        showExportModal && (
          <ExportPayments
            onClose={() => setShowExportModal(false)}
            exportType={exportType}
            data={exportType === "current-view" ? filteredPayments : payments}
          />
        )
      }
    </div >
  );
}





