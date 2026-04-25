// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { vendorsAPI } from "../../services/api";
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
  Settings,
  RefreshCw,
  RotateCcw,
  ChevronRight,
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
  Columns,
} from "lucide-react";
import DeleteConfirmationModal from "./shared/DeleteConfirmationModal";

export default function Vendor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedView, setSelectedView] = useState("All Vendors");
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [selectedSortBy, setSelectedSortBy] = useState("Name");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    currency: "",
    taxRate: "",
    paymentTerms: "",
    portalLanguage: "",
    accountPayable: ""
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printDateRange, setPrintDateRange] = useState({
    startDate: "01/01/2026",
    endDate: "31/01/2026"
  });
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSelectedVendor, setMergeSelectedVendor] = useState("");
  const sortButtonRef = useRef(null);
  const importButtonRef = useRef(null);
  const exportButtonRef = useRef(null);
  const preferencesButtonRef = useRef(null);
  const [showAssociateTemplatesModal, setShowAssociateTemplatesModal] = useState(false);
  const [isMoreOptionsDropdownOpen, setIsMoreOptionsDropdownOpen] = useState(false);
  const moreOptionsDropdownRef = useRef(null);
  const [templateData, setTemplateData] = useState({
    vendorStatement: "Standard",
    purchaseOrder: "Standard Template",
    bills: "Standard Template",
    emailPurchaseOrder: "Default",
    emailPaymentsMade: "Default"
  });
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Load vendors from API
  const loadVendors = async () => {
    try {
      setIsRefreshing(true);
      console.log('Loading vendors from API...');
      const response = await vendorsAPI.getAll();
      console.log('API Response:', response);
      console.log('Response structure:', {
        success: response?.success,
        hasData: !!response?.data,
        dataType: Array.isArray(response?.data) ? 'array' : typeof response?.data,
        dataLength: Array.isArray(response?.data) ? response.data.length : 'N/A',
        pagination: response?.pagination
      });

      if (response && response.success && response.data) {
        // Ensure response.data is an array (handle both array and single object responses)
        let vendorsArray = [];
        if (Array.isArray(response.data)) {
          vendorsArray = response.data;
          console.log(`✅ Received ${vendorsArray.length} vendors from API (array)`);
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single vendor object, wrap it in an array
          vendorsArray = [response.data];
          console.warn(`⚠️ Received single vendor object instead of array, wrapped it`);
        } else if (response.data?.data) {
          // Handle nested data structure
          vendorsArray = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          console.warn(`⚠️ Received nested data structure, extracted ${vendorsArray.length} vendors`);
        }

        if (response.pagination) {
          console.log(`📊 Pagination info: ${response.pagination.total} total vendors, showing ${vendorsArray.length} (page ${response.pagination.page} of ${response.pagination.pages})`);
          if (response.pagination.total > vendorsArray.length) {
            console.warn(`⚠️ Not all vendors loaded! Total: ${response.pagination.total}, Loaded: ${vendorsArray.length}`);
          }
        }


        // Map API response to component format
        // Map all vendors - backend can handle all ID formats (ObjectId and old timestamp IDs)
        const mappedVendors = vendorsArray
          .map(vendor => {
            // Always prioritize MongoDB _id, convert to string
            const vendorId = vendor._id ? String(vendor._id) : (vendor.id ? String(vendor.id) : null);

            // Include all vendors - backend can handle both ObjectIds and old timestamp IDs
            if (!vendorId) {
              console.warn('Skipping vendor with no ID:', vendor.displayName || vendor.name);
              return null;
            }


            return {
              ...vendor,
              id: vendorId, // Use MongoDB _id as id (already converted to string)
              _id: vendor._id || vendorId, // Keep original _id (ObjectId or string)
              name: vendor.displayName || vendor.name || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.companyName || 'Vendor',
              payables: vendor.payables || 0,
              currency: vendor.currency || 'KES'
            };
          })
          .filter(vendor => vendor !== null); // Only remove vendors with no ID

        // Use all mapped vendors - backend can handle all ID formats
        const validVendors = mappedVendors;


        console.log(`✅ Loaded ${validVendors.length} valid vendors from database`);
        console.log('Vendor IDs:', validVendors.map(v => ({ name: v.name, id: v.id })));
        setVendors(validVendors);
      } else {
        console.warn('API response missing data:', response);
        setVendors([]);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      alert('Error loading vendors: ' + (error.message || 'Unknown error. Please check console.'));
      setVendors([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load vendors from API on component mount and when location changes
  useEffect(() => {
    // Clear any old localStorage vendor data to prevent conflicts
    try {
      localStorage.removeItem("vendors");
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }

    loadVendors();

    // Listen for vendor updates from other components
    const handleVendorSaved = () => {
      loadVendors();
    };
    window.addEventListener("vendorSaved", handleVendorSaved);

    return () => {
      window.removeEventListener("vendorSaved", handleVendorSaved);
    };
  }, [location.pathname]);

  // Filter vendors based on selected view
  const getFilteredVendors = () => {
    console.log(`🔍 Filtering vendors: selectedView="${selectedView}", total vendors=${vendors.length}`);
    if (selectedView === "All Vendors") {
      console.log(`✅ Returning all ${vendors.length} vendors (All Vendors view)`);
      return vendors;
    } else if (selectedView === "Active Vendors") {
      // Filter vendors that are active (not inactive)
      return vendors.filter(v => v.status !== "Inactive" && v.active !== false);
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
      return vendors.filter(v => v.status === "Inactive" || v.active === false);
    } else if (selectedView === "Vendor Portal Enabled") {
      return vendors.filter(v => v.formData?.enablePortal === true || v.enablePortal === true);
    } else if (selectedView === "Vendor Portal Disabled") {
      return vendors.filter(v => !v.formData?.enablePortal && v.enablePortal !== true);
    }
    return vendors;
  };

  const filteredVendors = getFilteredVendors();
  console.log(`📋 Filtered vendors count: ${filteredVendors.length} (from ${vendors.length} total)`);
  if (filteredVendors.length !== vendors.length && selectedView === "All Vendors") {
    console.warn(`⚠️ WARNING: Filtered count (${filteredVendors.length}) doesn't match total (${vendors.length}) even though view is "All Vendors"!`);
  }


  // Sort function
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Map sort column names to vendor properties
  const getSortValue = (vendor, column) => {
    switch (column) {
      case "name":
        return (vendor.name || vendor.formData?.displayName || vendor.formData?.companyName || vendor.formData?.vendorName || "").toLowerCase();
      case "companyName":
        return (vendor.formData?.companyName || vendor.name || "").toLowerCase();
      case "unusedCredits":
        return parseFloat(vendor.unusedCredits || 0);
      case "createdAt":
        return new Date(vendor.createdAt || vendor.created || 0).getTime();
      case "updatedAt":
        return new Date(vendor.updatedAt || vendor.updated || vendor.createdAt || vendor.created || 0).getTime();
      default:
        return "";
    }
  };

  // Use all filtered vendors - backend can handle all ID formats
  // Sorted vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    const aValue = getSortValue(a, sortColumn);
    const bValue = getSortValue(b, sortColumn);

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Listen for custom event when vendor is saved (from other components)
  useEffect(() => {
    const handleVendorSaved = () => {
      loadVendors();
    };

    window.addEventListener("vendorSaved", handleVendorSaved);

    return () => {
      window.removeEventListener("vendorSaved", handleVendorSaved);
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
      }
      // Close row dropdown when clicking outside
      if (openDropdownId && !event.target.closest('[data-row-dropdown]')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown, showMoreDropdown, openDropdownId]);

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
      setSelectedVendors(filtered.map((v) => v.id));
    }
  };

  // Inline styles
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
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
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
      fontSize: "24px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexWrap: "wrap",
    },
    statusText: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
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
    newButtonHover: {
      backgroundColor: "#0D4A52",
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
    tableWrapper: {
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "800px",
    },
    thead: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    th: {
      padding: "12px 16px",
      textAlign: "left",
    },
    thContent: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    thText: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#4b5563",
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
      borderBottom: "1px solid #e5e7eb",
    },
    trHover: {
      backgroundColor: "#f9fafb",
    },
    td: {
      padding: "12px 16px",
      fontSize: "14px",
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
      cursor: "pointer",
    },
    vendorLink: {
      color: "#156372",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      backgroundColor: "transparent",
      border: "none",
      padding: 0,
    },
    vendorLinkHover: {
      textDecoration: "none",
    },
    tdText: {
      fontSize: "14px",
      color: "#374151",
    },
    tdTextDark: {
      fontSize: "14px",
      color: "#111827",
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
      borderColor: "#156372",
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
      backgroundColor: "#156372",
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
      borderLeft: "3px solid #156372",
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
      color: "#156372",
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
      backgroundColor: "#156372",
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
      color: "#156372",
    },
  };

  const handleDeleteSelected = () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to delete.");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleClearSelection = () => {
    setSelectedVendors([]);
  };

  const handleMarkAsActive = () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to mark as active.");
      return;
    }
    const updatedVendors = vendors.map((vendor) => {
      if (selectedVendors.includes(vendor.id)) {
        return {
          ...vendor,
          status: "Active",
          active: true,
          formData: {
            ...(vendor.formData || {}),
            status: "Active",
            active: true,
          },
        };
      }
      return vendor;
    });
    setVendors(updatedVendors);
    localStorage.setItem("vendors", JSON.stringify(updatedVendors));
    setSelectedVendors([]);
    setNotification(`The selected contacts have been marked as active.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMarkAsInactive = () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to mark as inactive.");
      return;
    }
    const updatedVendors = vendors.map((vendor) => {
      if (selectedVendors.includes(vendor.id)) {
        return {
          ...vendor,
          status: "Inactive",
          active: false,
          formData: {
            ...(vendor.formData || {}),
            status: "Inactive",
            active: false,
          },
        };
      }
      return vendor;
    });
    setVendors(updatedVendors);
    localStorage.setItem("vendors", JSON.stringify(updatedVendors));
    setSelectedVendors([]);
    setNotification(`The selected contacts have been marked as inactive.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMerge = () => {
    if (selectedVendors.length < 2) {
      alert("Please select at least 2 vendors to merge.");
      return;
    }
    setShowMergeModal(true);
  };

  const handleAssociateTemplates = () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to associate templates.");
      return;
    }
    setShowAssociateTemplatesModal(true);
  };

  const handlePrint = () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one vendor to print.");
      return;
    }
    setShowPrintModal(true);
  };

  // Close more options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreOptionsDropdownRef.current && !moreOptionsDropdownRef.current.contains(event.target)) {
        setIsMoreOptionsDropdownOpen(false);
      }
    };

    if (isMoreOptionsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreOptionsDropdownOpen]);

  // Log render to debug
  console.log("Vendor component rendering, showBulkUpdateModal:", showBulkUpdateModal);

  return (
    <div style={styles.container} className="vendor-container">
      {/* TOP HEADER */}
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
              style={styles.newButton}
              className="vendor-new-button"
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#156372")}
            >
              <Plus size={16} />
              New
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
                    onMouseLeave={() => {
                      setShowSortSubmenu(false);
                      // Reset button styles when leaving the wrapper
                      if (sortButtonRef.current) {
                        sortButtonRef.current.style.backgroundColor = "transparent";
                        sortButtonRef.current.style.color = "#111827";
                        const icon = sortButtonRef.current.querySelector("svg");
                        if (icon) icon.style.color = "#6b7280";
                        const chevron = sortButtonRef.current.querySelector(":last-child svg");
                        if (chevron) chevron.style.color = "#6b7280";
                      }
                    }}
                  >
                    <button
                      ref={sortButtonRef}
                      style={styles.moreDropdownItem}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#156372";
                        e.target.style.color = "#ffffff";
                        const icon = e.target.querySelector("svg");
                        if (icon) icon.style.color = "#ffffff";
                        const chevron = e.target.querySelector(":last-child svg");
                        if (chevron) chevron.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        // Only reset if submenu is not open (mouse moved to submenu)
                        if (!showSortSubmenu) {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#111827";
                          const icon = e.target.querySelector("svg");
                          if (icon) icon.style.color = "#6b7280";
                          const chevron = e.target.querySelector(":last-child svg");
                          if (chevron) chevron.style.color = "#6b7280";
                        }
                      }}
                    >
                      <div style={styles.moreDropdownItemLeft}>
                        <ArrowUpDown size={16} style={{ color: "#6b7280" }} />
                        <span>Sort by</span>
                      </div>
                      <div style={styles.moreDropdownItemRight}>
                        <ChevronRight size={16} style={{ color: "#6b7280" }} />
                      </div>
                    </button>
                    {showSortSubmenu && (
                      <div style={styles.submenu}>
                        {[
                          { label: "Name", column: "name" },
                          { label: "Company Name", column: "companyName" },
                          { label: "Unused Credits (BCY)", column: "unusedCredits" },
                          { label: "Created Time", column: "createdAt" },
                          { label: "Last Modified Time", column: "updatedAt" },
                        ].map((option) => (
                          <button
                            key={option.column}
                            style={{
                              ...styles.submenuItem,
                              ...(sortColumn === option.column ? styles.submenuItemSelected : {}),
                            }}
                            onClick={() => {
                              handleSort(option.column);
                              setShowSortSubmenu(false);
                              setShowMoreDropdown(false);
                            }}
                            onMouseEnter={(e) => {
                              if (sortColumn !== option.column) {
                                e.target.style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (sortColumn !== option.column) {
                                e.target.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <span>{option.label}</span>
                            {sortColumn === option.column && (
                              <Check size={16} style={{ color: "#156372" }} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={styles.submenuWrapper}
                    onMouseEnter={() => setShowImportSubmenu(true)}
                    onMouseLeave={() => {
                      setShowImportSubmenu(false);
                      // Reset button styles when leaving the wrapper
                      if (importButtonRef.current) {
                        importButtonRef.current.style.backgroundColor = "transparent";
                        importButtonRef.current.style.color = "#111827";
                        const icon = importButtonRef.current.querySelector("svg");
                        if (icon) icon.style.color = "#6b7280";
                        const chevron = importButtonRef.current.querySelector(":last-child svg");
                        if (chevron) chevron.style.color = "#6b7280";
                      }
                    }}
                  >
                    <button
                      ref={importButtonRef}
                      style={styles.moreDropdownItem}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#156372";
                        e.target.style.color = "#ffffff";
                        const icon = e.target.querySelector("svg");
                        if (icon) icon.style.color = "#ffffff";
                        const chevron = e.target.querySelector(":last-child svg");
                        if (chevron) chevron.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        // Only reset if submenu is not open (mouse moved to submenu)
                        if (!showImportSubmenu) {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#111827";
                          const icon = e.target.querySelector("svg");
                          if (icon) icon.style.color = "#6b7280";
                          const chevron = e.target.querySelector(":last-child svg");
                          if (chevron) chevron.style.color = "#6b7280";
                        }
                      }}
                    >
                      <div style={styles.moreDropdownItemLeft}>
                        <Download size={16} style={{ color: "#6b7280" }} />
                        <span>Import</span>
                      </div>
                      <div style={styles.moreDropdownItemRight}>
                        <ChevronRight size={16} style={{ color: "#6b7280" }} />
                      </div>
                    </button>
                    {showImportSubmenu && (
                      <div style={styles.submenu}>
                        <button
                          style={styles.submenuItem}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "#ffffff";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                          onClick={() => {
                            navigate("/purchases/vendors/import");
                            setShowImportSubmenu(false);
                            setShowMoreDropdown(false);
                          }}
                        >
                          <span>Import Vendors</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    style={styles.submenuWrapper}
                    onMouseEnter={() => setShowExportSubmenu(true)}
                    onMouseLeave={() => {
                      setShowExportSubmenu(false);
                      // Reset button styles when leaving the wrapper
                      if (exportButtonRef.current) {
                        exportButtonRef.current.style.backgroundColor = "transparent";
                        exportButtonRef.current.style.color = "#111827";
                        const icon = exportButtonRef.current.querySelector("svg");
                        if (icon) icon.style.color = "#6b7280";
                        const chevron = exportButtonRef.current.querySelector(":last-child svg");
                        if (chevron) chevron.style.color = "#6b7280";
                      }
                    }}
                  >
                    <button
                      ref={exportButtonRef}
                      style={styles.moreDropdownItem}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#156372";
                        e.target.style.color = "#ffffff";
                        const icon = e.target.querySelector("svg");
                        if (icon) icon.style.color = "#ffffff";
                        const chevron = e.target.querySelector(":last-child svg");
                        if (chevron) chevron.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        // Only reset if submenu is not open (mouse moved to submenu)
                        if (!showExportSubmenu) {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#111827";
                          const icon = e.target.querySelector("svg");
                          if (icon) icon.style.color = "#6b7280";
                          const chevron = e.target.querySelector(":last-child svg");
                          if (chevron) chevron.style.color = "#6b7280";
                        }
                      }}
                    >
                      <div style={styles.moreDropdownItemLeft}>
                        <Upload size={16} style={{ color: "#6b7280" }} />
                        <span>Export</span>
                      </div>
                      <div style={styles.moreDropdownItemRight}>
                        <ChevronRight size={16} style={{ color: "#6b7280" }} />
                      </div>
                    </button>
                    {showExportSubmenu && (
                      <div style={styles.submenu}>
                        <button
                          style={styles.submenuItem}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "#ffffff";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                          onClick={() => {
                            // Export all vendors
                            const dataStr = JSON.stringify(vendors, null, 2);
                            const dataBlob = new Blob([dataStr], { type: "application/json" });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = "vendors.json";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            setShowExportSubmenu(false);
                            setShowMoreDropdown(false);
                          }}
                        >
                          <span>Export Vendors</span>
                        </button>
                        <button
                          style={styles.submenuItem}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "#ffffff";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                          onClick={() => {
                            // Export current view with all vendor data
                            const dataStr = JSON.stringify(sortedVendors, null, 2);
                            const dataBlob = new Blob([dataStr], { type: "application/json" });
                            const url = URL.createObjectURL(dataBlob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = "vendors_current_view.json";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                            setShowExportSubmenu(false);
                            setShowMoreDropdown(false);
                          }}
                        >
                          <span>Export Current View</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    ref={preferencesButtonRef}
                    style={styles.moreDropdownItem}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#6b7280";
                    }}
                    onClick={() => setShowMoreDropdown(false)}
                  >
                    <div style={styles.moreDropdownItemLeft}>
                      <Settings size={16} style={{ color: "#6b7280" }} />
                      <span>Preferences</span>
                    </div>
                  </button>

                  <button
                    style={styles.moreDropdownItem}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#6b7280";
                    }}
                    onClick={() => {
                      // Refresh list functionality
                      window.location.reload();
                    }}
                  >
                    <div style={styles.moreDropdownItemLeft}>
                      <RefreshCw size={16} style={{ color: "#6b7280" }} />
                      <span>Refresh List</span>
                    </div>
                  </button>

                  <button
                    style={{
                      ...styles.moreDropdownItem,
                      backgroundColor: "#eff6ff",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#eff6ff";
                      e.target.style.color = "#156372";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#156372";
                    }}
                    onClick={() => {
                      // Reset column widths
                      setShowMoreDropdown(false);
                    }}
                  >
                    <div style={styles.moreDropdownItemLeft}>
                      <Columns size={16} style={{ color: "#156372" }} />
                      <span style={{ color: "#156372", fontWeight: "500" }}>Reset Column Width</span>
                    </div>
                  </button>

                  <button
                    style={styles.moreDropdownItem}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#156372";
                      e.target.style.color = "#ffffff";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "#111827";
                      const icon = e.target.querySelector("svg");
                      if (icon) icon.style.color = "#6b7280";
                    }}
                    onClick={() => {
                      // Reset column width functionality
                      setShowMoreDropdown(false);
                    }}
                  >
                    <div style={styles.moreDropdownItemLeft}>
                      <RotateCcw size={16} style={{ color: "#6b7280" }} />
                      <span>Reset Column Width</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* TABLE */}
      {/* Bulk Action Bar - Only visible when vendors are selected */}
      {selectedVendors.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (selectedVendors.length === 0) {
                  alert("Please select at least one vendor to update.");
                  return;
                }
                console.log("Opening bulk update modal, selected vendors:", selectedVendors.length);
                console.log("Current showBulkUpdateModal state BEFORE:", showBulkUpdateModal);
                setShowBulkUpdateModal(true);
                // Use a callback to verify state was set
                setTimeout(() => {
                  console.log("Checking state after setState...");
                }, 0);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#156372",
                backgroundColor: "#ffffff",
                border: "1px solid #156372",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#eff6ff";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Bulk Update
            </button>
            <button
              onClick={handlePrint}
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
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              <Printer size={16} />
            </button>
            <button
              onClick={handleMarkAsActive}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Mark as Active
            </button>
            <button
              onClick={handleMarkAsInactive}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Mark as Inactive
            </button>
            <button
              onClick={handleMerge}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Merge
            </button>
            <button
              onClick={handleAssociateTemplates}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              Associate Templates
            </button>
            <div style={{ position: "relative" }} ref={moreOptionsDropdownRef}>
              <button
                onClick={() => setIsMoreOptionsDropdownOpen(!isMoreOptionsDropdownOpen)}
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
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#ffffff";
                }}
              >
                <MoreVertical size={16} />
              </button>
              {isMoreOptionsDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    zIndex: 50,
                    minWidth: "180px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#0D4A52",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#fef2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                    onClick={() => {
                      setIsMoreOptionsDropdownOpen(false);
                      handleDeleteSelected();
                    }}
                  >
                    Delete
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#dbeafe",
                  border: "1px solid #93c5fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#156372",
                }}
              >
                {selectedVendors.length}
              </div>
              <span
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  fontWeight: "500",
                }}
              >
                Selected
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginRight: "4px",
                }}
              >
                Esc
              </span>
              <button
                onClick={handleClearSelection}
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
                <X size={20} style={{ color: "#156372" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.tableWrapper} className="vendor-table-wrapper">
        <table style={styles.table} className="vendor-table">
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>
                <div style={styles.thContent}>
                  <button style={styles.iconButton}>
                    <Filter size={16} />
                  </button>
                  <input
                    type="checkbox"
                    checked={
                      filteredVendors.length > 0 &&
                      selectedVendors.length === filteredVendors.length &&
                      filteredVendors.every(v => selectedVendors.includes(v.id))
                    }
                    onChange={handleSelectAll}
                    style={styles.checkbox}
                  />
                </div>
              </th>

              <th style={styles.th}>
                <div style={styles.thContent}>
                  <span style={styles.thText}>Name</span>
                  <button style={styles.iconButton}>
                    <ArrowUpDown size={12} />
                  </button>
                </div>
              </th>

              <th style={styles.th}>
                <div style={styles.thText}>Company Name</div>
              </th>

              <th style={styles.th}>
                <div style={styles.thText}>Email</div>
              </th>

              <th style={styles.th}>
                <div style={styles.thText}>Work Phone</div>
              </th>

              <th style={styles.th}>
                <div style={styles.thText}>Payables (BCY)</div>
              </th>

              <th style={styles.th}>
                <div style={styles.thText}>Unused Credits (BCY)</div>
              </th>
              <th style={styles.th}>
                <div style={styles.thRight}>
                  <button style={styles.iconButton}>
                    <Search size={16} />
                  </button>
                </div>
              </th>
            </tr>
          </thead>

          <tbody style={styles.tbody}>
            {sortedVendors.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.tdEmpty}>
                  No vendors found
                </td>
              </tr>
            ) : (
              sortedVendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  style={{
                    ...styles.tr,
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    // Don't navigate if clicking on checkbox or its container
                    if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('td:first-child')) {
                      // Always use the mapped id field (which is the MongoDB _id as string)
                      const vendorId = vendor.id || (vendor._id ? String(vendor._id) : null);

                      // Navigate to vendor - backend can handle all ID formats
                      if (vendorId) {
                        console.log('Navigating to vendor:', vendor.name, 'with ID:', vendorId);
                        navigate(`/purchases/vendors/${String(vendorId)}`);
                      } else {
                        console.error('Vendor has no ID:', vendor);
                        alert(`Error: Vendor "${vendor.name || 'Unknown'}" has no ID. Please refresh the page.`);
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                    e.currentTarget.style.cursor = "pointer";
                    setHoveredRowId(vendor.id);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    setHoveredRowId(null);
                  }}
                >
                  <td
                    style={styles.td}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(vendor.id)}
                      onChange={() => handleCheckboxChange(vendor.id)}
                      style={styles.checkbox}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>

                  <td style={styles.td}>
                    <button
                      style={styles.vendorLink}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Always use the mapped id field (which is the MongoDB _id as string)
                        const vendorId = vendor.id || (vendor._id ? String(vendor._id) : null);

                        // Navigate to vendor - backend can handle all ID formats
                        if (vendorId) {
                          console.log('Navigating to vendor:', vendor.name, 'with ID:', vendorId);
                          navigate(`/purchases/vendors/${String(vendorId)}`);
                        } else {
                          console.error('Vendor has invalid ID format:', vendorId, vendor);
                          alert(`Error: Vendor "${vendor.name || 'Unknown'}" has an invalid ID format. Please refresh the page.`);
                        }
                      }}
                    >
                      {vendor.name}
                    </button>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.tdText}>{vendor.companyName || "-"}</span>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.tdText}>{vendor.email || "-"}</span>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.tdText}>{vendor.workPhone || "-"}</span>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.tdTextDark}>{vendor.payables}</span>
                  </td>

                  <td style={styles.td}>
                    <span style={styles.tdTextDark}>{vendor.unusedCredits}</span>
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      position: "relative",
                      width: "40px"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {hoveredRowId === vendor.id && (
                      <div style={{ position: "relative" }} data-row-dropdown>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === vendor.id ? null : vendor.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#156372"
                          }}
                        >
                          <ChevronDown size={16} style={{ color: "#ffffff" }} />
                        </button>
                        {openDropdownId === vendor.id && (
                          <div
                            data-row-dropdown
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              marginTop: "4px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                              zIndex: 1000,
                              minWidth: "120px"
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Always use the mapped id field (which is the MongoDB _id as string)
                                const vendorId = vendor.id || (vendor._id ? String(vendor._id) : null);

                                // Navigate to vendor - backend can handle all ID formats
                                if (vendorId) {
                                  console.log('Navigating to edit vendor:', vendor.name, 'with ID:', vendorId);
                                  navigate(`/purchases/vendors/${String(vendorId)}`, { state: { edit: true } });
                                } else {
                                  console.error('Vendor has no ID:', vendor);
                                  alert(`Error: Vendor "${vendor.name || 'Unknown'}" has no ID. Please refresh the page.`);
                                }
                                setOpenDropdownId(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                textAlign: "left",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#374151",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#f9fafb";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "transparent";
                              }}
                            >
                              <Edit size={16} style={{ color: "#6b7280" }} />
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Custom View Modal */}
      {showCustomViewModal && typeof document !== 'undefined' && document.body && createPortal(
        <NewCustomViewModal
          onClose={() => setShowCustomViewModal(false)}
          onSave={(customView: any) => {
            // Handle saving custom view
            setShowCustomViewModal(false);
          }}
        />,
        document.body
      )}

      {/* Print Vendor Statements Modal */}
      {showPrintModal && createPortal(
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
            zIndex: 2000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPrintModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "600px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Dark Grey Bar */}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#374151",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                Print Vendor Statements
              </h2>
              <button
                onClick={() => setShowPrintModal(false)}
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
                <X size={18} style={{ color: "#ffffff" }} strokeWidth={2} />
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
              <div style={{ marginBottom: "20px" }}>
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
                  onChange={(e) =>
                    setPrintDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* End Date */}
              <div style={{ marginBottom: "24px" }}>
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
                  onChange={(e) =>
                    setPrintDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
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
                  setShowPrintModal(false);
                  setShowPrintPreview(true);
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
                onMouseEnter={(e: any) => {
                  e.target.style.backgroundColor = "#0D4A52";
                }}
                onMouseLeave={(e: any) => {
                  e.target.style.backgroundColor = "#156372";
                }}
              >
                Print Statements
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
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
                onMouseEnter={(e: any) => {
                  e.target.style.backgroundColor = "#f9fafb";
                }}
                onMouseLeave={(e: any) => {
                  e.target.style.backgroundColor = "#ffffff";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          const count = selectedVendors.length;
          const updatedVendors = vendors.filter((v: any) => !selectedVendors.includes(v.id));
          setVendors(updatedVendors);
          localStorage.setItem("vendors", JSON.stringify(updatedVendors));

          // Show success notification
          setNotification(`The selected vendor${count > 1 ? "s have" : " has"} been deleted.` as any);
          setTimeout(() => setNotification(null), 3000);

          setSelectedVendors([]);
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
              backgroundColor: "#10b981",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={12} style={{ color: "#ffffff" }} strokeWidth={3} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: "500", color: "#065f46" }}>
            {notification}
          </span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "12px",
              color: "#059669",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && createPortal(
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
            zIndex: 2000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBulkUpdateModal(false);
              setBulkUpdateData({
                currency: "",
                taxRate: "",
                paymentTerms: "",
                portalLanguage: "",
                accountPayable: "",
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
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
                Bulk Update - Vendors
              </h2>
              <button
                onClick={() => {
                  setShowBulkUpdateModal(false);
                  setBulkUpdateData({
                    currency: "",
                    taxRate: "",
                    paymentTerms: "",
                    portalLanguage: "",
                    accountPayable: "",
                  });
                }}
                style={{
                  background: "transparent",
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
              {/* Currency */}
              <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", width: "140px" }}>
                  Currency
                </label>
                <div style={{ flex: 1 }}>
                  <select
                    value={bulkUpdateData.currency}
                    onChange={(e) =>
                      setBulkUpdateData((prev) => ({ ...prev, currency: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <option value=""></option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AWG">AWG</option>
                    <option value="CAD">CAD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Tax Rate */}
              <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", width: "140px" }}>
                  Tax Rate
                </label>
                <div style={{ flex: 1 }}>
                  <select
                    value={bulkUpdateData.taxRate}
                    onChange={(e) =>
                      setBulkUpdateData((prev) => ({ ...prev, taxRate: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Select a Tax</option>
                    <option value="0%">0%</option>
                    <option value="5%">5%</option>
                    <option value="10%">10%</option>
                    <option value="15%">15%</option>
                    <option value="20%">20%</option>
                  </select>
                </div>
              </div>

              {/* Payment Terms */}
              <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", width: "140px" }}>
                  Payment Terms
                </label>
                <div style={{ flex: 1 }}>
                  <select
                    value={bulkUpdateData.paymentTerms}
                    onChange={(e) =>
                      setBulkUpdateData((prev) => ({ ...prev, paymentTerms: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <option value=""></option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>

              {/* Account Payable */}
              <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", width: "140px" }}>
                  Account Payable
                </label>
                <div style={{ flex: 1 }}>
                  <select
                    value={bulkUpdateData.accountPayable}
                    onChange={(e) =>
                      setBulkUpdateData((prev) => ({ ...prev, accountPayable: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Select an account</option>
                    <option value="Accounts Payable">Accounts Payable</option>
                    <option value="Other Payables">Other Payables</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  const hasUpdates =
                    bulkUpdateData.currency ||
                    bulkUpdateData.taxRate ||
                    bulkUpdateData.paymentTerms ||
                    bulkUpdateData.accountPayable;

                  if (!hasUpdates) {
                    alert("Please fill at least one field to update.");
                    return;
                  }

                  const updatedVendors = vendors.map((v: any) => {
                    if (!selectedVendors.includes(v.id)) return v;
                    const updatedVendor = { ...v };
                    const updatedFormData = { ...(v.formData || {}) };

                    if (bulkUpdateData.currency) {
                      updatedVendor.currency = bulkUpdateData.currency;
                      updatedFormData.currency = bulkUpdateData.currency;
                    }
                    if (bulkUpdateData.taxRate) {
                      updatedVendor.taxRate = bulkUpdateData.taxRate;
                      updatedFormData.taxRate = bulkUpdateData.taxRate;
                    }
                    if (bulkUpdateData.paymentTerms) {
                      updatedVendor.paymentTerms = bulkUpdateData.paymentTerms;
                      updatedFormData.paymentTerms = bulkUpdateData.paymentTerms;
                    }
                    if (bulkUpdateData.accountPayable) {
                      updatedVendor.accountPayable = bulkUpdateData.accountPayable;
                      updatedFormData.accountPayable = bulkUpdateData.accountPayable;
                    }

                    updatedVendor.formData = updatedFormData;
                    return updatedVendor;
                  });

                  setVendors(updatedVendors);
                  localStorage.setItem("vendors", JSON.stringify(updatedVendors));
                  setNotification(`Successfully updated ${selectedVendors.length} vendor(s)`);
                  setTimeout(() => setNotification(null), 3000);
                  setShowBulkUpdateModal(false);
                  setSelectedVendors([]);
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
              >
                Update
              </button>
              <button
                onClick={() => setShowBulkUpdateModal(false)}
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
        , document.body
      )}

      {/* Merge Vendors Modal */}
      {showMergeModal && createPortal(
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
            zIndex: 2000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMergeModal(false);
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
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
                Merge Vendors
              </h2>
              <button
                onClick={() => setShowMergeModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} style={{ color: "#156372" }} strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "14px", color: "#374151", marginBottom: "20px" }}>
                Select a vendor profile to merge with.
              </p>
              <select
                value={mergeSelectedVendor}
                onChange={(e) => setMergeSelectedVendor(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="" disabled>Select Vendor</option>
                {vendors
                  .filter((v: any) => !selectedVendors.includes(v.id))
                  .map((vendor: any) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name || vendor.formData?.name || "Unnamed Vendor"}
                    </option>
                  ))}
              </select>
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
                onClick={() => {
                  if (mergeSelectedVendor) {
                    const updatedVendors = vendors.filter(
                      (v: any) => !selectedVendors.includes(v.id)
                    );
                    setVendors(updatedVendors);
                    localStorage.setItem("vendors", JSON.stringify(updatedVendors));
                    setShowMergeModal(false);
                    setMergeSelectedVendor("");
                    setSelectedVendors([]);
                    setNotification("Vendors merged successfully.");
                    setTimeout(() => setNotification(null), 3000);
                  }
                }}
                disabled={!mergeSelectedVendor}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  backgroundColor: mergeSelectedVendor ? "#156372" : "#9ca3af",
                  color: "#ffffff",
                  borderRadius: "6px",
                  border: "none",
                  cursor: mergeSelectedVendor ? "pointer" : "not-allowed",
                }}
              >
                Merge
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
        , document.body
      )}

      {/* Associate Templates Modal */}
      {showAssociateTemplatesModal && createPortal(
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
            zIndex: 2000,
          }}
          onClick={() => setShowAssociateTemplatesModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600" }}>Associate Templates</h2>
              <button onClick={() => setShowAssociateTemplatesModal(false)} style={{ background: "none", border: "none" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>Vendor Statement</label>
              <select
                value={templateData.vendorStatement}
                onChange={(e) => setTemplateData(prev => ({ ...prev, vendorStatement: e.target.value }))}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
              >
                <option>Standard</option>
                <option>Professional</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowAssociateTemplatesModal(false)}
                style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid #d1d5db" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAssociateTemplatesModal(false)}
                style={{ padding: "8px 16px", borderRadius: "4px", backgroundColor: "#156372", color: "#white", border: "none" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#1f2937",
            zIndex: 3000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Preview Header */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <button
              onClick={() => {
                const selectedVendorData = vendors.filter((v: any) =>
                  selectedVendors.includes(v.id)
                );

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  const printContent = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Vendor Statements</title>
                        <style>
                          @media print { body { margin: 0; } }
                          body { font-family: Arial, sans-serif; margin: 20px; }
                          .statement { page-break-after: always; margin-bottom: 40px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          th { background-color: #f2f2f2; }
                        </style>
                      </head>
                      <body>
                        ${selectedVendorData.map((vendor: any) => `
                          <div class="statement">
                            <h2>TABAN BOOKS Vendor Statements</h2>
                            <p><strong>Name:</strong> ${vendor.name || vendor.formData?.name || 'N/A'}</p>
                            <p><strong>Date Range:</strong> ${printDateRange.startDate} To ${printDateRange.endDate}</p>
                            <table>
                              <thead>
                                <tr>
                                  <th>Description</th>
                                  <th>Amount</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Outstanding Balance</td>
                                  <td>${vendor.formData?.payables || '0.00'}</td>
                                  <td>Active</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        `).join('')}
                      </body>
                    </html>
                  `;
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                  printWindow.print();
                }
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
            >
              Print
            </button>
            <button
              onClick={() => setShowPrintPreview(false)}
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
              Close
            </button>
          </div>

          {/* Preview Content */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#ffffff",
              padding: "40px",
            }}
          >
            {vendors
              .filter((v: any) => selectedVendors.includes(v.id))
              .map((vendor: any) => (
                <div
                  key={vendor.id}
                  style={{
                    maxWidth: "800px",
                    margin: "0 auto 40px",
                  }}
                >
                  <div style={{ marginBottom: "30px", textAlign: "center" }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>
                      TABAN ENTERPRISES
                    </h1>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", textDecoration: "underline", marginTop: "20px" }}>
                      Statement of Accounts
                    </h2>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                      {printDateRange.startDate} To {printDateRange.endDate}
                    </p>
                  </div>

                  <div style={{ marginBottom: "30px" }}>
                    <p><strong>To:</strong> {vendor.name || vendor.formData?.name || 'N/A'}</p>
                    {vendor.formData?.companyName && <p>{vendor.formData.companyName}</p>}
                  </div>

                  <div style={{ marginBottom: "30px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>Opening Balance:</span>
                      <span>KES {vendor.formData?.payables ? Number(vendor.formData.payables).toFixed(2) : "0.00"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                      <span style={{ fontWeight: "bold" }}>Balance Due:</span>
                      <span style={{ fontWeight: "bold" }}>KES {vendor.formData?.payables ? Number(vendor.formData.payables).toFixed(2) : "0.00"}</span>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "left" }}>Date</th>
                        <th style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "left" }}>Transactions Details</th>
                        <th style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "right" }}>Amount</th>
                        <th style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "right" }}>Payments</th>
                        <th style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "right" }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>{printDateRange.startDate}</td>
                        <td style={{ padding: "12px", border: "1px solid #d1d5db" }}>***Opening Balance***</td>
                        <td style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "right" }}>{vendor.formData?.payables ? Number(vendor.formData.payables).toFixed(2) : "0.00"}</td>
                        <td style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "right" }}>-</td>
                        <td style={{ padding: "12px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: "500" }}>{vendor.formData?.payables ? Number(vendor.formData.payables).toFixed(2) : "0.00"}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ textAlign: "right", marginTop: "30px", paddingTop: "20px", borderTop: "2px solid #111827" }}>
                    <p style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                      Balance Due: KES {vendor.formData?.payables ? Number(vendor.formData.payables).toFixed(2) : "0.00"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
        , document.body
      )}
    </div>
  );
}

interface NewCustomViewModalProps {
  onClose: () => void;
  onSave: (view: any) => void;
}

function NewCustomViewModal({ onClose, onSave }: NewCustomViewModalProps) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id: number, field: string, value: string) => {
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

  const removeCriterion = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
    }));
  };

  const moveColumnToSelected = (column: string) => {
    setFormData((prev) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((c) => c !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column: string) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const modalStyles = {
    overlay: {
      position: "fixed" as const,
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
      flexDirection: "column" as const,
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "sticky" as const,
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
      position: "absolute" as const,
      left: "24px",
    },
    body: {
      padding: "24px",
      flex: 1,
      overflowY: "auto" as const,
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
      boxSizing: "border-box" as const,
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
      color: "#156372",
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
      overflowY: "auto" as const,
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
    radioGroup: {
      display: "flex",
      flexDirection: "column" as const,
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
      position: "sticky" as const,
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
      backgroundColor: "#156372",
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
            >
              Cancel
            </button>
            <button
              type="submit"
              style={modalStyles.saveBtn}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
