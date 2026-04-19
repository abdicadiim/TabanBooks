import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { getQuotes, deleteQuotes, updateQuote, getCustomers, getProjects, getSalespersons, getCustomViews, deleteCustomView } from "../salesModel";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  MoreVertical,
  Play,
  FileText,
  Upload,
  Check,
  CheckCircle,
  XCircle,
  Send,
  FileCheck,
  Search,
  Filter,
  X,
  Printer,
  FileDown,
  Trash2,
  ArrowUpDown,
  Download,
  Settings,
  RefreshCw,
  Database,
  Eye,
  SlidersHorizontal,
  GripVertical,
  Lock,
  Columns
} from "lucide-react";

// Type definitions
interface Quote {
  _id?: string;
  id?: string;
  quoteNumber?: string;
  customerName?: string;
  quoteDate?: string;
  expiryDate?: string;
  currency?: string;
  total?: number;
  amount?: number;
  status?: string;
  customer?: any;
  salesperson?: any;
  project?: any;
  date?: string;
  referenceNumber?: string;
  [key: string]: any;
}

interface Customer {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  companyName?: string;
  email?: string;
  [key: string]: any;
}

interface Salesperson {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  [key: string]: any;
}

interface Project {
  _id?: string;
  id?: string;
  name?: string;
  projectName?: string;
  [key: string]: any;
}

interface CustomView {
  _id?: string;
  id?: string;
  name?: string;
  viewName?: string;
  type?: string;
  [key: string]: any;
}

const defaultQuoteViews = [
  "All Quotes",
  "Open Quotes",
  "Sent",
  "Accepted",
  "Declined",
  "Expired",
  "Converted to Invoice",
  "Draft Quotes"
];

