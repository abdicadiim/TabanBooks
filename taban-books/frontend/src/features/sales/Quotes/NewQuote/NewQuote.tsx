import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Search, ArrowUpDown, X,
  MessageSquare, Briefcase, User, Calendar, Plus, Paperclip, Minus, Check,
  Trash2, MoreVertical, Edit2, Edit3, Settings, Info, Tag, HelpCircle, HardDrive,
  Layers, Box, Folder, Cloud, CheckCircle, Calculator, Image as ImageIcon, GripVertical,
  FileText, CreditCard, Square, Upload, Loader2, LayoutGrid, PlusCircle
} from "lucide-react";
import { getCustomers, saveQuote, getQuotes, getQuoteById, updateQuote, getProjects, getSalespersonsFromAPI, updateSalesperson, getItemsFromAPI, getTaxes, Customer, Tax, Salesperson, Quote, ContactPerson, Project } from "../../salesModel";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { customersAPI, projectsAPI, salespersonsAPI, quotesAPI, itemsAPI, currenciesAPI, contactPersonsAPI, vendorsAPI, settingsAPI, chartOfAccountsAPI, documentsAPI } from "../../../../services/api";
import { useAccountSelect } from "../../../../hooks/useAccountSelect";
import { useCurrency } from "../../../../hooks/useCurrency";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import toast from "react-hot-toast";

// taxOptions REMOVED: Now fetching from backend API

// Sample salespersons data - REMOVED: Now using backend API only

// Sample items data - will be replaced by items from localStorage
const defaultSampleItems = [
  { id: "1", name: "iphone", sku: "Ip011", rate: 20.00, stockOnHand: 0.00, unit: "box" },
  { id: "2", name: "laptop", sku: "Lp022", rate: 1500.00, stockOnHand: 5.00, unit: "piece" },
  { id: "3", name: "keyboard", sku: "Kb033", rate: 45.00, stockOnHand: 12.00, unit: "piece" },
  { id: "4", name: "mouse", sku: "Ms044", rate: 25.00, stockOnHand: 8.00, unit: "piece" },
  { id: "5", name: "monitor", sku: "Mn055", rate: 300.00, stockOnHand: 3.00, unit: "piece" },
];

