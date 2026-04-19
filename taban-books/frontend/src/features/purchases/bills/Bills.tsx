import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import ExportBills from "./ExportBills";
import { Check } from "lucide-react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  MoreVertical,
  List,
  Grid3x3,
  Play,
  Star,
  X,
  Filter,
  Search,
  FileText,
  Trash2,
  Download,
  Upload,
  Settings,
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  GripVertical,
  Lock,
  User,
  Folder,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info,
  Calendar,
  ChevronLeft
} from "lucide-react";
import { getBillStatusDisplay } from "../../../utils/billUtils";
import { useCurrency } from "../../../hooks/useCurrency";

import { billsAPI, purchaseOrdersAPI } from "../../../services/api";

let billsJsPdfLoader: Promise<typeof import("jspdf")> | null = null;

const loadBillsJsPdf = async () => {
  if (!billsJsPdfLoader) {
    billsJsPdfLoader = import("jspdf");
  }
  return billsJsPdfLoader;
};

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

const styles = {
  moreDropdownItem: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    fontSize: "14px",
    color: "#111827",
    cursor: "pointer",
    border: "none",
    backgroundColor: "transparent",
    width: "100%",
    textAlign: "left" as const,
  },
  moreDropdownItemText: {
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "20px",
  },
};

export default function Bills() {
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const displayCurrencyCode = baseCurrencyCode || "USD";
  const displayCurrencySymbol = baseCurrencySymbol || displayCurrencyCode;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const importSubmenuRef = useRef(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [bills, setBills] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("bills");
  // const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const exportSubmenuRef = useRef(null);
  const exportSubmenuTimeoutRef = useRef(null);
  const exportSubmenuClickedRef = useRef(false);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  const [searchType, setSearchType] = useState("Bills");
  const searchTypeOptions = [
    "Customers",
    "Items",
    "Inventory Adjustments",
    "Banking",
    "Quotes",
    "Invoices",
    "Payments Received",
    "Recurring Invoices",
    "Credit Notes",
    "Vendors",
    "Expenses",
    "Recurring Expenses",
    "Purchase Orders",
    "Bills",
    "Payments Made",
    "Recurring Bills",
    "Vendor Credits",
    "Projects",
    "Timesheet",
    "Journals",
    "Chart of Accounts",
    "Documents",
    "Task"
  ];
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState(false);
  const searchTypeDropdownRef = useRef(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [searchModalData, setSearchModalData] = useState({
    // Customers
    displayName: "",
    companyName: "",
    lastName: "",
    status: "All",
    address: "",
    customerType: "",
    firstName: "",
    email: "",
    phone: "",
    notes: "",
    // Items
    itemName: "",
    description: "",
    purchaseRate: "",
    salesAccount: "",
    sku: "",
    rate: "",
    purchaseAccount: "",
    // Inventory Adjustments
    referenceNumber: "",
    reason: "",
    itemDescription: "",
    adjustmentType: "All",
    dateFrom: "",
    dateTo: "",
    // Banking
    totalRangeFrom: "",
    totalRangeTo: "",
    dateRangeFrom: "",
    dateRangeTo: "",
    transactionType: "",
    // Quotes
    quoteNumber: "",
    referenceNumberQuote: "",
    itemNameQuote: "",
    itemDescriptionQuote: "",
    totalRangeFromQuote: "",
    totalRangeToQuote: "",
    customerName: "",
    salesperson: "",
    projectName: "",
    taxExemptions: "",
    addressType: "Billing and Shipping",
    attention: "",
    // Invoices
    invoiceNumber: "",
    orderNumber: "",
    createdBetweenFrom: "",
    createdBetweenTo: "",
    itemNameInvoice: "",
    itemDescriptionInvoice: "",
    account: "",
    totalRangeFromInvoice: "",
    totalRangeToInvoice: "",
    customerNameInvoice: "",
    salespersonInvoice: "",
    projectNameInvoice: "",
    taxExemptionsInvoice: "",
    addressTypeInvoice: "Billing and Shipping",
    attentionInvoice: "",
    // Payments Received
    paymentNumber: "",
    referenceNumberPayment: "",
    dateRangeFromPayment: "",
    dateRangeToPayment: "",
    totalRangeFromPayment: "",
    totalRangeToPayment: "",
    statusPayment: "",
    paymentMethod: "",
    notesPayment: "",
    // Expenses
    expenseNumber: "",
    vendorName: "",
    // Bills
    billNumber: "",
    vendorNameBill: "",
    referenceNumberBill: "",
    dateRangeFromBill: "",
    dateRangeToBill: "",
    createdBetweenFromBill: "",
    createdBetweenToBill: "",
    itemNameBill: "",
    itemDescriptionBill: "",
    totalRangeFromBill: "",
    totalRangeToBill: "",
    statusBill: "",
    poNumber: "",
    dueDateFromBill: "",
    dueDateToBill: "",
    accountBill: "",
    customerNameBill: "",
    taxExemptionsBill: "",
    projectNameBill: "",
    notesBill: "",
    billingAddressType: "Billing and Shipping",
    attentionBill: ""
  });
  const [notification, setNotification] = useState(null);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [showExportBillsModal, setShowExportBillsModal] = useState(false);
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  // const exportSubmenuTimeoutRef = useRef(null);
  // const [hoveredMenuItem, setHoveredMenuItem] = useState(null);
  // const exportSubmenuClickedRef = useRef(false);
  // const exportSubmenuRef = useRef(null);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [hoveredViewMode, setHoveredViewMode] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const sortSubmenuRef = useRef(null);
  const sortSubmenuTimeoutRef = useRef(null);
  const sortSubmenuClickedRef = useRef(false);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const yearMonthPickerRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Load bills from API
  const loadBills = async (
    page = currentPage,
    limit = itemsPerPage,
    view = selectedView,
    trigger = "Bills:effect",
  ) => {
    setIsRefreshing(true);
    try {
      const params: any = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      // Map View to Status
      if (view && view !== "All") {
        // Backend expects lowercase status values
        params.status = view.toLowerCase();
        if (view === "Due") params.status = "open";
        if (view === "Partially Paid") params.status = "partially paid";
      }

      const response = await billsAPI.getAll(params, {
        meta: {
          source: trigger,
          cacheTtlMs: 1000,
        },
      });
      if (response && (response.code === 0 || response.success)) {
        const billsData = (response.data || []).map((bill: any) => ({
          ...bill,
          id: bill._id || bill.id,
        }));
        setBills(billsData);
        if (response.pagination) {
          setTotalItems(response.pagination.total);
          setTotalPages(response.pagination.pages);
          setCurrentPage(response.pagination.page);
        }
      }
    } catch (error) {
      console.error("Error loading bills:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBills(1, itemsPerPage, selectedView, "Bills:initial-load");

    // Listen for updates
    const handleBillsUpdate = () => {
      loadBills(currentPage, itemsPerPage, selectedView, "Bills:event:billsUpdated");
    };

    window.addEventListener("billsUpdated", handleBillsUpdate);
    return () => {
      window.removeEventListener("billsUpdated", handleBillsUpdate);
    };
  }, [itemsPerPage, selectedView, sortBy, sortOrder]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Reload bills from API
    loadBills(currentPage, itemsPerPage, selectedView, "Bills:manual-refresh").finally(() => {
      setSelectedItems([]);
      setIsRefreshing(false);
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        // Check if click is inside export submenu
        if (exportSubmenuRef.current && exportSubmenuRef.current.contains(event.target)) {
          return; // Don't close if clicking inside submenu
        }
        // Check if click is inside sort submenu
        if (sortSubmenuRef.current && sortSubmenuRef.current.contains(event.target)) {
          return; // Don't close if clicking inside submenu
        }
        setMoreMenuOpen(false);
        setShowExportSubmenu(false);
        setShowSortSubmenu(false);
        exportSubmenuClickedRef.current = false;
        sortSubmenuClickedRef.current = false;
        setHoveredMenuItem(null);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        setUploadMenuOpen(false);
      }
      if (yearMonthPickerRef.current && !yearMonthPickerRef.current.contains(event.target)) {
        setShowYearMonthPicker(false);
      }
    };

    if (dropdownOpen || moreMenuOpen || uploadMenuOpen || showYearMonthPicker || isSearchTypeDropdownOpen || isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen, uploadMenuOpen, showYearMonthPicker]);

  const handleAttachFromDesktop = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    return () => {
      if (exportSubmenuTimeoutRef.current) {
        clearTimeout(exportSubmenuTimeoutRef.current);
      }
      if (sortSubmenuTimeoutRef.current) {
        clearTimeout(sortSubmenuTimeoutRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log("Files selected:", files);
      // Handle file upload logic here
    }
    setUploadMenuOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Calculate overdue days
  const calculateOverdueDays = (dueDate) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = today - due;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(sortedBills.map((bill) => bill.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one bill to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const handleBulkUpdateSubmit = async (field, value) => {
    const selectedIds = selectedItems.map(String);
    if (!selectedIds.length) return;

    const fieldMap: Record<string, string> = {
      vendor: "vendorName",
      currency: "currency",
      paymentTerms: "paymentTerms",
      status: "status",
      notes: "notes",
      date: "date",
      dueDate: "dueDate",
      account: "accountsPayable",
    };
    const targetField = fieldMap[field] || field;

    try {
      await Promise.all(
        selectedIds.map((billId) =>
          billsAPI.update(billId, {
            [targetField]:
              targetField === "date" || targetField === "dueDate"
                ? new Date(value).toISOString()
                : value,
          })
        )
      );
      await loadBills(currentPage, itemsPerPage, selectedView);
      setSelectedItems([]);
      window.dispatchEvent(new Event("billsUpdated"));
    } catch (error: any) {
      console.error("Failed to bulk update bills:", error);
      alert(error?.message || "Failed to bulk update selected bills.");
    }
  };

  const handleBulkDeleteBills = async () => {
    const selectedIds = selectedItems.map(String);
    if (!selectedIds.length) return;

    await Promise.all(selectedIds.map((billId) => billsAPI.delete(billId)));
    await loadBills(currentPage, itemsPerPage, selectedView);
    setSelectedItems([]);
    window.dispatchEvent(new Event("billsUpdated"));
  };

  const handleRecordBulkPayment = async () => {
    const selectedIds = selectedItems.map(String);
    if (!selectedIds.length) {
      alert("Please select at least one bill.");
      return;
    }

    if (!window.confirm(`Mark ${selectedIds.length} selected bill(s) as paid?`)) return;

    try {
      const billMap = new Map(
        bills.map((entry: any) => [String(entry.id || entry._id), entry])
      );

      await Promise.all(
        selectedIds.map((billId) => {
          const targetBill: any = billMap.get(String(billId)) || {};
          const total = Number(targetBill.total || 0);
          return billsAPI.update(billId, {
            status: "paid",
            paidAmount: total,
            balance: 0,
          });
        })
      );

      await loadBills(currentPage, itemsPerPage, selectedView);
      setSelectedItems([]);
      setNotification(`Successfully recorded payment for ${selectedIds.length} bill(s).`);
      setTimeout(() => setNotification(null), 3000);
      window.dispatchEvent(new Event("billsUpdated"));
    } catch (error: any) {
      console.error("Failed to record bulk payment:", error);
      alert(error?.message || "Failed to record bulk payment.");
    }
  };

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatDateForBillPdf = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-GB");
  };

  const sanitizePdfText = (value, fallback = "-") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };

  const getOrganizationInfoForBillPdf = () => {
    if (typeof window === "undefined") {
      return {};
    }

    const tryRead = (key) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    };

    const profile = tryRead("organization_profile") || tryRead("organization") || {};
    const address = profile.address || {};

    return {
      name: profile.organizationName || profile.name || profile.companyName || "",
      street1: profile.street1 || address.street1 || "",
      street2: profile.street2 || address.street2 || "",
      city: profile.city || address.city || "",
      state: profile.state || address.state || "",
      zipCode: profile.zipCode || address.zipCode || "",
      country: profile.country || address.country || "",
      email: profile.email || "",
    };
  };

  const normalizeBillForPdf = (rawBill) => {
    const vendorObject = rawBill?.vendor && typeof rawBill.vendor === "object" ? rawBill.vendor : {};
    const vendorAddressObject = vendorObject?.billingAddress || {};
    const items = Array.isArray(rawBill?.items)
      ? rawBill.items.map((line, index) => {
        const quantity = toFiniteNumber(line?.quantity, 0);
        const rate = toFiniteNumber(line?.rate ?? line?.unitPrice, 0);
        const amount = toFiniteNumber(line?.amount ?? line?.total, quantity * rate);
        const description =
          line?.itemDetails
          || line?.description
          || line?.name
          || line?.item?.name
          || line?.itemName
          || `Item ${index + 1}`;

        return {
          description: sanitizePdfText(description, `Item ${index + 1}`),
          quantity,
          rate,
          amount,
        };
      })
      : [];

    const computedSubTotal = items.reduce((sum, item) => sum + toFiniteNumber(item.amount, 0), 0);
    const subTotal = toFiniteNumber(rawBill?.subtotal ?? rawBill?.subTotal, computedSubTotal);
    const total = toFiniteNumber(rawBill?.total, subTotal);
    const paidAmount = toFiniteNumber(rawBill?.paidAmount, 0);
    const vendorCreditsApplied = toFiniteNumber(rawBill?.vendorCreditsApplied, 0);
    const balanceDue = toFiniteNumber(
      rawBill?.balanceDue ?? rawBill?.balance,
      Math.max(total - paidAmount - vendorCreditsApplied, 0)
    );

    const vendorName = sanitizePdfText(
      rawBill?.vendorName
      || vendorObject?.displayName
      || vendorObject?.name
      || vendorObject?.companyName,
      "Vendor"
    );

    const vendorAddressLine1 = sanitizePdfText(
      [rawBill?.vendorAddress, vendorAddressObject?.street1, vendorAddressObject?.street2]
        .filter(Boolean)
        .join(" "),
      "-"
    );

    const vendorAddressLine2 = sanitizePdfText(
      [
        rawBill?.vendorCity,
        vendorAddressObject?.city,
        vendorAddressObject?.state,
        rawBill?.vendorCountry || vendorAddressObject?.country,
        vendorAddressObject?.zipCode,
      ]
        .filter(Boolean)
        .join(", "),
      ""
    );

    const billCurrencySymbol = displayCurrencySymbol || rawBill?.currency || displayCurrencyCode;
    const formatAmount = (value) => `${billCurrencySymbol} ${toFiniteNumber(value, 0).toFixed(2)}`;

    return {
      billNumber: sanitizePdfText(rawBill?.billNumber, "Bill"),
      orderNumber: sanitizePdfText(rawBill?.orderNumber, "-"),
      billDate: formatDateForBillPdf(rawBill?.date || rawBill?.billDate),
      dueDate: formatDateForBillPdf(rawBill?.dueDate),
      paymentTerms: sanitizePdfText(rawBill?.paymentTerms || rawBill?.terms, "Due on Receipt"),
      vendorName,
      vendorAddressLine1,
      vendorAddressLine2,
      items,
      subTotal,
      total,
      balanceDue,
      creditsApplied: vendorCreditsApplied,
      subTotalFormatted: formatAmount(subTotal),
      totalFormatted: formatAmount(total),
      balanceDueFormatted: formatAmount(balanceDue),
      creditsAppliedFormatted: formatAmount(vendorCreditsApplied),
    };
  };

  const drawBillTemplatePage = (pdf, billData, organizationInfo) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 8;
    const marginY = 10;
    const boxX = marginX;
    const boxY = marginY;
    const boxW = pageWidth - marginX * 2;
    const boxH = pageHeight - marginY * 2;

    pdf.setDrawColor(209, 213, 219);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "S");

    pdf.setFillColor(21, 99, 114);
    pdf.triangle(boxX, boxY, boxX + 11, boxY, boxX, boxY + 11, "F");

    const leftX = boxX + 14;
    const rightX = boxX + boxW - 14;

    const orgName = sanitizePdfText(organizationInfo?.name, "Organization");
    const orgLine1 = [organizationInfo?.street1, organizationInfo?.street2].filter(Boolean).join(" ");
    const orgLine2 = [organizationInfo?.city, organizationInfo?.state, organizationInfo?.zipCode].filter(Boolean).join(", ");
    const orgLine3 = organizationInfo?.country || "";
    const orgEmail = organizationInfo?.email || "";

    pdf.setTextColor(17, 24, 39);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(orgName, leftX, boxY + 14);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    let orgY = boxY + 19;
    [orgLine1, orgLine2, orgLine3, orgEmail].filter(Boolean).forEach((line) => {
      pdf.text(sanitizePdfText(line, ""), leftX, orgY);
      orgY += 4;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(15);
    pdf.text("BILL", rightX, boxY + 16, { align: "right" });

    pdf.setFontSize(8);
    pdf.text(`Bill# ${billData.billNumber}`, rightX, boxY + 22, { align: "right" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text("BALANCE DUE", rightX, boxY + 28, { align: "right" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(17, 24, 39);
    pdf.text(billData.balanceDueFormatted, rightX, boxY + 34, { align: "right" });

    const detailsTopY = boxY + 54;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(217, 119, 6);
    pdf.text("BILL FROM", leftX, detailsTopY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39);
    pdf.text(billData.vendorName, leftX, detailsTopY + 6);

    const vendorAddressLines = [billData.vendorAddressLine1, billData.vendorAddressLine2]
      .filter(Boolean)
      .flatMap((line) => pdf.splitTextToSize(line, 88));
    let vendorY = detailsTopY + 11;
    vendorAddressLines.slice(0, 3).forEach((line) => {
      pdf.setTextColor(75, 85, 99);
      pdf.text(line, leftX, vendorY);
      vendorY += 4;
    });

    const detailsX = boxX + boxW - 78;
    const detailRows = [
      ["Order Number :", billData.orderNumber],
      ["Bill Date :", billData.billDate],
      ["Due Date :", billData.dueDate],
      ["Terms :", billData.paymentTerms],
    ];
    let detailY = detailsTopY + 1;
    detailRows.forEach(([label, value]) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(107, 114, 128);
      pdf.text(label, detailsX, detailY);
      pdf.setTextColor(17, 24, 39);
      pdf.text(sanitizePdfText(value), rightX, detailY, { align: "right" });
      detailY += 6;
    });

    const tableX = boxX + 12;
    const tableY = boxY + 88;
    const tableW = boxW - 24;
    const headerH = 8;

    const col1W = 8;
    const col2W = tableW * 0.52;
    const col3W = tableW * 0.12;
    const col4W = tableW * 0.14;
    const col5W = tableW - (col1W + col2W + col3W + col4W);

    const col1X = tableX;
    const col2X = col1X + col1W;
    const col3X = col2X + col2W;
    const col4X = col3X + col3W;
    const col5X = col4X + col4W;

    pdf.setFillColor(51, 65, 85);
    pdf.rect(tableX, tableY, tableW, headerH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text("#", col1X + 2, tableY + 5.2);
    pdf.text("ITEM & DESCRIPTION", col2X + 1.5, tableY + 5.2);
    pdf.text("QTY", col3X + col3W - 1.5, tableY + 5.2, { align: "right" });
    pdf.text("RATE", col4X + col4W - 1.5, tableY + 5.2, { align: "right" });
    pdf.text("AMOUNT", col5X + col5W - 1.5, tableY + 5.2, { align: "right" });

    const tableBottomLimit = boxY + boxH - 70;
    let rowY = tableY + headerH;
    let renderedCount = 0;
    const rows = billData.items.length ? billData.items : [{ description: "-", quantity: 0, rate: 0, amount: 0 }];

    pdf.setDrawColor(229, 231, 235);
    rows.forEach((item, index) => {
      if (rowY > tableBottomLimit) return;

      const descriptionLines = pdf.splitTextToSize(item.description, col2W - 2.5);
      const rowH = Math.max(6, descriptionLines.length * 3.5 + 2);

      if (rowY + rowH > tableBottomLimit) return;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(17, 24, 39);
      pdf.text(String(index + 1), col1X + 2, rowY + 4.5);
      pdf.text(descriptionLines.slice(0, 3), col2X + 1.5, rowY + 4.2);
      pdf.text(toFiniteNumber(item.quantity, 0).toFixed(2), col3X + col3W - 1.5, rowY + 4.5, { align: "right" });
      pdf.text(toFiniteNumber(item.rate, 0).toFixed(2), col4X + col4W - 1.5, rowY + 4.5, { align: "right" });
      pdf.text(toFiniteNumber(item.amount, 0).toFixed(2), col5X + col5W - 1.5, rowY + 4.5, { align: "right" });
      pdf.line(tableX, rowY + rowH, tableX + tableW, rowY + rowH);
      rowY += rowH;
      renderedCount += 1;
    });

    if (renderedCount < rows.length && rowY + 6 <= tableBottomLimit) {
      const hiddenRows = rows.length - renderedCount;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`... and ${hiddenRows} more item(s)`, col2X + 1.5, rowY + 4.5);
      rowY += 6;
    }

    const summaryX = boxX + boxW - 78;
    let summaryY = Math.max(rowY + 10, boxY + boxH - 52);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    pdf.text("Sub Total", summaryX + 44, summaryY);
    pdf.text(billData.subTotalFormatted, rightX, summaryY, { align: "right" });
    summaryY += 8;

    if (billData.creditsApplied > 0) {
      pdf.text("Credits Applied", summaryX + 44, summaryY);
      pdf.text(`(-) ${billData.creditsAppliedFormatted}`, rightX, summaryY, { align: "right" });
      summaryY += 8;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(17, 24, 39);
    pdf.text("Total", summaryX + 44, summaryY);
    pdf.text(billData.totalFormatted, rightX, summaryY, { align: "right" });

    const balanceBarY = boxY + boxH - 20;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(tableX, balanceBarY - 6, tableW, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text("Balance Due", tableX + tableW - 42, balanceBarY);
    pdf.text(billData.balanceDueFormatted, rightX, balanceBarY, { align: "right" });
  };

  const handleDownloadSelectedBillsPdf = async () => {
    const selectedIds = new Set(selectedItems.map(String));
    const selectedBillsList = sortedBills.filter((bill: any) => selectedIds.has(String(bill.id || bill._id)));

    if (!selectedBillsList.length) {
      alert("Please select at least one bill.");
      return;
    }

    try {
      const detailedBills = await Promise.all(
        selectedBillsList.map(async (bill: any) => {
          const billId = String(bill.id || bill._id || "");
          if (!billId) return bill;

          try {
            const response = await billsAPI.getById(billId);
            const fetchedBill = response?.data || response?.bill || response;
            if (fetchedBill && typeof fetchedBill === "object") {
              return {
                ...bill,
                ...fetchedBill,
                id: fetchedBill._id || fetchedBill.id || billId,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch full bill ${billId} for PDF, using list data.`, error);
          }

          return bill;
        })
      );

      const organizationInfo = getOrganizationInfoForBillPdf();
      const normalizedBills = detailedBills.map((bill: any) => normalizeBillForPdf(bill));

      const { jsPDF } = await loadBillsJsPdf();
      const pdf = new jsPDF("p", "mm", "a4");
      normalizedBills.forEach((billData, index) => {
        if (index > 0) pdf.addPage();
        drawBillTemplatePage(pdf, billData, organizationInfo);
      });

      const singleBillName = normalizedBills.length === 1
        ? String(normalizedBills[0].billNumber || "bill").replace(/[^a-z0-9-_]/gi, "_")
        : `bills-${new Date().toISOString().slice(0, 10)}`;

      pdf.save(`${singleBillName}.pdf`);
    } catch (error) {
      console.error("Failed to download selected bills PDF:", error);
      alert("Failed to generate selected bills PDF.");
    }
  };

  const handleLinkToExistingPurchaseOrder = async () => {
    const selectedIds = selectedItems.map(String);
    if (!selectedIds.length) {
      alert("Please select at least one bill.");
      return;
    }

    const poNumber = window.prompt("Enter Purchase Order Number (for example: PO-00001)");
    if (!String(poNumber || "").trim()) return;

    try {
      const poListResponse = await purchaseOrdersAPI.getAll();
      const poList = Array.isArray(poListResponse?.data) ? poListResponse.data : [];
      const matchedPO = poList.find((po: any) =>
        String(po.purchaseOrderNumber || "").trim().toLowerCase() === String(poNumber).trim().toLowerCase()
      );

      if (!matchedPO) {
        alert("Purchase Order not found.");
        return;
      }

      const purchaseOrderId = String(matchedPO._id || matchedPO.id || "");
      await Promise.all(
        selectedIds.map((billId) =>
          billsAPI.update(billId, {
            purchaseOrderId,
            fromPurchaseOrder: true,
            orderNumber: matchedPO.purchaseOrderNumber || poNumber,
          })
        )
      );

      await loadBills(currentPage, itemsPerPage, selectedView);
      setSelectedItems([]);
      setNotification(`Linked ${selectedIds.length} bill(s) to ${matchedPO.purchaseOrderNumber}.`);
      setTimeout(() => setNotification(null), 3000);
      window.dispatchEvent(new Event("billsUpdated"));
    } catch (error: any) {
      console.error("Failed to link bills to purchase order:", error);
      alert(error?.message || "Failed to link bills to purchase order.");
    }
  };

  const billFieldOptions = [
    { value: "vendor", label: "Vendor", type: "text", placeholder: "Enter vendor name" },
    { value: "currency", label: "Currency", type: "select", options: [{ value: displayCurrencyCode, label: displayCurrencyCode }] },
    {
      value: "paymentTerms",
      label: "Payment Terms",
      type: "select",
      options: ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"],
    },
    {
      value: "status",
      label: "Status",
      type: "select",
      options: ["draft", "open", "partially paid", "paid", "overdue", "void", "cancelled"],
    },
    { value: "date", label: "Bill Date", type: "date" },
    { value: "dueDate", label: "Due Date", type: "date" },
    { value: "account", label: "Accounts Payable", type: "text", placeholder: "Enter account name" },
    { value: "notes", label: "Notes", type: "text", placeholder: "Enter notes" },
  ];

  // Sort bills function
  const sortBills = (billsToSort) => {
    const sorted = [...billsToSort];
    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "date":
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case "billNumber":
          aValue = (a.billNumber || "").toLowerCase();
          bValue = (b.billNumber || "").toLowerCase();
          break;
        case "vendor":
          aValue = (a.vendorName || "").toLowerCase();
          bValue = (b.vendorName || "").toLowerCase();
          break;
        case "amount":
          aValue = parseFloat(a.total || 0);
          bValue = parseFloat(b.total || 0);
          break;
        case "dueDate":
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
    return sorted;
  };

  const downloadSampleFile = (type: 'csv' | 'xls') => {
    const headers = [
      "Vendor Name", "Bill#", "Reference#", "Order#", "Date", "Due Date",
      "Payment Terms", "Currency", "Item Name", "Item Description",
      "Quantity", "Rate", "Account", "Tax Rate"
    ];
    const sampleData = [
      ["John Doe", "BILL-001", "REF-001", "PO-001", "2024-01-01", "2024-01-15", "Net 15", displayCurrencyCode, "Consulting", "Work for Jan", "10", "150", "Professional Services", "0%"],
      ["Jane Smith", "BILL-002", "REF-002", "PO-002", "2024-01-05", "2024-01-20", "Net 15", displayCurrencyCode, "Software", "License fee", "1", "1200", "Software Subscriptions", "5%"]
    ];

    let content = "";
    let mimeType = "";
    let fileName = `bills_sample.${type}`;

    if (type === 'csv') {
      content = [headers, ...sampleData].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      content = [headers, ...sampleData].map(row => row.join("\t")).join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const sortedBills = sortBills(bills);

  // Calendar helper functions
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add days from previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }

    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getBillsForDate = (date, month, year) => {
    return bills.filter((bill) => {
      const billDateValue = bill.billDate || bill.date;
      if (!billDateValue) return false;
      const billDate = new Date(billDateValue);
      if (isNaN(billDate.getTime())) return false;
      return (
        billDate.getDate() === date &&
        billDate.getMonth() === month &&
        billDate.getFullYear() === year
      );
    });
  };

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const getMonthOptions = () => {
    const options = [];
    for (let i = -2; i <= 2; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      options.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
      });
    }
    return options;
  };

  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-none border border-gray-200 border-l-0 border-r-0 shadow-sm">
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
        .skeleton-cell {
          height: 16px;
          background-color: #e5e7eb;
          border-radius: 4px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton-checkbox {
          width: 16px;
          height: 16px;
          background-color: #e5e7eb;
          border-radius: 4px;
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}} />
      {/* Header */}
      {selectedItems.length === 0 && (
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* All Bills dropdown with underline */}
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  className="text-sm font-medium bg-transparent border-none cursor-pointer flex items-center gap-1 pb-1"
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                  }}
                  style={{
                    padding: 0,
                    paddingBottom: "4px",
                    color: "#156372",
                    borderBottom: "2px solid #156372",
                  }}
                >
                  {selectedView === "All" ? "All Bills" : (selectedView === "Open" ? "Due" : selectedView)}
                  {dropdownOpen ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px] max-h-[400px] overflow-y-auto">
                    {["All", "Draft", "Due", "Overdue", "Partially Paid", "Paid", "Void", "Cancelled"].map((option) => {
                      const isSelected = selectedView === option;
                      return (
                        <button
                          key={option}
                          className={`w-full px-4 py-2 text-sm text-left cursor-pointer border-none bg-transparent flex items-center justify-between ${isSelected
                            ? "bg-[#156372] text-white"
                            : "text-gray-900 hover:bg-gray-50"
                            }`}
                          onClick={() => {
                            setSelectedView(option);
                            setDropdownOpen(false);
                          }}
                        >
                          <span>{option}</span>
                          <Star
                            size={16}
                            className={isSelected ? "text-white fill-white" : "text-gray-400"}
                            fill={isSelected ? "currentColor" : "none"}
                          />
                        </button>
                      );
                    })}
                    <div className="h-px bg-gray-200 my-1" />
                    <button
                      className="w-full px-4 py-2 text-sm text-gray-900 text-left cursor-pointer border-none bg-transparent flex items-center gap-2 hover:bg-gray-50"
                      onClick={() => {
                        setShowCustomViewModal(true);
                        setDropdownOpen(false);
                      }}
                    >
                      <Plus size={16} className="text-teal-700" />
                      New Custom View
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <button
                  className={`p-2 rounded-md cursor-pointer flex items-center justify-center transition-colors ${viewMode === "list"
                    ? "bg-gray-100 text-gray-900 border-2 border-[#156372]"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                    }`}
                  onClick={() => setViewMode("list")}
                  onMouseEnter={() => setHoveredViewMode("list")}
                  onMouseLeave={() => setHoveredViewMode(null)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: viewMode === "list" ? "2px solid #156372" : "1px solid #d1d5db",
                    backgroundColor: viewMode === "list" ? "#f3f4f6" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <List size={18} />
                </button>
                {hoveredViewMode === "list" && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginTop: "8px",
                      backgroundColor: "#1e40af",
                      color: "#ffffff",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      zIndex: 1000,
                      pointerEvents: "none",
                    }}
                  >
                    List View
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderBottom: "6px solid #1e40af",
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button
                  className={`p-2 rounded-md cursor-pointer flex items-center justify-center transition-colors ${viewMode === "grid"
                    ? "bg-gray-100 text-gray-900 border-2 border-[#156372]"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                    }`}
                  onClick={() => setViewMode("grid")}
                  onMouseEnter={() => setHoveredViewMode("grid")}
                  onMouseLeave={() => setHoveredViewMode(null)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: viewMode === "grid" ? "2px solid #156372" : "1px solid #d1d5db",
                    backgroundColor: viewMode === "grid" ? "#f3f4f6" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={18} />
                </button>
                {hoveredViewMode === "grid" && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginTop: "8px",
                      backgroundColor: "#1e40af",
                      color: "#ffffff",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      zIndex: 1000,
                      pointerEvents: "none",
                    }}
                  >
                    Calendar View
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderBottom: "6px solid #1e40af",
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="relative inline-block" ref={uploadMenuRef}>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer flex items-center gap-1 hover:bg-gray-50 hover:border-gray-400"
                  onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                >
                  Upload Bill
                  <ChevronDown size={14} />
                </button>
                {uploadMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px]">
                    <button
                      className="w-full px-4 py-2 text-sm text-gray-900 text-left cursor-pointer border-none bg-transparent hover:bg-gray-50"
                      onClick={handleAttachFromDesktop}
                    >
                      Attach From Desktop
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <button
                className="px-4 py-2 text-sm font-medium text-white border-none rounded-md cursor-pointer flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: purchasesTheme.primary }}
                onClick={() => navigate("/purchases/bills/new")}
              >
                <Plus size={16} />
                New
              </button>
              <div className="relative inline-block" ref={moreMenuRef}>
                <button
                  className="p-2 rounded-md bg-gray-100 border-none cursor-pointer flex items-center justify-center hover:bg-gray-200"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px] max-h-[400px] overflow-y-auto" style={{ overflow: "visible" }}>
                    {/* Sort by */}
                    <div
                      ref={sortSubmenuRef}
                      style={{ position: "relative" }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseEnter={() => {
                        if (sortSubmenuTimeoutRef.current) {
                          clearTimeout(sortSubmenuTimeoutRef.current);
                          sortSubmenuTimeoutRef.current = null;
                        }
                        if (!sortSubmenuClickedRef.current) {
                          setShowSortSubmenu(true);
                          setHoveredMenuItem('sort');
                        }
                      }}
                      onMouseLeave={() => {
                        if (!sortSubmenuClickedRef.current) {
                          sortSubmenuTimeoutRef.current = setTimeout(() => {
                            setShowSortSubmenu(false);
                            setHoveredMenuItem(null);
                          }, 200);
                        }
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newState = !showSortSubmenu;
                          sortSubmenuClickedRef.current = newState;
                          setShowSortSubmenu(newState);
                          setHoveredMenuItem('sort');
                          if (sortSubmenuTimeoutRef.current) {
                            clearTimeout(sortSubmenuTimeoutRef.current);
                            sortSubmenuTimeoutRef.current = null;
                          }
                          if (!newState) {
                            sortSubmenuClickedRef.current = false;
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          fontSize: "14px",
                          color: (hoveredMenuItem === 'sort' || showSortSubmenu) ? "#1976d2" : "#1976d2",
                          cursor: "pointer",
                          border: "none",
                          width: "100%",
                          textAlign: "left",
                          gap: "12px",
                          backgroundColor: (hoveredMenuItem === 'sort' || showSortSubmenu) ? "#e3f2fd" : "#e3f2fd",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <ArrowUpDown size={16} style={{ color: "#1976d2" }} />
                          <span>Sort by</span>
                        </div>
                        <ChevronRight size={16} style={{ color: "#1976d2" }} />
                      </button>
                      {showSortSubmenu && (
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
                            if (sortSubmenuTimeoutRef.current) {
                              clearTimeout(sortSubmenuTimeoutRef.current);
                              sortSubmenuTimeoutRef.current = null;
                            }
                            setShowSortSubmenu(true);
                          }}
                          onMouseLeave={() => {
                            if (!sortSubmenuClickedRef.current) {
                              sortSubmenuTimeoutRef.current = setTimeout(() => {
                                setShowSortSubmenu(false);
                              }, 200);
                            }
                          }}
                        >
                          {[
                            { value: "date", label: "Date" },
                            { value: "billNumber", label: "Bill Number" },
                            { value: "vendor", label: "Vendor" },
                            { value: "amount", label: "Amount" },
                            { value: "dueDate", label: "Due Date" },
                            { value: "status", label: "Status" },
                          ].map((option) => (
                            <div key={option.value} style={{ borderBottom: "1px solid #f3f4f6" }}>
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
                                  sortSubmenuClickedRef.current = false;
                                  if (sortSubmenuTimeoutRef.current) {
                                    clearTimeout(sortSubmenuTimeoutRef.current);
                                    sortSubmenuTimeoutRef.current = null;
                                  }
                                  setSortBy(option.value);
                                  setShowSortSubmenu(false);
                                  setMoreMenuOpen(false);
                                  setHoveredMenuItem(null);
                                }}
                              >
                                <span>{option.label}</span>
                                {sortBy === option.value && (
                                  <Check size={16} style={{ color: sortBy === option.value ? "inherit" : "transparent" }} />
                                )}
                              </button>
                              {sortBy === option.value && (
                                <div style={{ padding: "4px 16px", display: "flex", gap: "8px" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSortOrder("asc");
                                      setShowSortSubmenu(false);
                                      setMoreMenuOpen(false);
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "12px",
                                      backgroundColor: sortOrder === "asc" ? "#156372" : "#f3f4f6",
                                      color: sortOrder === "asc" ? "#ffffff" : "#111827",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <ArrowUp size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSortOrder("desc");
                                      setShowSortSubmenu(false);
                                      setMoreMenuOpen(false);
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "12px",
                                      backgroundColor: sortOrder === "desc" ? "#156372" : "#f3f4f6",
                                      color: sortOrder === "desc" ? "#ffffff" : "#111827",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <ArrowDown size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Import Bills Submenu */}
                    <div
                      ref={importSubmenuRef}
                      style={{ position: "relative" }}
                      onMouseEnter={() => {
                        setShowImportSubmenu(true);
                        setHoveredMenuItem('import');
                      }}
                      onMouseLeave={() => {
                        setShowImportSubmenu(false);
                        setHoveredMenuItem(null);
                      }}
                    >
                      <button
                        className="w-full px-4 py-3 text-sm text-gray-900 cursor-pointer border-none bg-transparent text-left flex items-center justify-between hover:bg-gray-100"
                        style={{
                          backgroundColor: (hoveredMenuItem === 'import' || showImportSubmenu) ? "#156372" : "transparent",
                          color: (hoveredMenuItem === 'import' || showImportSubmenu) ? "#ffffff" : "#111827",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Download size={16} style={{ color: (hoveredMenuItem === 'import' || showImportSubmenu) ? "#ffffff" : "#6b7280" }} />
                          <span>Import Bills</span>
                        </div>
                        <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'import' || showImportSubmenu) ? "#ffffff" : "#6b7280" }} />
                      </button>
                      {showImportSubmenu && (
                        <div
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
                        >
                          <button
                            type="button"
                            style={{
                              display: "flex",
                              alignItems: "center",
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
                            onClick={() => {
                              setMoreMenuOpen(false);
                              navigate("/purchases/bills/import");
                            }}
                          >
                            <span>Import Bills</span>
                          </button>
                          <button
                            type="button"
                            style={{
                              display: "flex",
                              alignItems: "center",
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
                            onClick={() => {
                              downloadSampleFile('xls');
                            }}
                          >
                            <span>Download Sample File</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Export Bills Submenu */}
                    <div style={{ position: "relative" }} ref={exportSubmenuRef}>
                      <button
                        style={{
                          ...styles.moreDropdownItem,
                          justifyContent: "space-between",
                          backgroundColor: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#156372" : "transparent",
                          color: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#ffffff" : "#111827"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newState = !showExportSubmenu;
                          exportSubmenuClickedRef.current = newState;
                          setShowExportSubmenu(newState);
                          setHoveredMenuItem('export');
                          setImportSubmenuOpen(false); // Close other submenus if any
                        }}
                        onMouseEnter={() => {
                          if (exportSubmenuTimeoutRef.current) {
                            clearTimeout(exportSubmenuTimeoutRef.current);
                            exportSubmenuTimeoutRef.current = null;
                          }
                          setShowExportSubmenu(true);
                          setHoveredMenuItem('export');
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
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Upload size={16} style={{ color: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#ffffff" : "#6b7280" }} />
                          <span style={styles.moreDropdownItemText}>Export</span>
                        </div>
                        <ChevronRight size={12} style={{ color: (hoveredMenuItem === 'export' || showExportSubmenu) ? "#ffffff" : "#6b7280" }} />
                      </button>
                      {showExportSubmenu && (
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
                        }}
                          onMouseEnter={() => {
                            if (exportSubmenuTimeoutRef.current) {
                              clearTimeout(exportSubmenuTimeoutRef.current);
                              exportSubmenuTimeoutRef.current = null;
                            }
                          }}
                          onMouseLeave={() => {
                            if (!exportSubmenuClickedRef.current) {
                              setShowExportSubmenu(false);
                              setHoveredMenuItem(null);
                            }
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportType("bills");
                              setShowExportModal(true);
                              setShowExportSubmenu(false);
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#eff6ff"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Export Bills
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportType("current-view");
                              setShowExportModal(true);
                              setShowExportSubmenu(false);
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#eff6ff"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preferences */}
                    <button
                      className="w-full px-4 py-3 text-sm text-gray-900 cursor-pointer border-none bg-transparent text-left hover:bg-gray-100"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        navigate("/settings/bills");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Settings size={16} className="text-gray-500" />
                        <span>Preferences</span>
                      </div>
                    </button>

                    {/* Refresh List */}
                    <button
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-900 cursor-pointer border-none bg-transparent text-left gap-3 hover:bg-gray-100"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                    >
                      <div className="flex items-center gap-3">
                        <RefreshCw
                          size={16}
                          className="text-gray-500"
                          style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
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

      {/* Main Content - Table, Calendar, or Empty State */}
      {false ? (
        <div className="p-12 bg-white min-h-[400px]">
          <div
            className="w-full max-w-[600px] mx-auto border-2 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center justify-center bg-gray-50 cursor-pointer transition-all hover:border-[#156372] hover:bg-teal-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-5xl mb-6">📁</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              Drag & Drop Files Here
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Upload your documents (Images, PDF, Docs or Sheets) here
            </p>
            <button
              type="button"
              className="px-6 py-2.5 bg-[#156372] text-white text-sm font-medium rounded-md border-none cursor-pointer transition-colors hover:bg-[#0D4A52]"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose files to upload
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="p-0 bg-white">
          {/* Calendar View */}
          <div className="p-6">
            {/* Bills Summary Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Bills Summary</span>
                <Info size={14} className="text-gray-400" />
              </div>
            </div>

            {/* Month/Year Navigation */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {getMonthOptions().map((option, index) => {
                const isSelected =
                  option.month === currentMonth && option.year === currentYear;
                return (
                  <button
                    key={`${option.month}-${option.year}`}
                    onClick={() => {
                      setCurrentMonth(option.month);
                      setCurrentYear(option.year);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${isSelected
                      ? "bg-white text-red-600 border-red-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
              <div className="relative" ref={yearMonthPickerRef}>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300"
                  title="Select Year and Month"
                  onClick={() => {
                    setPickerYear(currentYear);
                    setShowYearMonthPicker(!showYearMonthPicker);
                  }}
                >
                  <Calendar size={16} />
                </button>

                {/* Year/Month Picker Modal */}
                {showYearMonthPicker && (
                  <div
                    className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-[280px]"
                    style={{ marginTop: "8px" }}
                  >
                    {/* Year Navigation */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setPickerYear(pickerYear - 1)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        style={{ fontSize: "18px", lineHeight: "1" }}
                      >
                        «
                      </button>
                      <span className="text-lg font-semibold text-gray-900">{pickerYear}</span>
                      <button
                        type="button"
                        onClick={() => setPickerYear(pickerYear + 1)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        style={{ fontSize: "18px", lineHeight: "1" }}
                      >
                        »
                      </button>
                    </div>

                    {/* Months Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {monthNames.map((month, index) => {
                        const isSelected =
                          index === currentMonth && pickerYear === currentYear;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setCurrentMonth(index);
                              setCurrentYear(pickerYear);
                              setShowYearMonthPicker(false);
                            }}
                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${isSelected
                              ? "bg-gray-100 text-gray-900 border-gray-300"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                          >
                            {month}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="px-4 py-3 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {getCalendarDays().map((day, index) => {
                  const dayBills = getBillsForDate(day.date, day.month, day.year);
                  const isSelected =
                    selectedDate &&
                    selectedDate.date === day.date &&
                    selectedDate.month === day.month &&
                    selectedDate.year === day.year;
                  const isToday =
                    day.isCurrentMonth &&
                    day.date === new Date().getDate() &&
                    day.month === new Date().getMonth() &&
                    day.year === new Date().getFullYear();

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] border-r border-b border-gray-200 last:border-r-0 p-2 ${!day.isCurrentMonth ? "bg-gray-50" : "bg-white"
                        } ${isSelected ? "bg-yellow-50" : ""
                        }`}
                      onClick={() => {
                        if (day.isCurrentMonth) {
                          setSelectedDate({
                            date: day.date,
                            month: day.month,
                            year: day.year,
                          });
                        }
                      }}
                      style={{ cursor: day.isCurrentMonth ? "pointer" : "default" }}
                    >
                      <div
                        className={`text-sm mb-1 ${!day.isCurrentMonth
                          ? "text-gray-400"
                          : isToday
                            ? "font-bold text-teal-700"
                            : "text-gray-900"
                          }`}
                      >
                        {day.date}
                      </div>
                      {day.isCurrentMonth && dayBills.length > 0 && (
                        <div className="space-y-1">
                          {dayBills.slice(0, 2).map((bill) => (
                            <div
                              key={bill.id}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded truncate"
                              title={`${bill.billNumber || "Bill"} - ${bill.vendorName || ""}`}
                            >
                              {bill.billNumber || bill.vendorName || "Bill"}
                            </div>
                          ))}
                          {dayBills.length > 2 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{dayBills.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="mt-4 border border-gray-200 rounded-lg bg-white">
                <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-800">
                  Bills Preview for {String(selectedDate.date).padStart(2, "0")} {new Date(selectedDate.year, selectedDate.month, selectedDate.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {(() => {
                    const dayBills = getBillsForDate(selectedDate.date, selectedDate.month, selectedDate.year);
                    if (!dayBills.length) {
                      return <div className="px-4 py-4 text-sm text-gray-500">No bills on this date.</div>;
                    }
                    return dayBills.map((bill: any) => (
                      <button
                        key={String(bill.id || bill._id)}
                        type="button"
                        className="w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-gray-50"
                        onClick={() => navigate(`/purchases/bills/${bill.id || bill._id}`)}
                      >
                        <div className="text-sm font-medium text-gray-900">{bill.billNumber || "Bill"}</div>
                        <div className="text-xs text-gray-500">{bill.vendorName || "-"}</div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-0 bg-white">
          {/* Bulk Action Bar - Shows when items are selected */}
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 gap-2">
              <div className="flex items-center gap-2 flex-1">
                <button
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md cursor-pointer flex items-center gap-1"
                  onClick={handleBulkUpdate}
                >
                  Bulk Update
                </button>
                <div className="flex items-center gap-1">
                  <button
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md cursor-pointer flex items-center justify-center"
                    onClick={handleDownloadSelectedBillsPdf}
                    title="Download PDF"
                  >
                    <FileText size={16} strokeWidth={2} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (selectedItems.length === 0) {
                      alert("Please select at least one bill to delete.");
                      return;
                    }
                    setShowDeleteModal(true);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={16} strokeWidth={2} />
                  Delete
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#156372] flex items-center justify-center text-sm font-semibold text-white">
                    {selectedItems.length}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Esc</span>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center hover:bg-gray-100 rounded"
                  >
                    <X size={20} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    width: "48px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.length === sortedBills.length && sortedBills.length > 0}
                    onChange={handleSelectAll}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#156372" }}
                  />
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  DATE
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  BILL#
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  REFERENCE NUMBER
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  VENDOR NAME
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  DUE DATE
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  AMOUNT
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  BALANCE DUE
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <button
                    onClick={() => setShowSearchModal(true)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Search size={16} style={{ color: "#6b7280" }} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isRefreshing ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-checkbox"></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "80px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "90px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "80px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "120px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "70px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "80px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "70px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="skeleton-cell" style={{ width: "70px" }}></div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {/* Empty cell to match Search icon header column */}
                    </td>
                  </tr>
                ))
              ) : (
                sortedBills.map((bill, index) => {
                  const statusDisplay = getBillStatusDisplay(bill);
                  return (
                    <tr
                      key={bill._id || bill.id || index}
                      className="border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/purchases/bills/${bill._id || bill.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(bill.id)}
                          onChange={() => handleSelectItem(bill.id)}
                          className="w-4 h-4 cursor-pointer accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(bill.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-teal-700">
                        {bill.billNumber || ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bill.referenceNumber || ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bill.vendorName || (bill.vendor && (bill.vendor.name || bill.vendor.displayName)) || ""}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>
                          {statusDisplay.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(bill.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {displayCurrencySymbol} {parseFloat(bill.total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {displayCurrencySymbol} {parseFloat(bill.balance || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {/* Empty cell to match Search icon header column */}
                      </td>
                    </tr>
                  );
                })
              )}
              {sortedBills.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                    No bills found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {sortedBills.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} bills
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  loadBills(currentPage - 1, itemsPerPage, selectedView);
                }
              }}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronLeft size={20} />
            </button>

            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  loadBills(currentPage + 1, itemsPerPage, selectedView);
                }
              }}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Export Bills Modal */}
      {showExportBillsModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportBills
          onClose={() => setShowExportBillsModal(false)}
          exportType="bills"
          data={bills}
        />,
        document.body
      )}

      {/* Export Current View Modal */}
      {showExportCurrentViewModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportBills
          onClose={() => setShowExportCurrentViewModal(false)}
          exportType="current-view"
          data={sortedBills}
        />,
        document.body
      )}
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
        title="Bulk Update Bills"
        fieldOptions={billFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="bills"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const count = selectedItems.length;
          try {
            await handleBulkDeleteBills();
            setNotification(`The selected bill${count > 1 ? "s have" : " has"} been deleted.`);
            setTimeout(() => setNotification(null), 3000);
          } catch (error: any) {
            console.error("Failed to delete selected bills:", error);
            alert(error?.message || "Failed to delete selected bills.");
          }
        }}
        entityName="bill(s)"
        count={selectedItems.length}
      />

      {/* Success Notification */}
      {notification && (
        <div className="fixed top-5 right-5 bg-emerald-100 border border-emerald-500 rounded-lg px-4 py-3 flex items-center gap-3 z-[10001] shadow-lg">
          <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check size={16} className="text-white" />
          </div>
          <span className="text-sm text-emerald-900 font-medium">
            {notification}
          </span>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-[800px] mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
              <div className="flex items-center gap-6">
                {/* Search Type Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <div className="relative" ref={searchTypeDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen);
                      }}
                    >
                      <span>{searchType}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isSearchTypeDropdownOpen && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {searchTypeOptions.map((option) => (
                          <div
                            key={option}
                            className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${searchType === option
                              ? "bg-[#156372] text-white hover:bg-[#0D4A52]"
                              : "text-gray-700 hover:bg-gray-100"
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchType(option);
                              setIsSearchTypeDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter</label>
                  <div className="relative" ref={filterDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <span>{selectedView}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isFilterDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                        {["All", "Due", "Overdue", "Partially Paid", "Paid", "Void", "Draft"].map((view) => (
                          <div
                            key={view}
                            className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setSelectedView(view);
                              setIsFilterDropdownOpen(false);
                            }}
                          >
                            {view}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowSearchModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Criteria Body */}
            <div style={{ padding: "24px" }}>
              {searchType === "Bills" && (
                <div style={{ display: "flex", gap: "24px" }}>
                  {/* Left Column */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Bill# */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Bill#
                      </label>
                      <input
                        type="text"
                        value={searchModalData.billNumber}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, billNumber: e.target.value }))}
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
                          value={searchModalData.dateRangeFromBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFromBill: e.target.value }))}
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
                          value={searchModalData.dateRangeToBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToBill: e.target.value }))}
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

                    {/* Created Between */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Created Between
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.createdBetweenFromBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenFromBill: e.target.value }))}
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
                          value={searchModalData.createdBetweenToBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, createdBetweenToBill: e.target.value }))}
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
                        value={searchModalData.itemNameBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, itemNameBill: e.target.value }))}
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
                          value={searchModalData.totalRangeFromBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromBill: e.target.value }))}
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
                          value={searchModalData.totalRangeToBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToBill: e.target.value }))}
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

                    {/* Vendor */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Vendor
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={searchModalData.vendorNameBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, vendorNameBill: e.target.value }))}
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

                    {/* Customer Name */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Customer Name
                      </label>
                      <select
                        value={searchModalData.customerNameBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, customerNameBill: e.target.value }))}
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
                        <option value="">Select customer</option>
                      </select>
                    </div>

                    {/* Tax Exemptions */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Tax Exemptions
                      </label>
                      <select
                        value={searchModalData.taxExemptionsBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, taxExemptionsBill: e.target.value }))}
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

                    {/* Billing Address */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                        Billing Address
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "16px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="billingAddressType"
                              value="Billing and Shipping"
                              checked={searchModalData.billingAddressType === "Billing and Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, billingAddressType: e.target.value }))}
                              style={{ accentColor: "#156372" }}
                            />
                            <span style={{ fontSize: "14px", color: "#374151" }}>Billing and Shipping</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="billingAddressType"
                              value="Billing"
                              checked={searchModalData.billingAddressType === "Billing"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, billingAddressType: e.target.value }))}
                              style={{ accentColor: "#156372" }}
                            />
                            <span style={{ fontSize: "14px", color: "#374151" }}>Billing</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="billingAddressType"
                              value="Shipping"
                              checked={searchModalData.billingAddressType === "Shipping"}
                              onChange={(e) => setSearchModalData(prev => ({ ...prev, billingAddressType: e.target.value }))}
                              style={{ accentColor: "#156372" }}
                            />
                            <span style={{ fontSize: "14px", color: "#374151" }}>Shipping</span>
                          </label>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <select
                            value={searchModalData.attentionBill}
                            onChange={(e) => setSearchModalData(prev => ({ ...prev, attentionBill: e.target.value }))}
                            style={{
                              flex: 1,
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
                        <a
                          href="#"
                          onClick={(e) => e.preventDefault()}
                          style={{
                            fontSize: "14px",
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
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* P.O# */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        P.O#
                      </label>
                      <input
                        type="text"
                        value={searchModalData.poNumber}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, poNumber: e.target.value }))}
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

                    {/* Due Date */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Due Date
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.dueDateFromBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dueDateFromBill: e.target.value }))}
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
                          value={searchModalData.dueDateToBill}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dueDateToBill: e.target.value }))}
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
                      <select
                        value={searchModalData.statusBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, statusBill: e.target.value }))}
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
                        <option value="">All</option>
                        <option value="Draft">Draft</option>
                        <option value="Open">Due</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Void">Void</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Item Description */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Item Description
                      </label>
                      <input
                        type="text"
                        value={searchModalData.itemDescriptionBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, itemDescriptionBill: e.target.value }))}
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
                        value={searchModalData.notesBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, notesBill: e.target.value }))}
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

                    {/* Account */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Account
                      </label>
                      <select
                        value={searchModalData.accountBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, accountBill: e.target.value }))}
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
                        value={searchModalData.projectNameBill}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, projectNameBill: e.target.value }))}
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
                  </div>
                </div>
              )}

              {searchType === "Customers" && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={searchModalData.displayName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                      <input
                        type="text"
                        value={searchModalData.companyName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={searchModalData.email}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={searchModalData.phone}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={searchModalData.status}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      >
                        <option value="All">All</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #e5e7eb"
              }}>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchModalData({
                      ...searchModalData,
                      billNumber: "",
                      vendorNameBill: "",
                      referenceNumberBill: "",
                      dateRangeFromBill: "",
                      dateRangeToBill: "",
                      createdBetweenFromBill: "",
                      createdBetweenToBill: "",
                      itemNameBill: "",
                      itemDescriptionBill: "",
                      totalRangeFromBill: "",
                      totalRangeToBill: "",
                      statusBill: "",
                      poNumber: "",
                      dueDateFromBill: "",
                      dueDateToBill: "",
                      accountBill: "",
                      customerNameBill: "",
                      taxExemptionsBill: "",
                      projectNameBill: "",
                      notesBill: "",
                      billingAddressType: "Billing and Shipping",
                      attentionBill: "",
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
                    console.log("Search with:", searchType, searchModalData);
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
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && typeof document !== 'undefined' && document.body && createPortal(
        <ExportBills
          onClose={() => setShowExportModal(false)}
          exportType={exportType}
          data={exportType === "current-view" ? sortedBills : bills}
        />,
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
      "P.O.#",
      "Bill Account",
      "Bill Due Date",
      "Balance",
      "Notes",
      "Description",
      "Item Name",
      "Item Description",
      "Project Name",
      "Customer Name",
      "Expected Payment Date",
      "Tax",
      "Bill Created Date",
      "Created Time",
      "Created By",
      "Last Modified By",
      "Currency",
    ],
    selectedColumns: ["Bill Date", "Bill#", "Vendor Name", "Bill Status", "Bill Amount"],
    visibility: "Only Me",
    selectedUsers: [],
    userType: "Users",
    selectUsers: "",
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
    // Don't allow removing required columns
    const requiredColumns = ["Bill Date", "Bill#", "Vendor Name", "Bill Status", "Bill Amount"];
    if (requiredColumns.includes(column)) {
      return;
    }
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
    "Bill#",
    "P.O.#",
    "Bill Account",
    "Bill Date",
    "Bill Due Date",
    "Bill Status",
    "Balance",
    "Notes",
    "Description",
    "Bill Amount",
    "Vendor Name",
    "Item Name",
    "Item Description",
    "Project Name",
    "Customer Name",
    "Expected Payment Date",
    "Tax",
    "Bill Created Date",
    "Created Time",
    "Created By",
    "Last Modified By",
    "Currency",
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
      gap: "4px",
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
                  style={{ ...modalStyles.input, borderColor: "#156372", borderWidth: "2px" }}
                />
              </div>
              <div style={{ ...modalStyles.favoriteCheckbox, marginTop: "24px" }}>
                <Star size={16} style={{ color: formData.markAsFavorite ? "#fbbf24" : "#9ca3af", flexShrink: 0 }} />
                <label htmlFor="favorite" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: "#374151" }}>
                  <input
                    type="checkbox"
                    name="markAsFavorite"
                    checked={formData.markAsFavorite}
                    onChange={handleChange}
                    id="favorite"
                    style={{ cursor: "pointer" }}
                  />
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
                <div key={criterion.id} style={{ ...modalStyles.criterionRow, alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "#374151", minWidth: "20px" }}>{index + 1}</span>
                  <select
                    value={criterion.field}
                    onChange={(e) => handleCriterionChange(criterion.id, "field", e.target.value)}
                    style={modalStyles.criterionSelect}
                  >
                    <option value="">Select a field</option>
                    {fieldOptions.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                  <select
                    value={criterion.comparator}
                    onChange={(e) => handleCriterionChange(criterion.id, "comparator", e.target.value)}
                    style={modalStyles.criterionSelect}
                    disabled={!criterion.field}
                  >
                    <option value="">Select a comparator</option>
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
                  <button
                    type="button"
                    onClick={() => removeCriterion(criterion.id)}
                    style={modalStyles.removeButton}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addCriterion} style={modalStyles.addButton}>
                <Plus size={16} />
                Add Criterion
              </button>
            </div>
          </div>

          {/* Columns Preference Section */}
          <div style={modalStyles.section}>
            <h3 style={modalStyles.sectionTitle}>Columns Preference:</h3>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={{ ...modalStyles.label, marginBottom: "8px" }}>AVAILABLE COLUMNS</div>
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <Search size={16} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ ...modalStyles.searchInput, paddingLeft: "32px" }}
                  />
                </div>
                <div style={modalStyles.columnList}>
                  {filteredAvailableColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => moveColumnToSelected(column)}
                      style={{ ...modalStyles.columnItem, display: "flex", alignItems: "center", gap: "8px" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
                      <span>{column}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={{ ...modalStyles.label, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle size={16} style={{ color: "#10b981" }} />
                  SELECTED COLUMNS
                </div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => {
                    const isRequired = ["Bill Date", "Bill#", "Vendor Name", "Bill Status", "Bill Amount"].includes(column);
                    return (
                      <button
                        key={column}
                        type="button"
                        onClick={() => {
                          if (!isRequired) {
                            moveColumnToAvailable(column);
                          }
                        }}
                        style={{
                          ...modalStyles.columnItem,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: isRequired ? "default" : "pointer"
                        }}
                        onMouseEnter={(e) => {
                          if (!isRequired) {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <GripVertical size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        <span>{column}{isRequired ? "*" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.formGroup}>
              <label style={{ ...modalStyles.label, marginBottom: "4px" }}>Visibility Preference</label>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", display: "block" }}>Share With</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px", borderRadius: "6px", border: formData.visibility === "Only Me" ? "1px solid #156372" : "1px solid #e5e7eb" }}>
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
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px", borderRadius: "6px", border: formData.visibility === "Only Selected Users & Roles" ? "1px solid #156372" : "1px solid #e5e7eb" }}>
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
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px", borderRadius: "6px", border: formData.visibility === "Everyone" ? "1px solid #156372" : "1px solid #e5e7eb" }}>
                  <input
                    type="radio"
                    name="visibility"
                    value="Everyone"
                    checked={formData.visibility === "Everyone"}
                    onChange={handleChange}
                    style={{ cursor: "pointer" }}
                  />
                  <Folder size={16} style={{ color: "#6b7280" }} />
                  <span style={{ fontSize: "14px", color: "#374151" }}>Everyone</span>
                </label>
              </div>

              {/* User Selection Interface - Shows when "Only Selected Users & Roles" is selected */}
              {formData.visibility === "Only Selected Users & Roles" && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <select
                        name="userType"
                        value={formData.userType}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "8px 32px 8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          outline: "none",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                          appearance: "none",
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <button
                        type="button"
                        style={{
                          padding: "4px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Move up"
                      >
                        <ArrowUp size={14} style={{ color: "#6b7280" }} />
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: "4px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Move down"
                      >
                        <ArrowDown size={14} style={{ color: "#6b7280" }} />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <button
                        type="button"
                        style={{
                          padding: "4px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Move left"
                      >
                        <ArrowLeft size={14} style={{ color: "#6b7280" }} />
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: "4px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Move right"
                      >
                        <ArrowRight size={14} style={{ color: "#6b7280" }} />
                      </button>
                    </div>
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