export default function Quotes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All Quotes");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  const [customViews, setCustomViews] = useState<CustomView[]>(() => getCustomViews().filter(v => v.type === "quotes"));
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: "createdTime", direction: "desc" as "asc" | "desc" });
  const [selectedQuotes, setSelectedQuotes] = useState<Quote[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkFieldDropdownOpen, setIsBulkFieldDropdownOpen] = useState(false);
  const [bulkFieldSearch, setBulkFieldSearch] = useState("");
  const [selectedBulkCustomer, setSelectedBulkCustomer] = useState<Customer | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isMarkAsSentModalOpen, setIsMarkAsSentModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isDeletingQuotes, setIsDeletingQuotes] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isCustomizeColumnsModalOpen, setIsCustomizeColumnsModalOpen] = useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([
    'date', 'quoteNumber', 'referenceNumber', 'customerName', 'status', 'amount'
  ]);
  const [tempVisibleColumns, setTempVisibleColumns] = useState([...visibleColumns]);
  const [headerMenuPosition, setHeaderMenuPosition] = useState({ top: 0, left: 0 });
  // const headerMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuMenuRef = useRef<HTMLDivElement>(null);

  const allColumnOptions = [
    { key: 'date', label: 'Date', locked: true },
    { key: 'quoteNumber', label: 'Quote Number', locked: true },
    { key: 'referenceNumber', label: 'Reference number', locked: false },
    { key: 'customerName', label: 'Customer Name', locked: true },
    { key: 'status', label: 'Status', locked: true },
    { key: 'amount', label: 'Amount', locked: true },
    { key: 'acceptedDate', label: 'Accepted Date', locked: false },
    { key: 'companyName', label: 'Company Name', locked: false },
    { key: 'declinedDate', label: 'Declined Date', locked: false },
    { key: 'expiryDate', label: 'Expiry Date', locked: false },
    { key: 'salesperson', label: 'Sales person', locked: false },
    { key: 'subTotal', label: 'Sub Total', locked: false },
  ];

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState({
    date: 150,
    quoteNumber: 150,
    referenceNumber: 180,
    customerName: 250,
    status: 120,
    amount: 120,
    acceptedDate: 150,
    companyName: 200,
    declinedDate: 150,
    expiryDate: 150,
    salesperson: 150,
    subTotal: 150
  });
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [searchType, setSearchType] = useState("Quotes");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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
  const [advancedSearchData, setAdvancedSearchData] = useState({
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
    vendorName: ""
  });
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState(false);
  const [searchTypeSearch, setSearchTypeSearch] = useState("");
  const searchTypeDropdownRef = useRef(null);
  const [isQuoteNumberDropdownOpen, setIsQuoteNumberDropdownOpen] = useState(false);
  const quoteNumberDropdownRef = useRef(null);
  const [isFilterTypeDropdownOpen, setIsFilterTypeDropdownOpen] = useState(false);
  const [filterTypeSearch, setFilterTypeSearch] = useState("");
  const filterTypeDropdownRef = useRef(null);

  // Customer Name dropdown
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerDropdownRef = useRef(null);

  // Salesperson dropdown
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const salespersonDropdownRef = useRef(null);

  // Project Name dropdown
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const projectDropdownRef = useRef(null);

  // Item Name dropdown for search
  const [isItemNameDropdownOpen, setIsItemNameDropdownOpen] = useState(false);
  const itemNameDropdownRef = useRef(null);

  // Tax Exemptions dropdown for search
  const [isTaxExemptionsDropdownOpen, setIsTaxExemptionsDropdownOpen] = useState(false);
  const taxExemptionsDropdownRef = useRef(null);

  // Invoice search dropdowns
  const [isCustomerNameInvoiceDropdownOpen, setIsCustomerNameInvoiceDropdownOpen] = useState(false);
  const customerNameInvoiceDropdownRef = useRef(null);
  const [isSalespersonInvoiceDropdownOpen, setIsSalespersonInvoiceDropdownOpen] = useState(false);
  const salespersonInvoiceDropdownRef = useRef(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef(null);
  const [isItemNameInvoiceDropdownOpen, setIsItemNameInvoiceDropdownOpen] = useState(false);
  const itemNameInvoiceDropdownRef = useRef(null);
  const [isProjectNameInvoiceDropdownOpen, setIsProjectNameInvoiceDropdownOpen] = useState(false);
  const projectNameInvoiceDropdownRef = useRef(null);
  const [isTaxExemptionsInvoiceDropdownOpen, setIsTaxExemptionsInvoiceDropdownOpen] = useState(false);
  const taxExemptionsInvoiceDropdownRef = useRef(null);
  const [isStatusInvoiceDropdownOpen, setIsStatusInvoiceDropdownOpen] = useState(false);
  const statusInvoiceDropdownRef = useRef(null);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const bulkFieldDropdownRef = useRef(null);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [loadedQuotes, loadedCustomers, loadedSalespersons, loadedProjects] = await Promise.all([
        getQuotes(),
        getCustomers(),
        getSalespersons(),
        getProjects()
      ]);
      setQuotes(Array.isArray(loadedQuotes) ? loadedQuotes : []);
      setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
      setSalespersons(Array.isArray(loadedSalespersons) ? loadedSalespersons : []);
      setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
      setCustomViews(getCustomViews().filter(v => v.type === "quotes"));
    } catch (error) {
      console.error("Error refreshing quotes:", error);
      setQuotes([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setQuotesLoading(true);
      try {
        const [loadedQuotes, loadedCustomers, loadedSalespersons, loadedProjects] = await Promise.all([
          getQuotes(),
          getCustomers(),
          getSalespersons(),
          getProjects()
        ]);
        setQuotes(Array.isArray(loadedQuotes) ? loadedQuotes : []);
        setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
        setSalespersons(Array.isArray(loadedSalespersons) ? loadedSalespersons : []);
        setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
        setCustomViews(getCustomViews().filter(v => v.type === "quotes"));
      } catch (error) {
        console.error("Error loading quotes:", error);
        setQuotes([]);
      } finally {
        setQuotesLoading(false);
      }
    };

    loadData();
  }, [location.pathname]);

  const getQuoteFieldValue = (quote, fieldName) => {
    const getCustomerName = (q) => {
      if (q.customerName) return q.customerName;
      if (typeof q.customer === 'object' && q.customer) {
        return q.customer.displayName || q.customer.name || '';
      }
      return q.customer || '';
    };

    const fieldMap = {
      "Date": quote.quoteDate || quote.date || "",
      "Quote#": quote.quoteNumber || quote.id || "",
      "Reference Number": quote.referenceNumber || "",
      "Customer Name": getCustomerName(quote),
      "Status": quote.status || "draft",
      "Amount": quote.total || quote.amount || 0,
      "Project Name": quote.projectName || "",
      "Salesperson": quote.salesperson || ""
    };
    return fieldMap[fieldName] !== undefined ? fieldMap[fieldName] : "";
  };

  const evaluateCriterion = (fieldValue, comparator, value) => {
    const fieldStr = String(fieldValue || "").toLowerCase();
    const valueStr = String(value || "").toLowerCase();

    switch (comparator) {
      case "is": return fieldStr === valueStr;
      case "is not": return fieldStr !== valueStr;
      case "starts with": return fieldStr.startsWith(valueStr);
      case "contains": return fieldStr.includes(valueStr);
      case "doesn't contain": return !fieldStr.includes(valueStr);
      case "is in": return valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is not in": return !valueStr.split(",").map(v => v.trim()).includes(fieldStr);
      case "is empty": return !fieldValue || fieldStr === "";
      case "is not empty": return fieldValue && fieldStr !== "";
      default: return true;
    }
  };

  // Filter quotes based on selected view
  const filteredQuotes = useMemo(() => {
    // Ensure quotes is always an array
    if (!Array.isArray(quotes)) {
      return [];
    }

    // Check if it's a custom view
    const customView = customViews.find(v => v.name === selectedView);
    if (customView && customView.criteria) {
      return quotes.filter(quote => {
        return customView.criteria.every(criterion => {
          if (!criterion.field || !criterion.comparator) return true;
          const fieldValue = getQuoteFieldValue(quote, criterion.field);
          return evaluateCriterion(fieldValue, criterion.comparator, criterion.value);
        });
      });
    }

    switch (selectedView) {
      case "All Quotes": return quotes;
      case "Open Quotes": return quotes.filter(q => q.status === "open");
      case "Sent": return quotes.filter(q => q.status === "sent");
      case "Accepted": return quotes.filter(q => q.status === "accepted");
      case "Declined": return quotes.filter(q => {
        const status = String(q.status || "").toLowerCase();
        return status === "declined" || status === "rejected";
      });
      case "Expired": return quotes.filter(q => q.status === "expired");
      case "Converted to Invoice": return quotes.filter(q => q.status === "converted");
      case "Draft Quotes": return quotes.filter(q => q.status === "draft");
      default: return quotes;
    }
  }, [quotes, selectedView, customViews]);

  // Sort quotes
  const sortedQuotes = useMemo(() => {
    const uniqueQuotes = Array.from(new Map(filteredQuotes.map(quote => [quote.id, quote])).values());
    return uniqueQuotes.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "date":
          aValue = new Date(a.date || a.quoteDate || 0);
          bValue = new Date(b.date || b.quoteDate || 0);
          break;
        case "quoteNumber":
          aValue = (a.quoteNumber || a.id || "").toLowerCase();
          bValue = (b.quoteNumber || b.id || "").toLowerCase();
          break;
        case "customerName":
          aValue = (a.customerName || (typeof a.customer === 'object' && a.customer ? (a.customer.displayName || a.customer.name || '') : (a.customer || ""))).toLowerCase();
          bValue = (b.customerName || (typeof b.customer === 'object' && b.customer ? (b.customer.displayName || b.customer.name || '') : (b.customer || ""))).toLowerCase();
          break;
        case "amount":
          aValue = parseFloat(a.total || a.amount || 0);
          bValue = parseFloat(b.total || b.amount || 0);
          break;
        case "createdTime":
          aValue = new Date(a.createdTime || a.createdAt || 0);
          bValue = new Date(b.createdTime || b.createdAt || 0);
          break;
        case "lastModifiedTime":
          aValue = new Date(a.lastModifiedTime || a.updatedAt || 0);
          bValue = new Date(b.lastModifiedTime || b.updatedAt || 0);
          break;
        default:
          aValue = new Date(a.createdTime || a.createdAt || 0);
          bValue = new Date(b.createdTime || b.createdAt || 0);
          break;
      }

      if (typeof aValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  }, [filteredQuotes, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleExportCurrentView = () => {
    const getCustomerName = (q: Quote) => {
      if (q.customerName) return q.customerName;
      if (typeof q.customer === 'object' && q.customer) {
        return q.customer.displayName || q.customer.name || '';
      }
      return q.customer || '';
    };

    const exportData = sortedQuotes.map(quote => ({
      "Quote Number": quote.quoteNumber || quote.id,
      "Date": formatDate(quote.date || quote.quoteDate),
      "Reference Number": quote.referenceNumber || "",
      "Customer Name": getCustomerName(quote),
      "Status": getStatusDisplay(quote.status),
      "Amount": formatAmount(quote.total || quote.amount, quote.currency)
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(","),
      ...exportData.map(row => headers.map(header => `"${row[header] || ""}"`).join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quotes_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsMoreMenuOpen(false);
  };

  const handleNewCustomView = () => {
    setIsDropdownOpen(false);
    navigate("/sales/quotes/custom-view/new");
  };

  const handleDeleteCustomView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this custom view?")) {
      deleteCustomView(viewId);
      setCustomViews(prev => prev.filter(v => v.id !== viewId));
      if (selectedView === customViews.find(v => v.id === viewId)?.name) {
        setSelectedView("All Quotes");
      }
    }
  };

  const isViewSelected = (view: string) => selectedView === view;

  const filteredDefaultViews = defaultQuoteViews.filter(view =>
    view.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  const filteredCustomViews = customViews.filter(view =>
    view.name.toLowerCase().includes(viewSearchQuery.toLowerCase())
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setViewSearchQuery(""); // Reset search query when dropdown closes
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
      if (bulkFieldDropdownRef.current && !bulkFieldDropdownRef.current.contains(event.target)) {
        setIsBulkFieldDropdownOpen(false);
        setBulkFieldSearch("");
      }
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
        setSearchTypeSearch("");
      }
      if (quoteNumberDropdownRef.current && !quoteNumberDropdownRef.current.contains(event.target)) {
        setIsQuoteNumberDropdownOpen(false);
      }
      if (filterTypeDropdownRef.current && !filterTypeDropdownRef.current.contains(event.target)) {
        setIsFilterTypeDropdownOpen(false);
        setFilterTypeSearch("");
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
        setCustomerSearch("");
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target)) {
        setIsSalespersonDropdownOpen(false);
        setSalespersonSearch("");
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false);
        setProjectSearch("");
      }
      if (itemNameDropdownRef.current && !itemNameDropdownRef.current.contains(event.target)) {
        setIsItemNameDropdownOpen(false);
      }
      if (taxExemptionsDropdownRef.current && !taxExemptionsDropdownRef.current.contains(event.target)) {
        setIsTaxExemptionsDropdownOpen(false);
      }
      if (customerNameInvoiceDropdownRef.current && !customerNameInvoiceDropdownRef.current.contains(event.target)) {
        setIsCustomerNameInvoiceDropdownOpen(false);
      }
      if (salespersonInvoiceDropdownRef.current && !salespersonInvoiceDropdownRef.current.contains(event.target)) {
        setIsSalespersonInvoiceDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false);
      }
      if (itemNameInvoiceDropdownRef.current && !itemNameInvoiceDropdownRef.current.contains(event.target)) {
        setIsItemNameInvoiceDropdownOpen(false);
      }
      if (projectNameInvoiceDropdownRef.current && !projectNameInvoiceDropdownRef.current.contains(event.target)) {
        setIsProjectNameInvoiceDropdownOpen(false);
      }
      if (taxExemptionsInvoiceDropdownRef.current && !taxExemptionsInvoiceDropdownRef.current.contains(event.target)) {
        setIsTaxExemptionsInvoiceDropdownOpen(false);
      }
      if (statusInvoiceDropdownRef.current && !statusInvoiceDropdownRef.current.contains(event.target)) {
        setIsStatusInvoiceDropdownOpen(false);
      }
      const clickedIcon = headerMenuRef.current?.contains(event.target as Node);
      const clickedMenu = headerMenuMenuRef.current?.contains(event.target as Node);
      if (!clickedIcon && !clickedMenu) {
        setIsHeaderMenuOpen(false);
      }
    };

    if (isDropdownOpen || isMoreMenuOpen || isBulkFieldDropdownOpen || isSearchTypeDropdownOpen || isQuoteNumberDropdownOpen || isFilterTypeDropdownOpen || isCustomerDropdownOpen || isSalespersonDropdownOpen || isProjectDropdownOpen || isItemNameDropdownOpen || isTaxExemptionsDropdownOpen || isCustomerNameInvoiceDropdownOpen || isSalespersonInvoiceDropdownOpen || isAccountDropdownOpen || isItemNameInvoiceDropdownOpen || isProjectNameInvoiceDropdownOpen || isTaxExemptionsInvoiceDropdownOpen || isStatusInvoiceDropdownOpen || isHeaderMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isMoreMenuOpen, isBulkFieldDropdownOpen, isSearchTypeDropdownOpen, isQuoteNumberDropdownOpen, isFilterTypeDropdownOpen, isCustomerDropdownOpen, isSalespersonDropdownOpen, isProjectDropdownOpen, isItemNameDropdownOpen, isTaxExemptionsDropdownOpen, isCustomerNameInvoiceDropdownOpen, isSalespersonInvoiceDropdownOpen, isAccountDropdownOpen, isItemNameInvoiceDropdownOpen, isProjectNameInvoiceDropdownOpen, isTaxExemptionsInvoiceDropdownOpen, isStatusInvoiceDropdownOpen]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedQuotes(sortedQuotes.map(q => q.id));
    } else {
      setSelectedQuotes([]);
    }
  };

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuotes(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      } else {
        return [...prev, quoteId];
      }
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatCurrency = (amount: string | number, currency: string = "AMD") => {
    const num = parseFloat(amount) || 0;
    const currencySymbols = {
      'USD': '$',
      'EUR': 'â‚¬',
      'GBP': 'Â£',
      'AMD': 'Ö',
      'AED': 'Ø¯.Ø¥',
      'INR': 'â‚¹',
      'JPY': 'Â¥',
      'CNY': 'Â¥',
      'RUB': 'â‚½',
      'KES': 'KSh',
      'NGN': 'â‚¦'
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatAmount = (amount: string | number, currency: string = "AMD") => {
    const num = parseFloat(amount) || 0;
    const currencySymbols = {
      'USD': '$',
      'EUR': 'â‚¬',
      'GBP': 'Â£',
      'AMD': 'Ö',
      'AED': 'Ø¯.Ø¥',
      'INR': 'â‚¹',
      'JPY': 'Â¥',
      'CNY': 'Â¥',
      'RUB': 'â‚½'
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      draft: '#6B7280',
      sent: '#3B82F6',
      open: '#10B981',
      accepted: '#059669',
      declined: '#EF4444',
      rejected: '#EF4444',
      expired: '#F59E0B',
      converted: '#8B5CF6',
      invoiced: '#059669'
    };
    return statusColors[status as keyof typeof statusColors] || '#6B7280';
  };

  const getStatusText = (status: string) => {
    const statusTexts = {
      draft: 'Draft',
      sent: 'Sent',
      open: 'Open',
      accepted: 'Accepted',
      declined: 'Declined',
      rejected: 'Declined',
      expired: 'Expired',
      converted: 'Invoiced',
      invoiced: 'Invoiced'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  const getStatusDisplay = (status: string) => {
    return getStatusText(status);
  };

  const getStatusClass = (status: string) => {
    const statusClasses = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      expired: 'bg-amber-100 text-amber-800 border-amber-200',
      converted: 'bg-green-100 text-green-800 border-green-200',
      invoiced: 'bg-green-100 text-green-800 border-green-200'
    };
    return statusClasses[status?.toLowerCase() as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Bulk action handlers
  const handleClearSelection = () => {
    setSelectedQuotes([]);
  };

  const handleBulkMarkAsSent = () => {
    setIsMarkAsSentModalOpen(true);
  };

  const handleConfirmMarkAsSent = async () => {
    try {
      // Update all selected quotes
      await Promise.all(
        selectedQuotes.map(quoteId => updateQuote(quoteId, { status: "sent" }))
      );
      // Reload quotes
      const loadedQuotes = await getQuotes();
      setQuotes(Array.isArray(loadedQuotes) ? loadedQuotes : []);
      setSelectedQuotes([]);
      setIsMarkAsSentModalOpen(false);
    } catch (error) {
      console.error("Error marking quotes as sent:", error);
      alert("Failed to mark quotes as sent. Please try again.");
    }
  };

  const handleCancelMarkAsSent = () => {
    setIsMarkAsSentModalOpen(false);
  };

  // Advanced Search handlers
  const handleOpenAdvancedSearch = () => {
    setIsAdvancedSearchOpen(true);
  };

  const handleCloseAdvancedSearch = () => {
    setIsAdvancedSearchOpen(false);
  };

  const handleAdvancedSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdvancedSearchData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdvancedSearchSubmit = async () => {
    try {
      // Get fresh quotes from API
      let filtered = await getQuotes();
      if (!Array.isArray(filtered)) filtered = [];

      // Filter by quote number
      if (advancedSearchData.quoteNumber) {
        filtered = filtered.filter(q =>
          (q.quoteNumber || q.id || "").toLowerCase().includes(advancedSearchData.quoteNumber.toLowerCase())
        );
      }

      // Filter by reference number
      if (advancedSearchData.referenceNumber) {
        filtered = filtered.filter(q =>
          (q.referenceNumber || "").toLowerCase().includes(advancedSearchData.referenceNumber.toLowerCase())
        );
      }

      // Filter by customer name
      if (advancedSearchData.customerName) {
        filtered = filtered.filter(q =>
          (q.customerName || "").toLowerCase().includes(advancedSearchData.customerName.toLowerCase())
        );
      }

      // Filter by date range start
      if (advancedSearchData.dateRangeStart) {
        filtered = filtered.filter(q =>
          new Date(q.quoteDate) >= new Date(advancedSearchData.dateRangeStart)
        );
      }

      // Filter by date range end
      if (advancedSearchData.dateRangeEnd) {
        filtered = filtered.filter(q =>
          new Date(q.quoteDate) <= new Date(advancedSearchData.dateRangeEnd)
        );
      }

      // Filter by total range start
      if (advancedSearchData.totalRangeStart) {
        filtered = filtered.filter(q =>
          parseFloat(q.total || 0) >= parseFloat(advancedSearchData.totalRangeStart)
        );
      }

      // Filter by total range end
      if (advancedSearchData.totalRangeEnd) {
        filtered = filtered.filter(q =>
          parseFloat(q.total || 0) <= parseFloat(advancedSearchData.totalRangeEnd)
        );
      }

      // Filter by status/filter type
      if (advancedSearchData.filterType && advancedSearchData.filterType !== "All") {
        const filterStatus = advancedSearchData.filterType.toLowerCase().replace(/\s+/g, '_');
        filtered = filtered.filter(q => {
          const quoteStatus = (q.status || "draft").toLowerCase().replace(/\s+/g, '_');
          return quoteStatus === filterStatus;
        });
      }

      // Filter by item description
      if (advancedSearchData.itemDescription) {
        filtered = filtered.filter(q => {
          if (q.items && Array.isArray(q.items)) {
            return q.items.some(item =>
              (item.description || "").toLowerCase().includes(advancedSearchData.itemDescription.toLowerCase())
            );
          }
          return false;
        });
      }

      // Filter by project name
      if (advancedSearchData.projectName) {
        filtered = filtered.filter(q =>
          (q.projectName || "").toLowerCase().includes(advancedSearchData.projectName.toLowerCase())
        );
      }

      // Filter by salesperson
      if (advancedSearchData.salesperson) {
        filtered = filtered.filter(q =>
          (q.salesperson || "").toLowerCase().includes(advancedSearchData.salesperson.toLowerCase())
        );
      }

      setQuotes(filtered);
      setIsAdvancedSearchOpen(false);
    } catch (error) {
      console.error("Error in advanced search:", error);
      alert("Failed to perform search. Please try again.");
    }
  };

  const handleResetAdvancedSearch = async () => {
    setAdvancedSearchData({
      searchType: "Quotes",
      filterType: "All",
      quoteNumber: "",
      referenceNumber: "",
      dateRangeStart: "",
      dateRangeEnd: "",
      itemName: "",
      itemDescription: "",
      totalRangeStart: "",
      totalRangeEnd: "",
      customerName: "",
      projectName: "",
      salesperson: "",
      tax: "",
      addressType: "billingAndShipping",
      attention: "",
      addressLine: ""
    });
    // Reload all quotes
    try {
      const loadedQuotes = await getQuotes();
      setQuotes(Array.isArray(loadedQuotes) ? loadedQuotes : []);
    } catch (error) {
      console.error("Error reloading quotes:", error);
      setQuotes([]);
    }
  };

  // Search Type dropdown options
  const getSearchTypeOptions = () => [
    { value: "Customers", label: "Customers" },
    { value: "Items", label: "Items" },
    { value: "Inventory Adjustments", label: "Inventory Adjustments" },
    { value: "Banking", label: "Banking" },
    { value: "Quotes", label: "Quotes" },
    { value: "Invoices", label: "Invoices" },
    { value: "Sales Receipts", label: "Sales Receipts" },
    { value: "Payments Received", label: "Payments Received" },
    { value: "Recurring Invoices", label: "Recurring Invoices" },
    { value: "Credit Notes", label: "Credit Notes" },
    { value: "Vendors", label: "Vendors" },
    { value: "Expenses", label: "Expenses" },
    { value: "Recurring Expenses", label: "Recurring Expenses" },
    { value: "Bills", label: "Bills" },
    { value: "Payments Made", label: "Payments Made" },
    { value: "Recurring Bills", label: "Recurring Bills" },
    { value: "Vendor Credits", label: "Vendor Credits" },
    { value: "Projects", label: "Projects" },
    { value: "Timesheet", label: "Timesheet" },
    { value: "Journals", label: "Journals" },
    { value: "Chart of Accounts", label: "Chart of Accounts" },
    { value: "Documents", label: "Documents" },
    { value: "Tasks", label: "Tasks" }
  ];

  const getFilteredSearchTypeOptions = () => {
    const options = getSearchTypeOptions();
    if (!searchTypeSearch.trim()) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTypeSearch.toLowerCase())
    );
  };

  const handleSelectSearchType = (option: { value: string; label: string }) => {
    setAdvancedSearchData(prev => ({ ...prev, searchType: option.value }));
    setIsSearchTypeDropdownOpen(false);
    setSearchTypeSearch("");
  };

  // Get all quotes for the Quote# dropdown
  const getAllQuotesForDropdown = async () => {
    try {
      const allQuotes = await getQuotes();
      if (!Array.isArray(allQuotes)) return [];
      if (!advancedSearchData.quoteNumber.trim()) return allQuotes;
      return allQuotes.filter(q =>
        (q.quoteNumber || q.id || "").toLowerCase().includes(advancedSearchData.quoteNumber.toLowerCase())
      );
    } catch (error) {
      console.error("Error getting quotes for dropdown:", error);
      return [];
    }
  };

  const handleSelectQuoteNumber = (quote: Quote) => {
    setAdvancedSearchData(prev => ({ ...prev, quoteNumber: quote.quoteNumber || quote.id }));
    setIsQuoteNumberDropdownOpen(false);
  };

  // Filter Type dropdown options
  const getFilterTypeOptions = () => [
    { value: "All", label: "All" },
    { value: "Draft", label: "Draft" },
    { value: "Pending Approval", label: "Pending Approval" },
    { value: "Approved", label: "Approved" },
    { value: "Sent", label: "Sent" },
    { value: "Customer Viewed", label: "Customer Viewed" },
    { value: "Accepted", label: "Accepted" },
    { value: "Invoiced", label: "Invoiced" },
    { value: "Declined", label: "Declined" },
    { value: "Expired", label: "Expired" }
  ];

  const getFilteredFilterTypeOptions = () => {
    const options = getFilterTypeOptions();
    if (!filterTypeSearch.trim()) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(filterTypeSearch.toLowerCase())
    );
  };

  const handleSelectFilterType = (option: { value: string; label: string }) => {
    setAdvancedSearchData(prev => ({ ...prev, filterType: option.value }));
    setIsFilterTypeDropdownOpen(false);
    setFilterTypeSearch("");
  };

  // Get customers for dropdown
  const getFilteredCustomers = () => {
    if (!customerSearch.trim()) return customers;
    return customers.filter(c =>
      (c.name || "").toLowerCase().includes(customerSearch.toLowerCase())
    );
  };

  const handleSelectCustomer = (customer) => {
    setAdvancedSearchData(prev => ({ ...prev, customerName: customer.name }));
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");
  };

  // Get salespersons for dropdown
  const getFilteredSalespersons = () => {
    if (!salespersonSearch.trim()) return salespersons;
    return salespersons.filter(s =>
      (s.name || "").toLowerCase().includes(salespersonSearch.toLowerCase())
    );
  };

  const handleSelectSalesperson = (salesperson) => {
    setAdvancedSearchData(prev => ({ ...prev, salesperson: salesperson.name }));
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  // Get projects for dropdown
  const getFilteredProjects = () => {
    if (!projectSearch.trim()) return projects;
    return projects.filter(p =>
      (p.projectName || p.name || "").toLowerCase().includes(projectSearch.toLowerCase())
    );
  };

  const handleSelectProject = (project) => {
    setAdvancedSearchData(prev => ({ ...prev, projectName: project.projectName || project.name }));
    setIsProjectDropdownOpen(false);
    setProjectSearch("");
  };

  const handleBulkDelete = async () => {
    if (!selectedQuotes.length) {
      return;
    }
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setIsDeletingQuotes(true);
      await deleteQuotes(selectedQuotes);
      const loadedQuotes = await getQuotes();
      setQuotes(Array.isArray(loadedQuotes) ? loadedQuotes : []);
      setSelectedQuotes([]);
      setIsDeleteConfirmModalOpen(false);
    } catch (error) {
      console.error("Error deleting quotes:", error);
      alert("Failed to delete quotes. Please try again.");
    } finally {
      setIsDeletingQuotes(false);
    }
  };

  const handleCancelBulkDelete = () => {
    setIsDeleteConfirmModalOpen(false);
  };

  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
  };

  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField) {
      alert("Please select a field to update");
      return;
    }

    try {
      // Update all selected quotes with the new value
      await Promise.all(
        selectedQuotes.map(quoteId => {
          const updateData = { [bulkUpdateField]: bulkUpdateValue };
          return updateQuote(quoteId, updateData);
        })
      );

      // Reload quotes
      const loadedQuotes = await getQuotes();
      setQuotes(Array.isArray(loadedQuotes) ? loadedQuotes : []);

      // Reset and close modal
      setBulkUpdateField("");
      setBulkUpdateValue("");
      setIsBulkFieldDropdownOpen(false);
      setBulkFieldSearch("");
      setIsBulkUpdateModalOpen(false);
      setSelectedQuotes([]);
    } catch (error) {
      console.error("Error updating quotes:", error);
      alert("Failed to update quotes. Please try again.");
    }
  };

  const handleCancelBulkUpdate = () => {
    setBulkUpdateField("");
    setBulkUpdateValue("");
    setIsBulkFieldDropdownOpen(false);
    setBulkFieldSearch("");
    setIsBulkUpdateModalOpen(false);
    setSelectedBulkCustomer(null);
    setIsAddressModalOpen(false);
  };

  const getBulkUpdateFieldOptions = () => {
    return [
      { value: "paymentTerms", label: "Payment Terms" },
      { value: "billingAddress", label: "Billing Address" },
      { value: "shippingAddress", label: "Shipping Address" },
      { value: "billingAndShippingAddress", label: "Billing and Shipping Address" },
      { value: "pdfTemplate", label: "PDF Template" },
      { value: "referenceNumber", label: "Reference#" },
      { value: "quoteDate", label: "Quote Date" },
      { value: "expiryDate", label: "Expiry Date" },
      { value: "customerNotes", label: "Customer Notes" },
      { value: "termsAndConditions", label: "Terms & Conditions" }
    ];
  };

  const getFilteredBulkFieldOptions = () => {
    const options = getBulkUpdateFieldOptions();
    if (!bulkFieldSearch.trim()) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(bulkFieldSearch.toLowerCase())
    );
  };

  const handleSelectBulkField = (option) => {
    setBulkUpdateField(option.value);
    setBulkUpdateValue("");
    setIsBulkFieldDropdownOpen(false);
    setBulkFieldSearch("");
    setSelectedBulkCustomer(null);
    setIsAddressModalOpen(false);
  };

  const getSelectedFieldLabel = () => {
    const options = getBulkUpdateFieldOptions();
    const selected = options.find(opt => opt.value === bulkUpdateField);
    return selected ? selected.label : "Select a field";
  };

  const renderBulkUpdateValueInput = () => {
    switch (bulkUpdateField) {
      case "paymentTerms":
        return (
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372]"
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
          >
            <option value="">Select payment terms</option>
            <option value="due_on_receipt">Due on Receipt</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_45">Net 45</option>
            <option value="net_60">Net 60</option>
          </select>
        );
      case "pdfTemplate":
        return (
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372]"
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
          >
            <option value="">Select template</option>
            <option value="standard">Standard Template</option>
            <option value="professional">Professional Template</option>
            <option value="classic">Classic Template</option>
          </select>
        );
      case "quoteDate":
      case "expiryDate":
        return (
          <input
            type="date"
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372]"
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
          />
        );
      case "customerNotes":
      case "termsAndConditions":
        return (
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372] resize-none"
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
            rows={3}
            placeholder={bulkUpdateField === "customerNotes" ? "Enter customer notes" :
              bulkUpdateField === "termsAndConditions" ? "Enter terms & conditions" : ""}
          />
        );
      case "billingAddress":
      case "shippingAddress":
      case "billingAndShippingAddress":
        // Get customer name from first selected quote
        const firstSelectedQuote = quotes.find(q => selectedQuotes.includes(q.id));
        const getCustomerName = (q) => {
          if (!q) return '';
          if (q.customerName) return q.customerName;
          if (typeof q.customer === 'object' && q.customer) {
            return q.customer.displayName || q.customer.name || '';
          }
          return q.customer || '';
        };
        const customerName = getCustomerName(firstSelectedQuote);

        return (
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                QUOTES ADDRESS
              </div>
              {customerName && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-gray-900">Customer Name: </span>
                  <span className="text-sm text-gray-700">{customerName}</span>
                </div>
              )}
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                onClick={async () => {
                  if (customerName) {
                    const customers = await getCustomers();
                    const customer = customers.find(c => c.name === customerName);
                    if (customer) {
                      setSelectedBulkCustomer(customer);
                      setIsAddressModalOpen(true);
                    }
                  }
                }}
              >
                Choose existing address
              </button>
            </div>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372] resize-none"
              value={bulkUpdateValue}
              onChange={(e) => setBulkUpdateValue(e.target.value)}
              rows={3}
              placeholder="Enter address"
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-[#156372]"
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
            placeholder=""
          />
        );
    }
  };

  const handlePrint = () => {
    if (selectedQuotes.length === 0) {
      alert("Please select at least one quote to print");
      return;
    }
    setCurrentPreviewIndex(0);
    setIsPrintPreviewOpen(true);
  };

  const handlePrintFromPreview = () => {
    window.print();
  };

  const handleClosePrintPreview = () => {
    setIsPrintPreviewOpen(false);
    setCurrentPreviewIndex(0);
  };

  const handleNextQuote = () => {
    const selectedQuoteData = quotes.filter(q => selectedQuotes.includes(q.id));
    if (currentPreviewIndex < selectedQuoteData.length - 1) {
      setCurrentPreviewIndex(currentPreviewIndex + 1);
    }
  };

  const handlePreviousQuote = () => {
    if (currentPreviewIndex > 0) {
      setCurrentPreviewIndex(currentPreviewIndex - 1);
    }
  };

  const exportQuotesToPdf = async (quotesToExport: Quote[], fileName: string) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    for (let i = 0; i < quotesToExport.length; i++) {
      const quote = quotesToExport[i];
      const htmlContent = generateQuoteHTMLForQuote(quote);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '794px';
      tempDiv.style.background = '#ffffff';
      document.body.appendChild(tempDiv);

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: tempDiv.scrollWidth,
          height: tempDiv.scrollHeight,
          windowWidth: tempDiv.scrollWidth,
          windowHeight: tempDiv.scrollHeight
        });

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * printableWidth) / canvas.width;
        let heightLeft = imgHeight;
        let positionY = margin;

        pdf.addImage(imgData, 'PNG', margin, positionY, printableWidth, imgHeight);
        heightLeft -= printableHeight;

        while (heightLeft > 0.01) {
          pdf.addPage();
          positionY = margin - (imgHeight - heightLeft);
          pdf.addImage(imgData, 'PNG', margin, positionY, printableWidth, imgHeight);
          heightLeft -= printableHeight;
        }
      } finally {
        document.body.removeChild(tempDiv);
      }
    }

    pdf.save(fileName);
  };

  const downloadQuotesFallbackPdf = (quotesToExport: Quote[], fileName: string) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const generatedAt = new Date().toLocaleString();
    let y = 20;

    pdf.setFontSize(16);
    pdf.text("Quotes Export", 14, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.text(`Generated: ${generatedAt}`, 14, y);
    y += 6;
    pdf.text(`Total Quotes: ${quotesToExport.length}`, 14, y);
    y += 10;

    quotesToExport.forEach((quote, index) => {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      const quoteNumber = quote.quoteNumber || quote.id || "-";
      const customerName = quote.customerName || "-";
      const amount = formatAmount(quote.total || quote.amount || 0, quote.currency || "AED");
      const status = getStatusDisplay(quote.status || "draft");
      pdf.text(`${index + 1}. ${quoteNumber} | ${customerName} | ${amount} | ${status}`, 14, y);
      y += 7;
    });

    pdf.save(fileName);
  };

  const handleExportPDF = async () => {
    const selectedQuoteData = quotes.filter(q => selectedQuotes.includes(q.id));

    if (selectedQuoteData.length === 0) {
      alert("No quotes selected for export");
      return;
    }

    const fileName = selectedQuoteData.length === 1
      ? `${String(selectedQuoteData[0].quoteNumber || selectedQuoteData[0].id || "Quote").replace(/[\\/:*?"<>|]/g, "_")}.pdf`
      : `Quotes-Export-${new Date().toISOString().split('T')[0]}.pdf`;

    try {
      await exportQuotesToPdf(selectedQuoteData, fileName);
    } catch (error) {
      console.error('Error generating detailed PDF, using fallback PDF:', error);
      downloadQuotesFallbackPdf(selectedQuoteData, fileName);
    }
  };

  const handleDownloadCurrentQuote = async () => {
    const selectedQuoteData = quotes.filter(q => selectedQuotes.includes(q.id));
    const currentQuote = selectedQuoteData[currentPreviewIndex];
    if (!currentQuote) return;

    const quoteNumber = currentQuote.quoteNumber || currentQuote.id || "Quote";
    const safeQuoteNumber = String(quoteNumber).replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${safeQuoteNumber}.pdf`;

    try {
      await exportQuotesToPdf([currentQuote], fileName);
    } catch (error) {
      console.error('Error generating current quote PDF, using fallback PDF:', error);
      downloadQuotesFallbackPdf([currentQuote], fileName);
    }
  };

  const getOrganizationProfileForPdf = () => {
    const safeParse = (value: string | null) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const organizationProfile = typeof window !== "undefined"
      ? safeParse(localStorage.getItem("organization_profile"))
      : null;
    const orgProfile = typeof window !== "undefined"
      ? safeParse(localStorage.getItem("org_profile"))
      : null;
    const organization = typeof window !== "undefined"
      ? safeParse(localStorage.getItem("organization"))
      : null;
    const user = typeof window !== "undefined"
      ? safeParse(localStorage.getItem("user"))
      : null;

    const address = organizationProfile?.address || {};
    const name =
      organizationProfile?.name ||
      orgProfile?.organizationName ||
      organization?.name ||
      organization?.organizationName ||
      "";
    const email =
      organizationProfile?.email ||
      orgProfile?.email ||
      organization?.email ||
      user?.email ||
      "";
    const phone =
      organizationProfile?.phone ||
      orgProfile?.phone ||
      organization?.phone ||
      "";
    const street = [
      address?.street1,
      address?.street2,
      orgProfile?.street1,
      orgProfile?.street2
    ].filter(Boolean).join(" ").trim();
    const city = address?.city || orgProfile?.city || "";
    const state = address?.state || address?.stateProvince || orgProfile?.state || "";
    const country = address?.country || orgProfile?.country || orgProfile?.location || "";

    return { name, email, phone, street, city, state, country };
  };

  // Helper function to generate HTML for a single quote
  const generateQuoteHTMLForQuote = (quote: Quote) => {
    if (!quote) return '';

    const itemsHTML = quote.items && quote.items.length > 0 ? quote.items.map((item: any, index: number) => {
      const rate = parseFloat(item.rate || item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amount = parseFloat(item.amount || (item.quantity * (item.rate || item.price || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = parseFloat(item.quantity || 0).toFixed(2);
      const unit = item.unit || 'pcs';
      const itemName = item.name || item.itemName || item.itemDetails || 'N/A';
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-size: 14px; color: #111;">${index + 1}</td>
          <td style="padding: 12px; font-size: 14px; color: #111;">${itemName}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${qty} ${unit}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${formatCurrency(item.rate || item.price || 0, quote.currency)}</td>
          <td style="padding: 12px; font-size: 14px; color: #111; text-align: right;">${formatCurrency(item.amount || (item.quantity * (item.rate || item.price || 0)), quote.currency)}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="5" style="padding: 24px; text-align: center; color: #666; font-size: 14px;">No items added</td></tr>';

    const quoteDate = quote.quoteDate || quote.date || new Date().toISOString();
    const formattedDate = (() => {
      const date = new Date(quoteDate);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    })();
    const getCustomerName = (q) => {
      if (q.customerName) return q.customerName;
      if (typeof q.customer === 'object' && q.customer) {
        return q.customer.displayName || q.customer.name || 'N/A';
      }
      return q.customer || 'N/A';
    };
    const customerName = getCustomerName(quote);
    const total = formatCurrency(quote.total || quote.amount || 0, quote.currency || 'KES');
    const notes = quote.customerNotes || 'Looking forward for your business.';
    const profile = getOrganizationProfileForPdf();
    const organizationName = quote.organizationName || quote.companyName || quote.businessName || profile.name || 'Your Company';
    const organizationEmail = quote.organizationEmail || quote.companyEmail || quote.email || profile.email || '';
    const organizationStreet = quote.organizationStreet || quote.street || profile.street || '';
    const organizationCity = quote.organizationCity || quote.city || profile.city || '';
    const organizationState = quote.organizationState || quote.state || profile.state || '';
    const organizationCountry = quote.organizationCountry || quote.country || profile.country || '';
    const organizationPhone = quote.organizationPhone || quote.phone || profile.phone || '';
    const hasSentRibbon = (quote.status || '').toLowerCase() === 'sent';
    const subTotal = quote.subTotal || quote.subtotal || quote.total || quote.amount || 0;

    return `
      <div style="width:794px; min-height:1123px; background:#fff; color:#111; font-family:Arial, sans-serif; position:relative; padding:50px;">
        ${hasSentRibbon ? `
        <div style="position:absolute; top:20px; left:-40px; transform:rotate(-45deg); background:#2563eb; color:#fff; font-size:11px; font-weight:700; padding:6px 50px;">
          SENT
        </div>
        ` : ''}
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:34px;">
          <div style="max-width:55%;">
            <div style="font-size:34px; font-weight:700; color:#111; margin-bottom:6px;">${organizationName}</div>
            ${organizationStreet ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationStreet}</div>` : ''}
            ${(organizationCity || organizationState) ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationCity}${organizationCity && organizationState ? ', ' : ''}${organizationState}</div>` : ''}
            ${organizationCountry ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationCountry}</div>` : ''}
            ${organizationPhone ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationPhone}</div>` : ''}
            ${organizationEmail ? `<div style="font-size:14px; color:#475569; line-height:1.45;">${organizationEmail}</div>` : ''}
          </div>
          <div style="text-align:right; min-width:210px;">
            <div style="font-size:52px; font-weight:800; letter-spacing:0.5px; line-height:1;">QUOTE</div>
            <div style="font-size:22px; color:#111; font-weight:700; margin-top:8px;">#${quote.quoteNumber || quote.id}</div>
            <div style="font-size:14px; color:#475569; margin-top:38px;">${formattedDate}</div>
          </div>
        </div>

        <div style="margin-bottom:26px;">
          <div style="font-size:14px; font-weight:700; color:#111; margin-bottom:6px;">Bill To</div>
          <div style="font-size:28px; color:#2563eb; font-weight:600;">${customerName}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
          <thead>
            <tr>
              <th style="padding:12px; text-align:left; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">#</th>
              <th style="padding:12px; text-align:left; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Item & Description</th>
              <th style="padding:12px; text-align:right; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Qty</th>
              <th style="padding:12px; text-align:right; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Rate</th>
              <th style="padding:12px; text-align:right; color:#fff; font-size:12px; font-weight:700; background-color:#475569;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div style="width:320px; margin-left:auto; margin-bottom:34px;">
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#475569;">
            <span>Sub Total</span>
            <span style="font-weight:600; color:#111;">${formatCurrency(subTotal, quote.currency)}</span>
          </div>
          ${quote.discount > 0 ? `
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#475569;">
            <span>Discount</span>
            <span style="font-weight:600; color:#111;">-${formatCurrency(quote.discount || 0, quote.currency)}</span>
          </div>
          ` : ''}
          ${quote.taxAmount > 0 ? `
          <div style="display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#475569;">
            <span>${quote.taxName || "Tax"}</span>
            <span style="font-weight:600; color:#111;">${formatCurrency(quote.taxAmount || 0, quote.currency)}</span>
          </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; padding:12px 0; border-top:2px solid #111; margin-top:8px; font-size:26px; font-weight:700; color:#111;">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>

        <div>
          <div style="font-size:14px; font-weight:700; color:#111; margin-bottom:6px;">Notes</div>
          <div style="font-size:14px; color:#475569; line-height:1.6;">${notes}</div>
        </div>
      </div>
    `;
  };

  const handleViewSelect = (view) => {
    setSelectedView(view);
    setIsDropdownOpen(false);
  };

  const handleCreateNewQuote = () => {
    navigate("/sales/quotes/new");
  };

  const handleImportQuotes = () => {
    setIsImportModalOpen(true);
  };

  const handleCreateCustomView = () => {
    setIsDropdownOpen(false);
    navigate("/sales/quotes/custom-view/new");
  };

  // Compute selected quotes data for print preview
  const selectedQuoteData = quotes.filter(q => selectedQuotes.includes(q.id));
  const currentQuote = isPrintPreviewOpen && selectedQuoteData.length > 0
    ? selectedQuoteData[currentPreviewIndex]
    : null;

  // Helper function for formatting dates in preview
  const formatPreviewDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Header - Show Bulk Actions Bar when items are selected, otherwise show normal header */}
      {selectedQuotes.length > 0 ? (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex items-center gap-1.5 py-2 px-4 bg-gradient-to-r from-[#156372] to-[#0D4A52] rounded-md text-sm font-medium text-white cursor-pointer transition-all hover:opacity-90 shadow-sm"
              onClick={handleBulkUpdate}
            >
              Bulk Update
            </button>
            <button
              className="flex items-center gap-1.5 py-2 px-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300"
              onClick={handleExportPDF}
              title="Download PDF"
            >
              <FileDown size={16} />
            </button>
            <button
              className="flex items-center gap-1.5 py-2 px-4 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300"
              onClick={handleBulkMarkAsSent}
            >
              Mark As Sent
            </button>
            <button
              className="flex items-center gap-1.5 py-2 px-4 bg-white border border-red-300 rounded-md text-sm font-medium text-red-600 cursor-pointer transition-all hover:bg-red-50 hover:border-red-300"
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] rounded text-[13px] font-semibold text-white">{selectedQuotes.length}</span>
            <span className="text-sm text-gray-700">Selected</span>
            <button
              className="flex items-center gap-1 py-1.5 px-3 bg-transparent border-none text-sm text-red-500 cursor-pointer transition-colors hover:text-red-600"
              onClick={handleClearSelection}
            >
              Esc <X size={14} className="text-red-500" />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Page Header */
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white gap-4">
          {/* Title with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 ${isDropdownOpen ? "border-[#156372]" : ""}`}
            >
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate max-w-[200px] md:max-w-none">
                {selectedView}
              </h1>
              {isDropdownOpen ? (
                <ChevronUp size={20} className="text-gray-600" />
              ) : (
                <ChevronDown size={20} className="text-gray-600" />
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-[100] min-w-[280px] md:min-w-[300px] flex flex-col max-h-[400px] md:max-h-[500px] overflow-hidden">
                {/* Search Bar */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                  <Search size={16} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search views..."
                    value={viewSearchQuery}
                    onChange={(e) => setViewSearchQuery(e.target.value)}
                    className="flex-1 text-sm bg-transparent focus:outline-none"
                  />
                </div>

                {/* View Options Scroll Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                  {/* System Views */}
                  <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                    System Views
                  </div>
                  {filteredDefaultViews.map((view) => (
                    <div
                      key={view}
                      onClick={() => {
                        setSelectedView(view);
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span>{view}</span>
                      {selectedView === view && (
                        <Check size={16} className="text-[#156372]" />
                      )}
                    </div>
                  ))}

                  {/* Custom Views */}
                  {filteredCustomViews.length > 0 && (
                    <>
                      <div className="px-3 pb-2 pt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                        Custom Views
                      </div>
                      {filteredCustomViews.map((view) => (
                        <div
                          key={view.id}
                          className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                          onClick={() => {
                            setSelectedView(view.viewName);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <span>{view.viewName}</span>
                          {selectedView === view.viewName && (
                            <Check size={16} className="text-[#156372]" />
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90 shadow-md"
              onClick={() => navigate("/sales/quotes/new")}
            >
              <Plus size={16} strokeWidth={3} />
              New Quote
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button
                className="flex items-center justify-center w-9 h-9 bg-gray-50 border border-gray-200 rounded-md cursor-pointer text-gray-500 transition-colors hover:bg-gray-100"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                <MoreVertical size={18} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-[1000] overflow-visible">
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <ArrowUpDown size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Sort by</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Sort by Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "createdTime" ? "!bg-[#156372] !text-white" : "hover:bg-[#156372] hover:text-white"}`}
                        onClick={() => {
                          handleSort("createdTime");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Created Time
                        {sortConfig.key === "createdTime" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "lastModifiedTime" ? "!bg-[#156372] !text-white" : "hover:bg-[#156372] hover:text-white"}`}
                        onClick={() => {
                          handleSort("lastModifiedTime");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Last Modified Time
                        {sortConfig.key === "lastModifiedTime" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "date" ? "!bg-[#156372] !text-white" : "hover:bg-[#156372] hover:text-white"}`}
                        onClick={() => {
                          handleSort("date");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Date
                        {sortConfig.key === "date" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "quoteNumber" ? "!bg-[#156372] !text-white" : "hover:bg-[#156372] hover:text-white"}`}
                        onClick={() => {
                          handleSort("quoteNumber");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Quote Number
                        {sortConfig.key === "quoteNumber" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "customerName" ? "!bg-[#156372] !text-white" : "hover:bg-[#156372] hover:text-white"}`}
                        onClick={() => {
                          handleSort("customerName");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Customer Name
                        {sortConfig.key === "customerName" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between py-2.5 px-3.5 mx-2 text-sm text-gray-700 cursor-pointer transition-all bg-white rounded-md ${sortConfig.key === "amount" ? "!bg-[#156372] !text-white" : "hover:bg-[#156372] hover:text-white"}`}
                        onClick={() => {
                          handleSort("amount");
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Amount
                        {sortConfig.key === "amount" && (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={14} className="text-white" /> :
                            <ChevronDown size={14} className="text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <Download size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Import</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Import Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={() => {
                          handleImportQuotes();
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Import Quotes
                      </div>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-all text-sm text-gray-700 group hover:bg-[#156372] hover:text-white">
                    <Upload size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Export</span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-white" />

                    {/* Export Submenu */}
                    <div className="absolute top-0 right-full mr-1.5 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[99999] pointer-events-none opacity-0 translate-x-2.5 transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0">
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={() => {
                          handleExportPDF();
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        Export Quotes
                      </div>
                      <div
                        className="flex items-center py-2.5 px-4 text-sm text-gray-700 cursor-pointer transition-all whitespace-nowrap hover:bg-[#156372] hover:text-white"
                        onClick={handleExportCurrentView}
                      >
                        Export Current View
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white group"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      navigate("/settings/quotes");
                    }}
                  >
                    <Settings size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Preferences</span>
                  </div>
                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white group"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      navigate("/settings/quotes");
                    }}
                  >
                    <Database size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Manage Custom Fields</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white group ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!isRefreshing) {
                        refreshData();
                        setIsMoreMenuOpen(false);
                      }
                    }}
                  >
                    <RefreshCw size={16} className={`text-[#156372] flex-shrink-0 ${isRefreshing ? "animate-spin" : ""} group-hover:text-white`} />
                    <span className="flex-1">Refresh List</span>
                  </div>
                  <div
                    className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors text-sm text-gray-700 hover:bg-[#156372] hover:text-white group"
                    onClick={() => {
                      // Reset column widths - this would typically reset localStorage column width settings
                      alert("Column widths reset to default");
                      setIsMoreMenuOpen(false);
                    }}
                  >
                    <RefreshCw size={16} className="text-[#156372] flex-shrink-0 group-hover:text-white" />
                    <span className="flex-1">Reset Column Width</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">

        {quotes.length > 0 || quotesLoading ? (
          /* Quotes List View */
          <div className="w-full">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {sortedQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors hover:shadow-md ${selectedQuotes.includes(quote.id) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => navigate(`/sales/quotes/${quote.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedQuotes.includes(quote.id)}
                        onChange={() => handleSelectQuote(quote.id)}
                        className="w-4 h-4 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <div className="font-medium text-[#156372]">{quote.quoteNumber}</div>
                        <div className="text-sm text-gray-600">{formatDate(quote.date || quote.quoteDate)}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(quote.status)}`}>
                      {getStatusDisplay(quote.status)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Customer:</span>
                      <span className="text-gray-900">{quote.customerName || (typeof quote.customer === 'object' && quote.customer ? (quote.customer.displayName || quote.customer.name || 'Unknown Customer') : (typeof quote.customer === 'string' ? quote.customer : ''))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reference:</span>
                      <span className="text-gray-900">{quote.referenceNumber || "-"}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600">Amount:</span>
                      <span className="text-gray-900">{formatAmount(quote.total || quote.amount, quote.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-lg">
              <div className="overflow-x-auto min-h-[450px]">
                <table className="w-full border-collapse text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-left w-16 relative">
                        <div className="flex items-center gap-2">
                          <div className="relative" ref={headerMenuRef}>
                            <SlidersHorizontal
                              size={14}
                              className="text-blue-600 cursor-pointer hover:text-blue-700"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHeaderMenuPosition({ top: rect.bottom + 8, left: rect.left });
                                setIsHeaderMenuOpen(!isHeaderMenuOpen);
                              }}
                            />
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedQuotes.length === sortedQuotes.length && sortedQuotes.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </th>
                      {allColumnOptions.filter(col => visibleColumns.includes(col.key)).map((col, idx) => (
                        <th
                          key={col.key}
                          style={{ width: columnWidths[col.key] }}
                          className={`py-3 px-4 text-${col.key === 'amount' ? 'right' : 'left'} font-medium text-gray-600 text-xs uppercase tracking-wider relative group whitespace-nowrap`}
                        >
                          {col.label}
                          {/* Resizer handle */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-gray-300 transition-colors"
                            onMouseDown={(e) => {
                              setResizingColumn(col.key);
                              const startX = e.pageX;
                              const startWidth = columnWidths[col.key];

                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
                                setColumnWidths(prev => ({ ...prev, [col.key]: newWidth }));
                              };

                              const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                                setResizingColumn(null);
                              };

                              document.addEventListener('mousemove', onMouseMove);
                              document.addEventListener('mouseup', onMouseUp);
                            }}
                          ></div>
                        </th>
                      ))}
                      <th className="py-3 px-4 text-left w-12">
                        <button
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                          onClick={handleOpenAdvancedSearch}
                          title="Advanced Search"
                        >
                          <Search size={16} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isRefreshing || quotesLoading ? (
                      Array(5).fill(0).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="border-b border-gray-200">
                          <td className="py-3 px-4">
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          {visibleColumns.map(colKey => (
                            <td key={colKey} className="py-3 px-4">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                            </td>
                          ))}
                          <td className="py-3 px-4"></td>
                        </tr>
                      ))
                    ) : (
                      sortedQuotes.length === 0 ? (
                        <tr>
                          <td colSpan={visibleColumns.length + 2} className="py-8 text-center text-gray-500">
                            No quotes found
                          </td>
                        </tr>
                      ) : (
                        sortedQuotes.map((quote) => (
                          <tr
                            key={quote.id}
                            className={`border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50 ${selectedQuotes.includes(quote.id) ? 'bg-gray-100' : ''}`}
                            onClick={() => navigate(`/sales/quotes/${quote.id}`)}
                          >
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedQuotes.includes(quote.id)}
                                onChange={() => handleSelectQuote(quote.id)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            {allColumnOptions.filter(col => visibleColumns.includes(col.key)).map(col => (
                              <td key={`${quote.id}-${col.key}`} className={`py-3 px-4 text-gray-900 ${col.key === 'amount' ? 'text-right font-medium' : ''}`}>
                                <div className="truncate">
                                  {col.key === 'date' ? formatDate(quote.date || quote.quoteDate) :
                                    col.key === 'quoteNumber' ? (
                                      <span className="text-[#156372] font-medium hover:underline">
                                        {quote.quoteNumber}
                                      </span>
                                    ) :
                                      col.key === 'status' ? (
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusClass(quote.status)}`}>
                                          {getStatusDisplay(quote.status)}
                                        </span>
                                      ) :
                                        col.key === 'amount' ? formatAmount(quote.total || quote.amount, quote.currency) :
                                          col.key === 'customerName' ? (quote.customerName || (typeof quote.customer === 'object' && quote.customer ? (quote.customer.displayName || quote.customer.name || 'Unknown Customer') : (typeof quote.customer === 'string' ? quote.customer : ''))) :
                                            quote[col.key] || "-"}
                                </div>
                              </td>
                            ))}
                            <td className="py-3 px-4"></td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first quote.</p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
              onClick={() => navigate("/sales/quotes/new")}
            >
              <Plus size={16} />
              Create Quote
            </button>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Quotes</h3>
              <p className="text-gray-600 mb-6">Choose the format you want to import your quotes from.</p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    navigate("/sales/quotes/import");
                  }}
                  className="w-full px-4 py-3 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Import from File
                </button>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark As Sent Confirmation Modal */}
      {
        isMarkAsSentModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={handleCancelMarkAsSent}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center shadow-lg">
                    <Send size={32} className="text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 text-center">Mark Quotes as Sent</h3>
                <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
                  Are you sure you want to mark {selectedQuotes.length} quote(s) as sent? This will change their status to "Sent".
                </p>
                <p className="text-xs sm:text-sm text-gray-500 text-center mb-6">
                  The Quote(s) that are marked as sent will be displayed in the respective contacts' Customer Portal (if enabled).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleCancelMarkAsSent}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMarkAsSent}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#156372] text-white rounded-md text-sm font-medium hover:opacity-90 transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                >
                  Mark as Sent
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={handleCancelBulkDelete}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center shadow-lg">
                  <Trash2 size={32} className="text-red-600" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 text-center">Delete Quotes</h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
                Are you sure you want to delete {selectedQuotes.length} quote(s)? This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCancelBulkDelete}
                disabled={isDeletingQuotes}
                className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                disabled={isDeletingQuotes}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeletingQuotes ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search Modal */}
      {
        isAdvancedSearchOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
            onClick={handleCloseAdvancedSearch}
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
                        className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen);
                        }}
                      >
                        <span>Quotes</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isSearchTypeDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="py-2.5 px-3.5 text-sm cursor-pointer transition-colors bg-[#156372] text-white hover:bg-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSearchTypeDropdownOpen(false);
                            }}
                          >
                            Quotes
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Filter</label>
                    <div className="relative" ref={filterTypeDropdownRef}>
                      <div
                        className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterTypeDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                        onClick={() => setIsFilterTypeDropdownOpen(!isFilterTypeDropdownOpen)}
                      >
                        <span>{selectedView}</span>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterTypeDropdownOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isFilterTypeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                          {defaultQuoteViews.map((view) => (
                            <div
                              key={view}
                              className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                              onClick={() => {
                                setSelectedView(view);
                                setIsFilterTypeDropdownOpen(false);
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
                  onClick={handleCloseAdvancedSearch}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Criteria Body */}
              <div className="p-6">
                {searchType === "Quotes" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Quote# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Quote#</label>
                        <input
                          type="text"
                          value={advancedSearchData.quoteNumber}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={advancedSearchData.dateRangeFrom}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={advancedSearchData.dateRangeTo}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={advancedSearchData.itemDescriptionQuote}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, itemDescriptionQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                          >
                            <span className={advancedSearchData.customerName ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.customerName || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                          >
                            <span className={advancedSearchData.salesperson ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.salesperson || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing and Shipping"
                              checked={advancedSearchData.addressType === "Billing and Shipping"}
                              onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Billing"
                              checked={advancedSearchData.addressType === "Billing"}
                              onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressType"
                              value="Shipping"
                              checked={advancedSearchData.addressType === "Shipping"}
                              onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressType: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-[#156372] text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Reference# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference#</label>
                        <input
                          type="text"
                          value={advancedSearchData.referenceNumberQuote}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, referenceNumberQuote: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameDropdownOpen(!isItemNameDropdownOpen)}
                          >
                            <span className={advancedSearchData.itemNameQuote ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.itemNameQuote || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={advancedSearchData.totalRangeFromQuote}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, totalRangeFromQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={advancedSearchData.totalRangeToQuote}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, totalRangeToQuote: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                          >
                            <span className={advancedSearchData.projectName ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.projectName || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsDropdownOpen(!isTaxExemptionsDropdownOpen)}
                          >
                            <span className={advancedSearchData.taxExemptions ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.taxExemptions || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Customers" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                        <input
                          type="text"
                          value={advancedSearchData.displayName}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={advancedSearchData.companyName}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={advancedSearchData.lastName}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={advancedSearchData.status}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="All">All</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <input
                          type="text"
                          value={advancedSearchData.address}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Customer Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Type</label>
                        <select
                          value={advancedSearchData.customerType}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, customerType: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">Select</option>
                          <option value="Business">Business</option>
                          <option value="Individual">Individual</option>
                        </select>
                      </div>

                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={advancedSearchData.firstName}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                          type="email"
                          value={advancedSearchData.email}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                        <input
                          type="tel"
                          value={advancedSearchData.phone}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={advancedSearchData.notes}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {searchType === "Invoices" && (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Invoice# */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice#</label>
                        <input
                          type="text"
                          value={advancedSearchData.invoiceNumber}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={advancedSearchData.dateRangeFrom}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, dateRangeFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={advancedSearchData.dateRangeTo}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, dateRangeTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <div className="relative" ref={statusInvoiceDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isStatusInvoiceDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsStatusInvoiceDropdownOpen(!isStatusInvoiceDropdownOpen)}
                          >
                            <span className={advancedSearchData.status ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.status || "Select"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isStatusInvoiceDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isStatusInvoiceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              {["All", "Draft", "Sent", "Paid", "Overdue", "Unpaid"].map((status) => (
                                <div
                                  key={status}
                                  className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                                  onClick={() => {
                                    setAdvancedSearchData(prev => ({ ...prev, status }));
                                    setIsStatusInvoiceDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description</label>
                        <input
                          type="text"
                          value={advancedSearchData.itemDescriptionInvoice}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, itemDescriptionInvoice: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Total Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Range</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={advancedSearchData.totalRangeFromInvoice}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, totalRangeFromInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            value={advancedSearchData.totalRangeToInvoice}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, totalRangeToInvoice: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Project Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                        <div className="relative" ref={projectNameInvoiceDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isProjectNameInvoiceDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsProjectNameInvoiceDropdownOpen(!isProjectNameInvoiceDropdownOpen)}
                          >
                            <span className={advancedSearchData.projectNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.projectNameInvoice || "Select a project"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isProjectNameInvoiceDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isProjectNameInvoiceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tax Exemptions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Exemptions</label>
                        <div className="relative" ref={taxExemptionsInvoiceDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isTaxExemptionsInvoiceDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsTaxExemptionsInvoiceDropdownOpen(!isTaxExemptionsInvoiceDropdownOpen)}
                          >
                            <span className={advancedSearchData.taxExemptionsInvoice ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.taxExemptionsInvoice || "Select a Tax Exemption"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isTaxExemptionsInvoiceDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isTaxExemptionsInvoiceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Order Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Number</label>
                        <input
                          type="text"
                          value={advancedSearchData.orderNumber}
                          onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, orderNumber: e.target.value }))}
                          className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      {/* Created Between */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Created Between</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={advancedSearchData.createdBetweenFrom}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, createdBetweenFrom: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="text"
                            placeholder="dd/MM/yyyy"
                            value={advancedSearchData.createdBetweenTo}
                            onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, createdBetweenTo: e.target.value }))}
                            className="flex-1 py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                        <div className="relative" ref={itemNameInvoiceDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isItemNameInvoiceDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsItemNameInvoiceDropdownOpen(!isItemNameInvoiceDropdownOpen)}
                          >
                            <span className={advancedSearchData.itemNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.itemNameInvoice || "Select an item"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isItemNameInvoiceDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isItemNameInvoiceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Account</label>
                        <div className="relative" ref={accountDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isAccountDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                          >
                            <span className={advancedSearchData.account ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.account || "Select an account"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                        <div className="relative" ref={customerNameInvoiceDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isCustomerNameInvoiceDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsCustomerNameInvoiceDropdownOpen(!isCustomerNameInvoiceDropdownOpen)}
                          >
                            <span className={advancedSearchData.customerNameInvoice ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.customerNameInvoice || "Select customer"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerNameInvoiceDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isCustomerNameInvoiceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Salesperson */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Salesperson</label>
                        <div className="relative" ref={salespersonInvoiceDropdownRef}>
                          <div
                            className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSalespersonInvoiceDropdownOpen ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            onClick={() => setIsSalespersonInvoiceDropdownOpen(!isSalespersonInvoiceDropdownOpen)}
                          >
                            <span className={advancedSearchData.salespersonInvoice ? "text-gray-700" : "text-gray-400"}>
                              {advancedSearchData.salespersonInvoice || "Select a salesperson"}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSalespersonInvoiceDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {isSalespersonInvoiceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-600 border-t-0 rounded-b-md shadow-lg z-[1002]">
                              <div className="py-2.5 px-3.5 text-sm text-gray-500">No options available</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <div className="flex items-center gap-3 mb-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing and Shipping"
                              checked={advancedSearchData.addressTypeInvoice === "Billing and Shipping"}
                              onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing and Shipping</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Billing"
                              checked={advancedSearchData.addressTypeInvoice === "Billing"}
                              onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Billing</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="addressTypeInvoice"
                              value="Shipping"
                              checked={advancedSearchData.addressTypeInvoice === "Shipping"}
                              onChange={(e) => setAdvancedSearchData(prev => ({ ...prev, addressTypeInvoice: e.target.value }))}
                              className="cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Shipping</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <div
                              className={`flex items-center justify-between w-full py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${false ? "border-blue-600" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <span className="text-gray-400">Attention</span>
                              <ChevronDown size={16} className="text-gray-500" />
                            </div>
                          </div>
                          <button className="text-[#156372] text-sm hover:underline">+ Address Line</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleCloseAdvancedSearch}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement search functionality
                      console.log("Search with:", searchType, advancedSearchData);
                      setIsAdvancedSearchOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
      }

      {/* Bulk Update Modal */}
      {
        isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={handleCancelBulkUpdate}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Bulk Update Quotes</h2>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={handleCancelBulkUpdate}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Choose a field from the dropdown and update with new information.
                </p>

                <div className="flex flex-col gap-4 mb-6">
                  {/* Custom Field Dropdown */}
                  <div className="relative w-full" ref={bulkFieldDropdownRef}>
                    <div
                      className={`flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50 ${isBulkFieldDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsBulkFieldDropdownOpen(!isBulkFieldDropdownOpen)}
                    >
                      <span className={bulkUpdateField ? '' : 'placeholder'}>
                        {getSelectedFieldLabel()}
                      </span>
                      {isBulkFieldDropdownOpen ? (
                        <ChevronUp size={18} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-500" />
                      )}
                    </div>

                    {isBulkFieldDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                          <Search size={16} />
                          <input
                            type="text"
                            placeholder="Search"
                            value={bulkFieldSearch}
                            onChange={(e) => setBulkFieldSearch(e.target.value)}
                            className="flex-1 border-none outline-none text-sm text-gray-700"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredBulkFieldOptions().map(option => (
                            <div
                              key={option.value}
                              className={`px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 ${bulkUpdateField === option.value ? 'selected' : ''}`}
                              onClick={() => handleSelectBulkField(option)}
                            >
                              {option.label}
                            </div>
                          ))}
                          {getFilteredBulkFieldOptions().length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              No fields found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {renderBulkUpdateValueInput()}
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  <strong>Note:</strong> All the selected quotes will be updated with the new information and you cannot undo this action.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium bg-[#156372] text-white hover:bg-blue-700 cursor-pointer"
                  onClick={handleBulkUpdateSubmit}
                >
                  Update
                </button>
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                  onClick={handleCancelBulkUpdate}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Address Selection Modal */}
      {isAddressModalOpen && selectedBulkCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center" onClick={() => setIsAddressModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Choose Address</h2>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={() => setIsAddressModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <span className="text-sm font-semibold text-gray-900">Customer Name: </span>
                <span className="text-sm text-gray-700">{selectedBulkCustomer.name}</span>
              </div>
              <div className="space-y-3">
                {bulkUpdateField === "billingAddress" || bulkUpdateField === "billingAndShippingAddress" ? (
                  <div className="border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      const address = selectedBulkCustomer.billingAddress ||
                        `${selectedBulkCustomer.billingStreet1 || ""} ${selectedBulkCustomer.billingStreet2 || ""} ${selectedBulkCustomer.billingCity || ""} ${selectedBulkCustomer.billingState || ""} ${selectedBulkCustomer.billingZipCode || ""}`.trim();
                      setBulkUpdateValue(address);
                      setIsAddressModalOpen(false);
                    }}
                  >
                    <div className="text-sm font-semibold text-gray-900 mb-1">Billing Address</div>
                    <div className="text-sm text-gray-600">
                      {selectedBulkCustomer.billingAddress ||
                        `${selectedBulkCustomer.billingStreet1 || ""} ${selectedBulkCustomer.billingStreet2 || ""} ${selectedBulkCustomer.billingCity || ""} ${selectedBulkCustomer.billingState || ""} ${selectedBulkCustomer.billingZipCode || ""}`.trim() || "No billing address"}
                    </div>
                  </div>
                ) : null}
                {bulkUpdateField === "shippingAddress" || bulkUpdateField === "billingAndShippingAddress" ? (
                  <div className="border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      const address = selectedBulkCustomer.shippingAddress ||
                        `${selectedBulkCustomer.shippingStreet1 || ""} ${selectedBulkCustomer.shippingStreet2 || ""} ${selectedBulkCustomer.shippingCity || ""} ${selectedBulkCustomer.shippingState || ""} ${selectedBulkCustomer.shippingZipCode || ""}`.trim();
                      setBulkUpdateValue(address);
                      setIsAddressModalOpen(false);
                    }}
                  >
                    <div className="text-sm font-semibold text-gray-900 mb-1">Shipping Address</div>
                    <div className="text-sm text-gray-600">
                      {selectedBulkCustomer.shippingAddress ||
                        `${selectedBulkCustomer.shippingStreet1 || ""} ${selectedBulkCustomer.shippingStreet2 || ""} ${selectedBulkCustomer.shippingCity || ""} ${selectedBulkCustomer.shippingState || ""} ${selectedBulkCustomer.shippingZipCode || ""}`.trim() || "No shipping address"}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                onClick={() => setIsAddressModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {
        isPrintPreviewOpen && currentQuote && (
          <div className="fixed inset-0 bg-gray-900 z-[9999] flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <span className="text-white font-medium">Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
                  onClick={handlePrintFromPreview}
                >
                  Print
                </button>
                <button
                  className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-gray-600"
                  onClick={handleClosePrintPreview}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document Viewer Toolbar */}
            <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:text-white cursor-pointer">
                  <MoreVertical size={16} />
                </button>
                <span className="text-gray-400 text-sm">estimates</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <button
                    className="p-1 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handlePreviousQuote}
                    disabled={currentPreviewIndex === 0}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>{currentPreviewIndex + 1} / {selectedQuoteData.length}</span>
                  <button
                    className="p-1 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleNextQuote}
                    disabled={currentPreviewIndex === selectedQuoteData.length - 1}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <button className="p-2 hover:text-white cursor-pointer">
                    <Minus size={16} />
                  </button>
                  <span className="text-sm">45%</span>
                  <button className="p-2 hover:text-white cursor-pointer">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white cursor-pointer" title="Download PDF" onClick={handleDownloadCurrentQuote}>
                    <Download size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white cursor-pointer" title="Rotate">
                    <RefreshCw size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white cursor-pointer" title="Print" onClick={handlePrintFromPreview}>
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex items-center justify-center">
              <div className="max-w-4xl w-full bg-white shadow-2xl" style={{ minHeight: "842px", padding: "40px", position: "relative" }}>
                {/* Sent Ribbon */}
                {currentQuote.status === 'sent' && (
                  <div style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "200px",
                    height: "200px",
                    overflow: "hidden",
                    zIndex: 10
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "40px",
                      left: "-60px",
                      width: "200px",
                      height: "30px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600",
                      transform: "rotate(-45deg)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}>
                      SENT
                    </div>
                  </div>
                )}

                {/* Header with Logo and Company Info */}
                <div className="flex items-start justify-between mb-8" style={{ position: "relative" }}>
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div style={{
                      width: "80px",
                      height: "80px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "48px"
                    }}>
                      ðŸ“–â˜€ï¸âœï¸
                    </div>
                    {/* Company Details */}
                    <div>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#111", marginBottom: "4px" }}>
                        TABAN ENTERPRISES
                      </div>
                      <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
                        taleex<br />
                        taleex<br />
                        mogadishu Nairobi 22223<br />
                        Kenya<br />
                        jirdehusseinkhalif@gmail.com
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div style={{ fontSize: "32px", fontWeight: "700", color: "#111", marginBottom: "8px" }}>
                      QUOTE
                    </div>
                    <div style={{ fontSize: "16px", color: "#666", fontWeight: "500" }}>
                      #{currentQuote.quoteNumber || currentQuote.id}
                    </div>
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    {formatPreviewDate(currentQuote.quoteDate || currentQuote.date)}
                  </div>
                </div>

                {/* Bill To Section */}
                <div className="mb-8">
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111", marginBottom: "8px" }}>
                    Bill To
                  </div>
                  <div style={{ fontSize: "16px", color: "#2563eb", fontWeight: "500" }}>
                    {currentQuote.customerName || currentQuote.customer?.displayName || currentQuote.customer?.companyName || (typeof currentQuote.customer === 'string' ? currentQuote.customer : "N/A")}
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#4b5563" }}>
                        <th style={{ padding: "12px", textAlign: "left", color: "white", fontSize: "12px", fontWeight: "600" }}>#</th>
                        <th style={{ padding: "12px", textAlign: "left", color: "white", fontSize: "12px", fontWeight: "600" }}>Item & Description</th>
                        <th style={{ padding: "12px", textAlign: "right", color: "white", fontSize: "12px", fontWeight: "600" }}>Qty</th>
                        <th style={{ padding: "12px", textAlign: "right", color: "white", fontSize: "12px", fontWeight: "600" }}>Rate</th>
                        <th style={{ padding: "12px", textAlign: "right", color: "white", fontSize: "12px", fontWeight: "600" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuote.items && currentQuote.items.length > 0 ? (
                        currentQuote.items.map((item, index) => (
                          <tr key={item.id || index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#111" }}>{index + 1}</td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#111" }}>
                              {item.name || item.itemName || "N/A"}
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#111", textAlign: "right" }}>
                              {item.quantity || 0} {item.unit || "pcs"}
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#111", textAlign: "right" }}>
                              {formatAmount(item.rate || item.price || 0, currentQuote.currency)}
                            </td>
                            <td style={{ padding: "12px", fontSize: "14px", color: "#111", textAlign: "right" }}>
                              {formatAmount(item.amount || (item.quantity * (item.rate || item.price || 0)), currentQuote.currency)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#666", fontSize: "14px" }}>
                            No items added
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mb-8">
                  <div style={{ width: "300px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", color: "#666" }}>
                      <span>Sub Total</span>
                      <span style={{ color: "#111", fontWeight: "500" }}>
                        {formatAmount(currentQuote.subTotal || currentQuote.total || 0, currentQuote.currency)}
                      </span>
                    </div>
                    {currentQuote.discount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", color: "#666" }}>
                        <span>Discount</span>
                        <span style={{ color: "#111", fontWeight: "500" }}>
                          -{formatAmount(currentQuote.discount || 0, currentQuote.currency)}
                        </span>
                      </div>
                    )}
                    {currentQuote.taxAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", color: "#666" }}>
                        <span>{currentQuote.taxName || "Tax"}</span>
                        <span style={{ color: "#111", fontWeight: "500" }}>
                          {formatAmount(currentQuote.taxAmount || 0, currentQuote.currency)}
                        </span>
                      </div>
                    )}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      fontSize: "16px",
                      fontWeight: "700",
                      borderTop: "2px solid #111",
                      marginTop: "8px"
                    }}>
                      <span>Total</span>
                      <span>{formatAmount(currentQuote.total || 0, currentQuote.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="mb-8">
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111", marginBottom: "8px" }}>
                    Notes
                  </div>
                  <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
                    {currentQuote.customerNotes || "Looking forward for your business."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Import Quotes Modal */}
      {
        isImportModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsImportModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Import Quotes</h2>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-sm text-gray-700 mb-6">
                  You can import quotes into Taban Books from a .CSV or .TSV or .XLS file.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    navigate("/sales/quotes/import");
                  }}
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Customize Columns Modal */}
      {isCustomizeColumnsModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[3000]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[500px] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f9fafb]">
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={18} className="text-gray-500" />
                <h3 className="text-[15px] font-semibold text-gray-800">Customize Columns</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-medium">{tempVisibleColumns.length} of {allColumnOptions.length} Selected</span>
                <button
                  onClick={() => setIsCustomizeColumnsModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center border border-blue-200 rounded shadow-sm hover:bg-gray-50 transition-colors group"
                >
                  <X size={16} className="text-red-500 group-hover:text-red-600" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search"
                  value={columnSearchTerm}
                  onChange={(e) => setColumnSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Columns List */}
            <div className="px-2 pb-6 max-h-[400px] overflow-y-auto">
              {allColumnOptions
                .filter(col => col.label.toLowerCase().includes(columnSearchTerm.toLowerCase()))
                .map((col) => {
                  const isChecked = tempVisibleColumns.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 group cursor-pointer transition-colors"
                      onClick={() => {
                        if (col.locked) return;
                        if (isChecked) {
                          setTempVisibleColumns(prev => prev.filter(k => k !== col.key));
                        } else {
                          setTempVisibleColumns(prev => [...prev, col.key]);
                        }
                      }}
                    >
                      <GripVertical size={14} className="text-gray-300 cursor-grab active:cursor-grabbing" />
                      <div className="flex-1 flex items-center gap-3">
                        {col.locked ? (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <Lock size={12} className="text-gray-500" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }} // Handled by div click
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          />
                        )}
                        <span className={`text-[13.5px] ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{col.label}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-start gap-3 px-6 py-4 border-t border-gray-100 bg-[#f9fafb]">
              <button
                onClick={() => {
                  setVisibleColumns([...tempVisibleColumns]);
                  setIsCustomizeColumnsModalOpen(false);
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded text-[13px] font-medium hover:bg-blue-600 transition-colors shadow-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsCustomizeColumnsModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded text-[13px] font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header Menu Overlay - Rendered outside table to avoid clipping */}
      {isHeaderMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[1000]"
            onClick={() => setIsHeaderMenuOpen(false)}
          ></div>
          <div
            ref={headerMenuMenuRef}
            className="fixed bg-white border border-gray-200 rounded-md shadow-xl z-[1001] py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${headerMenuPosition.top}px`,
              left: `${headerMenuPosition.left}px`
            }}
          >
            <div
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              onClick={() => {
                setIsCustomizeColumnsModalOpen(true);
                setTempVisibleColumns([...visibleColumns]);
                setIsHeaderMenuOpen(false);
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Customize Columns</span>
            </div>
          </div>
        </>
      )}
    </div >
  );
}

