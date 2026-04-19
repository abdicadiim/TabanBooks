import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Info,
  ShoppingBag,
  Upload,
  Image as ImageIcon,
  MoreVertical,
  Check,
  Trash2,
  Settings,
  Copy,
  Tag,
  Grid3x3,
  ScanLine,
  Folder,
  Cloud,
  Box,
  Layers,
  HardDrive,
  Paperclip,
  File,
  FileText,
  Pencil,
  CheckSquare,
  Printer,
  Lock,
  ClipboardList,
  CreditCard,
  Square,
  RefreshCw,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";
import { saveInvoice, getInvoiceById, updateInvoice, getTaxes, saveTax, deleteTax, Customer, Tax, Salesperson, Invoice, ContactPerson } from "../../salesModel";
import { getAllDocuments } from "../../../../utils/documentStorage";
import { customersAPI, salespersonsAPI, projectsAPI, invoicesAPI, itemsAPI, bankAccountsAPI, currenciesAPI, transactionNumberSeriesAPI, chartOfAccountsAPI, accountantAPI } from "../../../../services/api";
import { useCurrency } from "../../../../hooks/useCurrency";
import { usePaymentTermsDropdown, defaultPaymentTerms, PaymentTerm } from "../../../../hooks/usePaymentTermsDropdown";
import { API_BASE_URL, getToken } from "../../../../services/auth";
import SalespersonDropdown from "../../components/SalespersonDropdown";
import { ConfigurePaymentTermsModal } from "../../../../components/ConfigurePaymentTermsModal";
import toast from "react-hot-toast";

interface Item {
  id: string | number;
  name: string;
  sku: string;
  rate: number;
  stockOnHand: number;
  unit: string;
  taxInfo?: {
    taxId?: string;
    taxName?: string;
    taxRate?: number;
  };
  taxId?: string;
  salesTax?: string | number;
  salesTaxId?: string;
  salesTaxRate?: number;
  taxRate?: number;
  tax?: string | number;
}

interface AttachedFile {
  id: string | number;
  name: string;
  size?: string | number;
  type?: string;
  file: File | null;
  documentId?: string;
  preview?: string | null;
}

interface InvoiceItem {
  id: string | number;
  itemId?: string;
  itemDetails: string;
  quantity: number;
  rate: number;
  tax: string;
  amount: number;
  name?: string;
  sku?: string;
  unit?: string;
  discount?: number;
  discountType?: "percent" | "amount";
  stockOnHand?: number;
}

interface InvoiceFormState {
  customerName: string;
  mobile: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  dueDate: string;
  receipt: string;
  accountsReceivable: string;
  salesperson: string;
  salespersonId: string;
  subject: string;
  taxExclusive: string;
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  discountType: string;
  discountAccount: string;
  shippingCharges: number;
  shippingChargeTax: string;
  adjustment: number;
  roundOff: number;
  total: number;
  currency: string;
  customerNotes: string;
  termsAndConditions: string;
  attachedFiles: AttachedFile[];
  status: string;
}

const normalizePaymentTerm = (term?: string) => {
  const normalized = String(term || "").trim().toLowerCase();
  switch (normalized) {
    case "":
    case "due_on_receipt":
    case "due on receipt":
      return "Due on Receipt";
    case "net_15":
    case "net 15":
      return "Net 15";
    case "net_30":
    case "net 30":
      return "Net 30";
    case "net_45":
    case "net 45":
      return "Net 45";
    case "net_60":
    case "net 60":
      return "Net 60";
    case "due_end_of_the_month":
    case "due end of the month":
      return "Due end of the month";
    case "due_end_of_next_month":
    case "due end of next month":
      return "Due end of next month";
    default:
      return term as string;
  }
};

// Initial tax options will be loaded from the database

// All data is now fetched from backend database

