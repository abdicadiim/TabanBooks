import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  Bell,
  FileText,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
  Upload,
  Trash2,
  Mail,
  Phone,
  Upload as UploadIcon,
  Copy,
  File,
  Globe,
  Check,
  GripVertical,
  MoreVertical,
  Settings,
  Image as ImageIcon,
  Tag,
  Folder,
  Building2,
  Layers,
  Paperclip,
  Repeat2,
} from "lucide-react";
import { billsAPI, vendorsAPI, customersAPI, itemsAPI, documentsAPI, accountantAPI, paymentTermsAPI, taxesAPI, transactionNumberSeriesAPI, reportingTagsAPI, locationsAPI } from "../../../services/api";
import NewVendorModal from "./NewVendorModal";
import DatePicker from "../../../components/DatePicker";
import { PaymentTermsDropdown } from "../../../components/PaymentTermsDropdown";
import toast from "react-hot-toast";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { WORLD_COUNTRIES, getStatesByCountry } from "../../../constants/locationData";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";
import {
  isReportingTagActive,
  normalizeReportingTagAppliesTo,
  normalizeReportingTagOptions,
} from "../../sales/Customers/customerReportingTags";

// EXPENSE_ACCOUNTS_STRUCTURE removed as it's now fetched from API

// Interfaces
interface Vendor {
  _id?: string;
  id?: string;
  displayName: string;
  name?: string;
  vendorName?: string;
  email?: string;
  companyName?: string;
  workPhone?: string;
  mobile?: string;
  vendor_id?: string;
  vendorId?: string;
  formData?: Record<string, any>;
}

interface Customer {
  _id?: string;
  id?: string;
  displayName: string;
  name?: string;
}

interface Item {
  id: number;
  _id?: string;
  itemDetails: string;
  description?: string;
  account: string;
  quantity: string;
  rate: string;
  discount: string;
  tax: string;
  customerDetails: string;
  amount: string;
  name?: string;
  sku?: string;
  purchaseAccount?: string;
  inventoryAccount?: string;
  trackInventory?: boolean;
  costPrice?: string | number;
  purchaseTax?: string;
  purchaseTaxInfo?: { taxName?: string };
  stockQuantity?: number;
  unit?: string;
  reportingTags?: Array<{ tagId: string; name?: string; value?: string }>;
  reportingTag?: string;
}

interface BillLineItem {
  id: number;
  itemDetails: string;
  account: string;
  quantity: string;
  rate: string;
  discount: string;
  tax: string;
  customerDetails: string;
  amount: string;
  item?: string | number;
  trackInventory?: boolean;
  stockQuantity?: number;
  unit?: string;
  reportingTags?: Array<{ tagId: string; name?: string; value?: string }>;
  reportingTag?: string;
}

interface BillFormData {
  vendorName: string;
  vendorId: string;
  vendor_id: string;
  vendorAddress: string;
  vendorCity: string;
  vendorCountry: string;
  vendorEmail: string;
  bill: string;
  orderNumber: string;
  billDate: string;
  dueDate: string;
  paymentTerms: string;
  accountsPayable: string;
  locationCode: string;
  locationName: string;
  warehouseLocationName: string;
  items: BillLineItem[];
  transactionLevel: string;
  subTotal: string;
  discount: { value: number; type: "%" };
  discountAmount: string;
  taxAmount: string;
  adjustment: string;
  total: string;
  notes: string;
  makeRecurring: boolean;
  currency: string;
}

interface PaymentTerm {
  id?: string;
  _id?: string;
  name: string;
  days: number | null;
  isDefault: boolean;
  isNew?: boolean;
}

interface Attachment {
  id: number | string;
  name: string;
  size: number;
  type: string;
  file?: File | null;
  preview?: string | null;
  base64?: string | ArrayBuffer | null;
  fromDocuments?: boolean;
  documentId?: string;
}

interface LocationOption {
  _id?: string;
  id?: string;
  name?: string;
  locationCode?: string;
  type?: "Business" | "Warehouse" | "General" | string;
  isDefault?: boolean;
  isActive?: boolean;
}

