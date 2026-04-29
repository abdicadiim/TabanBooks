// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { getVendorCustomViews } from "../shared/purchasesModel";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-toastify";
import ExportVendors from "./ExportVendors";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import { vendorsAPI } from "../../../services/api";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  MoreVertical,
  Search,
  ArrowUpDown,
  Printer,
  X,
  Filter,
  Star,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Lock,
  Users,
  FileText,
  GripVertical,
  Trash2,
  Check,
  Info,
  Phone,
  Mail,
  Globe,
  MapPin,
  User,
  Tag,
  FileText as FileTextIcon,
  Upload as UploadIcon,
  GitMerge,
  Edit,
  Settings,
  Columns,
  SlidersHorizontal,
} from "lucide-react";

// Custom styles for purchases theme
const purchasesTheme = {
  primary: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)',
  primaryHover: 'linear-gradient(90deg, #0D4A52 0%, #0A3A42 100%)',
  secondary: '#156372',
  secondaryHover: '#0D4A52',
  danger: '#0D4A52',
  dangerHover: '#0D4A52',
  success: '#059669',
  successHover: '#047857'
};

const PENDING_VENDOR_STORAGE_KEY = "pending-vendor-save";

const readPendingVendor = () => {
  try {
    const cached = sessionStorage.getItem(PENDING_VENDOR_STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

const mergePendingVendor = (vendorsList) => {
  const pendingVendor = readPendingVendor();
  if (!pendingVendor) {
    return vendorsList;
  }

  const pendingId = String(pendingVendor?.id || pendingVendor?._id || "").trim();
  if (!pendingId) {
    return vendorsList;
  }

  const filteredVendors = (Array.isArray(vendorsList) ? vendorsList : []).filter(
    (vendor) => String(vendor?.id || vendor?._id || "").trim() !== pendingId
  );

  return [pendingVendor, ...filteredVendors];
};

export default function Vendor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vendors, setVendors] = useState(() => {
    try {
      const cached = localStorage.getItem("vendors");
      return mergePendingVendor(cached ? JSON.parse(cached) : []);
    } catch (error) {
      return [];
    }
  });
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedView, setSelectedView] = useState("All Vendors");
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showBulkActionMoreDropdown, setShowBulkActionMoreDropdown] = useState(false);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showCustomizeColumnsModal, setShowCustomizeColumnsModal] = useState(false);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [selectedSortBy, setSelectedSortBy] = useState("Name");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingStatements, setIsDownloadingStatements] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);

  // Field options for bulk update
  const vendorFieldOptions = [
    {
      value: "currency",
      label: "Currency",
      type: "select",
      options: [
        { value: "USD", label: "USD - United States Dollar" },
        { value: "EUR", label: "EUR - Euro" },
        { value: "GBP", label: "GBP - Pound Sterling" },
        { value: "AED", label: "AED - UAE Dirham" },
        { value: "INR", label: "INR - Indian Rupee" },
      ],
    },
    {
      value: "paymentTerms",
      label: "Payment Terms",
      type: "select",
      options: [
        "Due on Receipt",
        "Net 15",
        "Net 30",
        "Net 45",
        "Net 60",
        "Due end of the month",
        "Due end of next month",
      ],
    },
    {
      value: "vendorLanguage",
      label: "Vendor Language",
      type: "select",
      options: ["English", "Spanish", "French", "German"],
    },
    {
      value: "accountPayable",
      label: "Account Payable",
      type: "select",
      options: [
        "Accounts Payable",
        "Trade Payables",
        "Creditors",
      ],
    },
    {
      value: "openingBalance",
      label: "Opening Balance",
      type: "number",
      step: "0.01",
      placeholder: "0.00",
    },
    {
      value: "openingBalanceDate",
      label: "Opening Balance Date",
      type: "date",
    },
  ];

  const handleBulkUpdateSubmit = (field, value, selectedOption) => {
    let normalizedValue = value;

    if (selectedOption?.type === "number") {
      const parsedNumber = Number(value);
      if (Number.isNaN(parsedNumber)) {
        alert("Please enter a valid number.");
        return;
      }
      normalizedValue = parsedNumber;
    }

    const updatedVendors = vendors.map((v) => {
      if (!selectedVendors.includes(v.id)) {
        return v;
      }

      const updatedVendor = { ...v };
      const updatedFormData = { ...(v.formData || {}) };

      updatedVendor[field] = normalizedValue;
      updatedFormData[field] = normalizedValue;

      if (field === "vendorLanguage") {
        updatedVendor.portalLanguage = normalizedValue;
        updatedFormData.portalLanguage = normalizedValue;
      }

      updatedVendor.formData = updatedFormData;
      return updatedVendor;
    });

    setVendors(updatedVendors);
    localStorage.setItem("vendors", JSON.stringify(updatedVendors));
    window.dispatchEvent(new Event("vendorSaved"));
    setNotification(`Successfully updated ${selectedVendors.length} vendor(s)`);
    setTimeout(() => setNotification(null), 3000);
    setSelectedVendors([]);
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDateRange, setPrintDateRange] = useState({
    startDate: "01/12/2025",
    endDate: "31/12/2025"
  });
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [startDateCalendar, setStartDateCalendar] = useState(new Date(2025, 11, 1)); // December 2025
  const [endDateCalendar, setEndDateCalendar] = useState(new Date(2025, 11, 1)); // December 2025
  const startDatePickerRef = useRef(null);
  const endDatePickerRef = useRef(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSelectedVendor, setMergeSelectedVendor] = useState("");
  const [showExportVendorsModal, setShowExportVendorsModal] = useState(false);
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchModule, setSearchModule] = useState("Vendors");
  const [searchFilter, setSearchFilter] = useState("All Vendors");
  const vendorFilterOptions = [
    "All Vendors",
    "Active Vendors",
    "CRM Vendors",
    "Duplicate Vendors",
    "Inactive Vendors",
  ];
  const [searchData, setSearchData] = useState({
    displayName: "",
    firstName: "",
    email: "",
    phone: "",
    notes: "",
    companyName: "",
    lastName: "",
    status: "All",
    address: ""
  });
  const exportSubmenuTimeoutRef = useRef(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const [showAssociateTemplatesModal, setShowAssociateTemplatesModal] = useState(false);
  const [templateData, setTemplateData] = useState({
    vendorStatement: "Standard",
    purchaseOrder: "Standard Template",
    bills: "Standard Template",
    emailPurchaseOrder: "Default",
    emailPaymentsMade: "Default"
  });
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [customViews, setCustomViews] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([
    "name",
    "companyName",
    "email",
    "workPhone",
    "payablesBcy",
    "unusedCreditsBcy",
  ]);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const currencyDropdownRef = useRef(null);
  const [isPaymentTermsDropdownOpen, setIsPaymentTermsDropdownOpen] = useState(false);
  const [paymentTermsSearch, setPaymentTermsSearch] = useState("");
  const paymentTermsDropdownRef = useRef(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const languageDropdownRef = useRef(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const accountDropdownRef = useRef(null);
  const columnMenuRef = useRef(null);
  const getVendorId = (vendor) => String(vendor?.id || vendor?._id || "").trim();
  const getVendorField = (vendor, field, fallback = "-") => {
    const formData = vendor?.formData || {};
    const value = vendor?.[field] ?? formData?.[field];
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    return value;
  };
  const getVendorWebsite = (vendor) =>
    getVendorField(vendor, "website", vendor?.websiteUrl ?? vendor?.formData?.websiteUrl ?? "-");
  const getVendorStatus = (vendor) => {
    const rawStatus = getVendorField(vendor, "status", vendor?.active === false ? "Inactive" : "Active");
    return String(rawStatus)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };
  const persistVendors = (nextVendors) => {
    const mergedVendors = mergePendingVendor(nextVendors);
    setVendors(mergedVendors);
    try {
      localStorage.setItem("vendors", JSON.stringify(mergedVendors));
    } catch (storageError) {
    }
  };
  const normalizeVendorsList = (list) =>
    (Array.isArray(list) ? list : []).map((vendor) => ({
      ...vendor,
      id: getVendorId(vendor),
      _id: vendor?._id || vendor?.id || "",
    }));

  const loadVendors = async ({ showLoader = vendors.length === 0 } = {}) => {
    try {
      if (showLoader) {
        setIsRefreshing(true);
      }
      const response = await vendorsAPI.getAll();

      const vendorsList = Array.isArray(response)
        ? response
        : (response.data && Array.isArray(response.data)
          ? response.data
          : (response.data?.data && Array.isArray(response.data.data) ? response.data.data : []));

      const normalized = normalizeVendorsList(vendorsList);
      persistVendors(normalized);
    } catch (error) {
    } finally {
      if (showLoader) {
        setIsRefreshing(false);
      }
    }
  };
  const openSearchModalForCurrentContext = () => {
    setSearchModule("Vendors");
    setSearchFilter(selectedView || "All Vendors");
    setShowSearchModal(true);
  };


  useEffect(() => {
    setCustomViews(getVendorCustomViews());
  }, []);

  // Get display text for header based on selected view
  const getDisplayText = () => {
    if (selectedView === "Vendor Portal Enabled") return "Enabled";
    if (selectedView === "Vendor Portal Disabled") return "Disabled";
    return selectedView;
  };

  // Get full title for header
  const getHeaderTitle = () => {
    if (selectedView === "Vendor Portal Enabled" || selectedView === "Vendor Portal Disabled") {
      return "Vendor Portal ";
    }
    return "";
  };

  const handleNewVendor = () => navigate("/purchases/vendors/new");

  useEffect(() => {
    loadVendors({ showLoader: vendors.length === 0 });
  }, []);

  // Fail-safe for isRefreshing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isRefreshing) {
      timeout = setTimeout(() => {
        setIsRefreshing(false);
      }, 10000); // 10 seconds timeout
    }
    return () => clearTimeout(timeout);
  }, [isRefreshing]);

  // Filter vendors based on selected view
  const getFilteredVendors = () => {
    // Check for custom view
    const customView = customViews.find(cv => cv.name === selectedView);
    if (customView) {
      return vendors.filter(vendor => {
        return customView.criteria.every(criterion => {
          if (!criterion.field || !criterion.value) return true;

          let vendorValue = "";
          const fd = vendor.formData || {};

          switch (criterion.field) {
            case "Display Name": vendorValue = vendor.name || fd.displayName; break;
            case "Company Name": vendorValue = fd.companyName; break;
            case "Email": vendorValue = vendor.email || fd.email; break;
            case "Phone": vendorValue = vendor.phone || fd.phone; break;
            case "First Name": vendorValue = fd.firstName; break;
            case "Last Name": vendorValue = fd.lastName; break;
            case "Status": vendorValue = vendor.status || fd.status; break;
            default: vendorValue = fd[criterion.field] || vendor[criterion.field.toLowerCase()] || "";
          }

          const val = String(vendorValue || "").toLowerCase();
          const critVal = String(criterion.value).toLowerCase();

          switch (criterion.comparator) {
            case "is": return val === critVal;
            case "is not": return val !== critVal;
            case "contains": return val.includes(critVal);
            case "doesn't contain": return !val.includes(critVal);
            case "starts with": return val.startsWith(critVal);
            case "is empty": return val === "";
            case "is not empty": return val !== "";
            default: return true;
          }
        });
      });
    }

    if (selectedView === "All Vendors") {
      return vendors;
    } else if (selectedView === "Active Vendors") {
      // Filter vendors that are active (not inactive)
      return vendors.filter(v => v.status?.toLowerCase() !== "inactive" && v.active !== false);
    } else if (selectedView === "CRM Vendors") {
      // Filter vendors that are synced with CRM
      return vendors.filter(v => v.crmSync === true || v.formData?.crmSync === true);
    } else if (selectedView === "Duplicate Vendors") {
      // Find vendors with duplicate names or emails
      const nameMap = new Map();
      const emailMap = new Map();
      const duplicates = new Set();

      vendors.forEach(v => {
        const name = (v.name || v.formData?.displayName || v.formData?.companyName || v.formData?.vendorName || "").trim().toLowerCase();
        const email = (v.email || v.formData?.email || "").trim().toLowerCase();

        if (name) {
          if (nameMap.has(name)) {
            // Found duplicate name
            duplicates.add(nameMap.get(name));
            duplicates.add(v.id);
          } else {
            nameMap.set(name, v.id);
          }
        }

        if (email) {
          if (emailMap.has(email)) {
            // Found duplicate email
            duplicates.add(emailMap.get(email));
            duplicates.add(v.id);
          } else {
            emailMap.set(email, v.id);
          }
        }
      });

      return vendors.filter(v => duplicates.has(v.id));
    } else if (selectedView === "Inactive Vendors") {
      // Filter inactive vendors
      return vendors.filter(v => v.status?.toLowerCase() === "inactive" || v.active === false);
    } else if (selectedView === "Vendor Portal Enabled") {
      return vendors.filter(v => v.formData?.enablePortal === true || v.enablePortal === true);
    } else if (selectedView === "Vendor Portal Disabled") {
      return vendors.filter(v => !v.formData?.enablePortal && v.enablePortal !== true);
    }
    return Array.isArray(vendors) ? vendors : [];
  };

  const getSortedVendors = (vendorsList) => {
    if (!selectedSortBy || selectedSortBy === "Name") {
      return [...vendorsList].sort((a, b) => {
        const nameA = (a.name || a.formData?.displayName || "").toLowerCase();
        const nameB = (b.name || b.formData?.displayName || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    const sorted = [...vendorsList].sort((a, b) => {
      switch (selectedSortBy) {
        case "Company Name": {
          const companyA = (a.companyName || a.formData?.companyName || "").toLowerCase();
          const companyB = (b.companyName || b.formData?.companyName || "").toLowerCase();
          return companyA.localeCompare(companyB);
        }
        case "Unused Credits (BCY)": {
          const creditsA = typeof a.unusedCredits === 'number' ? a.unusedCredits : parseFloat(String(a.unusedCredits || "0").replace(/[^\d.-]/g, "")) || 0;
          const creditsB = typeof b.unusedCredits === 'number' ? b.unusedCredits : parseFloat(String(b.unusedCredits || "0").replace(/[^\d.-]/g, "")) || 0;
          return creditsB - creditsA; // Descending order (highest first)
        }
        case "Created Time": {
          // Use createdAt from MongoDB or ID as timestamp fallback
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.createdTime || parseInt(a.id) || parseInt(a._id) || 0);
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.createdTime || parseInt(b.id) || parseInt(b._id) || 0);
          return timeB - timeA; // Descending order (newest first)
        }
        case "Last Modified Time": {
          // Use updatedAt from MongoDB or ID as timestamp fallback
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.lastModifiedTime || parseInt(a.id) || parseInt(a._id) || 0);
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.lastModifiedTime || parseInt(b.id) || parseInt(b._id) || 0);
          return timeB - timeA; // Descending order (newest first)
        }
        default:
          return 0;
      }
    });

    return sorted;
  };

  const filteredVendors = getSortedVendors(getFilteredVendors());
  const vendorColumnOptions = [
    { id: "name", label: "Name", required: true },
    { id: "companyName", label: "Company Name" },
    { id: "email", label: "Email" },
    { id: "workPhone", label: "Work Phone" },
    { id: "payablesBcy", label: "Payables (BCY)" },
    { id: "unusedCreditsBcy", label: "Unused Credits (BCY)" },
    { id: "payables", label: "Payables" },
    { id: "unusedCredits", label: "Unused Credits" },
    { id: "source", label: "Source" },
    { id: "firstName", label: "First Name" },
    { id: "lastName", label: "Last Name" },
    { id: "mobilePhone", label: "Mobile Phone" },
    { id: "paymentTerms", label: "Payment Terms" },
    { id: "status", label: "Status" },
    { id: "website", label: "Website" },
  ];

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (exportSubmenuTimeoutRef.current) {
        clearTimeout(exportSubmenuTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('[data-dropdown-wrapper]')) {
        setShowDropdown(false);
      }
      if (showMoreDropdown && !event.target.closest('[data-more-dropdown-wrapper]')) {
        setShowMoreDropdown(false);
        setShowSortSubmenu(false);
        setShowImportSubmenu(false);
        setShowExportSubmenu(false);
        setHoveredMenuItem(null);
      }
      if (showBulkActionMoreDropdown && !event.target.closest('[data-bulk-action-more-dropdown]')) {
        setShowBulkActionMoreDropdown(false);
      }
      // Close row dropdown when clicking outside
      if (openDropdownId && !event.target.closest('[data-row-dropdown]')) {
        setOpenDropdownId(null);
      }
      // Close currency dropdown when clicking outside
      if (isCurrencyDropdownOpen && currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
        setCurrencySearch("");
      }
      // Close payment terms dropdown when clicking outside
      if (isPaymentTermsDropdownOpen && paymentTermsDropdownRef.current && !paymentTermsDropdownRef.current.contains(event.target)) {
        setIsPaymentTermsDropdownOpen(false);
        setPaymentTermsSearch("");
      }
      // Close language dropdown when clicking outside
      if (isLanguageDropdownOpen && languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false);
        setLanguageSearch("");
      }
      // Close account dropdown when clicking outside
      if (isAccountDropdownOpen && accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false);
        setAccountSearch("");
      }
      // Close date pickers when clicking outside
      if (isStartDatePickerOpen && startDatePickerRef.current && !startDatePickerRef.current.contains(event.target)) {
        setIsStartDatePickerOpen(false);
      }
      if (isEndDatePickerOpen && endDatePickerRef.current && !endDatePickerRef.current.contains(event.target)) {
        setIsEndDatePickerOpen(false);
      }
      if (showColumnMenu && columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown, showMoreDropdown, showBulkActionMoreDropdown, openDropdownId, isCurrencyDropdownOpen, isPaymentTermsDropdownOpen, isLanguageDropdownOpen, isAccountDropdownOpen, isStartDatePickerOpen, isEndDatePickerOpen, showSortSubmenu, showImportSubmenu, showExportSubmenu, showColumnMenu]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && selectedVendors.length > 0) {
        setSelectedVendors([]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedVendors.length]);



  const handleCheckboxChange = (vendorId) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAll = () => {
    const filtered = getFilteredVendors();
    if (selectedVendors.length === filtered.length && filtered.length > 0) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(filtered.map((v) => getVendorId(v)).filter(Boolean));
    }
  };

  // Inline styles
  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      borderRadius: "0",
      border: "1px solid #e9eef5",
      borderLeft: "none",
      borderRight: "none",
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
      paddingLeft: 0,
    },
    header: {
      padding: "14px 22px",
      borderBottom: "1px solid #e8edf4",
      backgroundColor: "#ffffff",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "16px",
      flexWrap: "wrap",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: "17px",
      fontWeight: "700",
      color: "#1f2937",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexWrap: "wrap",
    },
    statusText: {
      display: "inline-flex",
      alignItems: "center",
      gap: "2px",
      color: "#111827",
      fontWeight: "700",
    },
    chevronButton: {
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      color: purchasesTheme.secondary,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    bulkActionBar: {
      padding: "12px 24px",
      borderBottom: "1px solid #e8edf4",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    bulkActionLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
    },
    bulkActionButton: {
      padding: "6px 12px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "background-color 0.2s",
    },
    bulkActionIconButton: {
      padding: "6px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      transition: "background-color 0.2s",
    },
    bulkActionRight: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    selectedCount: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    selectedBadge: {
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      backgroundColor: purchasesTheme.secondary,
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "600",
    },
    selectedText: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
    },
    escButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    escText: {
      fontSize: "12px",
      color: "#6b7280",
      marginRight: "4px",
    },
    closeButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "6px",


      width: "36px",
      height: "36px",
    },
    tableWrapper: {
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "800px",
      tableLayout: "fixed",
    },
    thead: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e8edf4",
    },
    th: {
      padding: "11px 14px",
      textAlign: "left",
    },
    thContent: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      minHeight: "24px",
    },
    thText: {
      fontSize: "11px",
      fontWeight: "600",
      color: "#667085",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    thRight: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    tbody: {
      backgroundColor: "#ffffff",
    },
    tr: {
      borderBottom: "1px solid #eef2f7",
      backgroundColor: "#ffffff",
    },
    trHover: {
      backgroundColor: "#f8fbff",
    },
    td: {
      padding: "16px 14px",
      fontSize: "14px",
      verticalAlign: "middle",
    },
    tdEmpty: {
      padding: "40px 16px",
      textAlign: "center",
      fontSize: "14px",
      color: "#6b7280",
    },
    checkbox: {
      width: "16px",
      height: "16px",
      minWidth: "16px",
      minHeight: "16px",
      maxWidth: "16px",
      maxHeight: "16px",
      boxSizing: "border-box",
      cursor: "pointer",
      display: "block",
      margin: 0,
    },
    checkboxColumn: {
      width: "56px",
      minWidth: "56px",
      maxWidth: "56px",
      padding: "14px 10px",
      textAlign: "left",
      verticalAlign: "middle",
    },
    checkboxHeaderContent: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100%",
      paddingLeft: "20px",
    },
    checkboxCellContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100%",
      minHeight: "24px",
      paddingLeft: "20px",
    },
    vendorLink: {
      color: "#2457ff",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      backgroundColor: "transparent",
      border: "none",
      padding: 0,
      textAlign: "left",
    },
    vendorLinkHover: {
      textDecoration: "none",
    },
    tdText: {
      fontSize: "14px",
      color: "#111827",
    },
    tdTextDark: {
      fontSize: "14px",
      color: "#101828",
      fontWeight: "500",
    },
    skeletonText: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      width: "100%",
    },
    skeletonCheckbox: {
      width: "16px",
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      width: "100%",
      maxWidth: "512px",
      margin: "0 16px",
    },
    modalHeader: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1f2937",
      margin: 0,
    },
    modalClose: {
      color: "#6b7280",
      fontSize: "24px",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      lineHeight: 1,
    },
    modalBody: {
      padding: "16px 24px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    inputFocus: {
      borderColor: purchasesTheme.secondary,
      boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.1)",
    },
    formActions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "12px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "16px",
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
      backgroundColor: purchasesTheme.secondary,
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
    iconButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      color: "#6b7280",
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
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
      minWidth: "240px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    dropdownItemSelected: {
      backgroundColor: "#eff6ff",
      borderLeft: `3px solid ${purchasesTheme.secondary}`,
    },
    dropdownItemHover: {
      backgroundColor: "#f9fafb",
    },
    dropdownItemText: {
      flex: 1,
    },
    dropdownStar: {
      color: "#9ca3af",
      width: "16px",
      height: "16px",
    },
    dropdownDivider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      margin: "4px 0",
    },
    dropdownNewView: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "14px",
      color: purchasesTheme.secondary,
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    moreDropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    moreButton: {
      width: "36px",
      height: "32px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
      border: "1px solid #d8e0ea",
      borderRadius: "6px",
      color: "#475467",
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
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
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
      gap: "12px",
    },
    moreDropdownItemHover: {
      backgroundColor: purchasesTheme.secondary,
      color: "#ffffff",
    },
    moreDropdownItemLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    moreDropdownItemRight: {
      display: "flex",
      alignItems: "center",
    },
    submenuWrapper: {
      position: "relative",
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
      zIndex: 101,
      padding: "4px 0",
    },
    submenuItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    submenuItemSelected: {
      backgroundColor: "#eff6ff",
      color: purchasesTheme.secondary,
    },
  };

  const handleDeleteSelected = () => {
    if (selectedVendors.length === 0) {
      toast.error("Please select at least one vendor to delete.");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleClearSelection = () => {
    setSelectedVendors([]);
  };

  const handleMarkAsActive = async () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to mark as active.");
      return;
    }
    try {
      await vendorsAPI.bulkUpdate(selectedVendors, { status: "active" });
      await handleRefresh();
      setSelectedVendors([]);
      setNotification(`The selected contacts have been marked as active.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      alert("Failed to mark vendors as active. Please try again.");
    }
  };

  const handleMarkAsInactive = async () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to mark as inactive.");
      return;
    }
    const count = selectedVendors.length;
    try {
      await vendorsAPI.bulkUpdate(selectedVendors, { status: "inactive" });
      await handleRefresh();
      setSelectedVendors([]);
      setNotification(`Successfully marked ${count} vendor(s) as inactive`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      alert("Failed to mark vendors as inactive. Please try again.");
    }
  };

  const handleMerge = () => {
    if (selectedVendors.length < 2) {
      alert("Please select at least 2 vendors to merge.");
      return;
    }
    setShowMergeModal(true);
  };

  const handleMergeSubmit = async () => {
    if (!mergeSelectedVendor) {
      alert("Please select a master vendor.");
      return;
    }

    const sourceVendorIds = selectedVendors.filter((vendorId) => String(vendorId) !== String(mergeSelectedVendor));
    if (sourceVendorIds.length === 0) {
      alert("Please select different vendors to merge.");
      return;
    }

    try {
      await vendorsAPI.merge(mergeSelectedVendor, sourceVendorIds);
      await handleRefresh();
      setShowMergeModal(false);
      setMergeSelectedVendor("");
      setSelectedVendors([]);
      setNotification(`Successfully merged ${sourceVendorIds.length} vendor(s).`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      alert(error?.message || "Failed to merge vendors. Please verify exchange rates and try again.");
    }
  };

  const handleDownloadStatementsPdf = async () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor.");
      return;
    }

    if (isDownloadingStatements) {
      return;
    }

    setIsDownloadingStatements(true);

    const selectedVendorData = selectedVendors
      .map((vendorId) => vendors.find((v) => String(v.id || v._id) === String(vendorId)))
      .filter(Boolean);

    if (selectedVendorData.length === 0) {
      setIsDownloadingStatements(false);
      alert("No vendor data found for selected records.");
      return;
    }

    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "210mm";
    container.style.background = "#ffffff";
    document.body.appendChild(container);

    const safeText = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const normalizeCurrency = (value) => String(value || "USD").split(" - ")[0].trim();
    const toAmount = (value) => {
      const num = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
      return Number.isFinite(num) ? num : 0;
    };

    try {
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < selectedVendorData.length; i++) {
        const vendor = selectedVendorData[i] || {};
        const formData = vendor.formData || {};
        const displayName = vendor.name || vendor.displayName || vendor.companyName || "Vendor";
        const vendorEmail = vendor.email || formData.email || "";
        const vendorCurrency = normalizeCurrency(vendor.currency || formData.currency);
        const openingBalance = toAmount(vendor.openingBalance || formData.openingBalance);
        const billedAmount = toAmount(vendor.payables || formData.payables || vendor.unusedCredits || 0);
        const amountPaid = toAmount(vendor.amountPaid || formData.amountPaid || 0);
        const balanceDue = openingBalance + billedAmount - amountPaid;

        if (i > 0) {
          pdf.addPage();
        }

        container.innerHTML = `
          <div style="padding: 14mm; background: white; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; line-height: 1.45; min-height: 297mm; box-sizing: border-box;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
              <div>
                <h1 style="margin:0; font-size:22px; font-weight:800; color:#0f172a;">Vendor Statement For ${safeText(displayName)}</h1>
                <p style="margin:4px 0 0 0; font-size:12px; color:#64748b;">From ${safeText(dateStr)} To ${safeText(dateStr)}</p>
              </div>
              <div style="text-align:right;">
                <p style="margin:0; font-size:12px; font-weight:700; color:#0f4e5a;">TABAN BOOKS</p>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; gap:24px; margin-bottom:22px;">
              <div>
                <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; color:#334155; text-transform:uppercase;">To</p>
                <p style="margin:0; font-size:14px; font-weight:700;">${safeText(displayName)}</p>
                <p style="margin:2px 0 0 0; font-size:12px; color:#475569;">${safeText(vendorEmail)}</p>
              </div>
              <div style="min-width:250px; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">Account Summary</p>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin:5px 0;"><span style="color:#64748b;">Opening Balance</span><strong>${vendorCurrency} ${openingBalance.toFixed(2)}</strong></div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin:5px 0;"><span style="color:#64748b;">Billed Amount</span><strong>${vendorCurrency} ${billedAmount.toFixed(2)}</strong></div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin:5px 0;"><span style="color:#64748b;">Amount Paid</span><strong>${vendorCurrency} ${amountPaid.toFixed(2)}</strong></div>
                <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0;">
                  <span style="color:#0f172a; font-weight:700;">Balance Due</span>
                  <strong style="color:#0f172a;">${vendorCurrency} ${balanceDue.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:8px;">
              <thead>
                <tr style="background:#111827; color:white;">
                  <th style="padding:10px; text-align:left;">DATE</th>
                  <th style="padding:10px; text-align:left;">TRANSACTIONS</th>
                  <th style="padding:10px; text-align:left;">DETAILS</th>
                  <th style="padding:10px; text-align:right;">AMOUNT</th>
                  <th style="padding:10px; text-align:right;">PAYMENTS</th>
                  <th style="padding:10px; text-align:right;">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:10px;">${safeText(dateStr)}</td>
                  <td style="padding:10px; font-weight:600;">OPENING BALANCE</td>
                  <td style="padding:10px;">Opening Balance</td>
                  <td style="padding:10px; text-align:right;">${openingBalance.toFixed(2)}</td>
                  <td style="padding:10px; text-align:right;">-</td>
                  <td style="padding:10px; text-align:right;">${openingBalance.toFixed(2)}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:10px;">${safeText(dateStr)}</td>
                  <td style="padding:10px; font-weight:600;">BILL</td>
                  <td style="padding:10px;">Current Vendor Payables</td>
                  <td style="padding:10px; text-align:right;">${billedAmount.toFixed(2)}</td>
                  <td style="padding:10px; text-align:right;">${amountPaid.toFixed(2)}</td>
                  <td style="padding:10px; text-align:right;">${balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top:16px; text-align:right;">
              <span style="font-size:11px; color:#64748b; margin-right:8px;">BALANCE DUE</span>
              <strong style="font-size:18px; color:#0f172a;">${vendorCurrency} ${balanceDue.toFixed(2)}</strong>
            </div>
          </div>
        `;

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      pdf.save(`vendor-statements-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      alert("Error generating PDF. Please try again.");
    } finally {
      try {
        document.body.removeChild(container);
      } catch (e) {
        // ignore
      }
      setIsDownloadingStatements(false);
    }
  };

  // Date picker helper functions
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: "next",
        fullDate: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const navigateMonth = (direction, dateType) => {
    if (dateType === "start") {
      setStartDateCalendar((prev) => {
        const newDate = new Date(prev);
        if (direction === "prev") {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
        return newDate;
      });
    } else {
      setEndDateCalendar((prev) => {
        const newDate = new Date(prev);
        if (direction === "prev") {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
        return newDate;
      });
    }
  };

  const handleDateSelect = (date, dateType) => {
    const formatted = formatDate(date);
    if (dateType === "start") {
      setPrintDateRange((prev) => ({
        ...prev,
        startDate: formatted
      }));
      setIsStartDatePickerOpen(false);
      setStartDateCalendar(date);
    } else {
      setPrintDateRange((prev) => ({
        ...prev,
        endDate: formatted
      }));
      setIsEndDatePickerOpen(false);
      setEndDateCalendar(date);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
        const response = await vendorsAPI.getAll();
        if (response && response.data) {
          const vendorsList = Array.isArray(response.data) ? response.data :
            (response.data.data && Array.isArray(response.data.data) ? response.data.data : []);
          const normalized = normalizeVendorsList(vendorsList);
          persistVendors(normalized);
        }
      } catch (error) {
      } finally {
      setIsRefreshing(false);
    }
  };

  const downloadSampleFile = (type) => {
    const headers = [
      "Display Name", "Company Name", "Salutation", "First Name", "Last Name",
      "Email ID", "Phone", "Mobile Phone", "Payment Terms", "Currency Code", "Notes",
      "Website", "Billing Address Street", "Billing Address City", "Billing Address State",
      "Billing Address Country", "Billing Address Zip Code", "Billing Phone", "Billing Fax",
      "Shipping Address Street", "Shipping Address City", "Shipping Address State",
      "Shipping Address Country", "Shipping Address Zip Code", "Shipping Phone", "Shipping Fax"
    ];

    const sampleDataRow = [
      "Flasher Inc", "Flasher Inc", "Mr.", "Ethan", "Samuel",
      "ethan.sam@zylker.org", "", "", "30", "USD", "Also a prospect for our Site Builders",
      "www.zylker.org", "12 Austin Terrace", "Toronto", "Ontario", "Canada", "M5R 1X1",
      "", "", "12 Austin Terrace", "Toronto", "Ontario", "Canada", "M5R 1X1", "", ""
    ];

    const data = [headers, sampleDataRow];

    let content = "";
    let mimeType = "";

    if (type === 'csv') {
      content = data.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      // For XLS/Excel, we generate a Tab-Separated Values file which Excel handles well
      content = data.map(row => row.join("\t")).join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.href = url;
    link.download = `vendor_import_sample.${type === 'csv' ? 'csv' : 'xls'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container} className="vendor-container">
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
      {/* BULK ACTION BAR - Shows when vendors are selected */}
      {selectedVendors.length > 0 && (
        <div style={styles.bulkActionBar} className="vendor-bulk-action-bar">
          <div style={styles.bulkActionLeft}>
            <button
              style={styles.bulkActionIconButton}
              onClick={handleDownloadStatementsPdf}
              disabled={isDownloadingStatements}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#e5e7eb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
              title={isDownloadingStatements ? "Preparing PDF..." : "Download PDF"}
            >
              <FileText size={16} />
            </button>
            <button
              style={styles.bulkActionButton}
              onClick={handleMarkAsInactive}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#e5e7eb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            >
              Mark as Inactive
            </button>
            <button
              style={styles.bulkActionButton}
              onClick={handleMerge}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#e5e7eb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            >
              Merge
            </button>
            <button
              style={styles.bulkActionButton}
              onClick={handleDeleteSelected}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#fee2e2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            >
              Delete
            </button>
          </div>
          <div style={styles.bulkActionRight}>
            <div style={styles.selectedCount}>
              <div style={styles.selectedBadge}>{selectedVendors.length}</div>
              <span style={styles.selectedText}>Selected</span>
            </div>
            <div style={styles.escButton}>
              <span style={styles.escText}>Esc</span>
              <button
                style={styles.closeButton}
                onClick={handleClearSelection}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#fee2e2")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                title="Clear selection"
              >
                <X size={16} style={{ color: "#156372" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER - Hidden when vendors are selected */}
      {selectedVendors.length === 0 && (
        <div style={styles.header} className="vendor-header">
          <div style={styles.headerContent} className="vendor-header-content">
            <div style={styles.headerLeft} className="vendor-header-left">
              <div style={styles.dropdownWrapper} data-dropdown-wrapper>
                <h1 style={styles.title}>
                  {getHeaderTitle()}
                  <span style={styles.statusText}>
                    {getDisplayText()}
                    <button
                      style={styles.chevronButton}
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="ml-0.5"
                    >
                      {showDropdown ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                  </span>
                </h1>
                {showDropdown && (
                  <div style={styles.dropdown} className="vendor-dropdown">
                    {[
                      "All Vendors",
                      "Active Vendors",
                      "CRM Vendors",
                      "Duplicate Vendors",
                      "Inactive Vendors",
                      "Vendor Portal Enabled",
                      "Vendor Portal Disabled",
                      ...customViews.map(cv => cv.name)
                    ].map((view) => (
                      <button
                        key={view}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedView === view
                            ? styles.dropdownItemSelected
                            : {}),
                        }}
                        onClick={() => {
                          setSelectedView(view);
                          setShowDropdown(false);
                        }}
                        onMouseEnter={(e) => {
                          if (selectedView !== view) {
                            e.target.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedView !== view) {
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <span style={styles.dropdownItemText}>{view}</span>
                        <Star
                          size={16}
                          style={styles.dropdownStar}
                          fill="none"
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                    <div style={styles.dropdownDivider} />
                    <button
                      style={styles.dropdownNewView}
                      onClick={() => {
                        setShowDropdown(false);
                        navigate("/purchases/vendors/custom-view/new");
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      <Plus size={16} />
                      New Custom View
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.headerRight} className="vendor-header-right">
              <button
                onClick={handleNewVendor}
                className="vendor-new-button inline-flex items-center justify-center gap-1.5 px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                style={{ background: purchasesTheme.primary, color: "#ffffff" }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                <Plus size={16} className="shrink-0" />
                <span className="text-white">New</span>
              </button>

              <div style={styles.moreDropdownWrapper} data-more-dropdown-wrapper>
                <button
                  style={styles.moreButton}
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e5e7eb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#f3f4f6";
                  }}
                >
                  <MoreVertical size={18} />
                </button>
                {showMoreDropdown && (
                  <div style={styles.moreDropdown} className="vendor-more-dropdown">
                    <div
                      style={styles.submenuWrapper}
                      onMouseEnter={() => setShowSortSubmenu(true)}
                      onMouseLeave={() => setShowSortSubmenu(false)}
                    >
                      <button
                        onClick={() => setShowSortSubmenu(!showSortSubmenu)}
                        style={{
                          ...styles.moreDropdownItem,
                          background: "transparent",
                          color: "#111827",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.color = "#111827";
                          const iconLeft = e.currentTarget.querySelector('[data-icon-left]');
                          const iconRight = e.currentTarget.querySelector('[data-icon-right]');
                          if (iconLeft) iconLeft.style.color = "#6b7280";
                          if (iconRight) iconRight.style.color = "#6b7280";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#111827";
                          const iconLeft = e.currentTarget.querySelector('[data-icon-left]');
                          const iconRight = e.currentTarget.querySelector('[data-icon-right]');
                          if (iconLeft) iconLeft.style.color = "#6b7280";
                          if (iconRight) iconRight.style.color = "#6b7280";
                        }}
                      >
                        <div style={styles.moreDropdownItemLeft}>
                          <ArrowUpDown size={16} data-icon-left style={{ color: "#6b7280" }} />
                          <span>Sort by</span>
                        </div>
                        <div style={styles.moreDropdownItemRight}>
                          <ChevronRight size={16} data-icon-right style={{ color: "#6b7280" }} />
                        </div>
                      </button>
                      {showSortSubmenu && (
                        <div style={styles.submenu}>
                          {["Name", "Company Name", "Unused Credits (BCY)", "Created Time", "Last Modified Time"].map((option) => {
                            const isSelected = selectedSortBy === option;
                            return (
                              <button
                                key={option}
                                style={{
                                  ...styles.submenuItem,
                                  backgroundColor: isSelected ? "#eff6ff" : "transparent",
                                  color: isSelected ? purchasesTheme.secondary : "#111827",
                                  ...(isSelected ? styles.submenuItemSelected : {}),
                                }}
                                onClick={() => {
                                  setSelectedSortBy(option);
                                  setShowSortSubmenu(false);
                                  setShowMoreDropdown(false);
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#f9fafb";
                                  e.currentTarget.style.color = purchasesTheme.secondary;
                                  // Update icon color if it exists
                                  const icon = e.currentTarget.querySelector('svg');
                                  const span = e.currentTarget.querySelector('span');
                                  if (icon) icon.style.color = purchasesTheme.secondary;
                                  if (span) span.style.color = purchasesTheme.secondary;
                                }}
                                onMouseLeave={(e) => {
                                  if (isSelected) {
                                    e.currentTarget.style.backgroundColor = "#eff6ff";
                                    e.currentTarget.style.color = purchasesTheme.secondary;
                                    const icon = e.currentTarget.querySelector('svg');
                                    const span = e.currentTarget.querySelector('span');
                                    if (icon) icon.style.color = purchasesTheme.secondary;
                                    if (span) span.style.color = purchasesTheme.secondary;
                                  } else {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                    e.currentTarget.style.color = "#111827";
                                    const icon = e.currentTarget.querySelector('svg');
                                    const span = e.currentTarget.querySelector('span');
                                    if (icon) icon.style.color = "#111827";
                                    if (span) span.style.color = "#111827";
                                  }
                                }}
                              >
                                <span>{option}</span>
                                {isSelected && (
                                  <ChevronUp size={16} style={{ color: purchasesTheme.secondary }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div
                      style={styles.submenuWrapper}
                      onMouseEnter={() => setShowImportSubmenu(true)}
                      onMouseLeave={() => setShowImportSubmenu(false)}
                    >
                      <button
                        onClick={() => setShowImportSubmenu(!showImportSubmenu)}
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: "transparent",
                          color: "#111827",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = purchasesTheme.primary;
                          e.currentTarget.style.color = "#ffffff";
                          const iconLeft = e.currentTarget.querySelector('[data-icon-left]');
                          const iconRight = e.currentTarget.querySelector('[data-icon-right]');
                          if (iconLeft) iconLeft.style.color = "#ffffff";
                          if (iconRight) iconRight.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#111827";
                          const iconLeft = e.currentTarget.querySelector('[data-icon-left]');
                          const iconRight = e.currentTarget.querySelector('[data-icon-right]');
                          if (iconLeft) iconLeft.style.color = "#6b7280";
                          if (iconRight) iconRight.style.color = "#6b7280";
                        }}
                      >
                        <div style={styles.moreDropdownItemLeft}>
                          <Download size={16} data-icon-left style={{ color: "#6b7280" }} />
                          <span>Import</span>
                        </div>
                        <div style={styles.moreDropdownItemRight}>
                          <ChevronRight size={16} data-icon-right style={{ color: "#6b7280" }} />
                        </div>
                      </button>
                      {showImportSubmenu && (
                        <div style={styles.submenu}>
                          <button
                            style={styles.submenuItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = purchasesTheme.primary;
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={() => {
                              setShowImportSubmenu(false);
                              setShowMoreDropdown(false);
                              navigate("/purchases/vendors/import");
                            }}
                          >
                            <span>Import Vendors</span>
                          </button>
                          <button
                            style={styles.submenuItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = purchasesTheme.primary;
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={() => {
                              downloadSampleFile('xls');
                              setShowImportSubmenu(false);
                              setShowMoreDropdown(false);
                            }}
                          >
                            <span>Download Sample File</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      style={styles.submenuWrapper}
                      onMouseEnter={() => setShowExportSubmenu(true)}
                      onMouseLeave={() => setShowExportSubmenu(false)}
                    >
                      <button
                        onClick={() => setShowExportSubmenu(!showExportSubmenu)}
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: "transparent",
                          color: "#111827",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = purchasesTheme.primary;
                          e.currentTarget.style.color = "#ffffff";
                          const iconLeft = e.currentTarget.querySelector('[data-icon-left]');
                          const iconRight = e.currentTarget.querySelector('[data-icon-right]');
                          if (iconLeft) iconLeft.style.color = "#ffffff";
                          if (iconRight) iconRight.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#111827";
                          const iconLeft = e.currentTarget.querySelector('[data-icon-left]');
                          const iconRight = e.currentTarget.querySelector('[data-icon-right]');
                          if (iconLeft) iconLeft.style.color = "#6b7280";
                          if (iconRight) iconRight.style.color = "#6b7280";
                        }}
                      >
                        <div style={styles.moreDropdownItemLeft}>
                          <Upload size={16} data-icon-left style={{ color: "#6b7280" }} />
                          <span>Export</span>
                        </div>
                        <div style={styles.moreDropdownItemRight}>
                          <ChevronRight size={16} data-icon-right style={{ color: "#6b7280" }} />
                        </div>
                      </button>
                      {showExportSubmenu && (
                        <div style={styles.submenu}>
                          <button
                            type="button"
                            style={styles.submenuItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = purchasesTheme.primary;
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowExportSubmenu(false);
                              setShowMoreDropdown(false);
                              setShowExportVendorsModal(true);
                            }}
                          >
                            <span>Export Vendors</span>
                          </button>
                          <button
                            type="button"
                            style={styles.submenuItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = purchasesTheme.primary;
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowExportSubmenu(false);
                              setShowMoreDropdown(false);
                              setShowExportCurrentViewModal(true);
                            }}
                          >
                            <span>Export Current View</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        background: hoveredMenuItem === 'preferences' ? purchasesTheme.primary : "transparent",
                        color: hoveredMenuItem === 'preferences' ? "#ffffff" : "#111827",
                      }}
                      onMouseEnter={() => setHoveredMenuItem('preferences')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        setShowMoreDropdown(false);
                        navigate("/settings/customers-vendors");
                      }}
                    >
                      <div style={styles.moreDropdownItemLeft}>
                        <Settings size={16} style={{ color: hoveredMenuItem === 'preferences' ? "#ffffff" : "#6b7280" }} />
                        <span>Preferences</span>
                      </div>
                    </button>

                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        background: hoveredMenuItem === 'refresh' ? purchasesTheme.primary : "transparent",
                        color: hoveredMenuItem === 'refresh' ? "#ffffff" : "#111827",
                      }}
                      onMouseEnter={() => setHoveredMenuItem('refresh')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        setShowMoreDropdown(false);
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                    >
                      <div style={styles.moreDropdownItemLeft}>
                        <RefreshCw
                          size={16}
                          style={{
                            color: hoveredMenuItem === 'refresh' ? "#ffffff" : "#6b7280",
                            animation: isRefreshing ? "spin 1s linear infinite" : "none"
                          }}
                        />
                        <span>Refresh List</span>
                      </div>
                    </button>

                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        background: hoveredMenuItem === 'reset' ? purchasesTheme.primary : "transparent",
                        color: hoveredMenuItem === 'reset' ? "#ffffff" : "#111827",
                      }}
                      onMouseEnter={() => setHoveredMenuItem('reset')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        // Reset column width functionality
                        setShowMoreDropdown(false);
                      }}
                    >
                      <div style={styles.moreDropdownItemLeft}>
                        <RotateCcw size={16} style={{ color: hoveredMenuItem === 'reset' ? "#ffffff" : "#6b7280" }} />
                        <span>Reset Column Width</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TABLE */}
      <div style={styles.tableWrapper} className="vendor-table-wrapper">
        <table style={styles.table} className="vendor-table">
          <thead style={styles.thead}>
            <tr>
              <th style={{ ...styles.th, ...styles.checkboxColumn }}>
                <div style={styles.checkboxHeaderContent} ref={columnMenuRef}>
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      left: "-2px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3b82f6",
                      cursor: "pointer",
                    }}
                    onClick={() => setShowColumnMenu((prev) => !prev)}
                    title="Filter vendors"
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                  {showColumnMenu && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: "-2px",
                        minWidth: "190px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #dbe3ea",
                        borderRadius: "12px",
                        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.18)",
                        padding: "8px",
                        zIndex: 30,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowColumnMenu(false);
                          setShowCustomizeColumnsModal(true);
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: "10px",
                          background: "#3b82f6",
                          color: "#ffffff",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontSize: "14px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)",
                        }}
                      >
                        <Columns size={16} />
                        <span>Customize Columns</span>
                      </button>
                    </div>
                  )}
                  <input
                    type="checkbox"
                    checked={
                      filteredVendors.length > 0 &&
                      selectedVendors.length === filteredVendors.length &&
                      filteredVendors.every(v => selectedVendors.includes(getVendorId(v)))
                    }
                    onChange={handleSelectAll}
                    style={{
                      ...styles.checkbox,
                      marginLeft: "6px",
                    }}
                  />
                </div>
              </th>

              {visibleColumns.includes("name") && (
              <th style={styles.th}>
                <div style={styles.thContent}>
                  <span style={styles.thText}>Name</span>
                  <button style={styles.iconButton}>
                    <ArrowUpDown size={12} />
                  </button>
                </div>
              </th>
              )}

              {visibleColumns.includes("companyName") && (
              <th style={styles.th}>
                <div style={styles.thText}>Company Name</div>
              </th>
              )}

              {visibleColumns.includes("email") && (
              <th style={styles.th}>
                <div style={styles.thText}>Email</div>
              </th>
              )}

              {visibleColumns.includes("workPhone") && (
              <th style={styles.th}>
                <div style={styles.thText}>Work Phone</div>
              </th>
              )}

              {visibleColumns.includes("payablesBcy") && (
              <th style={styles.th}>
                <div style={styles.thText}>Payables (BCY)</div>
              </th>
              )}

              {visibleColumns.includes("unusedCreditsBcy") && (
              <th style={styles.th}>
                <div style={styles.thText}>Unused Credits (BCY)</div>
              </th>
              )}

              {visibleColumns.includes("payables") && (
              <th style={styles.th}>
                <div style={styles.thText}>Payables</div>
              </th>
              )}

              {visibleColumns.includes("unusedCredits") && (
              <th style={styles.th}>
                <div style={styles.thText}>Unused Credits</div>
              </th>
              )}

              {visibleColumns.includes("source") && (
              <th style={styles.th}>
                <div style={styles.thText}>Source</div>
              </th>
              )}

              {visibleColumns.includes("firstName") && (
              <th style={styles.th}>
                <div style={styles.thText}>First Name</div>
              </th>
              )}

              {visibleColumns.includes("lastName") && (
              <th style={styles.th}>
                <div style={styles.thText}>Last Name</div>
              </th>
              )}

              {visibleColumns.includes("mobilePhone") && (
              <th style={styles.th}>
                <div style={styles.thText}>Mobile Phone</div>
              </th>
              )}

              {visibleColumns.includes("paymentTerms") && (
              <th style={styles.th}>
                <div style={styles.thText}>Payment Terms</div>
              </th>
              )}

              {visibleColumns.includes("status") && (
              <th style={styles.th}>
                <div style={styles.thText}>Status</div>
              </th>
              )}

              {visibleColumns.includes("website") && (
              <th style={styles.th}>
                <div style={styles.thText}>Website</div>
              </th>
              )}
              <th style={styles.th}>
                <div style={styles.thRight}>
                  <button
                    style={styles.iconButton}
                    onClick={openSearchModalForCurrentContext}
                  >
                    <Search size={16} />
                  </button>
                </div>
              </th>
            </tr>
          </thead>

          <tbody style={styles.tbody}>
            {isRefreshing ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} style={styles.tr}>
                  <td style={{ ...styles.td, ...styles.checkboxColumn }}>
                    <div style={styles.checkboxCellContent}>
                      <div style={styles.skeletonCheckbox}></div>
                    </div>
                  </td>
                  {visibleColumns.includes("name") && <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>}
                  {visibleColumns.includes("companyName") && <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>}
                  {visibleColumns.includes("email") && <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>}
                  {visibleColumns.includes("workPhone") && <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>}
                  {visibleColumns.includes("payablesBcy") && <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>}
                  {visibleColumns.includes("unusedCreditsBcy") && <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>}
                  <td style={styles.td}>
                    <div style={styles.skeletonText}></div>
                  </td>
                </tr>
              ))
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} style={styles.tdEmpty}>
                  No vendors found
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => {
                const vendorId = getVendorId(vendor);
                return (
                  <tr
                    key={vendorId}
                    style={{
                      ...styles.tr,
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox or its container
                      if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('td:first-child')) {
                        navigate(`/purchases/vendors/${vendorId}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fbff";
                      e.currentTarget.style.cursor = "pointer";
                      setHoveredRowId(vendorId);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      setHoveredRowId(null);
                    }}
                  >
                    <td
                      style={{ ...styles.td, ...styles.checkboxColumn }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={styles.checkboxCellContent}>
                        <input
                          type="checkbox"
                          checked={selectedVendors.includes(vendorId)}
                          onChange={() => handleCheckboxChange(vendorId)}
                          style={styles.checkbox}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </td>

                    {visibleColumns.includes("name") && <td style={styles.td}>
                      <button
                        style={styles.vendorLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchases/vendors/${vendorId}`, {
                            state: { vendor }
                          });
                        }}
                      >
                        {vendor.name || vendor.displayName}
                      </button>
                    </td>}

                    {visibleColumns.includes("companyName") && <td style={styles.td}>
                      <span style={styles.tdText}>{vendor.companyName || "-"}</span>
                    </td>}

                    {visibleColumns.includes("email") && <td style={styles.td}>
                      <span style={styles.tdText}>{vendor.email || "-"}</span>
                    </td>}

                    {visibleColumns.includes("workPhone") && <td style={styles.td}>
                      <span style={styles.tdText}>{vendor.workPhone || "-"}</span>
                    </td>}

                    {visibleColumns.includes("payablesBcy") && <td style={styles.td}>
                      <span style={styles.tdTextDark}>{vendor.payables}</span>
                    </td>}

                    {visibleColumns.includes("unusedCreditsBcy") && <td style={styles.td}>
                      <span style={styles.tdTextDark}>{vendor.unusedCredits}</span>
                    </td>}

                    {visibleColumns.includes("payables") && <td style={styles.td}>
                      <span style={styles.tdTextDark}>{getVendorField(vendor, "payables")}</span>
                    </td>}

                    {visibleColumns.includes("unusedCredits") && <td style={styles.td}>
                      <span style={styles.tdTextDark}>{getVendorField(vendor, "unusedCredits")}</span>
                    </td>}

                    {visibleColumns.includes("source") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorField(vendor, "source")}</span>
                    </td>}

                    {visibleColumns.includes("firstName") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorField(vendor, "firstName")}</span>
                    </td>}

                    {visibleColumns.includes("lastName") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorField(vendor, "lastName")}</span>
                    </td>}

                    {visibleColumns.includes("mobilePhone") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorField(vendor, "mobile", vendor?.mobilePhone ?? vendor?.formData?.mobilePhone ?? "-")}</span>
                    </td>}

                    {visibleColumns.includes("paymentTerms") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorField(vendor, "paymentTerms")}</span>
                    </td>}

                    {visibleColumns.includes("status") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorStatus(vendor)}</span>
                    </td>}

                    {visibleColumns.includes("website") && <td style={styles.td}>
                      <span style={styles.tdText}>{getVendorWebsite(vendor)}</span>
                    </td>}
                    <td
                      style={{
                        ...styles.td,
                        position: "relative",
                        width: "40px",
                        textAlign: "right",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(hoveredRowId === vendorId || openDropdownId === vendorId) && (
                        <div style={{ position: "relative", display: "inline-flex" }} data-row-dropdown>
                          <button
                            type="button"
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              border: "1px solid #0f6674",
                              background: "#0f6674",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              cursor: "pointer",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId((currentId) => (currentId === vendorId ? null : vendorId));
                            }}
                            title="Vendor actions"
                          >
                            <ChevronDown
                              size={14}
                              style={{
                                transform: openDropdownId === vendorId ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            />
                          </button>

                          {openDropdownId === vendorId && (
                            <button
                              type="button"
                            style={{
                              position: "absolute",
                              top: "50%",
                              right: "32px",
                              transform: "translateY(-50%)",
                              minWidth: "128px",
                              padding: "10px 14px",
                              borderRadius: "10px",
                              border: "1px solid #0f6674",
                              background: "#0f6674",
                              boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
                              display: "inline-flex",
                              alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                color: "#ffffff",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                                navigate(`/purchases/vendors/${vendorId}/edit`);
                              }}
                              title="Edit vendor"
                            >
                              <Edit size={15} />
                              <span style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>Edit</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Custom View Modal */}
      {showCustomViewModal && typeof document !== 'undefined' && document.body && createPortal(
        <NewCustomViewModal
          onClose={() => setShowCustomViewModal(false)}
          onSave={(customView) => {
            // Handle saving custom view
            setShowCustomViewModal(false);
          }}
        />,
        document.body
      )}

      {showCustomizeColumnsModal && typeof document !== 'undefined' && document.body && createPortal(
        <CustomizeColumnsModal
          columns={vendorColumnOptions}
          selectedColumns={visibleColumns}
          onClose={() => setShowCustomizeColumnsModal(false)}
          onSave={(nextColumns) => {
            setVisibleColumns(nextColumns);
            setShowCustomizeColumnsModal(false);
          }}
        />,
        document.body
      )}

      {/* Associate Templates Modal */}
      {showAssociateTemplatesModal && typeof document !== 'undefined' && document.body && createPortal(
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
          onClick={() => setShowAssociateTemplatesModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "700px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#111827",
                  margin: 0,
                }}
              >
                Associate Templates
              </h2>
              <button
                onClick={() => setShowAssociateTemplatesModal(false)}
                style={{
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f3f4f6";
                }}
              >
                <X size={18} style={{ color: "#156372" }} strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {/* Introductory Text */}
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: "0 0 32px 0",
                  lineHeight: "1.5",
                }}
              >
                You can associate specific templates for transaction PDFs and emails that will be sent to your vendors.
              </p>

              {/* PDF Templates Section */}
              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    PDF Templates
                  </h3>
                  <button
                    onClick={() => {
                      setShowAssociateTemplatesModal(false);
                      navigate("/settings/customization/pdf-templates");
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: "14px",
                      fontWeight: "500",
                      backgroundColor: purchasesTheme.secondary,
                      color: "#ffffff",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = purchasesTheme.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = purchasesTheme.primary;
                    }}
                  >
                    <Plus size={16} />
                    New PDF Template
                  </button>
                </div>

                {/* Vendor Statement */}
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        flex: 1,
                      }}
                    >
                      Vendor Statement
                    </label>
                    <select
                      value={templateData.vendorStatement}
                      onChange={(e) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          vendorStatement: e.target.value,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "8px 32px 8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      <option>Standard</option>
                      <option>Custom Template 1</option>
                      <option>Custom Template 2</option>
                    </select>
                  </div>
                </div>

                {/* Purchase Order */}
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        flex: 1,
                      }}
                    >
                      Purchase Order
                    </label>
                    <select
                      value={templateData.purchaseOrder}
                      onChange={(e) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          purchaseOrder: e.target.value,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "8px 32px 8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      <option>Standard Template</option>
                      <option>Custom Template 1</option>
                      <option>Custom Template 2</option>
                    </select>
                  </div>
                </div>

                {/* Bills */}
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        flex: 1,
                      }}
                    >
                      Bills
                    </label>
                    <select
                      value={templateData.bills}
                      onChange={(e) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          bills: e.target.value,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "8px 32px 8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      <option>Standard Template</option>
                      <option>Custom Template 1</option>
                      <option>Custom Template 2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Email Notifications Section */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    Email Notifications
                  </h3>
                  <button
                    onClick={() => {
                      setShowAssociateTemplatesModal(false);
                      navigate("/settings/customization/email-notifications");
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: "14px",
                      fontWeight: "500",
                      backgroundColor: purchasesTheme.secondary,
                      color: "#ffffff",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = purchasesTheme.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = purchasesTheme.primary;
                    }}
                  >
                    <Plus size={16} />
                    New Email Template
                  </button>
                </div>

                {/* Vendor Language */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    padding: "8px 0",
                  }}
                >
                  <FileTextIcon size={16} style={{ color: "#6b7280" }} />
                  <Globe size={16} style={{ color: "#6b7280" }} />
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#374151",
                      fontWeight: "500",
                    }}
                  >
                    Vendor Language: English
                  </span>
                </div>

                {/* Purchase Order Email */}
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        flex: 1,
                      }}
                    >
                      Purchase Order
                    </label>
                    <select
                      value={templateData.emailPurchaseOrder}
                      onChange={(e) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          emailPurchaseOrder: e.target.value,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "8px 32px 8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      <option>Default</option>
                      <option>Custom Email 1</option>
                      <option>Custom Email 2</option>
                    </select>
                  </div>
                </div>

                {/* Payments Made Email */}
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        flex: 1,
                      }}
                    >
                      Payments Made
                    </label>
                    <select
                      value={templateData.emailPaymentsMade}
                      onChange={(e) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          emailPaymentsMade: e.target.value,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "8px 32px 8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      <option>Default</option>
                      <option>Custom Email 1</option>
                      <option>Custom Email 2</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => setShowAssociateTemplatesModal(false)}
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
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle save template associations
                  setShowAssociateTemplatesModal(false);
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
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Export Vendors Modal */}
      {showExportVendorsModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportVendors
          onClose={() => setShowExportVendorsModal(false)}
          exportType="vendors"
          data={vendors}
        />,
        document.body
      )}

      {/* Export Current View Modal */}
      {showExportCurrentViewModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportVendors
          onClose={() => setShowExportCurrentViewModal(false)}
          exportType="current-view"
          data={filteredVendors}
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
                    <option value="Vendors">Vendors</option>
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
                    {vendorFilterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
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
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={searchData.displayName}
                      onChange={(e) => setSearchData({ ...searchData, displayName: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${purchasesTheme.secondary}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={searchData.firstName}
                      onChange={(e) => setSearchData({ ...searchData, firstName: e.target.value })}
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
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={searchData.email}
                      onChange={(e) => setSearchData({ ...searchData, email: e.target.value })}
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
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={searchData.phone}
                      onChange={(e) => setSearchData({ ...searchData, phone: e.target.value })}
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
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Notes
                    </label>
                    <input
                      type="text"
                      value={searchData.notes}
                      onChange={(e) => setSearchData({ ...searchData, notes: e.target.value })}
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

                {/* Right Column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={searchData.companyName}
                      onChange={(e) => setSearchData({ ...searchData, companyName: e.target.value })}
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
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={searchData.lastName}
                      onChange={(e) => setSearchData({ ...searchData, lastName: e.target.value })}
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
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Status
                    </label>
                    <select
                      value={searchData.status}
                      onChange={(e) => setSearchData({ ...searchData, status: e.target.value })}
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
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                      Address
                    </label>
                    <input
                      type="text"
                      value={searchData.address}
                      onChange={(e) => setSearchData({ ...searchData, address: e.target.value })}
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
                  // Handle search logic here
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
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchData({
                    displayName: "",
                    firstName: "",
                    email: "",
                    phone: "",
                    notes: "",
                    companyName: "",
                    lastName: "",
                    status: "All",
                    address: ""
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
      "Company Name",
      "Email",
      "Phone",
      "Payables",
      "Payables (BCY)",
      "Unused Credits",
      "Unused Credits (BCY)",
      "Source",
      "First Name",
      "Last Name",
    ],
    selectedColumns: ["Name"],
    visibility: "Only Me",
  });
  const [searchQuery, setSearchQuery] = useState("");

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
    if (column === "Name") return; // Name is required
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
      availableColumns: [...prev.availableColumns, column],
    }));
  };

  const filteredColumns = formData.availableColumns.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

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
      zIndex: 99999,
      padding: "20px",
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      width: "100%",
      maxWidth: "900px",
      maxHeight: "90vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "sticky",
      top: 0,
      backgroundColor: "#ffffff",
      zIndex: 10,
    },
    title: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
    },
    close: {
      color: "#ffffff",
      fontSize: "16px",
      background: "#111827",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      lineHeight: 1,
      borderRadius: "4px",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "absolute",
      left: "24px",
    },
    body: {
      padding: "24px",
      flex: 1,
      overflowY: "auto",
    },
    section: {
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    nameRow: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    nameInput: {
      flex: 1,
    },
    favoriteCheckbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    criterionRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "12px",
    },
    criterionNumber: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      minWidth: "24px",
    },
    criterionField: {
      flex: 1,
    },
    criterionComparator: {
      flex: 1,
    },
    criterionValue: {
      flex: 1,
    },
    criterionActions: {
      display: "flex",
      gap: "8px",
    },
    iconButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
    },
    addCriterionButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: purchasesTheme.secondary,
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "4px 0",
    },
    columnsContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
    },
    columnSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
    },
    columnSectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      marginBottom: "12px",
      outline: "none",
    },
    columnList: {
      maxHeight: "300px",
      overflowY: "auto",
    },
    columnItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      borderRadius: "4px",
      cursor: "pointer",
      marginBottom: "4px",
    },
    columnItemHover: {
      backgroundColor: "#f3f4f6",
    },
    radioGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    radioOption: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "12px",
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "auto",
      position: "sticky",
      bottom: 0,
      backgroundColor: "#ffffff",
    },
    cancelBtn: {
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: "500",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    saveBtn: {
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: "500",
      backgroundColor: purchasesTheme.secondary,
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={16} />
          </button>
          <h2 style={modalStyles.title}>New Custom View</h2>
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
            <div style={modalStyles.sectionTitle}>Define the criteria (if any)</div>
            {formData.criteria.map((criterion, index) => (
              <div key={criterion.id} style={modalStyles.criterionRow}>
                <span style={modalStyles.criterionNumber}>{index + 1}</span>
                <select
                  style={{ ...modalStyles.input, ...modalStyles.criterionField }}
                  value={criterion.field}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "field", e.target.value)
                  }
                >
                  <option>Select a field</option>
                  <option>Name</option>
                  <option>Company Name</option>
                  <option>Email</option>
                  <option>Phone</option>
                </select>
                <select
                  style={{ ...modalStyles.input, ...modalStyles.criterionComparator }}
                  value={criterion.comparator}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "comparator", e.target.value)
                  }
                >
                  <option>Select a comparator</option>
                  <option>Equals</option>
                  <option>Contains</option>
                  <option>Starts with</option>
                  <option>Ends with</option>
                </select>
                <input
                  type="text"
                  style={{ ...modalStyles.input, ...modalStyles.criterionValue }}
                  value={criterion.value}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "value", e.target.value)
                  }
                  placeholder="Value"
                />
                <div style={modalStyles.criterionActions}>
                  <button
                    type="button"
                    style={modalStyles.iconButton}
                    onClick={addCriterion}
                  >
                    <Plus size={16} />
                  </button>
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      style={modalStyles.iconButton}
                      onClick={() => removeCriterion(criterion.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              style={modalStyles.addCriterionButton}
              onClick={addCriterion}
            >
              <Plus size={16} />
              Add Criterion
            </button>
          </div>

          {/* Columns Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Columns Preference</div>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.columnSectionTitle}>AVAILABLE COLUMNS</div>
                <input
                  type="text"
                  placeholder="Q Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={modalStyles.searchInput}
                />
                <div style={modalStyles.columnList}>
                  {filteredColumns.map((column) => (
                    <div
                      key={column}
                      style={modalStyles.columnItem}
                      onClick={() => moveColumnToSelected(column)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af" }} />
                      <span style={{ fontSize: "14px" }}>{column}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.columnSectionTitle}>
                  <Check size={16} style={{ color: "#10b981" }} />
                  SELECTED COLUMNS
                </div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => (
                    <div
                      key={column}
                      style={modalStyles.columnItem}
                      onClick={() => moveColumnToAvailable(column)}
                      onMouseEnter={(e) => {
                        if (column !== "Name") {
                          e.target.style.backgroundColor = "#f3f4f6";
                        }
                      }}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af" }} />
                      <span style={{ fontSize: "14px" }}>
                        {column}
                        {column === "Name" && <span style={{ color: "#156372" }}>*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Visibility Preference</div>
            <div style={modalStyles.radioGroup}>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Me"
                  checked={formData.visibility === "Only Me"}
                  onChange={handleChange}
                />
                <Lock size={16} style={{ color: "#6b7280" }} />
                <span>Only Me</span>
              </label>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Selected Users & Roles"
                  checked={formData.visibility === "Only Selected Users & Roles"}
                  onChange={handleChange}
                />
                <Users size={16} style={{ color: "#6b7280" }} />
                <span>Only Selected Users & Roles</span>
              </label>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Everyone"
                  checked={formData.visibility === "Everyone"}
                  onChange={handleChange}
                />
                <FileText size={16} style={{ color: "#6b7280" }} />
                <span>Everyone</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={modalStyles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelBtn}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f9fafb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#ffffff")}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={modalStyles.saveBtn}
              onMouseEnter={(e) => (e.target.style.background = purchasesTheme.primaryHover)}
              onMouseLeave={(e) => (e.target.style.background = purchasesTheme.primary)}
            >
              Save
            </button>
          </div>
        </form>
      </div>

      {/* Print Vendor Statements Modal */}
      {showPrintModal && typeof document !== 'undefined' && document.body && createPortal(
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
              setShowPrintModal(false);
              setPrintDateRange({
                startDate: "01/12/2025",
                endDate: "31/12/2025"
              });
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}
              >
                Print Vendor statements
              </h2>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setPrintDateRange({
                    startDate: "01/12/2025",
                    endDate: "31/12/2025"
                  });
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                }}
              >
                <X size={16} style={{ color: "#156372" }} strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "24px",
                  lineHeight: "1.5",
                }}
              >
                You can print your vendor's statements for the selected date range.
              </p>

              {/* Start Date */}
              <div ref={startDatePickerRef} style={{ marginBottom: "20px", position: "relative" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Start Date
                </label>
                <input
                  type="text"
                  value={printDateRange.startDate}
                  readOnly
                  onClick={() => {
                    setIsStartDatePickerOpen(!isStartDatePickerOpen);
                    setIsEndDatePickerOpen(false);
                    if (!isStartDatePickerOpen && printDateRange.startDate) {
                      try {
                        setStartDateCalendar(parseDate(printDateRange.startDate));
                      } catch (e) {
                        // Keep current calendar if parsing fails
                      }
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${isStartDatePickerOpen ? purchasesTheme.secondary : "#d1d5db"}`,
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    boxShadow: isStartDatePickerOpen ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
                  }}
                />
                {isStartDatePickerOpen && (() => {
                  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const days = getDaysInMonth(startDateCalendar);
                  const selectedDate = printDateRange.startDate ? parseDate(printDateRange.startDate) : null;

                  return (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "4px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 10001,
                      padding: "16px",
                      minWidth: "280px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <button
                          onClick={() => navigateMonth("prev", "start")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                          {monthNames[startDateCalendar.getMonth()]} {startDateCalendar.getFullYear()}
                        </div>
                        <button
                          onClick={() => navigateMonth("next", "start")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
                        {dayNames.map((day) => (
                          <div key={day} style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: (day === "Sun" || day === "Sat") ? "#156372" : "#6b7280",
                            textAlign: "center",
                            padding: "4px"
                          }}>
                            {day}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                        {days.map((dayObj, idx) => {
                          const isSelected = selectedDate && dayObj.month === "current" &&
                            selectedDate.getDate() === dayObj.date &&
                            selectedDate.getMonth() === startDateCalendar.getMonth() &&
                            selectedDate.getFullYear() === startDateCalendar.getFullYear();
                          const isOtherMonth = dayObj.month !== "current";

                          return (
                            <button
                              key={idx}
                              onClick={() => handleDateSelect(dayObj.fullDate, "start")}
                              style={{
                                padding: "8px",
                                fontSize: "14px",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                backgroundColor: isSelected ? "#156372" : "transparent",
                                color: isSelected ? "#ffffff" : (isOtherMonth ? "#d1d5db" : "#374151"),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "32px"
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.target.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.target.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              {dayObj.date}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* End Date */}
              <div ref={endDatePickerRef} style={{ marginBottom: "24px", position: "relative" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  End Date
                </label>
                <input
                  type="text"
                  value={printDateRange.endDate}
                  readOnly
                  onClick={() => {
                    setIsEndDatePickerOpen(!isEndDatePickerOpen);
                    setIsStartDatePickerOpen(false);
                    if (!isEndDatePickerOpen && printDateRange.endDate) {
                      try {
                        setEndDateCalendar(parseDate(printDateRange.endDate));
                      } catch (e) {
                        // Keep current calendar if parsing fails
                      }
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${isEndDatePickerOpen ? purchasesTheme.secondary : "#d1d5db"}`,
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    boxShadow: isEndDatePickerOpen ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
                  }}
                />
                {isEndDatePickerOpen && (() => {
                  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const days = getDaysInMonth(endDateCalendar);
                  const selectedDate = printDateRange.endDate ? parseDate(printDateRange.endDate) : null;

                  return (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "4px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 10001,
                      padding: "16px",
                      minWidth: "280px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <button
                          onClick={() => navigateMonth("prev", "end")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                          {monthNames[endDateCalendar.getMonth()]} {endDateCalendar.getFullYear()}
                        </div>
                        <button
                          onClick={() => navigateMonth("next", "end")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
                        {dayNames.map((day) => (
                          <div key={day} style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: (day === "Sun" || day === "Sat") ? "#156372" : "#6b7280",
                            textAlign: "center",
                            padding: "4px"
                          }}>
                            {day}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                        {days.map((dayObj, idx) => {
                          const isSelected = selectedDate && dayObj.month === "current" &&
                            selectedDate.getDate() === dayObj.date &&
                            selectedDate.getMonth() === endDateCalendar.getMonth() &&
                            selectedDate.getFullYear() === endDateCalendar.getFullYear();
                          const isOtherMonth = dayObj.month !== "current";

                          return (
                            <button
                              key={idx}
                              onClick={() => handleDateSelect(dayObj.fullDate, "end")}
                              style={{
                                padding: "8px",
                                fontSize: "14px",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                backgroundColor: isSelected ? "#156372" : "transparent",
                                color: isSelected ? "#ffffff" : (isOtherMonth ? "#d1d5db" : "#374151"),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "32px"
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.target.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.target.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              {dayObj.date}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer - Action Buttons */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  // Handle print functionality here
                  // You can add actual print logic here
                  setShowPrintModal(false);
                  setPrintDateRange({
                    startDate: "01/12/2025",
                    endDate: "31/12/2025"
                  });
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
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0D4A52";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#156372";
                }}
              >
                <Printer size={18} strokeWidth={2} />
                Print Statements
              </button>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setPrintDateRange({
                    startDate: "01/12/2025",
                    endDate: "31/12/2025"
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
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const idsToDelete = selectedVendors
            .map((vendorId) => String(vendorId || "").trim())
            .filter(Boolean);

          if (idsToDelete.length === 0) {
            setShowDeleteModal(false);
            return;
          }

          const count = idsToDelete.length;
          try {
            await vendorsAPI.bulkDelete(idsToDelete);

            const remainingVendors = vendors.filter((vendor) => !idsToDelete.includes(getVendorId(vendor)));
            persistVendors(remainingVendors);
            setSelectedVendors([]);
            setShowDeleteModal(false);
            toast.success(`Vendor${count > 1 ? "s" : ""} deleted successfully.`);
            window.dispatchEvent(new Event("vendorSaved"));
          } catch (error) {
            toast.error(error?.message || "Failed to delete selected vendors.");
          }
        }}
        entityName="vendor(s)"
        count={selectedVendors.length}
      />

      {/* Success Notification */}
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

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Vendors"
        fieldOptions={vendorFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="vendors"
      />

      {/* Merge Vendors Modal */}
      {showMergeModal && (
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
            zIndex: 9999,
            pointerEvents: "auto",
          }}
          onClick={() => setShowMergeModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              position: "relative",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}
              >
                Merge Vendors
              </h2>
              <button
                onClick={() => setShowMergeModal(false)}
                style={{
                  background: "none",
                  border: `1px solid ${purchasesTheme.secondary}`,
                  borderRadius: "4px",
                  cursor: "pointer",
                  padding: "4px 8px",
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
              <p
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  marginBottom: "20px",
                  lineHeight: "1.5",
                }}
              >
                Select a vendor profile with whom you'd like to merge{" "}
                <strong>
                  {vendors.find((v) => selectedVendors.includes(v.id))?.name ||
                    vendors.find((v) => selectedVendors.includes(v.id))?.formData?.name ||
                    "selected vendor"}
                </strong>
                . Once merged, the transactions of{" "}
                <strong>
                  {vendors.find((v) => selectedVendors.includes(v.id))?.name ||
                    vendors.find((v) => selectedVendors.includes(v.id))?.formData?.name ||
                    "selected vendor"}
                </strong>{" "}
                will be transferred, and this vendor record will be marked as inactive.
              </p>

              {/* Vendor Selection */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ position: "relative" }}>
                  <select
                    value={mergeSelectedVendor}
                    onChange={(e) => setMergeSelectedVendor(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 32px 10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      appearance: "none",
                      backgroundColor: "#ffffff",
                      color: mergeSelectedVendor ? "#111827" : "#9ca3af",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                    }}
                  >
                    <option value="" disabled>Select Vendor</option>
                    {vendors
                      .filter((v) => !selectedVendors.includes(v.id))
                      .map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name || vendor.formData?.name || "Unnamed Vendor"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "12px",
              }}
            >
              <button
                onClick={handleMergeSubmit}
                disabled={!mergeSelectedVendor}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  backgroundColor: mergeSelectedVendor ? purchasesTheme.secondary : "#9ca3af",
                  color: "#ffffff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: mergeSelectedVendor ? "pointer" : "not-allowed",
                }}
              >
                Continue
              </button>
              <button
                onClick={() => setShowMergeModal(false)}
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
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portals moved to Vendor component */}
    </div>
  );
}

function CustomizeColumnsModal({ columns, selectedColumns, onClose, onSave }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftColumns, setDraftColumns] = useState(selectedColumns);

  const filteredColumns = columns.filter((column) =>
    column.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleColumn = (columnId, required) => {
    if (required) return;
    setDraftColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const selectedCount = draftColumns.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 22px 50px rgba(15, 23, 42, 0.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SlidersHorizontal size={18} style={{ color: "#156372" }} />
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
              Customize Columns
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "13px", color: "#4b5563" }}>
              {selectedCount} of {columns.length} Selected
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: "18px", borderBottom: "1px solid #eef2f7" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ padding: "8px 18px 0", overflowY: "auto", flex: 1 }}>
          {filteredColumns.map((column) => {
            const checked = draftColumns.includes(column.id);
            return (
              <label
                key={column.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 8px",
                  borderBottom: "1px solid #f1f5f9",
                  cursor: column.required ? "default" : "pointer",
                  color: "#374151",
                  fontSize: "14px",
                }}
              >
                <GripVertical size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={column.required}
                  onChange={() => toggleColumn(column.id, column.required)}
                  style={{ width: "16px", height: "16px", cursor: column.required ? "default" : "pointer" }}
                />
                <span>
                  {column.label}
                  {column.required ? " *" : ""}
                </span>
              </label>
            );
          })}
        </div>

        <div
          style={{
            padding: "16px 18px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => onSave(draftColumns)}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#10b981",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