export default function NewInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;
  const { baseCurrency, symbol } = useCurrency();
  const currencySymbol = symbol || baseCurrency?.symbol || "$";
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const [saveLoading, setSaveLoading] = useState<null | "draft" | "send">(null);

  // Get customer data from navigation state (when coming from customer detail page)
  const customerFromState = location.state?.customerId ? {
    id: location.state.customerId,
    name: location.state.customerName
  } : null;

  // Get quote data from navigation state (when converting from quote)
  const quoteDataFromState = location.state?.quoteData || null;
  const clonedDataFromState = location.state?.clonedData || null;
  const [formData, setFormData] = useState<InvoiceFormState>({
    customerName: "",
    mobile: "",
    invoiceNumber: "INV-000001",
    orderNumber: "",
    invoiceDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' '),
    dueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' '),
    receipt: "Due on Receipt",
    accountsReceivable: "Accounts Receivable",
    salesperson: "",
    salespersonId: "",
    subject: "",
    taxExclusive: "Tax Exclusive",
    items: [
      { id: `item-${Date.now()}`, itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 }
    ],
    subTotal: 0,
    discount: 0,
    discountType: "percent",
    discountAccount: "General Income",
    shippingCharges: 0,
    shippingChargeTax: "",
    adjustment: 0,
    roundOff: 0,
    total: 0,
    currency: "",
    customerNotes: "Thanks for your business.",
    termsAndConditions: "",
    attachedFiles: [],
    status: "draft"
  });
  const hasAppliedCloneRef = useRef(false);

  useEffect(() => {
    if (isEditMode || !clonedDataFromState || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedDataFromState as any;
    const toDisplayDate = (value: any, fallback: string) => {
      if (!value) return fallback;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      }
      return String(value);
    };

    const mappedItems = Array.isArray(cloned.items) && cloned.items.length > 0
      ? cloned.items.map((item: any, index: number) => {
        const itemId = item.itemId || (item.item && typeof item.item === 'object' ? (item.item._id || item.item.id) : item.item);
        return {
          id: `item-${Date.now()}-${index}`,
          itemId: itemId || undefined,
          itemDetails: item.itemDetails || item.name || item.description || (item.item && typeof item.item === 'object' ? item.item.name : "") || "",
          quantity: toPositiveNumberOr(item.quantity, 1),
          rate: toNumberSafe(item.rate ?? item.price ?? (item.item && typeof item.item === 'object' ? item.item.sellingPrice : 0) ?? 0),
          tax: String(item.tax || item.taxId || (item.item && typeof item.item === 'object' ? item.item.taxId : "") || ""),
          amount: toNumberSafe(item.amount ?? 0),
          sku: item.sku || (item.item && typeof item.item === 'object' ? item.item.sku : ""),
          unit: item.unit || (item.item && typeof item.item === 'object' ? item.item.unit : "pcs")
        };
      })
      : undefined;

    setFormData(prev => ({
      ...prev,
      customerName: cloned.customerName || cloned.customer?.displayName || cloned.customer?.name || prev.customerName,
      mobile: cloned.mobile || prev.mobile,
      orderNumber: cloned.orderNumber || prev.orderNumber,
      invoiceDate: toDisplayDate(cloned.invoiceDate || cloned.date, prev.invoiceDate),
      dueDate: toDisplayDate(cloned.dueDate, prev.dueDate),
      receipt: cloned.receipt || cloned.paymentTerms || prev.receipt,
      accountsReceivable: cloned.accountsReceivable || prev.accountsReceivable,
      salesperson: cloned.salesperson || prev.salesperson,
      salespersonId: cloned.salespersonId || prev.salespersonId,
      subject: cloned.subject || prev.subject,
      taxExclusive: cloned.taxExclusive || prev.taxExclusive,
      items: mappedItems || prev.items,
      discount: toNumberSafe(cloned.discount ?? prev.discount),
      discountType: cloned.discountType || prev.discountType,
      discountAccount: cloned.discountAccount || prev.discountAccount,
      shippingCharges: toNumberSafe(cloned.shippingCharges ?? prev.shippingCharges),
      shippingChargeTax: String(cloned.shippingChargeTax || cloned.shippingTax || cloned.shippingTaxId || prev.shippingChargeTax || ""),
      adjustment: toNumberSafe(cloned.adjustment ?? prev.adjustment),
      roundOff: toNumberSafe(cloned.roundOff ?? prev.roundOff),
      currency: cloned.currency || prev.currency,
      customerNotes: cloned.customerNotes || cloned.notes || prev.customerNotes,
      termsAndConditions: cloned.termsAndConditions || cloned.terms || prev.termsAndConditions,
      attachedFiles: [],
      status: "draft"
    }));
  }, [clonedDataFromState, isEditMode]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>(defaultPaymentTerms);
  const [isConfigureTermsOpen, setIsConfigureTermsOpen] = useState(false);
  const {
    selectedTerm: selectedPaymentTerm,
    isOpen: isPaymentTermsOpen,
    searchQuery: paymentTermsSearchQuery,
    filteredTerms: filteredPaymentTerms,
    dropdownRef: paymentTermsDropdownRef,
    setSearchQuery: setPaymentTermsSearchQuery,
    setSelectedTerm: setSelectedPaymentTerm,
    handleSelect: handlePaymentTermSelect,
    handleToggle: togglePaymentTermsDropdown
  } = usePaymentTermsDropdown({
    initialValue: normalizePaymentTerm(formData.receipt),
    customTerms: paymentTerms,
    onSelect: (term) => {
      setFormData(prev => ({
        ...prev,
        receipt: term.value
      }));
    }
  });

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
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
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);
  const [isSalespersonDropdownOpen, setIsSalespersonDropdownOpen] = useState(false);
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
  const [isManageSalespersonsOpen, setIsManageSalespersonsOpen] = useState(false);
  const [manageSalespersonSearch, setManageSalespersonSearch] = useState("");
  const [manageSalespersonMenuOpen, setManageSalespersonMenuOpen] = useState<string | null>(null);
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isNewSalespersonFormOpen, setIsNewSalespersonFormOpen] = useState(false);
  const [newSalespersonData, setNewSalespersonData] = useState({ name: "", email: "" });
  const [editingSalespersonId, setEditingSalespersonId] = useState<string | null>(null);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [openItemDropdowns, setOpenItemDropdowns] = useState<Record<string, boolean>>({});
  const [itemSearches, setItemSearches] = useState<Record<string, string>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string>>({});
  const itemDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [shippingTaxSearch, setShippingTaxSearch] = useState("");
  const [isShippingTaxDropdownOpen, setIsShippingTaxDropdownOpen] = useState(false);
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [newTaxData, setNewTaxData] = useState({
    name: "",
    rate: "",
    isCompound: false
  });
  const [taxOptions, setTaxOptions] = useState<Tax[]>([]);
  const [accountsReceivableOptions, setAccountsReceivableOptions] = useState<any[]>([]);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isScanModeOpen, setIsScanModeOpen] = useState(false);

  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showItemDiscount = discountMode === "line-item";
  const showTransactionDiscount = discountMode === "transaction";
  const showShippingCharges = enabledSettings?.chargeSettings?.shippingCharges !== false;
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "inclusive";
  const taxExclusiveOptions = useMemo(() => {
    if (taxMode === "inclusive") return ["Tax Inclusive"];
    if (taxMode === "exclusive") return ["Tax Exclusive"];
    return ["Tax Exclusive", "Tax Inclusive"];
  }, [taxMode]);

  const toNumberSafe = (value: any) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const normalized = value.trim().replace(/,/g, "");
      if (!normalized) return 0;

      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;

      const match = normalized.match(/-?\d+(\.\d+)?/);
      if (match) {
        const extracted = Number(match[0]);
        return Number.isFinite(extracted) ? extracted : 0;
      }

      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toPositiveNumberOr = (value: any, fallback: number) => {
    const parsed = toNumberSafe(value);
    return parsed > 0 ? parsed : fallback;
  };

  const resolveSubtotalFromData = (doc: any, fallbackItems: any[] = []) => {
    const explicitSubtotal = toNumberSafe(doc?.subTotal ?? doc?.subtotal);
    if (explicitSubtotal > 0) return explicitSubtotal;

    return (Array.isArray(fallbackItems) ? fallbackItems : []).reduce((sum, item) => {
      const quantity = toNumberSafe(item?.quantity);
      const rate = toNumberSafe(item?.rate ?? item?.unitPrice ?? item?.price);
      return sum + (quantity * rate);
    }, 0);
  };

  const normalizeIncomingDiscount = (doc: any, subTotalValue: number, taxValue: number) => {
    const discountTypeRaw = String(doc?.discountType || "percent").toLowerCase();
    const discountTypeValue = discountTypeRaw === "amount" ? "amount" : "percent";
    const rawDiscount = toNumberSafe(doc?.discount);

    if (discountTypeValue === "amount" || rawDiscount <= 0 || subTotalValue <= 0) {
      return { discountValue: rawDiscount, discountTypeValue };
    }

    const taxModeRaw = String(doc?.taxExclusive || "Tax Exclusive").toLowerCase();
    const isInclusive = taxModeRaw.includes("inclusive");
    const shipping = toNumberSafe(doc?.shippingCharges);
    const adjustment = toNumberSafe(doc?.adjustment);
    const roundOff = toNumberSafe(doc?.roundOff);
    const totalValue = toNumberSafe(doc?.total ?? doc?.amount);

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

  // Calculate tax summary for the summary section
  const parseTaxRate = (rate: unknown) => {
    if (typeof rate === "number") return Number.isFinite(rate) ? rate : 0;
    const parsed = parseFloat(String(rate ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const findTaxOptionById = (taxId?: string) => {
    if (!taxId) return undefined;
    const normalized = String(taxId);
    return taxOptions.find((t: any) => String(t.id ?? t._id ?? "") === normalized);
  };

  const getTaxDisplayLabel = (tax?: Tax) => {
    if (!tax) return "";
    const rawName = String((tax as any).name || "").trim();
    const baseName = rawName.replace(/\s*\[?\d+(\.\d+)?%\]?$/i, "").trim() || rawName;
    return `${baseName} [${Number((tax as any).rate || 0)}%]`;
  };

  const getTaxBySelection = (value: unknown) => {
    const valueStr = String(value ?? "").trim();
    if (!valueStr) return undefined;

    const byId = findTaxOptionById(valueStr);
    if (byId) return byId;

    const normalized = valueStr.toLowerCase();
    const byName = taxOptions.find((tax: any) => {
      const name = String((tax as any).name || "").trim().toLowerCase();
      const label = getTaxDisplayLabel(tax).toLowerCase();
      return name === normalized || label === normalized;
    });
    if (byName) return byName;

    const numericCandidate = parseTaxRate(valueStr);
    if (numericCandidate > 0) {
      return taxOptions.find((tax: any) => Math.abs(parseTaxRate((tax as any).rate) - numericCandidate) < 0.0001);
    }
    return undefined;
  };

  const isTaxInclusiveMode = (taxExclusive?: string) => String(taxExclusive || "").trim().toLowerCase() === "tax inclusive";

  const getItemDiscountAmount = (item: any) => {
    if (!showItemDiscount) return 0;
    const lineAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    const discountValue = Number(item.discount || 0);
    const discountType = item.discountType || "percent";
    if (discountType === "amount") return Math.min(lineAmount, discountValue);
    return Math.min(lineAmount, (lineAmount * discountValue) / 100);
  };

  const getItemBaseAmount = (item: any) => {
    const lineAmount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    return Math.max(0, lineAmount - getItemDiscountAmount(item));
  };

  const getTaxAmountFromBase = (baseAmount: number, taxRate: number, isInclusive: boolean) => {
    if (baseAmount <= 0 || taxRate <= 0) return 0;
    if (isInclusive) {
      return baseAmount - (baseAmount / (1 + taxRate / 100));
    }
    return baseAmount * (taxRate / 100);
  };

  const taxSummary = React.useMemo(() => {
    const summary: Record<string, number> = {};
    const isInclusive = isTaxInclusiveMode(formData.taxExclusive);

    (formData.items || [])
      .filter((item: any) => item.itemType !== "header")
      .forEach((item) => {
        const taxOption = getTaxBySelection(item.tax);
        if (!taxOption) return;
        const baseAmount = getItemBaseAmount(item);
        const taxAmount = getTaxAmountFromBase(baseAmount, parseTaxRate((taxOption as any).rate), isInclusive);
        if (taxAmount <= 0) return;
        const taxLabel = getTaxDisplayLabel(taxOption);
        summary[taxLabel] = Number(((summary[taxLabel] || 0) + taxAmount).toFixed(2));
      });

    if (showShippingCharges && formData.shippingChargeTax && Number(formData.shippingCharges || 0) > 0) {
      const shippingTaxOption = getTaxBySelection(formData.shippingChargeTax);
      if (shippingTaxOption) {
        const shippingTaxAmount = getTaxAmountFromBase(
          Number(formData.shippingCharges || 0),
          parseTaxRate((shippingTaxOption as any).rate),
          isInclusive
        );
        if (shippingTaxAmount > 0) {
          const shippingTaxLabel = getTaxDisplayLabel(shippingTaxOption);
          summary[shippingTaxLabel] = Number(((summary[shippingTaxLabel] || 0) + shippingTaxAmount).toFixed(2));
        }
      }
    }

    return summary;
  }, [formData.items, formData.taxExclusive, formData.shippingCharges, formData.shippingChargeTax, taxOptions, showShippingCharges, showItemDiscount]);

  const totalTaxAmount = Object.values(taxSummary).reduce((sum, val) => sum + val, 0);
  const [scanInput, setScanInput] = useState("");
  const [bulkAddSearch, setBulkAddSearch] = useState("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<any[]>([]);
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<any[]>([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | number | null>(null);
  const itemMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showAdditionalInformation, setShowAdditionalInformation] = useState(false);
  const [itemsWithAdditionalInfo, setItemsWithAdditionalInfo] = useState(new Set());
  const [showNewHeaderInput, setShowNewHeaderInput] = useState(false);
  const [newHeaderText, setNewHeaderText] = useState("");
  const [newHeaderItemId, setNewHeaderItemId] = useState<string | number | null>(null);
  const [isBulkUpdateMode, setIsBulkUpdateMode] = useState(false);
  const [isAddNewRowDropdownOpen, setIsAddNewRowDropdownOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [currentItemRowId, setCurrentItemRowId] = useState<string | number | null>(null); // Track which item row opened the modal
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("taban");
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isBulkUpdateAccountModalOpen, setIsBulkUpdateAccountModalOpen] = useState(false);
  const [selectedBulkAccount, setSelectedBulkAccount] = useState("");
  const [bulkAccountSearch, setBulkAccountSearch] = useState("");
  const [isBulkAccountDropdownOpen, setIsBulkAccountDropdownOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [activePreferencesTab, setActivePreferencesTab] = useState("preferences");
  const [customFields, setCustomFields] = useState([
    { id: 1, name: "Sales person", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
    { id: 2, name: "Description", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true }
  ]);
  const [preferences, setPreferences] = useState({
    allowEditingSentInvoice: true,
    associateExpenseReceipts: false,
    notifyOnOnlinePayment: true,
    includePaymentReceipt: false,
    automateThankYouNote: false,
    invoiceQRCodeEnabled: false,
    hideZeroValueLineItems: false,
    termsAndConditions: "",
    customerNotes: ""
  });

  // Invoice number configuration state
  const [isInvoiceNumberModalOpen, setIsInvoiceNumberModalOpen] = useState(false);
  const [invoiceNumberMode, setInvoiceNumberMode] = useState("auto"); // "auto" or "manual"
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceNextNumber, setInvoiceNextNumber] = useState("000001");
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
  const [newItemImage, setNewItemImage] = useState<string | ArrayBuffer | null>(null);
  const newItemImageRef = useRef<HTMLInputElement>(null);
  const [isInvoiceDatePickerOpen, setIsInvoiceDatePickerOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);
  const [invoiceDateCalendar, setInvoiceDateCalendar] = useState(new Date());
  const [dueDateCalendar, setDueDateCalendar] = useState(new Date());
  const [isTaxExclusiveDropdownOpen, setIsTaxExclusiveDropdownOpen] = useState(false);
  const [taxExclusiveSearch, setTaxExclusiveSearch] = useState("");
  const [isDiscountAccountDropdownOpen, setIsDiscountAccountDropdownOpen] = useState(false);
  const [discountAccountSearch, setDiscountAccountSearch] = useState("");
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const salespersonDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceDatePickerRef = useRef<HTMLDivElement>(null);
  const dueDatePickerRef = useRef<HTMLDivElement>(null);
  const taxExclusiveDropdownRef = useRef<HTMLDivElement>(null);
  const discountAccountDropdownRef = useRef<HTMLDivElement>(null);
  const shippingTaxDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const bulkAccountDropdownRef = useRef<HTMLDivElement>(null);

  // Load customers from backend
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Load items from backend
  const [availableItems, setAvailableItems] = useState<Item[]>([]);

  // Payment fields
  const paymentModeOptions = [...PAYMENT_MODE_OPTIONS];
  const [paymentData, setPaymentData] = useState({
    paymentMode: "Cash",
    depositTo: "Petty Cash",
    amountReceived: "",
    referenceNumber: "",
    taxDeducted: "no"
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [depositToOptions, setDepositToOptions] = useState(["Petty Cash", "Bank Account", "Savings Account"]);
  const [isPaymentModeDropdownOpen, setIsPaymentModeDropdownOpen] = useState(false);
  const [isDepositToDropdownOpen, setIsDepositToDropdownOpen] = useState(false);
  const paymentModeDropdownRef = useRef<HTMLDivElement>(null);
  const depositToDropdownRef = useRef<HTMLDivElement>(null);

  // Email Communications and Contact Persons
  const [isPaymentReceived, setIsPaymentReceived] = useState(false);
  const [selectedContactPersons, setSelectedContactPersons] = useState<ContactPerson[]>([]);
  const [isContactPersonModalOpen, setIsContactPersonModalOpen] = useState(false);
  const [modalSelectedCustomerId, setModalSelectedCustomerId] = useState<string | null>(null);
  const [newContactPersonData, setNewContactPersonData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    designation: "",
    department: "",
    skypeName: "",
    isPrimary: false
  });
  const [contactPersonImage, setContactPersonImage] = useState<string | ArrayBuffer | null>(null);
  const contactPersonImageRef = useRef<HTMLInputElement>(null);

  // Show Total Summary
  const [isTotalSummaryOpen, setIsTotalSummaryOpen] = useState(false);

  const isCustomerActive = (customer: any) => {
    const status = String(customer?.status || "").trim().toLowerCase();
    if (status) return status === "active";
    if (typeof customer?.isActive === "boolean") return customer.isActive;
    return true;
  };

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

  const normalizeCustomers = (data: any[]): Customer[] => {
    return (data || [])
      .map((c: any) => ({
        ...c,
        id: c._id || c.id,
        name: c.displayName || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown"
      }))
      .filter((customer) => isCustomerActive(customer));
  };

  const reloadCustomersForInvoice = async (): Promise<Customer[]> => {
    try {
      const customersResponse = await customersAPI.getAll();
      if (customersResponse && customersResponse.success && customersResponse.data) {
        const normalizedCustomers = normalizeCustomers(customersResponse.data as any[]);
        setCustomers(normalizedCustomers);
        return normalizedCustomers;
      }
      setCustomers([]);
      return [];
    } catch (error) {
      console.error("Error refreshing customers after quick action:", error);
      setCustomers([]);
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
    const latestCustomers = await reloadCustomersForInvoice();
    setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
    setIsRefreshingCustomersQuickAction(false);
    setIsNewCustomerQuickActionOpen(true);
  };

  const tryAutoSelectNewCustomerFromQuickAction = async () => {
    if (!isNewCustomerQuickActionOpen || isAutoSelectingCustomerFromQuickAction) return;
    setIsAutoSelectingCustomerFromQuickAction(true);
    try {
      const latestCustomers = await reloadCustomersForInvoice();
      const baselineIds = new Set(customerQuickActionBaseIds);
      const newCustomers = latestCustomers.filter((c: any) => {
        const id = getEntityId(c);
        return id && !baselineIds.has(id);
      });

      if (newCustomers.length > 0) {
        const newlyCreatedCustomer = pickNewestEntity(newCustomers) || newCustomers[newCustomers.length - 1];
        await handleCustomerSelect(newlyCreatedCustomer);
        setCustomerQuickActionBaseIds(latestCustomers.map((c: any) => getEntityId(c)).filter(Boolean));
        setIsNewCustomerQuickActionOpen(false);
      }
    } finally {
      setIsAutoSelectingCustomerFromQuickAction(false);
    }
  };

  useEffect(() => {
    if (baseCurrency && !formData.currency && !isEditMode) {
      const fullCode = baseCurrency.code || baseCurrency.symbol || (baseCurrency as any).id || "KES";
      // Extract only the code (e.g., "USD") if the string is like "USD - UNITED STATES DOLLAR"
      const shortCode = fullCode.split(' ')[0].toUpperCase();
      setFormData(prev => ({ ...prev, currency: shortCode }));
    }
  }, [baseCurrency, isEditMode, formData.currency]);

  // Pagination calculations
  const customerResultsPerPage = 10;
  const customerStartIndex = (customerSearchPage - 1) * customerResultsPerPage;
  const customerEndIndex = customerStartIndex + customerResultsPerPage;
  const customerPaginatedResults = customerSearchResults.slice(customerStartIndex, customerEndIndex);
  const customerTotalPages = Math.ceil(customerSearchResults.length / customerResultsPerPage);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Set Base Currency from hook
        if (baseCurrency && !isEditMode) {
          setFormData(prev => ({ ...prev, currency: baseCurrency.code || baseCurrency.symbol || "USD" }));
        }

        // Load customers from backend
        try {
          const customersResponse = await customersAPI.getAll();
          if (customersResponse && customersResponse.success && customersResponse.data) {
            const normalizedCustomers = normalizeCustomers(customersResponse.data as any[]);
            setCustomers(normalizedCustomers);
          } else {
            setCustomers([]);
          }
        } catch (error) {
          console.error('Error loading customers:', error);
          setCustomers([]);
        }

        // Load salespersons from backend
        try {
          const salespersonsResponse = await salespersonsAPI.getAll();
          if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
            setSalespersons(salespersonsResponse.data);
          } else {
            setSalespersons([]);
          }
        } catch (error) {
          console.error('Error loading salespersons:', error);
          setSalespersons([]);
        }

        // Load items from backend
        try {
          const itemsResponse = await itemsAPI.getAll();
          if (itemsResponse && itemsResponse.success && itemsResponse.data) {
            // Transform items to match expected format
            const transformedItems = (itemsResponse.data as any[]).map(item => ({
              id: item._id || item.id,
              name: item.name || "",
              sku: item.sku || "",
              rate: item.sellingPrice || item.costPrice || item.rate || 0,
              stockOnHand: item.stockQuantity || item.stockOnHand || item.quantityOnHand || 0,
              unit: item.unit || item.unitOfMeasure || "pcs",
              taxInfo: item.taxInfo
            }));
            setAvailableItems(transformedItems);
          } else {
            setAvailableItems([]);
          }
        } catch (error) {
          console.error('Error loading items:', error);
          setAvailableItems([]);
        }

        // Load bank accounts and Chart of Accounts (Cash/Bank types)
        try {
          const [bankAccountsResponse, coaAccountsResponse] = await Promise.all([
            bankAccountsAPI.getAll(),
            chartOfAccountsAPI.getAccounts({ limit: 1000 })
          ]);

          let depositOptions = ["Petty Cash"];
          let allBankAccounts = [];

          if (bankAccountsResponse && bankAccountsResponse.success && bankAccountsResponse.data) {
            allBankAccounts = bankAccountsResponse.data;
            const bankAccNames = bankAccountsResponse.data.map((acc: any) =>
              acc.name || acc.accountName || `${acc.accountType || 'Bank'} - ${acc.accountNumber || ''}`
            );
            depositOptions = [...depositOptions, ...bankAccNames.filter(Boolean)];
          }

          if (coaAccountsResponse && coaAccountsResponse.success && coaAccountsResponse.data) {
            // Filter COA for Cash and Bank accounts
            const relevantCoaAccounts = coaAccountsResponse.data.filter((acc: any) =>
              acc.accountType === 'cash' || acc.accountType === 'bank'
            );

            const coaAccNames = relevantCoaAccounts.map((acc: any) => acc.accountName || acc.name);

            // Add names that are not already in depositOptions
            coaAccNames.forEach((name: any) => {
              if (name && !depositOptions.includes(name)) {
                depositOptions.push(name);
              }
            });
          }

          setBankAccounts(allBankAccounts);
          setDepositToOptions(depositOptions);
        } catch (error) {
          console.error('Error loading deposit accounts:', error);
          // Keep default options if API fails
          setDepositToOptions(["Petty Cash", "Bank Account", "Savings Account"]);
        }


        // Load general settings and items settings
        try {
          const [genResponse, itemsSettingsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/settings/general`, {
              headers: { 'Authorization': `Bearer ${getToken()}` },
            }),
            fetch(`${API_BASE_URL}/settings/items`, {
              headers: { 'Authorization': `Bearer ${getToken()}` },
            })
          ]);

          if (genResponse.ok) {
            const genData = await genResponse.json();
            if (genData.success && genData.data?.settings) {
              setEnabledSettings(genData.data.settings);
            }
          }

          if (itemsSettingsResponse.ok) {
            const itemsData = await itemsSettingsResponse.json();
            if (itemsData.success && itemsData.data) {
              // Merge items settings into enabledSettings
              setEnabledSettings(prev => ({
                ...prev,
                enableInventoryTracking: itemsData.data.enableInventoryTracking,
                preventNegativeStock: itemsData.data.preventNegativeStock,
                showOutOfStockWarning: itemsData.data.showOutOfStockWarning,
                notifyReorderPoint: itemsData.data.notifyReorderPoint
              }));
            }
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }

        // Load next invoice number from backend
        try {
          const invoiceNumberResponse = await invoicesAPI.getNextNumber(invoicePrefix);
          if (invoiceNumberResponse && invoiceNumberResponse.success && invoiceNumberResponse.data) {
            setFormData(prev => ({
              ...prev,
              invoiceNumber: invoiceNumberResponse.data.invoiceNumber
            }));
            setInvoiceNextNumber(String(invoiceNumberResponse.data.nextNumber).padStart(6, '0'));
          }
        } catch (error) {
          console.error('Error loading next invoice number:', error);
          // Keep default invoice number
        }

      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Load documents when modal opens
  useEffect(() => {
    if (isDocumentsModalOpen) {
      const documents = getAllDocuments();
      setAvailableDocuments(documents);
    }
  }, [isDocumentsModalOpen]);

  // Handle click outside for payment dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paymentModeDropdownRef.current && !paymentModeDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentModeDropdownOpen(false);
      }
      if (depositToDropdownRef.current && !depositToDropdownRef.current.contains(event.target as Node)) {
        setIsDepositToDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Pre-populate form with quote data when converting from quote
  useEffect(() => {
    if (quoteDataFromState && !isEditMode && customers.length > 0) {
      const quoteData = quoteDataFromState;

      // Set customer if available
      if (quoteData.customerId || quoteData.customerName) {
        const customer = customers.find(c =>
          c.id === quoteData.customerId ||
          c.name === quoteData.customerName
        );
        if (customer) {
          setSelectedCustomer(customer);
          setFormData(prev => ({
            ...prev,
            customerName: customer.name || quoteData.customerName || ''
          }));
        } else if (quoteData.customerName) {
          setFormData(prev => ({
            ...prev,
            customerName: quoteData.customerName
          }));
        }
      }

      // Set salesperson if available
      let salespersonName = quoteData.salesperson;
      let salespersonId = quoteData.salespersonId || "";
      if ((quoteData.salesperson || quoteData.salespersonId) && salespersons.length > 0) {
        const salesperson = salespersons.find(s => {
          const spId = String((s as any).id || (s as any)._id || "");
          const quoteSpId = String(quoteData.salespersonId || "");
          const spName = String((s as any).name || "").toLowerCase();
          const quoteSpName = String(quoteData.salesperson || "").toLowerCase();
          return (quoteSpId && spId === quoteSpId) || (!!quoteSpName && spName === quoteSpName);
        });
        if (salesperson) {
          setSelectedSalesperson(salesperson);
          salespersonName = salesperson.name;
          salespersonId = (salesperson as any).id || (salesperson as any)._id || salespersonId;
        }
      }

      // Update form data with quote data
      // Enrich items with stock information
      const enrichedItems = quoteData.items && quoteData.items.length > 0
        ? quoteData.items.map((item: any) => {
          // Find the corresponding product in availableItems to get stock info
          const productItem = availableItems.find(i => i.id === item.itemId || i._id === item.itemId);
          const quantity = toPositiveNumberOr(item?.quantity, 1);
          const rate = toNumberSafe(item?.rate ?? item?.unitPrice ?? item?.price ?? 0);
          const explicitAmount = toNumberSafe(item?.amount ?? item?.total);
          const lineAmount = explicitAmount > 0 ? explicitAmount : (quantity * rate);
          const explicitTaxAmount = toNumberSafe(item?.taxAmount || 0);
          const rawItemTax = item?.tax;
          const rawTaxValue =
            item?.taxId ??
            (rawItemTax && typeof rawItemTax === "object"
              ? (
                rawItemTax?._id ||
                rawItemTax?.id ||
                rawItemTax?.taxId ||
                rawItemTax?.name ||
                rawItemTax?.taxName ||
                rawItemTax?.rate ||
                (typeof rawItemTax?.toString === "function" ? rawItemTax.toString() : "")
              )
              : rawItemTax) ??
            item?.taxName ??
            item?.taxLabel ??
            item?.taxRate ??
            item?.salesTaxRate;
          const normalizedRawTaxValue = String(rawTaxValue || "").trim() === "[object Object]" ? "" : rawTaxValue;
          const matchedTax = getTaxBySelection(rawTaxValue);
          const resolvedTaxId = matchedTax
            ? String((matchedTax as any).id || (matchedTax as any)._id || "")
            : (item?.taxId ? String(item.taxId) : "");
          const explicitTaxRate = toNumberSafe(
            item?.taxRate ??
            (rawItemTax && typeof rawItemTax === "object" ? (rawItemTax as any)?.rate : rawItemTax) ??
            (matchedTax as any)?.rate ??
            0
          );
          const derivedTaxRate = explicitTaxRate > 0
            ? explicitTaxRate
            : (lineAmount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / lineAmount) * 100 : 0);

          return {
            ...item,
            tax: resolvedTaxId || normalizedRawTaxValue || (derivedTaxRate > 0 ? String(derivedTaxRate) : ""),
            taxId: resolvedTaxId,
            taxRate: toNumberSafe(derivedTaxRate),
            taxAmount: explicitTaxAmount,
            quantity,
            rate,
            amount: lineAmount,
            stockOnHand: toNumberSafe(productItem?.stockOnHand || 0),
            unit: productItem?.unit || item.unit || 'pcs'
          };
        })
        : [];
      const shippingTaxSource =
        quoteData.shippingChargeTax ??
        quoteData.shippingTaxId ??
        quoteData.shippingTax ??
        quoteData.shippingTaxName ??
        quoteData.shippingTaxRate;
      const shippingTaxCandidate =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? (
            (shippingTaxSource as any)._id ||
            (shippingTaxSource as any).id ||
            (shippingTaxSource as any).taxId ||
            (shippingTaxSource as any).name ||
            (shippingTaxSource as any).taxName ||
            (shippingTaxSource as any).rate ||
            ""
          )
          : shippingTaxSource;
      const matchedShippingTax = getTaxBySelection(shippingTaxCandidate);
      const resolvedShippingTaxId = matchedShippingTax
        ? String((matchedShippingTax as any).id || (matchedShippingTax as any)._id || "")
        : String(shippingTaxCandidate || "");

      const convertedSubTotal = resolveSubtotalFromData(quoteData, enrichedItems);
      const convertedTaxAmount = toNumberSafe(quoteData.taxAmount ?? quoteData.tax);
      const normalizedConvertedDiscount = normalizeIncomingDiscount(quoteData, convertedSubTotal, convertedTaxAmount);

      setFormData(prev => ({
        ...prev,
        orderNumber: quoteData.orderNumber || prev.orderNumber,
        invoiceDate: quoteData.invoiceDate || prev.invoiceDate,
        dueDate: quoteData.dueDate || prev.dueDate,
        receipt: normalizePaymentTerm(quoteData.receipt || prev.receipt),
        salesperson: salespersonName || prev.salesperson,
        salespersonId: salespersonId || prev.salespersonId,
        subject: quoteData.subject || prev.subject,
        items: enrichedItems,
        subTotal: toNumberSafe(quoteData.subTotal ?? quoteData.subtotal ?? convertedSubTotal ?? prev.subTotal),
        discount: normalizedConvertedDiscount.discountValue,
        discountType: normalizedConvertedDiscount.discountTypeValue,
        shippingCharges: toNumberSafe(quoteData.shippingCharges ?? prev.shippingCharges),
        shippingChargeTax: resolvedShippingTaxId || prev.shippingChargeTax || "",
        adjustment: toNumberSafe(quoteData.adjustment ?? prev.adjustment),
        roundOff: toNumberSafe(quoteData.roundOff ?? prev.roundOff),
        total: toNumberSafe(quoteData.total ?? prev.total),
        currency: quoteData.currency || prev.currency,
        customerNotes: quoteData.customerNotes || prev.customerNotes,
        termsAndConditions: quoteData.termsAndConditions || prev.termsAndConditions,
        taxExclusive: quoteData.taxExclusive || prev.taxExclusive
      }));
    }
  }, [quoteDataFromState, customers, salespersons, availableItems, taxOptions, isEditMode]);

  useEffect(() => {
    const normalizedTerm = normalizePaymentTerm(formData.receipt);
    if (selectedPaymentTerm !== normalizedTerm) {
      setSelectedPaymentTerm(normalizedTerm);
    }
  }, [formData.receipt, selectedPaymentTerm, setSelectedPaymentTerm]);

  const parseFileSize = (sizeStr: string): number => {
    const units: Record<string, number> = { 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KM]B)$/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      return value * (units[unit] || 1);
    }
    return parseFloat(sizeStr) || 0;
  };

  const calculateInvoiceTotalsFromData = (data: InvoiceFormState) => {
    const isInclusive = isTaxInclusiveMode(data.taxExclusive);
    const activeItems = (data.items || []).filter((item: any) => item.itemType !== "header");

    const lineTotals = activeItems.map((item: any) => {
      const baseAmount = getItemBaseAmount(item);
      const taxOption = getTaxBySelection(item.tax);
      const taxRate = taxOption ? parseTaxRate((taxOption as any).rate) : 0;
      const taxAmount = getTaxAmountFromBase(baseAmount, taxRate, isInclusive);
      return { baseAmount, taxAmount, taxRate };
    });

    const subTotal = lineTotals.reduce((sum, line) => sum + line.baseAmount, 0);
    const itemTaxAmount = lineTotals.reduce((sum, line) => sum + line.taxAmount, 0);
    const discountBase = Math.max(0, isInclusive ? (subTotal - itemTaxAmount) : subTotal);
    const transactionDiscount = showTransactionDiscount
      ? (
        data.discountType === "percent"
          ? (discountBase * (Number(data.discount || 0) / 100))
          : Number(data.discount || 0)
      )
      : 0;
    const shipping = showShippingCharges ? Number(data.shippingCharges || 0) : 0;
    const shippingTaxOption = showShippingCharges ? getTaxBySelection(data.shippingChargeTax) : undefined;
    const shippingTaxRate = shippingTaxOption ? parseTaxRate((shippingTaxOption as any).rate) : 0;
    const shippingTaxAmount = showShippingCharges
      ? getTaxAmountFromBase(shipping, shippingTaxRate, isInclusive)
      : 0;
    const totalTax = itemTaxAmount + shippingTaxAmount;
    const adjustment = showAdjustment ? Number(data.adjustment || 0) : 0;
    const roundOff = Number(data.roundOff || 0);
    const grossBeforeDiscount = isInclusive
      ? (subTotal + shipping)
      : (subTotal + itemTaxAmount + shipping + shippingTaxAmount);
    const total = grossBeforeDiscount - transactionDiscount + adjustment + roundOff;

    return {
      subTotal: Number(subTotal.toFixed(2)),
      total: Number(total.toFixed(2)),
      roundOff: Number(roundOff.toFixed(2)),
      taxAmount: Number(totalTax.toFixed(2)),
      itemTaxAmount: Number(itemTaxAmount.toFixed(2)),
      shippingTaxAmount: Number(shippingTaxAmount.toFixed(2)),
      shippingTaxRate: Number(shippingTaxRate.toFixed(2)),
      discountAmount: Number(transactionDiscount.toFixed(2)),
      discountBase: Number(discountBase.toFixed(2))
    };
  };

  const discountAccountCategories = {
    "Income": [
      "Discount",
      "General Income",
      "Interest Income",
      "Late Fee Income",
      "Other Charges",
      "Sales"
    ]
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatDate = (date: Date | string | number) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysInMonth = (date: Date) => {
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

  useEffect(() => {
    setFormData(prev => {
      let next = { ...prev };

      if (!showItemDiscount) {
        next.items = next.items.map(item => ({ ...item, discount: 0, discountType: "percent" }));
      }
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

      if (taxExclusiveOptions.length === 1 && next.taxExclusive !== taxExclusiveOptions[0]) {
        next.taxExclusive = taxExclusiveOptions[0];
      }

      return next;
    });
  }, [showItemDiscount, showTransactionDiscount, showShippingCharges, showAdjustment, taxExclusiveOptions]);

  const handleDateSelect = (date: Date, type: string) => {
    const formatted = formatDate(date);
    setFormData(prev => ({
      ...prev,
      [type]: formatted
    }));
    if (type === 'invoiceDate') {
      setIsInvoiceDatePickerOpen(false);
      setInvoiceDateCalendar(date);
    } else {
      setIsDueDatePickerOpen(false);
      setDueDateCalendar(date);
    }
  };

  const navigateMonth = (direction: string, type: string) => {
    const calendar = type === 'invoiceDate' ? invoiceDateCalendar : dueDateCalendar;
    const setCalendar = type === 'invoiceDate' ? setInvoiceDateCalendar : setDueDateCalendar;
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
      if (invoiceDatePickerRef.current && !invoiceDatePickerRef.current.contains(event.target as Node)) {
        setIsInvoiceDatePickerOpen(false);
      }
      if (dueDatePickerRef.current && !dueDatePickerRef.current.contains(event.target as Node)) {
        setIsDueDatePickerOpen(false);
      }
      if (taxExclusiveDropdownRef.current && !taxExclusiveDropdownRef.current.contains(event.target as Node)) {
        setIsTaxExclusiveDropdownOpen(false);
      }
      if (discountAccountDropdownRef.current && !discountAccountDropdownRef.current.contains(event.target as Node)) {
        setIsDiscountAccountDropdownOpen(false);
      }
      if (shippingTaxDropdownRef.current && !shippingTaxDropdownRef.current.contains(event.target as Node)) {
        setIsShippingTaxDropdownOpen(false);
      }

      // Handle item dropdowns
      Object.keys(openItemDropdowns).forEach(itemId => {
        if (openItemDropdowns[itemId]) {
          const ref = itemDropdownRefs.current[itemId];
          if (ref && typeof ref.contains === 'function' && !ref.contains(event.target as Node)) {
            setOpenItemDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });

      // Handle tax dropdowns
      Object.keys(openTaxDropdowns).forEach(itemId => {
        if (openTaxDropdowns[itemId]) {
          const ref = taxDropdownRefs.current[itemId];
          if (ref && typeof ref.contains === 'function' && !ref.contains(event.target as Node)) {
            setOpenTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
          }
        }
      });

      // Handle bulk actions dropdown
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setIsBulkActionsOpen(false);
      }

      // Handle item menu dropdowns
      if (openItemMenuId !== null) {
        const ref = itemMenuRefs.current[openItemMenuId];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenItemMenuId(null);
        }
      }

      // Handle upload dropdown
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target as Node)) {
        setIsUploadDropdownOpen(false);
      }

      // Handle settings dropdown
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsDropdownOpen(false);
      }

      // Handle bulk account dropdown
      if (bulkAccountDropdownRef.current && !bulkAccountDropdownRef.current.contains(event.target as Node)) {
        setIsBulkAccountDropdownOpen(false);
      }
    };

    const hasOpenDropdown = isCustomerDropdownOpen || isSalespersonDropdownOpen ||
      isInvoiceDatePickerOpen || isDueDatePickerOpen || isTaxExclusiveDropdownOpen || isDiscountAccountDropdownOpen || isShippingTaxDropdownOpen ||
      Object.values(openItemDropdowns).some(Boolean) || Object.values(openTaxDropdowns).some(Boolean) ||
      openItemMenuId !== null || isBulkActionsOpen || isUploadDropdownOpen || isSettingsDropdownOpen;

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomerDropdownOpen, isSalespersonDropdownOpen, isInvoiceDatePickerOpen, isDueDatePickerOpen, isTaxExclusiveDropdownOpen, isDiscountAccountDropdownOpen, isShippingTaxDropdownOpen, openItemDropdowns, openTaxDropdowns, isSettingsDropdownOpen]);

  // Load taxes from localStorage on component mount
  useEffect(() => {
    const loadTaxesData = async () => {
      const savedTaxes = await getTaxes();
      if (savedTaxes && savedTaxes.length > 0) {
        // Convert saved taxes to the format expected by the component
        const formattedTaxes = savedTaxes.map((tax: any) => ({
          id: tax.id || tax._id,
          name: tax.name,
          rate: tax.rate,
          isCompound: tax.isCompound || false
        }));
        setTaxOptions(formattedTaxes);
      }
    };
    loadTaxesData();
  }, []);

  // Initialize default dates
  useEffect(() => {
    if (!formData.invoiceDate) {
      const today = new Date();
      const formatted = formatDate(today);
      setFormData(prev => ({
        ...prev,
        invoiceDate: formatted
      }));
      setInvoiceDateCalendar(today);
    }
    if (!formData.dueDate) {
      const today = new Date();
      const formatted = formatDate(today);
      setFormData(prev => ({
        ...prev,
        dueDate: formatted
      }));
      setDueDateCalendar(today);
    }
  }, []);

  // Load Chart of Accounts for Accounts Receivable
  useEffect(() => {
    const fetchARAccounts = async () => {
      try {
        const response = await accountantAPI.getAccounts({ accountType: 'accounts_receivable' });
        if (response && response.success && response.data) {
          setAccountsReceivableOptions(response.data);
          // If no account is selected, set the first one as default
          if (!formData.accountsReceivable && response.data.length > 0) {
            setFormData(prev => ({
              ...prev,
              accountsReceivable: response.data[0].accountName
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching AR accounts:', error);
      }
    };
    fetchARAccounts();
  }, []);

  // Set customer from navigation state (when coming from customer detail page)
  useEffect(() => {
    if (customerFromState && !isEditMode) {
      // Find the customer in customers list or use the state data
      const existingCustomer = customers.find(c => c.id === customerFromState.id || c.name === customerFromState.name);
      if (existingCustomer) {
        setSelectedCustomer(existingCustomer);
        setFormData(prev => ({
          ...prev,
          customerName: existingCustomer.name
        }));
      } else if (customerFromState.name) {
        // Use the customer data from state
        setSelectedCustomer({ id: customerFromState.id, name: customerFromState.name, receivables: 0, currency: "KES" } as Customer);
        setFormData(prev => ({
          ...prev,
          customerName: customerFromState.name
        }));
      }
    }
  }, [customerFromState, isEditMode]);

  // Load invoice data when in edit mode
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (isEditMode && id) {
        const invoice = await getInvoiceById(id);
        if (invoice) {
          const getCustomerDisplayName = (inv: any) => {
            if (inv?.customerName) return String(inv.customerName);
            if (typeof inv?.customer === "string") return inv.customer;
            if (inv?.customer && typeof inv.customer === "object") {
              return (
                inv.customer.displayName ||
                inv.customer.companyName ||
                inv.customer.name ||
                `${inv.customer.firstName || ""} ${inv.customer.lastName || ""}`.trim()
              );
            }
            return "";
          };

          const getSalespersonName = (inv: any) => {
            if (!inv?.salesperson) return "";
            if (typeof inv.salesperson === "string") return inv.salesperson;
            return inv.salesperson.name || "";
          };

          const toDisplayDate = (value: any, fallback: string) => {
            if (!value) return fallback;
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) return formatDate(date);
            return String(value);
          };

          const mapInvoiceItems = (invItems: any[] = []): InvoiceItem[] => {
            if (!Array.isArray(invItems) || invItems.length === 0) return [];

            return invItems.map((item: any, index: number) => {
              const rawItem = item?.item ?? item?.itemId;
              const itemId = typeof rawItem === "object"
                ? (rawItem?._id || rawItem?.id || rawItem?.itemId || null)
                : (item?.itemId || rawItem || null);

              const matchedItem = availableItems.find((i: any) => {
                const candidateId = i?.id || i?._id;
                return String(candidateId || "") === String(itemId || "");
              });

              const quantity = toPositiveNumberOr(item?.quantity, 1);
              const rate = toNumberSafe(
                item?.rate ??
                item?.unitPrice ??
                item?.price ??
                item?.sellingPrice ??
                (typeof rawItem === "object" ? (rawItem?.sellingPrice ?? rawItem?.rate ?? rawItem?.unitPrice) : undefined) ??
                matchedItem?.rate ??
                0
              );
              const explicitAmount = toNumberSafe(item?.amount ?? item?.total);
              const amount = explicitAmount > 0 ? explicitAmount : (quantity * rate);
              const explicitTaxAmount = toNumberSafe(item?.taxAmount || 0);
              const rawItemTax = item?.tax;

              const rawTaxValue =
                item?.taxId ??
                (rawItemTax && typeof rawItemTax === "object"
                  ? (
                    rawItemTax?._id ||
                    rawItemTax?.id ||
                    rawItemTax?.taxId ||
                    rawItemTax?.name ||
                    rawItemTax?.taxName ||
                    rawItemTax?.rate ||
                    (typeof rawItemTax?.toString === "function" ? rawItemTax.toString() : "")
                  )
                  : rawItemTax) ??
                item?.taxName ??
                item?.taxLabel ??
                item?.taxRate ??
                item?.salesTaxRate;
              const normalizedRawTaxValue = String(rawTaxValue || "").trim() === "[object Object]" ? "" : rawTaxValue;
              const matchedTax = getTaxBySelection(rawTaxValue);
              const explicitTaxRate = toNumberSafe(
                item?.taxRate ??
                (rawItemTax && typeof rawItemTax === "object" ? (rawItemTax as any)?.rate : rawItemTax) ??
                (matchedTax as any)?.rate ??
                0
              );
              const derivedTaxRate = explicitTaxRate > 0
                ? explicitTaxRate
                : (amount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / amount) * 100 : 0);
              const tax = matchedTax
                ? String((matchedTax as any).id || (matchedTax as any)._id || "")
                : String(normalizedRawTaxValue || (derivedTaxRate > 0 ? derivedTaxRate : ""));

              return {
                id: item?.id || index + 1,
                itemId: itemId ? String(itemId) : undefined,
                itemDetails:
                  item?.itemDetails ||
                  item?.description ||
                  item?.name ||
                  (typeof rawItem === "object" ? (rawItem?.name || rawItem?.itemName || "") : "") ||
                  matchedItem?.name ||
                  "",
                quantity,
                rate,
                tax,
                taxRate: derivedTaxRate,
                taxAmount: explicitTaxAmount,
                amount,
                stockOnHand: toNumberSafe(
                  item?.stockOnHand ??
                  (typeof rawItem === "object" ? (rawItem?.stockOnHand ?? rawItem?.stockQuantity) : undefined) ??
                  matchedItem?.stockOnHand ??
                  0
                ),
                unit:
                  item?.unit ||
                  (typeof rawItem === "object" ? rawItem?.unit : undefined) ||
                  matchedItem?.unit ||
                  "pcs"
              };
            });
          };

          const mappedItems = mapInvoiceItems(invoice.items as any[]);

          // Load customer data
          if (invoice.customer) {
            const invoiceCustomerId = String(invoice.customerId || (invoice as any)?.customer?._id || (invoice as any)?.customer?.id || "");
            const invoiceCustomerName = getCustomerDisplayName(invoice);
            const customer = customers.find(c =>
              String(c.id || (c as any)._id || "") === invoiceCustomerId ||
              String(c.name || "").toLowerCase() === String(invoiceCustomerName || "").toLowerCase()
            );
            if (customer) {
              setSelectedCustomer(customer);
            }
          }

          // Load salesperson data
          if (invoice.salesperson || invoice.salespersonId) {
            const invoiceSalespersonName = getSalespersonName(invoice);
            const salesperson = salespersons.find(s => {
              const spId = String((s as any).id || (s as any)._id || "");
              const invoiceSpId = String(invoice.salespersonId || "");
              const spName = String((s as any).name || "").toLowerCase();
              const invoiceSpName = String(invoiceSalespersonName || "").toLowerCase();
              return (invoiceSpId && spId === invoiceSpId) || (!!invoiceSpName && spName === invoiceSpName);
            });
            if (salesperson) {
              setSelectedSalesperson(salesperson);
            }
          }

          // Set all form data
          setFormData(prev => ({
            ...prev,
            customerName: getCustomerDisplayName(invoice),
            invoiceNumber: invoice.invoiceNumber || prev.invoiceNumber,
            orderNumber: invoice.orderNumber || (invoice as any).poNumber || "",
            invoiceDate: toDisplayDate(invoice.invoiceDate || (invoice as any).date, prev.invoiceDate),
            dueDate: toDisplayDate(invoice.dueDate, prev.dueDate),
            receipt: normalizePaymentTerm(invoice.receipt || prev.receipt),
            accountsReceivable: invoice.accountsReceivable || "Accounts Receivable",
            salesperson: getSalespersonName(invoice),
            salespersonId: invoice.salespersonId || "",
            subject: invoice.subject || "",
            taxExclusive: invoice.taxExclusive || "Tax Exclusive",
            items: mappedItems.length > 0
              ? mappedItems
              : prev.items,
            subTotal: invoice.subTotal || invoice.subtotal || 0,
            discount: invoice.discount || 0,
            discountType: invoice.discountType || "percent",
            discountAccount: invoice.discountAccount || "General Income",
            shippingCharges: invoice.shippingCharges || 0,
            shippingChargeTax: String((invoice as any).shippingChargeTax || (invoice as any).shippingTax || ""),
            adjustment: invoice.adjustment || 0,
            roundOff: invoice.roundOff || 0,
            total: invoice.total || 0,
            currency: invoice.currency || prev.currency,
            customerNotes: invoice.customerNotes || "",
            termsAndConditions: invoice.termsAndConditions || "",
            attachedFiles: (invoice.attachedFiles || []).map((f: any) => ({
              ...f,
              file: f.file || null
            }))
          }));
        }
      }
    };
    loadInvoiceData();
  }, [isEditMode, id, customers, salespersons, availableItems, taxOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      if (name === 'discount' || name === 'discountType' || name === 'shippingCharges' || name === 'shippingChargeTax' || name === 'adjustment') {
        const totals = calculateInvoiceTotalsFromData(updated);
        updated.subTotal = totals.subTotal;
        updated.roundOff = totals.roundOff;
        updated.total = totals.total;
      }

      return updated;
    });
  };

  useEffect(() => {
    setFormData((prev) => {
      const totals = calculateInvoiceTotalsFromData(prev);
      const sameSubTotal = Math.abs((Number(prev.subTotal) || 0) - Number(totals.subTotal || 0)) < 0.0001;
      const sameRoundOff = Math.abs((Number(prev.roundOff) || 0) - Number(totals.roundOff || 0)) < 0.0001;
      const sameTotal = Math.abs((Number(prev.total) || 0) - Number(totals.total || 0)) < 0.0001;

      if (sameSubTotal && sameRoundOff && sameTotal) {
        return prev;
      }

      return {
        ...prev,
        subTotal: totals.subTotal,
        roundOff: totals.roundOff,
        total: totals.total
      };
    });
  }, [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.shippingCharges,
    formData.shippingChargeTax,
    formData.adjustment,
    formData.roundOff,
    formData.taxExclusive,
    taxOptions,
    showItemDiscount,
    showTransactionDiscount,
    showShippingCharges,
    showAdjustment
  ]);

  const liveTotals = useMemo(() => calculateInvoiceTotalsFromData(formData), [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.shippingCharges,
    formData.shippingChargeTax,
    formData.adjustment,
    formData.roundOff,
    formData.taxExclusive,
    taxOptions,
    showItemDiscount,
    showTransactionDiscount,
    showShippingCharges,
    showAdjustment
  ]);

  const handleCustomerSelect = async (customer: Customer) => {
    const customerId = customer.id || customer._id;
    const customerName = customer.name || customer.displayName || customer.companyName || "";
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerName: customerName,
      mobile: customer.workPhone || customer.mobile || "",
      currency: customer.currency || prev.currency || "USD"
    }));
    setIsCustomerDropdownOpen(false);
    setCustomerSearch("");

    // Fetch full customer details from backend
    try {
      const response = await customersAPI.getById(customerId);
      if (response && response.success && response.data) {
        setCustomerDetails(response.data);
        // Load contact persons if available
        if (response.data.contactPersons && response.data.contactPersons.length > 0) {
          setSelectedContactPersons(response.data.contactPersons);
        } else {
          setSelectedContactPersons([]);
        }
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      // Use the customer data we already have
      setCustomerDetails(customer);
      setSelectedContactPersons([]);
    }
  };

  const handleSalespersonSelect = (salesperson: any) => {
    setSelectedSalesperson(salesperson);
    setFormData(prev => ({
      ...prev,
      salesperson: salesperson.name || "",
      salespersonId: salesperson.id || salesperson._id || ""
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

  const handleNewSalespersonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalespersonData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Contact Person Handlers
  const handleContactPersonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setNewContactPersonData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContactPersonImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setContactPersonImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveContactPerson = async () => {
    // Validate required fields
    if (!newContactPersonData.firstName || !newContactPersonData.lastName) {
      alert('Please enter first name and last name');
      return;
    }

    // Use modal selected customer or the main selected customer
    const customerIdToUse = modalSelectedCustomerId || (selectedCustomer?.id || selectedCustomer?._id);

    if (!customerIdToUse) {
      alert('Please select a customer');
      return;
    }

    try {
      // Get current customer data
      const customerResponse = await customersAPI.getById(customerIdToUse);
      if (!customerResponse || !customerResponse.success) {
        throw new Error('Failed to fetch customer data');
      }

      const customer = customerResponse.data;
      const existingContactPersons = customer.contactPersons || [];

      // Add new contact person
      const newContactPerson = {
        salutation: newContactPersonData.salutation || '',
        firstName: newContactPersonData.firstName.trim(),
        lastName: newContactPersonData.lastName.trim(),
        email: newContactPersonData.email || '',
        workPhone: newContactPersonData.workPhone || '',
        mobile: newContactPersonData.mobile || '',
        designation: newContactPersonData.designation || '',
        department: newContactPersonData.department || '',
        skypeName: newContactPersonData.skypeName || '',
        isPrimary: newContactPersonData.isPrimary || false
      };

      // Update customer with new contact person
      const updatedContactPersons = [...existingContactPersons, newContactPerson];

      await customersAPI.update(customerIdToUse, {
        contactPersons: updatedContactPersons
      });

      // If a customer was selected from the modal but not in the main form, select it now
      if (modalSelectedCustomerId && (!selectedCustomer || (selectedCustomer?.id !== modalSelectedCustomerId && selectedCustomer?._id !== modalSelectedCustomerId))) {
        // Find and select the customer
        const customerToSelect = customers.find(c => (c.id || c._id) === modalSelectedCustomerId);
        if (customerToSelect) {
          await handleCustomerSelect(customerToSelect);
        }
      }

      // Always add the new contact person to selected contact persons
      // Check if it's not already in the list to avoid duplicates
      const isAlreadySelected = selectedContactPersons.some(cp =>
        cp.email === newContactPerson.email &&
        cp.firstName === newContactPerson.firstName &&
        cp.lastName === newContactPerson.lastName
      );

      if (!isAlreadySelected) {
        setSelectedContactPersons([...selectedContactPersons, newContactPerson]);
      }

      // Reload customer details if this is the selected customer
      if (customerIdToUse === (selectedCustomer?.id || selectedCustomer?._id)) {
        const updatedCustomerResponse = await customersAPI.getById(customerIdToUse);
        if (updatedCustomerResponse && updatedCustomerResponse.success) {
          setCustomerDetails(updatedCustomerResponse.data);
          // Update selected contact persons from the reloaded data
          if (updatedCustomerResponse.data.contactPersons) {
            setSelectedContactPersons(updatedCustomerResponse.data.contactPersons);
          }
        }
      }

      // Reset form
      setNewContactPersonData({
        salutation: "",
        firstName: "",
        lastName: "",
        email: "",
        workPhone: "",
        mobile: "",
        designation: "",
        department: "",
        skypeName: "",
        isPrimary: false
      });
      setContactPersonImage(null);
      setModalSelectedCustomerId(null);
      setIsContactPersonModalOpen(false);
    } catch (error) {
      console.error('Error saving contact person:', error);
      alert('Failed to save contact person. Please try again.');
    }
  };

  const handleCancelContactPerson = () => {
    setNewContactPersonData({
      salutation: "",
      firstName: "",
      lastName: "",
      email: "",
      workPhone: "",
      mobile: "",
      designation: "",
      department: "",
      skypeName: "",
      isPrimary: false
    });
    setContactPersonImage(null);
    setModalSelectedCustomerId(null);
    setIsContactPersonModalOpen(false);
  };

  const handleSaveAndSelectSalesperson = async () => {
    if (!newSalespersonData.name.trim()) {
      alert("Please enter a name for the salesperson");
      return;
    }

    try {
      let response;
      if (editingSalespersonId) {
        // Update existing salesperson
        response = await salespersonsAPI.update(editingSalespersonId, {
          name: newSalespersonData.name.trim(),
          email: newSalespersonData.email.trim() || "",
          phone: ""
        });
      } else {
        // Create new salesperson
        response = await salespersonsAPI.create({
          name: newSalespersonData.name.trim(),
          email: newSalespersonData.email.trim() || "",
          phone: ""
        });
      }

      if (response && response.success && response.data) {
        const savedSalesperson = response.data;

        // Reload salespersons from backend
        const salespersonsResponse = await salespersonsAPI.getAll();
        if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
          setSalespersons(salespersonsResponse.data);
        }

        // Select the saved salesperson
        setSelectedSalesperson(savedSalesperson);
        setFormData(prev => ({
          ...prev,
          salesperson: savedSalesperson.name || ""
        }));

        // Reset form and close
        setNewSalespersonData({ name: "", email: "" });
        setEditingSalespersonId(null);
        setIsNewSalespersonFormOpen(false);
      } else {
        alert("Failed to save salesperson. Please try again.");
      }
    } catch (error) {
      console.error('Error saving salesperson:', error);
      alert("Failed to save salesperson. Please try again.");
    }
  };

  const handleCancelNewSalesperson = () => {
    setNewSalespersonData({ name: "", email: "" });
    setEditingSalespersonId(null);
    setIsNewSalespersonFormOpen(false);
  };

  const handleEditSalesperson = (salesperson: Salesperson) => {
    setNewSalespersonData({
      name: salesperson.name || "",
      email: salesperson.email || ""
    });
    setEditingSalespersonId(salesperson.id || salesperson._id || null);
    setIsNewSalespersonFormOpen(true);
  };

  const handleDeleteSalesperson = async (salespersonId: string) => {
    if (!window.confirm("Are you sure you want to delete this salesperson?")) {
      return;
    }

    try {
      const response = await salespersonsAPI.delete(salespersonId);
      if (response && response.success) {
        // Reload salespersons from backend
        const salespersonsResponse = await salespersonsAPI.getAll();
        if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data) {
          setSalespersons(salespersonsResponse.data);
        }
      } else {
        alert("Failed to delete salesperson. Please try again.");
      }
    } catch (error) {
      console.error('Error deleting salesperson:', error);
      alert("Failed to delete salesperson. Please try again.");
    }
  };

  const getFilteredItems = (itemId: number | string) => {
    const search = itemSearches[itemId] || "";
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getBulkFilteredItems = () => {
    if (!bulkAddSearch.trim()) {
      return availableItems;
    }
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(bulkAddSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(bulkAddSearch.toLowerCase())
    );
  };

  const handleBulkItemToggle = (item: any) => {
    setBulkSelectedItems(prev => {
      const exists = prev.find(selected => selected.id === item.id);
      if (exists) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleBulkItemQuantityChange = (itemId: string | number, quantity: string) => {
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
        const quantity = Number(selectedItem.quantity || 1);
        const rate = Number(selectedItem.rate || 0);
        const taxId = resolveItemTaxId(selectedItem);
        return {
          id: Date.now() + index,
          itemId: selectedItem.id || selectedItem._id || undefined,
          itemDetails: selectedItem.name || "",
          quantity,
          rate,
          tax: taxId,
          amount: quantity * rate,
          stockOnHand: Number(selectedItem.stockOnHand || 0),
          unit: selectedItem.unit || "pcs",
          discount: 0,
          discountType: "percent"
        };
      });

      const nextState = {
        ...prev,
        items: [...prev.items, ...newItems]
      } as InvoiceFormState;
      const totals = calculateInvoiceTotalsFromData(nextState);
      return {
        ...nextState,
        subTotal: totals.subTotal,
        roundOff: totals.roundOff,
        total: totals.total
      };
    });

    // Close modal and reset
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const handleCancelBulkAdd = () => {
    setIsBulkAddModalOpen(false);
    setBulkSelectedItems([]);
    setBulkAddSearch("");
  };

  const getFilteredTaxes = (itemId: number | string) => {
    const search = taxSearches[itemId] || "";
    if (!search.trim()) {
      return taxOptions; // Show all taxes if search is empty
    }
    // Normalize search term (remove special characters for matching but allow them in search)
    const normalizedSearch = search.toLowerCase().trim();
    return taxOptions.filter(tax =>
      tax.name.toLowerCase().includes(normalizedSearch)
    );
  };

  const handleTaxSelect = (itemId: number | string, taxId: string) => {
    handleItemChange(itemId, 'tax', taxId);
    setOpenTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
    setTaxSearches(prev => ({ ...prev, [itemId]: "" }));
  };

  const handleSaveNewTax = () => {
    if (!newTaxData.name || !newTaxData.rate) {
      return; // Validation - should show error in real app
    }

    // Create new tax option - append rate with % to name if not already included
    const rateValue = parseFloat(newTaxData.rate);
    let displayName = newTaxData.name.trim();

    // If name doesn't already include %, append it with the rate
    if (!displayName.includes('%')) {
      displayName = `${displayName} ${rateValue}%`;
    }

    const newTax = {
      id: `TAX-${Date.now()}`,
      name: displayName,
      rate: rateValue,
      isCompound: newTaxData.isCompound
    };

    // Save to localStorage
    saveTax(newTax);

    // Add to taxOptions
    setTaxOptions(prev => [...prev, newTax]);

    // Reset form and close modal
    setNewTaxData({ name: "", rate: "", isCompound: false });
    setIsNewTaxModalOpen(false);
  };

  const handleCancelNewTax = () => {
    setNewTaxData({ name: "", rate: "", isCompound: false });
    setIsNewTaxModalOpen(false);
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setNewItemData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleNewItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewItem = async () => {
    if (!newItemData.name.trim()) {
      alert("Please enter item name");
      return;
    }
    if (!newItemData.sellingPrice) {
      alert("Please enter selling price");
      return;
    }

    // Save to backend
    try {
      const itemData = {
        name: newItemData.name,
        sku: newItemData.sku,
        sellingPrice: parseFloat(newItemData.sellingPrice) || 0,
        costPrice: parseFloat(newItemData.costPrice) || 0,
        stockOnHand: 0,
        quantityOnHand: 0,
        unit: newItemData.unit || "pcs",
        unitOfMeasure: newItemData.unit || "pcs",
        type: newItemData.type,
        salesAccount: newItemData.salesAccount,
        purchaseAccount: newItemData.purchaseAccount,
        sellable: newItemData.sellable,
        purchasable: newItemData.purchasable,
        trackInventory: newItemData.trackInventory
      };

      const response = await itemsAPI.create(itemData);
      if (response && response.success && response.data) {
        const newItem = response.data;

        // Transform the new item to match the format
        const transformedNewItem = {
          id: newItem._id || newItem.id,
          name: newItem.name || "",
          sku: newItem.sku || "",
          rate: newItem.sellingPrice || newItem.costPrice || newItem.rate || 0,
          stockOnHand: newItem.stockOnHand || newItem.quantityOnHand || 0,
          unit: newItem.unit || newItem.unitOfMeasure || "pcs"
        };

        // Close modal immediately
        setIsNewItemModalOpen(false);

        // Reset form
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

        // Reload items from backend
        const itemsResponse = await itemsAPI.getAll();
        if (itemsResponse && itemsResponse.success && itemsResponse.data) {
          const transformedItems = (itemsResponse.data as any[]).map(item => ({
            id: item._id || item.id,
            name: item.name || "",
            sku: item.sku || "",
            rate: item.sellingPrice || item.costPrice || item.rate || 0,
            stockOnHand: item.stockQuantity || item.stockOnHand || item.quantityOnHand || 0,
            unit: item.unit || item.unitOfMeasure || "pcs"
          }));
          setAvailableItems(transformedItems);

          // Auto-select the newly created item in the current row if a row is open
          if (currentItemRowId) {
            // Use setTimeout to ensure state updates are complete
            setTimeout(() => {
              handleItemSelect(currentItemRowId, transformedNewItem);
              setCurrentItemRowId(null);
            }, 100);
          } else {
            setCurrentItemRowId(null);
          }
        } else {
          setCurrentItemRowId(null);
        }
      } else {
        alert('Failed to save item. Please try again.');
      }
    } catch (error) {
      console.error('Error saving item to backend:', error);
      alert('Failed to save item. Please try again.');
    }
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
    setCurrentItemRowId(null);
  };

  const handleDeleteTax = (taxId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the tax when clicking delete

    // Delete from localStorage
    deleteTax(taxId);

    // Remove from taxOptions
    setTaxOptions(prev => prev.filter(tax => tax.id !== taxId));

    // Also remove the tax from any items that are using it
    setFormData(prev => {
      const nextState = {
        ...prev,
        items: prev.items.map(item =>
          item.tax === taxId ? { ...item, tax: "" } : item
        ),
        shippingChargeTax: prev.shippingChargeTax === taxId ? "" : prev.shippingChargeTax
      } as InvoiceFormState;
      const totals = calculateInvoiceTotalsFromData(nextState);
      return {
        ...nextState,
        subTotal: totals.subTotal,
        roundOff: totals.roundOff,
        total: totals.total
      };
    });
  };

  const resolveItemTaxId = (selectedItem: any): string => {
    const candidateValues = [
      selectedItem?.taxInfo?.taxId,
      selectedItem?.taxId,
      selectedItem?.salesTaxId,
      selectedItem?.salesTax,
      selectedItem?.tax
    ].filter((v) => v !== undefined && v !== null && String(v).trim() !== "");

    for (const candidate of candidateValues) {
      const taxOption = getTaxBySelection(candidate);
      if (taxOption) {
        return String((taxOption as any).id || (taxOption as any)._id || "");
      }
    }

    const taxNameCandidate = String(selectedItem?.taxInfo?.taxName || "").trim();
    if (taxNameCandidate) {
      const byName = getTaxBySelection(taxNameCandidate);
      if (byName) {
        return String((byName as any).id || (byName as any)._id || "");
      }
    }

    const taxRateCandidate = parseTaxRate(
      selectedItem?.taxInfo?.taxRate ?? selectedItem?.taxRate ?? selectedItem?.salesTaxRate
    );
    if (taxRateCandidate > 0) {
      const byRate = getTaxBySelection(taxRateCandidate);
      if (byRate) {
        return String((byRate as any).id || (byRate as any)._id || "");
      }
    }

    return "";
  };

  const handleItemSelect = (itemId: number | string, selectedItem: Item) => {
    const productId = (selectedItem as any).id || (selectedItem as any)._id;
    const resolvedTaxId = resolveItemTaxId(selectedItem);
    setSelectedItemIds(prev => ({ ...prev, [String(itemId)]: String(productId || "") }));

    setFormData(prev => {
      const updatedItems = prev.items.map((item) => {
        if (String(item.id) !== String(itemId)) return item;

        const quantity = Number(item.quantity || 1);
        const rate = Number(selectedItem.rate || 0);
        const updatedItem: any = {
          ...item,
          itemId: productId ? String(productId) : item.itemId,
          itemDetails: selectedItem.name || "",
          rate,
          tax: resolvedTaxId,
          stockOnHand: Number(selectedItem.stockOnHand || 0),
          unit: selectedItem.unit || item.unit || "pcs"
        };

        if (!showItemDiscount) {
          updatedItem.discount = 0;
          updatedItem.discountType = "percent";
        }

        const itemSubtotal = quantity * rate;
        const discountValue = showItemDiscount ? Number(updatedItem.discount || 0) : 0;
        const discountType = showItemDiscount ? (updatedItem.discountType || "percent") : "percent";
        const discountAmount = discountType === "amount"
          ? Math.min(itemSubtotal, discountValue)
          : Math.min(itemSubtotal, (itemSubtotal * discountValue) / 100);

        updatedItem.amount = Math.max(0, itemSubtotal - discountAmount);
        return updatedItem;
      });

      const nextState = { ...prev, items: updatedItems } as InvoiceFormState;
      const totals = calculateInvoiceTotalsFromData(nextState);
      return {
        ...nextState,
        subTotal: totals.subTotal,
        roundOff: totals.roundOff,
        total: totals.total
      };
    });

    setOpenItemDropdowns(prev => ({ ...prev, [String(itemId)]: false }));
    setItemSearches(prev => ({ ...prev, [String(itemId)]: "" }));
  };

  const toggleItemDropdown = (itemId: number | string) => {
    setOpenItemDropdowns(prev => ({
      ...prev,
      [String(itemId)]: !prev[String(itemId)]
    }));
  };

  const handleItemChange = (id: number | string, field: string, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (String(item.id) === String(id)) {
          const updatedItem: any = { ...item, [field]: value };

          if (field === "quantity" || field === "rate") {
            updatedItem[field] = Number(value) || 0;
          }
          if (field === "discount" && showItemDiscount) {
            updatedItem.discount = Number(value) || 0;
          }
          if (field === "discountType" && showItemDiscount) {
            updatedItem.discountType = value === "amount" ? "amount" : "percent";
          }
          if (!showItemDiscount) {
            updatedItem.discount = 0;
            updatedItem.discountType = "percent";
          }

          const quantity = Number(updatedItem.quantity || 0);
          const rate = Number(updatedItem.rate || 0);
          const itemSubtotal = quantity * rate;
          const discountValue = showItemDiscount ? Number(updatedItem.discount || 0) : 0;
          const discountType = showItemDiscount ? (updatedItem.discountType || "percent") : "percent";
          const discountAmount = discountType === "amount"
            ? Math.min(itemSubtotal, discountValue)
            : Math.min(itemSubtotal, (itemSubtotal * discountValue) / 100);
          updatedItem.amount = Math.max(0, itemSubtotal - discountAmount);
          return updatedItem;
        }
        return item;
      });

      const nextState = { ...prev, items: updatedItems } as InvoiceFormState;
      const totals = calculateInvoiceTotalsFromData(nextState);
      return {
        ...nextState,
        subTotal: totals.subTotal,
        roundOff: totals.roundOff,
        total: totals.total
      };
    });
  };

  const handleAddItem = () => {
    const uniqueId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: uniqueId, itemDetails: "", quantity: 1, rate: 0, tax: "", amount: 0 }
      ]
    }));
  };

  const handleRemoveItem = (id: number | string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleSelectAllItems = () => {
    setBulkSelectedItemIds(formData.items.map(item => item.id));
  };

  const handleDeselectAllItems = () => {
    setBulkSelectedItemIds([]);
  };

  const handleToggleItemSelection = (itemId: number | string) => {
    setBulkSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDuplicateItem = (id: number | string) => {
    const itemToDuplicate = formData.items.find(item => item.id === id);
    if (itemToDuplicate) {
      setFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            ...itemToDuplicate,
            id: Date.now(),
            amount: 0
          }
        ]
      }));
    }
    setOpenItemMenuId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];

    // Validate file count
    if (formData.attachedFiles.length + files.length > 10) {
      alert("You can upload a maximum of 10 files");
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

  const handleRemoveFile = (fileId: string | number) => {
    setFormData(prev => ({
      ...prev,
      attachedFiles: prev.attachedFiles.filter(file => file.id !== fileId)
    }));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const buildInvoicePayload = (statusValue: string) => {
    const totals = calculateInvoiceTotalsFromData(formData);
    const subTotal = Number(totals.subTotal || 0);
    const finalTotal = Number(totals.total || 0);
    const roundOff = Number(totals.roundOff || 0);
    const totalTaxAmountValue = Number(totals.taxAmount || 0);
    const shippingTaxAmount = Number(totals.shippingTaxAmount || 0);
    const shippingTaxRate = Number(totals.shippingTaxRate || 0);
    const discountAmount = Number(totals.discountAmount || 0);
    const shipping = showShippingCharges ? Number(formData.shippingCharges || 0) : 0;
    const adjustment = showAdjustment ? Number(formData.adjustment || 0) : 0;
    const isInclusive = isTaxInclusiveMode(formData.taxExclusive);

    const taxLabels = Object.keys(taxSummary);
    const taxName = totalTaxAmountValue > 0
      ? (taxLabels.length === 1 ? taxLabels[0] : (isInclusive ? "Tax (Included)" : "Tax"))
      : "";

    const customer = selectedCustomer || customers.find(c => c.name === formData.customerName);
    const itemRows = (formData.items as any[]).filter((item) => item.itemType !== "header");

    const payload = {
      invoiceNumber: formData.invoiceNumber,
      customer: customer?.id || customer?._id || undefined,
      customerId: customer?.id || customer?._id || undefined,
      date: formData.invoiceDate || new Date().toISOString(),
      dueDate: formData.dueDate,
      orderNumber: formData.orderNumber,
      receipt: formData.receipt,
      accountsReceivable: formData.accountsReceivable,
      salesperson: formData.salesperson,
      salespersonId: formData.salespersonId,
      subject: formData.subject,
      taxExclusive: formData.taxExclusive,

      items: itemRows.map((item) => {
        const baseAmount = getItemBaseAmount(item);
        const taxOption = getTaxBySelection(item.tax);
        const taxRate = taxOption ? parseTaxRate((taxOption as any).rate) : 0;
        const taxAmount = getTaxAmountFromBase(baseAmount, taxRate, isInclusive);
        return {
          item: item.itemId || null,
          itemId: item.itemId || null,
          name: item.itemDetails,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.rate) || 0,
          rate: Number(item.rate) || 0,
          tax: item.tax || "",
          taxRate: Number(taxRate.toFixed(2)),
          taxAmount: Number(taxAmount.toFixed(2)),
          total: Number(baseAmount.toFixed(2)),
          amount: Number(baseAmount.toFixed(2)),
          description: item.itemDetails || ""
        };
      }),

      subtotal: subTotal,
      subTotal: subTotal,
      tax: totalTaxAmountValue,
      taxAmount: totalTaxAmountValue,
      taxName: taxName,
      discount: showTransactionDiscount ? Number(formData.discount || 0) : 0,
      discountType: showTransactionDiscount ? formData.discountType : "percent",
      discountAmount: discountAmount,
      discountAccount: formData.discountAccount,
      shippingCharges: shipping,
      shippingChargeTax: formData.shippingChargeTax || "",
      shippingTaxAmount: shippingTaxAmount,
      shippingTaxRate: shippingTaxRate,
      adjustment: adjustment,
      roundOff: roundOff,
      total: finalTotal,
      balanceDue: finalTotal,
      balance: finalTotal,
      amount: finalTotal,

      currency: formData.currency,
      notes: formData.customerNotes,
      customerNotes: formData.customerNotes,
      termsAndConditions: formData.termsAndConditions,
      attachedFiles: formData.attachedFiles || [],

      paymentReceived: isPaymentReceived,
      paymentData: isPaymentReceived ? {
        paymentMode: paymentData.paymentMode || "Cash",
        depositTo: paymentData.depositTo || "Petty Cash",
        amountReceived: parseFloat(paymentData.amountReceived) || 0,
        referenceNumber: paymentData.referenceNumber || "",
        taxDeducted: paymentData.taxDeducted || "no"
      } : null,

      contactPersons: selectedContactPersons.map(cp => ({
        salutation: cp.salutation || '',
        firstName: cp.firstName || '',
        lastName: cp.lastName || '',
        email: cp.email || '',
        workPhone: cp.workPhone || '',
        mobile: cp.mobile || '',
        designation: cp.designation || '',
        department: cp.department || '',
        skypeName: cp.skypeName || '',
        isPrimary: cp.isPrimary || false
      })),

      status: statusValue,
      createdAt: new Date().toISOString()
    };

    return { payload, customer };
  };

  const isDuplicateInvoiceNumberError = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    const status = Number(error?.status || 0);
    const hasInvoiceNumberText = message.includes("invoice number");
    const hasDuplicateText = message.includes("already exists") || message.includes("duplicate");
    return hasInvoiceNumberText && hasDuplicateText && (status === 0 || status === 400 || status === 409);
  };

  const fetchLatestInvoiceNumber = async () => {
    const response = await invoicesAPI.getNextNumber(invoicePrefix || "INV-");
    if (response && response.success && response.data?.invoiceNumber) {
      const latestNumber = String(response.data.invoiceNumber);
      setFormData(prev => ({ ...prev, invoiceNumber: latestNumber }));
      if (response.data.nextNumber !== undefined && response.data.nextNumber !== null) {
        setInvoiceNextNumber(String(response.data.nextNumber).padStart(6, "0"));
      }
      return latestNumber;
    }
    return null;
  };

  const createInvoiceWithNumberRetry = async (invoiceData: any) => {
    try {
      return await saveInvoice(invoiceData);
    } catch (error: any) {
      if (!isEditMode && invoiceNumberMode === "auto" && isDuplicateInvoiceNumberError(error)) {
        const freshNumber = await fetchLatestInvoiceNumber();
        if (freshNumber) {
          const retryPayload = { ...invoiceData, invoiceNumber: freshNumber };
          return await saveInvoice(retryPayload);
        }
      }
      throw error;
    }
  };

  const handleSaveDraft = async () => {
    try {
      const { payload: invoiceData } = buildInvoicePayload("draft");
      if (!isEditMode && invoiceNumberMode === "auto") {
        try {
          const latestNumber = await fetchLatestInvoiceNumber();
          if (latestNumber) {
            invoiceData.invoiceNumber = latestNumber;
          }
        } catch (numberError) {
          console.warn("Failed to refresh invoice number before draft save:", numberError);
        }
      }

      // Save or update invoice in localStorage
      if (isEditMode && id) {
        await updateInvoice(id, invoiceData);
      } else {
        await createInvoiceWithNumberRetry(invoiceData);
      }

      // Navigate back to invoices page
      navigate("/sales/invoices");
    } catch (error) {
      console.error("Error saving invoice as draft:", error);
      toast.error("Failed to save invoice. Please try again.");
    }
  };

  const handleSaveAndSend = async (overridingStatus?: string) => {
    try {
      // Validate required fields
      if (!formData.customerName || formData.customerName.trim() === "") {
        toast.error("Please select a customer.");
        return;
      }

      if (!formData.invoiceNumber || formData.invoiceNumber.trim() === "") {
        toast.error("Please enter an invoice number.");
        return;
      }

      const requestedStatus = String(overridingStatus || formData.status || "draft").toLowerCase();
      setSaveLoading(requestedStatus === "sent" ? "send" : "draft");

      // DISABLED: Stock validation is handled by the backend which has access to real-time
      // database data and respects inventory tracking settings
      /*
      const stockValidationErrors: string[] = [];
      formData.items.forEach((item: any, index: number) => {
        const quantity = parseFloat(item.quantity as any) || 0;
        const stockOnHand = parseFloat(item.stockOnHand as any) || 0;
        const itemName = item.itemDetails || `Item ${index + 1}`;

        if (quantity > stockOnHand) {
          stockValidationErrors.push(`${itemName}: Required: ${quantity}, Available: ${stockOnHand}`);
        }
      });

      if (stockValidationErrors.length > 0) {
        alert(`Cannot create invoice: Insufficient stock for the following items:\n${stockValidationErrors.join('\n')}\n\nPlease update inventory or reduce quantities.`);
        return;
      }
      */

      // For new invoices, always create as draft first, then send from detail/email flow.
      // This avoids backend stock rejection during initial create when status is "sent".
      const statusForCreateOrUpdate = (!isEditMode && requestedStatus !== "draft") ? "draft" : requestedStatus;
      const { payload: invoiceData, customer } = buildInvoicePayload(statusForCreateOrUpdate);
      if (!isEditMode && invoiceNumberMode === "auto") {
        try {
          const latestNumber = await fetchLatestInvoiceNumber();
          if (latestNumber) {
            invoiceData.invoiceNumber = latestNumber;
          }
        } catch (numberError) {
          console.warn("Failed to refresh invoice number before save:", numberError);
        }
      }

      if (!customer || (!customer.id && !customer._id)) {
        toast.error("Invalid customer selected. Please re-select the customer.");
        return;
      }

      // Save or update invoice in localStorage
      let savedInvoice: any;
      if (isEditMode && id) {
        savedInvoice = await updateInvoice(id, invoiceData);
      } else {
        savedInvoice = await createInvoiceWithNumberRetry(invoiceData);
      }

      // If user requested send, open email modal after successful save.
      if (requestedStatus === "sent") {
        navigate(`/sales/invoices/${savedInvoice.id}`, { state: { openEmailModal: true } });
      } else {
        navigate("/sales/invoices");
      }
    } catch (error) {
      console.error("Error saving and sending invoice:", error);

      // Handle specific error messages
      if (error instanceof Error) {
        if (error.message.includes("insufficient stock")) {
          toast.error("Cannot create invoice: One or more items have insufficient stock. Please check inventory levels before creating the invoice.");
        } else if (error.message.toLowerCase().includes("already exists") || error.message.toLowerCase().includes("duplicate")) {
          toast.error("Cannot create invoice: Invoice number already exists. Please use a different invoice number.");
        } else if (error.message.includes("customer")) {
          toast.error("Cannot create invoice: Invalid customer selected. Please select a valid customer.");
        } else {
          toast.error(`Failed to save invoice: ${error.message}`);
        }
      } else {
        toast.error("Failed to save invoice. Please try again.");
      }
    } finally {
      setSaveLoading(null);
    }
  };

  const handleSave = (status: string) => {
    handleSaveAndSend(status);
  };

  const handleSaveAndPrint = () => {
    handleSaveAndSend("sent");
    // Open print dialog after a short delay
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleCancel = () => {
    navigate("/sales/invoices");
  };

  return (
    <>
      <div className="w-full h-screen flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white z-10">
          <div className="w-full px-6 py-4 flex justify-between items-center">
            <h1 className="text-lg font-normal text-gray-900 m-0 flex items-center gap-3">
              <FileText size={20} className="text-gray-500" />
              {isEditMode ? "Edit Invoice" : "New Invoice"}
            </h1>
            <div className="flex items-center gap-3">
              <div className="relative" ref={settingsDropdownRef}>
                <button
                  className="p-2 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                >
                  <Settings size={18} />
                </button>
                {isSettingsDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded shadow-lg border border-gray-200 z-50 min-w-[200px] overflow-hidden">
                    <div className="p-1">
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        onClick={() => {
                          setIsSettingsDropdownOpen(false);
                          setIsPreferencesOpen(true);
                          setActivePreferencesTab("preferences");
                        }}
                      >
                        Preferences
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        onClick={() => {
                          setIsSettingsDropdownOpen(false);
                          navigate("/settings/invoices");
                        }}
                      >
                        Manage Custom Fields
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="p-2 rounded text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white pb-24">
          <div className="w-full px-6 py-6 space-y-6">
            {/* Customer Details Button - Only show button */}
            {customerDetails && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const customerId = customerDetails._id || customerDetails.id;
                    navigate(`/sales/customers/${customerId}`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors text-sm font-medium"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  {customerDetails.name || customerDetails.displayName || customerDetails.companyName || "Customer"}'s Details
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

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
                    className="flex items-center gap-2 text-gray-600  transition-colors"
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
                      // Handle scan - search for item by SKU or name
                      const foundItem = availableItems.find(item =>
                        item.sku.toLowerCase() === scanInput.toLowerCase() ||
                        item.name.toLowerCase().includes(scanInput.toLowerCase())
                      );
                      if (foundItem) {
                        // Add item to form and recalculate totals
                        setFormData(prev => {
                          const newItem = {
                            id: Date.now(),
                            itemDetails: foundItem.name,
                            quantity: 1,
                            rate: foundItem.rate,
                            tax: "",
                            amount: foundItem.rate
                          };
                          const updatedItems = [...prev.items, newItem];

                          const subTotal = updatedItems.reduce((sum, item) => {
                            const quantity = item.quantity || 0;
                            const rate = item.rate || 0;
                            return sum + (quantity * rate);
                          }, 0);
                          const netItemsTotal = updatedItems.reduce((sum, item) => {
                            return sum + (Number(item.amount || 0));
                          }, 0);

                          const discountAmount = showTransactionDiscount
                            ? (prev.discountType === "percent"
                              ? (subTotal * (prev.discount || 0) / 100)
                              : (prev.discount || 0))
                            : 0;
                          const shipping = showShippingCharges ? (prev.shippingCharges || 0) : 0;
                          const adjustment = showAdjustment ? (prev.adjustment || 0) : 0;
                          const totalBeforeRound = netItemsTotal - discountAmount + shipping + adjustment;
                          const roundOff = Math.round(totalBeforeRound) - totalBeforeRound;
                          const total = totalBeforeRound + roundOff;

                          return {
                            ...prev,
                            items: updatedItems,
                            subTotal,
                            roundOff,
                            total
                          };
                        });
                        setScanInput("");
                      } else {
                        alert("Item not found. Please check the SKU or item name.");
                      }
                    }
                  }}
                  placeholder="Scan the item SKU, etc.,"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all"
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-6">
              {/* Row 1: Customer Name */}
              {/* Customer Selection Row */}
              <div className="flex items-center gap-6">
                <label className="text-[13px] font-medium text-red-500 w-[140px] flex-shrink-0">
                  Customer Name*
                </label>
                <div className="flex-1 relative flex" ref={customerDropdownRef}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full h-9 px-3 border border-gray-300 rounded-l focus:outline-none focus:border-[#3f83fb] text-sm bg-white"
                      placeholder="Select or add a customer"
                      value={formData.customerName}
                      readOnly
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    />
                    <ChevronDown
                      size={14}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                  <button
                    type="button"
                    className="h-9 w-10 bg-[#156372] text-white rounded-r hover:bg-[#0D4A52] flex items-center justify-center transition-colors border border-[#156372]"
                    onClick={() => setCustomerSearchModalOpen(true)}
                  >
                    <Search size={16} />
                  </button>

                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-hidden">
                      <div className="flex items-center gap-2 p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="flex-1 text-sm outline-none px-1 py-1"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCustomers.map((customer, idx) => (
                          <div
                            key={customer.id || customer._id || `cust-${idx}`}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="text-sm text-gray-700">{customer.name || customer.displayName}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="w-full p-2 border-t border-gray-100 text-xs text-[#156372] hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors"
                        onClick={openCustomerQuickAction}
                      >
                        <Plus size={14} />
                        New Customer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Number & Order Number */}
              <div className="flex items-center gap-6">
                <label className="text-[13px] font-medium text-red-500 w-[140px] flex-shrink-0">
                  Invoice#*
                </label>
                <div className="relative w-[280px]">
                  <input
                    type="text"
                    className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none bg-white text-sm pr-9"
                    value={formData.invoiceNumber}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setIsInvoiceNumberModalOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-[#156372] transition-colors"
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="text-[13px] font-medium text-gray-600 w-[140px] flex-shrink-0">
                  Order Number
                </label>
                <input
                  type="text"
                  name="orderNumber"
                  className="w-[280px] h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm"
                  value={formData.orderNumber}
                  onChange={handleChange}
                />
              </div>

              {/* Invoice Date, Terms, Due Date */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-6 flex-grow max-w-[420px]">
                  <label className="text-[13px] font-medium text-red-500 w-[140px] flex-shrink-0">
                    Invoice Date*
                  </label>
                  <div className="relative flex-1" ref={invoiceDatePickerRef}>
                    <input
                      type="text"
                      className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm cursor-pointer"
                      value={formData.invoiceDate}
                      readOnly
                      placeholder="26 Jan 2026"
                      onClick={() => setIsInvoiceDatePickerOpen(!isInvoiceDatePickerOpen)}
                    />
                    {isInvoiceDatePickerOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 p-2 min-w-[250px]">
                        <div className="text-xs text-center py-2 text-gray-500">Select Date</div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(invoiceDateCalendar).map((day, i) => (
                            <button key={i} onClick={() => handleDateSelect(day.fullDate, 'invoiceDate')} className="p-1 text-xs hover:bg-blue-100 rounded">
                              {day.date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-1">
                  <label className="text-[13px] font-medium text-gray-600 whitespace-nowrap">
                    Terms
                  </label>
                  <div className="relative w-[220px]" ref={paymentTermsDropdownRef}>
                    <button
                      type="button"
                      onClick={togglePaymentTermsDropdown}
                      className="w-full h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm bg-white flex items-center justify-between"
                    >
                      <span className="truncate text-gray-700">{selectedPaymentTerm || "Due on Receipt"}</span>
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform ${isPaymentTermsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isPaymentTermsOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={paymentTermsSearchQuery}
                              onChange={(e) => setPaymentTermsSearchQuery(e.target.value)}
                              placeholder="Search terms"
                              className="w-full h-8 pl-7 pr-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-400"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredPaymentTerms.length > 0 ? (
                            filteredPaymentTerms.map((term) => (
                              <button
                                key={term.id}
                                type="button"
                                onClick={() => handlePaymentTermSelect(term)}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${selectedPaymentTerm === term.value
                                  ? "bg-blue-500 text-white"
                                  : "text-gray-700 hover:bg-gray-50"
                                  }`}
                              >
                                <span>{term.label}</span>
                                {selectedPaymentTerm === term.value && <Check size={14} />}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No payment terms found</div>
                          )}
                        </div>
                        <div className="border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              setIsConfigureTermsOpen(true);
                              setPaymentTermsSearchQuery("");
                              if (isPaymentTermsOpen) {
                                togglePaymentTermsDropdown();
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-[#156372] hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Settings size={14} />
                            Manage Terms
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="text-[13px] font-medium text-gray-600 whitespace-nowrap ml-4">
                    Due Date
                  </label>
                  <div className="relative" ref={dueDatePickerRef}>
                    <input
                      type="text"
                      className="w-[140px] h-9 px-3 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm border-dashed text-gray-600 cursor-pointer"
                      value={formData.dueDate}
                      readOnly
                      placeholder="26 Jan 2026"
                      onClick={() => setIsDueDatePickerOpen(!isDueDatePickerOpen)}
                    />
                    {isDueDatePickerOpen && (
                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 min-w-[280px]">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigateMonth("prev", "dueDate"); }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <ChevronDown className="rotate-90 text-gray-500" size={18} />
                          </button>
                          <div className="text-sm font-semibold text-gray-700 capitalize">
                            {dueDateCalendar.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigateMonth("next", "dueDate"); }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <ChevronDown className="-rotate-90 text-gray-500" size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="text-xs font-medium text-gray-400">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(dueDateCalendar).map((day, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateSelect(day.fullDate, 'dueDate');
                              }}
                              className={`
                                h-8 w-8 rounded-full text-xs flex items-center justify-center transition-all
                                ${day.month !== 'current' ? 'text-gray-300' : 'text-gray-700 hover:bg-blue-50 hover:text-[#156372]'}
                                ${formData.dueDate === formatDate(day.fullDate) ? 'bg-[#156372] text-white hover:bg-[#0D4A52] hover:text-white font-semibold shadow-sm' : ''}
                                ${formatDate(new Date()) === formatDate(day.fullDate) && formData.dueDate !== formatDate(day.fullDate) ? 'border border-[#156372] text-[#156372]' : ''}
                              `}
                            >
                              {day.date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Accounts Receivable */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 w-[140px]">
                  <label className="text-[13px] font-medium text-gray-600">
                    Accounts Receivable
                  </label>
                  <Info size={12} className="text-gray-300 cursor-help" />
                </div>
                <div className="relative w-[280px]">
                  <select
                    className="w-full h-9 px-3 pr-8 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm appearance-none bg-white font-normal"
                    value={formData.accountsReceivable}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountsReceivable: e.target.value }))}
                  >
                    {accountsReceivableOptions.length > 0 ? (
                      accountsReceivableOptions.map((acc, idx) => (
                        <option key={acc._id || acc.id || idx} value={acc.accountName}>
                          {acc.accountName}
                        </option>
                      ))
                    ) : (
                      <option value="Accounts Receivable">Accounts Receivable</option>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>


              <div className="flex items-center gap-6">
                <label className="text-[13px] font-medium text-gray-600 w-[140px] flex-shrink-0">
                  Salesperson
                </label>
                <SalespersonDropdown
                  value={formData.salesperson}
                  isOpen={isSalespersonDropdownOpen}
                  search={salespersonSearch}
                  salespersons={filteredSalespersons}
                  dropdownRef={salespersonDropdownRef}
                  onToggle={() => setIsSalespersonDropdownOpen(!isSalespersonDropdownOpen)}
                  onSearchChange={setSalespersonSearch}
                  onSelect={(salesperson) => handleSalespersonSelect(salesperson)}
                  onManage={() => {
                    setIsManageSalespersonsOpen(true);
                    setIsSalespersonDropdownOpen(false);
                  }}
                />
              </div>

              <div className="flex items-start gap-6">
                <div className="flex items-center gap-2 w-[140px] pt-2">
                  <label className="text-[13px] font-medium text-gray-600">
                    Subject
                  </label>
                  <Info size={12} className="text-gray-300 cursor-help" />
                </div>
                <textarea
                  name="subject"
                  className="flex-1 h-14 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm resize-none"
                  placeholder="Let your customer know what this Invoice is for"
                  value={formData.subject}
                  onChange={handleChange}
                />
              </div>

              {/* Tax Preference */}
              <div className="flex items-center">
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700">
                    Tax Preference
                  </label>
                </div>
                <div className="w-1/3 relative" ref={taxExclusiveDropdownRef}>
                  <button
                    type="button"
                    className={`block w-full rounded-md border-gray-300 focus:border-[#156372] focus:ring-[#156372] sm:text-sm py-2 px-3 border bg-white text-left flex items-center justify-between ${taxExclusiveOptions.length === 1 ? "cursor-not-allowed opacity-70" : ""}`}
                    onClick={() => {
                      if (taxExclusiveOptions.length > 1) {
                        setIsTaxExclusiveDropdownOpen(!isTaxExclusiveDropdownOpen);
                      }
                    }}
                  >
                    <span className="block truncate">{formData.taxExclusive}</span>
                    {taxExclusiveOptions.length > 1 && <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {isTaxExclusiveDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">Item Tax Preference</div>
                      <div>
                        {taxExclusiveOptions.map(option => (
                          <div
                            key={option}
                            className={`px-4 py-2 text-sm cursor-pointer  flex items-center justify-between ${formData.taxExclusive === option ? "bg-blue-50 text-[#156372]" : "text-gray-700"
                              }`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, taxExclusive: option }));
                              setIsTaxExclusiveDropdownOpen(false);
                            }}
                          >
                            <span>{option}</span>
                            {formData.taxExclusive === option && (
                              <Check size={16} className="text-[#156372]" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Item Table Section */}
            <div className="border-t border-gray-100 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-gray-800">Item Table</h2>
                <div className="flex items-center gap-5">
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-[#156372] hover:text-[#0D4A52]"
                    onClick={() => setIsScanModeOpen(true)}
                  >
                    <ScanLine size={14} />
                    Scan Item
                  </button>
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-[#156372] hover:text-[#0D4A52]"
                    onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  >
                    <CheckSquare size={14} />
                    Bulk Actions
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-10"></th>
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-tight w-[360px]">ITEM DETAILS</th>
                      <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-tight w-24">QUANTITY</th>
                      <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-tight w-32">
                        <div className="flex items-center justify-end gap-1">
                          RATE <Grid3x3 size={12} className="text-gray-300" />
                        </div>
                      </th>
                      {showItemDiscount && (
                        <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-tight w-24">DISCOUNT</th>
                      )}
                      <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-tight w-28">TAX</th>
                      <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-tight w-28">AMOUNT</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <React.Fragment key={item.id || `item-${index}`}>
                        <tr className="border-b border-gray-100 group">
                          <td className="text-center">
                            <MoreVertical size={14} className="text-gray-300 cursor-move inline-block" />
                          </td>
                          <td className="py-3 px-3 w-[360px] max-w-[360px]">
                            <div className="relative" ref={el => { itemDropdownRefs.current[item.id] = el; }}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-50 border border-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  <ImageIcon size={16} className="text-gray-300" />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Type or click to select an item."
                                  className="w-full text-sm outline-none bg-transparent placeholder-gray-400 py-1"
                                  value={item.itemDetails}
                                  onClick={() => toggleItemDropdown(item.id)}
                                  readOnly
                                />
                              </div>
                              {openItemDropdowns[item.id] && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-72 overflow-y-auto">
                                  {availableItems.length === 0 ? (
                                    <div className="px-3 py-3 text-sm text-gray-500">No items found.</div>
                                  ) : (
                                    availableItems.map((p, pidx) => {
                                      const stockValue = Number(p.stockOnHand || 0);
                                      return (
                                        <button
                                          key={p.id || `prod-${pidx}`}
                                          type="button"
                                          onClick={() => handleItemSelect(item.id, p)}
                                          className="w-full px-3 py-2 text-left border-b border-gray-100 last:border-b-0 hover:bg-[#3b82f6] hover:text-white group/item transition-colors"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="font-medium text-sm truncate">{p.name}</div>
                                              <div className="text-xs text-gray-500 group-hover/item:text-blue-100">
                                                SKU: {p.sku || "-"} Rate: {currencySymbol}{Number(p.rate || 0).toFixed(2)}
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <div className="text-xs text-gray-500 group-hover/item:text-blue-100">Stock on Hand</div>
                                              <div className={`text-sm ${stockValue < 0 ? "text-red-500 group-hover/item:text-red-100" : "text-[#156372] group-hover/item:text-white"}`}>
                                                {stockValue.toFixed(6)} {p.unit || ""}
                                              </div>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })
                                  )}
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2.5 text-sm text-[#156372] hover:bg-blue-50 text-left border-t border-gray-100 font-medium flex items-center gap-2"
                                    onClick={() => { setIsNewItemModalOpen(true); setCurrentItemRowId(item.id); }}
                                  >
                                    <Plus size={14} />
                                    Add New Item
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3">
                            {(() => {
                              const qty = Number(item.quantity || 0);
                              const stock = Number(item.stockOnHand || 0);
                              const isOverStock = qty > stock;
                              return (
                                <input
                                  type="number"
                                  className={`w-full h-8 px-2 text-right text-sm border-none focus:ring-0 focus:outline-none ${isOverStock ? "text-red-600 font-semibold" : ""}`}
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                />
                              );
                            })()}
                            <div className="text-right pr-2 text-[11px] text-gray-500 border-t border-gray-50 pt-0.5">
                              Stock on Hand: {Number(item.stockOnHand || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3">
                            <input
                              type="number"
                              className="w-full h-8 px-2 text-right text-sm border-none focus:ring-0 focus:outline-none"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                            />
                            <div className="text-right pr-2 text-[11px] text-gray-300 border-t border-gray-50 pt-0.5">0.00</div>
                          </td>
                          {showItemDiscount && (
                            <td className="px-3">
                              <div className="flex items-center justify-end border border-gray-200 rounded overflow-hidden">
                                <input
                                  type="text"
                                  className="w-12 h-8 px-1 text-right text-sm border-none focus:ring-0 focus:outline-none"
                                  value={item.discount || 0}
                                  onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
                                />
                                <div className="border-l border-gray-200 bg-gray-50 flex items-center h-8">
                                  <select
                                    className="appearance-none bg-transparent h-full px-1 text-[11px] text-gray-600 focus:outline-none cursor-pointer"
                                    value={item.discountType || 'percent'}
                                    onChange={(e) => handleItemChange(item.id, 'discountType', e.target.value)}
                                  >
                                    <option value="percent">%</option>
                                    <option value="amount">{currencySymbol}</option>
                                  </select>
                                  <ChevronDown size={8} className="mr-1 text-gray-400 pointer-events-none -ml-1" />
                                </div>
                              </div>
                              <div className="text-right pr-1 text-[10px] text-gray-300 pt-0.5">
                                {item.discountType === 'amount' ? Number(item.discount || 0).toFixed(2) : '0.00'}
                              </div>
                            </td>
                          )}
                          <td className="px-3 min-w-[140px]">
                            <div className="relative" ref={(el) => { taxDropdownRefs.current[item.id] = el; }}>
                              <button
                                type="button"
                                className="w-full h-8 px-2 text-sm border border-gray-200 rounded bg-white text-left flex items-center justify-between hover:border-blue-400"
                                onClick={() => setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              >
                                <span className={`${item.tax ? "text-gray-800" : "text-gray-400"} truncate`}>
                                  {item.tax ? (getTaxDisplayLabel(findTaxOptionById(item.tax)) || "Select a Tax") : "Select a Tax"}
                                </span>
                                <ChevronDown size={14} className="text-gray-400" />
                              </button>
                              {openTaxDropdowns[item.id] && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-50">
                                  <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={taxSearches[item.id] || ""}
                                        onChange={(e) => setTaxSearches(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="w-full h-8 pl-7 pr-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto py-1">
                                    <div className="px-3 pb-1 text-xs font-semibold text-gray-500">Taxes</div>
                                    {getFilteredTaxes(item.id).length > 0 ? (
                                      getFilteredTaxes(item.id).map((tax, taxIndex) => (
                                        <button
                                          key={String((tax as any).id || (tax as any)._id || `tax-${taxIndex}`)}
                                          type="button"
                                          onClick={() => handleTaxSelect(item.id, String((tax as any).id || (tax as any)._id))}
                                          className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${String(item.tax || "") === String((tax as any).id || (tax as any)._id) ? "bg-blue-600 text-white hover:bg-blue-600" : "text-gray-700"}`}
                                        >
                                          {getTaxDisplayLabel(tax)}
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 text-left flex items-center gap-2"
                                    onClick={() => {
                                      setOpenTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                      setIsNewTaxModalOpen(true);
                                    }}
                                  >
                                    <Plus size={13} />
                                    New Tax
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 text-right">
                            <span className="text-sm font-medium text-gray-800">
                              {Number(item.amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center group-hover:opacity-100 opacity-0 transition-opacity">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={14} strokeWidth={3} />
                            </button>
                          </td>
                        </tr>
                        {newHeaderItemId === item.id && showNewHeaderInput && (
                          <tr>
                            <td colSpan={7} className="p-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Add New Header"
                                  value={newHeaderText}
                                  onChange={(e) => setNewHeaderText(e.target.value)}
                                  className="flex-1 px-4 py-2 border border-blue-200 rounded text-sm focus:outline-none"
                                  autoFocus
                                />
                                <button onClick={() => setShowNewHeaderInput(false)} className="text-red-500">
                                  <X size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {itemsWithAdditionalInfo.has(item.id) && (
                          <tr>
                            <td colSpan={7} className="p-4 bg-gray-50">
                              <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Tag size={16} className="text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">Reporting Tags</span>
                                  <ChevronDown size={14} className="text-gray-500" />
                                </div>
                                <div className="bg-white border border-gray-200 rounded-md p-4">
                                  <p className="text-sm text-gray-600">
                                    There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 mt-6">
                <div className="relative">
                  <button
                    className="h-8 px-4 pl-3 pr-8 bg-[#156372] text-white rounded text-xs font-semibold hover:bg-[#0D4A52] transition-colors relative"
                    onClick={() => handleAddItem()}
                  >
                    <Plus size={14} className="inline mr-1" /> Add New Row
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2" />
                  </button>
                </div>
                <button
                  className="h-8 px-4 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center gap-1.5"
                  onClick={() => setIsBulkAddModalOpen(true)}
                >
                  <Plus size={14} /> Add Items in Bulk
                </button>
              </div>
            </div>


            {/* Bottom Form Layout: Notes & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-10 pt-10 border-t border-gray-200">

              {/* Left Column: Notes & Terms */}
              <div className="space-y-10">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Customer Notes</label>
                  <textarea
                    name="customerNotes"
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#3f83fb] text-sm leading-relaxed bg-white"
                    value={formData.customerNotes}
                    onChange={handleChange}
                  />
                  <p className="text-[11px] text-gray-400 mt-2">Will be displayed on the invoice</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Terms & Conditions</label>
                  <textarea
                    name="termsAndConditions"
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#3f83fb] text-sm leading-relaxed bg-white"
                    placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                    value={formData.termsAndConditions}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Right Column: Detailed Summary */}
              <div className="w-full">
                <div className="bg-[#fafafa] p-6 rounded-md border border-gray-200 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-600">
                      Sub Total
                      <span className="ml-1 text-xs text-gray-500">({formData.taxExclusive})</span>
                    </span>
                    <span className="font-semibold text-gray-800">{Number(formData.subTotal || 0).toFixed(2)}</span>
                  </div>

                  {showTransactionDiscount && (
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] text-gray-500">Discount</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center">
                            <input
                              type="number"
                              name="discount"
                              className="w-16 h-8 px-2 border border-gray-300 rounded-l text-right text-sm bg-white focus:outline-none focus:border-blue-500"
                              value={formData.discount}
                              onChange={handleChange}
                            />
                            <select
                              name="discountType"
                              value={formData.discountType || 'percent'}
                              onChange={handleChange}
                              className="h-8 border border-l-0 border-gray-300 rounded-r bg-gray-50 px-2 text-xs focus:outline-none"
                            >
                              <option value="percent">%</option>
                              <option value="amount">{formData.currency || 'USD'}</option>
                            </select>
                          </div>
                          <span className="min-w-[60px] text-right font-semibold text-gray-700">
                            {Number(liveTotals.discountAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {Number(liveTotals.discountAmount || 0) > 0 && (
                        <div className="text-right text-[11px] text-gray-500 mt-1">
                          (Applied on {Number(liveTotals.discountBase || 0).toFixed(2)})
                        </div>
                      )}
                    </div>
                  )}

                  {showShippingCharges && (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-gray-500">Shipping Charges</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            name="shippingCharges"
                            className="w-20 h-8 px-2 border border-gray-300 rounded text-right text-sm bg-white"
                            value={formData.shippingCharges}
                            onChange={handleChange}
                          />
                          <Info size={14} className="text-gray-300" />
                          <span className="min-w-[60px] text-right font-semibold text-gray-700">{Number(formData.shippingCharges || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] text-gray-500">Shipping Charge Tax</span>
                        <div className="relative min-w-[220px]" ref={shippingTaxDropdownRef}>
                          <button
                            type="button"
                            className="w-full h-8 px-2 text-sm border border-gray-200 rounded bg-white text-left flex items-center justify-between hover:border-blue-400"
                            onClick={() => setIsShippingTaxDropdownOpen((prev) => !prev)}
                          >
                            <span className={`${formData.shippingChargeTax ? "text-gray-800" : "text-gray-400"} truncate`}>
                              {formData.shippingChargeTax ? (getTaxDisplayLabel(getTaxBySelection(formData.shippingChargeTax)) || "Select a Tax") : "Select a Tax"}
                            </span>
                            <ChevronDown size={14} className="text-gray-400" />
                          </button>
                          {isShippingTaxDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-50">
                              <div className="p-2 border-b border-gray-100">
                                <div className="relative">
                                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Search"
                                    value={shippingTaxSearch}
                                    onChange={(e) => setShippingTaxSearch(e.target.value)}
                                    className="w-full h-8 pl-7 pr-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto py-1">
                                {taxOptions
                                  .filter((tax) => getTaxDisplayLabel(tax).toLowerCase().includes(shippingTaxSearch.toLowerCase()))
                                  .map((tax, taxIndex) => {
                                    const taxId = String((tax as any).id || (tax as any)._id || `shipping-tax-${taxIndex}`);
                                    return (
                                      <button
                                        key={taxId}
                                        type="button"
                                        onClick={() => {
                                          setFormData((prev) => {
                                            const nextState = { ...prev, shippingChargeTax: taxId } as InvoiceFormState;
                                            const totals = calculateInvoiceTotalsFromData(nextState);
                                            return {
                                              ...nextState,
                                              subTotal: totals.subTotal,
                                              roundOff: totals.roundOff,
                                              total: totals.total
                                            };
                                          });
                                          setIsShippingTaxDropdownOpen(false);
                                          setShippingTaxSearch("");
                                        }}
                                        className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${String(formData.shippingChargeTax || "") === taxId ? "bg-blue-600 text-white hover:bg-blue-600" : "text-gray-700"}`}
                                      >
                                        {getTaxDisplayLabel(tax)}
                                      </button>
                                    );
                                  })}
                                {taxOptions.filter((tax) => getTaxDisplayLabel(tax).toLowerCase().includes(shippingTaxSearch.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">No taxes found</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100 text-left"
                                onClick={() => {
                                  setFormData((prev) => {
                                    const nextState = { ...prev, shippingChargeTax: "" } as InvoiceFormState;
                                    const totals = calculateInvoiceTotalsFromData(nextState);
                                    return {
                                      ...nextState,
                                      subTotal: totals.subTotal,
                                      roundOff: totals.roundOff,
                                      total: totals.total
                                    };
                                  });
                                  setIsShippingTaxDropdownOpen(false);
                                  setShippingTaxSearch("");
                                }}
                              >
                                Clear Selection
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Taxes Breakdown */}
                  {Object.keys(taxSummary).length > 0 && (
                    <div className="space-y-2 py-2 border-t border-gray-100 mt-2">
                      {Object.entries(taxSummary).map(([taxName, taxAmount]) => (
                        <div key={taxName} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{taxName}</span>
                          <span className="font-semibold text-gray-700">{taxAmount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showAdjustment && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] text-gray-500">Adjustment</span>
                        <ChevronDown size={14} className="text-gray-300" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="adjustment"
                          className="w-20 h-8 px-2 border border-gray-300 rounded text-right text-sm bg-white"
                          value={formData.adjustment}
                          onChange={handleChange}
                        />
                        <Info size={14} className="text-gray-300" />
                        <span className="min-w-[60px] text-right font-semibold text-gray-700">{Number(formData.adjustment || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}



                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-[15px] font-bold text-gray-900">Total ( {currencySymbol} )</span>
                    <span className="text-[17px] font-bold text-gray-900">{Number(formData.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="mt-8">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Attach File(s) to Invoice</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 h-9 px-4 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
                      onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)}
                    >
                      <Upload size={14} className="text-gray-400" />
                      Upload File
                    </button>
                    {formData.attachedFiles.length > 0 && (
                      <div className="bg-[#156372] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        {formData.attachedFiles.length}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium tracking-tight">Maximum 10 files, 10MB each</p>
                </div>
              </div>
            </div>

            {/* Payment Fields - Show when checkbox is checked */}
            {isPaymentReceived && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4 space-y-4">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Details</h3>

                {/* Payment Mode */}
                <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Payment Mode
                  </label>
                  <div className="max-w-[400px] relative" ref={paymentModeDropdownRef}>
                    <div
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] bg-white cursor-pointer flex items-center justify-between min-h-[36px]"
                      onClick={() => setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen)}
                    >
                      <span className={paymentData.paymentMode ? "text-gray-900" : "text-gray-400"}>
                        {paymentData.paymentMode || "Select Payment Mode"}
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isPaymentModeDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isPaymentModeDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                        {paymentModeOptions.map((mode, idx) => (
                          <div
                            key={mode || idx}
                            className="px-4 py-2  cursor-pointer text-sm"
                            onClick={() => {
                              setPaymentData(p => ({ ...p, paymentMode: mode }));
                              setIsPaymentModeDropdownOpen(false);
                            }}
                          >
                            {mode}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deposit To */}
                <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                  <label className="text-sm font-medium text-red-500">
                    Deposit To*
                  </label>
                  <div className="max-w-[400px] relative" ref={depositToDropdownRef}>
                    <div
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] bg-white cursor-pointer flex items-center justify-between min-h-[36px]"
                      onClick={() => setIsDepositToDropdownOpen(!isDepositToDropdownOpen)}
                    >
                      <span className={paymentData.depositTo ? "text-gray-900" : "text-gray-400"}>
                        {paymentData.depositTo || "Select Deposit Account"}
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDepositToDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isDepositToDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                        {depositToOptions.map((account, idx) => (
                          <div
                            key={account || idx}
                            className="px-4 py-2  cursor-pointer text-sm"
                            onClick={() => {
                              setPaymentData(p => ({ ...p, depositTo: account }));
                              setIsDepositToDropdownOpen(false);
                            }}
                          >
                            {account}
                          </div>
                        ))}
                        {bankAccounts.length === 0 && (
                          <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                            No bank accounts found. Add accounts in Banking section.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Received */}
                <div className="grid grid-cols-[150px_1fr] gap-4 items-start">
                  <label className="text-sm font-medium text-red-500 pt-2">
                    Amount Received*
                  </label>
                  <div className="max-w-[400px]">
                    <div className="flex border border-gray-300 rounded overflow-hidden focus-within:border-[#156372] focus-within:ring-2 focus-within:ring-[rgba(21,99,114,0.1)]">
                      <div className="bg-gray-50 border-r border-gray-300 px-3 py-1.5 text-sm text-gray-600 flex items-center">
                        {currencySymbol}
                      </div>
                      <input
                        type="number"
                        className="flex-1 px-3 py-1.5 text-sm outline-none"
                        value={paymentData.amountReceived}
                        onChange={(e) => setPaymentData(p => ({ ...p, amountReceived: e.target.value }))}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Reference Number */}
                <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Reference#
                  </label>
                  <div className="max-w-[400px]">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)]"
                      value={paymentData.referenceNumber}
                      onChange={(e) => setPaymentData(p => ({ ...p, referenceNumber: e.target.value }))}
                      placeholder="Payment reference number"
                    />
                  </div>
                </div>

                {/* Tax deducted? */}
                <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Tax deducted?
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="taxDeductedDetails"
                        value="no"
                        checked={paymentData.taxDeducted === "no"}
                        onChange={(e) => setPaymentData(p => ({ ...p, taxDeducted: e.target.value }))}
                        className="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                      />
                      <span className="text-sm text-gray-700">No Tax deducted</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="taxDeductedDetails"
                        value="yes"
                        checked={paymentData.taxDeducted === "yes"}
                        onChange={(e) => setPaymentData(p => ({ ...p, taxDeducted: e.target.value }))}
                        className="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] accent-[#156372]"
                      />
                      <span className="text-sm text-gray-700">Yes, TDS</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Email Communications */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Email Communications</h3>
                {selectedContactPersons.length > 0 && (
                  <button
                    onClick={() => setSelectedContactPersons([])}
                    className="flex items-center gap-1 text-sm text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <X size={14} className="text-red-600" />
                    <span>Clear Selection</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    // Set modal customer ID if a customer is already selected
                    if (selectedCustomer && (selectedCustomer.id || selectedCustomer._id)) {
                      setModalSelectedCustomerId(selectedCustomer.id || selectedCustomer._id || null);
                    } else {
                      setModalSelectedCustomerId(null);
                    }
                    setIsContactPersonModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:border-gray-400  transition-colors"
                >
                  <Plus size={16} className="text-gray-600" />
                  <span>Add New</span>
                </button>
                {selectedContactPersons.map((cp, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md border border-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="w-4 h-4 text-[#156372] border-gray-300 rounded"
                    />
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {cp.firstName?.[0] || cp.email?.[0] || 'U'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700">
                      {cp.firstName && cp.lastName
                        ? `${cp.firstName} ${cp.lastName}`
                        : cp.email || 'Contact Person'}
                      {cp.email && <span className="text-gray-500"> &lt;{cp.email}&gt;</span>}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedContactPersons(selectedContactPersons.filter((_, i) => i !== index));
                      }}
                      className="ml-1 text-gray-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Gateway Section - Bottom Left */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-gray-700 font-medium">Want to get paid faster?</span>
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-5 bg-red-600 rounded"></div>
                  <div className="w-8 h-5 bg-[#1a1f71] rounded text-white flex items-center justify-center text-[10px] font-semibold">VISA</div>
                  <div className="w-8 h-5 bg-[#1a1f71] rounded text-white flex items-center justify-center text-[10px] font-semibold">MC</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Configure payment gateways and receive payments online.
              </p>
              <button className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium">
                Set up Payment Gateway
              </button>
            </div>

            {/* Additional Fields */}
            <div className="border-t border-gray-200 pt-6 mt-6 mb-24">
              <p className="text-sm text-gray-600">
                Additional Fields: Start adding custom fields for your invoices by going to Settings âž” Sales âž” Invoices.
              </p>
            </div>
          </div>



          {/* New Salesperson Modal */}
          {isNewSalespersonFormOpen && !isManageSalespersonsOpen && createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => {
              setIsNewSalespersonFormOpen(false);
              setEditingSalespersonId(null);
              setNewSalespersonData({ name: "", email: "" });
            }}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">{editingSalespersonId ? "Edit Salesperson" : "Add New Salesperson"}</h2>
                  <button
                    onClick={() => {
                      setIsNewSalespersonFormOpen(false);
                      setEditingSalespersonId(null);
                      setNewSalespersonData({ name: "", email: "" });
                    }}
                    className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-red-600 mb-1">
                        Name<span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={newSalespersonData.name}
                        onChange={handleNewSalespersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:bg-white"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-red-600 mb-1">
                        Email<span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={newSalespersonData.email}
                        onChange={handleNewSalespersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:bg-white"
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleSaveAndSelectSalesperson}
                        className="px-4 py-2 bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] transition-colors text-sm font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleCancelNewSalesperson}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Manage Salespersons Modal */}
          {isManageSalespersonsOpen && createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">Manage Salespersons</h2>
                  <button
                    onClick={() => setIsManageSalespersonsOpen(false)}
                    className="p-2  rounded-lg text-gray-400 "
                  >
                    <X size={20} />
                  </button>
                </div>

                {selectedSalespersonIds.length > 0 ? (
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">
                        Merge
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                                setSelectedSalespersonIds(filteredManageSalespersons.map(s => (s.id || s._id || "").toString()));
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
                          const salespersonId = (salesperson.id || salesperson._id || "").toString();
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
                                {(salesperson as any).status === 'inactive' && (
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditSalesperson(salesperson);
                                    }}
                                  >
                                    <Pencil size={16} />
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
                          onClick={() => setManageSalespersonMenuOpen(null)}
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
          )}

          {/* Add Contact Person Modal */}
          {isContactPersonModalOpen && createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={handleCancelContactPerson}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Add Contact Person</h2>
                  <button
                    onClick={handleCancelContactPerson}
                    className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Customer Selection (if no customer selected) */}
                {(!selectedCustomer || !selectedCustomer.id) && (
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Customer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modalSelectedCustomerId || ''}
                      onChange={(e) => setModalSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    >
                      <option value="">-- Select a customer --</option>
                      {customers.map((customer) => {
                        const customerId = customer.id || customer._id;
                        const customerName = customer.name || customer.displayName || customer.companyName || '';
                        return (
                          <option key={customerId} value={customerId}>
                            {customerName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Form Content */}
                <div className="p-6 grid grid-cols-2 gap-6">
                  {/* Left Column - Form Fields */}
                  <div className="space-y-4">
                    {/* Name Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          name="salutation"
                          value={newContactPersonData.salutation}
                          onChange={handleContactPersonChange}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        >
                          <option value="">Select</option>
                          <option value="Mr.">Mr.</option>
                          <option value="Mrs.">Mrs.</option>
                          <option value="Ms.">Ms.</option>
                          <option value="Dr.">Dr.</option>
                        </select>
                        <input
                          type="text"
                          name="firstName"
                          value={newContactPersonData.firstName}
                          onChange={handleContactPersonChange}
                          placeholder="First Name"
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        />
                        <input
                          type="text"
                          name="lastName"
                          value={newContactPersonData.lastName}
                          onChange={handleContactPersonChange}
                          placeholder="Last Name"
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={newContactPersonData.email}
                        onChange={handleContactPersonChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                        placeholder="Enter email address"
                      />
                    </div>

                    {/* Phone Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none">
                            <option value="+252">+252 (Somalia)</option>
                            <option value="+254">+254 (Kenya)</option>
                            <option value="+1">+1 (USA/Canada)</option>
                            <option value="+44">+44 (UK)</option>
                            <option value="+971">+971 (UAE)</option>
                            <option value="+966">+966 (Saudi Arabia)</option>
                          </select>
                          <input
                            type="text"
                            name="workPhone"
                            value={newContactPersonData.workPhone}
                            onChange={handleContactPersonChange}
                            placeholder="Work Phone"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none">
                            <option value="+252">+252 (Somalia)</option>
                            <option value="+254">+254 (Kenya)</option>
                            <option value="+1">+1 (USA/Canada)</option>
                            <option value="+44">+44 (UK)</option>
                            <option value="+971">+971 (UAE)</option>
                            <option value="+966">+966 (Saudi Arabia)</option>
                          </select>
                          <input
                            type="text"
                            name="mobile"
                            value={newContactPersonData.mobile}
                            onChange={handleContactPersonChange}
                            placeholder="Mobile"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Skype */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skype Name/Number</label>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#156372] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">S</span>
                        </div>
                        <input
                          type="text"
                          name="skypeName"
                          value={newContactPersonData.skypeName}
                          onChange={handleContactPersonChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter Skype name or number"
                        />
                      </div>
                    </div>

                    {/* Other Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                        <input
                          type="text"
                          name="designation"
                          value={newContactPersonData.designation}
                          onChange={handleContactPersonChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          name="department"
                          value={newContactPersonData.department}
                          onChange={handleContactPersonChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                          placeholder="Enter department"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Profile Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => contactPersonImageRef.current?.click()}
                    >
                      <input
                        ref={contactPersonImageRef}
                        type="file"
                        accept="image/*"
                        onChange={handleContactPersonImageUpload}
                        className="hidden"
                      />
                      {contactPersonImage ? (
                        <div className="space-y-2">
                          <img src={contactPersonImage as string} alt="Profile" className="w-32 h-32 mx-auto rounded-full object-cover" />
                          <p className="text-sm text-gray-600">Click to change image</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload size={32} className="mx-auto text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">Drag & Drop Profile Image</p>
                          <p className="text-xs text-gray-500">Supported Files: jpg, jpeg, png, gif, bmp</p>
                          <p className="text-xs text-gray-500">Maximum File Size: 5MB</p>
                          <button
                            type="button"
                            className="mt-2 text-sm text-[#156372] hover:text-[#0D4A52]"
                          >
                            Upload File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={handleCancelContactPerson}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContactPerson}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          <ConfigurePaymentTermsModal
            isOpen={isConfigureTermsOpen}
            onClose={() => setIsConfigureTermsOpen(false)}
            initialTerms={paymentTerms}
            onSave={(terms) => {
              const sanitizedTerms = terms.filter((term) => term.label?.trim());
              const finalTerms = sanitizedTerms.length > 0 ? sanitizedTerms : defaultPaymentTerms;
              setPaymentTerms(finalTerms);

              const currentStillExists = finalTerms.some((term) => term.value === formData.receipt);
              if (!currentStillExists) {
                const fallbackTerm = finalTerms.find((term) => term.isDefault) || finalTerms[0];
                setFormData((prev) => ({
                  ...prev,
                  receipt: fallbackTerm?.value || "Due on Receipt"
                }));
              }
            }}
          />

          {/* Invoice Number Configuration Modal */}
          {
            isInvoiceNumberModalOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setIsInvoiceNumberModalOpen(false)}
              >
                <div
                  className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Configure Invoice Number Preferences</h2>
                    <button
                      onClick={() => setIsInvoiceNumberModalOpen(false)}
                      className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
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
                        <button className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium">
                          Configure â†’
                        </button>
                      </div>
                    </div>

                    {/* Invoice Numbering Preference Section */}
                    <div className="mb-6">
                      {invoiceNumberMode === "auto" ? (
                        <p className="text-sm text-gray-700 mb-4">
                          Your invoice numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700 mb-4">
                          You have selected manual invoice numbering. Do you want us to auto-generate it for you?
                        </p>
                      )}

                      {/* Radio Button Options */}
                      <div className="space-y-4">
                        {/* Auto-generate option */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative mt-0.5">
                            <input
                              type="radio"
                              name="invoiceNumberMode"
                              value="auto"
                              checked={invoiceNumberMode === "auto"}
                              onChange={(e) => setInvoiceNumberMode(e.target.value)}
                              className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                Continue auto-generating invoice numbers
                              </span>
                              <Info size={14} className="text-gray-400" />
                            </div>
                            {invoiceNumberMode === "auto" && (
                              <div className="mt-3 space-y-3 pl-6">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Prefix</label>
                                  <input
                                    type="text"
                                    value={invoicePrefix}
                                    onChange={(e) => {
                                      setInvoicePrefix(e.target.value);
                                      // Update invoice number in real-time
                                      setFormData(prev => ({
                                        ...prev,
                                        invoiceNumber: `${e.target.value}${invoiceNextNumber}`
                                      }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Next Number</label>
                                  <input
                                    type="text"
                                    value={invoiceNextNumber}
                                    onChange={(e) => {
                                      setInvoiceNextNumber(e.target.value);
                                      // Update invoice number in real-time
                                      setFormData(prev => ({
                                        ...prev,
                                        invoiceNumber: `${invoicePrefix}${e.target.value}`
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
                              name="invoiceNumberMode"
                              value="manual"
                              checked={invoiceNumberMode === "manual"}
                              onChange={(e) => setInvoiceNumberMode(e.target.value)}
                              className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372] cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              Enter invoice numbers manually
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => setIsInvoiceNumberModalOpen(false)}
                      className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer  transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Update invoice number based on mode
                        if (invoiceNumberMode === "auto") {
                          setFormData(prev => ({
                            ...prev,
                            invoiceNumber: `${invoicePrefix}${invoiceNextNumber}`
                          }));
                        }
                        // If switching to manual, keep current value but make it editable
                        setIsInvoiceNumberModalOpen(false);
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors"
                    >
                      Save
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
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setIsDocumentsModalOpen(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${selectedInbox === "files"
                              ? "bg-[#156372] text-white"
                              : "text-gray-700 hover:bg-gray-200"
                              }`}
                          >
                            <Folder size={16} />
                            Files
                          </button>
                          <button
                            onClick={() => setSelectedInbox("bank-statements")}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${selectedInbox === "bank-statements"
                              ? "bg-[#156372] text-white"
                              : "text-gray-700 hover:bg-gray-200"
                              }`}
                          >
                            <CreditCard size={16} />
                            Bank Statements
                          </button>
                          <button
                            onClick={() => setSelectedInbox("all-documents")}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${selectedInbox === "all-documents"
                              ? "bg-[#156372] text-white"
                              : "text-gray-700 hover:bg-gray-200"
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
                                className="text-[#156372] hover:underline"
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
                                  <a href="#" className="text-sm text-[#156372] hover:underline">
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
                      className="px-6 py-2.5 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#0D4A52]"
                    >
                      Attachments
                    </button>
                    <button
                      onClick={() => {
                        setIsDocumentsModalOpen(false);
                        setSelectedDocuments([]);
                        setDocumentSearch("");
                      }}
                      className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all  hover:border-gray-400"
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
                      className="text-red-500 hover:text-red-600 transition-colors"
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
                          { id: "taban", name: "Taban Books Drive", icon: Grid3x3 },
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
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected
                                ? "bg-blue-50 text-[#156372] border-l-4 border-[#156372]"
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
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                terms of use
                              </a>{" "}
                              and{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                privacy policy
                              </a>{" "}
                              and understand that the rights to use this product do not come from Taban Books. The use and transfer of information received from Google APIs to Taban Books will adhere to{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                Google API Services User Data Policy
                              </a>
                              , including the{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                Limited Use Requirements
                              </a>
                              .
                            </p>
                          </div>

                          {/* Authenticate Google Button */}
                          <button
                            className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
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
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                terms of use
                              </a>{" "}
                              and{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                privacy policy
                              </a>{" "}
                              and understand that the rights to use this product do not come from Taban Books.
                            </p>
                          </div>

                          {/* Authenticate Dropbox Button */}
                          <button
                            className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
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
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                terms of use
                              </a>{" "}
                              and{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                privacy policy
                              </a>{" "}
                              and understand that the rights to use this product do not come from Taban Books.
                            </p>
                          </div>

                          {/* Authenticate Box Button */}
                          <button
                            className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
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
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                terms of use
                              </a>{" "}
                              and{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                privacy policy
                              </a>{" "}
                              and understand that the rights to use this product do not come from Taban Books.
                            </p>
                          </div>

                          {/* Authenticate OneDrive Button */}
                          <button
                            className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
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
                                className="text-[#156372] underline hover:text-[#0D4A52]"
                                onClick={(e) => e.preventDefault()}
                              >
                                terms of use
                              </a>{" "}
                              and{" "}
                              <a
                                href="#"
                                className="text-[#156372] underline hover:text-[#0D4A52]"
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
                          {/* Illustration Area - Using a placeholder illustration */}
                          <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                            <div className="relative w-full h-full">
                              {/* Stylized illustration with people and documents */}
                              <div className="absolute inset-0 flex items-end justify-center">
                                {/* Person on document with laptop */}
                                <div className="relative">
                                  <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                                    <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
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
                              <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45"></div>
                              <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                              <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                            </div>
                          </div>

                          {/* Description Text */}
                          <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                            {selectedCloudProvider === "taban"
                              ? "Taban Books Drive is an online file sync, storage and content collaboration platform."
                              : "Select a cloud storage provider to get started."}
                          </p>

                          {/* Set up your team button */}
                          {selectedCloudProvider === "taban" && (
                            <button
                              className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                              onClick={() => {
                                window.open(
                                  "https://drive.tabanbooks.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=TabanBooks",
                                  "_blank"
                                );
                              }}
                            >
                              Set up your team
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => setIsCloudPickerOpen(false)}
                      className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium  transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Handle file attachment from cloud
                        setIsCloudPickerOpen(false);
                      }}
                      className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] transition-colors"
                    >
                      Attach
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
                              className={`p-4 cursor-pointer  border-b border-gray-200 flex items-center justify-between ${isSelected ? "bg-blue-50" : ""
                                }`}
                              onClick={() => handleBulkItemToggle(item)}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  SKU: {item.sku} Rate: {formData.currency}{Number(item.rate || 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">
                                  Stock on Hand {Number(item.stockOnHand || 0).toFixed(2)} {item.unit}
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
                                    SKU: {selectedItem.sku} â€¢ {formData.currency}{Number(selectedItem.rate || 0).toFixed(2)}
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
                      className="px-6 py-2 text-white rounded-md text-sm font-medium transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.opacity = "1";
                        }
                      }}
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

          {/* New Tax Modal */}
          {
            isNewTaxModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancelNewTax}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">New Tax</h2>
                    <button
                      className="p-2  rounded-md text-gray-600 "
                      onClick={handleCancelNewTax}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Tax Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Name<span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                        placeholder="Enter tax name"
                        value={newTaxData.name}
                        onChange={(e) => setNewTaxData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    {/* Rate (%) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate (%)<span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                          placeholder="0"
                          value={newTaxData.rate}
                          onChange={(e) => setNewTaxData(prev => ({ ...prev, rate: e.target.value }))}
                          step="0.01"
                          min="0"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>

                    {/* Compound Tax Checkbox */}
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="compoundTax"
                          checked={newTaxData.isCompound}
                          onChange={(e) => setNewTaxData(prev => ({ ...prev, isCompound: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                        />
                        <label htmlFor="compoundTax" className="text-sm text-gray-700 cursor-pointer flex items-center gap-1">
                          This tax is a compound tax.
                          <Info size={14} className="text-gray-400" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                    <button
                      className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52]"
                      onClick={handleSaveNewTax}
                    >
                      Save
                    </button>
                    <button
                      className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium "
                      onClick={handleCancelNewTax}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          {/* New Item Modal */}
          {isNewItemModalOpen && createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] overflow-y-auto py-8" onClick={handleCancelNewItem}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">New Item</h2>
                  <button
                    className="p-2  rounded-md text-gray-600 "
                    onClick={handleCancelNewItem}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Top Section - Type, Name, SKU, Unit, and Image */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="md:col-span-2 space-y-4">
                      {/* Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          Type
                          <Info size={14} className="text-gray-400" />
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="type"
                              value="Goods"
                              checked={newItemData.type === "Goods"}
                              onChange={handleNewItemChange}
                              className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                            />
                            <span className="text-sm text-gray-700">Goods</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="type"
                              value="Service"
                              checked={newItemData.type === "Service"}
                              onChange={handleNewItemChange}
                              className="w-4 h-4 text-[#156372] border-gray-300 focus:ring-[#156372]"
                            />
                            <span className="text-sm text-gray-700">Service</span>
                          </label>
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                          value={newItemData.name}
                          onChange={handleNewItemChange}
                        />
                      </div>

                      {/* SKU */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          SKU
                          <Info size={14} className="text-gray-400" />
                        </label>
                        <input
                          type="text"
                          name="sku"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent"
                          value={newItemData.sku}
                          onChange={handleNewItemChange}
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          Unit
                          <Info size={14} className="text-gray-400" />
                        </label>
                        <div className="relative">
                          <select
                            name="unit"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10"
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
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#156372] transition-colors"
                        onClick={() => newItemImageRef.current?.click()}
                      >
                        {newItemImage ? (
                          <img src={newItemImage as string} alt="Item" className="w-full h-48 object-cover rounded" />
                        ) : (
                          <>
                            <ImageIcon size={48} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">Drag image(s) here or</p>
                            <button type="button" className="text-[#156372] hover:text-[#0D4A52] text-sm font-medium">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    {/* Sales Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900">Sales Information</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="sellable"
                            checked={newItemData.sellable}
                            onChange={handleNewItemChange}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                          />
                          <span className="text-sm text-gray-700">Sellable</span>
                        </label>
                      </div>

                      {/* Selling Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selling Price<span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                          <span className="px-3 py-2 bg-gray-50 text-sm text-gray-700 border-r border-gray-300">{formData.currency}</span>
                          <input
                            type="number"
                            name="sellingPrice"
                            className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                            value={newItemData.sellingPrice}
                            onChange={handleNewItemChange}
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Sales Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account<span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <select
                            name="salesAccount"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                            value={newItemData.salesAccount}
                            onChange={handleNewItemChange}
                          >
                            <option value="Sales">Sales</option>
                            <option value="Service Income">Service Income</option>
                            <option value="Other Income">Other Income</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Sales Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          name="salesDescription"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent resize-none"
                          value={newItemData.salesDescription}
                          onChange={handleNewItemChange}
                          rows={3}
                          placeholder="Enter description"
                        />
                      </div>

                      {/* Sales Tax */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          Tax
                          <Info size={14} className="text-gray-400" />
                        </label>
                        <div className="relative">
                          <select
                            name="salesTax"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                            value={newItemData.salesTax}
                            onChange={handleNewItemChange}
                          >
                            <option value="">Select a Tax</option>
                            {taxOptions.map(tax => (
                              <option key={tax.id} value={tax.id}>{tax.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Purchase Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900">Purchase Information</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="purchasable"
                            checked={newItemData.purchasable}
                            onChange={handleNewItemChange}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                          />
                          <span className="text-sm text-gray-700">Purchasable</span>
                        </label>
                      </div>

                      {/* Cost Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cost Price<span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                          <span className="px-3 py-2 bg-gray-50 text-sm text-gray-700 border-r border-gray-300">{formData.currency}</span>
                          <input
                            type="number"
                            name="costPrice"
                            className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                            value={newItemData.costPrice}
                            onChange={handleNewItemChange}
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Purchase Account */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account<span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <select
                            name="purchaseAccount"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                            value={newItemData.purchaseAccount}
                            onChange={handleNewItemChange}
                          >
                            <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                            <option value="Purchases">Purchases</option>
                            <option value="Expenses">Expenses</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Purchase Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          name="purchaseDescription"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent resize-none"
                          value={newItemData.purchaseDescription}
                          onChange={handleNewItemChange}
                          rows={3}
                          placeholder="Enter description"
                        />
                      </div>

                      {/* Purchase Tax */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          Tax
                          <Info size={14} className="text-gray-400" />
                        </label>
                        <div className="relative">
                          <select
                            name="purchaseTax"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                            value={newItemData.purchaseTax}
                            onChange={handleNewItemChange}
                          >
                            <option value="">Select a Tax</option>
                            {taxOptions.map(tax => (
                              <option key={tax.id} value={tax.id}>{tax.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Preferred Vendor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Vendor</label>
                        <div className="relative">
                          <select
                            name="preferredVendor"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-transparent appearance-none pr-10 bg-white"
                            value={newItemData.preferredVendor}
                            onChange={handleNewItemChange}
                          >
                            <option value=""></option>
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Track Inventory Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        name="trackInventory"
                        checked={newItemData.trackInventory}
                        onChange={handleNewItemChange}
                        className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372]"
                      />
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Track Inventory for this item
                        <Info size={14} className="text-gray-400" />
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mb-4 ml-6">
                      You cannot enable/disable inventory tracking once you've created transactions for this item
                    </p>

                    {newItemData.trackInventory && (
                      <div className="ml-6 p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-2">
                        <Info size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-orange-800">Note: You can configure the opening stock and stock tracking for this item under the Items module</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    className="px-6 py-2 text-sm font-medium text-white rounded-md transition-colors"
                    style={{
                      background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    onClick={handleSaveNewItem}
                  >
                    Save
                  </button>
                  <button
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md  transition-colors"
                    onClick={handleCancelNewItem}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Preferences Sidebar */}
          {isPreferencesOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
              <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActivePreferencesTab("preferences")}
                      className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "preferences"
                        ? "text-[#156372] border-b-2 border-[#156372]"
                        : "text-gray-600 "
                        }`}
                    >
                      Preferences
                    </button>
                    <button
                      onClick={() => setActivePreferencesTab("field-customization")}
                      className={`px-4 py-2 text-sm font-medium ${activePreferencesTab === "field-customization"
                        ? "text-[#156372] border-b-2 border-[#156372]"
                        : "text-gray-600 "
                        }`}
                    >
                      Field Customization
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-[#156372] hover:text-[#0D4A52]">All Preferences</button>
                    <button
                      onClick={() => setIsPreferencesOpen(false)}
                      className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Preferences Tab Content */}
                {activePreferencesTab === "preferences" && (
                  <div className="p-6">
                    {/* Invoice Editing Options */}
                    <div className="mb-6">
                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.allowEditingSentInvoice}
                            onChange={(e) => setPreferences(prev => ({ ...prev, allowEditingSentInvoice: e.target.checked }))}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Allow editing of Sent Invoice?</span>
                        </label>
                      </div>
                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.associateExpenseReceipts}
                            onChange={(e) => setPreferences(prev => ({ ...prev, associateExpenseReceipts: e.target.checked }))}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Associate and display expense receipts in Invoice PDF</span>
                        </label>
                      </div>
                    </div>

                    {/* Payments Section */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Payments</h3>
                      <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.notifyOnOnlinePayment}
                            onChange={(e) => setPreferences(prev => ({ ...prev, notifyOnOnlinePayment: e.target.checked }))}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Get notified when customers pay online</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.includePaymentReceipt}
                            onChange={(e) => setPreferences(prev => ({ ...prev, includePaymentReceipt: e.target.checked }))}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Do you want to include the payment receipt along with the Thank You note?</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.automateThankYouNote}
                            onChange={(e) => setPreferences(prev => ({ ...prev, automateThankYouNote: e.target.checked }))}
                            className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Automate thank you note to customer on receipt of online payment</span>
                        </label>
                      </div>
                    </div>

                    {/* Invoice QR Code Section */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Invoice QR Code</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{preferences.invoiceQRCodeEnabled ? "Enabled" : "Disabled"}</span>
                          <button
                            onClick={() => setPreferences(prev => ({ ...prev, invoiceQRCodeEnabled: !prev.invoiceQRCodeEnabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.invoiceQRCodeEnabled ? "bg-[#156372]" : "bg-gray-300"
                              }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.invoiceQRCodeEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Enable and configure the QR code you want to display on the PDF copy of an Invoice. Your customers can scan the QR code using their device to access the URL or other information that you configure.
                      </p>
                    </div>

                    {/* Zero-Value Line Items Section */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Zero-Value Line Items</h3>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.hideZeroValueLineItems}
                          onChange={(e) => setPreferences(prev => ({ ...prev, hideZeroValueLineItems: e.target.checked }))}
                          className="w-4 h-4 text-[#156372] border-gray-300 rounded focus:ring-[#156372] cursor-pointer mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">Hide zero-value line items</span>
                          <p className="text-sm text-gray-600 mt-1">
                            Choose whether you want to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice. This setting will not apply to invoices whose total is zero.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Terms & Conditions Section */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                      <textarea
                        value={preferences.termsAndConditions}
                        onChange={(e) => setPreferences(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                        className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[200px]"
                        placeholder="Enter terms and conditions..."
                      />
                    </div>

                    {/* Customer Notes Section */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
                      <textarea
                        value={preferences.customerNotes}
                        onChange={(e) => setPreferences(prev => ({ ...prev, customerNotes: e.target.value }))}
                        className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#156372] resize-y min-h-[200px]"
                        placeholder="Enter customer notes..."
                      />
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-start pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // TODO: Save preferences to localStorage or backend
                          alert("Preferences saved successfully!");
                          setIsPreferencesOpen(false);
                        }}
                        className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Field Customization Tab Content */}
                {activePreferencesTab === "field-customization" && (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
                      <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-red-700">
                        <Plus size={16} />
                        New
                      </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customFields.map((field) => (
                            <tr key={field.id} className="border-b border-gray-200 ">
                              <td className="px-4 py-3 text-gray-900">
                                <div className="flex items-center gap-2">
                                  {field.isLocked && <Lock size={14} className="text-gray-400" />}
                                  <span>{field.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-700">{field.dataType}</td>
                              <td className="px-4 py-3 text-gray-700">{field.mandatory ? "Yes" : "No"}</td>
                              <td className="px-4 py-3 text-gray-700">{field.showInPDF ? "Yes" : "No"}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                  {field.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bulk Update Account Modal */}
          {
            isBulkUpdateAccountModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsBulkUpdateAccountModalOpen(false)}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Bulk Update Line Items</h2>
                    <button
                      onClick={() => setIsBulkUpdateAccountModalOpen(false)}
                      className="p-2  rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <p className="text-sm text-gray-700 mb-4">Select an account for the selected line items.</p>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Choose Account</label>
                      <div className="relative" ref={bulkAccountDropdownRef}>
                        <input
                          type="text"
                          value={selectedBulkAccount}
                          readOnly
                          onClick={() => setIsBulkAccountDropdownOpen(!isBulkAccountDropdownOpen)}
                          placeholder="Select an account"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#156372] focus:border-[#156372] transition-all pr-10 cursor-pointer"
                        />
                        <ChevronDown size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        {isBulkAccountDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
                              <Search size={16} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search"
                                value={bulkAccountSearch}
                                onChange={(e) => setBulkAccountSearch(e.target.value)}
                                className="flex-1 text-sm bg-transparent focus:outline-none"
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {[
                                "Sales",
                                "Service Income",
                                "Other Income",
                                "Cost of Goods Sold",
                                "Purchases",
                                "Expenses",
                                "Accounts Receivable",
                                "Accounts Payable"
                              ]
                                .filter(account => account.toLowerCase().includes(bulkAccountSearch.toLowerCase()))
                                .map(account => (
                                  <div
                                    key={account}
                                    onClick={() => {
                                      setSelectedBulkAccount(account);
                                      setIsBulkAccountDropdownOpen(false);
                                      setBulkAccountSearch("");
                                    }}
                                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${selectedBulkAccount === account ? "bg-blue-50" : "hover:bg-blue-50"
                                      }`}
                                  >
                                    <span className="text-sm text-gray-900">{account}</span>
                                    {selectedBulkAccount === account && (
                                      <Check size={16} className="text-[#156372]" />
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setIsBulkUpdateAccountModalOpen(false);
                        setSelectedBulkAccount("");
                        setBulkAccountSearch("");
                      }}
                      className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium  transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (selectedBulkAccount && bulkSelectedItemIds.length > 0) {
                          // Update account for selected items
                          setFormData(prev => ({
                            ...prev,
                            items: prev.items.map(item =>
                              bulkSelectedItemIds.includes(item.id)
                                ? { ...item, account: selectedBulkAccount }
                                : item
                            )
                          }));
                          setIsBulkUpdateAccountModalOpen(false);
                          setSelectedBulkAccount("");
                          setBulkAccountSearch("");
                        }
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            )
          }

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
                    className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center hover:bg-[#0D4A52]"
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
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
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
                            <td className="px-4 py-3 text-sm text-[#156372] hover:underline">
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
          )}

          {/* Quick New Customer Modal */}
          {typeof document !== "undefined" && document.body && createPortal(
            <div
              className={`fixed inset-0 z-[10000] flex items-center justify-center transition-opacity duration-150 ${isNewCustomerQuickActionOpen ? "bg-black bg-opacity-50 opacity-100" : "bg-transparent opacity-0 pointer-events-none"}`}
              onClick={() => {
                setIsNewCustomerQuickActionOpen(false);
                reloadCustomersForInvoice();
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
                        await reloadCustomersForInvoice();
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
                      reloadCustomersForInvoice();
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
        </div>

        {/* Floating Footer */}
        <div className="fixed bottom-0 left-[260px] right-0 bg-white border-t border-gray-200 px-8 py-3 flex items-center justify-between z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave('draft')}
              disabled={saveLoading !== null}
              className={`h-9 px-5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {saveLoading === "draft" ? <Loader2 size={16} className="animate-spin" /> : null}
              {saveLoading === "draft" ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={() => handleSaveAndSend('sent')}
              disabled={saveLoading !== null}
              className={`h-9 px-5 bg-[#156372] text-white rounded text-sm font-semibold hover:bg-[#0D4A52] transition-colors flex items-center gap-2 ${saveLoading !== null ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {saveLoading === "send" ? <Loader2 size={16} className="animate-spin" /> : null}
              {saveLoading === "send" ? "Saving..." : "Save and Send"}
            </button>
            <button
              onClick={handleCancel}
              className="h-9 px-5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm text-[#156372] hover:text-[#0D4A52] font-medium">
              <RefreshCw size={15} />
              Make Recurring
            </button>
            <div className="pl-6 border-l border-gray-200 text-xs text-gray-500 font-semibold">
              Total Amount: <span className="text-sm font-bold text-gray-900 ml-1">KES {Number(formData.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