export default function NewBill() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  const clonedData = location.state?.clonedData || null;
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const [formData, setFormData] = useState<BillFormData>({
    vendorName: "",
    vendorId: "",
    vendor_id: "",
    vendorAddress: "",
    vendorCity: "",
    vendorCountry: "",
    vendorEmail: "",
    bill: "",
    orderNumber: "",
    billDate: "",
    dueDate: new Date().toISOString().split('T')[0],
    paymentTerms: "Due on Receipt",
    accountsPayable: "Accounts Payable",
    locationCode: "",
    locationName: "",
    warehouseLocationName: "",
    items: [
      {
        id: 1,
        itemDetails: "",
        account: "",
        quantity: "1.00",
        rate: "0.00",
        discount: "0 %-",
        tax: "",
        customerDetails: "",
        amount: "0.00",
      },
    ],
    transactionLevel: "At Transaction Level",
    subTotal: "0.00",
    discount: { value: 0, type: "%" },
    discountAmount: "0.00",
    taxAmount: "0.00",
    adjustment: "0.00",
    total: "0.00",
    notes: "",
    makeRecurring: false,
    currency: resolvedBaseCurrency,
  });
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const vendorRef = useRef<HTMLDivElement>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState("Files");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [documentsSearch, setDocumentsSearch] = useState("");
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [saveLoadingState, setSaveLoadingState] = useState<null | "draft" | "open">(null);
  const [structuredAccounts, setStructuredAccounts] = useState<Record<string, string[]>>({});
  const [billLocationOpen, setBillLocationOpen] = useState(false);
  const billLocationRef = useRef<HTMLDivElement>(null);
  const [billLocation, setBillLocation] = useState("");
  const [warehouseLocationOpen, setWarehouseLocationOpen] = useState(false);
  const warehouseLocationRef = useRef<HTMLDivElement>(null);
  const [taxModeDropdownOpen, setTaxModeDropdownOpen] = useState(false);
  const taxModeDropdownRef = useRef<HTMLDivElement>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<"vendorName" | "bill" | "billDate", string>>>({});

  const fieldFocusClass =
    "transition-all duration-200 ease-out focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:shadow-[0_0_0_1px_rgba(59,130,246,0.18)]";
  const fieldErrorClass =
    "border-red-400 text-red-700 focus:border-red-500 focus:ring-red-100 focus:shadow-[0_0_0_1px_rgba(239,68,68,0.18)]";
  const itemTableHeaderClass =
    "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-600";
  const itemTableInputClass =
    `h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none ${fieldFocusClass}`;
  const itemTableSelectClass =
    `h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none flex items-center justify-between gap-2 overflow-hidden ${fieldFocusClass}`;

  const [locations, setLocations] = useState<LocationOption[]>([]);

  // Account dropdown states for each item row
  const [accountDropdowns, setAccountDropdowns] = useState<Record<string, boolean>>({});
  const [accountSearches, setAccountSearches] = useState<Record<string, string>>({});
  const accountRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Customer dropdown states for each item row
  const [customerDropdowns, setCustomerDropdowns] = useState<Record<string, boolean>>({});
  const [customerSearches, setCustomerSearches] = useState<Record<string, string>>({});
  const customerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Payment Terms dropdown state
  // Payment Terms dropdown state
  const [showConfigurePaymentTermsModal, setShowConfigurePaymentTermsModal] = useState(false);
  const [paymentTermsList, setPaymentTermsList] = useState<PaymentTerm[]>([
    { name: "Due on Receipt", days: 0, isDefault: true },
    { name: "Net 15", days: 15, isDefault: false },
    { name: "Net 30", days: 30, isDefault: false },
    { name: "Net 45", days: 45, isDefault: false },
    { name: "Net 60", days: 60, isDefault: false },
    { name: "Due end of the month", days: null, isDefault: false },
    { name: "Due end of next month", days: null, isDefault: false },
    { name: "Custom", days: null, isDefault: false },
  ]);

  const interactionRef = useRef<HTMLDivElement>(null);
  const [accountsPayableOpen, setAccountsPayableOpen] = useState(false);
  const [accountsPayableSearch, setAccountsPayableSearch] = useState("");
  const accountsPayableRef = useRef<HTMLDivElement>(null);

  // Transaction Level dropdown state
  const [transactionLevelOpen, setTransactionLevelOpen] = useState(false);
  const [transactionLevelSearch, setTransactionLevelSearch] = useState("");
  const transactionLevelRef = useRef<HTMLDivElement>(null);

  // Bulk Actions state
  const [bulkActionsChecked, setBulkActionsChecked] = useState(false);
  const [bulkActionsDropdownOpen, setBulkActionsDropdownOpen] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState("Bulk Actions");
  const [showAdditionalFields, setShowAdditionalFields] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [taxMode, setTaxMode] = useState("Tax Exclusive");
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  // Add New Row dropdown state
  const [addNewRowDropdownOpen, setAddNewRowDropdownOpen] = useState(false);
  const [selectedAddRowAction, setSelectedAddRowAction] = useState("Add New Row");
  const addNewRowRef = useRef<HTMLDivElement>(null);

  // Reporting Tags dropdown state
  const [reportingTagsDropdownOpen, setReportingTagsDropdownOpen] = useState(false);
  const [selectedReportingTagAction, setSelectedReportingTagAction] = useState<string | null>(null);
  const reportingTagsRef = useRef<HTMLDivElement>(null);
  const reportingTagsMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [availableReportingTags, setAvailableReportingTags] = useState<any[]>([]);
  const [isReportingTagsLoading, setIsReportingTagsLoading] = useState(false);
  const [reportingTagOptionOpenKey, setReportingTagOptionOpenKey] = useState<string | null>(null);

  // Reporting Tags for each item row
  const [itemReportingTagsOpen, setItemReportingTagsOpen] = useState<Record<string, boolean>>({});
  const itemReportingTagsRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [itemReportingTagDrafts, setItemReportingTagDrafts] = useState<Record<string, Record<string, string>>>({});

  // Item inventory states
  const [items, setItems] = useState<any[]>([]);
  const [itemDropdownOpen, setItemDropdownOpen] = useState<Record<string, boolean>>({});
  const [itemSearch, setItemSearch] = useState<Record<string, string>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";

  const getVendorDisplayName = (vendorValue: any) => {
    if (!vendorValue) return "";
    if (typeof vendorValue === "string") return vendorValue.trim();
    if (typeof vendorValue !== "object") return String(vendorValue).trim();

    const candidates = [
      vendorValue.displayName,
      vendorValue.name,
      vendorValue.vendorName,
      vendorValue.vendor_name,
      vendorValue.companyName,
      vendorValue.company,
      vendorValue.formData?.displayName,
      vendorValue.formData?.name,
      vendorValue.formData?.vendorName,
      vendorValue.formData?.companyName,
    ];

    const match = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
    return match ? match.trim() : "";
  };

  const getVendorId = (vendorValue: any) => {
    if (!vendorValue || typeof vendorValue !== "object") return "";
    return String(vendorValue.id || vendorValue._id || vendorValue.vendorId || vendorValue.vendor_id || "").trim();
  };

  const getFirstNonEmptyString = (...values: any[]) => {
    const match = values.find((value) => typeof value === "string" && value.trim());
    return match ? String(match).trim() : "";
  };

  const normalizeDateForInput = (value: any, fallback = "") => {
    if (!value) return fallback;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().split("T")[0];
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (!trimmedValue) return fallback;

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
        return trimmedValue;
      }

      if (trimmedValue.includes("T")) {
        const isoDate = trimmedValue.split("T")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
          return isoDate;
        }
      }

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue)) {
        const [day, month, year] = trimmedValue.split("/");
        return `${year}-${month}-${day}`;
      }

      const parsedDate = new Date(trimmedValue);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0];
      }
    }

    return fallback;
  };

  const getVendorContactFields = (vendorValue: any) => {
    if (!vendorValue || typeof vendorValue !== "object") {
      return {
        vendorAddress: "",
        vendorCity: "",
        vendorCountry: "",
        vendorEmail: "",
      };
    }

    const billing = vendorValue.billingAddress || vendorValue.formData?.billingAddress || vendorValue.billing || {};
    const street1 = getFirstNonEmptyString(
      billing.street1,
      billing.billingStreet1,
      vendorValue.street1,
      vendorValue.billingStreet1,
      billing.address,
      billing.street,
    );
    const street2 = getFirstNonEmptyString(
      billing.street2,
      billing.billingStreet2,
      vendorValue.street2,
      vendorValue.billingStreet2,
    );
    const city = getFirstNonEmptyString(
      billing.city,
      billing.billingCity,
      vendorValue.city,
      vendorValue.billingCity,
    );
    const state = getFirstNonEmptyString(
      billing.state,
      billing.billingState,
      vendorValue.state,
      vendorValue.billingState,
    );
    const zip = getFirstNonEmptyString(
      billing.zipCode,
      billing.billingZipCode,
      billing.zip,
      vendorValue.zipCode,
      vendorValue.billingZipCode,
    );
    const country = getFirstNonEmptyString(
      billing.country,
      billing.billingCountry,
      vendorValue.country,
      vendorValue.billingCountry,
    );
    const email = getFirstNonEmptyString(billing.email, vendorValue.email, vendorValue.billingEmail);

    return {
      vendorAddress: [street1, street2].filter(Boolean).join(" "),
      vendorCity: [city, state, zip].filter(Boolean).join(", "),
      vendorCountry: country,
      vendorEmail: email,
    };
  };

  const getVendorBillingAddressLines = (vendorValue: any) => {
    if (!vendorValue || typeof vendorValue !== "object") {
      return [];
    }

    const billing = vendorValue.billingAddress || vendorValue.formData?.billingAddress || vendorValue.billing || {};
    const street1 = getFirstNonEmptyString(
      billing.street1,
      billing.billingStreet1,
      vendorValue.street1,
      vendorValue.billingStreet1,
      billing.address,
      billing.street,
    );
    const street2 = getFirstNonEmptyString(
      billing.street2,
      billing.billingStreet2,
      vendorValue.street2,
      vendorValue.billingStreet2,
    );
    const city = getFirstNonEmptyString(
      billing.city,
      billing.billingCity,
      vendorValue.city,
      vendorValue.billingCity,
    );
    const state = getFirstNonEmptyString(
      billing.state,
      billing.billingState,
      vendorValue.state,
      vendorValue.billingState,
    );
    const zip = getFirstNonEmptyString(
      billing.zipCode,
      billing.billingZipCode,
      billing.zip,
      vendorValue.zipCode,
      vendorValue.billingZipCode,
    );
    const country = getFirstNonEmptyString(
      billing.country,
      billing.billingCountry,
      vendorValue.country,
      vendorValue.billingCountry,
    );
    const phone = getFirstNonEmptyString(billing.phone, billing.billingPhone, vendorValue.phone, vendorValue.billingPhone);
    const fax = getFirstNonEmptyString(billing.fax, billing.billingFax, vendorValue.fax, vendorValue.billingFax);

    return [
      getFirstNonEmptyString(billing.attention, billing.billingAttention, vendorValue.attention, vendorValue.billingAttention),
      street1,
      street2,
      [city, state, zip].filter(Boolean).join(", "),
      country,
      phone ? `Phone: ${phone}` : "",
      fax ? `Fax: ${fax}` : "",
    ].filter(Boolean);
  };

  const getVendorFormFields = (vendorValue: any, fallbackName?: any, fallbackId?: any) => {
    const vendorName = getVendorDisplayName(fallbackName) || getVendorDisplayName(vendorValue);
    const vendorId =
      getVendorId(vendorValue) ||
      getVendorId(fallbackId) ||
      String(fallbackId || "").trim();

    return {
      vendorName,
      vendorId,
      vendor_id: vendorId,
      ...getVendorContactFields(vendorValue),
    };
  };

  const applyVendorSelection = (vendorValue: any, fallbackName?: any, fallbackId?: any) => {
    setFormData((prev) => ({
      ...prev,
      ...getVendorFormFields(vendorValue, fallbackName, fallbackId),
    }));
    setValidationErrors((prev) => {
      if (!prev.vendorName) return prev;
      const next = { ...prev };
      delete next.vendorName;
      return next;
    });
    setVendorOpen(false);
    setVendorSearch("");
  };

  const clearVendorSelection = () => {
    setFormData((prev) => ({
      ...prev,
      vendorName: "",
      vendorId: "",
      vendor_id: "",
      vendorAddress: "",
      vendorCity: "",
      vendorCountry: "",
      vendorEmail: "",
    }));
    setVendorSearch("");
    setVendorOpen(false);
  };

  const findVendorMatch = (vendorNameValue: any, vendorIdValue?: any) => {
    const normalizedVendorName = getVendorDisplayName(vendorNameValue);
    const normalizedVendorId = String(vendorIdValue || "").trim();

    return vendors.find((vendor) => {
      const candidateId = getVendorId(vendor);
      if (normalizedVendorId && candidateId === normalizedVendorId) {
        return true;
      }

      return getVendorDisplayName(vendor) === normalizedVendorName;
    });
  };

  const selectedVendorName = getVendorDisplayName(formData.vendorName);
  const selectedVendorId = String(formData.vendorId || formData.vendor_id || "").trim();
  const selectedVendorRecord = findVendorMatch(selectedVendorName, selectedVendorId);
  const selectedVendorBillingLines = selectedVendorRecord
    ? getVendorBillingAddressLines(selectedVendorRecord)
    : [
        formData.vendorAddress,
        formData.vendorCity,
        formData.vendorCountry,
        formData.vendorEmail ? `Email: ${formData.vendorEmail}` : "",
      ].filter(Boolean);

  const getInputClassName = (fieldName: "vendorName" | "bill" | "billDate", baseClass: string) => {
    return `${baseClass} ${validationErrors[fieldName] ? fieldErrorClass : ""}`;
  };

  // New Account Modal state
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    accountType: "Fixed Asset",
    accountName: "",
    isSubAccount: false,
    accountCode: "",
    description: "",
    showInZohoExpense: false,
  });
  const [accountTypeDropdownOpen, setAccountTypeDropdownOpen] = useState(false);
  const accountTypeDropdownRef = useRef<HTMLDivElement>(null);

  // New Item Modal state
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({
    type: "Goods",
    name: "",
    unit: "",
    sellable: true,
    sellingPrice: "",
    salesAccount: "Sales",
    salesDescription: "",
    salesTax: "",
    purchasable: true,
    costPrice: "",
    purchaseAccount: "Cost of Goods Sold",
    purchaseDescription: "",
    purchaseTax: "",
    preferredVendor: "",
    trackInventory: false,
    inventoryAccount: "Inventory Asset",
    openingStock: "0.00",
  });

  // Bulk Items Modal state
  const [showBulkItemsModal, setShowBulkItemsModal] = useState(false);
  const [bulkItemsInsertIndex, setBulkItemsInsertIndex] = useState(0);
  const [bulkItemsSearch, setBulkItemsSearch] = useState("");
  const [selectedBulkItems, setSelectedBulkItems] = useState<any[]>([]);
  const hasInitializedFromPO = useRef(false);
  const [bulkItemQuantities, setBulkItemQuantities] = useState<Record<string, number>>({});

  // Row menu states
  const [rowMenuOpen, setRowMenuOpen] = useState<Record<string, boolean>>({});
  const rowMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Account and Customer dropdown positions
  const [accountDropdownPosition, setAccountDropdownPosition] = useState<Record<string, { top: number; left: number; width: number }>>({});
  const [customerDropdownPosition, setCustomerDropdownPosition] = useState<Record<string, { top: number; left: number; width: number }>>({});

  useEffect(() => {
    const loadGeneralSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/settings/general`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.success && data?.data?.settings) {
          setEnabledSettings(data.data.settings);
        }
      } catch (error) {
        console.error("Error loading general settings:", error);
      }
    };
    loadGeneralSettings();
  }, []);

  useEffect(() => {
    if (showTransactionDiscount) return;
    setFormData((prev) => {
      const subTotal = parseFloat(String(prev.subTotal || 0));
      return {
        ...prev,
        discount: { ...prev.discount, value: 0 },
        discountAmount: "0.00",
        total: subTotal.toFixed(2),
      };
    });
  }, [showTransactionDiscount]);

  // Vendor search modal state
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);
  const [vendorSearchCriteria, setVendorSearchCriteria] = useState("Display Name");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState<Vendor[]>([]);
  const [vendorSearchPage, setVendorSearchPage] = useState(1);
  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);

  // Load vendors from API
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedVendors = filterActiveRecords((response.data || response.vendors || []) as Vendor[]) as Vendor[];
          setVendors(loadedVendors);
          setAllVendors(loadedVendors);
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
      }
    };
    loadVendors();
  }, []);

  // Load customers from API
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customersAPI.getAll({ limit: 1000 });
        if (response && (response.code === 0 || response.success)) {
          setCustomers(filterActiveRecords((response.data || []) as Customer[]) as Customer[]);
        }
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    loadCustomers();
  }, []);

  // Load items from API
  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await itemsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          setItems(filterActiveRecords((response.data || []) as any[]) as any[]);
        }
      } catch (error) {
        console.error("Error loading items:", error);
      }
    };
    loadItems();
  }, []);

  // Load taxes from API
  const [taxes, setTaxes] = useState<any[]>([]);
  useEffect(() => {
    const loadTaxes = async () => {
      try {
        const response = await taxesAPI.getForTransactions("purchase");
        if (response && (response.code === 0 || response.success)) {
          setTaxes(filterActiveRecords((response.data || []) as any[]) as any[]);
        }
      } catch (error) {
        console.error("Error loading taxes:", error);
      }
    };
    loadTaxes();
  }, []);

  // Load locations from API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedLocations = filterActiveRecords((response.data || []) as LocationOption[]) as LocationOption[];
          setLocations(loadedLocations);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
      }
    };
    loadLocations();
  }, []);

  useEffect(() => {
    const activeLocations = locations.filter((location) => location.isActive !== false);
    const billLocations = activeLocations.filter((location) => {
      const type = String(location.type || "").toLowerCase();
      return type === "business" || type === "general";
    });
    const warehouseLocations = activeLocations.filter((location) => {
      const type = String(location.type || "").toLowerCase();
      return type === "warehouse";
    });

    const nextBillLocation = billLocations.find((location) => location.isDefault)?.name || billLocations[0]?.name || activeLocations[0]?.name || "";
    const nextWarehouseLocation = warehouseLocations.find((location) => location.isDefault)?.name || warehouseLocations[0]?.name || activeLocations[0]?.name || "";

    if (!billLocation && nextBillLocation) {
      setBillLocation(nextBillLocation);
    }
    if (!warehouseLocation && nextWarehouseLocation) {
      setWarehouseLocation(nextWarehouseLocation);
    }
  }, [locations, billLocation, warehouseLocation]);

  const normalizeTaxRateToDecimal = (rawRate: number | string | null | undefined) => {
    const numericRate = Number(rawRate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) return 0;
    return numericRate <= 1 ? numericRate : numericRate / 100;
  };

  const resolveTaxOption = (taxNameOrIdOrObj: any) => {
    if (!taxNameOrIdOrObj) return null;
    if (typeof taxNameOrIdOrObj === "object") return taxNameOrIdOrObj;

    const value = String(taxNameOrIdOrObj).trim();
    if (!value) return null;

    return (
      taxes.find((t: any) => String(t?.name || "").trim() === value) ||
      taxes.find((t: any) => String(t?._id || t?.id || "").trim() === value) ||
      null
    );
  };

  const getTaxRateFromSelection = (taxNameOrIdOrObj: any) => {
    const taxObj = resolveTaxOption(taxNameOrIdOrObj);
    if (taxObj) {
      const rawRate = Number(taxObj.rate ?? taxObj.taxRate ?? taxObj.tax_percentage ?? 0);
      const normalized = normalizeTaxRateToDecimal(rawRate);
      if (normalized > 0) return normalized;
    }

    const selected = String(taxNameOrIdOrObj || "").trim();
    const match = selected.match(/(-?\d+(?:\.\d+)?)\s*%/);
    if (!match) return 0;

    const parsed = parseFloat(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return normalizeTaxRateToDecimal(parsed);
  };

  const getTaxDisplayLabel = (taxNameOrObj: any) => {
    if (!taxNameOrObj) return "";
    const tax = resolveTaxOption(taxNameOrObj);
    if (!tax) return typeof taxNameOrObj === "string" ? taxNameOrObj : "";
    const rawName = String(tax.name || "").trim();
    const baseName = rawName.replace(/\s*\[?\d+(\.\d+)?%\]?$/i, "").trim() || rawName;
    return `${baseName} [${Number(tax.rate || 0)}%]`;
  };

  const getLineAmount = (item: any) => {
    const parsedAmount = parseFloat(String(item?.amount ?? ""));
    if (Number.isFinite(parsedAmount)) return parsedAmount;

    const qty = parseFloat(String(item?.quantity ?? "0")) || 0;
    const rate = parseFloat(String(item?.rate ?? "0")) || 0;
    const discountMatch = String(item?.discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
    const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
    const subtotal = qty * rate;
    return subtotal - (subtotal * discountPercent) / 100;
  };

  const formatCurrencyValue = (value: number) => {
    const normalized = Math.abs(value) < 0.000001 ? 0 : value;
    return normalized.toFixed(2);
  };

  const calculateBillTotals = (items: any[], discountValue: number, adjustmentValue: any, mode: string) => {
    const normalizedItems = Array.isArray(items) ? items : [];
    const subTotalNumeric = normalizedItems.reduce((sum, item) => sum + getLineAmount(item), 0);
    const discountPercent = Math.min(100, Math.max(0, Number(discountValue) || 0));
    const discountAmountNumeric = (subTotalNumeric * discountPercent) / 100;
    const discountRatio = subTotalNumeric > 0 ? Math.min(1, Math.max(0, discountAmountNumeric / subTotalNumeric)) : 0;
    const isInclusive = String(mode || "Tax Exclusive").toLowerCase().includes("inclusive");

    const taxAmountNumeric = normalizedItems.reduce((sum, item) => {
      const lineAmount = getLineAmount(item);
      if (lineAmount <= 0) return sum;

      const discountedLineAmount = lineAmount * (1 - discountRatio);
      const taxRate = getTaxRateFromSelection(item?.tax);
      if (taxRate <= 0) return sum;

      const taxAmount = isInclusive
        ? discountedLineAmount - (discountedLineAmount / (1 + taxRate))
        : discountedLineAmount * taxRate;
      return sum + taxAmount;
    }, 0);

    const adjustmentNumeric = parseFloat(String(adjustmentValue ?? "0")) || 0;
    const totalBeforeTax = subTotalNumeric - discountAmountNumeric;
    const totalNumeric = isInclusive
      ? totalBeforeTax + adjustmentNumeric
      : totalBeforeTax + taxAmountNumeric + adjustmentNumeric;

    return {
      subTotal: formatCurrencyValue(subTotalNumeric),
      discountAmount: formatCurrencyValue(discountAmountNumeric),
      taxAmount: formatCurrencyValue(taxAmountNumeric),
      total: formatCurrencyValue(totalNumeric),
    };
  };

  // Tax dropdown states for each item row
  const [taxDropdowns, setTaxDropdowns] = useState<Record<string, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const taxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [taxDropdownPosition, setTaxDropdownPosition] = useState<Record<string, { top: number; left: number; width: number }>>({});

  useEffect(() => {
    setFormData((prev) => {
      const discountValue = showTransactionDiscount ? (parseFloat(String(prev.discount?.value ?? 0)) || 0) : 0;
      const calculated = calculateBillTotals(prev.items, discountValue, prev.adjustment, taxMode);
      const currentTaxAmount = String(prev.taxAmount ?? "0.00");

      if (
        prev.subTotal === calculated.subTotal &&
        prev.discountAmount === calculated.discountAmount &&
        currentTaxAmount === calculated.taxAmount &&
        prev.total === calculated.total
      ) {
        return prev;
      }

      return {
        ...prev,
        subTotal: calculated.subTotal,
        discountAmount: calculated.discountAmount,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
      };
    });
  }, [formData.items, formData.discount?.value, formData.adjustment, showTransactionDiscount, taxMode, taxes]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      currency: resolvedBaseCurrency,
    }));
  }, [resolvedBaseCurrency]);

  // Load accounts from API
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await accountantAPI.getAccounts();
        if (response && (response.code === 0 || response.success)) {
          const accountsList = filterActiveRecords((response.data || response.accounts || []) as any[]) as any[];
          if (accountsList.length > 0) {
            const structured: Record<string, string[]> = {};
            accountsList.forEach((acc: any) => {
              const type = acc.accountType || acc.type || 'Other Expense';
              const name = acc.accountName || acc.name;
              if (name) {
                if (!structured[type]) {
                  structured[type] = [];
                }
                structured[type].push(name);
              }
            });
            setStructuredAccounts(structured);
          }
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };
    loadAccounts();
  }, []);

  // Load documents from API
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documentsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          setAvailableDocuments(response.data || []);
        }
      } catch (error) {
        console.error("Error loading documents:", error);
      }
    };
    loadDocuments();
  }, []);

  const loadPaymentTerms = async () => {
    try {
      const response = await paymentTermsAPI.getAll();
      if (response && (response.code === 0 || response.success)) {
        const terms = response.data || [];
        if (terms.length > 0) {
          setPaymentTermsList(terms);
          const defaultTerm = terms.find((term: any) => term.isDefault) || terms[0];
          if (defaultTerm && !formData.paymentTerms) {
            setFormData(prev => ({ ...prev, paymentTerms: defaultTerm.name }));
          }
        }
      }
    } catch (error) {
      console.error("Error loading payment terms:", error);
    }
  };

  const getTotalQuantity = (items: any[]) => {
    return (Array.isArray(items) ? items : []).reduce((sum, item) => {
      const quantity = Number(item?.quantity ?? 0);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
  };

  useEffect(() => {
    loadPaymentTerms();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (billLocationRef.current && !billLocationRef.current.contains(target)) {
        setBillLocationOpen(false);
      }
      if (warehouseLocationRef.current && !warehouseLocationRef.current.contains(target)) {
        setWarehouseLocationOpen(false);
      }
      if (taxModeDropdownRef.current && !taxModeDropdownRef.current.contains(target)) {
        setTaxModeDropdownOpen(false);
      }
    };

    if (billLocationOpen || warehouseLocationOpen || taxModeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [billLocationOpen, warehouseLocationOpen, taxModeDropdownOpen]);

  // Load next bill number from transaction series
  useEffect(() => {
    const loadNextBillNumber = async () => {
      try {
        const response = await transactionNumberSeriesAPI.getAll();
        if (!response || (!response.success && response.code !== 0)) return;

        const series = Array.isArray(response.data) ? response.data : [];
        if (series.length === 0) return;

        const billSeries = series.find((s: any) => {
          const moduleName = String(s?.module || "").toLowerCase();
          return moduleName === "bill" || moduleName === "bills";
        });

        if (!billSeries?._id) return;

        const nextNumberResponse = await transactionNumberSeriesAPI.getNextNumber(billSeries._id);
        if (!nextNumberResponse || (!nextNumberResponse.success && nextNumberResponse.code !== 0)) {
          return;
        }

        const nextNumber = String(nextNumberResponse.data?.number || nextNumberResponse.number || "").trim();
        if (nextNumber) {
          setFormData(prev => ({ ...prev, bill: nextNumber }));
        }
      } catch (error) {
        console.error("Error loading next bill number:", error);
      }
    };
    loadNextBillNumber();
  }, []);

  // Listen for customer updates
  useEffect(() => {
    if (!location.state?.vendor && !location.state?.vendorName && !location.state?.vendorId && !location.state?.vendor_id) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ...getVendorFormFields(
        location.state?.vendor || location.state?.vendorName,
        location.state?.vendorName,
        location.state?.vendorId || location.state?.vendor_id
      ),
    }));
  }, [location.state]);

  useEffect(() => {
    const handleCustomersUpdated = async () => {
      try {
        const response = await customersAPI.getAll({ limit: 1000 });
        if (response && (response.code === 0 || response.success)) {
          setCustomers(filterActiveRecords((response.data || []) as Customer[]) as Customer[]);
        }
      } catch (error) {
        console.error("Error refreshing customers:", error);
      }
    };
    window.addEventListener("customersUpdated", handleCustomersUpdated);
    return () => window.removeEventListener("customersUpdated", handleCustomersUpdated);
  }, []);

  // Handle data passed from documents
  useEffect(() => {
    if (location.state?.fromDocument) {
      const docData = location.state;
      const today = new Date().toISOString().split("T")[0];

      const billDate = normalizeDateForInput(docData.billDate, today);
      const dueDate = normalizeDateForInput(docData.dueDate, today);

      setFormData((prev) => ({
        ...prev,
        ...getVendorFormFields(docData.vendor || docData.vendorName, docData.vendorName, docData.vendorId || docData.vendor_id),
        bill: docData.bill || "",
        orderNumber: docData.orderNumber || "",
        billDate: billDate,
        dueDate: dueDate,
        paymentTerms: docData.paymentTerms || "Due on Receipt",
        notes: docData.notes || "",
        items: docData.items && docData.items.length > 0
          ? docData.items.map((item: any, index: number) => ({
            id: item.id || index + 1,
            item: item.item || item.id || item._id,
            itemDetails: item.itemDetails || "",
            account: item.account || "",
            quantity: String(item.quantity || "1.00"),
            rate: String(item.rate || "0.00"),
            discount: item.discount || "0 %-",
            tax: item.tax || "",
            customerDetails: item.customerDetails || "",
            amount: String(item.amount || "0.00"),
          }))
          : prev.items,
        subTotal: docData.subTotal || "0.00",
        total: docData.total || "0.00",
        currency: resolvedBaseCurrency,
      }));
    }
  }, [location.state]);

  // Handle expense data passed from state
  useEffect(() => {
    if (location.state?.fromExpense && !location.state?.fromDocument) {
      const expenseData = location.state;
      const today = new Date().toISOString().split("T")[0];

      setFormData((prev) => ({
        ...prev,
        ...getVendorFormFields(expenseData.vendor || expenseData.vendorName, expenseData.vendorName, expenseData.vendorId || expenseData.vendor_id),
        billDate: expenseData.date || today,
        dueDate: expenseData.date || today,
        notes: expenseData.notes || expenseData.description || "",
        items: [
          {
            id: 1,
            itemDetails: expenseData.expenseAccount || "",
            account: expenseData.expenseAccount || "",
            quantity: "1.00",
            rate: expenseData.amount || "0.00",
            discount: "0 %-",
            tax: "",
            customerDetails: "",
            amount: expenseData.amount || "0.00",
          },
        ],
        subTotal: expenseData.amount || "0.00",
        total: expenseData.amount || "0.00",
      }));
    }
  }, [location.state]);

  // Handle recurring bill data passed from state
  useEffect(() => {
    if (location.state?.fromRecurringBill) {
      const recurringBillData = location.state;
      const today = new Date().toISOString().split("T")[0];

      // Calculate total from items if available
      let calculatedTotal = "0.00";
      let calculatedSubTotal = "0.00";

      if (recurringBillData.items && recurringBillData.items.length > 0) {
        calculatedSubTotal = recurringBillData.items.reduce((sum: number, item: any) => {
          const quantity = parseFloat(String(item.quantity)) || 0;
          const rate = parseFloat(String(item.rate)) || 0;
          return sum + (quantity * rate);
        }, 0).toFixed(2);
        calculatedTotal = calculatedSubTotal;
      } else {
        calculatedSubTotal = recurringBillData.amount || "0.00";
        calculatedTotal = recurringBillData.amount || "0.00";
      }

      setFormData((prev) => ({
        ...prev,
        ...getVendorFormFields(
          recurringBillData.vendor || recurringBillData.vendorName,
          recurringBillData.vendorName,
          recurringBillData.vendorId || recurringBillData.vendor_id
        ),
        billDate: recurringBillData.billDate || today,
        dueDate: recurringBillData.dueDate || today,
        paymentTerms: recurringBillData.paymentTerms || "Due on Receipt",
        accountsPayable: recurringBillData.accountsPayable || "Accounts Payable",
        notes: recurringBillData.notes || "",
        items: recurringBillData.items && recurringBillData.items.length > 0
          ? recurringBillData.items.map((item: any, index: number) => ({
            id: index + 1,
            itemDetails: item.itemDetails || "",
            account: item.account || "",
            quantity: String(item.quantity || "1.00"),
            rate: String(item.unitPrice ?? item.rate ?? "0.00"),
            discount: item.discount || "0 %-",
            tax: item.tax || "",
            customerDetails: item.customerDetails || "",
            amount: getLineAmount({
              quantity: String(item.quantity || "1.00"),
              rate: String(item.unitPrice ?? item.rate ?? "0.00"),
              discount: item.discount || "0 %-",
            }).toFixed(2),
          }))
          : [
            {
              id: 1,
              itemDetails: "",
              account: "",
              quantity: "1.00",
              rate: "0.00",
              discount: "0 %-",
              tax: "",
              customerDetails: "",
              amount: "0.00",
            },
          ],
        subTotal: calculatedSubTotal,
        total: calculatedTotal,
      }));
    }
  }, [location.state]);

  // Handle edit bill data passed from state
  useEffect(() => {
    if (location.state?.editBill && location.state?.isEdit) {
      const editBill = location.state.editBill;
      const today = new Date().toISOString().split("T")[0];
      const billDate = normalizeDateForInput(editBill.date || editBill.billDate, today);
      const dueDate = normalizeDateForInput(editBill.dueDate, billDate);

      // Calculate totals from items if available
      let calculatedTotal = "0.00";
      let calculatedSubTotal = "0.00";

      if (editBill.items && editBill.items.length > 0) {
        calculatedSubTotal = editBill.items.reduce((sum: number, item: any) => {
          const quantity = parseFloat(String(item.quantity)) || 0;
          const rate = parseFloat(String(item.rate)) || 0;
          return sum + (quantity * rate);
        }, 0).toFixed(2);
        calculatedTotal = calculatedSubTotal;
      } else {
        calculatedSubTotal = editBill.subTotal || editBill.amount || "0.00";
        calculatedTotal = editBill.total || editBill.amount || "0.00";
      }

      setFormData((prev) => ({
        ...prev,
        ...getVendorFormFields(editBill.vendor || editBill.vendorName, editBill.vendorName, editBill.vendorId || editBill.vendor_id),
        bill: editBill.billNumber || "",
        orderNumber: editBill.referenceNumber || editBill.orderNumber || "",
        billDate: billDate,
        dueDate: dueDate,
        paymentTerms: editBill.paymentTerms || "Due on Receipt",
        accountsPayable: editBill.accountsPayable || "Accounts Payable",
        locationCode: editBill.locationCode || prev.locationCode || "",
        subject: editBill.subject || "",
        notes: editBill.notes || "",
        items: editBill.items && editBill.items.length > 0
          ? editBill.items.map((item: any, index: number) => ({
            id: item.id || index + 1,
            item: item.item || item._id || item.id,
            itemDetails: item.itemDetails || item.description || "",
            account: item.account || "",
            quantity: String(item.quantity || "1.00"),
            rate: String(item.unitPrice ?? item.rate ?? "0.00"),
            discount: item.discount || "0 %-",
            tax: item.tax || "",
            customerDetails: item.customerDetails || "",
            amount: getLineAmount({
              quantity: String(item.quantity || "1.00"),
              rate: String(item.unitPrice ?? item.rate ?? "0.00"),
              discount: item.discount || "0 %-",
            }).toFixed(2),
          }))
          : [
            {
              id: 1,
              itemDetails: "",
              account: "",
              quantity: "1.00",
              rate: "0.00",
              discount: "0 %-",
              tax: "",
              customerDetails: "",
              amount: "0.00",
            },
          ],
        subTotal: calculatedSubTotal,
        adjustment: editBill.adjustment || "0.00",
        total: calculatedTotal,
        customerName: editBill.customerName || "",
        customerAddress: editBill.customerAddress || "",
        customerEmail: editBill.customerEmail || "",
        vendorAddress: editBill.vendorAddress || "",
        vendorCity: editBill.vendorCity || "",
        vendorCountry: editBill.vendorCountry || "",
      }));

      setBillLocation(editBill.locationName || editBill.location || editBill.locationCode || "");
      setWarehouseLocation(editBill.warehouseLocationName || editBill.warehouseLocation || "");

      // Load attached files if they exist
      if (editBill.attachedFiles && editBill.attachedFiles.length > 0) {
        setAttachedFiles(editBill.attachedFiles.map((file: any) => ({
          ...file,
          // Note: preview and file object won't be available when loading from localStorage
          // In a real app, you'd fetch these from a server
          preview: null,
          file: null,
        })));
      }
    }
  }, [location.state]);

  // Handle cloned bill data passed from detail page
  useEffect(() => {
    if (!clonedData || location.state?.isEdit) return;

    const today = new Date().toISOString().split("T")[0];
    const billDate = normalizeDateForInput(clonedData.date || clonedData.billDate, today);
    const dueDate = normalizeDateForInput(clonedData.dueDate, billDate);

    let calculatedSubTotal = "0.00";
    let calculatedTotal = "0.00";

    if (clonedData.items && clonedData.items.length > 0) {
      calculatedSubTotal = clonedData.items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(String(item.amount || "0")) || 0);
      }, 0).toFixed(2);
      calculatedTotal = calculatedSubTotal;
    } else {
      calculatedSubTotal = clonedData.subTotal || clonedData.amount || "0.00";
      calculatedTotal = clonedData.total || clonedData.amount || "0.00";
    }

    setFormData((prev) => ({
      ...prev,
      ...getVendorFormFields(clonedData.vendor || clonedData.vendorName, clonedData.vendorName, clonedData.vendorId || clonedData.vendor_id),
      bill: "",
      orderNumber: clonedData.referenceNumber || clonedData.orderNumber || "",
      billDate,
      dueDate,
      paymentTerms: clonedData.paymentTerms || "Due on Receipt",
      accountsPayable: clonedData.accountsPayable || "Accounts Payable",
      locationCode: clonedData.locationCode || prev.locationCode || "",
      subject: clonedData.subject || "",
      notes: clonedData.notes || "",
      items: clonedData.items && clonedData.items.length > 0
        ? clonedData.items.map((item: any, index: number) => ({
          id: Date.now() + index,
          itemDetails: item.itemDetails || item.name || "",
          account: item.account || "",
          quantity: String(item.quantity || "1.00"),
          rate: String(item.unitPrice ?? item.rate ?? "0.00"),
          discount: item.discount || "0 %-",
          tax: item.tax || "",
          customerDetails: item.customerDetails || "",
          amount: getLineAmount({
            quantity: String(item.quantity || "1.00"),
            rate: String(item.unitPrice ?? item.rate ?? "0.00"),
            discount: item.discount || "0 %-",
          }).toFixed(2),
        }))
        : prev.items,
      subTotal: calculatedSubTotal,
      total: calculatedTotal,
      adjustment: clonedData.adjustment || "0.00",
      currency: resolvedBaseCurrency,
      customerName: clonedData.customerName || "",
      customerAddress: clonedData.customerAddress || "",
      customerEmail: clonedData.customerEmail || "",
      vendorAddress: clonedData.vendorAddress || "",
      vendorCity: clonedData.vendorCity || "",
      vendorCountry: clonedData.vendorCountry || "",
      makeRecurring: false,
    }));

    setBillLocation(clonedData.locationName || clonedData.location || clonedData.locationCode || "");
    setWarehouseLocation(clonedData.warehouseLocationName || clonedData.warehouseLocation || "");

    setAttachedFiles([]);
  }, [clonedData, location.state]);

  // Handle purchase order data passed from state (Convert to Bill)
  useEffect(() => {
    if (location.state?.fromPurchaseOrder && location.state?.purchaseOrder && !hasInitializedFromPO.current) {
      const po = location.state.purchaseOrder;
      const today = new Date().toISOString().split("T")[0];

      setFormData((prev) => ({
        ...prev,
        ...getVendorFormFields(po.vendor || po.vendorName, po.vendorName, po.vendorId || po.vendor_id || po.vendor),
        bill: po.purchaseOrderNumber ? po.purchaseOrderNumber.replace("PO-", "BILL-") : "",
        orderNumber: po.purchaseOrderNumber || "",
        billDate: today,
        dueDate: today,
        notes: po.notes || "",
        locationCode: po.locationCode || prev.locationCode || "",
        items: po.items && po.items.length > 0
          ? po.items.map((item: any, index: number) => {
            const itemMaster = items.find(i => (i._id || i.id) === (item.item || item.id)) ||
              items.find(i => i.name === (item.name || item.itemDetails));
            const resolvedAccount = item.account || item.accountId || (itemMaster?.trackInventory ? itemMaster?.inventoryAccount : itemMaster?.purchaseAccount) || "Prepaid Expenses";

            return {
              id: index + 1,
              item: item.item || item._id || item.id,
              itemDetails: item.name || item.itemDetails || "",
              account: resolvedAccount,
              quantity: String(item.quantity || "1.00"),
              rate: String(item.unitPrice || item.rate || "0.00"),
              discount: "0 %-",
              tax: "",
              customerDetails: "",
              amount: String(item.total || item.amount || (parseFloat(String(item.quantity || "0")) * parseFloat(String(item.unitPrice || item.rate || "0"))).toFixed(2)),
            };
          })
          : prev.items,
        subTotal: String(po.subtotal || po.total || "0.00"),
        total: String(po.total || "0.00"),
        currency: resolvedBaseCurrency,
      }));

      setBillLocation(po.locationName || po.location || po.locationCode || "");
      setWarehouseLocation(po.warehouseLocationName || po.warehouseLocation || "");

      // If items are loaded, we consider it initialized.
      // If items are not loaded yet, this effect will run again when items load.
      if (items.length > 0) {
        hasInitializedFromPO.current = true;
      }
    }
  }, [location.state, items]);

  const handleVendorCreated = async (vendorName: string) => {
    setFormData((prev) => ({ ...prev, vendorName }));
    setShowNewVendorModal(false);
    // Refresh vendors list
    try {
      const response = await vendorsAPI.getAll();
      if (response && (response.code === 0 || response.success)) {
        const loadedVendors = filterActiveRecords((response.data || response.vendors || []) as Vendor[]) as Vendor[];
        setVendors(loadedVendors);
        setAllVendors(loadedVendors);
      }
    } catch (error) {
      console.error("Error refreshing vendors:", error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetElement = event.target instanceof Element ? event.target : null;

      if (vendorRef.current && !vendorRef.current.contains(targetElement)) {
        setVendorOpen(false);
        setVendorSearch("");
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(targetElement)) {
        setUploadMenuOpen(false);
      }

      // Close account dropdowns
      Object.keys(accountDropdowns).forEach(itemId => {
        const accountRef = accountRefs.current[itemId];
        if (accountDropdowns[itemId] && accountRef && !accountRef.contains(targetElement)) {
          setAccountDropdowns(prev => ({ ...prev, [itemId]: false }));
          setAccountSearches(prev => ({ ...prev, [itemId]: "" }));
          setAccountDropdownPosition((prev) => {
            const newPos = { ...prev };
            delete newPos[itemId];
            return newPos;
          });
        }

        // Close tax dropdowns
        const taxRef = taxRefs.current[itemId];
        if (taxDropdowns[itemId] && taxRef && !taxRef.contains(targetElement)) {
          setTaxDropdowns(prev => ({ ...prev, [itemId]: false }));
          setTaxSearches(prev => ({ ...prev, [itemId]: "" }));
          setTaxDropdownPosition((prev) => {
            const newPos = { ...prev };
            delete newPos[itemId];
            return newPos;
          });
        }
      });

      // Close customer dropdowns
      Object.keys(customerDropdowns).forEach(itemId => {
        const customerRef = customerRefs.current[itemId];
        if (customerDropdowns[itemId] && customerRef && !customerRef.contains(targetElement)) {
          setCustomerDropdowns(prev => ({ ...prev, [itemId]: false }));
          setCustomerSearches(prev => ({ ...prev, [itemId]: "" }));
          setCustomerDropdownPosition((prev) => {
            const newPos = { ...prev };
            delete newPos[itemId];
            return newPos;
          });
        }
      });

      // Close accounts payable dropdown
      if (accountsPayableRef.current && !accountsPayableRef.current.contains(targetElement)) {
        setAccountsPayableOpen(false);
        setAccountsPayableSearch("");
      }

      // Close account type dropdown
      if (accountTypeDropdownRef.current && !accountTypeDropdownRef.current.contains(targetElement)) {
        setAccountTypeDropdownOpen(false);
      }

      // Close transaction level dropdown
      if (transactionLevelRef.current && !transactionLevelRef.current.contains(targetElement)) {
        setTransactionLevelOpen(false);
        setTransactionLevelSearch("");
      }

      // Close bulk actions dropdown
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(targetElement)) {
        setBulkActionsDropdownOpen(false);
      }

      // Close add new row dropdown
      if (addNewRowRef.current && !addNewRowRef.current.contains(targetElement)) {
        setAddNewRowDropdownOpen(false);
      }

      // Close reporting tags dropdown
      if (reportingTagsRef.current && !reportingTagsRef.current.contains(targetElement)) {
        setReportingTagsDropdownOpen(false);
      }

      // Close vendor search criteria dropdown
      if (!targetElement?.closest(".vendor-search-criteria-dropdown")) {
        setVendorSearchCriteriaOpen(false);
      }

      // Close item reporting tags dropdowns
      Object.keys(itemReportingTagsOpen).forEach((itemId) => {
        const ref = itemReportingTagsRefs.current[itemId];
        const menuRef = reportingTagsMenuRefs.current[itemId];
        if (ref && !ref.contains(targetElement) && (!menuRef || !menuRef.contains(targetElement))) {
          setItemReportingTagsOpen((prev) => ({ ...prev, [itemId]: false }));
          setReportingTagOptionOpenKey(null);
        }
      });

      // Close item dropdowns
      Object.keys(itemDropdownOpen).forEach((itemId) => {
        if (itemRefs.current[itemId] && !itemRefs.current[itemId].contains(targetElement)) {
          setItemDropdownOpen((prev) => ({ ...prev, [itemId]: false }));
          setItemSearch((prev) => ({ ...prev, [itemId]: "" }));
        }
      });

      // Close row menus
      Object.keys(rowMenuOpen).forEach((itemId) => {
        if (rowMenuOpen[itemId] && rowMenuRefs.current[itemId] && !rowMenuRefs.current[itemId].contains(targetElement)) {
          setRowMenuOpen((prev) => ({ ...prev, [itemId]: false }));
        }
      });
    };

    const hasOpenDropdown = vendorOpen || uploadMenuOpen || accountsPayableOpen || transactionLevelOpen || bulkActionsDropdownOpen || addNewRowDropdownOpen || reportingTagsDropdownOpen ||
      Object.values(accountDropdowns).some(Boolean) ||
      Object.values(customerDropdowns).some(Boolean) ||
      Object.values(itemDropdownOpen).some(Boolean) ||
      Object.values(rowMenuOpen).some(Boolean) ||
      Object.values(itemReportingTagsOpen).some(Boolean);

    if (hasOpenDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [vendorOpen, uploadMenuOpen, accountsPayableOpen, transactionLevelOpen, bulkActionsDropdownOpen, addNewRowDropdownOpen, reportingTagsDropdownOpen, accountDropdowns, customerDropdowns, itemDropdownOpen, rowMenuOpen, itemReportingTagsOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const hasRowDropdownOpen =
        Object.values(accountDropdowns).some(Boolean) ||
        Object.values(customerDropdowns).some(Boolean) ||
        Object.values(taxDropdowns).some(Boolean) ||
        Object.values(itemDropdownOpen).some(Boolean) ||
        Object.values(itemReportingTagsOpen).some(Boolean);

      if (!hasRowDropdownOpen) return;

      setAccountDropdowns({});
      setAccountDropdownPosition({});
      setAccountSearches({});

      setCustomerDropdowns({});
      setCustomerDropdownPosition({});
      setCustomerSearches({});

      setTaxDropdowns({});
      setTaxDropdownPosition({});
      setTaxSearches({});

      setItemDropdownOpen({});
      setItemSearch({});

      setItemReportingTagsOpen({});
      setItemReportingTagDrafts({});
      setReportingTagOptionOpenKey(null);
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [
    accountDropdowns,
    customerDropdowns,
    taxDropdowns,
    itemDropdownOpen,
    itemReportingTagsOpen,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadReportingTags = async () => {
      setIsReportingTagsLoading(true);
      try {
        const response = await reportingTagsAPI.getAll({ limit: 10000 });
        const rows = Array.isArray(response) ? response : (response?.data || []);
        const activeRows = (Array.isArray(rows) ? rows : [])
          .filter(isReportingTagActive)
          .map((tag: any) => ({
            ...tag,
            options: normalizeReportingTagOptions(tag),
          }))
          .filter((tag: any) => {
            const appliesTo = normalizeReportingTagAppliesTo(tag);
            return appliesTo.some((entry: string | null | undefined) => {
              const normalized = String(entry || "").toLowerCase();
              return normalized.includes("purchase") || normalized.includes("bill") || normalized.includes("expense");
            });
          });

        if (mounted) {
          setAvailableReportingTags(activeRows);
        }
      } catch (error) {
        console.error("Error loading reporting tags:", error);
        if (mounted) setAvailableReportingTags([]);
      } finally {
        if (mounted) setIsReportingTagsLoading(false);
      }
    };

    loadReportingTags();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const target = e.currentTarget as HTMLInputElement;
    const isCheckbox = target.type === "checkbox";
    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox ? target.checked : value,
    }));
    if (name === "vendorName" || name === "bill" || name === "billDate") {
      setValidationErrors((prev) => {
        if (!prev[name as "vendorName" | "bill" | "billDate"]) return prev;
        const next = { ...prev };
        delete next[name as "vendorName" | "bill" | "billDate"];
        return next;
      });
    }
  };

  // Vendor search handler
  const handleVendorSearch = () => {
    const searchTerm = vendorSearchTerm.toLowerCase();
    let results: Vendor[] = [];

    if (vendorSearchCriteria === "Display Name") {
      results = allVendors.filter(vendor => {
        const displayName = getVendorDisplayName(vendor);
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Email") {
      results = allVendors.filter(vendor => {
        const email = vendor.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Company Name") {
      results = allVendors.filter(vendor => {
        const companyName = vendor.companyName || vendor.formData?.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Phone") {
      results = allVendors.filter(vendor => {
        const phone = vendor.workPhone || vendor.mobile || "";
        return phone.includes(searchTerm);
      });
    }

    setVendorSearchResults(results);
    setVendorSearchPage(1);
  };

  // Pagination calculations
  const vendorResultsPerPage = 10;
  const vendorStartIndex = (vendorSearchPage - 1) * vendorResultsPerPage;
  const vendorEndIndex = vendorStartIndex + vendorResultsPerPage;
  const vendorPaginatedResults = vendorSearchResults.slice(vendorStartIndex, vendorEndIndex);
  const vendorTotalPages = Math.ceil(vendorSearchResults.length / vendorResultsPerPage);

  const handleItemChange = (id: string | number, field: keyof BillLineItem, value: any) => {
    console.log("handleItemChange called:", { id, field, value }); // Debug
    setFormData((prev) => {
      const updatedItems = prev.items.map((item: BillLineItem) => {
        // Loose comparison to handle potential string/number mismatches
        if (String(item.id) === String(id)) {
          console.log(`Updating item ${id} field ${field} to`, value); // Debug
          const updatedItem = { ...item, [field]: value };
          // Calculate amount when quantity, rate, or discount changes
          if (field === "quantity" || field === "rate" || field === "discount") {
            const qty = parseFloat(String(updatedItem.quantity || 0));
            const rate = parseFloat(String(updatedItem.rate || 0));
            const discountMatch = (updatedItem.discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
            const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
            const subtotal = qty * rate;
            const discountAmount = (subtotal * discountPercent) / 100;
            updatedItem.amount = (subtotal - discountAmount).toFixed(2);
          }
          return updatedItem;
        }
        return item;
      });

      // Calculate subtotal from all items (using amount which already includes discount)
      const subTotal = updatedItems.reduce((sum: number, item: BillLineItem) => {
        return sum + parseFloat(String(item.amount || 0));
      }, 0).toFixed(2);

      // Calculate discount amount at transaction level
      const discountValue = showTransactionDiscount ? (parseFloat(String(prev.discount.value || 0)) || 0) : 0;
      const discountAmount = discountValue > 0
        ? (parseFloat(subTotal) * (discountValue / 100)).toFixed(2)
        : "0.00";

      // Calculate total
      const total = (parseFloat(subTotal) - parseFloat(discountAmount)).toFixed(2);

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        discountAmount,
        total,
      };
    });
  };

  const handleItemSelect = (id: number | string, item: Item) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((existingItem) => {
        if (existingItem.id === id) {
          const updatedItem = {
            ...existingItem,
            itemDetails: String(item.name || item.itemDetails || ""),
            item: item._id || item.id,
            trackInventory: Boolean(item.trackInventory),
            stockQuantity: Number(item.stockQuantity ?? (item as any).stockOnHand ?? (item as any).quantityOnHand ?? 0),
            unit: item.unit || "",
          };
          // Set account based on inventory tracking status
          if (item.trackInventory && item.inventoryAccount) {
            updatedItem.account = item.inventoryAccount;
          } else if (item.purchaseAccount) {
            updatedItem.account = item.purchaseAccount;
          } else if (!updatedItem.account) {
            updatedItem.account = "Prepaid Expenses";
          }
          const resolvedItemTax = resolveTaxOption(item?.purchaseTax || item?.tax || item?.purchaseTaxInfo?.taxName);
          if (resolvedItemTax?.name) {
            updatedItem.tax = resolvedItemTax.name;
          } else if (item?.purchaseTax || item?.tax) {
            updatedItem.tax = String(item.purchaseTax || item.tax);
          }
          // Set rate from item if available
          if (item.costPrice !== undefined && item.costPrice !== null && item.costPrice !== "") {
            updatedItem.rate = String(item.costPrice);
            // Recalculate amount
            const qty = parseFloat(String(updatedItem.quantity || 0));
            const rate = parseFloat(String(item.costPrice || 0));
            const discountMatch = (updatedItem.discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
            const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
            const subtotal = qty * rate;
            const discountAmount = (subtotal * discountPercent) / 100;
            updatedItem.amount = (subtotal - discountAmount).toFixed(2);
          }
          return updatedItem;
        }
        return existingItem;
      });

      // Recalculate totals
      const subTotal = updatedItems.reduce((sum: number, item: BillLineItem) => {
        return sum + (parseFloat(String(item.amount || 0)));
      }, 0).toFixed(2);

      const discountValue = showTransactionDiscount ? (parseFloat(String(prev.discount.value || 0)) || 0) : 0;
      const discountAmount = discountValue > 0
        ? (parseFloat(subTotal) * (discountValue / 100)).toFixed(2)
        : "0.00";

      const total = (parseFloat(subTotal) - parseFloat(discountAmount)).toFixed(2);

      return {
        ...prev,
        items: updatedItems,
        subTotal,
        discountAmount,
        total,
      };
    });
    setItemDropdownOpen((prev) => ({ ...prev, [id]: false }));
    setItemSearch((prev) => ({ ...prev, [id]: "" }));
  };

  const filteredItems = (itemId: number | string): Item[] => {
    const searchTerm = (itemSearch[itemId] || "").toLowerCase();
    if (!searchTerm) return items;
    return items.filter((item) =>
      item.name?.toLowerCase().includes(searchTerm) ||
      item.sku?.toLowerCase().includes(searchTerm)
    );
  };

  // Handle discount change
  const handleDiscountChange = (value: string) => {
    const discountValue = showTransactionDiscount ? (parseFloat(value) || 0) : 0;
    const subTotal = parseFloat(String(formData.subTotal)) || 0;
    const discountAmount = discountValue > 0
      ? (subTotal * (discountValue / 100)).toFixed(2)
      : "0.00";
    const total = (subTotal - parseFloat(discountAmount)).toFixed(2);

    setFormData((prev) => ({
      ...prev,
      discount: { ...prev.discount, value: showTransactionDiscount ? discountValue : 0 },
      discountAmount,
      total,
    }));
  };

  const addNewRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          itemDetails: "",
          account: "",
          quantity: "1.00",
          rate: "0.00",
          discount: "0 %-",
          tax: "",
          customerDetails: "",
          amount: "0.00",
        },
      ],
    }));
  };

  const removeRow = (id: number | string) => {
    if (formData.items.length > 1) {
      setFormData((prev) => {
        const updatedItems = prev.items.filter((item) => item.id !== id);
        // Recalculate totals after removal
        const subTotal = updatedItems.reduce((sum: number, item: any) => {
          return sum + (parseFloat(String(item.amount || 0)));
        }, 0).toFixed(2);

        const discountValue = showTransactionDiscount ? (parseFloat(String(prev.discount.value || 0)) || 0) : 0;
        const discountAmount = discountValue > 0
          ? (parseFloat(subTotal) * (discountValue / 100)).toFixed(2)
          : "0.00";

        const total = (parseFloat(subTotal) - parseFloat(discountAmount)).toFixed(2);

        return {
          ...prev,
          items: updatedItems,
          subTotal,
          discountAmount,
          total,
        };
      });
    }
  };

  const cloneRow = (id: number | string) => {
    const itemToClone = formData.items.find((item: Item) => item.id === Number(id));
    if (itemToClone) {
      const currentIndex = formData.items.findIndex((item: Item) => item.id === Number(id));
      const newRow = {
        ...itemToClone,
        id: Date.now(),
        itemDetails: "",
        amount: "0.00",
      };
      setFormData((prev) => {
        const newItems = [...prev.items];
        newItems.splice(currentIndex + 1, 0, newRow);
        return { ...prev, items: newItems };
      });
    }
    setRowMenuOpen((prev) => ({ ...prev, [id]: false }));
  };

  const insertNewRow = (id: number | string) => {
    const currentIndex = formData.items.findIndex((item: Item) => item.id === Number(id));
    const newRow = {
      id: Date.now(),
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      discount: "0 %-",
      tax: "",
      customerDetails: "",
      amount: "0.00",
    };
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems.splice(currentIndex + 1, 0, newRow);
      return { ...prev, items: newItems };
    });
    setRowMenuOpen((prev) => ({ ...prev, [id]: false }));
  };

  const insertItemsInBulk = (id: number | string) => {
    const currentIndex = formData.items.findIndex((item: Item) => item.id === Number(id));
    setBulkItemsInsertIndex(currentIndex);
    setShowBulkItemsModal(true);
    setBulkItemsSearch("");
    setSelectedBulkItems([]);
    setBulkItemQuantities({});
    setRowMenuOpen((prev) => ({ ...prev, [id]: false }));
  };

  const handleBulkItemSelect = (item: Item) => {
    const isSelected = selectedBulkItems.some(selected => selected.id === item.id);
    if (isSelected) {
      setSelectedBulkItems(selectedBulkItems.filter(selected => selected.id !== item.id));
      const newQuantities = { ...bulkItemQuantities };
      delete newQuantities[item.id];
      setBulkItemQuantities(newQuantities);
    } else {
      setSelectedBulkItems([...selectedBulkItems, item]);
      setBulkItemQuantities({ ...bulkItemQuantities, [item.id]: 1 });
    }
  };

  const handleBulkQuantityChange = (itemId: number | string, quantity: string) => {
    setBulkItemQuantities({ ...bulkItemQuantities, [itemId]: parseFloat(quantity) || 1 });
  };

  const handleAddBulkItems = () => {
    const newRows = selectedBulkItems.map((item: Item) => ({
      id: Date.now() + Math.random(),
      item: item._id || item.id,
      itemDetails: String(item.name || item.itemDetails || ""),
      account: item.trackInventory ? (item.inventoryAccount || "Inventory Asset") : (item.purchaseAccount || "Cost of Goods Sold"),
      quantity: (bulkItemQuantities[item.id] || 1).toString(),
      rate: (parseFloat(String(item.costPrice)) || 0.0).toString(),
      discount: "0 %-",
      tax: resolveTaxOption(item.purchaseTax)?.name || item.purchaseTax || "",
      customerDetails: "",
      amount: ((bulkItemQuantities[item.id] || 1) * (parseFloat(String(item.costPrice)) || 0.0)).toFixed(2),
    }));

    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems.splice(bulkItemsInsertIndex + 1, 0, ...newRows);

      // Recalculate totals
      const subTotal = newItems.reduce((sum: number, item: Item) => {
        return sum + parseFloat(String(item.amount || 0));
      }, 0).toFixed(2);

      const discountValue = showTransactionDiscount ? (parseFloat(String(prev.discount.value || 0)) || 0) : 0;
      const discountAmount = discountValue > 0
        ? (parseFloat(subTotal) * (discountValue / 100)).toFixed(2)
        : "0.00";

      const total = (parseFloat(subTotal) - parseFloat(discountAmount)).toFixed(2);

      return {
        ...prev,
        items: newItems,
        subTotal,
        discountAmount,
        total,
      };
    });

    setShowBulkItemsModal(false);
    setSelectedBulkItems([]);
    setBulkItemQuantities({});
    setBulkItemsSearch("");
  };

  const filteredBulkItems = bulkItemsSearch.trim() === ""
    ? items
    : items.filter((item: Item) =>
      item.name?.toLowerCase().includes(bulkItemsSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(bulkItemsSearch.toLowerCase())
    );

  const handleNewItemSave = async () => {
    const newItem = {
      name: newItemData.name,
      type: newItemData.type,
      unit: newItemData.unit,
      sellingPrice: parseFloat(String(newItemData.sellingPrice || 0)),
      costPrice: parseFloat(String(newItemData.costPrice || 0)),
      purchaseAccount: newItemData.purchaseAccount,
      salesAccount: newItemData.salesAccount,
      purchaseDescription: newItemData.purchaseDescription,
      salesDescription: newItemData.salesDescription,
      trackInventory: newItemData.trackInventory,
      inventoryAccount: newItemData.inventoryAccount,
      openingStock: parseFloat(String(newItemData.openingStock || 0)),
      isActive: true,
    };

    try {
      const response = await itemsAPI.create(newItem);
      if (response && (response.code === 0 || response.success)) {
        const createdItem = response.data || response.item;
        setItems(prev => [...prev, createdItem]);
        toast.success("Item created successfully");
      }
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Failed to create item");
    }

    // Reset form and close modal
    setNewItemData({
      type: "Goods",
      name: "",
      unit: "",
      sellable: true,
      sellingPrice: "",
      salesAccount: "Sales",
      salesDescription: "",
      salesTax: "",
      purchasable: true,
      costPrice: "",
      purchaseAccount: "Cost of Goods Sold",
      purchaseDescription: "",
      purchaseTax: "",
      preferredVendor: "",
      trackInventory: false,
      inventoryAccount: "Inventory Asset",
      openingStock: "0.00",
    });
    setShowNewItemModal(false);
  };

  const filteredVendors = vendors.filter((vendor) =>
    getVendorDisplayName(vendor).toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const handleSubmit = async (e: { preventDefault: () => void }, status: "draft" | "open") => {
    e.preventDefault();
    if (saveLoadingState) return;
    const nextValidationErrors: Partial<Record<"vendorName" | "bill" | "billDate", string>> = {};
    const normalizedVendorName = getVendorDisplayName(formData.vendorName);
    const normalizedVendorId = String(formData.vendorId || formData.vendor_id || "").trim();

    // Basic validation
    if (!normalizedVendorName) {
      nextValidationErrors.vendorName = "Please select a vendor.";
    }

    if (!formData.bill) {
      nextValidationErrors.bill = "Please enter a bill number.";
    }

    if (!formData.billDate) {
      nextValidationErrors.billDate = "Please select a bill date.";
    }

    setValidationErrors(nextValidationErrors);
    if (Object.keys(nextValidationErrors).length > 0) {
      return;
    }

    if (!formData.dueDate) {
      alert("Please select a due date.");
      return;
    }

    // Calculate total amount from items
    const totalAmount = formData.items.reduce((sum: number, item: any) => {
      const quantity = parseFloat(String(item.quantity)) || 0;
      const rate = parseFloat(String(item.rate)) || 0;
      return sum + (quantity * rate);
    }, 0);
    const isTaxInclusive = String(taxMode || "Tax Exclusive").toLowerCase().includes("inclusive");

    const isEdit = location.state?.isEdit && location.state?.editBill;
    const editBillId = isEdit ? location.state.editBill.id : null;

    // Prepare attached files metadata (without file objects for localStorage)
    const attachedFilesMetadata = attachedFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      // Note: file.preview and file.file are not stored in localStorage
      // They would need to be uploaded to a server in a real application
    }));

    // Prepare bill data
    const selectedVendor = findVendorMatch(normalizedVendorName, normalizedVendorId);
    const statusLower = status === "open" ? "open" : "draft";
    const selectedBillLocation = activeLocations.find((location) => location.name === billLocation);
    const selectedWarehouseLocation = activeLocations.find((location) => location.name === warehouseLocation);

    const billData = {
      billNumber: formData.bill,
      orderNumber: formData.orderNumber,
      referenceNumber: formData.orderNumber,
      vendor: normalizedVendorId || (selectedVendor ? (selectedVendor.id || selectedVendor._id) : null),
      date: formData.billDate,
      dueDate: formData.dueDate,
      items: formData.items.map((item: any) => ({
        ...(() => {
          const lineAmount = parseFloat(String(item.amount || 0)) || 0;
          const taxRateDecimal = getTaxRateFromSelection(item.tax);
          const taxAmount = taxRateDecimal > 0
            ? (isTaxInclusive
              ? lineAmount - (lineAmount / (1 + taxRateDecimal))
              : lineAmount * taxRateDecimal)
            : 0;
          const lineTotal = isTaxInclusive ? lineAmount : lineAmount + taxAmount;

          return {
            item: item.item,
            account: item.account,
            name: item.itemDetails,
            description: item.itemDetails,
            quantity: parseFloat(String(item.quantity)) || 0,
            unitPrice: parseFloat(String(item.rate)) || 0,
            taxRate: Number((taxRateDecimal * 100).toFixed(4)),
            taxAmount: Number(taxAmount.toFixed(2)),
            total: Number(lineTotal.toFixed(2)),
          };
        })(),
      })),
      subtotal: parseFloat(String(formData.subTotal)) || 0,
      tax: parseFloat(String(formData.taxAmount || 0)) || 0,
      discount: parseFloat(String(formData.discountAmount || 0)) || 0,
      total: parseFloat(String(formData.total || 0)) || totalAmount,
      status: statusLower,
      paymentTerms: formData.paymentTerms,
      accountsPayable: formData.accountsPayable,
      locationId: selectedBillLocation?._id || selectedBillLocation?.id || null,
      locationName: selectedBillLocation?.name || billLocation || "",
      warehouseLocationId: selectedWarehouseLocation?._id || selectedWarehouseLocation?.id || null,
      warehouseLocationName: selectedWarehouseLocation?.name || warehouseLocation || "",
      notes: formData.notes,
      currency: formData.currency,
      purchaseOrderId: location.state?.fromPurchaseOrder ? (location.state.purchaseOrder.id || location.state.purchaseOrder._id) : null,
    };

    if (!billData.vendor) {
      const foundVendor = findVendorMatch(normalizedVendorName, normalizedVendorId);
      if (foundVendor) {
        billData.vendor = foundVendor.id || foundVendor._id;
      } else {
        alert("Please select a valid vendor from the dropdown.");
        return;
      }
    }

    try {
      setSaveLoadingState(status === "open" ? "open" : "draft");
      let response;
      if (isEdit && editBillId) {
        response = await billsAPI.update(editBillId, billData);
      } else {
        response = await billsAPI.create(billData);
      }

      if (response && (response.code === 0 || response.success)) {
        window.dispatchEvent(new Event("billsUpdated"));
        if (isEdit && editBillId) {
          navigate(`/purchases/bills/${editBillId}`);
        } else {
          navigate("/purchases/bills");
        }
      } else {
        alert("Failed to save bill: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving bill:", error);
      alert("An error occurred while saving the bill.");
    } finally {
      setSaveLoadingState(null);
    }
  };

  const handleCancel = () => {
    navigate("/purchases/bills");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      const maxFiles = 5;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (attachedFiles.length + fileArray.length > maxFiles) {
        alert(`You can upload a maximum of ${maxFiles} files.`);
        e.target.value = "";
        return;
      }

      const validFiles = fileArray.filter((file: File) => {
        if (file.size > maxSize) {
          alert(`File "${file.name}" exceeds the maximum size of 10MB.`);
          return false;
        }
        return true;
      });

      const newFiles = validFiles.map((file: File) => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        preview: URL.createObjectURL(file),
      }));

      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const handleAttachFromDesktop = () => {
    fileInputRef.current?.click();
    setUploadMenuOpen(false);
  };

  const handleAttachFromDocuments = () => {
    setShowDocumentsModal(true);
    setUploadMenuOpen(false);
    setSelectedDocuments([]);
    setDocumentsSearch("");
  };

  const handleAttachFromCloud = (service?: string) => {
    if (service) {
      // Handle specific cloud service
      alert(`${service.charAt(0).toUpperCase() + service.slice(1)} integration - Coming soon! This will allow you to connect and select files from ${service}.`);
    } else {
      // Generic cloud option
      alert("Cloud storage integration - Coming soon! This will allow you to connect and select files from cloud storage services.");
    }
    setUploadMenuOpen(false);
  };

  const handleRemoveFile = (fileId: number | string) => {
    setAttachedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // Cleanup file preview URLs on unmount
  useEffect(() => {
    const currentFiles = attachedFiles;
    return () => {
      // Cleanup all blob URLs when component unmounts
      currentFiles.forEach(file => {
        if (file.preview && typeof file.preview === 'string' && file.preview.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(file.preview);
          } catch (error) {
            // Ignore errors if URL is already revoked
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run cleanup on unmount

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Get documents from API handled by useEffect above
  // const [availableDocuments] = useState(() => getDocuments());

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocuments(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleAttachSelectedDocuments = () => {
    const docsToAttach = availableDocuments.filter(doc =>
      selectedDocuments.includes(doc.id) &&
      (selectedInbox === "All Documents" || doc.type === selectedInbox)
    );

    if (docsToAttach.length === 0) {
      alert("Please select at least one document to attach.");
      return;
    }

    const maxFiles = 5;
    if (attachedFiles.length + docsToAttach.length > maxFiles) {
      alert(`You can attach a maximum of ${maxFiles} files. You currently have ${attachedFiles.length} files attached.`);
      return;
    }

    const newFiles = docsToAttach.map((doc, index) => ({
      id: Date.now() + Math.random() + index,
      name: doc.fileName || doc.name,
      size: doc.fileSize || 0,
      type: doc.mimeType || (doc.fileName || doc.name || "").endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      file: doc.file,
      preview: doc.file ? URL.createObjectURL(doc.file) : null,
      fromDocuments: true,
      documentId: doc.id || doc._id,
    }));

    setAttachedFiles(prev => [...prev, ...newFiles]);
    setSelectedDocuments([]);
    setDocumentsSearch("");
    setSelectedInbox("Files");
    setShowDocumentsModal(false);
  };

  const filteredDocuments = availableDocuments.filter(doc => {
    const fileName = doc.fileName || doc.name || "";
    const vendor = doc.vendor || "";
    const matchesSearch = documentsSearch === "" ||
      fileName.toLowerCase().includes(documentsSearch.toLowerCase()) ||
      vendor.toLowerCase().includes(documentsSearch.toLowerCase());
    return matchesSearch;
  });

  const activeLocations = locations.filter((location) => location.isActive !== false);
  const billLocationOptions = activeLocations.filter((location) => {
    const type = String(location.type || "").toLowerCase();
    return type === "business" || type === "general";
  });
  const warehouseLocationOptions = activeLocations.filter((location) => String(location.type || "").toLowerCase() === "warehouse");
  const resolvedBillLocationOptions = billLocationOptions.length > 0 ? billLocationOptions : activeLocations;
  const resolvedWarehouseLocationOptions = warehouseLocationOptions.length > 0 ? warehouseLocationOptions : activeLocations;

  return (
    <div className="flex h-[calc(100vh-16px)] w-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h1 className="text-[22px] font-semibold text-gray-900 m-0 flex items-center gap-3">
          <FileText size={24} className="text-gray-500" />
          {location.state?.isEdit && location.state?.editBill ? "Edit Bill" : "New Bill"}
        </h1>
        <button
          type="button"
          onClick={handleCancel}
          className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center hover:bg-gray-100 rounded"
        >
          <X size={20} className="text-gray-500" strokeWidth={2} />
        </button>
      </div>

      {/* Form */}
      <div className="w-full flex-1 overflow-x-auto overflow-y-auto">
      <form onSubmit={(e) => handleSubmit(e, "open")} className="min-w-[1600px] flex-1 bg-white pb-32">
        <div className="w-full px-6 pt-7 pb-0">
          {/* Vendor Details */}
          <div className="mb-8 border-b border-gray-100 pb-8">
            <div className="flex max-w-[760px] flex-col gap-2">
              <label className="text-sm font-medium text-red-500 flex items-center gap-1 mb-1">
                <span>Vendor Name</span>
                <span>*</span>
              </label>
              <div className="flex gap-0 items-end">
                <div className="relative flex-1 min-w-0" ref={vendorRef}>
                  <button
                    type="button"
                    className={`w-full px-3 pr-20 py-2.5 rounded-l-md rounded-r-none text-sm outline-none bg-white cursor-pointer flex items-center justify-between box-border h-10 shadow-[0_0_0_1px_rgba(59,130,246,0.08)] min-w-0 ${validationErrors.vendorName ? "border border-red-400 focus:border-red-500" : "border border-indigo-300 focus:border-blue-500"}`}
                    onClick={() => setVendorOpen(!vendorOpen)}
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  >
                    <span className={`truncate text-left ${selectedVendorName ? "" : validationErrors.vendorName ? "text-red-500" : "text-gray-400"}`}>
                      {selectedVendorName || "Select a Vendor"}
                    </span>
                  </button>
                  <div className={`absolute inset-y-0 right-0 flex items-stretch overflow-hidden rounded-r-md border border-l-0 bg-white shadow-[0_0_0_1px_rgba(59,130,246,0.08)] ${validationErrors.vendorName ? "border-red-400" : "border-indigo-300"}`}>
                    {selectedVendorName ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearVendorSelection();
                        }}
                        className="h-10 w-9 flex items-center justify-center border-none bg-white text-red-500 hover:bg-red-50"
                        aria-label="Clear vendor"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <div className="h-10 w-9" />
                    )}
                    <div className="h-10 w-px bg-gray-200" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVendorOpen((prev) => !prev);
                      }}
                      className="h-10 w-9 flex items-center justify-center border-none bg-white text-gray-500 hover:bg-gray-50"
                      aria-label="Toggle vendor dropdown"
                    >
                      {vendorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {vendorOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-md border border-gray-200 z-[100] max-h-[300px] overflow-hidden flex flex-col">
                      <div className="px-3 py-2 border-none border-b border-gray-200 text-sm outline-none flex items-center gap-2">
                        <Search size={16} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search vendor"
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          className="flex-1 border-none outline-none text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[250px] overflow-y-auto py-1">
                        {filteredVendors.length > 0 ? (
                          filteredVendors.map((vendor) => (
                            <button
                              key={getVendorId(vendor) || getVendorDisplayName(vendor)}
                              type="button"
                              className="px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left hover:bg-gray-50"
                              onClick={() => applyVendorSelection(vendor)}
                            >
                              {getVendorDisplayName(vendor)}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            NO RESULTS FOUND
                          </div>
                        )}
                      </div>
                      <div className="border-t border-gray-200 p-2">
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-sm text-teal-700 cursor-pointer border-none bg-transparent flex items-center gap-2 hover:bg-teal-50 rounded-md"
                          onClick={() => {
                            setVendorOpen(false);
                            setShowNewVendorModal(true);
                          }}
                        >
                          <Plus size={16} />
                          + New Vendor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="p-2.5 bg-[#4f8df7] text-white border-none rounded-r-md rounded-l-none cursor-pointer flex items-center justify-center h-10 w-10 shrink-0 hover:bg-[#3b82f6]"
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVendorSearchModalOpen(true);
                  }}
                >
                  <Search size={16} />
                </button>
              </div>
              {selectedVendorBillingLines.length > 0 && (
                <div className="mt-3 max-w-[520px]">
                  <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                    Billing Address
                    <Pencil size={12} className="text-gray-400" />
                  </div>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-gray-900 whitespace-pre-line">
                    {selectedVendorBillingLines.map((line, index) => (
                      <div key={`${line}-${index}`}>{line}</div>
                    ))}
                  </div>
                </div>
              )}
              {validationErrors.vendorName ? (
                <div className="text-xs text-red-500">{validationErrors.vendorName}</div>
              ) : null}
            </div>
          </div>

          {/* Bill Details */}
          <div className="mb-8">
              <div className="mb-6 flex max-w-[500px] items-center gap-5">
                <label className="w-[150px] shrink-0 text-sm font-medium text-gray-900">Location</label>
                <div className="relative w-full max-w-[300px]" ref={billLocationRef}>
                  <button
                    type="button"
                    onClick={() => setBillLocationOpen((prev) => !prev)}
                    className="h-10 min-w-[180px] w-full px-3 border-0 border-b-2 border-gray-200 bg-transparent text-sm text-gray-700 cursor-pointer flex items-center justify-between outline-none hover:border-teal-600"
                  >
                    <span>{billLocation || "Select a Location"}</span>
                    {billLocationOpen ? <ChevronUp size={16} className="text-teal-600" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </button>
                  {billLocationOpen && (
                    <div className="absolute top-full left-0 mt-1 w-[260px] bg-white rounded-lg shadow-lg border border-gray-200 z-[100] max-h-[300px] overflow-hidden flex flex-col">
                      <div className="max-h-[200px] overflow-y-auto py-1">
                        {resolvedBillLocationOptions.length > 0 ? resolvedBillLocationOptions.map((option) => {
                          const optionName = String(option.name || "").trim();
                          const isSelected = billLocation === optionName;
                          return (
                            <button
                              key={option._id || option.id || optionName}
                              type="button"
                              onClick={() => {
                                setBillLocation(optionName);
                                setBillLocationOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}
                            >
                              <span className={isSelected ? "text-teal-700 font-medium" : "text-gray-900"}>
                                {optionName || "Unnamed Location"}
                              </span>
                              {isSelected ? <Check size={16} className="text-teal-700" /> : null}
                            </button>
                          );
                        }) : (
                          <div className="px-4 py-3 text-sm text-gray-500">No locations found</div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex max-w-[840px] flex-col gap-4">
              <div className="flex max-w-[500px] items-center gap-5">
                <label className="w-[150px] shrink-0 text-sm font-medium text-red-500 flex items-center gap-1">
                  Bill#<span>*</span>
                </label>
                <input
                  type="text"
                  name="bill"
                  value={formData.bill}
                  onChange={handleChange}
                  required
                  className={`h-9 w-full max-w-[300px] rounded-md px-3 py-2 text-sm outline-none box-border ${getInputClassName("bill", `border ${validationErrors.bill ? "border-red-400" : "border-gray-300"}`)} ${fieldFocusClass}`}
                />
              </div>
              {validationErrors.bill ? (
                <div className="ml-[150px] -mt-2 text-xs text-red-500">{validationErrors.bill}</div>
              ) : null}

              <div className="flex max-w-[500px] items-center gap-5">
                <label className="w-[150px] shrink-0 text-sm font-medium text-gray-900">Order Number</label>
                <input
                  type="text"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  className={`h-9 w-full max-w-[300px] rounded-md border border-gray-300 px-3 py-2 text-sm outline-none box-border ${fieldFocusClass}`}
                />
              </div>

              <div className="flex max-w-[500px] items-center gap-5">
                <label className="w-[150px] shrink-0 text-sm font-medium text-red-500 flex items-center gap-1">
                  Bill Date<span>*</span>
                </label>
                <input
                  type="date"
                  name="billDate"
                  value={formData.billDate}
                  onChange={handleChange}
                  required
                  className={`h-9 w-full max-w-[300px] rounded-md px-3 py-2 text-sm outline-none box-border ${getInputClassName("billDate", `border ${validationErrors.billDate ? "border-red-400" : "border-gray-300"}`)} ${fieldFocusClass}`}
                />
              </div>
              {validationErrors.billDate ? (
                <div className="ml-[150px] -mt-2 text-xs text-red-500">{validationErrors.billDate}</div>
              ) : null}

              <div className="grid max-w-[840px] grid-cols-[150px_300px_150px_220px] items-center gap-x-5">
                <label className="w-[150px] shrink-0 text-sm font-medium text-gray-900">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={`h-9 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none box-border ${fieldFocusClass}`}
                />
                <label className="text-sm font-medium text-gray-900">Payment Terms</label>
                <div className="w-full">
                  <PaymentTermsDropdown
                    value={formData.paymentTerms}
                    onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                    onConfigureTerms={() => setShowConfigurePaymentTermsModal(true)}
                    customTerms={paymentTermsList.map((term) => ({
                      id: term.name,
                      label: term.name,
                      value: term.name,
                      days: term.days ?? undefined,
                      isDefault: term.isDefault
                    }))}
                  />
                </div>
              </div>

              <div className="flex max-w-[500px] items-center gap-5">
                <label className="w-[150px] shrink-0 text-sm font-medium text-gray-900 flex items-center gap-1">
                  Accounts Payable <span className="text-gray-400 font-normal ml-1 cursor-pointer" title="Select the accounts payable account for this bill">?</span>
                </label>
                <div className="relative w-full max-w-[300px]" ref={accountsPayableRef}>
                  <button
                    type="button"
                    onClick={() => setAccountsPayableOpen(!accountsPayableOpen)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none bg-white cursor-pointer flex items-center justify-between box-border h-9 hover:border-[#156372] ${fieldFocusClass}`}
                    style={{
                      borderColor: accountsPayableOpen ? "#156372" : undefined,
                      boxShadow: accountsPayableOpen ? "0 0 0 1px #156372" : undefined
                    }}
                  >
                    <span className={formData.accountsPayable ? "" : "text-gray-400"}>
                      {formData.accountsPayable || "Select Account"}
                    </span>
                    {accountsPayableOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {accountsPayableOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[100] max-h-[400px] overflow-hidden flex flex-col">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Search size={14} className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={accountsPayableSearch}
                            onChange={(e) => setAccountsPayableSearch(e.target.value)}
                            className="flex-1 border-none outline-none text-sm"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-[280px] overflow-y-auto py-1">
                        {structuredAccounts['accounts_payable'] ? (
                          structuredAccounts['accounts_payable']
                            .filter(acc => acc.toLowerCase().includes(accountsPayableSearch.toLowerCase()))
                            .map((acc) => {
                              const isSelected = formData.accountsPayable === acc;
                              return (
                                <button
                                  key={acc}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, accountsPayable: acc }));
                                    setAccountsPayableOpen(false);
                                    setAccountsPayableSearch("");
                                  }}
                                  className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}
                                >
                                  <span className={isSelected ? "text-teal-700 font-medium" : "text-gray-900"}>
                                    {acc}
                                  </span>
                                  {isSelected && <Check size={16} className="text-teal-700" />}
                                </button>
                              );
                            })
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No Accounts Payable found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Item Table */}
          <div className="mb-8">
            <div className="mr-24 max-w-[1180px]">
              {/* Top Item Controls */}
              <div className="mb-5 flex flex-wrap items-center gap-8 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500">Warehouse Location</label>
                  <div className="relative" ref={warehouseLocationRef}>
                    <button
                      type="button"
                      onClick={() => setWarehouseLocationOpen((prev) => !prev)}
                      className="h-10 min-w-[180px] px-3 border-0 border-b-2 border-gray-200 bg-transparent text-sm text-gray-700 cursor-pointer flex items-center justify-between outline-none hover:border-teal-600"
                    >
                      <span>{warehouseLocation || "Select Warehouse"}</span>
                      {warehouseLocationOpen ? <ChevronUp size={16} className="text-teal-600" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </button>
                    {warehouseLocationOpen && (
                      <div className="absolute top-full left-0 mt-1 w-[260px] bg-white rounded-lg shadow-lg border border-gray-200 z-[100] max-h-[300px] overflow-hidden flex flex-col">
                        <div className="max-h-[200px] overflow-y-auto py-1">
                          {resolvedWarehouseLocationOptions.length > 0 ? resolvedWarehouseLocationOptions.map((option) => {
                            const optionName = String(option.name || "").trim();
                            const isSelected = warehouseLocation === optionName;
                            return (
                              <button
                                key={option._id || option.id || optionName}
                                type="button"
                                onClick={() => {
                                  setWarehouseLocation(optionName);
                                  setWarehouseLocationOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}
                              >
                                <span className={isSelected ? "text-teal-700 font-medium" : "text-gray-900"}>
                                  {optionName || "Unnamed Location"}
                                </span>
                                {isSelected ? <Check size={16} className="text-teal-700" /> : null}
                              </button>
                            );
                          }) : (
                            <div className="px-4 py-3 text-sm text-gray-500">No locations found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Tag size={16} className="text-gray-500" />
                  <div className="relative" ref={taxModeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setTaxModeDropdownOpen((prev) => !prev)}
                      className="h-10 min-w-[180px] px-3 border-0 border-b-2 border-gray-200 bg-transparent text-sm text-gray-700 cursor-pointer flex items-center justify-between outline-none hover:border-teal-600"
                    >
                      <span>{taxMode}</span>
                      {taxModeDropdownOpen ? <ChevronUp size={16} className="text-teal-600" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </button>
                    {taxModeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-[220px] bg-white rounded-lg shadow-lg border border-gray-200 z-[100] max-h-[300px] overflow-hidden flex flex-col">
                        <div className="max-h-[200px] overflow-y-auto py-1">
                          {["Tax Exclusive", "Tax Inclusive"].map((mode) => {
                            const isSelected = taxMode === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                  setTaxMode(mode);
                                  setTaxModeDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}
                              >
                                <span className={isSelected ? "text-teal-700 font-medium" : "text-gray-900"}>
                                  {mode}
                                </span>
                                {isSelected && <Check size={16} className="text-teal-700" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative" ref={transactionLevelRef}>
                  <button
                    type="button"
                    onClick={() => setTransactionLevelOpen(!transactionLevelOpen)}
                    className="h-10 min-w-[220px] px-3 border-0 border-b-2 border-gray-200 bg-transparent text-sm text-gray-700 cursor-pointer flex items-center justify-between outline-none hover:border-teal-600"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat2 size={16} className="text-gray-500" />
                      <span>{formData.transactionLevel}</span>
                    </div>
                    {transactionLevelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {transactionLevelOpen && (
                    <div className="absolute top-full left-0 mt-1 w-[260px] bg-white rounded-lg shadow-lg border border-gray-200 z-[100] max-h-[300px] overflow-hidden flex flex-col">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Search size={14} className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={transactionLevelSearch}
                            onChange={(e) => setTransactionLevelSearch(e.target.value)}
                            className="flex-1 border-none outline-none text-sm"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto py-1">
                        {["At Transaction Level", "At Line Item Level"]
                          .filter(level => level.toLowerCase().includes(transactionLevelSearch.toLowerCase()))
                          .map((level) => {
                            const isSelected = formData.transactionLevel === level;
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, transactionLevel: level }));
                                  setTransactionLevelOpen(false);
                                  setTransactionLevelSearch("");
                                }}
                                className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}
                              >
                                <span className={isSelected ? "text-teal-700 font-medium" : "text-gray-900"}>
                                  {level}
                                </span>
                                {isSelected && <Check size={16} className="text-teal-700" />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Item Table Heading with Bulk Actions */}
              <div className="flex items-center justify-between px-4 py-4 bg-gray-50 border border-gray-200 border-b-0 rounded-t-xl">
                <h3 className="text-[18px] font-semibold text-gray-900">Item Table</h3>
                <div className="relative" ref={bulkActionsRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBulkActionsDropdownOpen(!bulkActionsDropdownOpen);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      fontSize: "14px",
                      color: "#156372",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Check size={16} style={{ color: "#156372" }} />
                    Bulk Actions
                  </button>
                  {bulkActionsDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      zIndex: 1000,
                      minWidth: "250px",
                      overflow: "hidden",
                    }}>
                      {/* Bulk Update Line Items Option */}
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: selectedBulkAction === "Bulk Update Line Items" ? "#ffffff" : "#111827",
                          backgroundColor: selectedBulkAction === "Bulk Update Line Items" ? "#156372" : "transparent",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBulkAction("Bulk Update Line Items");
                          setBulkActionsDropdownOpen(false);
                          setShowAdditionalFields(false);
                          setShowBanner(true);
                        }}
                        onMouseEnter={(e) => {
                          if (selectedBulkAction !== "Bulk Update Line Items") {
                            e.currentTarget.style.backgroundColor = "#156372";
                            e.currentTarget.style.color = "#ffffff";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedBulkAction !== "Bulk Update Line Items") {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#111827";
                          } else {
                            e.currentTarget.style.backgroundColor = "#156372";
                            e.currentTarget.style.color = "#ffffff";
                          }
                        }}
                      >
                        Bulk Update Line Items
                      </div>
                      {/* Show All Additional Information Option */}
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: selectedBulkAction === "Hide All Additional Information" || selectedBulkAction === "Show All Additional Information" ? "#ffffff" : "#111827",
                          backgroundColor: selectedBulkAction === "Hide All Additional Information" || selectedBulkAction === "Show All Additional Information" ? "#156372" : "transparent",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const actionText = showAdditionalFields ? "Hide All Additional Information" : "Show All Additional Information";
                          setSelectedBulkAction(actionText);
                          setBulkActionsDropdownOpen(false);
                          if (showAdditionalFields) {
                            setShowAdditionalFields(false);
                            setShowBanner(true);
                          } else {
                            setShowAdditionalFields(true);
                            setShowBanner(false);
                          }
                        }}
                        onMouseEnter={(e) => {
                          const actionText = showAdditionalFields ? "Hide All Additional Information" : "Show All Additional Information";
                          if (selectedBulkAction !== actionText) {
                            e.currentTarget.style.backgroundColor = "#156372";
                            e.currentTarget.style.color = "#ffffff";
                          }
                        }}
                        onMouseLeave={(e) => {
                          const actionText = showAdditionalFields ? "Hide All Additional Information" : "Show All Additional Information";
                          if (selectedBulkAction !== actionText) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#111827";
                          } else {
                            e.currentTarget.style.backgroundColor = "#156372";
                            e.currentTarget.style.color = "#ffffff";
                          }
                        }}
                      >
                        {showAdditionalFields ? "Hide All Additional Information" : "Show All Additional Information"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Update Reporting Tags Banner - Only show when additional fields are hidden */}
              {showBanner && !showAdditionalFields && (
                <div style={{
                  backgroundColor: "#eff6ff",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid #bfdbfe",
                }}>
                  <button
                    style={{
                      padding: "8px 20px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#ffffff",
                      backgroundColor: "#156372",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0D4A52";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#156372";
                    }}
                  >
                    Update Reporting Tags
                  </button>
                  <button
                    onClick={() => {
                      setShowBanner(false);
                      setShowAdditionalFields(true);
                    }}
                    style={{
                      padding: "4px",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#156372",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#dbeafe";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="mb-4 overflow-visible rounded-b-2xl border border-t-0 border-gray-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
              <table className="w-full table-fixed border-collapse">
                <thead className="border-b border-gray-200 bg-gray-50/80">
                  <tr>
                    <th className={itemTableHeaderClass} style={{ width: "26%" }}>ITEM DETAILS</th>
                    <th className={itemTableHeaderClass} style={{ width: "16%" }}>ACCOUNT</th>
                    <th className={`${itemTableHeaderClass} text-right`} style={{ width: "11%" }}>QUANTITY</th>
                    <th className={`${itemTableHeaderClass} text-right`} style={{ width: "13%" }}>RATE</th>
                    <th className={itemTableHeaderClass} style={{ width: "0%", padding: 0 }} aria-hidden="true">
                      <span className="sr-only">Tax</span>
                    </th>
                    <th className={itemTableHeaderClass} style={{ width: "13%" }}>CUSTOMER DETAILS</th>
                    <th className={`${itemTableHeaderClass} text-right`} style={{ width: "7%" }}>AMOUNT</th>
                    <th className="px-2 py-3" style={{ width: "2%" }}></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {formData.items.map((item) => {
                    const accountOpen = accountDropdowns[item.id] || false;
                    const accountSearch = accountSearches[item.id] || "";
                    const customerOpen = customerDropdowns[item.id] || false;
                    const customerSearch = customerSearches[item.id] || "";
                    const reportingTagsTriggerRef = itemReportingTagsRefs.current[item.id];
                    const reportingTagsTriggerRect = reportingTagsTriggerRef?.getBoundingClientRect() || null;
                    const selectedItemMeta = items.find((itemOption) => String(itemOption._id || itemOption.id) === String(item.item));
                    const rowTrackInventory = Boolean(item.trackInventory || selectedItemMeta?.trackInventory);
                    const rowStockQuantity = Number(
                      item.stockQuantity ??
                      selectedItemMeta?.stockQuantity ??
                      (selectedItemMeta as any)?.stockOnHand ??
                      (selectedItemMeta as any)?.quantityOnHand ??
                      0
                    );
                    const rowUnit = item.unit || selectedItemMeta?.unit || "";

                    // Filter accounts based on search
                    const filteredAccounts: Record<string, string[]> = Object.entries(structuredAccounts).reduce((acc: Record<string, string[]>, [category, accounts]: [string, string[]]) => {
                      const filtered = accounts.filter(acc =>
                        acc && typeof acc === 'string' && acc.toLowerCase().includes(accountSearch.toLowerCase())
                      );
                      if (filtered.length > 0) {
                        acc[category] = filtered;
                      }
                      return acc;
                    }, {});

                    // Filter customers based on search
                    const filteredCustomers = customers.map(c => c.name || c.displayName || "").filter(customer =>
                      customer && customer.toLowerCase().includes(customerSearch.toLowerCase())
                    );

                    if (!accountRefs.current[item.id]) accountRefs.current[item.id] = null;
                    if (!customerRefs.current[item.id]) customerRefs.current[item.id] = null;

                    return (
                      <React.Fragment key={item.id}>
                        <tr className="border-b border-gray-200 align-top min-h-[118px]">
                          <td className="px-3 py-2.5 text-sm">
                              <div className="relative flex items-center gap-2" ref={(el) => {
                                itemRefs.current[item.id] = el;
                              }}>
                              <div className="flex flex-col gap-1 cursor-move px-0.5 py-1.5">
                                <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                              </div>
                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                                <ImageIcon size={18} className="text-gray-300" />
                              </div>
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={item.itemDetails}
                                  onChange={(e) => {
                                    handleItemChange(item.id, "itemDetails", e.target.value);
                                    setItemSearch((prev) => ({ ...prev, [item.id]: e.target.value }));
                                    setItemDropdownOpen((prev) => ({ ...prev, [item.id]: true }));
                                  }}
                                  onClick={() => setItemDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                                  onFocus={() => setItemDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                                  className={`${itemTableInputClass} w-full pr-9`}
                                  style={{
                                    borderColor: itemDropdownOpen[item.id] ? "#156372" : "#d1d5db"
                                  }}
                                  placeholder="Type or click to select an item."
                                />
                                <button
                                  type="button"
                                  aria-label={itemDropdownOpen[item.id] ? "Close item dropdown" : "Open item dropdown"}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setItemDropdownOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                                  }}
                                >
                                  {itemDropdownOpen[item.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                              {itemDropdownOpen[item.id] && (
                                <div className="absolute top-full left-0 right-0 z-[100] mt-2 max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg" style={{ marginLeft: "58px" }}>
                                  {filteredItems(item.id).length > 0 ? (
                                    filteredItems(item.id).map((itemOption) => (
                                      <div
                                        key={itemOption.id}
                                        className="px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 group"
                                        onClick={() => handleItemSelect(item.id, itemOption)}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 group-hover:text-teal-700 mb-0.5 truncate text-sm">
                                              {itemOption.name}
                                            </div>
                                            <div className="text-[11px] text-gray-500 group-hover:text-gray-600 flex items-center gap-2">
                                              <span>SKU: {itemOption.sku || 'N/A'}</span>
                                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                              <span>Purchase Rate: {resolvedBaseCurrencySymbol} {(Number(itemOption.costPrice || 0)).toFixed(2)}</span>
                                            </div>
                                          </div>
                                          {itemOption.trackInventory && (
                                            <div className="text-right ml-4 flex-shrink-0">
                                              <div className="text-[9px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                                                Stock on Hand
                                              </div>
                                              <div className={`text-xs font-semibold ${(Number(itemOption.stockQuantity || 0)) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {(Number(itemOption.stockQuantity || 0)).toFixed(2)} {itemOption.unit || ''}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-6 text-center text-gray-500 text-sm">
                                      No results found. Try a different keyword.
                                    </div>
                                  )}
                                  <div
                                    className="px-3 py-2 border-t border-gray-200 bg-gray-50 cursor-pointer text-sm flex items-center gap-2 hover:bg-teal-50"
                                    style={{ color: "#156372" }}
                                    onClick={() => {
                                      setItemDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                      navigate("/items/all");
                                    }}
                                  >
                                    View All Items
                                  </div>
                                  <div
                                    className="px-3 py-2 border-t border-gray-200 bg-white cursor-pointer text-sm flex items-center gap-2 hover:bg-gray-50"
                                    style={{ color: "#6b7280" }}
                                    onClick={() => {
                                      setItemDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                      setItemSearch((prev) => ({ ...prev, [item.id]: "" }));
                                    }}
                                  >
                                    Cancel
                                  </div>
                                  <div
                                    className="px-3 py-2 border-t border-gray-200 bg-gray-50 cursor-pointer text-sm flex items-center gap-2 hover:bg-teal-50"
                                    style={{ color: "#156372" }}
                                    onClick={() => {
                                      setItemDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                      setShowNewItemModal(true);
                                    }}
                                  >
                                    <Plus size={16} />
                                    Add New Item
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <div
                              className="relative"
                              ref={(el) => {
                                accountRefs.current[item.id] = el;
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  const button = e.currentTarget;
                                  const buttonRect = button.getBoundingClientRect();
                                  setAccountDropdownPosition((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      top: buttonRect.bottom + 4,
                                      left: buttonRect.left,
                                      width: Math.max(buttonRect.width + 20, 220)
                                    }
                                  }));
                                  setAccountDropdowns(prev => ({
                                    ...prev,
                                    [item.id]: !prev[item.id]
                                  }));
                                }}
                                className={`${itemTableSelectClass} cursor-pointer justify-between`}
                              >
                                <span className={`${item.account ? "" : "text-gray-400"} min-w-0 flex-1 truncate`}>
                                  {item.account || "Select an account"}
                                </span>
                                {accountOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                              {accountOpen && accountDropdownPosition[item.id] && createPortal(
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-[300px] overflow-hidden flex flex-col"
                                  style={{
                                    position: "fixed",
                                    top: `${accountDropdownPosition[item.id].top}px`,
                                    left: `${accountDropdownPosition[item.id].left}px`,
                                    width: `${accountDropdownPosition[item.id].width}px`,
                                    zIndex: 10000,
                                  }}
                                >
                                  <div className="p-2 border-b border-gray-200">
                                    <div className="flex h-10 w-full items-center gap-2 rounded-md border border-gray-300 px-2.5 focus-within:border-blue-500">
                                      <Search size={14} className="text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={accountSearch}
                                        onChange={(e) => {
                                          setAccountSearches(prev => ({
                                            ...prev,
                                            [item.id]: e.target.value
                                          }));
                                        }}
                                        className="w-full border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[250px] overflow-y-auto py-1">
                                    {Object.keys(filteredAccounts).length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 text-sm">
                                        No accounts found
                                      </div>
                                    ) : (
                                      (Object.entries(filteredAccounts) as [string, string[]][]).map(([category, accounts]) => (
                                        <div key={category}>
                                          <div className="px-4 py-2 text-xs font-bold text-gray-900 uppercase" style={{ fontWeight: "600" }}>
                                            {category}
                                          </div>
                                          {accounts.map((account) => (
                                            <button
                                              key={account}
                                              type="button"
                                              onClick={() => {
                                                handleItemChange(item.id, "account", account);
                                                setAccountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                                setAccountSearches(prev => ({ ...prev, [item.id]: "" }));
                                                setAccountDropdownPosition((prev) => {
                                                  const newPos = { ...prev };
                                                  delete newPos[item.id];
                                                  return newPos;
                                                });
                                              }}
                                              className="w-full px-4 py-2 text-sm text-left hover:bg-teal-50"
                                              style={{
                                                paddingLeft: "32px",
                                                color: "#111827"
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#eff6ff";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                              }}
                                            >
                                              {account}
                                            </button>
                                          ))}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <div className="border-t border-gray-200">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAccountDropdowns(prev => ({ ...prev, [item.id]: false }));
                                        setAccountDropdownPosition((prev) => {
                                          const newPos = { ...prev };
                                          delete newPos[item.id];
                                          return newPos;
                                        });
                                        setShowNewAccountModal(true);
                                        setNewAccountData({
                                          accountType: "Fixed Asset",
                                          accountName: "",
                                          isSubAccount: false,
                                          accountCode: "",
                                          description: "",
                                          showInZohoExpense: false,
                                        });
                                      }}
                                      className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 text-teal-700 hover:bg-teal-50"
                                    >
                                      <Plus size={16} className="text-teal-700" />
                                      New Account
                                    </button>
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm align-top">
                            <div className="flex min-h-[128px] flex-col items-stretch justify-start">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                                className={`${itemTableInputClass} text-right tabular-nums`}
                              />
                              {rowTrackInventory ? (
                                <div className="mt-2 space-y-1 text-center text-[11px] leading-4 pb-1">
                                  <div className="text-gray-700">
                                    <span className="font-medium">Stock on Hand:</span>{" "}
                                    <span className="text-gray-900">
                                      {rowStockQuantity.toFixed(2)} {rowUnit}
                                    </span>
                                  </div>
                                  {warehouseLocation ? (
                                    <div className="flex items-center justify-center gap-1 text-blue-500">
                                      <Building2 size={12} />
                                      <span>{warehouseLocation}</span>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <input
                              type="text"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                              className={`${itemTableInputClass} w-full text-right tabular-nums`}
                            />
                          </td>
                          <td className="px-0 py-2.5 text-sm" style={{ width: 0 }}>
                            <div
                              className="relative"
                              ref={(el) => {
                                taxRefs.current[item.id] = el;
                              }}
                            >
                              {item.tax ? (
                                <div className="min-h-11 px-3 py-2.5 text-sm text-gray-700 flex items-center">
                                  <span className="min-w-0 flex-1 truncate">{getTaxDisplayLabel(item.tax)}</span>
                                </div>
                              ) : null}
                              {taxDropdowns[item.id] && taxDropdownPosition[item.id] && createPortal(
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-[300px] overflow-hidden flex flex-col"
                                  style={{
                                    position: "fixed",
                                    top: `${taxDropdownPosition[item.id].top}px`,
                                    left: `${taxDropdownPosition[item.id].left}px`,
                                    width: `${taxDropdownPosition[item.id].width}px`,
                                    zIndex: 10000,
                                  }}
                                >
                                  <div className="p-2 border-b border-gray-200">
                                    <div className="flex h-10 w-full items-center gap-2 rounded-md border border-gray-300 px-2.5 focus-within:border-blue-500">
                                      <Search size={14} className="text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={taxSearches[item.id] || ""}
                                        onChange={(e) => {
                                          setTaxSearches(prev => ({
                                            ...prev,
                                            [item.id]: e.target.value
                                          }));
                                        }}
                                        className="w-full border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[250px] overflow-y-auto py-1">
                                    {taxes.filter(tax =>
                                      (tax.name || "").toLowerCase().includes((taxSearches[item.id] || "").toLowerCase())
                                    ).length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 text-sm">
                                        No taxes found
                                      </div>
                                    ) : (
                                      taxes.filter(tax =>
                                        (tax.name || "").toLowerCase().includes((taxSearches[item.id] || "").toLowerCase())
                                      ).map((tax) => {
                                        const isSelected = item.tax === tax.name;
                                        return (
                                          <button
                                            key={tax.id || tax._id || tax.name}
                                            type="button"
                                            onClick={() => {
                                              handleItemChange(item.id, "tax", tax.name);
                                              setTaxDropdowns(prev => ({ ...prev, [item.id]: false }));
                                              setTaxSearches(prev => ({ ...prev, [item.id]: "" }));
                                              setTaxDropdownPosition((prev) => {
                                                const newPos = { ...prev };
                                                delete newPos[item.id];
                                                return newPos;
                                              });
                                            }}
                                            className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}
                                          >
                                            <span className={isSelected ? "text-teal-700 font-medium" : "text-gray-900"}>
                                              {getTaxDisplayLabel(tax)}
                                            </span>
                                            {isSelected && <Check size={16} className="text-teal-700" />}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <div
                              className="relative"
                              ref={(el) => {
                                customerRefs.current[item.id] = el;
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  const button = e.currentTarget;
                                  const buttonRect = button.getBoundingClientRect();
                                  setCustomerDropdownPosition((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      top: buttonRect.bottom + 4,
                                      left: buttonRect.left,
                                      width: Math.max(buttonRect.width + 20, 240)
                                    }
                                  }));
                                  setCustomerDropdowns(prev => ({
                                    ...prev,
                                    [item.id]: !prev[item.id]
                                  }));
                                }}
                                className={`${itemTableSelectClass} cursor-pointer justify-start`}
                              >
                                <span className={`${item.customerDetails ? "" : "text-transparent"} min-w-0 flex-1 truncate`}>
                                  {item.customerDetails || "\u00A0"}
                                </span>
                              </button>
                              {customerOpen && customerDropdownPosition[item.id] && createPortal(
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-white rounded-lg shadow-lg border border-gray-200 max-h-[300px] overflow-hidden flex flex-col"
                                  style={{
                                    position: "fixed",
                                    top: `${customerDropdownPosition[item.id].top}px`,
                                    left: `${customerDropdownPosition[item.id].left}px`,
                                    width: `${customerDropdownPosition[item.id].width}px`,
                                    zIndex: 10000,
                                  }}
                                >
                                  <div className="p-2 border-b border-gray-200">
                                    <div className="flex h-10 w-full items-center gap-2 rounded-md border border-gray-300 px-2.5 focus-within:border-blue-500">
                                      <Search size={14} className="text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search"
                                        value={customerSearch}
                                        onChange={(e) => {
                                          setCustomerSearches(prev => ({
                                            ...prev,
                                            [item.id]: e.target.value
                                          }));
                                        }}
                                        className="w-full border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[250px] overflow-y-auto py-1">
                                    {filteredCustomers.length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 text-sm">
                                        No customers found
                                      </div>
                                    ) : (
                                      filteredCustomers.map((customer) => {
                                        const isSelected = item.customerDetails === customer;
                                        return (
                                          <div
                                            key={customer}
                                            onClick={() => {
                                              console.log("Customer selected:", customer); // Debug
                                              handleItemChange(item.id, "customerDetails", customer);
                                              setCustomerDropdowns(prev => ({ ...prev, [item.id]: false }));
                                              setCustomerSearches(prev => ({ ...prev, [item.id]: "" }));
                                              setCustomerDropdownPosition((prev) => {
                                                const newPos = { ...prev };
                                                delete newPos[item.id];
                                                return newPos;
                                              });
                                            }}
                                            className={`px-4 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""
                                              }`}
                                          >
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                                              {customer.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="flex-1">{customer}</span>
                                            {isSelected && <Check size={14} className="text-teal-700" />}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                  <div
                                    className="px-4 py-2 border-t border-gray-200 text-teal-700 cursor-pointer hover:bg-teal-50 flex items-center gap-2"
                                    onClick={() => {
                                      setCustomerDropdowns(prev => ({ ...prev, [item.id]: false }));
                                      setCustomerDropdownPosition((prev) => {
                                        const newPos = { ...prev };
                                        delete newPos[item.id];
                                        return newPos;
                                      });
                                      setShowNewCustomerModal(true);
                                    }}
                                  >
                                    <Plus size={14} />
                                    New Customer
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <div className="flex items-center justify-end">
                              <input
                                type="text"
                                value={parseFloat(String(item.amount || 0)).toFixed(2)}
                                readOnly
                                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-right text-sm font-medium text-gray-900 tabular-nums shadow-sm outline-none"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-sm">
                            <div className="flex items-center justify-end gap-2 pt-2">
                              <div
                                style={{ position: "relative", zIndex: rowMenuOpen[item.id] ? 2000 : "auto" }}
                                ref={(el) => {
                                  rowMenuRefs.current[item.id] = el;
                                }}
                              >
                                <MoreVertical
                                  size={16}
                                  style={{ color: "#9ca3af", cursor: "pointer" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRowMenuOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                                  }}
                                />
                                {rowMenuOpen[item.id] && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      right: 0,
                                      backgroundColor: "#ffffff",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "4px",
                                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                      zIndex: 10,
                                      minWidth: "180px",
                                      overflow: "hidden"
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Clone row logic
                                        const newItem = { ...item, id: Date.now() };
                                        setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
                                        setRowMenuOpen(prev => ({ ...prev, [item.id]: false }));
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        textAlign: "left",
                                        border: "none",
                                        backgroundColor: "transparent",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        color: "#374151"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                      Clone Row
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Insert New Row logic
                                        const index = formData.items.findIndex(i => i.id === item.id);
                                        const newItems = [...formData.items];
                                        newItems.splice(index + 1, 0, { id: Date.now(), itemDetails: "", account: "", quantity: "1.00", rate: "0.00", discount: "0 %-", tax: "", customerDetails: "", amount: "0.00" });
                                        setFormData(prev => ({ ...prev, items: newItems }));
                                        setRowMenuOpen(prev => ({ ...prev, [item.id]: false }));
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        textAlign: "left",
                                        border: "none",
                                        backgroundColor: "transparent",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        color: "#374151"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                      Insert New Row
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRowMenuOpen(prev => ({ ...prev, [item.id]: false }));
                                        // Bulk items insert logic
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        textAlign: "left",
                                        border: "none",
                                        backgroundColor: "transparent",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        color: "#374151"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                      Insert Items in Bulk
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        textAlign: "left",
                                        border: "none",
                                        backgroundColor: "transparent",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        color: "#374151"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                      Insert New Header
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRow(item.id)}
                                style={{
                                  padding: "4px",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#156372",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "4px",
                                  transition: "background-color 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#fef2f2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Additional Fields Row for each item */}
                        {showAdditionalFields && (
                          <tr>
                            <td colSpan={8} className="px-3 pb-4 pt-0" style={{ borderTop: "none" }}>
                              <div style={{
                                display: "flex",
                                flexDirection: "row",
                                gap: "16px",
                                alignItems: "center",
                                paddingLeft: "56px",
                              }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <Tag size={16} style={{ color: "#9ca3af" }} />
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "6px 12px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "6px",
                                      backgroundColor: "#ffffff",
                                      cursor: "pointer",
                                      position: "relative",
                                    }}
                                    ref={(el) => {
                                      itemReportingTagsRefs.current[item.id] = el;
                                      reportingTagsMenuRefs.current[item.id] = el;
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentTags = Array.isArray((item as any).reportingTags) ? (item as any).reportingTags : [];
                                      const draftValues: Record<string, string> = {};
                                      currentTags.forEach((entry: any) => {
                                        const tagId = String(entry?.tagId || entry?.id || "").trim();
                                        if (!tagId) return;
                                        draftValues[tagId] = String(entry?.value || "");
                                      });
                                      setItemReportingTagDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: draftValues,
                                      }));
                                      setItemReportingTagsOpen((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id]
                                      }));
                                    }}
                                  >
                                    <Tag size={14} style={{ color: availableReportingTags.length > 0 ? "#ef4444" : "#6b7280" }} />
                                    <span style={{ fontSize: "14px", color: availableReportingTags.length > 0 ? "#ef4444" : "#6b7280" }}>
                                      Reporting Tags
                                    </span>
                                    <ChevronDown size={14} style={{ color: availableReportingTags.length > 0 ? "#6b7280" : "#6b7280" }} />
                                    {itemReportingTagsOpen[item.id] && reportingTagsTriggerRef && reportingTagsTriggerRect && typeof document !== 'undefined' && document.body && createPortal(
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        ref={(el) => {
                                          reportingTagsMenuRefs.current[item.id] = el;
                                        }}
                                        style={{
                                          position: "fixed",
                                          top: `${reportingTagsTriggerRect.bottom + 4}px`,
                                          left: `${reportingTagsTriggerRect.left}px`,
                                          backgroundColor: "#ffffff",
                                          border: "1px solid #d1d5db",
                                          borderRadius: "6px",
                                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                          zIndex: 10000,
                                          minWidth: "420px",
                                          width: "420px",
                                        }}
                                      >
                                        <div className="border-b border-gray-200 px-5 py-4">
                                          <div className="text-[18px] font-semibold text-gray-900">Reporting Tags</div>
                                        </div>

                                        <div className="px-5 py-4">
                                          {isReportingTagsLoading ? (
                                            <div className="text-sm text-gray-500">Loading reporting tags...</div>
                                          ) : availableReportingTags.length === 0 ? (
                                            <div className="text-sm text-gray-600">
                                              There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
                                            </div>
                                          ) : (
                                            <div className="space-y-4">
                                              {availableReportingTags.map((tag) => {
                                                const tagId = String(tag?._id || tag?.id || "").trim();
                                                if (!tagId) return null;
                                                const tagName = String(tag?.name || "Tag").trim();
                                                const isRequired = Boolean(tag?.isRequired || tag?.required);
                                                const selectedValue = String(itemReportingTagDrafts[item.id]?.[tagId] || "");
                                                const options = [
                                                  { value: "", label: "None" },
                                                  ...((Array.isArray(tag?.options) ? tag.options : []) as string[]).map((option) => ({
                                                    value: option,
                                                    label: option,
                                                  })),
                                                ];
                                                const selectedLabel = options.find((option) => option.value === selectedValue)?.label || "None";
                                                const optionKey = `${item.id}:${tagId}`;
                                                const optionMenuOpen = reportingTagOptionOpenKey === optionKey;

                                                return (
                                                  <div key={tagId} className="grid grid-cols-1 gap-2">
                                                    <label className={`text-sm font-medium ${isRequired ? "text-red-600" : "text-gray-700"}`}>
                                                      {tagName}{isRequired ? " *" : ""}
                                                    </label>
                                                    <div className="relative">
                                                      <button
                                                        type="button"
                                                        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:border-blue-500"
                                                        onClick={() => {
                                                          setReportingTagOptionOpenKey((prev) => prev === optionKey ? null : optionKey);
                                                        }}
                                                      >
                                                        <span className={`${selectedValue ? "text-gray-900" : "text-gray-400"} min-w-0 flex-1 truncate text-left`}>
                                                          {selectedLabel}
                                                        </span>
                                                        <ChevronDown size={16} className={`shrink-0 text-gray-500 transition-transform ${optionMenuOpen ? "rotate-180" : ""}`} />
                                                      </button>

                                                      {optionMenuOpen && (
                                                        <div className="absolute left-0 right-0 top-full z-[12001] mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                                          <div className="max-h-56 overflow-y-auto py-1">
                                                            {options.map((option) => {
                                                              const isSelected = option.value === selectedValue;
                                                              return (
                                                                <button
                                                                  key={`${optionKey}-${option.value}`}
                                                                  type="button"
                                                                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 ${
                                                                    isSelected ? "bg-gray-50 font-medium text-gray-900" : ""
                                                                  }`}
                                                                  onClick={() => {
                                                                    setItemReportingTagDrafts((prev) => {
                                                                      const next = { ...(prev || {}) };
                                                                      const rowDrafts = { ...(next[item.id] || {}) };
                                                                      if (!option.value) {
                                                                        delete rowDrafts[tagId];
                                                                      } else {
                                                                        rowDrafts[tagId] = option.value;
                                                                      }
                                                                      next[item.id] = rowDrafts;
                                                                      return next;
                                                                    });
                                                                    setReportingTagOptionOpenKey(null);
                                                                  }}
                                                                >
                                                                  <span className="truncate">{option.label}</span>
                                                                  {isSelected ? <Check size={14} className="text-gray-900" /> : null}
                                                                </button>
                                                              );
                                                            })}
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-3 border-t border-gray-200 px-5 py-4">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentTags = Array.isArray((item as any).reportingTags) ? (item as any).reportingTags : [];
                                              const draftValues: Record<string, string> = {};
                                              currentTags.forEach((entry: any) => {
                                                const tagId = String(entry?.tagId || entry?.id || "").trim();
                                                if (!tagId) return;
                                                draftValues[tagId] = String(entry?.value || "");
                                              });
                                              setItemReportingTagDrafts((prev) => ({ ...prev, [item.id]: draftValues }));
                                              setItemReportingTagsOpen((prev) => ({ ...prev, [item.id]: false }));
                                              setReportingTagOptionOpenKey(null);
                                            }}
                                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const rowDrafts = itemReportingTagDrafts[item.id] || {};
                                              const nextTags = availableReportingTags
                                                .map((tag) => {
                                                  const tagId = String(tag?._id || tag?.id || "").trim();
                                                  if (!tagId) return null;
                                                  const value = String(rowDrafts[tagId] || "").trim();
                                                  if (!value) return null;
                                                  return {
                                                    tagId,
                                                    name: String(tag?.name || "Tag").trim(),
                                                    value,
                                                  };
                                                })
                                                .filter(Boolean);

                                              handleItemChange(item.id, "reportingTags", nextTags);
                                              setItemReportingTagsOpen((prev) => ({ ...prev, [item.id]: false }));
                                              setReportingTagOptionOpenKey(null);
                                            }}
                                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>

              <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                {/* Left Side - Buttons stacked vertically */}
                <div className="flex flex-col gap-3">
                  {/* Add New Row Button */}
                  <div className="relative" ref={addNewRowRef}>
                    <button
                      type="button"
                      onClick={() => setAddNewRowDropdownOpen(!addNewRowDropdownOpen)}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md border border-gray-200 cursor-pointer flex items-center gap-2 hover:bg-gray-200"
                    >
                      <Plus size={16} />
                      Add New Row
                      <ChevronDown size={14} />
                    </button>
                    {addNewRowDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[10000] min-w-[200px] py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddRowAction("Add New Row");
                            addNewRow();
                            setAddNewRowDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 rounded-md mx-1 my-1"
                          style={{
                            backgroundColor: "#156372",
                            color: "#ffffff",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#0D4A52";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#156372";
                          }}
                        >
                          <Plus size={16} />
                          Add New Row
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddRowAction("Add Items in Bulk");
                            setBulkItemsInsertIndex(formData.items.length - 1);
                            setShowBulkItemsModal(true);
                            setBulkItemsSearch("");
                            setSelectedBulkItems([]);
                            setBulkItemQuantities({});
                            setAddNewRowDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-left"
                          style={{
                            backgroundColor: "transparent",
                            color: "#111827",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          Add Items in Bulk
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary - Bottom Right */}
                <div className="w-full max-w-[420px] flex-shrink-0 xl:ml-auto">
                  <div className="rounded-3xl border border-gray-200 bg-gray-50/80 px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-[14px] font-semibold leading-none text-gray-900">Sub Total</div>
                        <div className="text-[13px] font-medium leading-none text-gray-900">
                          Total Quantity : {getTotalQuantity(formData.items)}
                        </div>
                      </div>
                      <span className="text-[14px] font-semibold text-gray-900 tabular-nums">{formData.subTotal}</span>
                    </div>
                    {showTransactionDiscount && (
                      <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-4">
                        <label className="text-[14px] font-medium text-gray-700">Discount</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData.discount.value}
                            onChange={(e) => handleDiscountChange(e.target.value)}
                            className={`h-10 w-28 rounded-l-lg border border-gray-200 bg-white px-3 text-right text-sm outline-none ${fieldFocusClass}`}
                            min="0"
                            max="100"
                          />
                          <span className="-ml-2 flex h-10 w-8 items-center justify-center rounded-r-lg border border-l-0 border-gray-200 bg-white text-sm text-gray-600">%</span>
                          <span className="w-24 text-right text-[14px] font-medium text-gray-900 tabular-nums">{formData.discountAmount}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-between">
                      <label className="text-[14px] font-medium text-gray-700">
                        Tax {String(taxMode || "").toLowerCase().includes("inclusive") ? "(Included)" : ""}
                      </label>
                      <span className="text-[14px] font-medium text-gray-900 tabular-nums">{formData.taxAmount || "0.00"}</span>
                    </div>
                    <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
                      <label className="text-[14px] font-medium text-gray-700">Adjustment</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={formData.adjustment || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, adjustment: e.target.value }))}
                          className={`h-10 w-32 rounded-lg border border-gray-200 bg-white px-3 text-right text-sm outline-none ${fieldFocusClass}`}
                        />
                        <Info size={14} className="text-gray-400" />
                        <span className="w-24 text-right text-[14px] font-medium text-gray-900 tabular-nums">{(parseFloat(String(formData.adjustment || 0)) || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5">
                      <span className="text-[17px] font-semibold text-gray-900">Total</span>
                      <span className="text-[17px] font-semibold text-gray-900 tabular-nums">{formData.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Attachments */}
          <div className="mb-8 border-y border-gray-200 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6 lg:border-r lg:border-gray-200">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">Notes</label>
                <div className="relative">
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="px-3 py-3 border border-gray-300 rounded-md text-sm outline-none resize-y min-h-[70px] font-inherit w-full box-border focus:border-teal-600"
                  />
                  <Pencil size={16} className="absolute bottom-3 right-3 text-gray-400" />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  It will not be shown in PDF
                </div>
              </div>

              <div className="p-6">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">Attach File(s) to Bill</label>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={uploadMenuRef}>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm border-2 border-dashed border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer flex items-center gap-2 hover:border-gray-400 transition-colors"
                      onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                    >
                      <Upload size={16} />
                      Upload File
                      <ChevronDown size={14} />
                    </button>
                    {uploadMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-md border border-gray-200 min-w-[220px] z-[100] py-1">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left hover:bg-[#0D4A52] hover:text-white flex items-center"
                          onClick={handleAttachFromDesktop}
                        >
                          Attach From Desktop
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left hover:bg-[#0D4A52] hover:text-white flex items-center"
                          onClick={handleAttachFromDocuments}
                        >
                          Attach From Documents
                        </button>
                        <div className="px-4 py-2">
                          <button
                            type="button"
                            className="text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left hover:bg-[#0D4A52] hover:text-white flex items-center"
                            onClick={() => handleAttachFromCloud()}
                          >
                            Attach From Cloud
                          </button>
                          <div className="flex items-center gap-2 mt-2 ml-0">
                          {/* Documents - Light blue folder with graph/chart */}
                          <button
                            type="button"
                            onClick={() => handleAttachFromCloud("documents")}
                            className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 cursor-pointer"
                            title="Documents"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                              {/* Folder shape */}
                              <path d="M4 6C4 5.44772 4.44772 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L11.7071 6.70711C11.8946 6.89464 12.149 7 12.4142 7H19C19.5523 7 20 7.44772 20 8V18C20 18.5523 19.5523 19 19 19H5C4.44772 19 4 18.5523 4 18V6Z" stroke="#4A90E2" strokeWidth="1.5" fill="#E3F2FD" />
                              {/* Chart/graph lines inside */}
                              <path d="M8 13L10 11L12 13L14 10L16 12" stroke="#4A90E2" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M8 13V15M10 11V15M12 13V15M14 10V15M16 12V15" stroke="#4A90E2" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                          {/* Green Chameleon/Gecko Icon */}
                          <button
                            type="button"
                            onClick={() => handleAttachFromCloud("chameleon")}
                            className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 cursor-pointer"
                            title="Chameleon"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path d="M12 2C8 2 5 5 5 9C5 11 6 13 7 14C7 15 6 16 5 17C5 18 6 19 7 19C8 20 9 21 11 21C13 21 14 20 15 19C16 19 17 18 17 17C16 16 15 15 15 14C16 13 17 11 17 9C17 5 14 2 12 2Z" fill="#22C55E" />
                              <circle cx="10" cy="8" r="1" fill="#FFFFFF" />
                              <circle cx="14" cy="8" r="1" fill="#FFFFFF" />
                              <path d="M9 11C9.5 11.5 10.5 11.5 11 11" stroke="#FFFFFF" strokeWidth="1" fill="none" />
                              <path d="M18 6C18.5 5.5 19 5 20 5" stroke="#22C55E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                          </button>
                          {/* Google Drive - Multi-color triangular icon */}
                          <button
                            type="button"
                            onClick={() => handleAttachFromCloud("googledrive")}
                            className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 cursor-pointer"
                            title="Google Drive"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M7.71 2.5L2.5 12.5l5.21 10h8.58L21.5 12.5 16.29 2.5z" />
                              <path fill="#34A853" d="M7.71 2.5L2.5 12.5h10.42L16.29 2.5z" />
                              <path fill="#FBBC04" d="M16.29 2.5L21.5 12.5 7.71 22.5l-5.21-10z" />
                              <path fill="#EA4335" d="M7.71 22.5L2.5 12.5h10.42l5.21 10z" />
                            </svg>
                          </button>
                          {/* Box - Light blue square with "box" text */}
                          <button
                            type="button"
                            onClick={() => handleAttachFromCloud("box")}
                            className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 cursor-pointer"
                            title="Box"
                          >
                            <div className="w-5 h-5 bg-blue-400 rounded flex items-center justify-center">
                              <span className="text-white text-[6px] font-sans lowercase leading-none">box</span>
                            </div>
                          </button>
                          {/* Dropbox - Blue abstract box/squares */}
                          <button
                            type="button"
                            onClick={() => handleAttachFromCloud("dropbox")}
                            className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 cursor-pointer"
                            title="Dropbox"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#0061FF" d="M6 2L2 7L6 12L10 7L6 2Z" />
                              <path fill="#0061FF" d="M18 2L14 7L18 12L22 7L18 2Z" />
                              <path fill="#0061FF" d="M6 12L2 17L6 22L10 17L6 12Z" />
                              <path fill="#0061FF" d="M18 12L14 17L18 22L22 17L18 12Z" />
                            </svg>
                          </button>
                          {/* Generic Cloud - Solid blue cloud icon */}
                          <button
                            type="button"
                            onClick={() => handleAttachFromCloud("cloud")}
                            className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 cursor-pointer"
                            title="Cloud Storage"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.36 10.04Z" fill="#0061FF" />
                            </svg>
                          </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                  {attachedFiles.length > 0 && (
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] transition-colors"
                    >
                      <Paperclip size={16} />
                      {attachedFiles.length}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  You can upload a maximum of 5 files, 10MB each
                </p>
                {attachedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id || file.name}
                        className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200"
                      >
                        <File size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id || file.name)}
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
          </div>

        </div>
      </form>
      {/* Footer */}
      <div
        className="fixed bottom-0 right-0 z-20 flex-shrink-0 border-t border-gray-200 bg-white/95 px-6 py-4 shadow-[0_-10px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
        style={{ left: "240px" }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, "draft")}
              disabled={!!saveLoadingState}
              className="cursor-pointer bg-white text-gray-900 px-5 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-semibold shadow-sm"
            >
              {saveLoadingState === "draft" ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, "open")}
              disabled={!!saveLoadingState}
              className="cursor-pointer bg-[#156372] text-white px-5 py-2 rounded-md border border-[#156372] hover:bg-[#0D4A52] text-sm font-semibold shadow-sm"
            >
              {saveLoadingState === "open" ? "Saving..." : "Save as Open"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={!!saveLoadingState}
              className="cursor-pointer bg-white text-gray-900 px-5 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-semibold shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="flex items-center gap-6 justify-start xl:justify-end">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700 flex items-center gap-2">
              PDF Template: <span className="font-medium">'Standard Template'</span>
              <a href="#" className="text-teal-700 no-underline" onClick={(e) => e.preventDefault()}>
                Change
              </a>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, makeRecurring: !prev.makeRecurring }))}
              className="text-sm text-teal-700 hover:text-teal-800 bg-transparent border-none cursor-pointer flex items-center gap-1"
            >
              <Repeat2 size={14} />
              Make Recurring
            </button>
          </div>
        </div>
        </div>
      </div>
      </div>

      {/* New Vendor Modal */}
      <NewVendorModal
        isOpen={showNewVendorModal}
        onClose={() => setShowNewVendorModal(false)}
        onVendorCreated={handleVendorCreated}
      />

      {/* Advanced Vendor Search Modal */}
      {vendorSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setVendorSearchModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Advanced Vendor Search</h2>
              <button
                type="button"
                onClick={() => setVendorSearchModalOpen(false)}
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center hover:bg-[#0D4A52]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-2">
                <div className="relative vendor-search-criteria-dropdown">
                  <button
                    type="button"
                    onClick={() => setVendorSearchCriteriaOpen(!vendorSearchCriteriaOpen)}
                    className="px-4 py-2 border border-gray-300 rounded-l-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {vendorSearchCriteria}
                    <ChevronDown size={16} />
                  </button>
                  {vendorSearchCriteriaOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px]">
                      {["Display Name", "Email", "Company Name", "Phone"].map((criteria) => (
                        <button
                          key={criteria}
                          type="button"
                          onClick={() => {
                            setVendorSearchCriteria(criteria);
                            setVendorSearchCriteriaOpen(false);
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
                  value={vendorSearchTerm}
                  onChange={(e) => setVendorSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVendorSearch()}
                  placeholder="Enter search term"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleVendorSearch}
                  className="px-6 py-2 bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] font-medium"
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">VENDOR NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">EMAIL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">COMPANY NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PHONE</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendorPaginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {vendorSearchTerm ? "No vendors found" : "Enter a search term and click Search"}
                      </td>
                    </tr>
                  ) : (
                    vendorPaginatedResults.map((vendor) => (
                      <tr
                        key={getVendorId(vendor) || getVendorDisplayName(vendor)}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            ...getVendorFormFields(vendor, vendor.displayName || vendor.name || "", vendor.id || vendor._id),
                          }));
                          setVendorSearchModalOpen(false);
                          setVendorSearchTerm("");
                          setVendorSearchResults([]);
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-teal-700 hover:underline">
                          {getVendorDisplayName(vendor)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.email || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.companyName || vendor.formData?.companyName || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.workPhone || vendor.mobile || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {vendorSearchResults.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVendorSearchPage(prev => Math.max(1, prev - 1))}
                    disabled={vendorSearchPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &lt;
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {vendorStartIndex + 1} - {Math.min(vendorEndIndex, vendorSearchResults.length)} of {vendorSearchResults.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVendorSearchPage(prev => Math.min(vendorTotalPages, prev + 1))}
                    disabled={vendorSearchPage >= vendorTotalPages}
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

      {/* Documents Modal */}
      {showDocumentsModal && createPortal(
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
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDocumentsModal(false);
              setSelectedDocuments([]);
              setDocumentsSearch("");
              setSelectedInbox("Files");
            }
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111827", margin: 0 }}>
                Documents
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "12px",
                      color: "#9ca3af",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search Files"
                    value={documentsSearch}
                    onChange={(e) => setDocumentsSearch(e.target.value)}
                    style={{
                      padding: "8px 12px 8px 36px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      width: "200px",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    setShowDocumentsModal(false);
                    setSelectedDocuments([]);
                    setDocumentsSearch("");
                    setSelectedInbox("Files");
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
                  <X size={20} style={{ color: "#6b7280" }} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Sidebar */}
              <div
                style={{
                  width: "200px",
                  borderRight: "1px solid #e5e7eb",
                  padding: "20px 0",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div style={{ padding: "0 20px", marginBottom: "16px" }}>
                  <h3
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                      marginBottom: "12px",
                    }}
                  >
                    INBOXES
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {[
                      { id: "Files", icon: Folder },
                      { id: "Bank Statements", icon: Building2 },
                      { id: "All Documents", icon: Layers },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedInbox(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          background:
                            selectedInbox === item.id ? "#dbeafe" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                          borderRadius: "4px",
                          color: selectedInbox === item.id ? "#1e40af" : "#374151",
                          fontWeight: selectedInbox === item.id ? 500 : 400,
                          fontSize: "14px",
                        }}
                      >
                        <item.icon size={16} />
                        <span>{item.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 2fr 150px",
                      gap: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb",
                      marginBottom: "12px",
                    }}
                  >
                    <div></div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      FILE NAME
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      DETAILS
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                      }}
                    >
                      UPLOADED BY
                    </div>
                  </div>

                  {/* Documents List */}
                  {filteredDocuments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id || doc._id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "40px 1fr 2fr 150px",
                            gap: "16px",
                            alignItems: "center",
                            padding: "12px 0",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={selectedDocuments.includes(doc.id || doc._id)}
                              onChange={() => handleDocumentToggle(doc.id || doc._id)}
                              style={{
                                width: "16px",
                                height: "16px",
                                cursor: "pointer",
                              }}
                            />
                            <ImageIcon size={20} style={{ color: "#6b7280" }} />
                          </div>
                          <div>
                            <button
                              onClick={() => handleDocumentToggle(doc.id || doc._id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#156372",
                                fontSize: "14px",
                                textAlign: "left",
                                padding: 0,
                                textDecoration: "none",
                              }}
                            >
                              {doc.fileName || doc.name}
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#374151",
                              lineHeight: "1.6",
                            }}
                          >
                            <div>{doc.amount || "N/A"}</div>
                            <div>Vendor: {doc.vendor || "N/A"}</div>
                            <div>Date: {doc.date || (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "N/A")}</div>
                            <div>Ref #: {doc.refNumber || "N/A"}</div>
                          </div>
                          <div style={{ fontSize: "13px", color: "#374151" }}>
                            {doc.uploadedBy?.name || doc.uploadedBy || "Me"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "#6b7280",
                        fontSize: "14px",
                      }}
                    >
                      No documents found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedDocuments([]);
                  setDocumentsSearch("");
                  setSelectedInbox("Files");
                }}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: "white",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAttachSelectedDocuments}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#ec4899",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Attachments
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && createPortal(
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onSave={(customer) => {
            setShowNewCustomerModal(false);
          }}
        />,
        document.body
      )}

      {/* Configure Payment Terms Modal */}
      {showConfigurePaymentTermsModal && createPortal(
        <ConfigurePaymentTermsModal
          paymentTerms={paymentTermsList}
          onClose={() => setShowConfigurePaymentTermsModal(false)}
          onSave={async (updatedTerms) => {
            try {
              // Note: Ideally we'd have a bulk update endpoint.
              // For now, we'll just handle creations and updates.
              // Deletions are not handled in this simple sync.
              for (const term of updatedTerms) {
                if (term.isNew) {
                  await paymentTermsAPI.create(term);
                } else if (term.id || term._id) {
                  await paymentTermsAPI.update(term.id || term._id, term);
                }
              }
              await loadPaymentTerms();
              setShowConfigurePaymentTermsModal(false);
              toast.success("Payment terms updated");
            } catch (error) {
              console.error("Error saving payment terms:", error);
              toast.error("Failed to save payment terms");
            }
          }}
        />,
        document.body
      )}

      {/* New Item Modal */}
      {showNewItemModal && createPortal(
        <div style={{
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
        }} onClick={() => setShowNewItemModal(false)}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Add New Item</h2>
              <button onClick={() => setShowNewItemModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>
                  Item Name<span style={{ color: "#156372" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                  placeholder="Enter item name"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>Unit</label>
                <select
                  value={newItemData.unit}
                  onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                >
                  <option value="">Select or type to add</option>
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="m">m</option>
                  <option value="hrs">hrs</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Purchase Information</h3>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newItemData.purchasable}
                      onChange={(e) => setNewItemData({ ...newItemData, purchasable: e.target.checked })}
                    />
                    <span>Purchasable</span>
                  </label>
                  {newItemData.purchasable && (
                    <>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>
                          Cost Price<span style={{ color: "#156372" }}>*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newItemData.costPrice}
                          onChange={(e) => setNewItemData({ ...newItemData, costPrice: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                        />
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>
                          Account<span style={{ color: "#156372" }}>*</span>
                        </label>
                        <select
                          value={newItemData.purchaseAccount}
                          onChange={(e) => setNewItemData({ ...newItemData, purchaseAccount: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                        >
                          <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                          {Object.entries(structuredAccounts).map(([type, accounts]) =>
                            ['expense', 'cost_of_goods_sold', 'other_expense'].includes(type.toLowerCase()) &&
                            accounts.map(acc => (
                              <option key={`${type}-${acc}`} value={acc}>{acc}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Inventory Information</h3>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newItemData.trackInventory}
                      onChange={(e) => setNewItemData({ ...newItemData, trackInventory: e.target.checked })}
                    />
                    <span>Track Inventory for this item</span>
                  </label>
                  {newItemData.trackInventory && (
                    <>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>
                          Inventory Account<span style={{ color: "#156372" }}>*</span>
                        </label>
                        <select
                          value={newItemData.inventoryAccount}
                          onChange={(e) => setNewItemData({ ...newItemData, inventoryAccount: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                        >
                          <option value="Inventory Asset">Inventory Asset</option>
                          {Object.entries(structuredAccounts).map(([type, accounts]) =>
                            ['stock', 'other_current_asset', 'asset'].includes(type.toLowerCase()) &&
                            accounts.map(acc => (
                              <option key={`${type}-${acc}`} value={acc}>{acc}</option>
                            ))
                          )}
                        </select>
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "6px" }}>
                          Opening Stock
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newItemData.openingStock}
                          onChange={(e) => setNewItemData({ ...newItemData, openingStock: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  onClick={() => setShowNewItemModal(false)}
                  style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#ffffff", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleNewItemSave}
                  disabled={!newItemData.name}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: newItemData.name ? "#156372" : "#9ca3af",
                    color: "#ffffff",
                    cursor: newItemData.name ? "pointer" : "not-allowed",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Items Modal */}
      {showBulkItemsModal && createPortal(
        <div style={{
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
        }} onClick={() => setShowBulkItemsModal(false)}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "900px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Add Items in Bulk</h2>
              <button
                onClick={() => setShowBulkItemsModal(false)}
                style={{ padding: "4px", backgroundColor: "#156372", border: "none", borderRadius: "4px", cursor: "pointer", color: "#ffffff" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <div style={{ width: "50%", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
                  <input
                    type="text"
                    placeholder="Type to search or scan the barcode of the item"
                    value={bulkItemsSearch}
                    onChange={(e) => setBulkItemsSearch(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none" }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                  {filteredBulkItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280", fontSize: "14px" }}>
                      {items.length === 0 ? "No items available. Create items first." : "No results found. Try a different keyword."}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {filteredBulkItems.map((item) => {
                        const isSelected = selectedBulkItems.some(selected => selected.id === item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleBulkItemSelect(item)}
                            style={{
                              padding: "12px",
                              border: `1px solid ${isSelected ? "#156372" : "#e5e7eb"}`,
                              borderRadius: "6px",
                              cursor: "pointer",
                              backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                            }}
                          >
                            <div style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>{item.name}</div>
                            {item.costPrice && (
                              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                ${parseFloat(String(item.costPrice)).toFixed(2)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ width: "50%", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "500" }}>Selected Items</span>
                    <span style={{ padding: "2px 8px", backgroundColor: "#156372", color: "#ffffff", borderRadius: "12px", fontSize: "12px", fontWeight: "500" }}>
                      {selectedBulkItems.length}
                    </span>
                  </div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Total Quantity: {getTotalQuantity(formData.items)}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                  {selectedBulkItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280", fontSize: "14px" }}>
                      Click the item names from the left pane to select them
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {selectedBulkItems.map((item) => (
                        <div key={item.id} style={{ padding: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#ffffff" }}>
                          <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>{item.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <label style={{ fontSize: "12px", color: "#6b7280" }}>Quantity:</label>
                            <input
                              type="number"
                              min="1"
                              value={bulkItemQuantities[item.id] || 1}
                              onChange={(e) => handleBulkQuantityChange(item.id, e.target.value)}
                              style={{ width: "80px", padding: "6px 8px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px", outline: "none" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowBulkItemsModal(false)}
                style={{ padding: "8px 16px", fontSize: "14px", fontWeight: "500", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#ffffff", color: "#374151", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddBulkItems}
                disabled={selectedBulkItems.length === 0}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: selectedBulkItems.length > 0 ? "#156372" : "#9ca3af",
                  color: "#ffffff",
                  cursor: selectedBulkItems.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                Add Items
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Account Modal */}
      {showNewAccountModal && createPortal(
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
          onClick={() => setShowNewAccountModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#111827" }}>Create Account</h2>
              <button
                onClick={() => setShowNewAccountModal(false)}
                style={{
                  padding: "4px",
                  backgroundColor: "#0D4A52",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              {/* Form Section */}
              <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Account Type */}
                  <div style={{ position: "relative" }} ref={accountTypeDropdownRef}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#111827" }}>
                      Account Type<span style={{ color: "#0D4A52" }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAccountTypeDropdownOpen(!accountTypeDropdownOpen)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{newAccountData.accountType}</span>
                      {accountTypeDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {accountTypeDropdownOpen && (
                      <div
                        style={{
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
                        }}
                      >
                        {Object.keys(structuredAccounts).map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setNewAccountData(prev => ({ ...prev, accountType: category }));
                              setAccountTypeDropdownOpen(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              fontSize: "14px",
                              textAlign: "left",
                              border: "none",
                              backgroundColor: newAccountData.accountType === category ? "#eff6ff" : "#ffffff",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (newAccountData.accountType !== category) {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (newAccountData.accountType !== category) {
                                e.currentTarget.style.backgroundColor = "#ffffff";
                              }
                            }}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Account Name */}
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#111827" }}>
                      Account Name<span style={{ color: "#0D4A52" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newAccountData.accountName}
                      onChange={(e) => setNewAccountData(prev => ({ ...prev, accountName: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        outline: "none",
                      }}
                      placeholder="Enter account name"
                    />
                  </div>

                  {/* Make this a sub-account */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={newAccountData.isSubAccount}
                      onChange={(e) => setNewAccountData(prev => ({ ...prev, isSubAccount: e.target.checked }))}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label style={{ fontSize: "14px", color: "#111827", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      Make this a sub-account?
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>?</span>
                      </div>
                    </label>
                  </div>

                  {/* Account Code */}
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#111827" }}>
                      Account Code
                    </label>
                    <input
                      type="text"
                      value={newAccountData.accountCode}
                      onChange={(e) => setNewAccountData(prev => ({ ...prev, accountCode: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        outline: "none",
                      }}
                      placeholder="Enter account code"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#111827" }}>
                      Description
                    </label>
                    <textarea
                      value={newAccountData.description}
                      onChange={(e) => setNewAccountData(prev => ({ ...prev, description: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        outline: "none",
                        resize: "vertical",
                        minHeight: "100px",
                      }}
                      placeholder="Max. 500 characters"
                      maxLength={500}
                    />
                  </div>

                  {/* Taban Books Expense */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={newAccountData.showInZohoExpense}
                      onChange={(e) => setNewAccountData(prev => ({ ...prev, showInZohoExpense: e.target.checked }))}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label style={{ fontSize: "14px", color: "#111827", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      Show as an active account in Taban Books Expense
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>i</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div style={{ width: "280px", padding: "24px", backgroundColor: "#1e40af", borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}>
                <div style={{ color: "#ffffff" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", marginTop: 0 }}>
                    {newAccountData.accountType}
                  </h3>
                  {newAccountData.accountType === "Asset" || newAccountData.accountType === "Fixed Asset" ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p style={{ marginBottom: "12px" }}>
                        Any long term investment or an asset that cannot be converted into cash easily like:
                      </p>
                      <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0 }}>
                        <li>Land and Buildings</li>
                        <li>Plant, Machinery and Equipment</li>
                        <li>Computers</li>
                        <li>Furniture</li>
                      </ul>
                    </div>
                  ) : newAccountData.accountType === "Liability" || newAccountData.accountType === "Other Current Liability" ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p style={{ marginBottom: "12px" }}>
                        Amounts owed to others, such as:
                      </p>
                      <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0 }}>
                        <li>Accounts Payable</li>
                        <li>Loans</li>
                        <li>Credit Cards</li>
                        <li>Taxes Payable</li>
                      </ul>
                    </div>
                  ) : newAccountData.accountType === "Equity" ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p style={{ marginBottom: "12px" }}>
                        The owner's interest in the business, including:
                      </p>
                      <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0 }}>
                        <li>Owner's Capital</li>
                        <li>Retained Earnings</li>
                        <li>Drawings</li>
                      </ul>
                    </div>
                  ) : newAccountData.accountType === "Income" ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p style={{ marginBottom: "12px" }}>
                        Revenue earned from business operations, such as:
                      </p>
                      <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0 }}>
                        <li>Sales Revenue</li>
                        <li>Service Revenue</li>
                        <li>Interest Income</li>
                      </ul>
                    </div>
                  ) : newAccountData.accountType === "Expense" ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p style={{ marginBottom: "12px" }}>
                        Costs incurred in running the business, such as:
                      </p>
                      <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0 }}>
                        <li>Rent Expense</li>
                        <li>Salaries</li>
                        <li>Utilities</li>
                        <li>Office Supplies</li>
                      </ul>
                    </div>
                  ) : newAccountData.accountType === "Cost Of Goods Sold" ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p style={{ marginBottom: "12px" }}>
                        Direct costs attributable to the production of goods sold, such as:
                      </p>
                      <ul style={{ listStyle: "disc", paddingLeft: "20px", margin: 0 }}>
                        <li>Raw Materials</li>
                        <li>Direct Labor</li>
                        <li>Manufacturing Overhead</li>
                      </ul>
                    </div>
                  ) : (
                    <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                      <p>Select an account type to see more information.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowNewAccountModal(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (newAccountData.accountName) {
                    try {
                      const payload = {
                        name: newAccountData.accountName,
                        type: newAccountData.accountType,
                        code: newAccountData.accountCode,
                        description: newAccountData.description,
                        is_active: true
                      };
                      const response = await accountantAPI.createAccount(payload);
                      if (response && (response.code === 0 || response.success)) {
                        toast.success("Account created successfully");
                        // Ideally we'd refresh the account list here, but it's hardcoded in EXPENSE_ACCOUNTS_STRUCTURE
                      }
                    } catch (error) {
                      console.error("Error creating account:", error);
                      toast.error("Failed to create account");
                    }
                    setShowNewAccountModal(false);
                  }
                }}
                disabled={!newAccountData.accountName}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: newAccountData.accountName ? "#0D4A52" : "#9ca3af",
                  color: "#ffffff",
                  cursor: newAccountData.accountName ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => {
                  if (newAccountData.accountName) {
                    e.currentTarget.style.backgroundColor = "#0D4A52";
                  }
                }}
                onMouseLeave={(e) => {
                  if (newAccountData.accountName) {
                    e.currentTarget.style.backgroundColor = "#0D4A52";
                  }
                }}
              >
                Save and Select
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Configure Payment Terms Modal Component
function ConfigurePaymentTermsModal({
  paymentTerms,
  onClose,
  onSave,
}: {
  paymentTerms: PaymentTerm[];
  onClose: () => void;
  onSave: (updatedTerms: Array<PaymentTerm & { id?: string; _id?: string; isNew?: boolean }>) => void;
}) {
  const [terms, setTerms] = useState(paymentTerms);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleAddNew = () => {
    setTerms([
      ...terms,
      {
        name: "",
        days: 0,
        isDefault: false,
        isNew: true,
      }
    ]);
  };

  const handleTermChange = (
    index: number,
    field: keyof PaymentTerm | "isNew" | "id" | "_id",
    value: string | number | boolean | null
  ) => {
    const updatedTerms = terms.map((term: PaymentTerm, i: number) => {
      if (i === index) {
        return { ...term, [field]: value };
      }
      return term;
    });
    setTerms(updatedTerms);
  };

  const handleMarkAsDefault = (index: number) => {
    const updatedTerms = terms.map((term: PaymentTerm, i: number) => ({
      ...term,
      isDefault: i === index,
    }));
    setTerms(updatedTerms);
  };

  const handleDelete = (index: number) => {
    if (terms.length > 1) {
      const updatedTerms = terms.filter((_, i) => i !== index);
      setTerms(updatedTerms);
    }
  };

  const handleSave = () => {
    // Remove temporary isNew flag and validate
    const validTerms = terms
      .filter(term => term.name.trim() !== "")
      .map(({ isNew, ...term }) => term);
    onSave(validTerms);
  };

  const modalStyles: Record<string, React.CSSProperties> = {
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
      width: "100%",
      maxWidth: "600px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      color: "#156372",
      background: "#ffffff",
      border: "1px solid #156372",
      borderRadius: "4px",
      cursor: "pointer",
      padding: "4px 8px",
      display: "flex",
      alignItems: "center",
      width: "32px",
      height: "32px",
      justifyContent: "center",
    },
    body: {
      padding: "24px",
      flex: 1,
      overflowY: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    tableHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    th: {
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      textTransform: "uppercase",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #e5e7eb",
      fontSize: "14px",
      color: "#111827",
    },
    input: {
      padding: "6px 8px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      outline: "none",
      boxSizing: "border-box",
    },
    actions: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    actionLink: {
      fontSize: "12px",
      cursor: "pointer",
      textDecoration: "none",
      background: "none",
      border: "none",
      padding: 0,
    },
    addButton: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      background: "none",
      border: "none",
      padding: "8px 0",
      marginTop: "12px",
    },
    footer: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      justifyContent: "flex-start",
      gap: "12px",
    },
    button: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      cursor: "pointer",
      border: "none",
    },
    buttonCancel: {
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
    },
    buttonSave: {
      backgroundColor: "#156372",
      color: "#ffffff",
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Configure Payment Terms</h2>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={20} />
          </button>
        </div>

        <div style={modalStyles.body}>
          <table style={modalStyles.table}>
            <thead style={modalStyles.tableHeader}>
              <tr>
                <th style={modalStyles.th}>TERM NAME</th>
                <th style={modalStyles.th}>NUMBER OF DAYS</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term, index) => (
                <tr
                  key={index}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={modalStyles.td}>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) => handleTermChange(index, "name", e.target.value)}
                      placeholder="Term name"
                      style={modalStyles.input}
                    />
                  </td>
                  <td style={modalStyles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                        {term.name === "Due end of the month" || term.name === "Due end of next month" || term.name === "Custom" ? (
                          <span style={{ fontSize: "14px", color: "#6b7280" }}>-</span>
                        ) : (
                          <input
                            type="number"
                            value={term.days !== null && term.days !== undefined ? term.days : ""}
                            onChange={(e) => handleTermChange(index, "days", e.target.value ? parseInt(e.target.value) : 0)}
                            placeholder="Days"
                            style={{ ...modalStyles.input, width: "100px" }}
                          />
                        )}
                      </div>
                      {hoveredRow === index && !term.isNew && terms.length > 1 && (
                        <div style={modalStyles.actions}>
                          {!term.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsDefault(index)}
                              style={{ ...modalStyles.actionLink, color: "#156372" }}
                            >
                              Mark as Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(index)}
                            style={{ ...modalStyles.actionLink, color: "#156372", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={handleAddNew} style={modalStyles.addButton}>
            <Plus size={16} />
            Add New
          </button>
        </div>

        <div style={modalStyles.footer}>
          <button
            type="button"
            onClick={handleSave}
            style={{ ...modalStyles.button, ...modalStyles.buttonSave }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ ...modalStyles.button, ...modalStyles.buttonCancel }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// New Customer Modal Component
function NewCustomerModal({ onClose, onSave }: { onClose: () => void; onSave: (customer: any) => void }) {
  const { code: baseCurrencyCode } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const [formData, setFormData] = useState<any>({
    customerType: "Business",
    salutation: "",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    workPhone: "",
    mobile: "",
    customerLanguage: "English",
    locationCode: "",
    currency: `${resolvedBaseCurrency}- Base Currency`,
    openingBalance: "",
    paymentTerms: "Due on Receipt",
    enablePortal: false,
    billingAttention: "",
    billingCountry: "",
    billingStreet1: "",
    billingStreet2: "",
    billingCity: "",
    billingState: "",
    billingZipCode: "",
    billingPhone: "",
    billingFax: "",
    shippingAttention: "",
    shippingCountry: "",
    shippingStreet1: "",
    shippingStreet2: "",
    shippingCity: "",
    shippingState: "",
    shippingZipCode: "",
    shippingPhone: "",
    shippingFax: "",
    remarks: "",
    websiteUrl: "",
    department: "",
    designation: "",
    xSocial: "",
    skypeName: "",
    facebook: "",
  });
  const [activeTab, setActiveTab] = useState("Other Details");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetElement = event.target instanceof Node ? event.target : null;
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(targetElement)) {
        setUploadDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      documents.forEach(doc => {
        if (doc.preview) {
          URL.revokeObjectURL(doc.preview);
        }
      });
    };
  }, [documents]);

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files) as File[];
    const maxFiles = 10;
    const maxSize = 10 * 1024 * 1024;

    if (documents.length + fileArray.length > maxFiles) {
      alert(`You can upload a maximum of ${maxFiles} files.`);
      return;
    }

    const validFiles = fileArray.filter((file: File) => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds the maximum size of 10MB.`);
        return false;
      }
      return true;
    });

    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments((prev: Attachment[]) => [...prev, {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          base64: reader.result,
          preview: URL.createObjectURL(file),
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDocument = (id: string | number) => {
    setDocuments((prev: Attachment[]) => {
      const doc = prev.find(d => String(d.id) === String(id));
      if (doc && doc.preview) {
        URL.revokeObjectURL(doc.preview);
      }
      return prev.filter(d => String(d.id) !== String(id));
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const copyBillingToShipping = () => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      shippingAttention: prev.billingAttention,
      shippingCountry: prev.billingCountry,
      shippingStreet1: prev.billingStreet1,
      shippingStreet2: prev.billingStreet2,
      shippingCity: prev.billingCity,
      shippingState: prev.billingState,
      shippingZipCode: prev.billingZipCode,
      shippingPhone: prev.billingPhone,
      shippingFax: prev.billingFax,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const target = e.currentTarget as HTMLInputElement;
    const isCheckbox = target.type === "checkbox";
    const updatedData = { ...formData, [name]: isCheckbox ? target.checked : value };

    if (name === "firstName" || name === "lastName" || name === "companyName") {
      const options = generateDisplayNameOptions(updatedData);
      if (!updatedData.displayName || options.includes(updatedData.displayName)) {
        updatedData.displayName = options[0] || "";
      }
    }

    setFormData(updatedData);
  };

  const generateDisplayNameOptions = (data: Partial<typeof formData>) => {
    const { firstName, lastName, companyName } = data;
    const options: string[] = [];

    if (companyName) {
      options.push(companyName);
    }

    if (firstName && lastName) {
      options.push(`${firstName} ${lastName}`);
      options.push(`${lastName}, ${firstName}`);
    } else if (firstName) {
      options.push(firstName);
    } else if (lastName) {
      options.push(lastName);
    }

    if (companyName && firstName && lastName) {
      options.push(`${companyName} (${firstName} ${lastName})`);
    }

    return options.length > 0 ? options : [""];
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newCustomer = {
      display_name: formData.displayName || formData.firstName + " " + formData.lastName || formData.companyName,
      customer_type: formData.customerType.toLowerCase(),
      company_name: formData.companyName || "",
      email: formData.email || "",
      phone: formData.workPhone || "",
      currency: resolvedBaseCurrency,
      status: "active",
    };

    try {
      const response = await customersAPI.create(newCustomer);
      if (response && (response.code === 0 || response.success)) {
        const createdCustomer = response.data || response.customer;
        toast.success("Customer created successfully");
        window.dispatchEvent(new Event("customersUpdated"));
        onSave(createdCustomer);
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Failed to create customer");
    }
  };

  const modalStyles: Record<string, React.CSSProperties> = {
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
      maxWidth: "1200px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
      flexShrink: 0,
    },
    title: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
    },
    body: {
      padding: "24px",
      flex: 1,
      overflowY: "auto",
    },
    formGroup: {
      marginBottom: "16px",
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      gap: "24px",
      alignItems: "flex-start",
    },
    formRow: {
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      gap: "24px",
      alignItems: "flex-start",
      marginBottom: "20px",
    },
    formRowLabel: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      paddingTop: "8px",
    },
    formRowInput: {
      flex: 1,
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    labelWithInfo: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    infoIcon: {
      color: "#6b7280",
      cursor: "help",
      width: "16px",
      height: "16px",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    select: {
      width: "100%",
      padding: "8px 32px 8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px",
      gridColumn: "1 / -1",
    },
    phoneInput: {
      position: "relative",
    },
    phoneIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
      width: "16px",
      height: "16px",
    },
    phoneInputField: {
      width: "100%",
      padding: "8px 12px 8px 36px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    emailInput: {
      position: "relative",
      width: "100%",
    },
    emailIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
      width: "16px",
      height: "16px",
      pointerEvents: "none",
    },
    tabs: {
      display: "flex",
      gap: "8px",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "24px",
    },
    tab: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      background: "none",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
    },
    tabActive: {
      color: "#156372",
      borderBottomColor: "#156372",
    },
    helperText: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "4px",
    },
    checkboxGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    checkbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    uploadButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
      fontSize: "14px",
    },
    uploadDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "4px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 1000,
      minWidth: "200px",
    },
    uploadDropdownItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "100%",
      padding: "8px 12px",
      border: "none",
      backgroundColor: "transparent",
      color: "#374151",
      cursor: "pointer",
      fontSize: "14px",
      textAlign: "left",
    },
    documentsList: {
      marginTop: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: "400px",
    },
    documentItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "8px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      backgroundColor: "#f9fafb",
    },
    removeDocumentBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px",
      border: "none",
      backgroundColor: "transparent",
      color: "#156372",
      cursor: "pointer",
      borderRadius: "4px",
    },
    linkButton: {
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
    },
    moreDetailsSection: {
      marginTop: "16px",
      paddingTop: "16px",
      width: "100%",
    },
    moreDetailsDivider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      marginBottom: "24px",
    },
    iconInput: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: "12px",
      color: "#6b7280",
      pointerEvents: "none",
    },
    inputWithIcon: {
      width: "100%",
      maxWidth: "400px",
      padding: "8px 12px 8px 36px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    xIcon: {
      position: "absolute",
      left: "12px",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
      fontSize: "12px",
      fontWeight: "600",
      pointerEvents: "none",
    },
    skypeIcon: {
      position: "absolute",
      left: "12px",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    },
    facebookIcon: {
      position: "absolute",
      left: "12px",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "12px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "16px",
    },
    cancelBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    saveBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
    addressContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
    },
    addressSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
    },
    addressTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    copyLink: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      background: "none",
      border: "none",
      padding: 0,
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "60px",
      fontFamily: "inherit",
    },
    noteSection: {
      marginTop: "24px",
      padding: "16px",
      backgroundColor: "#fef3c7",
      borderRadius: "6px",
      borderLeft: "4px solid #f59e0b",
    },
    noteTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#92400e",
      marginBottom: "8px",
    },
    noteList: {
      margin: 0,
      paddingLeft: "20px",
      color: "#78350f",
      fontSize: "13px",
    },
    noteItem: {
      marginBottom: "4px",
    },
    remarksLabel: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "8px",
    },
    remarksLabelSubtext: {
      color: "#6b7280",
      fontWeight: "400",
    },
    remarksTextarea: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "120px",
      fontFamily: "inherit",
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>New Customer</h2>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.body}>
          {/* Customer Type */}
          <div style={modalStyles.formGroup}>
            <div style={modalStyles.labelWithInfo}>
              <label style={modalStyles.label}>
                Customer Type
                <Info size={16} style={modalStyles.infoIcon} />
              </label>
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="customerType"
                  value="Business"
                  checked={formData.customerType === "Business"}
                  onChange={handleChange}
                  style={modalStyles.checkbox}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>Business</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="customerType"
                  value="Individual"
                  checked={formData.customerType === "Individual"}
                  onChange={handleChange}
                  style={modalStyles.checkbox}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>Individual</span>
              </label>
            </div>
          </div>

          {/* Primary Contact through Customer Language Section with Background */}
          <div style={{ backgroundColor: "#f9fafb", padding: "24px", borderRadius: "8px", marginBottom: "24px" }}>
            {/* Primary Contact Section */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ ...modalStyles.label, gridColumn: "1 / -1", marginBottom: "16px" }}>
                Primary Contact
                <Info size={16} style={modalStyles.infoIcon} />
              </div>
              <div style={modalStyles.row}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={modalStyles.label}>Salutation</label>
                  <select
                    name="salutation"
                    value={formData.salutation}
                    onChange={handleChange}
                    style={modalStyles.select}
                  >
                    <option>Salutation</option>
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                    <option>Dr.</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={modalStyles.label}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                    style={modalStyles.input}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={modalStyles.label}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    style={modalStyles.input}
                  />
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Company Name</label>
              <div>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Company Name"
                  style={modalStyles.input}
                />
              </div>
            </div>

            {/* Display Name */}
            <div style={modalStyles.formGroup}>
              <div style={modalStyles.labelWithInfo}>
                <label style={modalStyles.label}>
                  Display Name <span style={{ color: "#156372" }}>*</span>
                </label>
                <Info size={16} style={modalStyles.infoIcon} />
              </div>
              <div style={{ position: "relative" }}>
                <select
                  required
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  style={modalStyles.select}
                >
                  {generateDisplayNameOptions(formData).map((option, index) => (
                    <option key={index} value={option}>
                      {option || "Select or type to add"}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6b7280",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div style={modalStyles.formGroup}>
              <div style={modalStyles.labelWithInfo}>
                <label style={modalStyles.label}>Email Address</label>
                <Info size={16} style={modalStyles.infoIcon} />
              </div>
              <div style={modalStyles.emailInput}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  style={{ ...modalStyles.input, paddingLeft: "36px" }}
                />
                <Mail size={16} style={modalStyles.emailIcon} />
              </div>
            </div>

            {/* Phone */}
            <div style={modalStyles.formGroup}>
              <div style={modalStyles.labelWithInfo}>
                <label style={modalStyles.label}>Phone</label>
                <Info size={16} style={modalStyles.infoIcon} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={modalStyles.phoneInput}>
                  <Phone size={16} style={modalStyles.phoneIcon} />
                  <input
                    type="tel"
                    name="workPhone"
                    value={formData.workPhone}
                    onChange={handleChange}
                    placeholder="Work Phone"
                    style={modalStyles.phoneInputField}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="mobileCheckbox"
                    style={modalStyles.checkbox}
                  />
                  <label htmlFor="mobileCheckbox" style={{ fontSize: "14px", color: "#374151", cursor: "pointer" }}>Mobile</label>
                </div>
                <div style={modalStyles.phoneInput}>
                  <Phone size={16} style={modalStyles.phoneIcon} />
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="Mobile"
                    style={modalStyles.phoneInputField}
                  />
                </div>
              </div>
            </div>

            {/* Customer Language */}
            <div style={modalStyles.formGroup}>
              <div style={modalStyles.labelWithInfo}>
                <label style={modalStyles.label}>Customer Language</label>
                <Info size={16} style={modalStyles.infoIcon} />
              </div>
              <div>
                <select
                  name="customerLanguage"
                  value={formData.customerLanguage}
                  onChange={handleChange}
                  style={modalStyles.select}
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={modalStyles.tabs}>
            {["Other Details", "Address", "Custom Fields", "Reporting Tags", "Remarks"].map((tab) => (
              <button
                key={tab}
                type="button"
                style={{
                  ...modalStyles.tab,
                  ...(activeTab === tab ? modalStyles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Other Details Tab Content */}
          {activeTab === "Other Details" && (
            <>
              {/* Location Code */}
              <div style={modalStyles.formRow}>
                <div style={modalStyles.formRowLabel}>
                  <span>Location Code</span>
                  <Info size={16} style={modalStyles.infoIcon} />
                </div>
                <div style={modalStyles.formRowInput}>
                  <input
                    type="text"
                    name="locationCode"
                    value={formData.locationCode}
                    onChange={handleChange}
                    placeholder="Location Code"
                    style={{ ...modalStyles.input, maxWidth: "none" }}
                  />
                </div>
              </div>

              {/* Currency */}
              <div style={modalStyles.formRow}>
                <div style={modalStyles.formRowLabel}>
                  <span>Currency</span>
                </div>
                <div style={modalStyles.formRowInput}>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    style={{ ...modalStyles.select, maxWidth: "none" }}
                  >
                    <option>{`${resolvedBaseCurrency}- Base Currency`}</option>
                  </select>
                </div>
              </div>

              {/* Opening Balance */}
              <div style={modalStyles.formRow}>
                <div style={modalStyles.formRowLabel}>
                  <span>Opening Balance</span>
                </div>
                <div style={modalStyles.formRowInput}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#374151", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px 0 0 6px", backgroundColor: "#f9fafb", borderRight: "none" }}>
                      {formData.currency.substring(0, 3)}
                    </span>
                    <input
                      type="text"
                      name="openingBalance"
                      value={formData.openingBalance}
                      onChange={handleChange}
                      placeholder="0.00"
                      style={{ ...modalStyles.input, maxWidth: "none", borderRadius: "0 6px 6px 0", borderLeft: "none", flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div style={modalStyles.formRow}>
                <div style={modalStyles.formRowLabel}>
                  <span>Payment Terms</span>
                </div>
                <div style={modalStyles.formRowInput}>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    style={{ ...modalStyles.select, maxWidth: "none" }}
                  >
                    <option>Due on Receipt</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 60</option>
                  </select>
                </div>
              </div>

              {/* Enable Portal */}
              <div style={modalStyles.formRow}>
                <div style={modalStyles.formRowLabel}>
                  <span>Enable Portal?</span>
                  <Info size={16} style={modalStyles.infoIcon} />
                </div>
                <div style={modalStyles.formRowInput}>
                  <div style={modalStyles.checkboxGroup}>
                    <input
                      type="checkbox"
                      name="enablePortal"
                      checked={formData.enablePortal}
                      onChange={handleChange}
                      style={modalStyles.checkbox}
                    />
                    <label style={{ fontSize: "14px", color: "#374151" }}>Allow portal access for this customer</label>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Documents</label>
                <div>
                  <div style={{ position: "relative", display: "inline-block" }} ref={uploadDropdownRef}>
                    <button
                      type="button"
                      style={modalStyles.uploadButton}
                      onClick={() => setUploadDropdownOpen(!uploadDropdownOpen)}
                    >
                      <UploadIcon size={16} />
                      Upload File
                      <ChevronDown size={16} />
                    </button>
                    {uploadDropdownOpen && (
                      <div style={modalStyles.uploadDropdown}>
                        <button
                          type="button"
                          style={modalStyles.uploadDropdownItem}
                          onClick={() => {
                            fileInputRef.current?.click();
                            setUploadDropdownOpen(false);
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <UploadIcon size={16} />
                          Upload from Computer
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files);
                      }
                      e.target.value = "";
                    }}
                  />
                  <div style={modalStyles.helperText}>
                    You can upload a maximum of 10 files, 10MB each
                  </div>

                  {documents.length > 0 && (
                    <div style={modalStyles.documentsList}>
                      {documents.map((doc) => (
                        <div key={doc.id} style={modalStyles.documentItem}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <File size={16} style={{ color: "#6b7280" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                                {doc.name}
                              </div>
                              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                {formatFileSize(doc.size)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            style={modalStyles.removeDocumentBtn}
                            title="Remove file"
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add more details */}
              <div style={{ ...modalStyles.formRow, marginTop: "32px" }}>
                <div style={modalStyles.formRowLabel}></div>
                <div style={modalStyles.formRowInput}>
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    style={modalStyles.linkButton}
                  >
                    Add more details
                  </button>
                </div>
              </div>

              {showMoreDetails && (
                <div style={modalStyles.moreDetailsSection}>
                  <div style={modalStyles.moreDetailsDivider}></div>

                  {/* Website URL */}
                  <div style={modalStyles.formRow}>
                    <div style={modalStyles.formRowLabel}>
                      <span>Website URL</span>
                    </div>
                    <div style={modalStyles.formRowInput}>
                      <div style={modalStyles.iconInput}>
                        <Globe size={16} style={modalStyles.inputIcon} />
                        <input
                          type="url"
                          name="websiteUrl"
                          value={formData.websiteUrl}
                          onChange={handleChange}
                          placeholder="ex: www.zylker.com"
                          style={{ ...modalStyles.inputWithIcon, maxWidth: "none" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Department */}
                  <div style={modalStyles.formRow}>
                    <div style={modalStyles.formRowLabel}>
                      <span>Department</span>
                    </div>
                    <div style={modalStyles.formRowInput}>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="Department"
                        style={{ ...modalStyles.input, maxWidth: "none" }}
                      />
                    </div>
                  </div>

                  {/* Designation */}
                  <div style={modalStyles.formRow}>
                    <div style={modalStyles.formRowLabel}>
                      <span>Designation</span>
                    </div>
                    <div style={modalStyles.formRowInput}>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        placeholder="Designation"
                        style={{ ...modalStyles.input, maxWidth: "none" }}
                      />
                    </div>
                  </div>

                  {/* X (Twitter) */}
                  <div style={modalStyles.formRow}>
                    <div style={modalStyles.formRowLabel}>
                      <span>X</span>
                    </div>
                    <div style={modalStyles.formRowInput}>
                      <div style={modalStyles.iconInput}>
                        <div style={modalStyles.xIcon}>X</div>
                        <input
                          type="url"
                          name="xSocial"
                          value={formData.xSocial}
                          onChange={handleChange}
                          placeholder="https://x.com/"
                          style={{ ...modalStyles.inputWithIcon, maxWidth: "none" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skype Name/Number */}
                  <div style={modalStyles.formRow}>
                    <div style={modalStyles.formRowLabel}>
                      <span>Skype Name/Number</span>
                    </div>
                    <div style={modalStyles.formRowInput}>
                      <div style={modalStyles.iconInput}>
                        <div style={modalStyles.skypeIcon}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#00AFF0">
                            <path d="M12.015 0C5.398 0 .006 5.388.006 12.002c0 5.098 3.158 9.478 7.618 11.239-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.015 24.009c6.624 0 11.99-5.388 11.99-12.002C24.005 5.388 18.641.001 12.015.001z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="skypeName"
                          value={formData.skypeName}
                          onChange={handleChange}
                          placeholder="Skype Name/Number"
                          style={{ ...modalStyles.inputWithIcon, maxWidth: "none" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Facebook */}
                  <div style={modalStyles.formRow}>
                    <div style={modalStyles.formRowLabel}>
                      <span>Facebook</span>
                    </div>
                    <div style={modalStyles.formRowInput}>
                      <div style={modalStyles.iconInput}>
                        <div style={modalStyles.facebookIcon}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          name="facebook"
                          value={formData.facebook}
                          onChange={handleChange}
                          placeholder="http://www.facebook.com/"
                          style={{ ...modalStyles.inputWithIcon, maxWidth: "none" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Address Tab Content */}
          {activeTab === "Address" && (
            <>
              <div style={modalStyles.addressContainer}>
                {/* Billing Address */}
                <div style={modalStyles.addressSection}>
                  <div style={modalStyles.addressTitle}>
                    <span>Billing Address</span>
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Attention</label>
                    <input
                      type="text"
                      name="billingAttention"
                      value={formData.billingAttention}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Country/Region</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        list="new-bill-billing-country-options"
                        name="billingCountry"
                        value={formData.billingCountry}
                        onChange={handleChange}
                        placeholder="Select or type to add"
                        style={modalStyles.input}
                      />
                      <datalist id="new-bill-billing-country-options">
                        {WORLD_COUNTRIES.map((country) => (
                          <option key={country} value={country} />
                        ))}
                      </datalist>
                      <ChevronDown
                        size={16}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6b7280",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Address</label>
                    <div style={{ marginBottom: "8px" }}>
                      <textarea
                        name="billingStreet1"
                        value={formData.billingStreet1}
                        onChange={handleChange}
                        placeholder="Street 1"
                        style={modalStyles.textarea}
                      />
                    </div>
                    <textarea
                      name="billingStreet2"
                      value={formData.billingStreet2}
                      onChange={handleChange}
                      placeholder="Street 2"
                      style={modalStyles.textarea}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>City</label>
                    <input
                      type="text"
                      name="billingCity"
                      value={formData.billingCity}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>State</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        list="new-bill-billing-state-options"
                        name="billingState"
                        value={formData.billingState}
                        onChange={handleChange}
                        placeholder="Select or type to add"
                        style={modalStyles.input}
                      />
                      <datalist id="new-bill-billing-state-options">
                        {getStatesByCountry(formData.billingCountry).map((state) => (
                          <option key={state} value={state} />
                        ))}
                      </datalist>
                      <ChevronDown
                        size={16}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6b7280",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>ZIP Code</label>
                    <input
                      type="text"
                      name="billingZipCode"
                      value={formData.billingZipCode}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Phone</label>
                    <input
                      type="tel"
                      name="billingPhone"
                      value={formData.billingPhone}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Fax Number</label>
                    <input
                      type="text"
                      name="billingFax"
                      value={formData.billingFax}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                </div>

                {/* Shipping Address */}
                <div style={modalStyles.addressSection}>
                  <div style={modalStyles.addressTitle}>
                    <span>Shipping Address</span>
                    <button
                      type="button"
                      onClick={copyBillingToShipping}
                      style={modalStyles.copyLink}
                    >
                      <Copy size={14} />
                      Copy billing address
                    </button>
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Attention</label>
                    <input
                      type="text"
                      name="shippingAttention"
                      value={formData.shippingAttention}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Country/Region</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        list="new-bill-shipping-country-options"
                        name="shippingCountry"
                        value={formData.shippingCountry}
                        onChange={handleChange}
                        placeholder="Select or type to add"
                        style={modalStyles.input}
                      />
                      <datalist id="new-bill-shipping-country-options">
                        {WORLD_COUNTRIES.map((country) => (
                          <option key={country} value={country} />
                        ))}
                      </datalist>
                      <ChevronDown
                        size={16}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6b7280",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Address</label>
                    <div style={{ marginBottom: "8px" }}>
                      <textarea
                        name="shippingStreet1"
                        value={formData.shippingStreet1}
                        onChange={handleChange}
                        placeholder="Street 1"
                        style={modalStyles.textarea}
                      />
                    </div>
                    <textarea
                      name="shippingStreet2"
                      value={formData.shippingStreet2}
                      onChange={handleChange}
                      placeholder="Street 2"
                      style={modalStyles.textarea}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>City</label>
                    <input
                      type="text"
                      name="shippingCity"
                      value={formData.shippingCity}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>State</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        list="new-bill-shipping-state-options"
                        name="shippingState"
                        value={formData.shippingState}
                        onChange={handleChange}
                        placeholder="Select or type to add"
                        style={modalStyles.input}
                      />
                      <datalist id="new-bill-shipping-state-options">
                        {getStatesByCountry(formData.shippingCountry).map((state) => (
                          <option key={state} value={state} />
                        ))}
                      </datalist>
                      <ChevronDown
                        size={16}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6b7280",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>ZIP Code</label>
                    <input
                      type="text"
                      name="shippingZipCode"
                      value={formData.shippingZipCode}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Phone</label>
                    <input
                      type="tel"
                      name="shippingPhone"
                      value={formData.shippingPhone}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>Fax Number</label>
                    <input
                      type="text"
                      name="shippingFax"
                      value={formData.shippingFax}
                      onChange={handleChange}
                      style={modalStyles.input}
                    />
                  </div>
                </div>
              </div>

              {/* Note Section */}
              <div style={modalStyles.noteSection}>
                <div style={modalStyles.noteTitle}>Note:</div>
                <ul style={modalStyles.noteList}>
                  <li style={modalStyles.noteItem}>
                    Add and manage additional addresses from this Customers and Vendors details section.
                  </li>
                  <li style={modalStyles.noteItem}>
                    You can customise how customers' addresses are displayed in transaction PDFs. To do this, go to Settings &gt; Preferences &gt; Customers and Vendors, and navigate to the Address Format sections.
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Custom Fields Tab Content */}
          {activeTab === "Custom Fields" && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
              <div style={{ marginBottom: "8px" }}>
                Start adding custom fields for your Customers and Vendors by going to{" "}
                <span style={{ fontWeight: "600" }}>Settings</span> âž¡{" "}
                <span style={{ fontWeight: "600" }}>Preferences</span> âž¡{" "}
                <span style={{ fontWeight: "600" }}>Customers and Vendors</span>. You can also refine the address format of your Customers and Vendors from there.
              </div>
            </div>
          )}

          {/* Reporting Tags Tab Content */}
          {activeTab === "Reporting Tags" && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
              <div style={{ marginBottom: "8px" }}>
                You've not created any Reporting Tags.
              </div>
              <div style={{ marginBottom: "8px" }}>
                Start creating reporting tags by going to{" "}
                <span style={{ fontWeight: "600" }}>More Settings</span> âž¡{" "}
                <span style={{ fontWeight: "600" }}>Reporting Tags</span>.
              </div>
            </div>
          )}

          {/* Remarks Tab Content */}
          {activeTab === "Remarks" && (
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.remarksLabel}>
                Remarks <span style={modalStyles.remarksLabelSubtext}>(For Internal Use)</span>
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Enter remarks..."
                style={modalStyles.remarksTextarea}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={modalStyles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelBtn}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={modalStyles.saveBtn}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#156372")}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


