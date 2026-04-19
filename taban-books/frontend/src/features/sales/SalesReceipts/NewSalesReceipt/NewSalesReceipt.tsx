// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";
import {
  X,
  Search,
  ChevronDown,
  Plus,
  Info,
  Upload,
  Settings,
  Trash2,
  MoreVertical,
  FileText,
  ScanLine,
  CheckSquare,
  Check,
  Cloud,
  Zap,
  RefreshCw,
  Paperclip,
  File,
  Copy,
  Grid3x3,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { saveSalesReceipt, getSalesReceiptById, updateSalesReceipt, getCustomers, getCustomersFromAPI } from "../../salesModel";
import { salesReceiptsAPI, currenciesAPI, salespersonsAPI, itemsAPI, transactionNumberSeriesAPI, chartOfAccountsAPI, taxesAPI, paymentModesAPI } from "../../../../services/api";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { useCurrency } from "../../../../hooks/useCurrency";
import TabanSelect from "../../../../components/TabanSelect";
import PaymentModeDropdown from "../../../../components/PaymentModeDropdown";
import { API_BASE_URL, getToken } from "../../../../services/auth";

// Salespersons will be loaded from database

// Items will be loaded from database

const paymentModes = [...PAYMENT_MODE_OPTIONS];
// Deposit accounts will be loaded from database

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function NewSalesReceipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;
  const { baseCurrency, symbol } = useCurrency();
  const currencySymbol = symbol || "$";
  const [saveLoading, setSaveLoading] = useState(null);

  // Get item data from navigation state (when coming from item detail page)
  const itemFromState = location.state?.item || null;
  const clonedDataFromState = location.state?.clonedData || null;

  const [formData, setFormData] = useState({
    customerName: "",
    receiptDate: formatDate(new Date()),
    receiptNumber: "SR-00001",
    salesperson: "",
    taxInclusive: "Tax Inclusive",
    items: [
      { id: 1, itemDetails: "", quantity: 1, rate: 0, discount: 0, discountType: "percent", tax: "", amount: 0 }
    ],
    subTotal: 0,
    discount: 0,
    discountType: "percent",
    shippingCharges: 0,
    adjustment: 0,
    roundOff: 0,
    total: 0,
    currency: "",
    notes: "",
    termsAndConditions: "",
    documents: [],
    paymentMode: "Cash",
    depositTo: "Petty Cash",
    depositToAccountId: "",
    referenceNumber: ""
  });
  const hasAppliedCloneRef = useRef(false);
  const hasLoadedEditDataRef = useRef(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    hasLoadedEditDataRef.current = false;
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode || !clonedDataFromState || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedDataFromState as any;
    const toDisplayDate = (value: any, fallback: string) => {
      if (!value) return fallback;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return formatDate(d);
      return String(value);
    };

    const mappedItems = Array.isArray(cloned.items) && cloned.items.length > 0
      ? cloned.items.map((item: any, index: number) => ({
        id: index + 1,
        itemDetails: item.itemDetails || item.name || item.description || "",
        quantity: Number(item.quantity ?? 1) || 1,
        rate: Number(item.rate ?? item.price ?? 0) || 0,
        discount: Number(item.discount ?? 0) || 0,
        discountType: item.discountType || "percent",
        tax: String(item.tax || item.taxId || ""),
        amount: Number(item.amount ?? 0) || 0
      }))
      : undefined;

    setFormData(prev => ({
      ...prev,
      customerName: cloned.customerName || cloned.customer?.displayName || cloned.customer?.name || prev.customerName,
      receiptDate: toDisplayDate(cloned.receiptDate || cloned.date, prev.receiptDate),
      salesperson: cloned.salesperson || prev.salesperson,
      taxInclusive: cloned.taxInclusive || prev.taxInclusive,
      items: mappedItems || prev.items,
      discount: Number(cloned.discount ?? prev.discount) || 0,
      discountType: cloned.discountType || prev.discountType,
      shippingCharges: Number(cloned.shippingCharges ?? prev.shippingCharges) || 0,
      adjustment: Number(cloned.adjustment ?? prev.adjustment) || 0,
      roundOff: Number(cloned.roundOff ?? prev.roundOff) || 0,
      total: Number(cloned.total ?? prev.total) || 0,
      currency: cloned.currency || prev.currency,
      notes: cloned.notes || cloned.customerNotes || prev.notes,
      termsAndConditions: cloned.termsAndConditions || cloned.terms || prev.termsAndConditions,
      documents: [],
      paymentMode: cloned.paymentMode || cloned.mode || prev.paymentMode,
      depositTo: cloned.depositTo || cloned.paidThrough || prev.depositTo,
      referenceNumber: cloned.referenceNumber || cloned.reference || prev.referenceNumber
    }));
  }, [clonedDataFromState, isEditMode]);

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isDiscountTypeDropdownOpen, setIsDiscountTypeDropdownOpen] = useState(false);
  const discountTypeDropdownRef = useRef(null);
  const [openDiscountDropdowns, setOpenDiscountDropdowns] = useState({});
  const discountDropdownRefs = useRef({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [customerQuickActionBaseIds, setCustomerQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction] = useState(false);
  const [isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [isReloadingCustomerFrame, setIsReloadingCustomerFrame] = useState(false);

  // Customer search modal state
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);
  const [isNewSalespersonQuickActionOpen, setIsNewSalespersonQuickActionOpen] = useState(false);
  const [salespersonQuickActionBaseIds, setSalespersonQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingSalespersonsQuickAction, setIsRefreshingSalespersonsQuickAction] = useState(false);
  const [isAutoSelectingSalespersonFromQuickAction, setIsAutoSelectingSalespersonFromQuickAction] = useState(false);
  const [salespersonQuickActionFrameKey, setSalespersonQuickActionFrameKey] = useState(0);
  const [isReloadingSalespersonFrame, setIsReloadingSalespersonFrame] = useState(false);
  const [isTaxInclusiveDropdownOpen, setIsTaxInclusiveDropdownOpen] = useState(false);
  const [taxInclusiveSearch, setTaxInclusiveSearch] = useState("");
  const [openItemDropdowns, setOpenItemDropdowns] = useState({});
  const [itemSearches, setItemSearches] = useState({});
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState({});
  const [taxSearches, setTaxSearches] = useState({});
  const [isPaymentModeDropdownOpen, setIsPaymentModeDropdownOpen] = useState(false);
  const [isDepositToDropdownOpen, setIsDepositToDropdownOpen] = useState(false);
  const [isReceiptDatePickerOpen, setIsReceiptDatePickerOpen] = useState(false);
  const [receiptDateCalendar, setReceiptDateCalendar] = useState(new Date());
  const [isManageSalespersonsModalOpen, setIsManageSalespersonsModalOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [selectedSalespersonsForManage, setSelectedSalespersonsForManage] = useState([]);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddSearch, setBulkAddSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState([]);
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isBulkUpdateMode, setIsBulkUpdateMode] = useState(false);
  const [openItemMenuId, setOpenItemMenuId] = useState(null);
  const [isScanModeOpen, setIsScanModeOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [showAdditionalInformation, setShowAdditionalInformation] = useState(false);
  const [itemsWithAdditionalInfo, setItemsWithAdditionalInfo] = useState(new Set());
  const [showNewHeaderInput, setShowNewHeaderInput] = useState(false);
  const [newHeaderText, setNewHeaderText] = useState("");
  const [newHeaderItemId, setNewHeaderItemId] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState({});

  const customerDropdownRef = useRef(null);
  const salespersonDropdownRef = useRef(null);
  const taxInclusiveDropdownRef = useRef(null);
  const paymentModeDropdownRef = useRef(null);
  const depositToDropdownRef = useRef(null);
  const receiptDatePickerRef = useRef(null);
  const itemDropdownRefs = useRef({});
  const taxDropdownRefs = useRef({});
  const fileInputRef = useRef(null);
  const uploadDropdownRef = useRef(null);
  const bulkActionsRef = useRef(null);
  const itemMenuRefs = useRef({});

  // New States for Upload/Documents Modal
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("taban");
  const [documentSearch, setDocumentSearch] = useState("");
  const [cloudSearchQuery, setCloudSearchQuery] = useState("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState([]);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState("files");

  const [customers, setCustomers] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [items, setItems] = useState([]);
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [enabledSettings, setEnabledSettings] = useState(null);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showItemDiscount = discountMode === "line-item";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "inclusive";

  const getTaxDisplayLabel = (taxOption) => {
    if (!taxOption) return "";
    const baseName = String(taxOption.name || "Tax").replace(/\s*[\[(].*?[%].*?[\])]\s*/g, "").trim();
    const rate = Number(taxOption.rate || 0);
    return `${baseName} [${rate}%]`;
  };

  const findTaxById = (taxId) => {
    if (!taxId) return undefined;
    const normalized = String(taxId);
    return taxes.find((t) => String(t.id || t._id || "") === normalized);
  };

  const getItemComputation = (item, taxInclusiveMode = formData.taxInclusive) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discount = showItemDiscount ? (parseFloat(item.discount) || 0) : 0;
    const discountType = showItemDiscount ? (item.discountType || "percent") : "percent";
    const lineBase = quantity * rate;
    const lineDiscount = discountType === "percent"
      ? (lineBase * discount / 100)
      : discount;
    const afterDiscount = Math.max(0, lineBase - lineDiscount);
    const taxOption = findTaxById(item.tax);
    const taxRate = Number(taxOption?.rate || 0);
    const taxAmount = taxRate > 0
      ? (taxInclusiveMode === "Tax Inclusive"
        ? (afterDiscount - (afterDiscount / (1 + taxRate / 100)))
        : (afterDiscount * taxRate / 100))
      : 0;
    const netAmount = taxInclusiveMode === "Tax Inclusive"
      ? (afterDiscount - taxAmount)
      : afterDiscount;
    const grossAmount = taxInclusiveMode === "Tax Inclusive"
      ? afterDiscount
      : (afterDiscount + taxAmount);
    return {
      displayAmount: Number(afterDiscount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      grossAmount: Number(grossAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      taxOption
    };
  };

  // Calculate tax summary for the summary section
  const taxSummary = React.useMemo(() => {
    const summary = {};
    formData.items.forEach((item) => {
      if (!item.tax) return;
      const computed = getItemComputation(item, formData.taxInclusive);
      if (!computed.taxOption || computed.taxAmount <= 0) return;
      const taxName = getTaxDisplayLabel(computed.taxOption);
      summary[taxName] = Number(((summary[taxName] || 0) + computed.taxAmount).toFixed(2));
    });
    return summary;
  }, [formData.items, taxes, formData.taxInclusive, showItemDiscount]);

  const totalTaxAmount = Object.values(taxSummary).reduce((sum, val) => sum + Number(val || 0), 0);

  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results = [];

    if (customerSearchCriteria === "Display Name") {
      results = customers.filter(customer => {
        const displayName = customer.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Email") {
      results = customers.filter(customer => {
        const email = customer.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Company Name") {
      results = customers.filter(customer => {
        const companyName = customer.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Phone") {
      results = customers.filter(customer => {
        const phone = customer.workPhone || customer.mobile || "";
        return phone.includes(searchTerm);
      });
    }

    setCustomerSearchResults(results);
    setCustomerSearchPage(1);
  };

  // Pagination calculations
  const customerResultsPerPage = 10;
  const customerStartIndex = (customerSearchPage - 1) * customerResultsPerPage;
  const customerEndIndex = customerStartIndex + customerResultsPerPage;
  const customerPaginatedResults = customerSearchResults.slice(customerStartIndex, customerEndIndex);
  const customerTotalPages = Math.ceil(customerSearchResults.length / customerResultsPerPage);

  useEffect(() => {
    const loadData = async () => {
      setIsDataLoaded(false);
      try {
        // Load customers
        const customersResponse = await getCustomersFromAPI();
        const loadedCustomers = (customersResponse?.data || []).map((c: any) => ({
          ...c,
          id: c._id || c.id,
          _id: c._id || c.id,
          name: c.displayName || c.name || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
        }));
        setCustomers(loadedCustomers);

        // Load salespersons
        const salespersonsResponse = await salespersonsAPI.getAll();
        if (salespersonsResponse && salespersonsResponse.data) {
          setSalespersons(salespersonsResponse.data.map((s: any) => ({
            ...s,
            id: s._id || s.id,
            _id: s._id || s.id,
            name: s.name || ""
          })));
        }

        // Load taxes
        const normalizeTaxes = (rows = []) =>
          rows.map((t) => ({
            id: t.id || t._id,
            _id: t._id || t.id,
            name: t.name || "Tax",
            rate: Number(t.rate || 0),
            type: t.type || "both",
            isActive: t.isActive !== false
          }));

        let loadedTaxes = [];
        const taxesResponse = await taxesAPI.getForTransactions("sales");
        const firstBatch = Array.isArray(taxesResponse?.data)
          ? taxesResponse.data
          : Array.isArray(taxesResponse?.data?.data)
            ? taxesResponse.data.data
            : [];
        loadedTaxes = normalizeTaxes(firstBatch);

        if (loadedTaxes.length === 0) {
          const fallbackResponse = await taxesAPI.getAll({ status: "active" });
          const fallbackBatch = Array.isArray(fallbackResponse?.data)
            ? fallbackResponse.data
            : Array.isArray(fallbackResponse?.data?.data)
              ? fallbackResponse.data.data
              : [];
          loadedTaxes = normalizeTaxes(
            fallbackBatch.filter((tax) => ["sales", "both", undefined, null].includes(tax.type))
          );
        }

        setTaxes(loadedTaxes);

        // Load items
        const itemsResponse = await itemsAPI.getAll();
        if (itemsResponse && itemsResponse.data) {
          setItems(itemsResponse.data);
        }

        // Load deposit accounts (Cash and Bank accounts)
        const accountsResponse = await chartOfAccountsAPI.getAccounts({ limit: 1000 });
        if (accountsResponse && accountsResponse.data) {
          const cashBankAccounts = accountsResponse.data
            .filter(acc => {
              const accountType = (acc.account_type || acc.accountType || "").toLowerCase();
              const name = (acc.accountName || acc.name || "").toLowerCase();
              return accountType === 'cash' ||
                accountType === 'bank' ||
                accountType === 'asset' ||
                name.includes('cash') ||
                name.includes('bank') ||
                name.includes('petty') ||
                name.includes('undeposited');
            })
            .map(acc => {
              // Normalize for grouping in TabanSelect
              let type = acc.account_type || acc.accountType || 'Other';
              const nameLower = (acc.accountName || acc.name || "").toLowerCase();
              if (nameLower.includes('cash') || nameLower.includes('petty') || nameLower.includes('undeposited') || type === 'cash') {
                type = 'cash';
              } else if (nameLower.includes('bank') || type === 'bank') {
                type = 'bank';
              }
              return { ...acc, account_type: type };
            });
          setDepositAccounts(cashBankAccounts);

          // If current depositTo name exists in loaded accounts, set its ID
          if (!isEditMode) {
            const currentAccount = cashBankAccounts.find(a => (a.accountName || a.name) === formData.depositTo);
            if (currentAccount) {
              setFormData(prev => ({
                ...prev,
                depositToAccountId: currentAccount.id || currentAccount._id
              }));
            }
          }
        }

        // Load payment modes and set default
        if (!isEditMode) {
          const modesResponse = await paymentModesAPI.getAll();
          if (modesResponse && modesResponse.success && modesResponse.data) {
            const defaultMode = modesResponse.data.find(m => m.isDefault);
            if (defaultMode) {
              setFormData(prev => ({
                ...prev,
                paymentMode: defaultMode.name
              }));
            }
          }
        }

        // Load base currency
        if (!isEditMode) {
          const baseCurrencyResponse = await currenciesAPI.getBaseCurrency();
          if (baseCurrencyResponse && baseCurrencyResponse.success && baseCurrencyResponse.data) {
            const code = baseCurrencyResponse.data.code || "USD";
            setFormData(prev => ({
              ...prev,
              currency: code.split(' - ')[0]
            }));
          }
        }

        // Load next sales receipt number
        if (!isEditMode) {
          const numberSeriesResponse = await transactionNumberSeriesAPI.getAll();
          if (numberSeriesResponse && numberSeriesResponse.data) {
            const salesReceiptSeries = numberSeriesResponse.data.find(
              series => series.module === 'sales_receipt' || (series.name || "").toLowerCase().includes('sales receipt')
            );
            if (salesReceiptSeries) {
              const nextNumber = await transactionNumberSeriesAPI.getNextNumber(salesReceiptSeries.id);
              if (nextNumber && nextNumber.data) {
                setFormData(prev => ({
                  ...prev,
                  receiptNumber: nextNumber.data.next_number
                }));
              }
            }
          }
        }

        try {
          const generalResponse = await fetch(`${API_BASE_URL}/settings/general`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (generalResponse.ok) {
            const generalJson = await generalResponse.json();
            const settings = generalJson?.data?.settings;
            if (settings) {
              setEnabledSettings(settings);
            }
          }
        } catch (generalError) {
          console.error("Error loading general settings:", generalError);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, [isEditMode]);

  useEffect(() => {
    if (isDocumentsModalOpen) {
      setAvailableDocuments(getAllDocuments());
    }
  }, [isDocumentsModalOpen]);

  const taxInclusiveOptions = React.useMemo(
    () =>
      taxMode === "inclusive"
        ? ["Tax Inclusive"]
        : taxMode === "exclusive"
          ? ["Tax Exclusive"]
          : ["Tax Exclusive", "Tax Inclusive"],
    [taxMode]
  );

  useEffect(() => {
    setFormData(prev => {
      let changed = false;
      const next = { ...prev };
      if (!showItemDiscount) {
        const updatedItems = next.items.map(item => {
          const hasDiscount = Number(item.discount || 0) !== 0 || (item.discountType || "percent") !== "percent";
          if (!hasDiscount) return item;
          changed = true;
          return { ...item, discount: 0, discountType: "percent" };
        });
        next.items = updatedItems;
      }
      if (!showTransactionDiscount && (Number(next.discount || 0) !== 0 || next.discountType !== "percent")) {
        next.discount = 0;
        next.discountType = "percent";
        changed = true;
      }
      if (!showShippingCharges && Number(next.shippingCharges || 0) !== 0) {
        next.shippingCharges = 0;
        changed = true;
      }
      if (!showAdjustment && Number(next.adjustment || 0) !== 0) {
        next.adjustment = 0;
        changed = true;
      }
      if (taxInclusiveOptions.length === 1 && next.taxInclusive !== taxInclusiveOptions[0]) {
        next.taxInclusive = taxInclusiveOptions[0];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [showItemDiscount, showTransactionDiscount, showShippingCharges, showAdjustment, taxInclusiveOptions]);

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
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }
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

  const handleDateSelect = (date) => {
    const formatted = formatDate(date);
    setFormData(prev => ({
      ...prev,
      receiptDate: formatted
    }));
    setIsReceiptDatePickerOpen(false);
    setReceiptDateCalendar(date);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(receiptDateCalendar);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setReceiptDateCalendar(newDate);
  };

  const calculateItemBaseAmount = (item) => {
    return getItemComputation(item, formData.taxInclusive).netAmount;
  };

  // Calculate item amount
  const calculateItemAmount = (item, taxInclusive) => {
    return getItemComputation(item, taxInclusive).displayAmount;
  };

  // Calculate totals
  const calculateTotals = () => {
    let subTotal = 0;
    let grossItemsTotal = 0;
    formData.items.forEach((item) => {
      const computed = getItemComputation(item, formData.taxInclusive);
      subTotal += computed.netAmount;
      grossItemsTotal += computed.grossAmount;
    });

    const discountAmount = showTransactionDiscount
      ? (formData.discountType === "percent"
        ? (subTotal * parseFloat(formData.discount) / 100)
        : parseFloat(formData.discount))
      : 0;

    const shipping = showShippingCharges ? (parseFloat(formData.shippingCharges) || 0) : 0;
    const adjustment = showAdjustment ? (parseFloat(formData.adjustment) || 0) : 0;

    const totalBeforeRound = grossItemsTotal - discountAmount + shipping + adjustment;
    const roundOff = 0;
    const total = parseFloat((totalBeforeRound + roundOff).toFixed(2));

    setFormData(prev => ({
      ...prev,
      subTotal: parseFloat(subTotal.toFixed(2)),
      total,
      roundOff
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.discount, formData.discountType, formData.shippingCharges, formData.adjustment, formData.taxInclusive, showItemDiscount, showTransactionDiscount, showShippingCharges, showAdjustment, taxes]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (taxInclusiveDropdownRef.current && !taxInclusiveDropdownRef.current.contains(event.target)) {
        setIsTaxInclusiveDropdownOpen(false);
      }
      if (paymentModeDropdownRef.current && !paymentModeDropdownRef.current.contains(event.target)) {
        setIsPaymentModeDropdownOpen(false);
      }
      if (depositToDropdownRef.current && !depositToDropdownRef.current.contains(event.target)) {
        setIsDepositToDropdownOpen(false);
      }
      if (receiptDatePickerRef.current && !receiptDatePickerRef.current.contains(event.target)) {
        setIsReceiptDatePickerOpen(false);
      }
      if (discountTypeDropdownRef.current && !discountTypeDropdownRef.current.contains(event.target)) {
        setIsDiscountTypeDropdownOpen(false);
      }

      Object.keys(openItemDropdowns).forEach(itemId => {
        if (openItemDropdowns[itemId]) {
          const ref = itemDropdownRefs.current[itemId];
          if (ref && ref.current && !ref.current.contains(event.target)) {
            setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });

      Object.keys(openTaxDropdowns).forEach(itemId => {
        if (openTaxDropdowns[itemId]) {
          const ref = taxDropdownRefs.current[itemId];
          // Check if ref is a DOM element (if directly assigned) or a RefObject
          const element = ref?.current || ref;
          if (element && typeof element.contains === 'function' && !element.contains(event.target)) {
            setOpenTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });

      Object.keys(openDiscountDropdowns).forEach(itemId => {
        if (openDiscountDropdowns[itemId]) {
          const ref = discountDropdownRefs.current[itemId];
          if (ref && !ref.contains(event.target)) {
            setOpenDiscountDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });

      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target)) {
        setIsBulkActionsOpen(false);
      }

      if (openItemMenuId !== null) {
        const ref = itemMenuRefs.current[openItemMenuId];
        if (ref && ref.current && !ref.current.contains(event.target)) {
          setOpenItemMenuId(null);
        }
      }
    };

    const hasOpenDropdown = isCustomerDropdownOpen || isSalespersonDropdownOpen ||
      isTaxInclusiveDropdownOpen || isPaymentModeDropdownOpen || isDepositToDropdownOpen ||
      isReceiptDatePickerOpen || Object.values(openItemDropdowns).some(Boolean) || Object.values(openTaxDropdowns).some(Boolean) ||
      isDiscountTypeDropdownOpen;

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen, isSalespersonDropdownOpen, isTaxInclusiveDropdownOpen, isPaymentModeDropdownOpen, isDepositToDropdownOpen, isReceiptDatePickerOpen, openItemDropdowns, openTaxDropdowns]);

  // Set item from navigation state (when coming from item detail page)
  useEffect(() => {
    if (itemFromState && !isEditMode) {
      // Pre-fill the first item in the items array
      setFormData(prev => {
        const updatedItems = [...prev.items];
        if (updatedItems.length > 0) {
          const quantity = 1;
          const rate = itemFromState.rate || 0;
          updatedItems[0] = {
            ...updatedItems[0],
            itemDetails: itemFromState.name || "",
            rate: rate,
            quantity: quantity,
            amount: quantity * rate
          };
        }

        // Calculate totals
        const { subTotal, roundOff, total } = calculateTotalsHelper(
          updatedItems,
          prev.discount,
          prev.discountType,
          prev.shippingCharges,
          prev.adjustment
        );

        return {
          ...prev,
          items: updatedItems,
          subTotal,
          roundOff,
          total,
          currency: itemFromState.currency || prev.currency
        };
      });
    }
  }, [itemFromState, isEditMode]);

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toEntityId = (value) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      return String(value._id || value.id || value.value || value.itemId || "");
    }
    return "";
  };

  const getTaxIdFromLine = (line) => {
    const directTaxId = String(
      line?.tax ||
      line?.taxId ||
      line?.tax_id ||
      line?.tax?._id ||
      line?.tax?.id ||
      ""
    ).trim();
    if (directTaxId && taxes.some((tax) => String(tax.id || tax._id) === directTaxId)) {
      return directTaxId;
    }

    const rate = toFiniteNumber(line?.taxRate ?? line?.tax?.rate ?? line?.taxPercent ?? line?.tax_percentage, -1);
    if (rate >= 0) {
      const taxByRate = taxes.find((tax) => Number(tax.rate || 0) === rate);
      if (taxByRate) return String(taxByRate.id || taxByRate._id || "");
    }

    const taxName = String(line?.taxName || line?.tax?.name || "").trim().toLowerCase();
    if (taxName) {
      const taxByName = taxes.find((tax) => String(tax.name || "").trim().toLowerCase() === taxName);
      if (taxByName) return String(taxByName.id || taxByName._id || "");
    }

    return "";
  };

  // Load receipt data when in edit mode
  useEffect(() => {
    const loadReceiptData = async () => {
      if (isEditMode && id) {
        if (!isDataLoaded || hasLoadedEditDataRef.current) return;
        try {
          const receipt = await getSalesReceiptById(id);
          if (!receipt) return;

          const mappedItems = Array.isArray(receipt.items) && receipt.items.length > 0
            ? receipt.items.map((line, index) => {
              const itemId = toEntityId(line?.item || line?.itemId);
              const matchedItem = items.find((itemRow) => String(itemRow.id || itemRow._id || "") === itemId);
              const quantity = toFiniteNumber(line?.quantity, 1) || 1;
              const rate = toFiniteNumber(line?.unitPrice ?? line?.rate ?? line?.price, 0);
              const discount = toFiniteNumber(line?.discount, 0);
              const discountType = String(line?.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent";
              return {
                id: Date.now() + index + Math.floor(Math.random() * 1000),
                itemId,
                itemDetails: String(line?.name || line?.itemDetails || matchedItem?.name || line?.description || "").trim(),
                quantity,
                rate,
                discount,
                discountType,
                tax: getTaxIdFromLine(line),
                amount: toFiniteNumber(line?.amount ?? line?.total, quantity * rate),
                stockOnHand: matchedItem?.stockQuantity ?? matchedItem?.stock_on_hand ?? matchedItem?.stockOnHand ?? 0,
                description: line?.description || ""
              };
            })
            : [
              { id: 1, itemDetails: "", quantity: 1, rate: 0, discount: 0, discountType: "percent", tax: "", amount: 0 }
            ];

          const customerObject = typeof receipt.customer === "object" ? receipt.customer : null;
          const customerId = String(receipt.customerId || customerObject?._id || customerObject?.id || receipt.customer || "").trim();
          const customerName = String(
            receipt.customerName ||
            customerObject?.displayName ||
            customerObject?.companyName ||
            customerObject?.name ||
            ""
          ).trim();

          const matchedCustomer = customers.find((customer) => {
            const idMatch = customerId && String(customer.id || customer._id || "") === customerId;
            const nameMatch = customerName && String(customer.name || "").trim().toLowerCase() === customerName.toLowerCase();
            return idMatch || nameMatch;
          });

          const salespersonName = String(
            typeof receipt.salesperson === "object"
              ? (receipt.salesperson?.name || receipt.salesperson?.displayName || "")
              : (receipt.salesperson || "")
          ).trim();
          const matchedSalesperson = salespersons.find((sp) =>
            String(sp.name || "").trim().toLowerCase() === salespersonName.toLowerCase()
          );

          const depositAccountId = toEntityId(receipt.depositToAccount || receipt.depositToAccountId);
          const matchedDepositAccount = depositAccounts.find((account) => {
            const accountId = String(account.id || account._id || "");
            const accountName = String(account.accountName || account.name || "").trim().toLowerCase();
            const depositName = String(receipt.depositTo || "").trim().toLowerCase();
            return (depositAccountId && accountId === depositAccountId) || (depositName && accountName === depositName);
          });

          setFormData((prev) => ({
            ...prev,
            customerName: matchedCustomer?.name || customerName || prev.customerName,
            receiptDate: receipt.date ? formatDate(receipt.date) : (receipt.receiptDate ? formatDate(receipt.receiptDate) : prev.receiptDate),
            receiptNumber: receipt.receiptNumber || prev.receiptNumber,
            salesperson: matchedSalesperson?.name || salespersonName || prev.salesperson,
            taxInclusive: receipt.taxInclusive || prev.taxInclusive,
            items: mappedItems,
            subTotal: toFiniteNumber(receipt.subtotal ?? receipt.subTotal, prev.subTotal),
            discount: toFiniteNumber(receipt.discount, prev.discount),
            discountType: String(receipt.discountType || prev.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent",
            shippingCharges: toFiniteNumber(receipt.shippingCharges, prev.shippingCharges),
            adjustment: toFiniteNumber(receipt.adjustment, prev.adjustment),
            roundOff: toFiniteNumber(receipt.roundOff, prev.roundOff),
            total: toFiniteNumber(receipt.total ?? receipt.amount, prev.total),
            currency: receipt.currency || prev.currency,
            notes: receipt.notes || prev.notes,
            termsAndConditions: receipt.termsAndConditions || receipt.terms || prev.termsAndConditions,
            paymentMode: receipt.paymentMode || receipt.paymentMethod || prev.paymentMode,
            depositTo: matchedDepositAccount?.accountName || matchedDepositAccount?.name || receipt.depositTo || prev.depositTo,
            depositToAccountId: matchedDepositAccount?.id || matchedDepositAccount?._id || depositAccountId || prev.depositToAccountId,
            referenceNumber: receipt.referenceNumber || receipt.reference || receipt.paymentReference || prev.referenceNumber
          }));

          if (matchedCustomer) {
            setSelectedCustomer(matchedCustomer);
          } else if (customerName) {
            setSelectedCustomer({
              id: customerId || undefined,
              _id: customerId || undefined,
              name: customerName,
              email: receipt.customerEmail || customerObject?.email || ""
            });
          }

          if (matchedSalesperson) {
            setSelectedSalesperson(matchedSalesperson);
          } else if (salespersonName) {
            setSelectedSalesperson({ name: salespersonName });
          }

          hasLoadedEditDataRef.current = true;
        } catch (error) {
          console.error("Error loading receipt data:", error);
        }
      } else {
        // Fetch next receipt number for new receipt
        try {
          const response = await salesReceiptsAPI.getNextNumber();
          if (response && response.success && response.data?.nextReceiptNumber) {
            setFormData(prev => ({
              ...prev,
              receiptNumber: response.data.nextReceiptNumber
            }));
          }
        } catch (error) {
          console.error("Error fetching next receipt number:", error);
        }
      }
    };
    loadReceiptData();
  }, [isEditMode, id, isDataLoaded, customers, salespersons, taxes, items, depositAccounts]);

  // Helper to recalculate totals
  const calculateTotalsHelper = (items, discount, discountType, shipping, adjustment) => {
    const subTotal = items.reduce(
      (sum, item) => sum + getItemComputation(item, formData.taxInclusive).netAmount,
      0
    );
    const grossItemsTotal = items.reduce(
      (sum, item) => sum + getItemComputation(item, formData.taxInclusive).grossAmount,
      0
    );

    const discountAmount = showTransactionDiscount
      ? (discountType === "percent"
        ? (subTotal * (parseFloat(discount) || 0) / 100)
        : (parseFloat(discount) || 0))
      : 0;

    const shippingAmount = showShippingCharges ? (parseFloat(shipping) || 0) : 0;
    const adjustmentAmount = showAdjustment ? (parseFloat(adjustment) || 0) : 0;
    const totalBeforeRound = grossItemsTotal - discountAmount + shippingAmount + adjustmentAmount;
    const roundOff = 0;
    const total = totalBeforeRound + roundOff;

    return {
      subTotal: Number(subTotal.toFixed(2)),
      roundOff: Number(roundOff.toFixed(2)),
      total: Number(total.toFixed(2))
    };
  };

  const handleCustomerSelect = (customer: any) => {
    const customerName = customer?.displayName || customer?.name || customer?.companyName || "";
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerName }));
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");
  };

  const handleSalespersonSelect = (salesperson: any) => {
    const salespersonName = salesperson?.name || "";
    setSelectedSalesperson(salesperson);
    setFormData(prev => ({ ...prev, salesperson: salespersonName }));
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  const getEntityId = (entity: any): string => {
    const raw = entity?._id || entity?.id;
    return raw ? String(raw) : "";
  };

  const pickNewestEntity = (entities: any[]) => {
    const toTime = (value: any) => {
      const time = new Date(value || 0).getTime();
      return Number.isFinite(time) ? time : 0;
    };
    return [...entities].sort((a, b) => {
      const aTime = Math.max(
        toTime(a?.createdAt),
        toTime(a?.created_at),
        toTime(a?.updatedAt),
        toTime(a?.updated_at)
      );
      const bTime = Math.max(
        toTime(b?.createdAt),
        toTime(b?.created_at),
        toTime(b?.updatedAt),
        toTime(b?.updated_at)
      );
      return bTime - aTime;
    })[0];
  };

  const reloadCustomersForSalesReceipt = async () => {
    const customersResponse = await getCustomersFromAPI();
    const normalizedCustomers = (customersResponse?.data || []).map((c: any) => ({
      ...c,
      id: c._id || c.id,
      _id: c._id || c.id,
      name: c.displayName || c.name || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
    }));
    setCustomers(normalizedCustomers);
    return normalizedCustomers;
  };

  const reloadSalespersonsForSalesReceipt = async () => {
    const salespersonsResponse = await salespersonsAPI.getAll();
    const normalizedSalespersons = (salespersonsResponse?.data || []).map((s: any) => ({
      ...s,
      id: s._id || s.id,
      _id: s._id || s.id,
      name: s.name || ""
    }));
    setSalespersons(normalizedSalespersons);
    return normalizedSalespersons;
  };

  const openCustomerQuickAction = async () => {
    setIsCustomerDropdownOpen(false);
    setIsRefreshingCustomersQuickAction(true);
    const latestCustomers = await reloadCustomersForSalesReceipt();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForSalesReceipt();
      const baselineIds = new Set(customerQuickActionBaseIds);
      const newCustomers = latestCustomers.filter((c: any) => {
        const entityId = getEntityId(c);
        return entityId && !baselineIds.has(entityId);
      });
      if (newCustomers.length > 0) {
        const newlyCreatedCustomer = pickNewestEntity(newCustomers) || newCustomers[newCustomers.length - 1];
        handleCustomerSelect(newlyCreatedCustomer);
        setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
        setIsNewCustomerQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingCustomerFromQuickAction(false);
    }
  };

  const openSalespersonQuickAction = async () => {
    setIsSalespersonDropdownOpen(false);
    setIsManageSalespersonsModalOpen(false);
    setIsRefreshingSalespersonsQuickAction(true);
    const latestSalespersons = await reloadSalespersonsForSalesReceipt();
    setSalespersonQuickActionBaseIds(latestSalespersons.map((s: any) => getEntityId(s)).filter(Boolean));
    setIsRefreshingSalespersonsQuickAction(false);
    setIsNewSalespersonQuickActionOpen(true);
  };

  const tryAutoSelectNewSalespersonFromQuickAction = async () => {
    if (!isNewSalespersonQuickActionOpen || isAutoSelectingSalespersonFromQuickAction) return;
    setIsAutoSelectingSalespersonFromQuickAction(true);
    try {
      const latestSalespersons = await reloadSalespersonsForSalesReceipt();
      const baselineIds = new Set(salespersonQuickActionBaseIds);
      const newSalespersons = latestSalespersons.filter((s: any) => {
        const entityId = getEntityId(s);
        return entityId && !baselineIds.has(entityId);
      });
      if (newSalespersons.length > 0) {
        const newlyCreatedSalesperson = pickNewestEntity(newSalespersons) || newSalespersons[newSalespersons.length - 1];
        handleSalespersonSelect(newlyCreatedSalesperson);
        setSalespersonQuickActionBaseIds(latestSalespersons.map((s: any) => getEntityId(s)).filter(Boolean));
        setIsNewSalespersonQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingSalespersonFromQuickAction(false);
    }
  };

  const handleProductSelect = (itemId, product) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = {
            ...item,
            itemId: product.id || product._id,
            itemDetails: product.name,
            rate: product.sellingPrice || product.rate || 0,
            sku: product.sku,
            stockOnHand: product.stockQuantity ?? product.stock_on_hand ?? product.stockOnHand ?? 0
          };
          updatedItem.amount = calculateItemAmount(updatedItem, prev.taxInclusive);
          return updatedItem;
        }
        return item;
      });

      const { subTotal, roundOff, total } = calculateTotalsHelper(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
    });
  };


  const handleItemChange = (itemId, field, value) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          updatedItem.amount = calculateItemAmount(updatedItem, prev.taxInclusive);
          return updatedItem;
        }
        return item;
      });

      const { subTotal, roundOff, total } = calculateTotalsHelper(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now() + Math.floor(Math.random() * 1000), itemDetails: "", quantity: 1, rate: 0, discount: 0, discountType: "percent", tax: "", amount: 0 }
      ]
    }));
  };

  const handleRemoveItem = (itemId) => {
    setFormData(prev => {
      if (prev.items.length <= 1) return prev;
      const updatedItems = prev.items.filter(item => item.id !== itemId);

      const { subTotal, roundOff, total } = calculateTotalsHelper(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
    });
  };

  const handleSelectAllItems = () => {
    setBulkSelectedItemIds(formData.items.map(item => item.id));
  };

  const handleDeselectAllItems = () => {
    setBulkSelectedItemIds([]);
  };

  const handleToggleItemSelection = (itemId) => {
    setBulkSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDuplicateItem = (id) => {
    const itemToDuplicate = formData.items.find(item => item.id === id);
    if (itemToDuplicate) {
      setFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            ...itemToDuplicate,
            id: Date.now() + Math.floor(Math.random() * 1000),
            amount: 0
          }
        ]
      }));
    }
  };

  const getFilteredItems = (itemId) => {
    const searchTerm = itemSearches[itemId] || "";
    // If no search term, show available items
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      (item.name || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term)
    );
  };

  const getFilteredTaxes = (itemId) => {
    const searchTerm = (taxSearches[itemId] || "").trim().toLowerCase();
    if (!searchTerm) return taxes;
    return taxes.filter((tax) => (tax.name || "").toLowerCase().includes(searchTerm));
  };

  // Items for bulk add
  const availableItems = items;

  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return availableItems;
    }
    return availableItems.filter(item =>
      (item.name || '').toLowerCase().includes(bulkAddSearch.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(bulkAddSearch.toLowerCase())
    );
  };

  const handleBulkItemToggle = (item) => {
    setBulkSelectedItems(prev => {
      const exists = prev.find(selected => selected.id === item.id);
      if (exists) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleBulkItemQuantityChange = (itemId, quantity) => {
    setBulkSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, parseFloat(quantity) || 1) } : item
      )
    );
  };

  const handleAddBulkItems = () => {
    if (bulkSelectedItems.length === 0) return;

    setFormData(prev => {
      const newItems = bulkSelectedItems.map((selectedItem, index) => {
        const quantity = selectedItem.quantity || 1;
        const rate = selectedItem.rate || 0;
        const taxId = "";
        const taxOption = taxes.find(t => (t.id || t._id) === taxId);
        const taxRate = taxOption ? taxOption.rate : 0;
        const subAmt = quantity * rate;
        const amount = subAmt + (subAmt * taxRate / 100);
        return {
          id: Date.now() + index + Math.floor(Math.random() * 1000),
          itemId: selectedItem.id || selectedItem._id,
          itemDetails: selectedItem.name,
          quantity: quantity,
          rate: rate,
          tax: "",
          amount: amount,
          stockOnHand: selectedItem.stockQuantity ?? selectedItem.stock_on_hand ?? selectedItem.stockOnHand ?? 0
        };
      });

      const updatedItems = [...prev.items, ...newItems];

      const { subTotal, roundOff, total } = calculateTotalsHelper(
        updatedItems,
        prev.discount,
        prev.discountType,
        prev.shippingCharges,
        prev.adjustment
      );

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        roundOff,
        total
      };
    });

    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleCancelBulkAdd = () => {
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleSummaryChange = (field, value) => {
    setFormData(prev => {
      const updatedData = { ...prev, [field]: value };
      const { subTotal, roundOff, total } = calculateTotalsHelper(
        updatedData.items,
        updatedData.discount,
        updatedData.discountType,
        updatedData.shippingCharges,
        updatedData.adjustment
      );
      return {
        ...updatedData,
        subTotal,
        roundOff,
        total
      };
    });
  };

  const buildReceiptPayload = (statusValue = "paid") => {
    const paymentMethod = String(formData.paymentMode || "Cash")
      .toLowerCase()
      .replace(/\s+/g, "_");

    const matchedCustomer = selectedCustomer || customers.find((customer) =>
      String(customer.name || "").trim().toLowerCase() === String(formData.customerName || "").trim().toLowerCase()
    );

    const matchedDepositAccount = depositAccounts.find((account) =>
      String(account.id || account._id || "") === String(formData.depositToAccountId || "")
    ) || depositAccounts.find((account) =>
      String(account.accountName || account.name || "").trim().toLowerCase() === String(formData.depositTo || "").trim().toLowerCase()
    );

    const parsedDate = new Date(formData.receiptDate);
    const normalizedDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    const normalizedItems = (formData.items || []).map((item) => {
      const matchedItem = items.find((itemRow) => {
        const rowId = String(itemRow.id || itemRow._id || "");
        const rowName = String(itemRow.name || "").trim().toLowerCase();
        return rowId === String(item.itemId || "") || rowName === String(item.itemDetails || "").trim().toLowerCase();
      });

      const taxOption = taxes.find((tax) => String(tax.id || tax._id || "") === String(item.tax || ""));
      const taxRate = Number(taxOption?.rate || 0);
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const discount = showItemDiscount ? Number(item.discount || 0) : 0;
      const discountType = showItemDiscount
        ? (String(item.discountType || "percent").toLowerCase().includes("amount") ? "amount" : "percent")
        : "percent";

      const baseAmount = quantity * rate;
      const lineDiscountAmount = discountType === "percent" ? (baseAmount * discount / 100) : discount;
      const afterDiscount = Math.max(baseAmount - lineDiscountAmount, 0);

      let taxAmount = 0;
      if (taxRate > 0) {
        taxAmount = formData.taxInclusive === "Tax Inclusive"
          ? (afterDiscount - (afterDiscount / (1 + taxRate / 100)))
          : (afterDiscount * taxRate / 100);
      }

      return {
        item: item.itemId || matchedItem?.id || matchedItem?._id,
        name: item.itemDetails,
        description: item.description || "",
        quantity,
        unitPrice: rate,
        discount,
        discountType,
        taxRate,
        taxAmount: Number(taxAmount.toFixed(2)),
        total: Number(item.amount || afterDiscount)
      };
    });

    const customerEmail = String(
      matchedCustomer?.email ||
      selectedCustomer?.email ||
      ""
    ).trim();

    const receiptData = {
      ...formData,
      customer: matchedCustomer?.id || matchedCustomer?._id || undefined,
      customerName: matchedCustomer?.name || formData.customerName,
      customerEmail,
      salesperson: selectedSalesperson?.name || formData.salesperson,
      date: normalizedDate,
      receiptDate: normalizedDate,
      status: statusValue,
      paymentMethod,
      paymentReference: formData.referenceNumber,
      subtotal: Number(formData.subTotal || 0),
      tax: Number(totalTaxAmount || 0),
      discount: showTransactionDiscount ? Number(formData.discount || 0) : 0,
      discountType: showTransactionDiscount ? formData.discountType : "percent",
      shippingCharges: showShippingCharges ? Number(formData.shippingCharges || 0) : 0,
      adjustment: showAdjustment ? Number(formData.adjustment || 0) : 0,
      depositTo: formData.depositTo,
      depositToAccount: formData.depositToAccountId || matchedDepositAccount?.id || matchedDepositAccount?._id,
      items: normalizedItems
    };

    return { receiptData, customerEmail };
  };

  const buildSalesReceiptEmailBody = (receipt) => {
    const receiptNumber = receipt?.receiptNumber || "SR-00001";
    const receiptDate = formatDate(receipt?.receiptDate || receipt?.date || new Date());
    const currency = String(receipt?.currency || baseCurrency || "USD").toUpperCase();
    const amountPaid = `${currency}${Number(receipt?.total ?? 0).toFixed(2)}`;
    const customerName = receipt?.customerName || "Customer";
    const note = String(receipt?.notes || "").trim();

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 18px 0;">Dear ${customerName},</p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">Please find attached the sales receipt for your recent purchase.</p>

        <div style="background-color: #f8f7e9; border: 1px solid #e5e2cc; border-radius: 4px; padding: 34px 30px; margin: 26px 0;">
          <div style="text-align: center;">
            <div style="font-size: 34px; font-weight: 700; color: #111827; margin-bottom: 8px;">Amount Paid</div>
            <div style="font-size: 46px; font-weight: 700; color: #22c55e; letter-spacing: 0.3px;">${amountPaid}</div>
          </div>

          <div style="border-top: 1px solid #ddd8bc; margin: 24px 0;"></div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #111827;">Receipt Number</td>
              <td style="padding: 8px 0; color: #111827; text-align: right;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #111827;">Receipt Date</td>
              <td style="padding: 8px 0; color: #111827; text-align: right;">${receiptDate}</td>
            </tr>
          </table>

          <div style="border-top: 1px solid #ddd8bc; margin: 24px 0 20px;"></div>

          <div>
            <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 6px;">Note:</div>
            <div style="font-size: 14px; color: #374151; line-height: 1.55;">${note || "-"}</div>
          </div>
        </div>

        <div style="margin-top: 18px;">
          <p style="font-size: 14px; margin: 0 0 4px 0;">Regards,</p>
          <p style="font-size: 14px; margin: 0; font-weight: 700;">Taban Enterprise</p>
        </div>
      </div>
    `;
  };

  const handleSave = async () => {
    try {
      setSaveLoading("draft");
      const { receiptData } = buildReceiptPayload("paid");
      const savedReceipt = isEditMode
        ? await updateSalesReceipt(id, receiptData)
        : await saveSalesReceipt(receiptData);
      const receiptId = savedReceipt?.id || savedReceipt?._id || id;
      navigate(`/sales/sales-receipts/${receiptId}`);
    } catch (error) {
      console.error("Error saving sales receipt:", error);
      alert("Failed to save sales receipt. Please try again.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveAndSend = async () => {
    try {
      setSaveLoading("send");
      const { receiptData, customerEmail } = buildReceiptPayload("paid");
      const savedReceipt = isEditMode
        ? await updateSalesReceipt(id, receiptData)
        : await saveSalesReceipt(receiptData);

      const receiptId = savedReceipt?.id || savedReceipt?._id || id;

      if (customerEmail) {
        const receiptNumber = savedReceipt?.receiptNumber || receiptData.receiptNumber;
        const emailReceipt = {
          ...receiptData,
          ...savedReceipt,
          receiptNumber,
          total: Number(savedReceipt?.total ?? receiptData.total ?? 0),
          currency: savedReceipt?.currency || receiptData.currency || baseCurrency || "USD"
        };

        await salesReceiptsAPI.sendEmail(receiptId, {
          to: customerEmail,
          subject: `Sales Receipt ${receiptNumber}`,
          body: buildSalesReceiptEmailBody(emailReceipt),
          attachSystemPDF: true
        });
      } else {
        alert("Sales receipt saved, but customer email is missing so email was not sent.");
      }

      navigate(`/sales/sales-receipts/${receiptId}`);
    } catch (error) {
      console.error("Error saving/sending sales receipt:", error);
      alert("Failed to save and send sales receipt. Please try again.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (formData.documents.length + files.length > 10) {
      alert("You can upload a maximum of 10 files");
      return;
    }
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 10MB limit. Maximum file size is 10MB.`);
      return;
    }
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file
    }));
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newFiles]
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploadDropdownOpen(false);
  };

  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== fileId)
    }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parseFileSize = (sizeStr) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleAttachFromCloud = (service) => {
    if (service) {
      // Handle specific cloud service
      alert(`${service.charAt(0).toUpperCase() + service.slice(1)} integration - Coming soon! This will allow you to connect and select files from ${service}.`);
    } else {
      // Generic cloud option
      alert("Cloud storage integration - Coming soon! This will allow you to connect and select files from cloud storage services.");
    }
    setIsUploadDropdownOpen(false);
  };

  const handleAttachFromDesktop = () => {
    handleUploadClick();
    setIsUploadDropdownOpen(false);
  };

  const handleAttachFromDocuments = () => {
    setIsUploadDropdownOpen(false);
    setIsDocumentsModalOpen(true);
  };

  const documents = [
    { id: 1, name: "Receipt_Copy.pdf", size: "1.2 MB", type: "pdf", uploadedBy: "Admin", uploadedOn: "2023-10-15" },
    { id: 2, name: "Tax_Certificate.pdf", size: "450 KB", type: "pdf", uploadedBy: "John Doe", uploadedOn: "2023-10-20" },
    { id: 3, name: "Customer_Signature.png", size: "1.5 MB", type: "png", uploadedBy: "Sarah Smith", uploadedOn: "2023-10-22" },
  ];

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(documentSearch.toLowerCase())
  );

  const filteredCustomers = Array.isArray(customers) ? customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  ) : [];

  const filteredSalespersons = Array.isArray(salespersons) ? salespersons.filter(s =>
    (s.name || '').toLowerCase().includes(salespersonSearch.toLowerCase())
  ) : [];

  const filteredItems = Array.isArray(items) ? items.filter(item =>
    (item.name || '').toLowerCase().includes((itemSearches[1] || "").toLowerCase()) ||
    (item.sku || '').toLowerCase().includes((itemSearches[1] || "").toLowerCase())
  ) : [];

  return (

    <div className="w-full min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-gray-900" />
          <h1 className="text-[17px] font-bold text-gray-900">New Sales Receipt</h1>
        </div>
        <button
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => navigate("/sales/sales-receipts")}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white pb-24">
        <div className="w-full px-8 py-10">
          {/* Form Fields Section */}
          <div className="max-w-4xl space-y-7">
            {/* Customer Name */}
            <div className="grid grid-cols-[200px_1fr] gap-x-6 items-center">
              <label className="text-sm font-medium text-gray-600">Customer Name</label>
              <div className="relative" ref={customerDropdownRef}>
                <div className="flex items-center">
                  <div className="relative group flex-1">
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-all pr-12 hover:border-gray-400"
                      placeholder="Select Customer"
                      value={formData.customerName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, customerName: e.target.value }));
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center pr-3 gap-2">
                      <ChevronDown size={14} className="text-gray-400" />
                      <div className="w-[1px] h-4 bg-gray-200" />
                      <div className="p-1 cursor-pointer hover:bg-gray-100 rounded text-gray-500">
                        <Settings size={14} />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-white rounded-r border-none transition-colors flex items-center justify-center h-[34px] cursor-pointer"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerSearchModalOpen(true);
                    }}
                  >
                    <Search size={16} />
                  </button>
                </div>
                {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 max-h-60 overflow-y-auto py-1">
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer transition-colors flex items-center gap-2"
                        onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        onClick={() => {
                          handleCustomerSelect(customer);
                        }}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "rgba(21, 99, 114, 0.2)", color: "#156372" }}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {customer.name}
                      </div>
                    ))}

                    <div
                      className="px-4 py-2 text-sm cursor-pointer font-medium border-t border-gray-100 flex items-center gap-2"
                      style={{ color: "#156372" }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                      onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        openCustomerQuickAction();
                      }}
                    >
                      <Plus size={14} />
                      New Customer
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Date */}
            <div className="grid grid-cols-[200px_1fr] gap-x-6 items-center">
              <label className="text-sm font-medium text-red-500">Receipt Date*</label>
              <div className="max-w-[320px] relative" ref={receiptDatePickerRef}>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-all hover:border-gray-400 cursor-pointer"
                  value={formData.receiptDate}
                  readOnly
                  onClick={() => setIsReceiptDatePickerOpen(!isReceiptDatePickerOpen)}
                />
                {isReceiptDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded shadow-2xl z-50 w-72 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigateMonth("prev"); }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                      >
                        <ChevronDown className="transform rotate-90" size={18} />
                      </button>
                      <span className="font-bold text-gray-800 text-sm">{months[receiptDateCalendar.getMonth()]} {receiptDateCalendar.getFullYear()}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigateMonth("next"); }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                      >
                        <ChevronDown className="transform -rotate-90" size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div key={day} className="text-[11px] font-bold text-center py-1 text-gray-400 uppercase">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(receiptDateCalendar).map((day, idx) => (
                        <button
                          key={idx}
                          className={`text-xs w-8 h-8 rounded flex items-center justify-center transition-all ${day.month !== "current" ? "text-gray-300" : "text-gray-700"
                            } ${formData.receiptDate === formatDate(day.fullDate) ? "text-white font-bold cursor-pointer" : ""}`}
                          style={formData.receiptDate === formatDate(day.fullDate) ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                          onMouseEnter={(e) => {
                            if (formData.receiptDate === formatDate(day.fullDate)) {
                              e.target.style.opacity = "0.9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.receiptDate === formatDate(day.fullDate)) {
                              e.target.style.opacity = "1";
                            }
                          }}
                          onClick={(e) => { e.stopPropagation(); handleDateSelect(day.fullDate); }}
                        >
                          {day.date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sales Receipt# */}
            <div className="grid grid-cols-[200px_1fr] gap-x-6 items-center">
              <label className="text-sm font-medium text-red-500">Sales Receipt#*</label>
              <div className="max-w-[240px] relative">
                <input
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-all pr-10 hover:border-gray-400"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center border rounded p-0.5 cursor-pointer" style={{ borderColor: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" }}>
                  <Settings size={12} style={{ color: "#156372" }} />
                </div>
              </div>
            </div>

            {/* Salesperson */}
            <div className="grid grid-cols-[200px_1fr] gap-x-6 items-center">
              <label className="text-sm font-medium text-gray-600">Salesperson</label>
              <div className="max-w-[320px] relative" ref={salespersonDropdownRef}>
                <div className="relative group">
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] transition-all pr-10 hover:border-gray-400"
                    placeholder="Select or Add Salesperson"
                    value={selectedSalesperson?.name || formData.salesperson}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, salesperson: e.target.value }));
                      setSalespersonSearch(e.target.value);
                      setIsSalespersonDropdownOpen(true);
                    }}
                    onFocus={() => setIsSalespersonDropdownOpen(true)}
                  />
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {isSalespersonDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 max-h-60 overflow-y-auto py-1">
                    {salespersons
                      .filter(sp => (sp.name || '').toLowerCase().includes(salespersonSearch.toLowerCase()))
                      .map(salesperson => (
                        <div
                          key={salesperson.id || salesperson._id}
                          className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            handleSalespersonSelect(salesperson);
                          }}
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px]">
                            {(salesperson.name || '').charAt(0)}
                          </div>
                          {salesperson.name}
                        </div>
                      ))}
                    <div
                      className="px-4 py-2 text-sm text-[#156372] cursor-pointer hover:bg-[rgba(21,99,114,0.1)] font-medium border-t border-gray-100 flex items-center gap-2 mt-1"
                      onClick={() => setIsManageSalespersonsModalOpen(true)}
                    >
                      <Plus size={14} />
                      Set up Salespersons
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-14">
            {/* Item Table Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-bold text-sm">Item Table</h3>
              <div className="flex items-center gap-3">
                <button
                  className="px-4 py-2 text-white border-none rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                  onClick={() => setIsScanModeOpen(true)}
                >
                  <ScanLine size={16} />
                  Scan Item
                </button>
                <div className="relative" ref={bulkActionsRef}>
                  <button
                    className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
                    onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  >
                    <CheckSquare size={16} />
                    Bulk Actions
                  </button>
                  {isBulkActionsOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 min-w-[240px] overflow-hidden">
                      <div
                        className={`px-4 py-3 text-sm cursor-pointer transition-all ${isBulkUpdateMode
                          ? "text-white"
                          : "text-gray-700 hover:bg-gray-50"
                          }`}
                        style={isBulkUpdateMode ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                        onMouseEnter={(e) => {
                          if (isBulkUpdateMode) {
                            e.target.style.opacity = "0.9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isBulkUpdateMode) {
                            e.target.style.opacity = "1";
                          }
                        }}
                        onClick={() => {
                          setIsBulkUpdateMode(true);
                          setIsBulkActionsOpen(false);
                        }}
                      >
                        Bulk Update Line Items
                      </div>
                      <div
                        className={`px-4 py-3 text-sm cursor-pointer transition-colors border-t border-gray-200 ${showAdditionalInformation
                          ? "bg-gray-50 text-gray-700"
                          : "text-gray-700 hover:bg-gray-50"
                          }`}
                        onClick={() => {
                          if (showAdditionalInformation) {
                            setItemsWithAdditionalInfo(new Set());
                            setShowAdditionalInformation(false);
                          } else {
                            setItemsWithAdditionalInfo(new Set(formData.items.map(item => item.id)));
                            setShowAdditionalInformation(true);
                          }
                          setIsBulkActionsOpen(false);
                        }}
                      >
                        Show All Additional Information
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scan Mode Interface */}
            {isScanModeOpen && (
              <div className="bg-gray-50 bg-opacity-50 mb-6 p-6 rounded-xl" style={{
                backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ScanLine size={20} className="text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
                  </div>
                  <button
                    onClick={() => {
                      setIsScanModeOpen(false);
                      setScanInput("");
                    }}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span className="text-sm font-medium">Close Scan</span>
                    <X size={18} className="text-red-500" />
                  </button>
                </div>
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && scanInput.trim()) {
                      const newItem = { id: Date.now() + Math.floor(Math.random() * 1000), itemDetails: scanInput, quantity: 1, rate: 0, tax: "", amount: 0 };
                      setFormData(prev => ({
                        ...prev,
                        items: [...prev.items, newItem]
                      }));
                      setScanInput("");
                    }
                  }}
                  placeholder="Scan or type item name/SKU and press Enter"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                  autoFocus
                />
              </div>
            )}

            {/* Bulk Update Banner */}
            {isBulkUpdateMode && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    className="px-4 py-2 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                    onClick={() => {
                      alert("Update Reporting Tags functionality");
                    }}
                  >
                    Update Reporting Tags
                  </button>
                  <button
                    className="px-4 py-2 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                    onClick={() => {
                      alert("Update Account functionality");
                    }}
                  >
                    Update Account
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsBulkUpdateMode(false);
                    setBulkSelectedItemIds([]);
                  }}
                  className="p-1 text-[#156372] hover:text-[#0D4A52] hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {isBulkUpdateMode && (
                    <th className="w-12 py-3 px-3">
                      <input
                        type="checkbox"
                        checked={bulkSelectedItemIds.length === formData.items.length && formData.items.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAllItems();
                          } else {
                            handleDeselectAllItems();
                          }
                        }}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                        style={{ accentColor: "#156372" }}
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-3 font-medium text-gray-700">ITEM DETAILS</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-700">QUANTITY</th>
                  <th className="text-center py-3 px-3 font-medium text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      RATE
                      <Grid3x3 size={14} className="text-gray-400" />
                    </div>
                  </th>
                  {showItemDiscount && (
                    <th className="text-left py-3 px-3 font-medium text-gray-700">DISCOUNT</th>
                  )}
                  <th className="text-left py-3 px-3 font-medium text-gray-700">TAX</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-700">AMOUNT</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-gray-100">
                      {isBulkUpdateMode && (
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={bulkSelectedItemIds.includes(item.id)}
                            onChange={() => handleToggleItemSelection(item.id)}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                            style={{ accentColor: "#156372" }}
                          />
                        </td>
                      )}
                      <td className="py-2 px-2">
                        <div
                          className="relative"
                          ref={el => {
                            if (!itemDropdownRefs.current[item.id]) {
                              itemDropdownRefs.current[item.id] = { current: null };
                            }
                            itemDropdownRefs.current[item.id].current = el;
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                              <ImageIcon size={14} className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Type or click to select an item"
                              value={item.itemDetails}
                              onChange={(e) => {
                                handleItemChange(item.id, "itemDetails", e.target.value);
                                setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }));
                                setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                              }}
                              onFocus={() => setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }))}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                            />
                            {item.sku && (
                              <div className="mt-1 text-xs text-[#156372] font-semibold ml-8">
                                Stock on Hand: {item.stockOnHand ?? 0}
                              </div>
                            )}
                          </div>

                          {openItemDropdowns[item.id] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                              {getFilteredItems(item.id).length > 0 ? (
                                getFilteredItems(item.id).map((productItem, idx) => (
                                  <div
                                    key={`${productItem.id || productItem._id}-${idx}`}
                                    className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 ${selectedItemIds[item.id] === productItem.id ? "bg-gray-50" : ""
                                      }`}
                                    onClick={() => {
                                      handleProductSelect(item.id, productItem);
                                      setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                    }}
                                  >
                                    <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ backgroundColor: "#156372" }}>
                                      {productItem.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">{productItem.name}</div>
                                      <div className="text-xs text-gray-500 truncate">
                                        SKU: {productItem.sku} â€¢ Rate: {formData.currency} {(productItem.rate || 0).toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="text-xs text-gray-500">Stock on Hand</div>
                                      <div className="text-xs font-medium text-gray-700">
                                        {/* Handle various potential field names for stock */}
                                        {(productItem.stockQuantity ?? productItem.stock_on_hand ?? productItem.stockOnHand ?? 0).toFixed(2)} {productItem.unit}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  {itemSearches[item.id] ? "No items found" : "No items available"}
                                </div>
                              )}
                              <button
                                className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm font-medium cursor-pointer hover:bg-gray-100 w-full transition-colors"
                                style={{ color: "#156372" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                  navigate("/items", { state: { showNewItem: true, returnTo: window.location.pathname } });
                                }}
                              >
                                <Plus size={16} />
                                Add New Item
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      {showItemDiscount && (
                      <td className="p-3">
                        <div className="flex items-center border-2 border-gray-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#156372] focus-within:border-[#156372] h-[38px]">
                          <input
                            type="number"
                            className="w-full px-2 py-2 text-sm text-right focus:outline-none"
                            value={item.discount}
                            onChange={(e) => handleItemChange(item.id, "discount", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                          <div className="relative border-l border-gray-200 h-full" ref={el => discountDropdownRefs.current[item.id] = el}>
                            <button
                              type="button"
                              className="bg-gray-50 px-2 py-2 text-[11px] font-bold text-gray-500 flex items-center gap-1 hover:bg-gray-100 transition-colors h-full"
                              onClick={() => setOpenDiscountDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            >
                              {item.discountType === "percent" ? "%" : "$"}
                              <ChevronDown size={10} className={`transition-transform ${openDiscountDropdowns[item.id] ? 'rotate-180' : ''}`} />
                            </button>
                            {openDiscountDropdowns[item.id] && (
                              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 min-w-[50px]">
                                <div
                                  className={`px-2 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${item.discountType === "percent" ? "text-[#156372] font-bold bg-[rgba(21,99,114,0.1)]" : "text-gray-700"}`}
                                  onClick={() => {
                                    handleItemChange(item.id, "discountType", "percent");
                                    setOpenDiscountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                  }}
                                >
                                  <span>%</span>
                                  {item.discountType === "percent" && <Check size={10} />}
                                </div>
                                <div
                                  className={`px-2 py-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${item.discountType === "amount" ? "text-[#156372] font-bold bg-[rgba(21,99,114,0.1)]" : "text-gray-700"}`}
                                  onClick={() => {
                                    handleItemChange(item.id, "discountType", "amount");
                                    setOpenDiscountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                  }}
                                >
                                  <span>$</span>
                                  {item.discountType === "amount" && <Check size={10} />}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      )}
                      <td className="p-3 relative overflow-visible">
                        <div className="relative" ref={el => taxDropdownRefs.current[item.id] = el}>
                          <button
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-left flex items-center justify-between hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] bg-white"
                            onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          >
                            <span className="truncate text-gray-700">
                              {item.tax ? getTaxDisplayLabel(findTaxById(item.tax)) : "Select a Tax"}
                            </span>
                            <div className="flex items-center gap-2 ml-2">
                              {item.tax && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="text-red-500 hover:text-red-600 leading-none"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemChange(item.id, "tax", "");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleItemChange(item.id, "tax", "");
                                    }
                                  }}
                                >
                                  <X size={12} />
                                </span>
                              )}
                              <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${openTaxDropdowns[item.id] ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          {openTaxDropdowns[item.id] && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[2500] py-2 w-[240px]">
                              <div className="px-2 pb-2">
                                <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    value={taxSearches[item.id] || ""}
                                    onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    placeholder="Search"
                                    className="w-full pl-9 pr-3 py-2 border border-[#3b82f6] rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                                  />
                                </div>
                              </div>
                              <div className="px-3 pb-1 text-xs font-semibold text-gray-500">Tax</div>
                              <div className="max-h-44 overflow-y-auto">
                                {getFilteredTaxes(item.id).length > 0 ? (
                                  getFilteredTaxes(item.id).map(tax => {
                                    const taxId = tax.id || tax._id;
                                    const isSelected = String(item.tax || "") === String(taxId || "");
                                    return (
                                      <button
                                        key={taxId}
                                        type="button"
                                        className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between transition-colors ${isSelected ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                                        onClick={() => {
                                          handleItemChange(item.id, "tax", taxId);
                                          setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                        }}
                                      >
                                        <span>{getTaxDisplayLabel(tax)}</span>
                                        {isSelected && <Check size={14} />}
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="w-full mt-1 px-3 py-2 text-sm text-[#3b82f6] hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100"
                                onClick={() => {
                                  setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                  navigate("/settings/taxes/new", {
                                    state: { returnTo: window.location.pathname }
                                  });
                                }}
                              >
                                <Plus size={14} />
                                New Tax
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-semibold text-gray-900">{formData.currency} {(item.amount || 0).toFixed(2)}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="relative"
                            ref={el => {
                              if (!itemMenuRefs.current[item.id]) {
                                itemMenuRefs.current[item.id] = { current: null };
                              }
                              itemMenuRefs.current[item.id].current = el;
                            }}
                          >
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openItemMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px] overflow-hidden">
                                <button
                                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${itemsWithAdditionalInfo.has(item.id)
                                    ? "text-white"
                                    : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  style={itemsWithAdditionalInfo.has(item.id) ? { backgroundColor: "#156372" } : {}}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemsWithAdditionalInfo(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(item.id)) {
                                        newSet.delete(item.id);
                                      } else {
                                        newSet.add(item.id);
                                      }
                                      return newSet;
                                    });
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  {itemsWithAdditionalInfo.has(item.id) ? "Hide Additional Information" : "Show Additional Information"}
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateItem(item.id);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  <Copy size={14} className="text-gray-500" />
                                  Clone
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentIndex = formData.items.findIndex(i => i.id === item.id);
                                    const newItem = { id: Date.now() + Math.floor(Math.random() * 1000), itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 };
                                    setFormData(prev => {
                                      const newItems = [...prev.items];
                                      newItems.splice(currentIndex + 1, 0, newItem);
                                      return { ...prev, items: newItems };
                                    });
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  <Plus size={14} className="text-gray-500" />
                                  Insert New Row
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBulkAddModalOpen(true);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  <Plus size={14} className="text-gray-500" />
                                  Insert Items in Bulk
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNewHeaderInput(true);
                                    setNewHeaderItemId(item.id);
                                    setOpenItemMenuId(null);
                                  }}
                                >
                                  <Plus size={14} className="text-gray-500" />
                                  Insert New Header
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {newHeaderItemId === item.id && showNewHeaderInput && (
                      <tr>
                        <td colSpan={isBulkUpdateMode ? 7 : 6} className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                              onClick={() => {
                                // Three dots icon - can be used for menu if needed
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            <input
                              type="text"
                              placeholder="Add New Header"
                              value={newHeaderText}
                              onChange={(e) => setNewHeaderText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && newHeaderText.trim()) {
                                  setShowNewHeaderInput(false);
                                  setNewHeaderText("");
                                  setNewHeaderItemId(null);
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                              autoFocus
                            />
                            <button
                              className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                              onClick={() => {
                                setShowNewHeaderInput(false);
                                setNewHeaderText("");
                                setNewHeaderItemId(null);
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div className="flex items-center gap-4 mt-4">
              <button
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
                style={{ backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372" }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(21, 99, 114, 0.15)"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                onClick={handleAddItem}
              >
                <Plus size={16} />
                Add New Row
              </button>
              <button
                onClick={() => setIsBulkAddModalOpen(true)}
                className="px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 border"
                style={{ backgroundColor: "rgba(21, 99, 114, 0.1)", color: "#156372", borderColor: "#156372" }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(21, 99, 114, 0.15)";
                  e.target.style.borderColor = "#0D4A52";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                  e.target.style.borderColor = "#156372";
                }}
              >
                <CheckSquare size={16} />
                Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Summary and Notes Section */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-10">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] resize-none h-24 hover:border-gray-400"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
              <div className="text-[11px] text-gray-500 mt-1">Will be displayed on the sales receipt</div>
            </div>

            <div className="bg-[#fafafa] border border-gray-200 rounded-md p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Sub Total</span>
                  <span className="text-sm font-bold text-gray-900">{formData.subTotal.toFixed(2)}</span>
                </div>
                {showTransactionDiscount && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Discount</span>
                    <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                      <input
                        type="text"
                        className="w-12 px-2 py-0.5 text-sm text-right focus:outline-none"
                        value={formData.discount}
                        onChange={(e) => handleSummaryChange("discount", e.target.value)}
                      />
                      <div className="relative border-l border-gray-200" ref={discountTypeDropdownRef}>
                        <button
                          type="button"
                          className="bg-white px-2 py-0.5 text-[11px] font-bold text-gray-500 flex items-center gap-1 hover:bg-gray-50 transition-colors h-full"
                          onClick={() => setIsDiscountTypeDropdownOpen(!isDiscountTypeDropdownOpen)}
                        >
                          {formData.discountType === "percent" ? "%" : "$"}
                          <ChevronDown size={10} className={`transition-transform ${isDiscountTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDiscountTypeDropdownOpen && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 min-w-[50px]">
                            <div
                              className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${formData.discountType === "percent" ? "text-[#156372] font-bold bg-[rgba(21,99,114,0.1)]" : "text-gray-700"}`}
                              onClick={() => {
                                handleSummaryChange("discountType", "percent");
                                setIsDiscountTypeDropdownOpen(false);
                              }}
                            >
                              <span>%</span>
                              {formData.discountType === "percent" && <Check size={10} />}
                            </div>
                            <div
                              className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-between ${formData.discountType === "amount" ? "text-[#156372] font-bold bg-[rgba(21,99,114,0.1)]" : "text-gray-700"}`}
                              onClick={() => {
                                handleSummaryChange("discountType", "amount");
                                setIsDiscountTypeDropdownOpen(false);
                              }}
                            >
                              <span>$</span>
                              {formData.discountType === "amount" && <Check size={10} />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-900">
                    {(formData.discountType === "percent"
                      ? (formData.subTotal * parseFloat(formData.discount) / 100)
                      : parseFloat(formData.discount)
                    ).toFixed(2)}
                  </span>
                </div>
                )}

                {showShippingCharges && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Shipping Charge</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-0.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                      value={formData.shippingCharges}
                      onChange={(e) => handleSummaryChange("shippingCharges", parseFloat(e.target.value) || 0)}
                    />
                    <div className="border border-gray-400 rounded-full p-0.5">
                      <Info size={10} className="text-gray-500" />
                    </div>
                  </div>
                  <span className="text-sm text-gray-900">{parseFloat(formData.shippingCharges).toFixed(2)}</span>
                </div>
                )}

                {showAdjustment && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-dashed border-gray-400 rounded px-2 py-0.5">
                      <span className="text-sm text-gray-600">Adjustment</span>
                    </div>
                    <input
                      type="number"
                      className="w-20 px-2 py-0.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                      value={formData.adjustment}
                      onChange={(e) => handleSummaryChange("adjustment", parseFloat(e.target.value) || 0)}
                    />
                    <div className="border border-gray-400 rounded-full p-0.5">
                      <Info size={10} className="text-gray-500" />
                    </div>
                  </div>
                  <span className="text-sm text-gray-900">{parseFloat(formData.adjustment).toFixed(2)}</span>
                </div>
                )}

                {Object.keys(taxSummary).length > 0 && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                    {Object.entries(taxSummary).map(([taxName, amount]) => (
                      <div key={taxName} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{taxName}</span>
                        <span className="text-gray-900">{amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-bold pt-2">
                      <span className="text-gray-700">Total Tax Amount</span>
                      <span className="text-gray-900">{totalTaxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] font-bold text-gray-900 uppercase">Total ( {currencySymbol} )</span>
                    <span className="text-[15px] font-bold text-gray-900">{formData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-10">
            {/* Terms & Conditions */}
            <div>
              <div className="text-sm font-medium text-gray-900 mb-2">Terms & Conditions</div>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] resize-none h-24 hover:border-gray-400"
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                value={formData.termsAndConditions}
                onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
              />
            </div>

            {/* Attach Files */}
            <div ref={uploadDropdownRef}>
              <div className="text-sm font-medium text-gray-900 mb-2">Attach File(s) to Sales Receipt</div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm border rounded-md bg-white text-gray-700 cursor-pointer flex items-center gap-1 ${isUploadDropdownOpen
                      ? "border-[#156372] border-dashed"
                      : "border-gray-300 border-solid"
                      }`}
                    onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
                  >
                    <Upload size={16} />
                    Upload File
                    <ChevronDown size={14} />
                  </button>
                  {isUploadDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-md border border-gray-200 min-w-[220px] z-[100] py-1">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left flex items-center"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#156372";
                          e.target.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "";
                        }}
                        onClick={handleAttachFromDesktop}
                      >
                        Attach From Desktop
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left flex items-center"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#156372";
                          e.target.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "";
                        }}
                        onClick={handleAttachFromDocuments}
                      >
                        Attach From Documents
                      </button>
                      <div className="px-4 py-2">
                        <button
                          type="button"
                          className="text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left hover:bg-[#156372] hover:text-white flex items-center"
                          onClick={() => handleAttachFromCloud()}
                        >
                          Attach From Cloud
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {formData.documents.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                    style={{ backgroundColor: "#156372" }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
                  >
                    <Paperclip size={16} />
                    {formData.documents.length}
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                You can upload a maximum of 5 files, 10MB each
              </p>
              {formData.documents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <File size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-sm text-gray-700 truncate">{doc.name}</span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(doc.size || 0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(doc.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Payment Details Section */}
          <div className="mt-14 border-t border-gray-200 pt-10 relative z-[200]">
            <h3 className="text-sm font-bold text-gray-900 mb-6">Payment Details</h3>
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-6 flex-1 max-w-[500px]">
                <label className="text-sm font-medium text-red-500 whitespace-nowrap">Payment Mode*</label>
                <div className="flex-1">
                  <PaymentModeDropdown
                    value={formData.paymentMode}
                    onChange={(val) => setFormData(prev => ({ ...prev, paymentMode: val }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 flex-1 max-w-[500px]">
                <label className="text-sm font-medium text-red-500 whitespace-nowrap">Deposit To*</label>
                <div className="flex-1">
                  <TabanSelect
                    value={formData.depositTo}
                    options={depositAccounts}
                    onChange={(val) => {
                      const account = depositAccounts.find(a => (a.id || a._id) === val || a.name === val);
                      setFormData(prev => ({
                        ...prev,
                        depositTo: val,
                        depositToAccountId: account?.id || account?._id
                      }));
                    }}
                    placeholder="Select Deposit Account"
                    direction="up"
                    groupBy="account_type"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-6 max-w-[500px]">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Reference#</label>
              <input
                type="text"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] hover:border-gray-400 transition-colors"
                value={formData.referenceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
              />
            </div>
          </div>

          {/* Footer Fixed Action Buttons */}
          <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-gray-200 px-8 py-3 flex items-center gap-3 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <button
              disabled={saveLoading !== null}
              className={`px-4 py-2 text-white rounded text-[13px] font-bold transition-colors shadow-sm cursor-pointer border-none flex items-center gap-2 ${saveLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              style={{ background: "#156372" }}
              onMouseEnter={(e) => { if (!saveLoading) e.target.style.backgroundColor = "#0D4A52"; }}
              onMouseLeave={(e) => { if (!saveLoading) e.target.style.backgroundColor = "#156372"; }}
              onClick={handleSave}
            >
              {saveLoading === "draft" ? <Loader2 size={14} className="animate-spin" /> : null}
              {saveLoading === "draft" ? "Saving..." : "Save as Paid"}
            </button>
            <div className="flex items-center">
              <button
                disabled={saveLoading !== null}
                className={`px-4 py-2 text-white rounded-l text-[13px] font-bold transition-colors shadow-sm cursor-pointer border-none flex items-center gap-2 ${saveLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                style={{ background: "#156372" }}
                onMouseEnter={(e) => { if (!saveLoading) e.target.style.backgroundColor = "#0D4A52"; }}
                onMouseLeave={(e) => { if (!saveLoading) e.target.style.backgroundColor = "#156372"; }}
                onClick={handleSaveAndSend}
              >
                {saveLoading === "send" ? <Loader2 size={14} className="animate-spin" /> : null}
                {saveLoading === "send" ? "Saving..." : "Save as Paid & Send"}
              </button>
              <button
                className="px-2 py-2 text-white rounded-r border-l border-[#0D4A52] transition-colors cursor-pointer"
                style={{ background: "#156372" }}
                onMouseEnter={(e) => { if (!saveLoading) e.target.style.backgroundColor = "#0D4A52"; }}
                onMouseLeave={(e) => { if (!saveLoading) e.target.style.backgroundColor = "#156372"; }}
                disabled={saveLoading !== null}
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <button
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-[13px] font-bold hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/sales/sales-receipts")}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Manage Salespersons Modal */}
      {
        isManageSalespersonsModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsManageSalespersonsModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Manage Salespersons</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900"
                  onClick={() => setIsManageSalespersonsModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                      placeholder="Search Salesperson"
                      value={manageSalespersonSearch}
                      onChange={(e) => setManageSalespersonSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="px-4 py-2 text-white border-none rounded-md text-sm font-medium flex items-center gap-2 cursor-pointer transition-all"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.target.style.opacity = "1"}
                    onClick={() => {
                      openSalespersonQuickAction();
                    }}
                  >
                    <Plus size={16} />
                    New Salesperson
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-3 text-left">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-gray-300 rounded focus:ring-[#156372]"
                            style={{ accentColor: "#156372" }}
                            checked={selectedSalespersonsForManage.length === salespersons.length && salespersons.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSalespersonsForManage(salespersons.map(sp => sp.id || sp._id));
                              } else {
                                setSelectedSalespersonsForManage([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">SALESPERSON NAME</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-700 uppercase">EMAIL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salespersons
                        .filter(sp =>
                          (sp.name || '').toLowerCase().includes(manageSalespersonSearch.toLowerCase()) ||
                          (sp.email || '').toLowerCase().includes(manageSalespersonSearch.toLowerCase())
                        )
                        .map(salesperson => (
                          <tr key={salesperson.id || salesperson._id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                className="w-4 h-4 border-gray-300 rounded focus:ring-[#156372]"
                                style={{ accentColor: "#156372" }}
                                checked={selectedSalespersonsForManage.includes(salesperson.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSalespersonsForManage(prev => [...prev, salesperson.id]);
                                  } else {
                                    setSelectedSalespersonsForManage(prev => prev.filter(id => id !== salesperson.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 text-gray-900">{salesperson.name}</td>
                            <td className="p-3 text-gray-900">{salesperson.email}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Choose from Documents Modal */}
      {
        isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Choose from Documents</h2>
                  <p className="text-sm text-gray-500 mt-1">Select files from your document library</p>
                </div>
                <button
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Inbox Types */}
                <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-1">
                  {[
                    { id: "files", label: "Files", icon: ScanLine },
                    { id: "bank-statements", label: "Bank Statements", icon: FileText },
                    { id: "all-documents", label: "All Documents", icon: CheckSquare }
                  ].map((inbox) => (
                    <button
                      key={inbox.id}
                      onClick={() => setSelectedInbox(inbox.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${selectedInbox === inbox.id
                        ? "text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-200"
                        }`}
                      style={selectedInbox === inbox.id ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                      onMouseEnter={(e) => {
                        if (selectedInbox === inbox.id) {
                          e.target.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedInbox === inbox.id) {
                          e.target.style.opacity = "1";
                        }
                      }}
                    >
                      <inbox.icon size={18} />
                      {inbox.label}
                    </button>
                  ))}
                </div>

                {/* Main Documents List */}
                <div className="flex-1 flex flex-col bg-white">
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search documents by name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] focus:bg-white transition-all"
                        value={documentSearch}
                        onChange={(e) => setDocumentSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {(() => {
                      let filteredDocs = availableDocuments;
                      if (selectedInbox === "files") {
                        filteredDocs = availableDocuments.filter(doc => doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder);
                      } else if (selectedInbox === "bank-statements") {
                        filteredDocs = availableDocuments.filter(doc => doc.folder === "Bank Statements" || doc.module === "Banking");
                      }
                      if (documentSearch) {
                        filteredDocs = filteredDocs.filter(doc => doc.name.toLowerCase().includes(documentSearch.toLowerCase()));
                      }

                      if (filteredDocs.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <Upload size={32} className="text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No documents found matching your criteria.</p>
                          </div>
                        );
                      }

                      return filteredDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => {
                            if (selectedDocuments.includes(doc.id)) {
                              setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                            } else {
                              setSelectedDocuments([...selectedDocuments, doc.id]);
                            }
                          }}
                          className={`group p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedDocuments.includes(doc.id)
                            ? ""
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                            }`}
                          style={selectedDocuments.includes(doc.id) ? { borderColor: "#156372", backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${selectedDocuments.includes(doc.id) ? 'text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white'}`}
                              style={selectedDocuments.includes(doc.id) ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 truncate max-w-[300px]">{doc.name}</div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span>{doc.size}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                <span>{doc.uploadedOn || "Me"}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${selectedDocuments.includes(doc.id)
                            ? "text-white"
                            : "border-gray-300 group-hover:border-gray-400"
                            }`}
                            style={selectedDocuments.includes(doc.id) ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)", borderColor: "#156372" } : {}}>
                            {selectedDocuments.includes(doc.id) && <Check size={14} />}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                <button
                  onClick={() => setIsDocumentsModalOpen(false)}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedDocuments.length > 0) {
                      const selectedDocs = availableDocuments.filter(doc => selectedDocuments.includes(doc.id)).map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                        file: null,
                        documentId: doc.id
                      }));
                      setFormData(prev => ({ ...prev, documents: [...prev.documents, ...selectedDocs] }));
                    }
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                  }}
                  disabled={selectedDocuments.length === 0}
                  className="px-8 py-2.5 text-white border-none rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => {
                    if (selectedDocuments.length > 0) e.target.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDocuments.length > 0) e.target.style.opacity = "1";
                  }}
                >
                  Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length}) ` : ""}Files
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Cloud Picker Modal */}
      {
        isCloudPickerOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 font-sans">Cloud Picker</h2>
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Cloud Providers */}
                <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    {[
                      { id: 'taban', name: 'Taban Books Drive' },
                      { id: 'gdrive', name: 'Google Drive' },
                      { id: 'dropbox', name: 'Dropbox' },
                      { id: 'box', name: 'Box' },
                      { id: 'onedrive', name: 'OneDrive' },
                      { id: 'evernote', name: 'Evernote' }
                    ].map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedCloudProvider(provider.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${selectedCloudProvider === provider.id
                          ? 'text-white shadow-lg'
                          : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        style={selectedCloudProvider === provider.id ? { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" } : {}}
                        onMouseEnter={(e) => {
                          if (selectedCloudProvider === provider.id) {
                            e.target.style.opacity = "0.9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedCloudProvider === provider.id) {
                            e.target.style.opacity = "1";
                          }
                        }}
                      >
                        <div className={`w-2 h-2 rounded-full ${selectedCloudProvider === provider.id ? 'bg-white' : 'bg-slate-300'}`} />
                        {provider.name}
                      </button>
                    ))}
                  </div>

                  {/* Team Info / Help */}
                  <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(21, 99, 114, 0.1)" }}>
                        <Zap size={14} style={{ color: "#156372" }} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Pro Tip</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Connect your team's shared cloud storage to collaborate faster on receipts.
                    </p>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                  {selectedCloudProvider === "gdrive" ? (
                    /* Google Drive Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Google Drive Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32">
                          {/* Google Drive Triangle Logo */}
                          <svg viewBox="0 0 256 256" className="w-full h-full">
                            {/* Green triangle */}
                            <path
                              d="M128 32L32 128l96 96V32z"
                              fill="#0F9D58"
                            />
                            {/* Blue triangle */}
                            <path
                              d="M128 32l96 96-96 96V32z"
                              fill="#4285F4"
                            />
                            {/* Yellow triangle */}
                            <path
                              d="M32 128l96 96V128L32 32v96z"
                              fill="#F4B400"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books. The use and transfer of information received from Google APIs to Taban Books will adhere to{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            Google API Services User Data Policy
                          </a>
                          , including the{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            Limited Use Requirements
                          </a>
                          .
                        </p>
                      </div>

                      {/* Authenticate Google Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.target.style.opacity = "1"}
                        onClick={() => {
                          window.open(
                            "https://accounts.google.com/v3/signin/accountchooser",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Google
                      </button>
                    </div>
                  ) : selectedCloudProvider === "dropbox" ? (
                    /* Dropbox Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Dropbox Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg viewBox="0 0 128 128" className="w-full h-full">
                            <defs>
                              <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061FF" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            <g fill="url(#dropboxGradient)">
                              <rect x="8" y="8" width="48" height="48" rx="4" />
                              <rect x="72" y="8" width="48" height="48" rx="4" />
                              <rect x="8" y="72" width="48" height="48" rx="4" />
                              <rect x="72" y="72" width="48" height="48" rx="4" />
                            </g>
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Dropbox Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.target.style.opacity = "1"}
                        onClick={() => {
                          window.open(
                            "https://www.dropbox.com/oauth2/authorize",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Dropbox
                      </button>
                    </div>
                  ) : selectedCloudProvider === "box" ? (
                    /* Box Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Box Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                            <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                              <span className="text-white text-4xl font-bold">b</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Box Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.target.style.opacity = "1"}
                        onClick={() => {
                          window.open(
                            "https://account.box.com/api/oauth2/authorize",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Box
                      </button>
                    </div>
                  ) : selectedCloudProvider === "onedrive" ? (
                    /* OneDrive Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* OneDrive Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <div className="relative">
                            <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate OneDrive Button */}
                      <button
                        className="px-8 py-3 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.target.style.opacity = "1"}
                        onClick={() => {
                          window.open(
                            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate OneDrive
                      </button>
                    </div>
                  ) : selectedCloudProvider === "taban" || selectedCloudProvider === "gdrive" || selectedCloudProvider === "dropbox" || selectedCloudProvider === "box" ? (
                    /* Functional Cloud Picker Content */
                    <div className="w-full flex-1 overflow-hidden flex flex-col">
                      {/* Search bar inside picker */}
                      <div className="mb-4 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search in ${selectedCloudProvider}...`}
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#156372] transition-all font-medium text-slate-700"
                          value={cloudSearchQuery}
                          onChange={(e) => setCloudSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <div className="flex border-b border-gray-100 pb-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                          <div className="w-[60%]">File Name</div>
                          <div className="w-[20%] text-right">Size</div>
                          <div className="w-[20%] text-right">Modified</div>
                        </div>
                        <div className="space-y-1">
                          {[
                            { id: 'cf1', name: 'Contract_Draft.pdf', size: 1048576, modified: '2 days ago', type: 'pdf' },
                            { id: 'cf2', name: 'Identity_Proof.jpg', size: 2097152, modified: 'Yesterday', type: 'image' },
                            { id: 'cf3', name: 'Tax_Exemption_Form.pdf', size: 524288, modified: '1 week ago', type: 'pdf' },
                            { id: 'cf4', name: 'Company_Logo_HighRes.png', size: 4194304, modified: '3 hours ago', type: 'image' },
                            { id: 'cf5', name: 'Previous_Invoices_Bundle.zip', size: 8388608, modified: 'May 12, 2025', type: 'zip' },
                          ]
                            .filter(f => f.name.toLowerCase().includes(cloudSearchQuery.toLowerCase()))
                            .map((file) => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (selectedCloudFiles.find(sf => sf.id === file.id)) {
                                    setSelectedCloudFiles(selectedCloudFiles.filter(sf => sf.id !== file.id));
                                  } else {
                                    setSelectedCloudFiles([...selectedCloudFiles, file]);
                                  }
                                }}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedCloudFiles.find(sf => sf.id === file.id)
                                  ? ''
                                  : 'bg-white border-transparent hover:bg-slate-50'
                                  }`}
                                style={selectedCloudFiles.find(sf => sf.id === file.id) ? { backgroundColor: "rgba(21, 99, 114, 0.1)", borderColor: "#156372" } : {}}
                              >
                                <div className="w-[60%] flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${selectedCloudFiles.find(sf => sf.id === file.id) ? '' : 'bg-slate-100 text-slate-500'
                                    }`}
                                    style={selectedCloudFiles.find(sf => sf.id === file.id) ? { backgroundColor: "rgba(21, 99, 114, 0.2)", color: "#156372" } : {}}>
                                    <FileText size={16} />
                                  </div>
                                  <span className="text-[14px] font-medium text-slate-700">{file.name}</span>
                                </div>
                                <div className="w-[20%] text-right text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                                <div className="w-[20%] text-right text-xs text-slate-500">{file.modified}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : selectedCloudProvider === "evernote" ? (
                    /* Evernote Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Evernote Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
                            <svg viewBox="0 0 100 100" className="w-20 h-20">
                              <path
                                d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                                fill="#2D2926"
                              />
                              <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                              <path
                                d="M 40 40 Q 35 45 35 50 Q 35 55 40 60"
                                stroke="#2D2926"
                                strokeWidth="2.5"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="underline"
                            style={{ color: "#156372" }}
                            onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                            onMouseLeave={(e) => e.target.style.color = "#156372"}
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Evernote Button */}
                      <button
                        className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold hover:bg-[#008A24] transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://accounts.evernote.com/login",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Evernote
                      </button>
                    </div>
                  ) : (
                    /* Default Content for Taban Books Drive */
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                        <div className="relative w-full h-full">
                          <div className="absolute inset-0 flex items-end justify-center">
                            <div className="relative">
                              <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#156372" }}>
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                                <div className="w-8 h-6 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            <div className="relative ml-8">
                              <div className="w-20 h-28 bg-purple-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                                <div className="text-2xl font-bold text-purple-600">A</div>
                              </div>
                            </div>
                            <div className="relative ml-8">
                              <div className="w-20 h-28 bg-pink-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                                <div className="space-y-1">
                                  <div className="w-12 h-1 bg-pink-600 rounded"></div>
                                  <div className="w-10 h-1 bg-pink-600 rounded"></div>
                                  <div className="w-8 h-1 bg-pink-600 rounded"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="absolute top-12 right-12 w-4 h-4 transform rotate-45" style={{ backgroundColor: "#156372" }}></div>
                          <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                          <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                        Taban Books Drive is an online file sync, storage and content collaboration platform.
                      </p>

                      <button
                        className="px-6 py-2.5 text-white rounded-md text-sm font-semibold shadow-sm cursor-pointer transition-all"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.target.style.opacity = "1"}
                        onClick={() => {
                          window.open(
                            "https://drive.tabanbooks.com",
                            "_blank"
                          );
                        }}
                      >
                        Set up your team
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedCloudFiles.length > 0) {
                      const newFiles = selectedCloudFiles.map(f => ({
                        id: Date.now() + Math.random(),
                        name: f.name,
                        size: f.size,
                        isCloud: true,
                        provider: selectedCloudProvider
                      }));
                      setFormData(prev => ({
                        ...prev,
                        documents: [...prev.documents, ...newFiles]
                      }));
                    }
                    setIsCloudPickerOpen(false);
                    setSelectedCloudFiles([]);
                  }}
                  className={`px-6 py-2 text-white rounded-md text-sm font-medium transition-all cursor-pointer ${selectedCloudFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => {
                    if (selectedCloudFiles.length > 0) e.target.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCloudFiles.length > 0) e.target.style.opacity = "1";
                  }}
                  disabled={selectedCloudFiles.length === 0}
                >
                  Attach ({selectedCloudFiles.length})
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Items in Bulk Modal */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelBulkAdd}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Items in Bulk</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900"
                onClick={handleCancelBulkAdd}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Pane - Item Search and List */}
              <div className="w-1/2 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Type to search or scan the barcode of the item."
                      value={bulkAddSearch}
                      onChange={(e) => setBulkAddSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {getBulkFilteredItems().map(item => {
                    const isSelected = bulkSelectedItems.find(selected => selected.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between ${isSelected ? "" : ""
                          }`}
                        style={isSelected ? { backgroundColor: "rgba(21, 99, 114, 0.1)" } : {}}
                        onClick={() => handleBulkItemToggle(item)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            SKU: {item.sku} Rate: {formData.currency}{item.rate.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Stock on Hand {item.stockOnHand.toFixed(2)} {item.unit}
                          </div>
                          {isSelected && (
                            <div className="mt-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#156372" }}>
                              <Check size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane - Selected Items */}
              <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">Selected Items</span>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                      {bulkSelectedItems.length}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Quantity: {bulkSelectedItems.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {bulkSelectedItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      Click the item names from the left pane to select them.
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {bulkSelectedItems.map(selectedItem => (
                        <div key={selectedItem.id} className="p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{selectedItem.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {selectedItem.sku} â€¢ {formData.currency}{selectedItem.rate.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={selectedItem.quantity || 1}
                              onChange={(e) => handleBulkItemQuantityChange(selectedItem.id, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBulkItemToggle(selectedItem);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                className="px-6 py-2 text-white rounded-md text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: "#156372" }}
                onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = "#0D4A52")}
                onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = "#156372")}
                onClick={handleAddBulkItems}
                disabled={bulkSelectedItems.length === 0}
              >
                Add Items
              </button>
              <button
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                onClick={handleCancelBulkAdd}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Customer Search Modal */}
      {customerSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setCustomerSearchModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Advanced Customer Search</h2>
              <button
                type="button"
                onClick={() => setCustomerSearchModalOpen(false)}
                className="w-8 h-8 text-white rounded flex items-center justify-center cursor-pointer transition-all"
                style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                onMouseLeave={(e) => e.target.style.opacity = "1"}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCustomerSearchCriteriaOpen(!customerSearchCriteriaOpen)}
                    className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {customerSearchCriteria}
                    <ChevronDown size={16} />
                  </button>
                  {customerSearchCriteriaOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px]">
                      {["Display Name", "Email", "Company Name", "Phone"].map((criteria) => (
                        <button
                          key={criteria}
                          type="button"
                          onClick={() => {
                            setCustomerSearchCriteria(criteria);
                            setCustomerSearchCriteriaOpen(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-600 hover:text-white"
                        >
                          {criteria}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
                  placeholder="Enter search term"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCustomerSearch}
                  className="px-6 py-2 text-white rounded-md font-medium cursor-pointer transition-all"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CUSTOMER NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">COMPANY NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PHONE</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerPaginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {customerSearchTerm ? "No customers found" : "Enter a search term and click Search"}
                      </td>
                    </tr>
                  ) : (
                    customerPaginatedResults.map((customer) => (
                      <tr
                        key={customer.id || customer.name}
                        className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                          handleCustomerSelect(customer);
                          setCustomerSearchModalOpen(false);
                          setCustomerSearchTerm("");
                          setCustomerSearchResults([]);
                        }}
                      >
                        <td className="px-4 py-3 text-sm hover:underline" style={{ color: "#156372" }} onMouseEnter={(e) => e.target.style.color = "#0D4A52"} onMouseLeave={(e) => e.target.style.color = "#156372"}>
                          {customer.displayName || customer.name || ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{customer.email || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{customer.companyName || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{customer.workPhone || customer.mobile || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {customerSearchResults.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerSearchPage(prev => Math.max(1, prev - 1))}
                    disabled={customerSearchPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &lt;
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {customerStartIndex + 1} - {Math.min(customerEndIndex, customerSearchResults.length)} of {customerSearchResults.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomerSearchPage(prev => Math.min(customerTotalPages, prev + 1))}
                    disabled={customerSearchPage >= customerTotalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Quick New Customer Modal */}
      {typeof document !== "undefined" && document.body && createPortal(
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
          onClick={() => {
            setIsNewCustomerQuickActionOpen(false);
            reloadCustomersForSalesReceipt();
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Customer (Quick Action)</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isReloadingCustomerFrame || isAutoSelectingCustomerFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setIsReloadingCustomerFrame(true);
                    setCustomerQuickActionFrameKey(prev => prev + 1);
                  }}
                >
                  {isReloadingCustomerFrame ? "Reloading..." : "Reload Form"}
                </button>
                <button
                  type="button"
                  disabled={isRefreshingCustomersQuickAction || isAutoSelectingCustomerFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={async () => {
                    setIsRefreshingCustomersQuickAction(true);
                    await reloadCustomersForSalesReceipt();
                    setIsRefreshingCustomersQuickAction(false);
                  }}
                >
                  {isRefreshingCustomersQuickAction ? "Refreshing..." : "Refresh Customers"}
                </button>
              </div>
              <button
                type="button"
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                onClick={() => {
                  setIsNewCustomerQuickActionOpen(false);
                  reloadCustomersForSalesReceipt();
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 p-2 bg-gray-100">
              <iframe
                key={customerQuickActionFrameKey}
                title="New Customer Quick Action"
                src="/sales/customers/new?embed=1"
                loading="eager"
                onLoad={async () => {
                  if (isReloadingCustomerFrame) {
                    setIsReloadingCustomerFrame(false);
                  }
                  await tryAutoSelectNewCustomerFromQuickAction();
                }}
                className="w-full h-full bg-white rounded border border-gray-200"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick New Salesperson Modal */}
      {typeof document !== "undefined" && document.body && createPortal(
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewSalespersonQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
          onClick={() => {
            setIsNewSalespersonQuickActionOpen(false);
            reloadSalespersonsForSalesReceipt();
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1200px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Salesperson (Quick Action)</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isReloadingSalespersonFrame || isAutoSelectingSalespersonFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setIsReloadingSalespersonFrame(true);
                    setSalespersonQuickActionFrameKey(prev => prev + 1);
                  }}
                >
                  {isReloadingSalespersonFrame ? "Reloading..." : "Reload Form"}
                </button>
                <button
                  type="button"
                  disabled={isRefreshingSalespersonsQuickAction || isAutoSelectingSalespersonFromQuickAction}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={async () => {
                    setIsRefreshingSalespersonsQuickAction(true);
                    await reloadSalespersonsForSalesReceipt();
                    setIsRefreshingSalespersonsQuickAction(false);
                  }}
                >
                  {isRefreshingSalespersonsQuickAction ? "Refreshing..." : "Refresh Salespersons"}
                </button>
              </div>
              <button
                type="button"
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                onClick={() => {
                  setIsNewSalespersonQuickActionOpen(false);
                  reloadSalespersonsForSalesReceipt();
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 p-2 bg-gray-100">
              <iframe
                key={salespersonQuickActionFrameKey}
                title="New Salesperson Quick Action"
                src="/sales/salespersons/new?embed=1"
                loading="eager"
                onLoad={async () => {
                  if (isReloadingSalespersonFrame) {
                    setIsReloadingSalespersonFrame(false);
                  }
                  await tryAutoSelectNewSalespersonFromQuickAction();
                }}
                className="w-full h-full bg-white rounded border border-gray-200"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div >
  );
}