const NewQuote = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseCurrencyCode } = useCurrency();
  const { quoteId } = useParams();
  const isEditMode = !!quoteId;
  const clonedDataFromState = location.state?.clonedData || null;
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "send">(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    quoteNumber: "QT-000002",
    referenceNumber: "",
    quoteDate: new Date().toLocaleDateString("en-GB"), // DD/MM/YYYY format which our salesModel now handles
    expiryDate: "",
    salesperson: "",
    projectName: "",
    subject: "",
    taxExclusive: "Tax Exclusive",
    items: [
      { id: 1, itemType: "item", itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 }
    ],
    subTotal: 0,
    totalTax: 0,
    discount: 0,
    discountType: "percent",
    discountAccount: "General Income",
    shippingCharges: 0,
    shippingChargeTax: "",
    adjustment: 0,
    roundOff: 0,
    total: 0,
    currency: baseCurrencyCode || "USD",
    customerNotes: "Looking forward for your business.",
    termsAndConditions: "",
    attachedFiles: []
  });
  const hasAppliedCloneRef = useRef(false);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "inclusive";

  const toNumberSafe = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolveSubtotalFromQuoteLike = (quoteLike: any, fallbackItems: any[] = []) => {
    const explicitSubtotal = toNumberSafe(quoteLike?.subTotal ?? quoteLike?.subtotal);
    if (explicitSubtotal > 0) return explicitSubtotal;

    const computedFromItems = (Array.isArray(fallbackItems) ? fallbackItems : []).reduce((sum, item) => {
      const quantity = toNumberSafe(item?.quantity);
      const rate = toNumberSafe(item?.rate ?? item?.unitPrice ?? item?.price);
      return sum + (quantity * rate);
    }, 0);
    return computedFromItems;
  };

  const normalizeDiscountForForm = (quoteLike: any, subTotalValue: number, taxValue: number) => {
    const discountTypeRaw = String(quoteLike?.discountType || "percent").toLowerCase();
    const discountTypeValue = discountTypeRaw === "amount" ? "amount" : "percent";
    const rawDiscount = toNumberSafe(quoteLike?.discount);

    if (discountTypeValue === "amount" || rawDiscount <= 0 || subTotalValue <= 0) {
      return { discountValue: rawDiscount, discountTypeValue };
    }

    const taxModeRaw = String(quoteLike?.taxExclusive || "Tax Exclusive").toLowerCase();
    const isInclusive = taxModeRaw.includes("inclusive");
    const shipping = toNumberSafe(quoteLike?.shippingCharges);
    const adjustment = toNumberSafe(quoteLike?.adjustment);
    const roundOff = toNumberSafe(quoteLike?.roundOff);
    const totalValue = toNumberSafe(quoteLike?.total ?? quoteLike?.amount);

    const totalAssumingPercent =
      subTotalValue +
      (isInclusive ? 0 : taxValue) -
      ((subTotalValue * rawDiscount) / 100) +
      shipping +
      adjustment +
      roundOff;

    const totalAssumingAmount =
      subTotalValue +
      (isInclusive ? 0 : taxValue) -
      rawDiscount +
      shipping +
      adjustment +
      roundOff;

    const looksLikeAmount =
      rawDiscount > 100 ||
      (Math.abs(totalValue - totalAssumingAmount) + 0.01 < Math.abs(totalValue - totalAssumingPercent));

    if (!looksLikeAmount) {
      return { discountValue: rawDiscount, discountTypeValue: "percent" };
    }

    return {
      discountValue: (rawDiscount / subTotalValue) * 100,
      discountTypeValue: "percent"
    };
  };

  useEffect(() => {
    if (isEditMode || !clonedDataFromState || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedDataFromState as any;
    const toDisplayDate = (value: any, fallback = "") => {
      if (!value) return fallback;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-GB");
      return String(value);
    };

    const mappedItems = Array.isArray(cloned.items) && cloned.items.length > 0
      ? cloned.items.map((item: any, index: number) => {
        const quantity = Number(item.quantity ?? 1) || 1;
        const rate = Number(item.rate ?? item.price ?? item.unitPrice ?? 0) || 0;
        const amount = Number(item.amount ?? item.total ?? (quantity * rate)) || 0;
        const rawTaxSource =
          item?.taxId ??
          (item?.tax && typeof item.tax === "object"
            ? (
              item.tax?._id ||
              item.tax?.id ||
              item.tax?.taxId ||
              item.tax?.name ||
              item.tax?.taxName ||
              item.tax?.rate ||
              (typeof item.tax?.toString === "function" ? item.tax.toString() : "")
            )
            : item?.tax) ??
          item?.taxName ??
          item?.taxLabel ??
          item?.salesTaxRate ??
          item?.taxRate ??
          "";
        const normalizedRawTax = String(rawTaxSource || "").trim() === "[object Object]" ? "" : rawTaxSource;
        const parsedTaxRate = Number(item?.taxRate ?? item?.salesTaxRate ?? (item?.tax && typeof item.tax === "object" ? item.tax?.rate : item?.tax) ?? 0) || 0;
        const explicitTaxAmount = Number(item?.taxAmount || 0) || 0;
        const derivedTaxRate = parsedTaxRate > 0
          ? parsedTaxRate
          : (amount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / amount) * 100 : 0);
        const matchedTax = (() => {
          const candidate = String(normalizedRawTax || "").trim();
          if (!candidate) return null;
          const byId = taxes.find((t: any) => String(t.id || t._id) === candidate);
          if (byId) return byId;
          const byName = taxes.find((t: any) => String(t.name || t.taxName || "").toLowerCase() === candidate.toLowerCase());
          if (byName) return byName;
          const asRate = parseFloat(candidate.replace("%", ""));
          if (Number.isFinite(asRate) && asRate > 0) {
            return taxes.find((t: any) => Number(t.rate || 0) === asRate) || null;
          }
          return null;
        })();
        const resolvedTaxId = matchedTax ? String((matchedTax as any).id || (matchedTax as any)._id || "") : "";
        const resolvedTaxRate = matchedTax ? (Number((matchedTax as any).rate) || derivedTaxRate) : derivedTaxRate;

        return {
          id: index + 1,
          itemType: item.itemType || "item",
          itemDetails: item.itemDetails || item.name || item.description || "",
          quantity,
          rate,
          tax: String(resolvedTaxId || normalizedRawTax || (resolvedTaxRate > 0 ? resolvedTaxRate : "")),
          taxRate: resolvedTaxRate,
          amount
        };
      })
      : undefined;

    const clonedSubTotal = resolveSubtotalFromQuoteLike(cloned, mappedItems || []);
    const clonedTax = toNumberSafe(cloned.totalTax ?? cloned.taxAmount ?? cloned.tax);
    const normalizedClonedDiscount = normalizeDiscountForForm(cloned, clonedSubTotal, clonedTax);

    setFormData(prev => ({
      ...prev,
      customerName: cloned.customerName || cloned.customer?.displayName || cloned.customer?.name || prev.customerName,
      referenceNumber: cloned.referenceNumber || prev.referenceNumber,
      quoteDate: toDisplayDate(cloned.quoteDate || cloned.date, prev.quoteDate),
      expiryDate: toDisplayDate(cloned.expiryDate, prev.expiryDate),
      salesperson: cloned.salesperson || prev.salesperson,
      salespersonId: cloned.salespersonId || prev.salespersonId,
      projectName: cloned.projectName || prev.projectName,
      subject: cloned.subject || prev.subject,
      taxExclusive: cloned.taxExclusive || prev.taxExclusive,
      items: mappedItems || prev.items,
      subTotal: clonedSubTotal || prev.subTotal,
      totalTax: clonedTax || prev.totalTax,
      discount: normalizedClonedDiscount.discountValue,
      discountType: normalizedClonedDiscount.discountTypeValue,
      discountAccount: cloned.discountAccount || prev.discountAccount,
      shippingCharges: Number(cloned.shippingCharges ?? prev.shippingCharges) || 0,
      shippingChargeTax: String(cloned.shippingChargeTax || cloned.shippingTax || prev.shippingChargeTax || ""),
      adjustment: Number(cloned.adjustment ?? prev.adjustment) || 0,
      roundOff: Number(cloned.roundOff ?? prev.roundOff) || 0,
      total: Number(cloned.total ?? prev.total) || 0,
      currency: cloned.currency || prev.currency,
      customerNotes: cloned.customerNotes || cloned.notes || prev.customerNotes,
      termsAndConditions: cloned.termsAndConditions || cloned.terms || prev.termsAndConditions,
      attachedFiles: []
    }));
  }, [clonedDataFromState, isEditMode]);

  const {
    isOpen: isDiscountAccountOpen,
    setIsOpen: setIsDiscountAccountOpen,
    searchTerm: discountAccountSearch,
    setSearchTerm: setDiscountAccountSearch,
    filteredAccounts: filteredDiscountAccounts,
    groupedAccounts: groupedDiscountAccounts,
    dropdownRef: discountAccountDropdownRef
  } = useAccountSelect();

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billingAddress, setBillingAddress] = useState<any | null>(null);
  const [shippingAddress, setShippingAddress] = useState<any | null>(null);

  // Customer search modal state
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);
  const [isNewCustomerQuickActionOpen, setIsNewCustomerQuickActionOpen] = useState(false);
  const [customerQuickActionFrameKey, setCustomerQuickActionFrameKey] = useState(0);
  const [isNewProjectQuickActionOpen, setIsNewProjectQuickActionOpen] = useState(false);
  const [projectQuickActionFrameKey, setProjectQuickActionFrameKey] = useState(0);
  const [customerQuickActionBaseIds, setCustomerQuickActionBaseIds] = useState<string[]>([]);
  const [projectQuickActionBaseIds, setProjectQuickActionBaseIds] = useState<string[]>([]);
  const [isRefreshingCustomersQuickAction, setIsRefreshingCustomersQuickAction] = useState(false);
  const [isRefreshingProjectsQuickAction, setIsRefreshingProjectsQuickAction] = useState(false);
  const [isReloadingCustomerFrame, setIsReloadingCustomerFrame] = useState(false);
  const [isReloadingProjectFrame, setIsReloadingProjectFrame] = useState(false);
  const [isAutoSelectingCustomerFromQuickAction, setIsAutoSelectingCustomerFromQuickAction] = useState(false);
  const [isAutoSelectingProjectFromQuickAction, setIsAutoSelectingProjectFromQuickAction] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [manageSalespersonMenuOpen, setManageSalespersonMenuOpen] = useState<string | null>(null);
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [isAddContactPersonModalOpen, setIsAddContactPersonModalOpen] = useState(false);
  const [contactPersonData, setContactPersonData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    workPhonePrefix: "+358",
    mobile: "",
    mobilePrefix: "+358",
    skype: "",
    designation: "",
    department: "",
    profileImage: null as File | null
  });

  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string, boolean>>({});
  const [itemSearches, setItemSearches] = useState<Record<string, string>>({});
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const itemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [openItemMenuId, setOpenItemMenuId] = useState<string | number | null>(null);
  const itemMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddInsertIndex, setBulkAddInsertIndex] = useState(null);
  const [bulkAddSearch, setBulkAddSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<any[]>([]);
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<number[]>([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const bulkActionsRef = useRef(null);
  const [isTheseDropdownOpen, setIsTheseDropdownOpen] = useState(false);
  const [showAdditionalInformation, setShowAdditionalInformation] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isReportingTagsModalOpen, setIsReportingTagsModalOpen] = useState(false);
  const [isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [newItemData, setNewItemData] = useState({
    type: "Goods",
    name: "",
    sku: "",
    unit: "",
    sellingPrice: "",
    salesAccount: "Sales",
    salesDescription: "",
    salesTax: "",
    costPrice: "",
    purchaseAccount: "Cost of Goods Sold",
    purchaseDescription: "",
    purchaseTax: "",
    preferredVendor: "",
    sellable: true,
    purchasable: true,
    trackInventory: false
  });
  const [newItemImage, setNewItemImage] = useState(null);
  const newItemImageRef = useRef(null);

  // Project state
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCustomerIdForProjects, setSelectedCustomerIdForProjects] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    projectName: "",
    projectCode: "",
    customerName: "",
    customerId: "",
    billingMethod: "Fixed Cost for Project",
    totalProjectCost: "",
    description: "",
    costBudget: "",
    revenueBudget: "",
    users: [],
    tasks: [{ id: 1, taskName: "", description: "" }],
    addToWatchlist: true
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const projectDropdownRef = useRef(null);
  const [isQuoteDatePickerOpen, setIsQuoteDatePickerOpen] = useState(false);
  const [isExpiryDatePickerOpen, setIsExpiryDatePickerOpen] = useState(false);
  const [quoteDateCalendar, setQuoteDateCalendar] = useState(new Date());
  const [expiryDateCalendar, setExpiryDateCalendar] = useState(new Date());
  const customerDropdownRef = useRef(null);
  const salespersonDropdownRef = useRef(null);
  const quoteDatePickerRef = useRef(null);
  const expiryDatePickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("taban");

  // Load customers from localStorage
  const [customers, setCustomers] = useState<Customer[]>([]);

  const isCustomerActive = (customer: any) => {
    const status = String(customer?.status || "").toLowerCase();
    if (status) return status === "active";
    if (typeof customer?.isActive === "boolean") return customer.isActive;
    return true;
  };

  // Load items from localStorage
  const [availableItems, setAvailableItems] = useState(defaultSampleItems);

  // Quote number configuration state
  const [isQuoteNumberModalOpen, setIsQuoteNumberModalOpen] = useState(false);
  const [quoteNumberMode, setQuoteNumberMode] = useState("auto"); // "auto" or "manual"
  const [quotePrefix, setQuotePrefix] = useState("QT-");
  const [quoteNextNumber, setQuoteNextNumber] = useState("000002");

  // Currency Mapping state
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({});

  // Contact Persons state
  const [contactPersons, setContactPersons] = useState([]);
  const [vendorContactPersons, setVendorContactPersons] = useState([]);
  const [selectedContactPersons, setSelectedContactPersons] = useState<ContactPerson[]>([]);
  const [isEmailCommunicationsOpen, setIsEmailCommunicationsOpen] = useState(false);

  const getCurrencySymbol = (currencyCode?: string | null): string => {
    if (!currencyCode) return "";
    const code = String(currencyCode).split(' - ')[0];

    // Look up in our dynamic currency map
    const symbol = currencyMap[code];

    // If we have a symbol that is different from the code, use it.
    // Otherwise return the code (3 letters).
    if (symbol && symbol !== code) {
      return symbol;
    }
    return code;
  };

  // Define months array before use
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results: Customer[] = [];

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

  // Update currency when baseCurrencyCode is loaded
  useEffect(() => {
    if (baseCurrencyCode && !isEditMode) {
      setFormData(prev => ({ ...prev, currency: baseCurrencyCode }));
    }
  }, [baseCurrencyCode, isEditMode]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load heavy dropdown data in parallel.
        const [
          customersResult,
          projectsResult,
          salespersonsResult,
          itemsResult,
          quoteNumberResult,
          currenciesResult,
          baseCurrencyResult,
          settingsResult,
          taxesResult,
          generalSettingsResult
        ] = await Promise.allSettled([
          getCustomers(),
          getProjects(),
          getSalespersonsFromAPI(),
          getItemsFromAPI(),
          quotesAPI.getNextNumber('QT-'),
          currenciesAPI.getAll(),
          isEditMode ? Promise.resolve(null) : currenciesAPI.getBaseCurrency(),
          isEditMode ? Promise.resolve(null) : settingsAPI.getQuotesSettings(),
          getTaxes(),
          fetch(`${API_BASE_URL}/settings/general`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          })
        ]);

        if (customersResult.status === "fulfilled") {
          const normalizedCustomers = (customersResult.value || []).map((c: any) => ({
            ...c,
            id: c._id || c.id,
            name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
          }));
          setCustomers(normalizedCustomers.filter(isCustomerActive));
        } else {
          console.error("Error loading customers:", customersResult.reason);
          setCustomers([]);
        }

        if (projectsResult.status === "fulfilled") {
          setProjects(Array.isArray(projectsResult.value) ? projectsResult.value : []);
        } else {
          console.error("Error loading projects:", projectsResult.reason);
          setProjects([]);
        }

        if (salespersonsResult.status === "fulfilled") {
          const normalizedSalespersons = (salespersonsResult.value || []).map((s: any) => ({
            ...s,
            id: s._id || s.id,
            name: s.name || s.displayName || "Unknown"
          }));
          setSalespersons(normalizedSalespersons);
        } else {
          console.error("Error loading salespersons:", salespersonsResult.reason);
          setSalespersons([]);
        }

        if (itemsResult.status === "fulfilled") {
          const transformedItems = (itemsResult.value || []).map((item: any) => ({
            ...item,
            id: item._id || item.id,
            name: item.name || "",
            sku: item.sku || "",
            rate: item.sellingPrice || item.costPrice || item.rate || 0,
            stockOnHand: item.stockOnHand || item.quantityOnHand || item.stockQuantity || 0,
            unit: item.unit || item.unitOfMeasure || "pcs"
          }));
          setAvailableItems(transformedItems);
        } else {
          console.error("Error loading items:", itemsResult.reason);
          setAvailableItems([]);
        }

        if (taxesResult.status === "fulfilled") {
          const fetchedTaxes = (taxesResult.value || []).map((t: any) => ({
            ...t,
            id: t._id || t.id
          }));
          setTaxes(fetchedTaxes);
        } else {
          console.error("Error loading taxes:", taxesResult.reason);
          setTaxes([]);
        }

        if (quoteNumberResult.status === "fulfilled") {
          const quoteNumberResponse: any = quoteNumberResult.value;
          if (quoteNumberResponse && quoteNumberResponse.success && quoteNumberResponse.data) {
            setFormData(prev => ({ ...prev, quoteNumber: quoteNumberResponse.data.quoteNumber }));
            setQuoteNextNumber(String(quoteNumberResponse.data.nextNumber).padStart(6, '0'));
          }
        } else {
          console.error("Error loading next quote number:", quoteNumberResult.reason);
        }

        if (currenciesResult.status === "fulfilled") {
          const currenciesResponse: any = currenciesResult.value;
          if (currenciesResponse && currenciesResponse.success && currenciesResponse.data) {
            const mapping: any = {};
            currenciesResponse.data.forEach((curr: any) => {
              mapping[curr.code] = curr.symbol;
            });
            setCurrencyMap(mapping);
          }
        } else {
          console.error("Error loading currencies for mapping:", currenciesResult.reason);
        }

        if (!isEditMode && baseCurrencyResult.status === "fulfilled") {
          const baseCurrencyResponse: any = baseCurrencyResult.value;
          if (baseCurrencyResponse && baseCurrencyResponse.success && baseCurrencyResponse.data) {
            const code = baseCurrencyResponse.data.code || "USD";
            setFormData(prev => ({ ...prev, currency: code.split(' - ')[0] }));
          }
        }

        if (!isEditMode && settingsResult.status === "fulfilled") {
          const settingsResponse: any = settingsResult.value;
          if (settingsResponse && settingsResponse.success && settingsResponse.data) {
            const s = settingsResponse.data;
            setFormData(prev => ({
              ...prev,
              customerNotes: s.customerNotes || prev.customerNotes,
              termsAndConditions: s.termsConditions || prev.termsAndConditions
            }));
          }
        }

        if (generalSettingsResult.status === "fulfilled") {
          const response: any = generalSettingsResult.value;
          if (response?.ok) {
            const generalSettingsJson = await response.json();
            const s = generalSettingsJson?.data?.settings;
            if (s) {
              setEnabledSettings(s);
            }
          }
        }

        // Load all vendors for contact persons (not blocking initial render)
        loadVendorContactPersons();

        // Initialize calendar date for default quote date
        const defaultDate = "22/12/2025";
        const dateParts = defaultDate.split('/');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
          const year = parseInt(dateParts[2], 10);
          setQuoteDateCalendar(new Date(year, month, day));
        }

      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Centralized totals calculation
  useEffect(() => {
    setFormData(prev => {
      const totals = calculateAllTotals(prev.items, prev);

      // Only update if values actually changed to avoid unnecessary re-renders
      if (
        prev.subTotal === totals.subTotal &&
        prev.totalTax === totals.totalTax &&
        prev.total === totals.total &&
        prev.roundOff === totals.roundOff
      ) {
        return prev;
      }

      return {
        ...prev,
        ...totals
      };
    });
  }, [formData.items, formData.discount, formData.discountType, formData.shippingCharges, formData.shippingChargeTax, formData.adjustment, formData.taxExclusive, taxes, taxMode]);

  useEffect(() => {
    setFormData(prev => {
      const next = { ...prev };
      if (!showTransactionDiscount) {
        next.discount = 0;
        next.discountType = "percent";
      }
      if (!showShippingCharges) {
        next.shippingCharges = 0;
        next.shippingChargeTax = "";
      }
      if (!showAdjustment) {
        next.adjustment = 0;
      }
      if (taxMode === "inclusive") {
        next.taxExclusive = "Tax Inclusive";
      } else if (taxMode === "exclusive") {
        next.taxExclusive = "Tax Exclusive";
      }
      return next;
    });
  }, [showTransactionDiscount, showShippingCharges, showAdjustment, taxMode]);

  // Load quote data when in edit mode (after salespersons are loaded)
  useEffect(() => {
    const loadQuote = async () => {
      if (isEditMode && quoteId && salespersons.length >= 0) {
        try {
          let quote = await getQuoteById(quoteId);

          // Try numeric ID if not found
          if (!quote && !isNaN(parseInt(quoteId))) {
            quote = await getQuoteById(parseInt(quoteId));
          }

          // Fallback: if not found, try matching by quoteNumber
          if (!quote) {
            const quotes = await getQuotes();
            quote = quotes.find(q => q.quoteNumber === quoteId);
          }

          if (quote) {
            // Format dates for display
            const formatDateForInput = (dateString) => {
              if (!dateString) return "";
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return "";
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              } catch (error) {
                console.error("Error formatting date:", error);
                return "";
              }
            };

            // Map quote items to form items format
            // Map quote items to form items format
            const mappedItems = (quote.items || []).map((item, index) => {
              const quantity = parseFloat(item.quantity) || 1;
              const rate = parseFloat(item.unitPrice || item.rate || item.price) || 0;
              const amount = parseFloat(item.total || item.amount || (quantity * rate)) || 0;
              const rawTaxSource =
                item?.taxId ??
                (item?.tax && typeof item.tax === "object"
                  ? (
                    item.tax?._id ||
                    item.tax?.id ||
                    item.tax?.taxId ||
                    item.tax?.name ||
                    item.tax?.taxName ||
                    item.tax?.rate ||
                    (typeof item.tax?.toString === "function" ? item.tax.toString() : "")
                  )
                  : item?.tax) ??
                item?.taxName ??
                item?.taxLabel ??
                item?.salesTaxRate ??
                item?.taxRate ??
                "";
              const normalizedRawTax = String(rawTaxSource || "").trim() === "[object Object]" ? "" : rawTaxSource;
              const parsedTaxRate = parseFloat(String(
                item?.taxRate ??
                item?.salesTaxRate ??
                (item?.tax && typeof item.tax === "object" ? item.tax?.rate : item?.tax) ??
                0
              )) || 0;
              const explicitTaxAmount = parseFloat(String(item?.taxAmount ?? 0)) || 0;
              const derivedTaxRate = parsedTaxRate > 0
                ? parsedTaxRate
                : (amount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / amount) * 100 : 0);
              const matchedTax = (() => {
                const candidate = String(normalizedRawTax || "").trim();
                if (!candidate) return null;
                const byId = taxes.find((t: any) => String(t.id || t._id) === candidate);
                if (byId) return byId;
                const byName = taxes.find((t: any) => String(t.name || t.taxName || "").toLowerCase() === candidate.toLowerCase());
                if (byName) return byName;
                const asRate = parseFloat(candidate.replace("%", ""));
                if (Number.isFinite(asRate) && asRate > 0) {
                  return taxes.find((t: any) => Number(t.rate || 0) === asRate) || null;
                }
                return null;
              })();
              const resolvedTaxId = matchedTax ? String((matchedTax as any).id || (matchedTax as any)._id || "") : "";
              const resolvedTaxRate = matchedTax ? (Number((matchedTax as any).rate) || derivedTaxRate) : derivedTaxRate;

              return {
                id: item.item?._id || item.item || item._id || item.id || index + 1, // Map product ID if available
                itemDetails: item.name || item.itemName || item.itemDetails || "",
                name: item.name || item.itemName || "",
                quantity,
                rate,
                tax: String(resolvedTaxId || normalizedRawTax || (resolvedTaxRate > 0 ? resolvedTaxRate : "")),
                taxRate: resolvedTaxRate,
                amount,
                description: item.description || ""
              };
            });

            const subTotalValue = resolveSubtotalFromQuoteLike(quote, mappedItems);
            const totalTaxValue = toNumberSafe(quote.taxAmount ?? quote.tax);
            const normalizedDiscount = normalizeDiscountForForm(quote, subTotalValue, totalTaxValue);

            // Get customer name - check both customer and customerName fields
            const customerName = quote.customerName || quote.customer || "";

            setFormData({
              customerName: customerName,
              quoteNumber: quote.quoteNumber || quote.id || "",
              referenceNumber: quote.referenceNumber || "",
              quoteDate: formatDateForInput(quote.quoteDate || quote.date),
              expiryDate: formatDateForInput(quote.expiryDate),
              salesperson: quote.salesperson || "",
              projectName: quote.projectName || "",
              subject: quote.subject || "",
              taxExclusive: quote.taxExclusive || "Tax Exclusive",
              items: mappedItems.length > 0 ? mappedItems : [{ id: 1, itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 }],
              subTotal: subTotalValue,
              totalTax: totalTaxValue,
              discount: normalizedDiscount.discountValue,
              discountType: normalizedDiscount.discountTypeValue,
              shippingCharges: parseFloat(quote.shippingCharges || 0),
              shippingChargeTax: String((quote as any).shippingChargeTax || (quote as any).shippingTax || ""),
              adjustment: parseFloat(quote.adjustment || 0),
              roundOff: parseFloat(quote.roundOff || 0),
              total: parseFloat(quote.total || quote.amount || 0),
              currency: quote.currency || "AMD",
              customerNotes: quote.customerNotes || "Looking forward for your business.",
              termsAndConditions: quote.termsAndConditions || "",
              attachedFiles: quote.attachedFiles || []
            });

            // Set selected customer if exists - check both customer and customerName
            if (customerName) {
              const loadedCustomers = await getCustomers();
              const customer = loadedCustomers.find(c =>
                c.name === customerName || c.name === quote.customer || c.name === quote.customerName
              );
              if (customer) {
                setSelectedCustomer(customer);

                // Load projects for this customer so the dropdown is populated
                const customerId = customer.id || customer._id;
                if (customerId) {
                  try {
                    // Try fetching for specific customer first
                    const customerProjectsResponse = await projectsAPI.getByCustomer(customerId);
                    if (customerProjectsResponse && customerProjectsResponse.success && customerProjectsResponse.data) {
                      setProjects(customerProjectsResponse.data);
                    } else {
                      // Fallback: fetch all and filter
                      const allProjectsResponse = await projectsAPI.getAll();
                      if (allProjectsResponse && allProjectsResponse.success && allProjectsResponse.data) {
                        const customerProjects = allProjectsResponse.data.filter(p =>
                          p.customer?._id === customerId || p.customer === customerId || p.customerId === customerId
                        );
                        setProjects(customerProjects);
                      }
                    }
                  } catch (err) {
                    console.error("Error loading customer projects in edit:", err);
                  }
                }
              }
            }

            // Set selected salesperson if exists
            if (quote.salesperson || quote.salespersonId) {
              // Ensure salespersons are loaded or use the one from quote if needed
              const salesperson = salespersons.find(s =>
                (s.name === quote.salesperson) ||
                (s._id === quote.salespersonId) ||
                (s.id === quote.salespersonId)
              );
              if (salesperson) {
                setSelectedSalesperson(salesperson);
              } else if (quote.salesperson) {
                setSelectedSalesperson({ name: quote.salesperson, _id: quote.salespersonId });
              }
            }

            // Set selected project if exists
            if (quote.projectName || quote.projectId) {
              // Load projects and find matching project
              try {
                const projectsResponse = await projectsAPI.getAll();
                if (projectsResponse && projectsResponse.success && projectsResponse.data) {
                  const project = projectsResponse.data.find(p =>
                    (quote.projectId && (p._id === quote.projectId || p.id === quote.projectId)) ||
                    ((p.projectName || p.name) === quote.projectName)
                  );
                  if (project) {
                    setSelectedProject(project);
                    setFormData(prev => ({ ...prev, projectName: project.projectName || project.name }));
                  }
                } else {
                  const loadedProjects = await getProjects();
                  const project = loadedProjects.find(p =>
                    (quote.projectId && (p._id === quote.projectId || p.id === quote.projectId)) ||
                    ((p.projectName || p.name) === quote.projectName)
                  );
                  if (project) {
                    setSelectedProject(project);
                    setFormData(prev => ({ ...prev, projectName: project.projectName || project.name }));
                  }
                }
              } catch (error) {
                console.error("Error loading projects for matching:", error);
                const loadedProjects = await getProjects();
                const project = loadedProjects.find(p =>
                  (quote.projectId && (p._id === quote.projectId || p.id === quote.projectId)) ||
                  ((p.projectName || p.name) === quote.projectName)
                );
                if (project) {
                  setSelectedProject(project);
                  setFormData(prev => ({ ...prev, projectName: project.projectName || project.name }));
                }
              }
            }
          } else {
            console.error("Quote not found with ID:", quoteId);
          }
        } catch (error) {
          console.error("Error loading quote for edit:", error);
        }
      }
    };

    loadQuote();
  }, [isEditMode, quoteId, salespersons]);

  // Handle selected project when returning from new project form
  useEffect(() => {
    const fetchAndSetProject = async () => {
      if (location.state?.selectedProject) {
        const projectName = location.state.selectedProject;
        // Load projects and find the newly created project
        try {
          const loadedProjects = await getProjects();
          if (Array.isArray(loadedProjects)) {
            const project = loadedProjects.find(p =>
              (p.projectName || p.name) === projectName
            );
            if (project) {
              setSelectedProject(project);
              setFormData(prev => ({
                ...prev,
                projectName: project.projectName || project.name
              }));
            }
          }
        } catch (error) {
          console.error("Error loading project after creation:", error);
        }
        // Clear the state to avoid re-selecting on re-render
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    fetchAndSetProject();
  }, [location.state?.selectedProject, navigate, location.pathname]);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date for display in input field (e.g., "28 Dec 2025")
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      // Parse dd/MM/yyyy format
      const parts = dateString.split("/");
      if (parts.length !== 3) return dateString;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return dateString;

      const dayStr = String(date.getDate()).padStart(2, "0");
      const monthStr = months[date.getMonth()];
      const yearStr = date.getFullYear();
      return `${dayStr} ${monthStr} ${yearStr}`;
    } catch (error) {
      return dateString;
    }
  };

  // Convert DD/MM/YYYY to ISO date string for API
  const convertToISODate = (dateString) => {
    if (!dateString) return null;
    try {
      // Parse dd/MM/yyyy format
      const parts = dateString.split("/");
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.error("Error converting date to ISO:", error);
      return null;
    }
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

  const handleDateSelect = (date, type) => {
    const formatted = formatDate(date);
    setFormData(prev => ({
      ...prev,
      [type]: formatted
    }));

    // Clear validation error if any
    if (formErrors[type]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[type];
        return newErrors;
      });
    }

    if (type === 'quoteDate') {
      setIsQuoteDatePickerOpen(false);
      setQuoteDateCalendar(date);
    } else {
      setIsExpiryDatePickerOpen(false);
      setExpiryDateCalendar(date);
    }
  };

  const navigateMonth = (direction, type) => {
    const calendar = type === 'quoteDate' ? quoteDateCalendar : expiryDateCalendar;
    const setCalendar = type === 'quoteDate' ? setQuoteDateCalendar : setExpiryDateCalendar;
    const newDate = new Date(calendar);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendar(newDate);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (salespersonDropdownRef.current && !salespersonDropdownRef.current.contains(event.target as Node)) {
        setIsSalespersonDropdownOpen(false);
      }
      if (quoteDatePickerRef.current && !quoteDatePickerRef.current.contains(event.target as Node)) {
        setIsQuoteDatePickerOpen(false);
      }
      if (expiryDatePickerRef.current && !expiryDatePickerRef.current.contains(event.target as Node)) {
        setIsExpiryDatePickerOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }

      // Handle item dropdowns
      Object.keys(openItemDropdowns).forEach(itemId => {
        if (openItemDropdowns[itemId]) {
          const ref = itemDropdownRefs.current[itemId];
          if (ref && !ref.contains(event.target as Node)) {
            setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });
      // Handle tax dropdowns
      Object.keys(openTaxDropdowns).forEach(itemId => {
        if (openTaxDropdowns[itemId]) {
          const ref = taxDropdownRefs.current[itemId];
          if (ref && !ref.contains(event.target as Node)) {
            setOpenTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });
      // Handle item menu dropdowns
      if (openItemMenuId !== null) {
        const ref = itemMenuRefs.current[String(openItemMenuId)];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenItemMenuId(null);
        }
      }

      // Handle bulk actions dropdown
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target)) {
        setIsBulkActionsOpen(false);
      }

      // Handle upload dropdown
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target)) {
        setIsUploadDropdownOpen(false);
      }
    };

    const hasOpenDropdown = isCustomerDropdownOpen || isSalespersonDropdownOpen ||
      isQuoteDatePickerOpen || isExpiryDatePickerOpen || isProjectDropdownOpen ||
      Object.values(openItemDropdowns).some(Boolean) || Object.values(openTaxDropdowns).some(Boolean) || openItemMenuId !== null || isBulkActionsOpen || isUploadDropdownOpen;

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen, isSalespersonDropdownOpen, isQuoteDatePickerOpen, isExpiryDatePickerOpen, isProjectDropdownOpen, openItemDropdowns, openTaxDropdowns, openItemMenuId, isBulkActionsOpen, isUploadDropdownOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      // Recalculate totals
      const totals = calculateAllTotals(updated.items, updated);

      return {
        ...updated,
        ...totals
      };
    });
  };

  const handleCustomerSelect = (customer) => {
    const customerId = customer.id || customer._id;
    const customerName = customer.name || customer.displayName || customer.companyName;
    setSelectedCustomer(customer);

    setFormData(prev => {
      const currency = (customer.currency || prev.currency || "USD").split(' - ')[0];
      return {
        ...prev,
        customerName: customerName,
        currency: currency
      };
    });

    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");

    // Clear validation error if any
    if (formErrors.customerName) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customerName;
        return newErrors;
      });
    }


    // Auto-fill billing address if customer has one
    if (customer.billingAddress) {
      setBillingAddress({
        attention: customer.billingAddress.attention || customer.billingAttention || "",
        street1: customer.billingAddress.street1 || customer.billingStreet1 || "",
        street2: customer.billingAddress.street2 || customer.billingStreet2 || "",
        city: customer.billingAddress.city || customer.billingCity || "",
        state: customer.billingAddress.state || customer.billingState || "",
        zipCode: customer.billingAddress.zipCode || customer.billingZipCode || "",
        country: customer.billingAddress.country || customer.billingCountry || "",
        phone: customer.billingAddress.phone || customer.billingPhone || ""
      });
    } else if (customer.billingStreet1 || customer.billingCity || customer.billingCountry) {
      // Fallback: check if billing fields are directly on customer object
      setBillingAddress({
        attention: customer.billingAttention || "",
        street1: customer.billingStreet1 || "",
        street2: customer.billingStreet2 || "",
        city: customer.billingCity || "",
        state: customer.billingState || "",
        zipCode: customer.billingZipCode || "",
        country: customer.billingCountry || "",
        phone: customer.billingPhone || ""
      });
    } else {
      setBillingAddress(null);
    }

    // Auto-fill shipping address if customer has one
    if (customer.shippingAddress) {
      setShippingAddress({
        attention: customer.shippingAddress.attention || customer.shippingAttention || "",
        street1: customer.shippingAddress.street1 || customer.shippingStreet1 || "",
        street2: customer.shippingAddress.street2 || customer.shippingStreet2 || "",
        city: customer.shippingAddress.city || customer.shippingCity || "",
        state: customer.shippingAddress.state || customer.shippingState || "",
        zipCode: customer.shippingAddress.zipCode || customer.shippingZipCode || "",
        country: customer.shippingAddress.country || customer.shippingCountry || "",
        phone: customer.shippingAddress.phone || customer.shippingPhone || ""
      });
    } else if (customer.shippingStreet1 || customer.shippingCity || customer.shippingCountry) {
      // Fallback: check if shipping fields are directly on customer object
      setShippingAddress({
        attention: customer.shippingAttention || "",
        street1: customer.shippingStreet1 || "",
        street2: customer.shippingStreet2 || "",
        city: customer.shippingCity || "",
        state: customer.shippingState || "",
        zipCode: customer.shippingZipCode || "",
        country: customer.shippingCountry || "",
        phone: customer.shippingPhone || ""
      });
    } else {
      setShippingAddress(null);
    }

    // Load contact persons for this customer
    if (customerId) {
      loadCustomerContactPersons(customerId);
    } else {
      setContactPersons([]);
    }

    // Load projects for this customer so the dropdown is populated
    if (customerId) {
      try {
        loadProjectsForCustomer(customerId);
      } catch (err) {
        console.error("Error loading customer projects:", err);
      }
    }
  };

  const reloadCustomersForQuote = async () => {
    try {
      const list = await getCustomers();
      const normalizedCustomers = (list || []).map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
      }));
      const activeCustomers = normalizedCustomers.filter(isCustomerActive);
      setCustomers(activeCustomers);
      return activeCustomers;
    } catch (error) {
      console.error("Error refreshing customers after quick action:", error);
      return [];
    }
  };

  const reloadProjectsForQuote = async () => {
    try {
      const loadedProjects = await getProjects();
      const normalizedProjects = Array.isArray(loadedProjects) ? loadedProjects : [];
      setProjects(normalizedProjects);
      return normalizedProjects;
    } catch (error) {
      console.error("Error refreshing projects after quick action:", error);
      setProjects([]);
      return [];
    }
  };

  const getEntityId = (entity: any) => String(entity?.id || entity?._id || "");

  const pickNewestEntity = (entities: any[]) => {
    if (!entities.length) return null;
    const toTime = (value: any) => {
      const t = new Date(value || 0).getTime();
      return Number.isFinite(t) ? t : 0;
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

  const openCustomerQuickAction = async () => {
    setIsCustomerDropdownOpen(false);
    setIsRefreshingCustomersQuickAction(true);
    const latestCustomers = await reloadCustomersForQuote();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const openProjectQuickAction = async () => {
    setIsProjectDropdownOpen(false);
    setIsRefreshingProjectsQuickAction(true);
    const latestProjects = await reloadProjectsForQuote();
    setProjectQuickActionBaseIds(latestProjects.map((p: any) => getEntityId(p)).filter(Boolean));
    setIsRefreshingProjectsQuickAction(false);
    setIsNewProjectQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForQuote();
      const baselineIds = new Set(customerQuickActionBaseIds);
      const newCustomers = latestCustomers.filter((c: any) => {
        const id = getEntityId(c);
        return id && !baselineIds.has(id);
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

  const tryAutoSelectNewProjectFromQuickAction = async () => {
    if (!isNewProjectQuickActionOpen || isAutoSelectingProjectFromQuickAction) return;
    setIsAutoSelectingProjectFromQuickAction(true);
    try {
      const latestProjects = await reloadProjectsForQuote();
      const baselineIds = new Set(projectQuickActionBaseIds);
      const newProjects = latestProjects.filter((p: any) => {
        const id = getEntityId(p);
        return id && !baselineIds.has(id);
      });

      if (newProjects.length > 0) {
        const newlyCreatedProject = pickNewestEntity(newProjects) || newProjects[newProjects.length - 1];
        handleProjectSelect(newlyCreatedProject);
        setProjectQuickActionBaseIds(latestProjects.map((p: any) => getEntityId(p)).filter(Boolean));
        setIsNewProjectQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingProjectFromQuickAction(false);
    }
  };

  const handleQuickActionCustomerCreated = (customerFromMessage: any) => {
    if (!customerFromMessage) return;
    const normalizedCustomer = {
      ...customerFromMessage,
      id: customerFromMessage?._id || customerFromMessage?.id,
      name: customerFromMessage?.displayName || customerFromMessage?.name || customerFromMessage?.companyName || "Unknown"
    };
    const normalizedId = getEntityId(normalizedCustomer);
    setCustomers(prev => {
      if (!normalizedId) return prev;
      const existingIndex = prev.findIndex((c: any) => getEntityId(c) === normalizedId);
      if (existingIndex === -1) {
        return [...prev, normalizedCustomer];
      }
      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...normalizedCustomer };
      return updated;
    });
    handleCustomerSelect(normalizedCustomer as any);
    setIsNewCustomerQuickActionOpen(false);
    setCustomerQuickActionBaseIds(prev => (normalizedId ? Array.from(new Set([...prev, normalizedId])) : prev));
  };

  const handleQuickActionProjectCreated = (projectFromMessage: any) => {
    if (!projectFromMessage) return;
    const normalizedProject = {
      ...projectFromMessage,
      id: projectFromMessage?._id || projectFromMessage?.id,
    };
    const normalizedId = getEntityId(normalizedProject);
    setProjects(prev => {
      if (!normalizedId) return prev;
      const existingIndex = prev.findIndex((p: any) => getEntityId(p) === normalizedId);
      if (existingIndex === -1) {
        return [...prev, normalizedProject as any];
      }
      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...normalizedProject };
      return updated;
    });
    handleProjectSelect(normalizedProject as any);
    setIsNewProjectQuickActionOpen(false);
    setProjectQuickActionBaseIds(prev => (normalizedId ? Array.from(new Set([...prev, normalizedId])) : prev));
  };

  useEffect(() => {
    const handleQuickActionCreatedMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || payload.type !== "quick-action-created") return;

      if (payload.entity === "customer" && isNewCustomerQuickActionOpen) {
        if (payload.data) {
          handleQuickActionCustomerCreated(payload.data);
          await reloadCustomersForQuote();
        } else {
          await tryAutoSelectNewCustomerFromQuickAction();
        }
      }

      if (payload.entity === "project" && isNewProjectQuickActionOpen) {
        if (payload.data) {
          handleQuickActionProjectCreated(payload.data);
          await reloadProjectsForQuote();
        } else {
          await tryAutoSelectNewProjectFromQuickAction();
        }
      }
    };

    window.addEventListener("message", handleQuickActionCreatedMessage);
    return () => {
      window.removeEventListener("message", handleQuickActionCreatedMessage);
    };
  }, [
    isNewCustomerQuickActionOpen,
    isNewProjectQuickActionOpen,
    customerQuickActionBaseIds,
    projectQuickActionBaseIds,
    isAutoSelectingCustomerFromQuickAction,
    isAutoSelectingProjectFromQuickAction
  ]);

  // Load contact persons for selected customer
  const loadCustomerContactPersons = async (customerId) => {
    try {
      const response = await contactPersonsAPI.getAll(customerId);
      if (response && response.success && response.data) {
        setContactPersons(response.data);
      } else {
        setContactPersons([]);
      }
    } catch (error) {
      console.error('Error loading customer contact persons:', error);
      setContactPersons([]);
    }
  };

  // Load all vendor contact persons
  const loadVendorContactPersons = async () => {
    try {
      // Get all vendors first
      const vendorsResponse = await vendorsAPI.getAll();
      if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
        const allContactPersons = [];

        // Load contact persons for each vendor
        for (const vendor of vendorsResponse.data) {
          try {
            const contactResponse = await contactPersonsAPI.getAll(vendor.id || vendor._id);
            if (contactResponse && contactResponse.success && contactResponse.data) {
              // Add vendor info to each contact person
              const vendorContacts = contactResponse.data.map(contact => ({
                ...contact,
                vendorName: vendor.name || vendor.displayName,
                vendorId: vendor.id || vendor._id,
                type: 'vendor'
              }));
              allContactPersons.push(...vendorContacts);
            }
          } catch (error) {
            console.error(`Error loading contact persons for vendor ${vendor.id}:`, error);
          }
        }

        setVendorContactPersons(allContactPersons);
      } else {
        setVendorContactPersons([]);
      }
    } catch (error) {
      console.error('Error loading vendor contact persons:', error);
      setVendorContactPersons([]);
    }
  };

  // Load projects for selected customer
  const loadProjectsForCustomer = async (customerId) => {
    setSelectedCustomerIdForProjects(customerId);
    // We already have all projects in the 'projects' state from initial load.
    // If we want to ensure we have the latest for this customer, we can fetch,
    // but we should append/update instead of replacing if we want to keep others.
    // However, filteredProjects will correctly show what's needed.
    try {
      const projectsResponse = await projectsAPI.getByCustomer(customerId);
      if (projectsResponse && projectsResponse.success && projectsResponse.data) {
        // Update projects list with these items, merging with existing
        setProjects(prev => {
          const existingIds = new Set(prev.map(p => p.id || p._id));
          const newProjects = projectsResponse.data.filter(p => !existingIds.has(p.id || p._id));
          return [...prev, ...newProjects];
        });
      }
    } catch (error) {
      console.error('Error loading projects for customer:', error);
    }
  };

  const handleSalespersonSelect = (salesperson) => {
    setSelectedSalesperson(salesperson);
    setFormData(prev => ({
      ...prev,
      salesperson: salesperson.name || "",
      salespersonId: salesperson.id || salesperson._id || null
    }));
    setIsSalespersonDropdownOpen(false);
    setSalespersonSearch("");
  };

  const filteredCustomers = customers.filter(customer => {
    if (!isCustomerActive(customer)) return false;
    const name = customer.name || customer.displayName || customer.companyName || "";
    const email = customer.email || "";
    return name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      email.toLowerCase().includes(customerSearch.toLowerCase());
  });

  const filteredSalespersons = salespersons.filter(salesperson =>
    salesperson.name.toLowerCase().includes(salespersonSearch.toLowerCase())
  );

  const filteredManageSalespersons = salespersons.filter(salesperson =>
    salesperson.name.toLowerCase().includes(manageSalespersonSearch.toLowerCase()) ||
    (salesperson.email && salesperson.email.toLowerCase().includes(manageSalespersonSearch.toLowerCase()))
  );

  const handleNewSalespersonChange = (e) => {
    const { name, value } = e.target;
    setNewSalespersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveAndSelectSalesperson = async () => {
    if (!newSalespersonData.name.trim()) {
      alert("Please enter a name for the salesperson");
      return;
    }

    try {
      // Save the new salesperson to backend
      const response = await salespersonsAPI.create({
        name: newSalespersonData.name.trim(),
        email: newSalespersonData.email.trim() || "",
        phone: ""
      });

      if (response && response.success && response.data) {
        const savedSalesperson = response.data;

        // Reload salespersons from backend to get updated list
        try {
          const salespersonsResponse = await salespersonsAPI.getAll();
          if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
            setSalespersons(salespersonsResponse.data);
          } else {
            // Fallback: add to existing list
            setSalespersons(prev => [...prev, savedSalesperson]);
          }
        } catch (error) {
          console.error('Error reloading salespersons:', error);
          // Fallback: add to existing list
          setSalespersons(prev => [...prev, savedSalesperson]);
        }

        // Select the new salesperson
        setSelectedSalesperson(savedSalesperson);
        setFormData(prev => ({
          ...prev,
          salesperson: savedSalesperson.name
        }));

        // Reset form and close
        setNewSalespersonData({ name: "", email: "" });
        setIsNewSalespersonFormOpen(false);
        setIsManageSalespersonsOpen(false);
        setIsSalespersonDropdownOpen(false);
      } else {
        alert("Failed to save salesperson: " + (response?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving salesperson:", error);
      alert("Error saving salesperson: " + (error.message || "Unknown error"));
    }
  };

  const handleDeleteSalesperson = async (salespersonId) => {
    if (!window.confirm("Are you sure you want to delete this salesperson?")) {
      return;
    }

    try {
      const response = await salespersonsAPI.delete(salespersonId);
      if (response && response.success) {
        // Reload salespersons from backend to get updated list
        try {
          const salespersonsResponse = await salespersonsAPI.getAll();
          if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
            setSalespersons(salespersonsResponse.data);
          } else {
            // Fallback: remove from list
            setSalespersons(prev => prev.filter(sp => (sp.id || sp._id) !== salespersonId));
          }
        } catch (error) {
          console.error('Error reloading salespersons:', error);
          // Fallback: remove from list
          setSalespersons(prev => prev.filter(sp => (sp.id || sp._id) !== salespersonId));
        }

        // If deleted salesperson was selected, clear selection
        if (selectedSalesperson && (selectedSalesperson.id || selectedSalesperson._id) === salespersonId) {
          setSelectedSalesperson(null);
          setFormData(prev => ({
            ...prev,
            salesperson: ""
          }));
        }
      } else {
        alert("Failed to delete salesperson: " + (response?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting salesperson:", error);
      alert("Error deleting salesperson: " + (error.message || "Unknown error"));
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setIsNewSalespersonFormOpen(false);
  };

  const getFilteredItems = (itemId) => {
    const search = itemSearches[itemId] || "";
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    );
  };

  const resolveItemTaxId = (selectedItem: any): string => {
    const taxCandidates: any[] = [
      selectedItem?.taxInfo?.taxId,
      selectedItem?.taxId,
      selectedItem?.salesTaxId,
      selectedItem?.tax,
      selectedItem?.salesTax
    ].filter(Boolean);

    for (const candidate of taxCandidates) {
      const candidateStr = String(candidate);
      const idMatch = taxes.find((t: any) => String(t.id) === candidateStr || String(t._id) === candidateStr);
      if (idMatch) return String(idMatch.id || idMatch._id);

      const nameMatch = taxes.find((t: any) => {
        const taxName = String(t.name || t.taxName || "").toLowerCase();
        return taxName && taxName === candidateStr.toLowerCase();
      });
      if (nameMatch) return String(nameMatch.id || nameMatch._id);

      const rateMatchText = candidateStr.match(/(\d+(?:\.\d+)?)\s*%/);
      if (rateMatchText) {
        const rate = parseFloat(rateMatchText[1]);
        const byRate = taxes.find((t: any) => Number(t.rate) === rate);
        if (byRate) return String(byRate.id || byRate._id);
      }
    }

    return "";
  };

  const getFilteredTaxes = (itemId: string | number) => {
    const search = (taxSearches[itemId] || "").toLowerCase();
    if (!search) return taxes;
    return taxes.filter((tax: any) => {
      const name = String(tax.name || tax.taxName || "").toLowerCase();
      const rate = String(tax.rate ?? "").toLowerCase();
      return name.includes(search) || rate.includes(search);
    });
  };

  const parseTaxRate = (value: any): number => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = parseFloat(String(value).replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getTaxBySelection = (taxValue: any): any => {
    if (taxValue === null || taxValue === undefined || taxValue === "") return null;
    const valueStr = String(taxValue).trim();
    if (!valueStr) return null;

    const byId = taxes.find((t: any) => String(t.id) === valueStr || String(t._id) === valueStr);
    if (byId) return byId;

    const byName = taxes.find((t: any) => {
      const taxName = String(t.name || t.taxName || "").toLowerCase();
      return taxName && taxName === valueStr.toLowerCase();
    });
    if (byName) return byName;

    const numericRate = parseTaxRate(valueStr);
    if (numericRate > 0) {
      const byRate = taxes.find((t: any) => Number(t.rate) === numericRate);
      if (byRate) return byRate;
    }

    return null;
  };

  const getTaxMetaFromItem = (item: any) => {
    const taxObj = getTaxBySelection(item?.tax);
    if (taxObj) {
      return {
        id: String(taxObj.id || taxObj._id || ""),
        name: taxObj.name || taxObj.taxName || "Tax",
        rate: parseTaxRate(taxObj.rate)
      };
    }

    const fallbackRate = parseTaxRate(item?.taxRate ?? item?.taxInfo?.taxRate ?? item?.salesTaxRate);
    return {
      id: "",
      name: "Tax",
      rate: fallbackRate
    };
  };

  const isTaxInclusiveMode = (currentFormData: any) => {
    const mode = String(currentFormData?.taxExclusive || "").toLowerCase();
    if (mode.includes("inclusive")) return true;
    if (mode.includes("exclusive")) return false;
    return taxMode === "inclusive";
  };

  const calculateLineTaxAmount = (lineAmount: number, taxRate: number, isInclusive: boolean) => {
    if (!lineAmount || !taxRate) return 0;
    if (isInclusive) {
      return lineAmount - lineAmount / (1 + taxRate / 100);
    }
    return (lineAmount * taxRate) / 100;
  };

  const taxBreakdown = useMemo(() => {
    const breakdown: Record<string, { label: string; amount: number }> = {};
    const isInclusive = isTaxInclusiveMode(formData);

    formData.items
      .filter((i: any) => i.itemType !== "header")
      .forEach((item: any) => {
        const taxMeta = getTaxMetaFromItem(item);
        if (!taxMeta.rate) return;
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const lineAmount = quantity * rate;
        const taxAmount = calculateLineTaxAmount(lineAmount, taxMeta.rate, isInclusive);
        const key = taxMeta.id || `${taxMeta.name}-${taxMeta.rate}`;
        const label = `${taxMeta.name} [${taxMeta.rate}%]${isInclusive ? " (Included)" : ""}`;
        if (!breakdown[key]) breakdown[key] = { label, amount: 0 };
        breakdown[key].amount += taxAmount;
      });

    const shippingAmount = showShippingCharges ? (parseFloat(String(formData.shippingCharges)) || 0) : 0;
    if (shippingAmount > 0 && formData.shippingChargeTax) {
      const shippingTaxObj = getTaxBySelection(formData.shippingChargeTax);
      const shippingTaxRate = shippingTaxObj ? parseTaxRate((shippingTaxObj as any).rate) : 0;
      if (shippingTaxRate > 0) {
        const shippingTaxAmount = calculateLineTaxAmount(shippingAmount, shippingTaxRate, isInclusive);
        const shippingTaxId = shippingTaxObj ? String((shippingTaxObj as any).id || (shippingTaxObj as any)._id || "") : "";
        const shippingTaxName = shippingTaxObj ? ((shippingTaxObj as any).name || (shippingTaxObj as any).taxName || "Tax") : "Tax";
        const key = shippingTaxId || `${shippingTaxName}-${shippingTaxRate}`;
        const label = `${shippingTaxName} [${shippingTaxRate}%]${isInclusive ? " (Included)" : ""}`;
        if (!breakdown[key]) breakdown[key] = { label, amount: 0 };
        breakdown[key].amount += shippingTaxAmount;
      }
    }

    return Object.values(breakdown);
  }, [formData.items, formData.taxExclusive, formData.shippingCharges, formData.shippingChargeTax, taxes, taxMode, showShippingCharges]);

  const handleItemSelect = (itemId, selectedItem) => {
    setSelectedItemIds(prev => ({ ...prev, [itemId]: selectedItem.id }));
    handleItemChange(itemId, 'itemId', selectedItem.id); // Store the actual Product ID
    handleItemChange(itemId, 'itemDetails', selectedItem.name);
    handleItemChange(itemId, 'rate', selectedItem.rate);
    handleItemChange(itemId, 'stockOnHand', selectedItem.stockOnHand);
    handleItemChange(itemId, 'unit', selectedItem.unit);
    handleItemChange(itemId, 'description', selectedItem.salesDescription || selectedItem.description || "");

    // Automatically apply the item's tax if it exists (supports id/name/rate formats)
    const resolvedTaxId = resolveItemTaxId(selectedItem);
    if (resolvedTaxId) {
      handleItemChange(itemId, 'tax', resolvedTaxId);
      const selectedTax = taxes.find((tax: any) => String(tax.id || tax._id) === String(resolvedTaxId));
      if (selectedTax) {
        handleItemChange(itemId, 'taxRate', parseTaxRate(selectedTax.rate));
      }
    } else {
      const fallbackRate = parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate);
      if (fallbackRate > 0) {
        handleItemChange(itemId, 'taxRate', fallbackRate);
      }
    }

    setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
    setItemSearches(prev => ({ ...prev, [itemId]: "" }));
  };

  const toggleItemDropdown = (itemId) => {
    setOpenItemDropdowns(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
    if (!itemDropdownRefs.current[itemId]) {
      itemDropdownRefs.current[itemId] = { current: null };
    }
  };

  const calculateAllTotals = (items, currentFormData) => {
    const itemRows = items.filter(i => i.itemType !== "header");
    const isInclusive = isTaxInclusiveMode(currentFormData);

    const subTotal = itemRows.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
    }, 0);

    const itemsTax = itemRows.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const lineAmount = quantity * rate;
      const taxMeta = getTaxMetaFromItem(item);
      return sum + calculateLineTaxAmount(lineAmount, taxMeta.rate, isInclusive);
    }, 0);

    const discountAmount = showTransactionDiscount
      ? (currentFormData.discountType === "percent"
        ? (subTotal * (parseFloat(currentFormData.discount) || 0) / 100)
        : (parseFloat(currentFormData.discount) || 0))
      : 0;
    const shipping = showShippingCharges ? (parseFloat(currentFormData.shippingCharges) || 0) : 0;
    const shippingTaxObj = (showShippingCharges && shipping > 0 && currentFormData.shippingChargeTax)
      ? getTaxBySelection(currentFormData.shippingChargeTax)
      : null;
    const shippingTaxRate = shippingTaxObj ? parseTaxRate((shippingTaxObj as any).rate) : 0;
    const shippingTaxAmount = (showShippingCharges && shipping > 0 && shippingTaxRate > 0)
      ? calculateLineTaxAmount(shipping, shippingTaxRate, isInclusive)
      : 0;
    const totalTax = itemsTax + shippingTaxAmount;
    const adjustment = showAdjustment ? (parseFloat(currentFormData.adjustment) || 0) : 0;
    const totalBeforeRound = subTotal + (isInclusive ? 0 : totalTax) - discountAmount + shipping + adjustment;
    const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
    const total = totalBeforeRound + roundOff;

    return {
      subTotal,
      totalTax,
      roundOff,
      total
    };
  };

  const handleItemChange = (id, field, value) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (item.itemType === "header") return updatedItem;

          if (field === "tax") {
            const selectedTax = getTaxBySelection(value);
            updatedItem.taxRate = selectedTax ? parseTaxRate(selectedTax.rate) : 0;
          }

          // Row amount should exclude tax; tax is shown only in totals section.
          const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(item.quantity) || 0;
          const rate = field === 'rate' ? parseFloat(value) || 0 : parseFloat(item.rate) || 0;
          const subtotal = quantity * rate;
          updatedItem.amount = subtotal;
          return updatedItem;
        }
        return item;
      });

      const totals = calculateAllTotals(updatedItems, prev);

      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => {
      const newItems = [
        ...prev.items,
        { id: Date.now(), itemType: "item", itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0, description: "", stockOnHand: 0 }
      ];
      const totals = calculateAllTotals(newItems, prev);
      return {
        ...prev,
        items: newItems,
        ...totals
      };
    });
  };

  const handleInsertHeader = (index) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index + 1, 0, { id: Date.now(), itemType: "header", itemDetails: "", quantity: 0, rate: 0, tax: "", amount: 0, description: "", stockOnHand: 0 });
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (id) => {
    setFormData(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      const totals = calculateAllTotals(updatedItems, prev);
      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
  };

  const handleDuplicateItem = (id) => {
    setFormData(prev => {
      const itemToDuplicate = prev.items.find(item => item.id === id);
      if (!itemToDuplicate) return prev;

      const newItem = { ...itemToDuplicate, id: Date.now() };
      const index = prev.items.findIndex(item => item.id === id);
      const updatedItems = [...prev.items];
      updatedItems.splice(index + 1, 0, newItem);
      const totals = calculateAllTotals(updatedItems, prev);
      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
    setOpenItemMenuId(null);
  };

  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return availableItems;
    }
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(bulkAddSearch.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(bulkAddSearch.toLowerCase()))
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

    // Add all selected items to the form and recalculate totals
    setFormData(prev => {
      const newItems = bulkSelectedItems.map((selectedItem, index) => {
        const resolvedTaxId = resolveItemTaxId(selectedItem);
        const resolvedTax = getTaxBySelection(resolvedTaxId);
        const fallbackTaxRate = parseTaxRate(selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate);

        return {
          id: Date.now() + index,
          itemType: "item",
          itemDetails: selectedItem.name,
          quantity: selectedItem.quantity || 1,
          rate: selectedItem.rate,
          tax: resolvedTaxId || "",
          taxRate: resolvedTax ? parseTaxRate(resolvedTax.rate) : fallbackTaxRate,
          amount: (selectedItem.quantity || 1) * selectedItem.rate,
          stockOnHand: selectedItem.stockOnHand
        };
      });

      const updatedItems = [...prev.items];
      if (bulkAddInsertIndex !== null) {
        updatedItems.splice(bulkAddInsertIndex + 1, 0, ...newItems);
      } else {
        updatedItems.push(...newItems);
      }
      const totals = calculateAllTotals(updatedItems, prev);

      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });

    // Close modal and reset
    setIsBulkAddModalOpen(false);
    setBulkAddInsertIndex(null);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleCancelBulkAdd = () => {
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
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

  const handleDeleteSelectedItems = () => {
    if (bulkSelectedItemIds.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${bulkSelectedItemIds.length} item(s)?`)) {
      setFormData(prev => {
        const updatedItems = prev.items.filter(item => !bulkSelectedItemIds.includes(item.id));
        const totals = calculateAllTotals(updatedItems, prev);

        return {
          ...prev,
          items: updatedItems,
          ...totals
        };
      });
      setBulkSelectedItemIds([]);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);

    // Validate file count
    if (formData.attachedFiles.length + files.length > 5) {
      alert("You can upload a maximum of 5 files");
      return;
    }

    // Validate file sizes (10MB each)
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 10MB limit. Maximum file size is 10MB.`);
      return;
    }

    // Add files to attachedFiles array with metadata
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      file: file
    }));

    setFormData(prev => ({
      ...prev,
      attachedFiles: [...prev.attachedFiles, ...newFiles]
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter(file => file.id !== fileId)
    }));
  };

  // Helper function to parse file size string to bytes
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

  // Load documents when modal opens
  useEffect(() => {
    if (isDocumentsModalOpen) {
      const documents = getAllDocuments();
      setAvailableDocuments(documents);
    }
  }, [isDocumentsModalOpen]);

  // Listen for document updates
  useEffect(() => {
    const handleDocumentUpdate = () => {
      if (isDocumentsModalOpen) {
        const documents = getAllDocuments();
        setAvailableDocuments(documents);
      }
    };

    window.addEventListener('documentAdded', handleDocumentUpdate);
    window.addEventListener('documentDeleted', handleDocumentUpdate);
    window.addEventListener('documentUpdated', handleDocumentUpdate);

    return () => {
      window.removeEventListener('documentAdded', handleDocumentUpdate);
      window.removeEventListener('documentDeleted', handleDocumentUpdate);
      window.removeEventListener('documentUpdated', handleDocumentUpdate);
    };
  }, [isDocumentsModalOpen]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleNewItemChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewItemData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleNewItemImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewItem = () => {
    if (!newItemData.name.trim()) {
      alert("Please enter item name");
      return;
    }
    if (!newItemData.sellingPrice) {
      alert("Please enter selling price");
      return;
    }

    // Create new item
    const newItem = {
      id: `ITEM-${Date.now()}`,
      name: newItemData.name,
      sku: newItemData.sku,
      rate: parseFloat(newItemData.sellingPrice) || 0,
      stockOnHand: 0,
      unit: newItemData.unit || "pcs",
      type: newItemData.type,
      costPrice: parseFloat(newItemData.costPrice) || 0,
      salesAccount: newItemData.salesAccount,
      purchaseAccount: newItemData.purchaseAccount,
      sellable: newItemData.sellable,
      purchasable: newItemData.purchasable,
      trackInventory: newItemData.trackInventory
    };

    // Add to availableItems
    setAvailableItems(prev => [...prev, newItem]);

    // Also save to localStorage
    const savedItems = JSON.parse(localStorage.getItem("inv_items_v1") || "[]");
    const itemToSave = {
      id: newItem.id,
      name: newItem.name,
      sku: newItem.sku,
      sellingPrice: newItem.rate,
      costPrice: newItem.costPrice || 0,
      stockOnHand: newItem.stockOnHand || 0,
      unit: newItem.unit,
      type: newItem.type,
      salesAccount: newItemData.salesAccount,
      purchaseAccount: newItemData.purchaseAccount,
      sellable: newItemData.sellable,
      purchasable: newItemData.purchasable,
      trackInventory: newItemData.trackInventory
    };
    savedItems.push(itemToSave);
    localStorage.setItem("inv_items_v1", JSON.stringify(savedItems));

    // Reset form and close modal
    setNewItemData({
      type: "Goods",
      name: "",
      sku: "",
      unit: "",
      sellingPrice: "",
      salesAccount: "Sales",
      salesDescription: "",
      salesTax: "",
      costPrice: "",
      purchaseAccount: "Cost of Goods Sold",
      purchaseDescription: "",
      purchaseTax: "",
      preferredVendor: "",
      sellable: true,
      purchasable: true,
      trackInventory: false
    });
    setNewItemImage(null);
    setIsNewItemModalOpen(false);
  };

  const handleCancelNewItem = () => {
    setNewItemData({
      type: "Goods",
      name: "",
      sku: "",
      unit: "",
      sellingPrice: "",
      salesAccount: "Sales",
      salesDescription: "",
      salesTax: "",
      costPrice: "",
      purchaseAccount: "Cost of Goods Sold",
      purchaseDescription: "",
      purchaseTax: "",
      preferredVendor: "",
      sellable: true,
      purchasable: true,
      trackInventory: false
    });
    setNewItemImage(null);
    setIsNewItemModalOpen(false);
  };

  // Project handlers
  const filteredProjects = projects.filter(project => {
    const projectName = project.projectName || project.name || "";
    const matchesSearch = projectName.toLowerCase().includes(projectSearch.toLowerCase());

    // If no customer is selected, show all matching search
    if (!selectedCustomer) return matchesSearch;

    const selectedCustomerId = selectedCustomer.id || selectedCustomer._id;

    // Support both ID and nested object structure for customer field
    const projectCustomer = project.customer || project.customerId;
    const projectCustomerId = (typeof projectCustomer === 'object' && projectCustomer !== null)
      ? (projectCustomer.id || projectCustomer._id)
      : projectCustomer;

    const matchesCustomer = projectCustomerId && (
      projectCustomerId === selectedCustomerId ||
      projectCustomerId.toString() === selectedCustomerId.toString()
    );

    // Also check customerName as a fallback if IDs don't match or aren't present
    const customerName = selectedCustomer.name || selectedCustomer.displayName;
    const matchesCustomerName = project.customerName === customerName;

    // SHOW projects for selected customer OR projects with NO customer assigned
    return matchesSearch && (matchesCustomer || matchesCustomerName || !projectCustomerId || projectCustomerId === "");
  });

  const handleProjectSelect = (project) => {
    const projectName = project.projectName || project.name || "";
    setSelectedProject(project);
    setFormData(prev => ({
      ...prev,
      projectName: projectName
    }));
    setIsProjectDropdownOpen(false);
    setProjectSearch("");
  };

  const handleNewProjectChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProjectData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleAddProjectTask = () => {
    setNewProjectData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: Date.now(), taskName: "", description: "" }]
    }));
  };

  const handleRemoveProjectTask = (taskId) => {
    setNewProjectData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId)
    }));
  };

  const handleProjectTaskChange = (taskId, field, value) => {
    setNewProjectData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    }));
  };

  const handleAddProjectUser = () => {
    // For now, add a placeholder user - in real app, this would open a user selection modal
    const newUser = {
      id: Date.now(),
      name: "New User",
      email: "user@example.com"
    };
    setNewProjectData(prev => ({
      ...prev,
      users: [...prev.users, newUser]
    }));
  };

  const handleRemoveProjectUser = (userId) => {
    setNewProjectData(prev => ({
      ...prev,
      users: prev.users.filter(user => user.id !== userId)
    }));
  };

  const handleSaveNewProject = () => {
    if (!newProjectData.projectName.trim()) {
      alert("Please enter project name");
      return;
    }

    // Create new project
    const newProject = {
      projectName: newProjectData.projectName,
      projectCode: newProjectData.projectCode,
      customerName: selectedCustomer?.name || newProjectData.customerName,
      customerId: selectedCustomer?.id || newProjectData.customerId,
      billingMethod: newProjectData.billingMethod,
      totalProjectCost: parseFloat(newProjectData.totalProjectCost) || 0,
      description: newProjectData.description,
      costBudget: parseFloat(newProjectData.costBudget) || 0,
      revenueBudget: parseFloat(newProjectData.revenueBudget) || 0,
      users: newProjectData.users,
      tasks: newProjectData.tasks.filter(t => t.taskName.trim()),
      addToWatchlist: newProjectData.addToWatchlist,
      createdAt: new Date().toISOString()
    };

    // Save project to localStorage
    const savedProject = saveProject(newProject);

    // Add to local state
    setProjects(prev => [...prev, savedProject]);

    // Select the new project
    setSelectedProject(savedProject);
    setFormData(prev => ({
      ...prev,
      projectName: savedProject.projectName
    }));

    // Reset form and close modal
    setNewProjectData({
      projectName: "",
      projectCode: "",
      customerName: "",
      customerId: "",
      billingMethod: "Fixed Cost for Project",
      totalProjectCost: "",
      description: "",
      costBudget: "",
      revenueBudget: "",
      users: [],
      tasks: [{ id: 1, taskName: "", description: "" }],
      addToWatchlist: true
    });
    setIsNewProjectModalOpen(false);
  };

  const handleCancelNewProject = () => {
    setNewProjectData({
      projectName: "",
      projectCode: "",
      customerName: "",
      customerId: "",
      billingMethod: "Fixed Cost for Project",
      totalProjectCost: "",
      description: "",
      costBudget: "",
      revenueBudget: "",
      users: [],
      tasks: [{ id: 1, taskName: "", description: "" }],
      addToWatchlist: true
    });
    setIsNewProjectModalOpen(false);
  };

  const handleOpenNewProjectModal = () => {
    // Navigate to new project form with customer data
    setIsProjectDropdownOpen(false);
    navigate('/time-tracking/projects/new', {
      state: {
        returnTo: isEditMode ? `/sales/quotes/${quoteId}/edit` : '/sales/quotes/new',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        quoteId: quoteId || null
      }
    });
  };

  const handleContactPersonChange = (e) => {
    const { name, value } = e.target;
    setContactPersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactPersonImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setContactPersonData(prev => ({
        ...prev,
        profileImage: file
      }));
    }
  };

  const handleSaveContactPerson = () => {
    if (!contactPersonData.firstName.trim() || !contactPersonData.email.trim()) {
      alert("First Name and Email are required");
      return;
    }

    const newContact = {
      ...contactPersonData,
      fullName: `${contactPersonData.salutation} ${contactPersonData.firstName} ${contactPersonData.lastName}`.trim(),
      selected: true
    };

    setFormData(prev => ({
      ...prev,
      contactPersons: [...(prev.contactPersons || []), newContact]
    }));

    setIsAddContactPersonModalOpen(false);
    // Reset form
    setContactPersonData({
      salutation: "",
      firstName: "",
      lastName: "",
      email: "",
      workPhone: "",
      workPhonePrefix: "+358",
      mobile: "",
      mobilePrefix: "+358",
      skype: "",
      designation: "",
      department: "",
      profileImage: null
    });
  };

  const uploadQuoteFiles = async (files: any[]) => {
    const uploaded = [];
    for (const fileObj of files) {
      if (fileObj.file) {
        try {
          // If it's a real File object, upload it
          const response = await documentsAPI.upload(fileObj.file);
          if (response && response.success && response.data) {
            uploaded.push({
              id: response.data.id || response.data._id,
              name: fileObj.name,
              size: fileObj.size,
              url: response.data.url,
              uploadedAt: new Date()
            });
          }
        } catch (error) {
          console.error("Error uploading file:", fileObj.name, error);
          // If upload fails, we still keep the metadata but it won't have a URL
          uploaded.push({
            id: fileObj.id,
            name: fileObj.name,
            size: fileObj.size
          });
        }
      } else {
        // Already uploaded or from cloud, keep as is
        uploaded.push(fileObj);
      }
    }
    return uploaded;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedCustomer || (!selectedCustomer.id && !selectedCustomer._id)) {
      errors.customerName = "Please select a customer";
    }

    if (!formData.quoteNumber || !formData.quoteNumber.trim()) {
      errors.quoteNumber = "Quote number is required";
    }

    if (!formData.quoteDate) {
      errors.quoteDate = "Quote date is required";
    }

    // Also check if there's at least one valid item
    const validItems = formData.items.filter(item => {
      const quantityValue = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity));
      return item.itemDetails?.trim() && !isNaN(quantityValue) && quantityValue > 0;
    });

    if (validItems.length === 0) {
      errors.items = "Please add at least one item with quantity";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildQuoteFinancialsAndItems = () => {
    const isInclusive = isTaxInclusiveMode(formData);

    const validItems = formData.items
      .filter((item) => {
        if (item.itemType === "header") return false;
        const hasDetails = item.itemDetails?.trim();
        const quantity = parseFloat(item.quantity);
        const rate = parseFloat(item.rate);
        return hasDetails && !isNaN(quantity) && quantity > 0 && !isNaN(rate) && rate >= 0;
      })
      .map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const lineSubtotal = quantity * rate;
        const taxMeta = getTaxMetaFromItem(item);
        const taxRate = taxMeta.rate;
        const taxAmount = calculateLineTaxAmount(lineSubtotal, taxRate, isInclusive);

        return {
          id: item._id || item.id,
          itemId: item.itemId || item._id || item.id,
          item: item.itemId || item._id || item.id,
          name: item.itemDetails || item.name || "Item",
          itemDetails: item.itemDetails || item.name || "Item",
          description: item.description || item.itemDetails || "",
          quantity,
          rate,
          unitPrice: rate,
          tax: item.tax || "",
          taxRate,
          taxAmount,
          amount: lineSubtotal,
          total: lineSubtotal
        };
      });

    const subTotal = validItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const itemsTax = validItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const discountAmount = showTransactionDiscount
      ? (formData.discountType === "percent"
        ? (subTotal * (parseFloat(formData.discount || 0) / 100))
        : (parseFloat(formData.discount || 0)))
      : 0;
    const shipping = showShippingCharges ? (parseFloat(formData.shippingCharges) || 0) : 0;
    const shippingTaxObj = (showShippingCharges && shipping > 0 && formData.shippingChargeTax)
      ? getTaxBySelection(formData.shippingChargeTax)
      : null;
    const shippingTaxRate = shippingTaxObj ? parseTaxRate((shippingTaxObj as any).rate) : 0;
    const shippingTaxAmount = (showShippingCharges && shipping > 0 && shippingTaxRate > 0)
      ? calculateLineTaxAmount(shipping, shippingTaxRate, isInclusive)
      : 0;
    const totalTax = itemsTax + shippingTaxAmount;
    const adjustment = showAdjustment ? (parseFloat(formData.adjustment) || 0) : 0;
    const roundOff = parseFloat(formData.roundOff) || 0;
    const totalBeforeRound = isInclusive
      ? (subTotal - discountAmount + shipping + adjustment)
      : (subTotal + totalTax - discountAmount + shipping + adjustment);
    const finalTotal = totalBeforeRound + roundOff;

    return {
      validItems,
      subTotal,
      totalTax,
      discountAmount,
      shipping,
      adjustment,
      roundOff,
      finalTotal
    };
  };

  const handleSaveDraft = async () => {
    if (saveLoading) return;

    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0] || "Please fill in all required fields marked with *";
      alert(firstError);
      return;
    }

    setSaveLoading("draft");

    try {
      // Upload files first

      const finalAttachedFiles = await uploadQuoteFiles(formData.attachedFiles);

      const {
        validItems,
        subTotal,
        totalTax,
        discountAmount,
        shipping,
        adjustment,
        roundOff,
        finalTotal
      } = buildQuoteFinancialsAndItems();

      // Get quote number from backend (only for new quotes)
      let quoteNumber = formData.quoteNumber;
      if (!isEditMode && quoteNumberMode === "auto") {
        try {
          const quoteNumberResponse = await quotesAPI.getNextNumber(quotePrefix);
          if (quoteNumberResponse && quoteNumberResponse.success && quoteNumberResponse.data) {
            quoteNumber = quoteNumberResponse.data.quoteNumber;
          }
        } catch (error) {
          console.error('Error getting next quote number:', error);
          // Fallback to local generation - await getQuotes()
          const existingQuotes = await getQuotes();
          quoteNumber = `${quotePrefix}${String(existingQuotes.length + 1).padStart(6, '0')}`;
        }
      }

      // Prepare quote data
      const quoteData = {
        quoteNumber: quoteNumber,
        referenceNumber: formData.referenceNumber,
        customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
        customerId: selectedCustomer?.id || selectedCustomer?._id || null,
        quoteDate: convertToISODate(formData.quoteDate),
        expiryDate: convertToISODate(formData.expiryDate),
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId,
        projectName: formData.projectName,
        subject: formData.subject,
        taxExclusive: formData.taxExclusive,

        // Items array - filter out empty rows and ensure valid data
        items: validItems,

        // Summary
        subtotal: subTotal,
        tax: totalTax,
        taxAmount: totalTax,
        discount: showTransactionDiscount ? parseFloat(formData.discount || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        shippingChargeTax: String(formData.shippingChargeTax || ""),
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,

        // Other fields
        currency: formData.currency,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        attachedFiles: finalAttachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          url: file.url
        })) || [],

        // Status
        status: "draft"
      };

      // Save or update quote
      let savedQuote;
      if (isEditMode && quoteId) {
        savedQuote = await updateQuote(quoteId, quoteData);
        console.log("Quote updated as draft:", savedQuote);
      } else {
        savedQuote = await saveQuote(quoteData);
        console.log("Quote saved as draft:", savedQuote);
      }

      // Handle URL change to detect if we should show a specific modal
      // Navigate back to quotes page or quote detail
      if (savedQuote) {
        // If it was an update or create, we should have an ID.
        // Backend returns _id or id.
        const id = savedQuote._id || savedQuote.id || quoteId;
        if (id) {
          navigate(`/sales/quotes/${id}`);
        } else {
          navigate("/sales/quotes");
        }
      } else {
        navigate("/sales/quotes");
      }
    } catch (error) {
      console.error("Error saving quote as draft:", error);
      alert("Failed to save quote. Please try again.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSaveAndSend = async () => {
    if (saveLoading) return;

    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0] || "Please fill in all required fields marked with *";
      alert(firstError);
      return;
    }

    setSaveLoading("send");
    try {


      // Upload files first
      const finalAttachedFiles = await uploadQuoteFiles(formData.attachedFiles);

      // Step 1: Save the quote as draft
      const {
        validItems,
        subTotal,
        totalTax,
        discountAmount,
        shipping,
        adjustment,
        roundOff,
        finalTotal
      } = buildQuoteFinancialsAndItems();

      let quoteNumber = formData.quoteNumber;
      if (!isEditMode && quoteNumberMode === "auto") {
        try {
          const quoteNumberResponse = await quotesAPI.getNextNumber(quotePrefix);
          if (quoteNumberResponse && quoteNumberResponse.success && quoteNumberResponse.data) {
            quoteNumber = quoteNumberResponse.data.quoteNumber;
          }
        } catch (error) {
          console.error('Error getting next quote number:', error);
          const existingQuotes = await getQuotes();
          quoteNumber = `${quotePrefix}${String(existingQuotes.length + 1).padStart(6, '0')}`;
        }
      }

      const quoteData = {
        quoteNumber: quoteNumber,
        referenceNumber: formData.referenceNumber,
        customerName: formData.customerName,
        customer: selectedCustomer?.id || selectedCustomer?._id || formData.customerName,
        customerId: selectedCustomer?.id || selectedCustomer?._id || null,
        quoteDate: convertToISODate(formData.quoteDate),
        expiryDate: convertToISODate(formData.expiryDate),
        salesperson: formData.salesperson,
        salespersonId: formData.salespersonId,
        projectName: formData.projectName,
        subject: formData.subject,
        taxExclusive: formData.taxExclusive,
        items: validItems,
        subtotal: subTotal,
        tax: totalTax,
        taxAmount: totalTax,
        discount: showTransactionDiscount ? parseFloat(formData.discount || 0) : 0,
        discountType: showTransactionDiscount ? formData.discountType : "percent",
        discountAmount: discountAmount,
        discountAccount: formData.discountAccount,
        shippingCharges: shipping,
        shippingChargeTax: String(formData.shippingChargeTax || ""),
        adjustment: adjustment,
        roundOff: roundOff,
        total: finalTotal,
        currency: formData.currency,
        customerNotes: formData.customerNotes,
        termsAndConditions: formData.termsAndConditions,
        attachedFiles: finalAttachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          url: file.url
        })) || [],
        status: "draft", // Save as draft first
        date: formData.quoteDate
      };

      let savedQuote;
      if (isEditMode && quoteId) {
        savedQuote = await updateQuote(quoteId, quoteData);
      } else {
        savedQuote = await saveQuote(quoteData);
      }

      // Step 2: Navigate to email page
      if (savedQuote) {
        const id = savedQuote._id || savedQuote.id || quoteId;
        console.log("Quote saved as draft, navigating to email:", id);
        navigate(`/sales/quotes/${id}/email`, { state: { preloadedQuote: savedQuote } });
      } else {
        throw new Error("Failed to save quote before sending.");
      }
    } catch (error) {
      console.error("Error in handleSaveAndSend:", error);
      alert("Failed to save quote. Please try again.");
    } finally {
      setSaveLoading(null);
    }
  };

  const handleCancel = () => {
    navigate("/sales/quotes");
  };

  const handleOtherAction = () => {
    // Handle "Other" action - can be customized based on requirements
    console.log("Other action clicked");
    // You can add custom logic here for what "Other" should do
    // For example: open a modal with more options, or perform a specific action
  };

  return (
    <>
      <div className="w-full min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="w-full px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-normal text-gray-900 m-0">
              New Quote
            </h2>
            <button
              onClick={() => navigate("/sales/quotes")}
              className="text-red-500 hover:text-red-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full py-6 pb-28">
          {/* Form Fields Section */}
          <div className="bg-white overflow-visible">
            <div className="px-6 py-5 border-b border-gray-100 bg-[#fafafa]">
              {/* Customer Name */}
              <div className="flex items-start gap-4">
                <label className="text-sm text-red-600 w-40 pt-2 flex-shrink-0">
                  Customer Name*
                </label>
                <div className="flex-1 relative" ref={customerDropdownRef}>
                  <div className="relative flex items-stretch">
                    <input
                      type="text"
                      className={`flex-1 px-3 py-2 pr-10 border ${formErrors.customerName ? 'border-red-500' : 'border-gray-300'} rounded-l text-sm text-gray-700 focus:outline-none focus:border-[#156372] bg-white`}
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    />
                    <div
                      className="absolute right-10 top-0 bottom-0 flex items-center px-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                      }}
                    >
                      <ChevronDown size={14} className="text-gray-400" />
                    </div>
                    <button
                      type="button"
                      className="w-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center border border-[#156372]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomerSearchModalOpen(true);
                      }}
                    >
                      <Search size={16} />
                    </button>
                  </div>

                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="flex-1 text-sm focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => {
                            const customerId = customer.id || customer._id;
                            const customerName = customer.name || customer.displayName || customer.companyName || "";
                            const customerEmail = customer.email || "";
                            const isSelected = selectedCustomer && (
                              (selectedCustomer.id && selectedCustomer.id === customerId) ||
                              (selectedCustomer._id && selectedCustomer._id === customerId) ||
                              (selectedCustomer.name === customerName)
                            );

                            return (
                              <div
                                key={customerId}
                                className={`p-2 cursor-pointer flex items-center gap-3 ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate text-gray-900">
                                    {customerName}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No customers found
                          </div>
                        )}
                      </div>
                      <button
                        className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50 text-sm font-medium text-[#156372] w-full"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await openCustomerQuickAction();
                        }}
                      >
                        <Plus size={14} />
                        New Customer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              {/* Quote# */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-red-600 w-40 pt-2 flex-shrink-0">
                  Quote#*
                </label>
                <div className="flex-1 max-w-xs relative">
                  <input
                    type="text"
                    name="quoteNumber"
                    className={`w-full px-3 py-2 border ${formErrors.quoteNumber ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 bg-gray-50 focus:outline-none`}
                    value={formData.quoteNumber}
                    readOnly
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#156372] hover:text-[#0D4A52]"
                    onClick={() => setIsQuoteNumberModalOpen(true)}
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {/* Reference# */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-40 pt-2 flex-shrink-0">
                  Reference#
                </label>
                <div className="flex-1 max-w-xs">
                  <input
                    type="text"
                    name="referenceNumber"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372]"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-red-600 w-40 pt-2 flex-shrink-0">
                  Quote Date*
                </label>
                <div className="flex-1 flex items-center gap-8">
                  <div className="w-48 relative" ref={quoteDatePickerRef}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border ${formErrors.quoteDate ? 'border-red-500' : 'border-gray-300'} rounded text-sm text-gray-700 focus:outline-none`}
                      value={formatDateForDisplay(formData.quoteDate)}
                      readOnly
                      onClick={() => setIsQuoteDatePickerOpen(!isQuoteDatePickerOpen)}
                    />
                    {isQuoteDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-64 p-4">
                        {/* Calendar Header */}
                        <div className="flex justify-between items-center mb-3">
                          <button
                            onClick={() => navigateMonth("prev", "quoteDate")}
                            type="button"
                            className="p-1 text-gray-600 cursor-pointer"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <div className="text-sm font-semibold text-gray-900">
                            {months[quoteDateCalendar.getMonth()]} {quoteDateCalendar.getFullYear()}
                          </div>
                          <button
                            onClick={() => navigateMonth("next", "quoteDate")}
                            type="button"
                            className="p-1 text-gray-600 cursor-pointer"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {daysOfWeek.map((day) => (
                            <div key={day} className={`text-center text-xs font-medium py-1 ${day === "Sun" || day === "Sat" ? "text-red-600" : "text-gray-700"}`}>
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(quoteDateCalendar).map((day, index) => {
                            const isSelected = formData.quoteDate && formatDate(day.fullDate) === formData.quoteDate;
                            const isCurrentMonth = day.month === "current";
                            return (
                              <button
                                key={index}
                                onClick={() => handleDateSelect(day.fullDate, "quoteDate")}
                                type="button"
                                className={`p-2 text-sm rounded cursor-pointer ${isSelected ? "bg-red-600 text-white font-semibold" : isCurrentMonth ? "text-gray-900 " : "text-gray-400 "}`}
                              >
                                {day.date}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-700 whitespace-nowrap">Expiry Date</label>
                    <div className="w-48 relative" ref={expiryDatePickerRef}>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none"
                        placeholder="dd/MM/yyyy"
                        value={formatDateForDisplay(formData.expiryDate)}
                        readOnly
                        onClick={() => setIsExpiryDatePickerOpen(!isExpiryDatePickerOpen)}
                      />
                      {isExpiryDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 w-64 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <button onClick={() => navigateMonth("prev", "expiryDate")} type="button" className="p-1 text-gray-600 cursor-pointer">
                              <ChevronLeft size={18} />
                            </button>
                            <div className="text-sm font-semibold text-gray-900">
                              {months[expiryDateCalendar.getMonth()]} {expiryDateCalendar.getFullYear()}
                            </div>
                            <button onClick={() => navigateMonth("next", "expiryDate")} type="button" className="p-1 text-gray-600 cursor-pointer">
                              <ChevronRight size={18} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {daysOfWeek.map((day) => (
                              <div key={day} className={`text-center text-xs font-medium py-1 ${day === "Sun" || day === "Sat" ? "text-red-600" : "text-gray-700"}`}>
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(expiryDateCalendar).map((day, index) => {
                              const isSelected = formData.expiryDate && formatDate(day.fullDate) === formData.expiryDate;
                              const isCurrentMonth = day.month === "current";
                              return (
                                <button key={index} onClick={() => handleDateSelect(day.fullDate, "expiryDate")} type="button" className={`p-2 text-sm rounded cursor-pointer ${isSelected ? "bg-red-600 text-white font-semibold" : isCurrentMonth ? "text-gray-900 " : "text-gray-400 "}`}>
                                  {day.date}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salesperson */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-40 pt-2 flex-shrink-0">
                  Salesperson
                </label>
                <div className="flex-1 max-w-xs relative" ref={salespersonDropdownRef}>
                  <div
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 flex justify-between items-center bg-white cursor-pointer"
                    onClick={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                  >
                    <span className={formData.salesperson ? "text-gray-900" : "text-gray-400"}>
                      {formData.salesperson || "Select or Add Salesperson"}
                    </span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </div>
                  {isSalespersonDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 flex flex-col">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={salespersonSearch}
                          onChange={(e) => setSalespersonSearch(e.target.value)}
                          className="flex-1 text-sm focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredSalespersons.length > 0 ? (
                          filteredSalespersons.map(salesperson => (
                            <div
                              key={salesperson.id || salesperson._id}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-[#156372] hover:text-white cursor-pointer truncate"
                              onClick={() => handleSalespersonSelect(salesperson)}
                            >
                              {salesperson.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500 italic">No salespersons found</div>
                        )}
                      </div>
                      <div
                        className="p-3 border-t border-gray-100 flex items-center gap-2 text-[#156372] hover:bg-gray-50 cursor-pointer text-sm font-medium"
                        onClick={() => {
                          setIsManageSalespersonsOpen(true);
                          setIsSalespersonDropdownOpen(false);
                        }}
                      >
                        <PlusCircle size={16} />
                        <span>Manage Salespersons</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Name */}
              <div className="flex items-start gap-4 mb-4">
                <label className="text-sm text-gray-700 w-40 pt-2 flex-shrink-0">
                  Project Name
                </label>
                <div className="flex-1 max-w-xs relative" ref={projectDropdownRef}>
                  <div
                    className={`w-full px-3 py-2 border border-gray-300 rounded text-sm flex justify-between items-center ${!selectedCustomer
                      ? "bg-gray-100 cursor-not-allowed text-gray-400"
                      : "bg-white cursor-pointer text-gray-700"
                      }`}
                    onClick={() => {
                      if (selectedCustomer) {
                        setIsProjectDropdownOpen(!isProjectDropdownOpen);
                      }
                    }}
                  >
                    <span className={formData.projectName ? "text-gray-900" : "text-gray-400"}>
                      {formData.projectName || "Select a project"}
                    </span>
                    {isProjectDropdownOpen ? (
                      <ChevronUp size={14} className="text-[#3b82f6]" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400" />
                    )}
                  </div>
                  {isProjectDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-200 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input type="text" placeholder="Search" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="flex-1 text-sm focus:outline-none" autoFocus />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map(project => (
                            <div key={project.id || project._id} className="p-2 cursor-pointer hover:bg-gray-50" onClick={() => handleProjectSelect(project)}>
                              <div className="text-sm font-medium truncate text-gray-900">{project.projectName || project.name}</div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-500 uppercase tracking-wide">No Results Found</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="w-full p-2 border-t border-gray-200 bg-gray-50 text-[#156372] text-sm font-medium flex items-center gap-2"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await openProjectQuickAction();
                        }}
                      >
                        <PlusCircle size={14} />
                        Add New
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="flex items-start gap-4 mb-8">
                <label className="text-sm text-gray-700 w-40 pt-2 flex-shrink-0">
                  Subject
                </label>
                <div className="flex-1 max-w-2xl">
                  <textarea
                    name="subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-none"
                    placeholder="Let your customer know what this Quote is for"
                    value={formData.subject}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
              </div>
            </div>


            {/* Item Table Section */}
            <div className="mt-6 bg-white border border-gray-200 rounded-md overflow-visible">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <h2 className="text-[13px] font-semibold text-gray-800">Item Table</h2>
                <div className="relative" ref={bulkActionsRef}>
                  <div
                    className="flex items-center gap-1 text-[#156372] cursor-pointer hover:text-[#0D4A52] text-sm font-medium"
                    onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  >
                    <CheckCircle size={14} />
                    <span>Bulk Actions</span>
                  </div>
                  {isBulkActionsOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
                      <button
                        onClick={() => {
                          setShowAdditionalInformation(!showAdditionalInformation);
                          setIsBulkActionsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        {showAdditionalInformation ? "Hide All Additional Information" : "Show All Additional Information"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase">Item Details</th>
                    <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-24">Quantity</th>
                    <th className="text-center py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-32">Rate</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-40">Tax</th>
                    <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase w-32">Amount</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 group">
                      <td className="py-2 px-3">
                        {item.itemType === "header" ? (
                          <input
                            type="text"
                            value={item.itemDetails}
                            onChange={(e) => handleItemChange(item.id, 'itemDetails', e.target.value)}
                            placeholder="Header Title"
                            className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm font-bold bg-gray-50"
                          />
                        ) : (

                          <div className="flex gap-3 items-start">
                            {/* Image Placeholder */}
                            <div className="w-9 h-9 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 mt-1 flex-shrink-0">
                              <ImageIcon size={18} />
                            </div>

                            <div className="flex-1 space-y-2 min-w-[200px]">
                              <div className="relative" ref={itemDropdownRefs.current[item.id]}>
                                <input
                                  type="text"
                                  value={item.itemDetails}
                                  onChange={(e) => {
                                    handleItemChange(item.id, 'itemDetails', e.target.value);
                                    setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }));
                                    if (!openItemDropdowns[item.id]) {
                                      setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                    }
                                  }}
                                  onFocus={() => {
                                    if (!openItemDropdowns[item.id]) {
                                      setOpenItemDropdowns(prev => ({ ...prev, [item.id]: true }));
                                    }
                                  }}
                                  placeholder="Select or type an item"
                                  className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm bg-transparent font-medium text-gray-900"
                                />
                                {openItemDropdowns[item.id] && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-[60] max-h-60 overflow-y-auto w-[400px]">
                                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Search items..."
                                          className="flex-1 bg-transparent text-sm outline-none"
                                          value={itemSearches[item.id] || ""}
                                          onChange={(e) => setItemSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                          autoFocus
                                        />
                                      </div>
                                    </div>
                                    {getFilteredItems(item.id).map((availItem) => (
                                      <div
                                        key={availItem.id}
                                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                        onClick={() => handleItemSelect(item.id, availItem)}
                                      >
                                        <div className="font-medium">{availItem.name}</div>
                                        <div className="text-[11px] text-gray-500">SKU: {availItem.sku} | Rate: {availItem.rate} | Stock: {availItem.stockOnHand}</div>
                                      </div>
                                    ))}
                                    <div
                                      className="px-4 py-2 text-sm text-[#156372] hover:bg-gray-50 cursor-pointer font-medium border-t border-gray-100"
                                      onClick={() => {
                                        setIsNewItemModalOpen(true);
                                        setOpenItemDropdowns(prev => ({ ...prev, [item.id]: false }));
                                      }}
                                    >
                                      + New Item
                                    </div>
                                  </div>
                                )}
                              </div>
                              {showAdditionalInformation && (
                                <textarea
                                  value={item.description || ""}
                                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  placeholder="Add a description to your item"
                                  className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-xs text-gray-500 resize-none bg-transparent"
                                  rows={2}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {item.itemType !== "header" && (
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm text-center bg-transparent"
                              step="0.01"
                            />
                            <div className="text-[10px] text-gray-500 text-center leading-tight">
                              Stock on Hand:<br />
                              <span className="font-medium text-gray-700">{item.stockOnHand || 0}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {item.itemType !== "header" && (
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                              className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-[#156372] rounded outline-none text-sm text-center bg-transparent"
                              step="0.01"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {item.itemType !== "header" && (
                          <div className="relative" ref={(el) => { taxDropdownRefs.current[String(item.id)] = el; }}>
                            <button
                              type="button"
                              className="w-full px-2 py-1.5 border border-transparent hover:border-gray-300 rounded outline-none text-sm bg-transparent text-gray-700 cursor-pointer flex items-center justify-between"
                              onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            >
                              <span className={(item.tax || parseTaxRate(item.taxRate) > 0) ? "text-[#156372]" : "text-gray-500"}>
                                {(item.tax || parseTaxRate(item.taxRate) > 0)
                                  ? (() => {
                                    const taxObj: any = getTaxBySelection(item.tax);
                                    if (!taxObj) {
                                      const fallbackRate = parseTaxRate(item.taxRate);
                                      return fallbackRate > 0 ? `Tax [${fallbackRate}%]` : "Select a Tax";
                                    }
                                    const nm = taxObj.name || taxObj.taxName || "Tax";
                                    const rt = Number(taxObj.rate || 0);
                                    return `${nm} [${rt}%]`;
                                  })()
                                  : "Select a Tax"}
                              </span>
                              {openTaxDropdowns[item.id] ? <ChevronUp size={14} className="text-[#3b82f6]" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </button>

                            {openTaxDropdowns[item.id] && (
                              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-[90] overflow-hidden">
                                <div className="p-2 border-b border-gray-200 bg-white">
                                  <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded">
                                    <Search size={14} className="text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search"
                                      value={taxSearches[item.id] || ""}
                                      onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      className="flex-1 text-sm focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-52 overflow-y-auto">
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">Tax</div>
                                  {getFilteredTaxes(item.id).map((tax: any) => {
                                    const taxId = String(tax.id || tax._id);
                                    const taxName = tax.name || tax.taxName || "Tax";
                                    const rate = Number(tax.rate || 0);
                                    const selected = String(item.tax || "") === taxId || Number(item.taxRate || 0) === rate;
                                    return (
                                      <button
                                        key={taxId}
                                        type="button"
                                        className={`w-full px-3 py-2 text-left text-sm ${selected ? "bg-[#3b82f6] text-white" : "text-gray-700 hover:bg-gray-50"}`}
                                        onClick={() => {
                                          handleItemChange(item.id, "tax", taxId);
                                          setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                        }}
                                      >
                                        {taxName} [{rate}%]
                                      </button>
                                    );
                                  })}
                                  {getFilteredTaxes(item.id).length === 0 && (
                                    <div className="px-3 py-3 text-sm text-gray-500">No taxes found</div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="w-full border-t border-gray-200 px-3 py-2 text-left text-[#3b82f6] text-sm font-medium flex items-center gap-2 hover:bg-gray-50"
                                  onClick={() => {
                                    setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                    navigate("/settings/taxes/new");
                                  }}
                                >
                                  <PlusCircle size={14} />
                                  New Tax
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right align-top">
                        {item.itemType !== "header" && (
                          <span className="text-sm font-medium text-gray-900 block py-1.5">
                            {item.amount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center align-top">
                        <div
                          className="relative inline-flex items-center gap-2 py-1.5"
                          ref={(el) => {
                            itemMenuRefs.current[String(item.id)] = el;
                          }}
                        >
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenItemMenuId(openItemMenuId === item.id ? null : item.id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-600 transition-colors"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X size={16} />
                          </button>

                          {openItemMenuId === item.id && (
                            <div className="absolute top-full right-0 mt-0 min-w-[200px] bg-white border border-gray-200 rounded shadow-lg z-[80] overflow-hidden">
                              <button
                                type="button"
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                                onClick={() => {
                                  setShowAdditionalInformation(false);
                                  setOpenItemMenuId(null);
                                }}
                              >
                                Hide Additional Information
                              </button>
                              <button
                                type="button"
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                                onClick={() => {
                                  handleDuplicateItem(item.id);
                                  setOpenItemMenuId(null);
                                }}
                              >
                                Clone
                              </button>
                              <button
                                type="button"
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                                onClick={() => {
                                  const index = formData.items.findIndex((i: any) => i.id === item.id);
                                  if (index >= 0) {
                                    handleAddItem(index + 1);
                                  }
                                  setOpenItemMenuId(null);
                                }}
                              >
                                Insert New Row
                              </button>
                              <button
                                type="button"
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                                onClick={() => {
                                  const index = formData.items.findIndex((i: any) => i.id === item.id);
                                  if (index >= 0) {
                                    setBulkAddInsertIndex(index);
                                    setIsBulkAddModalOpen(true);
                                  }
                                  setOpenItemMenuId(null);
                                }}
                              >
                                Insert Items in Bulk
                              </button>
                              <button
                                type="button"
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                                onClick={() => {
                                  const index = formData.items.findIndex((i: any) => i.id === item.id);
                                  if (index >= 0) {
                                    handleInsertHeader(index);
                                  }
                                  setOpenItemMenuId(null);
                                }}
                              >
                                Insert New Header
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-[#e6f2f0] border border-[#b9d9d4] text-[#156372] rounded-md text-sm font-medium hover:bg-[#d6ece8] transition-colors"
                  onClick={() => setIsAddNewRowDropdownOpen(!isAddNewRowDropdownOpen)}
                >
                  <Plus size={16} />
                  Add New Row
                  <ChevronDown size={14} />
                </button>
                {isAddNewRowDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px]">
                    <div
                      className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        handleAddItem();
                        setIsAddNewRowDropdownOpen(false);
                      }}
                    >
                      Default Row
                    </div>
                  </div>
                )}
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#e6f2f0] border border-[#b9d9d4] text-[#156372] rounded-md text-sm font-medium hover:bg-[#d6ece8] transition-colors"
                onClick={() => setIsBulkAddModalOpen(true)}
              >
                <Plus size={16} />
                Add Items in Bulk
              </button>
              {!showAdditionalInformation && (
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsReportingTagsModalOpen(true)}
                >
                  <Tag size={16} />
                  Reporting Tags
                  <ChevronDown size={14} />
                </button>
              )}
            </div>



            {/* Summary and Notes Section */}
            <div className="mt-12 flex flex-col md:flex-row justify-between items-start gap-12 pb-32">
              {/* Left Column: Notes & Terms */}
              <div className="flex-1 w-full max-w-xl space-y-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-medium">Customer Notes</label>
                  <textarea
                    name="customerNotes"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-none h-24"
                    placeholder="Will be displayed on the quote"
                    value={formData.customerNotes}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-medium">Terms & Conditions</label>
                  <textarea
                    name="termsAndConditions"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:border-[#156372] resize-none h-24"
                    placeholder="Enter terms and conditions"
                    value={formData.termsAndConditions}
                    onChange={handleChange}
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <Paperclip size={16} className="text-gray-400" />
                    Attach File(s)
                  </label>
                  <div
                    className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#156372] transition-colors bg-gray-50/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={24} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload files</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                      accept="*/*"
                    />
                  </div>
                </div>
              </div>

              {/* Right: Summary */}
              <div className="w-full md:w-[540px] bg-[#f7f8fc] rounded-xl p-6 space-y-4 border border-gray-100" >
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Sub Total
                    <span className="ml-1 text-xs text-gray-500">
                      ({formData.taxExclusive === "Tax Inclusive" ? "Tax Inclusive" : "Tax Exclusive"})
                    </span>
                  </span>
                  <span className="text-gray-900 font-medium">{formData.subTotal.toFixed(2)}</span>
                </div>

                {showTransactionDiscount && (
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Discount</span>
                      <div className="flex items-center border border-gray-300 rounded bg-white px-1">
                        <input
                          type="number"
                          className="w-12 py-0.5 text-right text-xs outline-none bg-transparent"
                          value={formData.discount}
                          onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                        />
                        <select
                          className="text-[10px] text-gray-500 bg-transparent border-0 truncate outline-none cursor-pointer"
                          value={formData.discountType}
                          onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                        >
                          <option value="percent">%</option>
                          <option value="amount">{formData.currency}</option>
                        </select>
                      </div>
                    </div>
                    <div></div>
                    <span className="text-gray-900 font-medium">
                      {(formData.discountType === 'percent' ? (formData.subTotal * formData.discount / 100) : formData.discount).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Discount Account Selection - Only shows if discount > 0 */}
                {showTransactionDiscount && (formData.discount > 0) && (
                  <div className="flex flex-col gap-1 text-sm border-t border-gray-100 pt-2 pb-2">
                    <span className="text-gray-600 text-[11px] uppercase font-semibold">Discount Account</span>
                    <div className="relative" ref={discountAccountDropdownRef}>
                      <div
                        className="flex items-center justify-between border border-gray-300 rounded bg-white px-2 py-1.5 cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => setIsDiscountAccountOpen(!isDiscountAccountOpen)}
                      >
                        <span className="text-xs text-gray-700 truncate max-w-[180px]">
                          {formData.discountAccount || "Select Account"}
                        </span>
                        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                      </div>

                      {isDiscountAccountOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-[70] max-h-60 overflow-y-auto">
                          <div className="sticky top-0 bg-white p-2 border-b border-gray-100 z-10">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                              <input
                                type="text"
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[#156372]"
                                placeholder="Search accounts..."
                                value={discountAccountSearch}
                                onChange={(e) => setDiscountAccountSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="py-1">
                            {Object.entries(groupedDiscountAccounts).length > 0 ? (
                              Object.entries(groupedDiscountAccounts).map(([type, accounts]) => (
                                <div key={type} className="mb-2">
                                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">{type}</div>
                                  {accounts.map((account) => (
                                    <div
                                      key={account.id}
                                      className="px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex flex-col gap-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFormData(prev => ({ ...prev, discountAccount: account.name }));
                                        setIsDiscountAccountOpen(false);
                                      }}
                                    >
                                      <div className="font-medium">{account.name}</div>
                                      <div className="text-[10px] text-gray-400">{account.accountCode}</div>
                                    </div>
                                  ))}
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-gray-500 italic">No matching accounts found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showShippingCharges && (
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <span className="text-gray-600">Shipping Charges</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-0.5 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                      value={formData.shippingCharges}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.shippingCharges)) || 0).toFixed(2)}</span>
                  </div>
                )}

                {showShippingCharges && (parseFloat(String(formData.shippingCharges)) || 0) > 0 && (
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <span className="text-gray-600">Shipping Charge Tax</span>
                    <select
                      value={String(formData.shippingChargeTax || "")}
                      onChange={(e) => setFormData(prev => ({ ...prev, shippingChargeTax: e.target.value }))}
                      className="w-56 px-2 py-0.5 border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white text-gray-700"
                    >
                      <option value="">Select a Tax</option>
                      {taxes.map((tax: any) => {
                        const taxId = String(tax.id || tax._id || "");
                        const taxName = tax.name || tax.taxName || "Tax";
                        const rate = Number(tax.rate || 0);
                        return (
                          <option key={taxId} value={taxId}>
                            {taxName} [{rate}%]
                          </option>
                        );
                      })}
                    </select>
                    <span></span>
                  </div>
                )}

                <div className="border-t border-gray-200 my-2"></div>

                {taxBreakdown.map((tx) => (
                  <div key={tx.label} className="grid grid-cols-[1fr_auto] items-center text-sm">
                    <span className="text-gray-700">{tx.label}</span>
                    <span className="text-gray-900 font-medium">{tx.amount.toFixed(2)}</span>
                  </div>
                ))}

                {showAdjustment && (
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Adjustment</span>
                      <HelpCircle size={14} className="text-gray-300" />
                    </div>
                    <input
                      type="number"
                      className="w-20 px-2 py-0.5 text-right border border-gray-300 rounded text-xs outline-none focus:border-[#156372] bg-white"
                      value={formData.adjustment}
                      onChange={(e) => setFormData(prev => ({ ...prev, adjustment: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="text-gray-900 font-medium text-right">{(parseFloat(String(formData.adjustment)) || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[28px] leading-none font-semibold text-gray-900">Total ({formData.currency})</span>
                    <span className="text-2xl font-bold text-gray-900">{formData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-start gap-4 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleSaveDraft}
          disabled={saveLoading !== null}
          className={`px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {saveLoading === "draft" ? <Loader2 size={16} className="animate-spin" /> : null}
          {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={handleSaveAndSend}
          disabled={saveLoading !== null}
          className={`px-6 py-2 bg-[#156372] text-white rounded text-sm font-semibold hover:bg-[#0D4A52] transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {saveLoading === "send" ? <Loader2 size={16} className="animate-spin" /> : null}
          {saveLoading === "send" ? "Saving..." : "Save and Send"}
        </button>
        <button
          onClick={handleCancel}
          className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* New Item Modal */}
      {
        isNewItemModalOpen && (
          <div className="new-invoice-modal-overlay" onClick={handleCancelNewItem}>
            <div className="new-item-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-item-modal-header">
                <h2 className="new-item-modal-title">New Item</h2>
                <button
                  className="new-item-modal-close"
                  onClick={handleCancelNewItem}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="new-item-modal-body">
                {/* Top Section - Type, Name, SKU, Unit, and Image */}
                <div className="new-item-top-section">
                  <div className="new-item-form-left">
                    {/* Type */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Type
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-radio-group">
                        <label className="new-item-radio-label">
                          <input
                            type="radio"
                            name="type"
                            value="Goods"
                            checked={newItemData.type === "Goods"}
                            onChange={handleNewItemChange}
                            className="new-item-radio"
                          />
                          <span className="new-item-radio-dot"></span>
                          Goods
                        </label>
                        <label className="new-item-radio-label">
                          <input
                            type="radio"
                            name="type"
                            value="Service"
                            checked={newItemData.type === "Service"}
                            onChange={handleNewItemChange}
                            className="new-item-radio"
                          />
                          <span className="new-item-radio-dot"></span>
                          Service
                        </label>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Name<span className="new-item-required">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="new-item-input"
                        value={newItemData.name}
                        onChange={handleNewItemChange}
                      />
                    </div>

                    {/* SKU */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        SKU
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <input
                        type="text"
                        name="sku"
                        className="new-item-input"
                        value={newItemData.sku}
                        onChange={handleNewItemChange}
                      />
                    </div>

                    {/* Unit */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Unit
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="unit"
                          className="new-item-select"
                          value={newItemData.unit}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select or type to add</option>
                          <option value="pcs">pcs</option>
                          <option value="box">box</option>
                          <option value="kg">kg</option>
                          <option value="ltr">ltr</option>
                          <option value="m">m</option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="new-item-image-section">
                    <div
                      className="new-item-image-upload"
                      onClick={() => newItemImageRef.current?.click()}
                    >
                      {newItemImage ? (
                        <img src={newItemImage} alt="Item" className="new-item-image-preview" />
                      ) : (
                        <>
                          <ImageIcon size={48} className="new-item-image-icon" />
                          <p className="new-item-image-text">Drag image(s) here or</p>
                          <button type="button" className="new-item-browse-button">
                            Browse images
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      ref={newItemImageRef}
                      type="file"
                      accept="image/*"
                      onChange={handleNewItemImageUpload}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                {/* Sales and Purchase Information */}
                <div className="new-item-info-section">
                  {/* Sales Information */}
                  <div className="new-item-info-column">
                    <div className="new-item-info-header">
                      <h3 className="new-item-info-title">Sales Information</h3>
                      <label className="new-item-checkbox-label">
                        <input
                          type="checkbox"
                          name="sellable"
                          checked={newItemData.sellable}
                          onChange={handleNewItemChange}
                          className="new-item-checkbox"
                        />
                        Sellable
                      </label>
                    </div>

                    {/* Selling Price */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Selling Price<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-price-input">
                        <span className="new-item-currency-prefix">{formData.currency}</span>
                        <input
                          type="number"
                          name="sellingPrice"
                          className="new-item-input new-item-input-with-prefix"
                          value={newItemData.sellingPrice}
                          onChange={handleNewItemChange}
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Sales Account */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Account<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="salesAccount"
                          className="new-item-select"
                          value={newItemData.salesAccount}
                          onChange={handleNewItemChange}
                        >
                          <option value="Sales">Sales</option>
                          <option value="Service Income">Service Income</option>
                          <option value="Other Income">Other Income</option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>

                    {/* Sales Description */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">Description</label>
                      <textarea
                        name="salesDescription"
                        className="new-item-textarea"
                        value={newItemData.salesDescription}
                        onChange={handleNewItemChange}
                        rows={3}
                      />
                    </div>

                    {/* Sales Tax */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Tax
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="salesTax"
                          className="new-item-select"
                          value={newItemData.salesTax}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select a Tax</option>
                          {taxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>
                  </div>

                  {/* Purchase Information */}
                  <div className="new-item-info-column">
                    <div className="new-item-info-header">
                      <h3 className="new-item-info-title">Purchase Information</h3>
                      <label className="new-item-checkbox-label">
                        <input
                          type="checkbox"
                          name="purchasable"
                          checked={newItemData.purchasable}
                          onChange={handleNewItemChange}
                          className="new-item-checkbox"
                        />
                        Purchasable
                      </label>
                    </div>

                    {/* Cost Price */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Cost Price<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-price-input">
                        <span className="new-item-currency-prefix">{formData.currency}</span>
                        <input
                          type="number"
                          name="costPrice"
                          className="new-item-input new-item-input-with-prefix"
                          value={newItemData.costPrice}
                          onChange={handleNewItemChange}
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Purchase Account */}
                    <div className="new-item-field-group">
                      <label className="new-item-label new-item-label-red">
                        Account<span className="new-item-required">*</span>
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="purchaseAccount"
                          className="new-item-select"
                          value={newItemData.purchaseAccount}
                          onChange={handleNewItemChange}
                        >
                          <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                          <option value="Purchases">Purchases</option>
                          <option value="Expenses">Expenses</option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>

                    {/* Purchase Description */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">Description</label>
                      <textarea
                        name="purchaseDescription"
                        className="new-item-textarea"
                        value={newItemData.purchaseDescription}
                        onChange={handleNewItemChange}
                        rows={3}
                      />
                    </div>

                    {/* Purchase Tax */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">
                        Tax
                        <Info size={14} className="new-item-info-icon" />
                      </label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="purchaseTax"
                          className="new-item-select"
                          value={newItemData.purchaseTax}
                          onChange={handleNewItemChange}
                        >
                          <option value="">Select a Tax</option>
                          {taxes.map(tax => (
                            <option key={tax.id} value={tax.id}>{tax.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>

                    {/* Preferred Vendor */}
                    <div className="new-item-field-group">
                      <label className="new-item-label">Preferred Vendor</label>
                      <div className="new-item-select-wrapper">
                        <select
                          name="preferredVendor"
                          className="new-item-select"
                          value={newItemData.preferredVendor}
                          onChange={handleNewItemChange}
                        >
                          <option value=""></option>
                        </select>
                        <ChevronDown size={16} className="new-item-select-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Track Inventory Section */}
                <div className="new-item-inventory-section">
                  <label className="new-item-inventory-checkbox">
                    <input
                      type="checkbox"
                      name="trackInventory"
                      checked={newItemData.trackInventory}
                      onChange={handleNewItemChange}
                      className="new-item-checkbox"
                    />
                    <span className="new-item-inventory-label">
                      Track Inventory for this item
                      <Info size={14} className="new-item-info-icon" />
                    </span>
                  </label>
                  <p className="new-item-inventory-note">
                    You cannot enable/disable inventory tracking once you've created transactions for this item
                  </p>

                  {newItemData.trackInventory && (
                    <div className="new-item-inventory-info">
                      <Info size={16} className="new-item-inventory-info-icon" />
                      <span>Note: You can configure the opening stock and stock tracking for this item under the Items module</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="new-item-modal-footer">
                <button
                  className="new-item-button new-item-button-primary"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={handleSaveNewItem}
                >
                  Save
                </button>
                <button
                  className="new-item-button new-item-button-cancel"
                  onClick={handleCancelNewItem}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* New Project Modal */}
      {
        isNewProjectModalOpen && (
          <div className="new-invoice-modal-overlay" onClick={handleCancelNewProject}>
            <div className="new-project-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-project-modal-header">
                <h2 className="new-project-modal-title">New Project</h2>
                <button
                  className="new-project-modal-close"
                  onClick={handleCancelNewProject}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="new-project-modal-body">
                {/* Project Name */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Project Name<span className="new-project-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    className="new-project-input"
                    value={newProjectData.projectName}
                    onChange={handleNewProjectChange}
                  />
                </div>

                {/* Project Code */}
                <div className="new-project-field-row">
                  <label className="new-project-label">Project Code</label>
                  <input
                    type="text"
                    name="projectCode"
                    className="new-project-input"
                    value={newProjectData.projectCode}
                    onChange={handleNewProjectChange}
                  />
                </div>

                {/* Customer Name */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Customer Name<span className="new-project-required">*</span>
                  </label>
                  <div className="new-project-customer-select">
                    <select
                      name="customerName"
                      className="new-project-select"
                      value={newProjectData.customerName}
                      onChange={handleNewProjectChange}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.name}>{customer.name}</option>
                      ))}
                    </select>
                    <button type="button" className="new-project-search-btn">
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                {/* Billing Method */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Billing Method<span className="new-project-required">*</span>
                  </label>
                  <select
                    name="billingMethod"
                    className="new-project-select"
                    value={newProjectData.billingMethod}
                    onChange={handleNewProjectChange}
                  >
                    <option value="Fixed Cost for Project">Fixed Cost for Project</option>
                    <option value="Based on Project Hours">Based on Project Hours</option>
                    <option value="Based on Task Hours">Based on Task Hours</option>
                    <option value="Based on Staff Hours">Based on Staff Hours</option>
                  </select>
                </div>

                {/* Total Project Cost */}
                <div className="new-project-field-row">
                  <label className="new-project-label new-project-label-red">
                    Total Project Cost<span className="new-project-required">*</span>
                  </label>
                  <div className="new-project-price-input">
                    <span className="new-project-currency-prefix">{formData.currency}</span>
                    <input
                      type="number"
                      name="totalProjectCost"
                      className="new-project-input new-project-input-with-prefix"
                      value={newProjectData.totalProjectCost}
                      onChange={handleNewProjectChange}
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="new-project-field-row">
                  <label className="new-project-label">Description</label>
                  <textarea
                    name="description"
                    className="new-project-textarea"
                    placeholder="Max. 2000 characters"
                    value={newProjectData.description}
                    onChange={handleNewProjectChange}
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                {/* Budget Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Budget</h3>

                  {/* Cost Budget */}
                  <div className="new-project-field-row">
                    <label className="new-project-label">
                      Cost Budget
                      <Info size={14} className="new-project-info-icon" />
                    </label>
                    <div className="new-project-price-input">
                      <span className="new-project-currency-prefix">{formData.currency}</span>
                      <input
                        type="number"
                        name="costBudget"
                        className="new-project-input new-project-input-with-prefix"
                        value={newProjectData.costBudget}
                        onChange={handleNewProjectChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Revenue Budget */}
                  <div className="new-project-field-row">
                    <label className="new-project-label">
                      Revenue Budget
                      <Info size={14} className="new-project-info-icon" />
                    </label>
                    <div className="new-project-price-input">
                      <span className="new-project-currency-prefix">{formData.currency}</span>
                      <input
                        type="number"
                        name="revenueBudget"
                        className="new-project-input new-project-input-with-prefix"
                        value={newProjectData.revenueBudget}
                        onChange={handleNewProjectChange}
                        step="0.01"
                      />
                    </div>
                  </div>

                  <button type="button" className="new-project-link-button">
                    Add budget for project hours.
                  </button>
                </div>

                {/* Users Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Users</h3>

                  <table className="new-project-table">
                    <thead>
                      <tr>
                        <th className="new-project-th" style={{ width: "60px" }}>S.NO</th>
                        <th className="new-project-th">USER</th>
                        <th className="new-project-th">EMAIL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProjectData.users.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="new-project-td new-project-empty-row">
                            No users added yet
                          </td>
                        </tr>
                      ) : (
                        newProjectData.users.map((user, index) => (
                          <tr key={user.id}>
                            <td className="new-project-td">{index + 1}</td>
                            <td className="new-project-td">{user.name}</td>
                            <td className="new-project-td">{user.email}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="new-project-add-button"
                    onClick={handleAddProjectUser}
                  >
                    <Plus size={16} />
                    Add User
                  </button>
                </div>

                {/* Project Tasks Section */}
                <div className="new-project-section">
                  <h3 className="new-project-section-title">Project Tasks</h3>

                  <table className="new-project-table">
                    <thead>
                      <tr>
                        <th className="new-project-th" style={{ width: "60px" }}>S.NO</th>
                        <th className="new-project-th">TASK NAME</th>
                        <th className="new-project-th">DESCRIPTION</th>
                        <th className="new-project-th" style={{ width: "50px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProjectData.tasks.map((task, index) => (
                        <tr key={task.id}>
                          <td className="new-project-td">{index + 1}</td>
                          <td className="new-project-td">
                            <input
                              type="text"
                              className="new-project-table-input"
                              placeholder="Task Name"
                              value={task.taskName}
                              onChange={(e) => handleProjectTaskChange(task.id, 'taskName', e.target.value)}
                            />
                          </td>
                          <td className="new-project-td">
                            <textarea
                              className="new-project-table-textarea"
                              placeholder="Description"
                              value={task.description}
                              onChange={(e) => handleProjectTaskChange(task.id, 'description', e.target.value)}
                              rows={2}
                            />
                          </td>
                          <td className="new-project-td">
                            {newProjectData.tasks.length > 1 && (
                              <button
                                type="button"
                                className="new-project-delete-button"
                                onClick={() => handleRemoveProjectTask(task.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    className="new-project-add-button"
                    onClick={handleAddProjectTask}
                  >
                    <Plus size={16} />
                    Add Project Task
                  </button>
                </div>

                {/* Add to Watchlist */}
                <div className="new-project-checkbox-row">
                  <label className="new-project-checkbox-label">
                    <input
                      type="checkbox"
                      name="addToWatchlist"
                      checked={newProjectData.addToWatchlist}
                      onChange={handleNewProjectChange}
                      className="new-project-checkbox"
                    />
                    Add to the watchlist on my dashboard
                  </label>
                </div>
              </div>

              <div className="new-project-modal-footer">
                <button
                  className="new-project-button new-project-button-primary"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onClick={handleSaveNewProject}
                >
                  Save and Select
                </button>
                <button
                  className="new-project-button new-project-button-cancel"
                  onClick={handleCancelNewProject}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Quote Number Configuration Modal */}
      {
        isQuoteNumberModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setIsQuoteNumberModalOpen(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Configure Quote Number Preferences</h2>
                <button
                  onClick={() => setIsQuoteNumberModalOpen(false)}
                  className="p-2  rounded-lg text-gray-400 "
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Transaction Number Series Configuration Section */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-start gap-4">
                  <Settings size={20} className="text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-2">
                      Configure multiple transaction number series to auto-generate transaction numbers with unique prefixes according to your business needs.
                    </p>
                    <button className="text-[#156372]  text-sm font-medium">
                      Configure â†’
                    </button>
                  </div>
                </div>

                {/* Quote Numbering Preference Section */}
                <div className="mb-6">
                  {quoteNumberMode === "auto" ? (
                    <p className="text-sm text-gray-700 mb-4">
                      Your quote numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700 mb-4">
                      You have selected manual quote numbering. Do you want us to auto-generate it for you?
                    </p>
                  )}

                  {/* Radio Button Options */}
                  <div className="space-y-4">
                    {/* Auto-generate option */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="radio"
                          name="quoteNumberMode"
                          value="auto"
                          checked={quoteNumberMode === "auto"}
                          onChange={(e) => setQuoteNumberMode(e.target.value)}
                          className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            Continue auto-generating quote numbers
                          </span>
                          <Info size={14} className="text-gray-400" />
                        </div>
                        {quoteNumberMode === "auto" && (
                          <div className="mt-3 space-y-3 pl-6">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Prefix</label>
                              <input
                                type="text"
                                value={quotePrefix}
                                onChange={(e) => {
                                  setQuotePrefix(e.target.value);
                                  // Update quote number in real-time
                                  setFormData(prev => ({
                                    ...prev,
                                    quoteNumber: `${e.target.value}${quoteNextNumber}`
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Next Number</label>
                              <input
                                type="text"
                                value={quoteNextNumber}
                                onChange={(e) => {
                                  setQuoteNextNumber(e.target.value);
                                  // Update quote number in real-time
                                  setFormData(prev => ({
                                    ...prev,
                                    quoteNumber: `${quotePrefix}${e.target.value}`
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Manual option */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="radio"
                          name="quoteNumberMode"
                          value="manual"
                          checked={quoteNumberMode === "manual"}
                          onChange={(e) => setQuoteNumberMode(e.target.value)}
                          className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          Enter quote numbers manually
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsQuoteNumberModalOpen(false)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer "
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Update quote number based on mode
                    if (quoteNumberMode === "auto") {
                      setFormData(prev => ({
                        ...prev,
                        quoteNumber: `${quotePrefix}${quoteNextNumber}`
                      }));
                    }
                    // If switching to manual, keep current value but make it editable
                    setIsQuoteNumberModalOpen(false);
                  }}
                  className="px-6 py-2 text-white rounded-md text-sm font-medium cursor-pointer"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Contact Person Modal */}
      {
        isAddContactPersonModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]" onClick={() => setIsAddContactPersonModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-semibold text-gray-800">Add Contact Person</h2>
                <button onClick={() => setIsAddContactPersonModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="flex gap-12">
                  {/* Left side - Form */}
                  <div className="flex-1 space-y-5">
                    {/* Salutation & First Name */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Salutation</label>
                      <select
                        name="salutation"
                        value={contactPersonData.salutation}
                        onChange={handleContactPersonChange}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      >
                        <option value="">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Miss.">Miss.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-[#ea5b23] flex items-center gap-0.5">
                        First Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={contactPersonData.firstName}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={contactPersonData.lastName}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Email Address */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-[#ea5b23] flex items-center gap-0.5">
                        Email Address<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={contactPersonData.email}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Work Phone */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Work Phone</label>
                      <div className="flex gap-2">
                        <select
                          name="workPhonePrefix"
                          value={contactPersonData.workPhonePrefix}
                          onChange={handleContactPersonChange}
                          className="w-24 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        >
                          <option value="+358">+358</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+91">+91</option>
                        </select>
                        <input
                          type="text"
                          name="workPhone"
                          value={contactPersonData.workPhone}
                          onChange={handleContactPersonChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        />
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Mobile</label>
                      <div className="flex gap-2">
                        <select
                          name="mobilePrefix"
                          value={contactPersonData.mobilePrefix}
                          onChange={handleContactPersonChange}
                          className="w-24 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        >
                          <option value="+358">+358</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+91">+91</option>
                        </select>
                        <input
                          type="text"
                          name="mobile"
                          value={contactPersonData.mobile}
                          onChange={handleContactPersonChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                        />
                      </div>
                    </div>

                    {/* Skype */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Skype Name/Number</label>
                      <input
                        type="text"
                        name="skype"
                        value={contactPersonData.skype}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Designation */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={contactPersonData.designation}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>

                    {/* Department */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                      <label className="text-sm text-gray-600">Department</label>
                      <input
                        type="text"
                        name="department"
                        value={contactPersonData.department}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#156372]"
                      />
                    </div>
                  </div>

                  {/* Right side - Profile Image */}
                  <div className="w-48 flex flex-col items-center pt-2">
                    <div className="w-32 h-32 rounded border border-gray-300 bg-gray-50 flex items-center justify-center relative group overflow-hidden">
                      {contactPersonData.profileImage ? (
                        <img
                          src={URL.createObjectURL(contactPersonData.profileImage)}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-400">Profile Image</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <input type="file" className="hidden" accept="image/*" onChange={handleContactPersonImageUpload} />
                        <span className="text-white text-[10px] font-medium uppercase tracking-wider">Change Image</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-start gap-4">
                <button
                  onClick={handleSaveContactPerson}
                  className="px-6 py-1.5 bg-[#156372] text-white rounded text-sm font-medium hover:bg-[#0D4A52] transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsAddContactPersonModalOpen(false)}
                  className="px-6 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* Add Items in Bulk Modal */}
      {
        isBulkAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelBulkAdd}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add Items in Bulk</h2>
                <button
                  className="p-2  rounded-md text-gray-600 "
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {getBulkFilteredItems().map(item => {
                      const isSelected = bulkSelectedItems.find(selected => selected.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`p-4 cursor-pointer  border-b border-gray-200 flex items-center justify-between ${isSelected ? "bg-[#e8f7fa]" : ""
                            }`}
                          onClick={() => handleBulkItemToggle(item)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {item.sku} Rate: {formData.currency} {item.rate.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Stock on Hand {item.stockOnHand.toFixed(2)} {item.unit}
                            </div>
                            {isSelected && (
                              <div className="mt-2 w-6 h-6 bg-[#156372] rounded-full flex items-center justify-center">
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
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBulkItemToggle(selectedItem);
                                }}
                                className="p-1 text-red-500  rounded"
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
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium  disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleAddBulkItems}
                  disabled={bulkSelectedItems.length === 0}
                >
                  Add Items
                </button>
                <button
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium "
                  onClick={handleCancelBulkAdd}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Documents Modal */}
      {
        isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={() => setIsDocumentsModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 m-0">Documents</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Files"
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    {documentSearch && (
                      <button
                        onClick={() => setDocumentSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 "
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsDocumentsModalOpen(false)}
                    className="p-1 text-gray-400 "
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Navigation - INBOXES */}
                <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">INBOXES</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setSelectedInbox("files")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "files"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <Folder size={16} />
                        Files
                      </button>
                      <button
                        onClick={() => setSelectedInbox("bank-statements")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "bank-statements"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <CreditCard size={16} />
                        Bank Statements
                      </button>
                      <button
                        onClick={() => setSelectedInbox("all-documents")}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md ${selectedInbox === "all-documents"
                          ? "bg-[#156372] text-white"
                          : "text-gray-700 "
                          }`}
                      >
                        <FileText size={16} />
                        All Documents
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {(() => {
                    // Filter documents based on selected inbox
                    let filteredDocs = availableDocuments;

                    if (selectedInbox === "files") {
                      filteredDocs = availableDocuments.filter(doc =>
                        doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder
                      );
                    } else if (selectedInbox === "bank-statements") {
                      filteredDocs = availableDocuments.filter(doc =>
                        doc.folder === "Bank Statements" || doc.module === "Banking"
                      );
                    } else if (selectedInbox === "all-documents") {
                      filteredDocs = availableDocuments;
                    }

                    // Filter by search term
                    if (documentSearch) {
                      filteredDocs = filteredDocs.filter(doc =>
                        doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
                        (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
                      );
                    }

                    const allSelected = filteredDocs.length > 0 && filteredDocs.every(doc => selectedDocuments.includes(doc.id));

                    if (filteredDocs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <p className="text-gray-600 mb-4">Autoscan is disabled. Please enable it from the Inbox module.</p>
                          <a
                            href="#"
                            className="text-[#156372] "
                            onClick={(e) => {
                              e.preventDefault();
                              setIsDocumentsModalOpen(false);
                              navigate('/documents');
                            }}
                          >
                            Go to Inbox
                          </a>
                        </div>
                      );
                    }

                    return (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 px-4 py-3">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocuments(filteredDocs.map(doc => doc.id));
                                } else {
                                  setSelectedDocuments(selectedDocuments.filter(id => !filteredDocs.some(doc => doc.id === id)));
                                }
                              }}
                              className="cursor-pointer"
                            />
                          </div>
                          <div className="col-span-4">
                            <span className="text-xs font-semibold text-gray-700 uppercase">FILE NAME</span>
                          </div>
                          <div className="col-span-5">
                            <span className="text-xs font-semibold text-gray-700 uppercase">DETAILS</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-semibold text-gray-700 uppercase">UPLOADED BY</span>
                          </div>
                        </div>

                        {/* Table Body - Documents */}
                        {filteredDocs.map((doc) => (
                          <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 ">
                            <div className="col-span-1 flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.includes(doc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDocuments([...selectedDocuments, doc.id]);
                                  } else {
                                    setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                  }
                                }}
                                className="cursor-pointer"
                              />
                            </div>
                            <div className="col-span-4">
                              <a href="#" className="text-sm text-[#156372] ">
                                {doc.name}
                              </a>
                            </div>
                            <div className="col-span-5">
                              <div className="text-sm text-gray-700 space-y-1">
                                {doc.associatedTo && <div>{doc.associatedTo}</div>}
                                {doc.module && <div>Module: {doc.module}</div>}
                                {doc.uploadedOn && <div>Date: {doc.uploadedOn}</div>}
                                {doc.size && <div>Size: {doc.size}</div>}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm text-gray-700">{doc.uploadedBy || "Me"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (selectedDocuments.length > 0) {
                      // Get selected documents from availableDocuments
                      const selectedDocs = availableDocuments.filter(doc =>
                        selectedDocuments.includes(doc.id)
                      );

                      // Convert to attachedFiles format
                      const newDocs = selectedDocs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                        file: null,
                        documentId: doc.id // Store reference to document
                      }));

                      setFormData(prev => ({
                        ...prev,
                        attachedFiles: [...prev.attachedFiles, ...newDocs]
                      }));
                    }
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer "
                >
                  Attachments
                </button>
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer   "
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Cloud Picker Modal */}
      {
        isCloudPickerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsCloudPickerOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="text-red-500 "
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Cloud Services Sidebar */}
                <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                  <div className="p-2">
                    {[
                      { id: "taban", name: "Taban Books Drive", icon: LayoutGrid },
                      { id: "gdrive", name: "Google Drive", icon: HardDrive },
                      { id: "dropbox", name: "Dropbox", icon: Box },
                      { id: "box", name: "Box", icon: Square },
                      { id: "onedrive", name: "OneDrive", icon: Cloud },
                      { id: "evernote", name: "Evernote", icon: FileText },
                    ].map((provider) => {
                      const IconComponent = provider.icon;
                      const isSelected = selectedCloudProvider === provider.id;
                      return (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedCloudProvider(provider.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${isSelected
                            ? "bg-[#e8f7fa] text-[#156372] border-l-4 border-[#156372]"
                            : "text-gray-700 "
                            }`}
                        >
                          <IconComponent
                            size={24}
                            className={isSelected ? "text-[#156372]" : "text-gray-500"}
                          />
                          <span>{provider.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Scroll indicator */}
                  <div className="mt-auto p-2 flex justify-center">
                    <div className="flex flex-col gap-1">
                      <ChevronUp size={16} className="text-gray-300" />
                      <ChevronDown size={16} className="text-gray-300" />
                    </div>
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books. The use and transfer of information received from Google APIs to Taban Books will adhere to{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            Google API Services User Data Policy
                          </a>
                          , including the{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            Limited Use Requirements
                          </a>
                          .
                        </p>
                      </div>

                      {/* Authenticate Google Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://accounts.google.com/v3/signin/accountchooser?access_type=offline&approval_prompt=force&client_id=932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fapps.tabanbooks.com%2Fauth%2Fgoogle&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=3a3b0106a0c2d908b369a75ad93185c0aa431c64497733bda2d375130c4da610d88104c252c552adc1dee9d6167ad6bb8d2258113b9dce48b47ca4a970314a1fa7b51df3a7716016ac37be9e7d4d9f21077f946b82dc039ae2f08b7be79117042545529cf82d67d58ef6426621f5b5f885af900571347968d419f6d1a5abe3e7e1a3a4d04a433a6b3c5173f68c0c5bea&dsh=S557386361%3A1766903862725658&o2v=1&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAP8z-36EGAbjuuLEd2uWDyjQgraM1HNpjnJVe4mUhXhPOQkoJHNKZG6WoCFPPrb5EDYGeFuyF3TI7jUSvDUIwBbk0PGoZLgn4Jt5TdOWWzFyQf6jLfEXhnKHaHRvCzRofERa0CbAnwAUviCEIRh6OE8GWAy3xDGHH6VltpKe7vSGjJfzwkDnAckJm1v9fghFiv7u6_xqfZlF8iB26QlWNE86HHYqzyIP3N9LKEh0NWNZAdiV__IdSu_RqOJPYoHDRNRRsyctIbVsj3CDhUyCADZvROzoeQI9VvIqJSiWLTxE7royBXKDDS96rJYovyIQ79hC_n_aNjoPVUD9jfp5cnJkn_rkGpzetwAYJTRSKhP8gM5YlFdK2Pfp2uT6ZHzVAOYmlyeCX4dc1IsyRtinTLx5WyAUPR_QcLPQzuQcRPvtjL23ZvKxoexvKp3t4zX_HTFKMrduT4G6ojAd7C-kurnZ1Wx6g%26flowName%3DGeneralOAuthFlow%26as%3DS557386361%253A1766903862725658%26client_id%3D932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fapps.tabanbooks.com",
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
                          {/* Dropbox Box Logo - Geometric box made of smaller boxes */}
                          <svg viewBox="0 0 128 128" className="w-full h-full">
                            <defs>
                              <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061FF" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            {/* Dropbox geometric box icon - composed of smaller boxes */}
                            <g fill="url(#dropboxGradient)">
                              {/* Top-left box */}
                              <rect x="8" y="8" width="48" height="48" rx="4" />
                              {/* Top-right box */}
                              <rect x="72" y="8" width="48" height="48" rx="4" />
                              {/* Bottom-left box */}
                              <rect x="8" y="72" width="48" height="48" rx="4" />
                              {/* Bottom-right box */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Dropbox Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=ovpkm9147d63ifh&redirect_uri=https://apps.tabanbooks.com/dropbox/auth/v2/saveToken&state=190d910cedbc107e58195259f79a434d05c66c88e1e6eaa0bc585c6a0fddb159871ede64adb4d5da61c107ca7cbb7bae891c80e9c69cf125faaaf622ab58f37c5b1d42b42c7f3add07d92465295564a6c5bd98228654cce8ff68da24941db6f0aab9a60398ac49e41b3ec211acfd5bcc&force_reapprove=true&token_access_type=offline",
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
                          {/* Box Logo - Blue "b" inside a square with cloud background */}
                          <div className="relative">
                            {/* White cloud shape background */}
                            <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                            {/* Blue square with rounded corners */}
                            <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                              {/* White lowercase "b" */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Box Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://account.box.com/api/oauth2/authorize?response_type=code&client_id=f95f6ysfm8vg1q3g84m0xyyblwnj3tr5&redirect_uri=https%3A%2F%2Fapps.tabanbooks.com%2Fauth%2Fbox&state=37e352acfadd37786b1d388fb0f382baa59c9246f4dda329361910db55643700578352e4636bde8a0743bd3060e51af0ee338a34b2080bbd53a337f46b0995e28facbeff76d7efaf8db4493a0ef77be45364e38816d94499fba739987744dd1f6f5c08f84c0a11b00e075d91d7ea5c6d",
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
                          {/* OneDrive Logo - Blue cloud icon */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate OneDrive Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=0ecabec7-1fac-433f-a968-9985926b51c3&state=e0b1053c9465a9cb98fea7eea99d3074930c6c5607a21200967caf2db861cf9df77442c92e8565087c2a339614e18415cbeb95d59c63605cee4415353b2c44da13c6b9f34bca1fcd3abdd630595133a5232ddb876567bedbe620001a59c9989df94c3823476d0eef4363b351e8886c5563f56bc9d39db9f3db7c37cd1ad827c5.%5E.US&redirect_uri=https%3A%2F%2Fapps.tabanbooks.com%2Ftpa%2Foffice365&response_type=code&prompt=select_account&scope=Files.Read%20User.Read%20offline_access&sso_reload=true",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate OneDrive
                      </button>
                    </div>
                  ) : selectedCloudProvider === "evernote" ? (
                    /* Evernote Authentication Content */
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Evernote Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Evernote Logo - Green square with elephant head */}
                          <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
                            {/* Elephant head silhouette - simplified */}
                            <svg viewBox="0 0 100 100" className="w-20 h-20">
                              {/* Elephant head - main shape */}
                              <path
                                d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                                fill="#2D2926"
                              />
                              {/* Elephant ear */}
                              <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                              {/* Elephant trunk */}
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
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-[#156372] underline "
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Evernote Button */}
                      <button
                        className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold  shadow-sm"
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
                      {/* Illustration Area - Using a placeholder illustration */}
                      <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                        <div className="relative w-full h-full">
                          {/* Stylized illustration with people and documents */}
                          <div className="absolute inset-0 flex items-end justify-center">
                            {/* Person on document with laptop */}
                            <div className="relative">
                              <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-[#156372] rounded-full flex items-center justify-center">
                                  <Plus size={20} className="text-white" />
                                </div>
                              </div>
                              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                                <div className="w-8 h-6 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            {/* Person pushing document */}
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
                            {/* Person with list */}
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
                          {/* Decorative shapes */}
                          <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="absolute top-12 right-12 w-4 h-4 bg-[#156372] transform rotate-45"></div>
                          <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                          <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                        </div>
                      </div>

                      {/* Description Text */}
                      <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                        Taban Books Drive is an online file sync, storage and content collaboration platform.
                      </p>

                      {/* Set up your team button */}
                      <button
                        className="px-6 py-2.5 bg-[#156372] text-white rounded-md text-sm font-semibold  shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://drive.tabanbooks.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=TabanBooks",
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
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium "
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsCloudPickerOpen(false);
                  }}
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium "
                >
                  Attach
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Reporting Tags Modal */}
      {isReportingTagsModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsReportingTagsModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Reporting Tags</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700">
                There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
              <button
                className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium border border-[#156372]"
                onClick={() => setIsReportingTagsModalOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Customer Search Modal */}
      {
        customerSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
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
                  className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center "
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
                      className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700  flex items-center gap-2"
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
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 "
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
                    className="px-6 py-2 bg-red-600 text-white rounded-md  font-medium"
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
                          className=" cursor-pointer"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setFormData(prev => ({ ...prev, customerName: customer.displayName || customer.name || "" }));
                            setCustomerSearchModalOpen(false);
                            setCustomerSearchTerm("");
                            setCustomerSearchResults([]);
                          }}
                        >
                          <td className="px-4 py-3 text-sm text-[#156372] ">
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
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed "
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
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed "
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      }

      {/* Quick New Customer Modal */}
      {
        typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={() => {
              setIsNewCustomerQuickActionOpen(false);
              reloadCustomersForQuote();
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
                      await reloadCustomersForQuote();
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
                    reloadCustomersForQuote();
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
        )
      }

      {/* Quick New Project Modal */}
      {
        typeof document !== "undefined" && document.body && createPortal(
          <div
            className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewProjectQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
            onClick={() => {
              setIsNewProjectQuickActionOpen(false);
              reloadProjectsForQuote();
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-[96vw] h-[94vh] max-w-[1400px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">New Project (Quick Action)</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isReloadingProjectFrame || isAutoSelectingProjectFromQuickAction}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      setIsReloadingProjectFrame(true);
                      setProjectQuickActionFrameKey(prev => prev + 1);
                    }}
                  >
                    {isReloadingProjectFrame ? "Reloading..." : "Reload Form"}
                  </button>
                  <button
                    type="button"
                    disabled={isRefreshingProjectsQuickAction || isAutoSelectingProjectFromQuickAction}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={async () => {
                      setIsRefreshingProjectsQuickAction(true);
                      await reloadProjectsForQuote();
                      setIsRefreshingProjectsQuickAction(false);
                    }}
                  >
                    {isRefreshingProjectsQuickAction ? "Refreshing..." : "Refresh Projects"}
                  </button>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center"
                  onClick={() => {
                    setIsNewProjectQuickActionOpen(false);
                    reloadProjectsForQuote();
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 p-2 bg-gray-100">
                <iframe
                  key={projectQuickActionFrameKey}
                  title="New Project Quick Action"
                  src={`/time-tracking/projects/new?embed=1${selectedCustomer?.id ? `&customerId=${encodeURIComponent(String(selectedCustomer.id))}` : ""}`}
                  loading="eager"
                  onLoad={async () => {
                    if (isReloadingProjectFrame) {
                      setIsReloadingProjectFrame(false);
                    }
                    await tryAutoSelectNewProjectFromQuickAction();
                  }}
                  className="w-full h-full bg-white rounded border border-gray-200"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* New Salesperson Modal */}
      {
        isNewSalespersonFormOpen && !isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsNewSalespersonFormOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Add New Salesperson</h2>
                <button
                  onClick={() => setIsNewSalespersonFormOpen(false)}
                  className="p-2  rounded-lg text-gray-400 "
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={newSalespersonData.name}
                      onChange={handleNewSalespersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={newSalespersonData.email}
                      onChange={handleNewSalespersonChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveAndSelectSalesperson}
                      className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md "
                    >
                      Add
                    </button>
                    <button
                      onClick={handleCancelNewSalesperson}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md "
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Manage Salespersons Modal */}
      {
        isManageSalespersonsOpen && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsManageSalespersonsOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Manage Salespersons</h2>
                <button
                  onClick={() => setIsManageSalespersonsOpen(false)}
                  className="p-2  rounded-lg text-gray-400 "
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search and Add Button / Bulk Actions */}
              {selectedSalespersonIds.length > 0 ? (
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                      Merge
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Bulk Actions Menu Trigger
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ top: rect.bottom, left: rect.left });
                        setManageSalespersonMenuOpen("BULK_ACTIONS");
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2"
                    >
                      More Actions
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedSalespersonIds([])}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="p-6 border-b border-gray-200 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Salesperson"
                      value={manageSalespersonSearch}
                      onChange={(e) => setManageSalespersonSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsNewSalespersonFormOpen(true);
                      setManageSalespersonSearch("");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md "
                  >
                    <Plus size={16} />
                    New Salesperson
                  </button>
                </div>
              )}

              {/* Salespersons List */}
              <div className="flex-1 overflow-y-auto p-6">
                {isNewSalespersonFormOpen ? (
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Salesperson</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={newSalespersonData.name}
                          onChange={handleNewSalespersonChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={newSalespersonData.email}
                          onChange={handleNewSalespersonChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter email"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAndSelectSalesperson}
                          className="flex-1 px-4 py-2 bg-[#156372] text-white rounded-md "
                        >
                          Add
                        </button>
                        <button
                          onClick={handleCancelNewSalesperson}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md "
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                          checked={filteredManageSalespersons.length > 0 && selectedSalespersonIds.length === filteredManageSalespersons.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSalespersonIds(filteredManageSalespersons.map(s => s.id || s._id));
                            } else {
                              setSelectedSalespersonIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SALESPERSON NAME</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredManageSalespersons.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          {manageSalespersonSearch ? "No salespersons found" : "No salespersons available"}
                        </td>
                      </tr>
                    ) : (
                      filteredManageSalespersons.map(salesperson => {
                        const salespersonId = salesperson.id || salesperson._id;
                        return (
                          <tr key={salespersonId} className="group hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-[#156372] focus:ring-[#156372]"
                                  checked={selectedSalespersonIds.includes(salespersonId)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSalespersonIds([...selectedSalespersonIds, salespersonId]);
                                    } else {
                                      setSelectedSalespersonIds(selectedSalespersonIds.filter(id => id !== salespersonId));
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {salesperson.name}
                              {salesperson.status === 'inactive' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{salesperson.email || ""}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="hidden group-hover:flex items-center justify-end gap-2">
                                <button
                                  className="p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuPosition({ top: rect.bottom, left: rect.right });
                                    setManageSalespersonMenuOpen(manageSalespersonMenuOpen === salespersonId ? null : salespersonId);
                                  }}
                                  className={`p-1 text-gray-500 hover:text-[#156372] hover:bg-gray-100 rounded ${manageSalespersonMenuOpen === salespersonId ? 'bg-gray-100 text-[#156372]' : ''}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dropdown Portal */}
            {manageSalespersonMenuOpen && menuPosition && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[10000]"
                  onClick={() => setManageSalespersonMenuOpen(null)}
                />
                <div
                  className="fixed bg-white rounded-md shadow-lg z-[10001] border border-gray-100 py-1 w-48"
                  style={{
                    top: menuPosition.top,
                    left: manageSalespersonMenuOpen === "BULK_ACTIONS" ? menuPosition.left : menuPosition.left - 192
                  }}
                >
                  {manageSalespersonMenuOpen === "BULK_ACTIONS" ? (
                    <>
                      <button
                        onClick={() => setManageSalespersonMenuOpen(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Mark as Active
                      </button>
                      <button
                        onClick={() => setManageSalespersonMenuOpen(null)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        onClick={() => {
                          // Handle bulk delete if needed
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Mark as Inactive
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteSalesperson(manageSalespersonMenuOpen);
                          setManageSalespersonMenuOpen(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#156372] hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>,
          document.body
        )
      }
    </>
  );
};

export default NewQuote;





