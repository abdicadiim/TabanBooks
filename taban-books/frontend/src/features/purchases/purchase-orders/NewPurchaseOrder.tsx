import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
  Upload as UploadIcon,
  Trash2,
  Edit,
  RefreshCw,
  Link as LinkIcon,
  List,
  Settings,
  GripVertical,
  Image as ImageIcon,
  MoreVertical,
  Check,
  Tag,
  Mail,
  Building2,
  Package,
} from "lucide-react";

import { PaymentTermsDropdown } from "../../../components/PaymentTermsDropdown";
import { ConfigurePaymentTermsModal } from "../../../components/ConfigurePaymentTermsModal";
import { ItemSelectDropdown } from "../../../components/ItemSelectDropdown";
import { AccountSelectDropdown } from "../../../components/AccountSelectDropdown";
import DatePicker from "../../../components/DatePicker";
import { LocationSelectDropdown, LocationOption } from "../../../components/LocationSelectDropdown";
import { defaultPaymentTerms, PaymentTerm } from "../../../hooks/usePaymentTermsDropdown";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { purchaseOrdersAPI, vendorsAPI, customersAPI, taxesAPI, itemsAPI, locationsAPI, projectsAPI, reportingTagsAPI } from "../../../services/api";
import { filterActiveRecords } from "../shared/activeFilters";
import {
  isReportingTagActive,
  normalizeReportingTagAppliesTo,
  normalizeReportingTagOptions,
} from "../../sales/Customers/customerReportingTags";

type RecordId = string | number;

type AddressRecord = {
  name?: string;
  attention?: string;
  address1?: string;
  address2?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  fax?: string;
};

type ContactFormData = {
  displayName?: string;
  name?: string;
  email?: string;
  companyName?: string;
  workPhone?: string;
  mobile?: string;
};

type VendorRecord = ContactFormData & {
  _id?: RecordId;
  id?: RecordId;
  billingAddress?: AddressRecord | null;
  shippingAddress?: AddressRecord | null;
  formData?: ContactFormData;
};

type CustomerOption = {
  _id?: RecordId;
  id?: RecordId;
  displayName: string;
  customerNumber: string;
  email: string;
  phone: string;
  companyName: string;
  avatar: string;
  billingAddress?: AddressRecord | null;
  shippingAddress?: AddressRecord | null;
};

type OrganizationRecord = {
  organizationName?: string;
  name?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
};

type TaxOption = {
  id: string;
  _id?: RecordId;
  name: string;
  rate: number;
};

type BulkItemOption = {
  id: string;
  name: string;
  sku: string;
  purchaseRate: number;
  purchaseAccount?: string;
  inventoryAccount?: string;
  trackInventory: boolean;
  stockOnHand?: number;
  unit?: string;
};

type SelectableItem = {
  _id?: RecordId;
  id: string;
  name: string;
  description?: string;
  purchaseRate?: number;
  purchaseAccount?: string;
  inventoryAccount?: string;
  trackInventory?: boolean;
  stockOnHand?: number;
  unit?: string;
};

type PurchaseOrderItem = {
  id: number;
  itemId?: RecordId;
  rowType?: "item" | "header";
  headerTitle?: string;
  itemDetails: string;
  description?: string;
  account: string;
  quantity: string;
  rate: string;
  tax: string;
  amount: string;
  trackInventory?: boolean;
  stockOnHand?: number;
  unit?: string;
  showAdditionalInfo?: boolean;
};

type PurchaseOrderFormData = {
  vendorName: string;
  vendorId: RecordId;
  deliveryAddressType: "Organization" | "Customer";
  purchaseOrderNumber: string;
  referenceNumber: string;
  date: string;
  deliveryDate: string;
  paymentTerms: string;
  shipmentPreference: string;
  taxExclusive: boolean;
  transactionLevel: string;
  items: PurchaseOrderItem[];
  subTotal: string;
  discountPercent: string;
  discountAmount: string;
  adjustment: string;
  total: string;
  notes: string;
  termsAndConditions: string;
};

type PurchaseOrderItemField =
  | "itemId"
  | "itemDetails"
  | "description"
  | "account"
  | "quantity"
  | "rate"
  | "tax"
  | "amount";

type PurchaseOrderSaveStatus = "draft" | "issued";

type VendorSearchCriteria = "Display Name" | "Email" | "Company Name" | "Phone";

type EnabledSettings = {
  discountSettings?: {
    discountType?: string;
  };
  taxSettings?: {
    taxInclusive?: string;
  };
};

type PurchaseLocationOption = LocationOption & {
  source?: string;
};

type TransactionLevelOption = {
  id: string;
  label: string;
  description?: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type ReportingTagOption = {
  _id?: RecordId;
  id?: RecordId;
  name?: string;
  isRequired?: boolean;
  required?: boolean;
  isMandatory?: boolean;
  moduleLevel?: Record<string, "transaction" | "lineItem">;
  options?: string[] | Array<{ value?: string; label?: string; name?: string }>;
};

type PurchaseOrderFieldErrorKey =
  | "vendorName"
  | "warehouseLocation"
  | "deliveryAddress"
  | "customer"
  | "purchaseOrderNumber"
  | "date"
  | "deliveryDate"
  | "paymentTerms"
  | "reportingTags"
  | "items";

type PurchaseOrderItemError = Partial<Record<"itemDetails" | "account" | "quantity" | "rate", string>>;

const VENDORS_CACHE_KEY = "purchase-order-vendors-cache";
const PURCHASE_ORDERS_CACHE_KEY = "purchase-orders-cache";

const readCachedArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const cached = window.sessionStorage.getItem(key);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedArray = <T,>(key: string, value: T[]) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore cache write failures
  }
};

const createEmptyItem = (id: number): PurchaseOrderItem => ({
  id,
  rowType: "item",
  headerTitle: "",
  itemDetails: "",
  description: "",
  account: "",
  quantity: "1.00",
  rate: "0.00",
  tax: "",
  amount: "0.00",
  trackInventory: false,
  stockOnHand: 0,
  unit: "",
  showAdditionalInfo: false,
});

const createHeaderRow = (id: number): PurchaseOrderItem => ({
  id,
  rowType: "header",
  headerTitle: "",
  itemDetails: "",
  description: "",
  account: "",
  quantity: "0.00",
  rate: "0.00",
  tax: "",
  amount: "0.00",
  trackInventory: false,
  stockOnHand: 0,
  unit: "",
  showAdditionalInfo: false,
});

const PURCHASE_ACCOUNT_TYPES = [
  'expense',
  'cost_of_goods_sold',
  'other_expense',
  'fixed_asset',
  'other_current_asset',
  'stock'
];

const VENDOR_SEARCH_CRITERIA_OPTIONS: VendorSearchCriteria[] = ["Display Name", "Email", "Company Name", "Phone"];

const formatIsoDateForDisplay = (dateString: string) => {
  if (!dateString) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateString).trim());
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const parseDisplayDateToIso = (dateString: string) => {
  const trimmed = String(dateString || "").trim();
  if (!trimmed) return "";

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return "";

  const [, dayString, monthString, yearString] = match;
  const day = Number(dayString);
  const month = Number(monthString);
  const year = Number(yearString);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "";
  }

  return `${yearString}-${monthString}-${dayString}`;
};

const parseIsoDateToLocalDate = (dateString: string) => {
  if (!dateString) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString).trim());
  if (!match) return null;

  const [, yearString, monthString, dayString] = match;
  const parsed = new Date(Number(yearString), Number(monthString) - 1, Number(dayString));
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};


const PURCHASE_ORDERS_KEY = "purchase_orders_v1";
// Duplicate import removed

export default function NewPurchaseOrder() {
  const navigate = useNavigate();
  const [enabledSettings, setEnabledSettings] = useState<EnabledSettings | null>(null);
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    vendorName: "",
    vendorId: "", // Add vendorId to state
    deliveryAddressType: "Organization",
    purchaseOrderNumber: "",
    referenceNumber: "",
    date: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD for date input
    deliveryDate: "", // Format: YYYY-MM-DD for date input
    paymentTerms: "Due on Receipt",
    shipmentPreference: "",
    taxExclusive: false,
    transactionLevel: "At Transaction Level",
    items: [createEmptyItem(1)],
    subTotal: "0.00",
    discountPercent: "0",
    discountAmount: "0.00",
    adjustment: "0.00",
    total: "0.00",
    notes: "",
    termsAndConditions: "",
  });
  const [dateInputValue, setDateInputValue] = useState(() => formatIsoDateForDisplay(new Date().toISOString().split('T')[0]));
  const [deliveryDateInputValue, setDeliveryDateInputValue] = useState("");
  const [vendors, setVendors] = useState<VendorRecord[]>(() => readCachedArray<VendorRecord>(VENDORS_CACHE_KEY));
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorDropdownSearch, setVendorDropdownSearch] = useState("");
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);

  // Vendor search modal state
  const [vendorSearchCriteria, setVendorSearchCriteria] = useState<VendorSearchCriteria>("Display Name");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState<VendorRecord[]>([]);
  const [vendorSearchPage, setVendorSearchPage] = useState(1);
  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);
  const [allVendors, setAllVendors] = useState<VendorRecord[]>(() => readCachedArray<VendorRecord>(VENDORS_CACHE_KEY));

  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [poConfigModalOpen, setPoConfigModalOpen] = useState(false);
  const [poNumberingMode, setPoNumberingMode] = useState("auto"); // "auto" or "manual"
  const [poPrefix, setPoPrefix] = useState("PO-");
  const [poNextNumber, setPoNextNumber] = useState("00002");
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const [itemMenuOpen, setItemMenuOpen] = useState<number | null>(null); // Track which item's menu is open
  const itemMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const itemMenuTriggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const itemMenuPortalRef = useRef<HTMLDivElement | null>(null);
  const [itemMenuStyle, setItemMenuStyle] = useState<{ left: number; top: number } | null>(null);
  const [itemDetailActionOpen, setItemDetailActionOpen] = useState<number | null>(null);
  const itemDetailActionTriggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const itemDetailActionPortalRef = useRef<HTMLDivElement | null>(null);
  const [itemDetailActionStyle, setItemDetailActionStyle] = useState<{ left: number; top: number } | null>(null);
  const [billingAddress, setBillingAddress] = useState<AddressRecord | null>(null);
  const [shippingAddress, setShippingAddress] = useState<AddressRecord | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<AddressRecord | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationRecord | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerBillingAddress, setCustomerBillingAddress] = useState<AddressRecord | null>(null);
  const [customerShippingAddress, setCustomerShippingAddress] = useState<AddressRecord | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [bulkItemsModalOpen, setBulkItemsModalOpen] = useState(false);
  const [bulkItemsLoading, setBulkItemsLoading] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItemOption[]>(() => readCachedArray<BulkItemOption>("purchase-order-items-cache"));
  const [bulkItemsSearch, setBulkItemsSearch] = useState("");
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<Record<string, boolean>>({});
  const [bulkSelectedItems, setBulkSelectedItems] = useState<BulkItemOption[]>([]);
  const [bulkItemQuantities, setBulkItemQuantities] = useState<Record<string, number>>({});
  const [bulkInsertAfterRowId, setBulkInsertAfterRowId] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<PurchaseOrderFieldErrorKey, string>>>({});
  const [itemValidationErrors, setItemValidationErrors] = useState<Record<number, PurchaseOrderItemError>>({});
  const [saveLoadingState, setSaveLoadingState] = useState<null | "draft" | "issued">(null);
  const submitLockRef = useRef(false);
  const isMountedRef = useRef(true);
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
  const [taxDropdownMenuStyles, setTaxDropdownMenuStyles] = useState<Record<string, { left: number; top: number; width: number }>>({});
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [warehouseLocation, setWarehouseLocation] = useState("Head Office");
  const [locationOptions, setLocationOptions] = useState<PurchaseLocationOption[]>([]);
  const [transactionLevelDropdownOpen, setTransactionLevelDropdownOpen] = useState(false);
  const [transactionLevelSearch, setTransactionLevelSearch] = useState("");
  const [transactionLevelMenuStyle, setTransactionLevelMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
  const transactionLevelDropdownRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const [projectMenuStyle, setProjectMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
  const [availableReportingTags, setAvailableReportingTags] = useState<ReportingTagOption[]>([]);
  const [reportingTagsOpen, setReportingTagsOpen] = useState(false);
  const [isReportingTagsLoading, setIsReportingTagsLoading] = useState(false);
  const [reportingTagDrafts, setReportingTagDrafts] = useState<Record<string, string>>({});
  const [reportingTagOptionOpenKey, setReportingTagOptionOpenKey] = useState<string | null>(null);
  const [reportingTagSearches, setReportingTagSearches] = useState<Record<string, string>>({});
  const reportingTagsRef = useRef<HTMLDivElement>(null);
  const reportingTagsMenuRef = useRef<HTMLDivElement>(null);
  const reportingTagOptionTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const reportingTagOptionMenuRef = useRef<HTMLDivElement | null>(null);
  const [reportingTagsMenuStyle, setReportingTagsMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
  const [reportingTagOptionMenuStyle, setReportingTagOptionMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "both";
  const transactionLevelOptions: TransactionLevelOption[] = [
    {
      id: "At Transaction Level",
      label: "At Transaction Level",
      description: "Apply discount and taxes to the full order.",
    },
    {
      id: "At Line Item Level",
      label: "At Line Item Level",
      description: "Apply discount and taxes separately for each row.",
    },
  ];

  const updateTaxDropdownMenuPosition = (itemId: string) => {
    const ref = taxDropdownRefs.current[itemId];
    if (!ref) return;

    const rect = ref.getBoundingClientRect();
    setTaxDropdownMenuStyles((prev) => ({
      ...prev,
      [itemId]: {
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 240),
      },
    }));
  };

  // Edit Mode State
  const location = useLocation();
  const { id: routeOrderId } = useParams();
  const {
    editOrder: stateEditOrder,
    isEdit: stateIsEdit,
    clonedData,
    projectId: stateProjectId,
    projectName: stateProjectName,
  } = location.state || {};
  const [editOrder, setEditOrder] = useState<any>(stateEditOrder || null);
  const isEdit = !!(stateIsEdit || routeOrderId);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (stateEditOrder) {
      setEditOrder(stateEditOrder);
      return;
    }
    if (!isEdit || !routeOrderId) return;

    const loadOrderForEdit = async () => {
      try {
        const response = await purchaseOrdersAPI.getById(routeOrderId);
        if (response && (response.success || response.data)) {
          setEditOrder(response.data);
        }
      } catch (error) {
        console.error("Error loading purchase order for edit:", error);
      }
    };

    loadOrderForEdit();
  }, [stateEditOrder, isEdit, routeOrderId]);

  // Initialize form with edit data
  useEffect(() => {
    if (isEdit && editOrder) {
      const rawProjectId = String(editOrder.projectId || editOrder.project_id || editOrder.project?._id || editOrder.project?.id || "").trim();
      const rawProjectName = String(editOrder.projectName || editOrder.project_name || editOrder.project?.name || "").trim();
      const nextReportingTagDrafts: Record<string, string> = {};
      (Array.isArray(editOrder.reportingTags) ? editOrder.reportingTags : Array.isArray(editOrder.reporting_tags) ? editOrder.reporting_tags : []).forEach((entry: any) => {
        const tagId = String(entry?.tagId || entry?.id || "").trim();
        const value = String(entry?.value || "").trim();
        if (tagId && value) nextReportingTagDrafts[tagId] = value;
      });

      setFormData({
        vendorName: editOrder.vendor?.name || editOrder.vendor_name || "",
        vendorId: editOrder.vendor?._id || editOrder.vendor?.id || editOrder.vendor_id || editOrder.vendor || "",
        deliveryAddressType: "Organization", // Defaulting, adjust if backend has this
        purchaseOrderNumber: editOrder.purchaseOrderNumber || editOrder.purchase_order_number || "",
        referenceNumber: editOrder.referenceNumber || editOrder.reference_number || "",
        date: editOrder.date ? new Date(editOrder.date).toISOString().split('T')[0] : "",
        deliveryDate: editOrder.expectedDate ? new Date(editOrder.expectedDate).toISOString().split('T')[0] : (editOrder.deliveryDate ? new Date(editOrder.deliveryDate).toISOString().split('T')[0] : ""),
        paymentTerms: editOrder.paymentTerms || editOrder.payment_terms || "Due on Receipt",
        shipmentPreference: editOrder.shipmentPreference || editOrder.shipment_preference || "",
        taxExclusive: false, // Need to check if backend returns this
        transactionLevel: "At Transaction Level",
        items: (editOrder.items || []).map((item: any, index: number) => ({
          id: index + 1,
          rowType: "item",
          headerTitle: "",
          itemId: item.item || item.itemId || item._id || item.id,
          itemDetails: item.name || item.description || item.itemDetails || "",
          description: item.description || "",
          account: item.account || item.account_id || "",
          quantity: item.quantity?.toString() || "1.00",
          rate: (item.unitPrice !== undefined ? item.unitPrice : item.rate)?.toString() || "0.00",
          tax: item.tax_id || item.tax || "",
          amount: (item.total !== undefined ? item.total : item.amount)?.toString() || "0.00",
          trackInventory: Boolean(item.trackInventory),
          stockOnHand: Number(item.stockQuantity ?? item.stockOnHand ?? item.quantityOnHand ?? 0),
          unit: item.unit || "",
          showAdditionalInfo: Boolean(item.description),
        })),
        subTotal: editOrder.subTotal?.toString() || editOrder.sub_total?.toString() || "0.00",
        discountPercent: "0", // Need backend support for this if not just amount
        discountAmount: "0.00", // Need backend support
        adjustment: "0.00",
        total: editOrder.total?.toString() || "0.00",
        notes: editOrder.notes || "",
        termsAndConditions: editOrder.terms || editOrder.termsAndConditions || editOrder.terms_and_conditions || "",
      });
      setDateInputValue(formatIsoDateForDisplay(editOrder.date ? new Date(editOrder.date).toISOString().split('T')[0] : ""));
      setDeliveryDateInputValue(
        formatIsoDateForDisplay(
          editOrder.expectedDate
            ? new Date(editOrder.expectedDate).toISOString().split('T')[0]
            : (editOrder.deliveryDate ? new Date(editOrder.deliveryDate).toISOString().split('T')[0] : "")
        )
      );
      setSelectedProjectId(rawProjectId);
      setSelectedProjectName(rawProjectName);
      setReportingTagDrafts(nextReportingTagDrafts);
    }
  }, [isEdit, editOrder]);

  // Initialize form with cloned data
  useEffect(() => {
    if (!clonedData || isEdit) return;

    const rawProjectId = String(clonedData.projectId || clonedData.project_id || stateProjectId || "").trim();
    const rawProjectName = String(clonedData.projectName || clonedData.project_name || stateProjectName || "").trim();
    const nextReportingTagDrafts: Record<string, string> = {};
    (Array.isArray(clonedData.reportingTags) ? clonedData.reportingTags : Array.isArray(clonedData.reporting_tags) ? clonedData.reporting_tags : []).forEach((entry: any) => {
      const tagId = String(entry?.tagId || entry?.id || "").trim();
      const value = String(entry?.value || "").trim();
      if (tagId && value) nextReportingTagDrafts[tagId] = value;
    });

    setFormData((prev) => ({
      ...prev,
      vendorName: clonedData.vendor?.name || clonedData.vendor_name || clonedData.vendorName || "",
      vendorId: clonedData.vendor?._id || clonedData.vendor_id || clonedData.vendorId || "",
      deliveryAddressType: "Organization",
      purchaseOrderNumber: "",
      referenceNumber: clonedData.referenceNumber || clonedData.reference_number || "",
      date: new Date().toISOString().split('T')[0],
      deliveryDate: clonedData.expectedDate
        ? new Date(clonedData.expectedDate).toISOString().split('T')[0]
        : (clonedData.deliveryDate ? new Date(clonedData.deliveryDate).toISOString().split('T')[0] : ""),
      paymentTerms: clonedData.paymentTerms || clonedData.payment_terms || "Due on Receipt",
      shipmentPreference: clonedData.shipmentPreference || clonedData.shipment_preference || "",
      taxExclusive: false,
      transactionLevel: "At Transaction Level",
      items: (clonedData.items || []).map((item: any, index: number) => ({
        id: Date.now() + index,
        rowType: "item",
        headerTitle: "",
        itemId: item.item || item.itemId || item._id || item.id,
        itemDetails: item.name || item.description || item.itemDetails || "",
        description: item.description || "",
        account: item.account || item.account_id || "",
        quantity: item.quantity?.toString() || "1.00",
        rate: (item.unitPrice !== undefined ? item.unitPrice : item.rate)?.toString() || "0.00",
        tax: item.tax_id || item.tax || "",
        amount: (item.total !== undefined ? item.total : item.amount)?.toString() || "0.00",
        trackInventory: Boolean(item.trackInventory),
        stockOnHand: Number(item.stockQuantity ?? item.stockOnHand ?? item.quantityOnHand ?? 0),
        unit: item.unit || "",
        showAdditionalInfo: Boolean(item.description),
      })),
      subTotal: clonedData.subTotal?.toString() || clonedData.sub_total?.toString() || "0.00",
      discountPercent: "0",
      discountAmount: "0.00",
      adjustment: "0.00",
      total: clonedData.total?.toString() || "0.00",
      notes: clonedData.notes || "",
      termsAndConditions: clonedData.terms || clonedData.termsAndConditions || clonedData.terms_and_conditions || "",
    }));
    setDateInputValue(formatIsoDateForDisplay(new Date().toISOString().split('T')[0]));
    setDeliveryDateInputValue(
      formatIsoDateForDisplay(
        clonedData.expectedDate
          ? new Date(clonedData.expectedDate).toISOString().split('T')[0]
          : (clonedData.deliveryDate ? new Date(clonedData.deliveryDate).toISOString().split('T')[0] : "")
      )
    );
    setSelectedProjectId(rawProjectId);
    setSelectedProjectName(rawProjectName);
    setReportingTagDrafts(nextReportingTagDrafts);
  }, [clonedData, isEdit, stateProjectId, stateProjectName]);

  useEffect(() => {
    if (isEdit || clonedData) return;
    if (!stateProjectId && !stateProjectName) return;

    setSelectedProjectId(String(stateProjectId || "").trim());
    setSelectedProjectName(String(stateProjectName || "").trim());
  }, [clonedData, isEdit, stateProjectId, stateProjectName]);

  // Payment Terms Configuration State
  const [configureTermsOpen, setConfigureTermsOpen] = useState(false);
  const [paymentTermsList, setPaymentTermsList] = useState<PaymentTerm[]>(defaultPaymentTerms);

  // Load vendors and organization data from API
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedVendors = filterActiveRecords<VendorRecord>(response.data || response.vendors || []);
          setVendors(loadedVendors);
          setAllVendors(loadedVendors);
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem(VENDORS_CACHE_KEY, JSON.stringify(loadedVendors));
            } catch {
              // ignore cache write failures
            }
          }
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
      }
    };

    // Load organization data from localStorage
    const orgData = localStorage.getItem('organization');
    if (orgData) {
      try {
        const org = JSON.parse(orgData);
        setOrganizationData(org);
        // Set organization as default delivery address
        if (formData.deliveryAddressType === "Organization") {
          setDeliveryAddress({
            name: org.organizationName || org.name || '',
            address1: org.address?.street1 || '',
            address2: org.address?.street2 || '',
            city: org.address?.city || '',
            state: org.address?.state || '',
            country: org.address?.country || '',
            zipCode: org.address?.zipCode || '',
          });
        }
      } catch (error) {
        console.error("Error parsing organization data:", error);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const cachedVendors = window.sessionStorage.getItem(VENDORS_CACHE_KEY);
        if (cachedVendors) {
          const parsed = JSON.parse(cachedVendors);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVendors(parsed);
            setAllVendors(parsed);
          }
        }
      } catch (error) {
        console.error("Error reading cached vendors:", error);
      }
    }

    loadVendors();
  }, []);

  useEffect(() => {
    const loadTaxes = async () => {
      try {
        const response = await taxesAPI.getAll({ limit: 500 });
        const data = filterActiveRecords<any>(Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
          : Array.isArray(response)
            ? response
            : []);
        const normalized: TaxOption[] = data.map((tax: any) => ({
          id: String(tax._id || tax.id),
          name: tax.name || tax.taxName || "Tax",
          rate: Number(tax.rate || tax.taxRate || 0),
        }));
        setTaxOptions(normalized);
      } catch (error) {
        console.error("Error loading taxes:", error);
        setTaxOptions([]);
      }
    };
    loadTaxes();
  }, []);

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

  const getTaxById = (taxId: unknown) => {
    const normalizedId = String(taxId || "");
    return taxOptions.find((t) => String(t.id || t._id || "") === normalizedId);
  };

  const getTaxLabel = (taxId: unknown) => {
    if (!taxId) return "Non-Taxable";
    const tax = getTaxById(taxId);
    if (!tax) return "Non-Taxable";
    return `${tax.name} [${Number(tax.rate || 0)}%]`;
  };

  const computeLine = (item: PurchaseOrderItem, taxExclusive: boolean) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = Number(getTaxById(item.tax)?.rate || 0);
    const raw = quantity * rate;
    if (!item.tax || taxRate <= 0) {
      return { net: raw, tax: 0, gross: raw };
    }
    if (taxExclusive) {
      const taxAmount = (raw * taxRate) / 100;
      return { net: raw, tax: taxAmount, gross: raw + taxAmount };
    }
    const divisor = 1 + taxRate / 100;
    const net = divisor > 0 ? raw / divisor : raw;
    return { net, tax: raw - net, gross: raw };
  };

  const recalcForm = (next: PurchaseOrderFormData): PurchaseOrderFormData => {
    const taxExclusive = !!next.taxExclusive;
    const itemsWithAmounts = (next.items || []).map((item) => {
      if (item.rowType === "header") {
        return { ...item, amount: "0.00" };
      }
      const line = computeLine(item, taxExclusive);
      return { ...item, amount: line.gross.toFixed(2) };
    });

    const lineItems = itemsWithAmounts.filter((item) => item.rowType !== "header");
    const baseSubTotal = lineItems.reduce((sum: number, item) => sum + computeLine(item, taxExclusive).net, 0);
    const baseTaxTotal = lineItems.reduce((sum: number, item) => sum + computeLine(item, taxExclusive).tax, 0);
    const discountPercent = showTransactionDiscount ? (parseFloat(next.discountPercent) || 0) : 0;
    const discountFactor = Math.max(0, 1 - discountPercent / 100);
    const discountedSubTotal = baseSubTotal * discountFactor;
    const discountedTaxTotal = baseTaxTotal * discountFactor;
    const discountAmount = baseSubTotal - discountedSubTotal;
    const adjustment = parseFloat(String(next.adjustment || 0)) || 0;
    const total = discountedSubTotal + discountedTaxTotal - adjustment;

    return {
      ...next,
      items: itemsWithAmounts,
      discountPercent: showTransactionDiscount ? next.discountPercent : "0",
      subTotal: discountedSubTotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2),
    };
  };

  useEffect(() => {
    setFormData((prev) => {
      const forcedTaxExclusive =
        taxMode === "exclusive" ? true : taxMode === "inclusive" ? false : prev.taxExclusive;
      return recalcForm({
        ...prev,
        taxExclusive: forcedTaxExclusive,
      });
    });
  }, [showTransactionDiscount, taxMode, taxOptions]);

  // Load next purchase order number from database
  useEffect(() => {
    const loadNextPONumber = async () => {
      try {
        const response = await purchaseOrdersAPI.getNextNumber();

        if (response && response.success && response.data && !isEdit) {
          setFormData((prev) => ({
            ...prev,
            purchaseOrderNumber: response.data.number,
          }));
        }
      } catch (error) {
        console.error("Error loading next purchase order number:", error);
        // Fallback to default if error
        // Fallback to default if error and not editing
        if (!isEdit) {
          setFormData((prev) => ({
            ...prev,
            purchaseOrderNumber: "PO-00001",
          }));
        }
      }
    };
    loadNextPONumber();
  }, []);

  // Load customers from API
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customersAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedCustomers = filterActiveRecords(response.data || response.customers || []);
          // Map customers to the format needed for the dropdown
          const formattedCustomers = loadedCustomers.map((customer: any) => ({
            id: customer._id || customer.id,
            displayName: customer.displayName || customer.name || '',
            customerNumber: customer.customerNumber || '',
            email: customer.email || '',
            phone: customer.phone || '',
            companyName: customer.companyName || '',
            avatar: (customer.displayName || customer.name || 'C')[0].toUpperCase(),
            billingAddress: customer.billingAddress || null,
            shippingAddress: customer.shippingAddress || null,
          }));
          setCustomers(formattedCustomers);
        }
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        const rawRows = filterActiveRecords<any>(
          Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.locations)
              ? response.locations
              : Array.isArray(response)
                ? response
                : []
        );

        const mappedLocations: PurchaseLocationOption[] = rawRows
          .map((row: any) => {
            const label = String(
              row?.name ||
              row?.locationName ||
              row?.location_name ||
              row?.branchName ||
              row?.displayName ||
              row?.title ||
              ""
            ).trim();
            if (!label) return null;

            return {
              id: String(row?._id || row?.id || row?.location_id || row?.locationId || label),
              label,
              isDefault: Boolean(row?.isDefault),
              type: String(row?.type || row?.locationType || row?.branchType || "").trim() || undefined,
              source: String(row?.source || "").trim() || undefined,
            } as PurchaseLocationOption;
          })
          .filter(Boolean) as PurchaseLocationOption[];

        const sortedLocations = mappedLocations.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return a.label.localeCompare(b.label);
        });

        setLocationOptions(sortedLocations);

        const preferredLocation =
          sortedLocations.find((loc) => loc.isDefault) ||
          sortedLocations.find((loc) => loc.label.trim().toLowerCase() === "head office") ||
          sortedLocations[0] ||
          null;

        if (preferredLocation) {
          setWarehouseLocation((current) => {
            const currentMatches = sortedLocations.some(
              (loc) => loc.label.trim().toLowerCase() === String(current || "").trim().toLowerCase()
            );
            return currentMatches ? current : preferredLocation.label;
          });
        } else {
          setWarehouseLocation((current) => current || "Head Office");
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        setLocationOptions([{ id: "head-office", label: "Head Office", isDefault: true }]);
        setWarehouseLocation((current) => current || "Head Office");
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectsAPI.getAll();
        const rawProjects = filterActiveRecords<any>(
          Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : []
        );

        const normalizedProjects = rawProjects
          .map((project: any) => ({
            id: String(project?._id || project?.id || "").trim(),
            name: String(project?.name || project?.projectName || "").trim(),
          }))
          .filter((project: ProjectOption) => project.id && project.name)
          .sort((a: ProjectOption, b: ProjectOption) => a.name.localeCompare(b.name));

        setProjects(normalizedProjects);
      } catch (error) {
        console.error("Error loading projects:", error);
        setProjects([]);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    const loadReportingTags = async () => {
      try {
        setIsReportingTagsLoading(true);
        const response = await reportingTagsAPI.getAll({ limit: 10000 });
        const rows = Array.isArray(response) ? response : (response?.data || []);
        const normalizedRows = (Array.isArray(rows) ? rows : [])
          .filter((tag: any) => isReportingTagActive(tag))
          .filter((tag: any) => {
            const appliesTo = normalizeReportingTagAppliesTo(tag);
            return appliesTo.some((entry) =>
              entry === "purchaseorder" ||
              entry === "purchase order" ||
              entry === "purchases"
            );
          })
          .map((tag: any) => ({
            ...tag,
            isRequired: Boolean(tag?.isRequired || tag?.required || tag?.isMandatory),
            options: normalizeReportingTagOptions(tag),
          }));

        setAvailableReportingTags(normalizedRows);
      } catch (error) {
        console.error("Error loading reporting tags:", error);
        setAvailableReportingTags([]);
      } finally {
        setIsReportingTagsLoading(false);
      }
    };

    loadReportingTags();
  }, []);

  useEffect(() => {
    void loadBulkItems(true);
  }, []);

  useEffect(() => {
    if (!selectedProjectId && !selectedProjectName) return;
    if (!projects.length) return;

    const matchedProject = projects.find((project) =>
      project.id === selectedProjectId ||
      project.name.toLowerCase() === selectedProjectName.toLowerCase()
    );

    if (!matchedProject) return;

    setSelectedProjectId(matchedProject.id);
    setSelectedProjectName(matchedProject.name);
  }, [projects, selectedProjectId, selectedProjectName]);

  useEffect(() => {
    if (!transactionLevelDropdownOpen || !transactionLevelDropdownRef.current) return;

    const updatePosition = () => {
      if (!transactionLevelDropdownRef.current) return;
      const rect = transactionLevelDropdownRef.current.getBoundingClientRect();
      setTransactionLevelMenuStyle({
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 220),
      });
    };

    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [transactionLevelDropdownOpen]);

  // Vendor search handler
  const handleVendorSearch = () => {
    const searchTerm = vendorSearchTerm.toLowerCase();
    let results: VendorRecord[] = [];

    if (vendorSearchCriteria === "Display Name") {
      results = allVendors.filter(vendor => {
        const displayName = vendor.displayName || vendor.name || vendor.formData?.displayName || vendor.formData?.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Email") {
      results = allVendors.filter(vendor => {
        const email = vendor.email || vendor.formData?.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Company Name") {
      results = allVendors.filter(vendor => {
        const companyName = vendor.companyName || vendor.formData?.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Phone") {
      results = allVendors.filter(vendor => {
        const phone = vendor.workPhone || vendor.mobile || vendor.formData?.workPhone || vendor.formData?.mobile || "";
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
  const filteredVendorDropdownOptions = vendors.filter((vendor) => {
    const searchTerm = vendorDropdownSearch.toLowerCase().trim();
    if (!searchTerm) return true;
    const fields = [
      vendor.displayName,
      vendor.name,
      vendor.email,
      vendor.companyName,
      vendor.formData?.displayName,
      vendor.formData?.name,
      vendor.formData?.email,
      vendor.formData?.companyName,
    ]
      .map((value) => String(value || "").toLowerCase())
      .filter(Boolean);
    return fields.some((value) => value.includes(searchTerm));
  });

  const selectVendor = (vendor: VendorRecord) => {
    const vendorName =
      vendor.displayName || vendor.name || vendor.formData?.displayName || vendor.formData?.name || "";
    clearFieldError("vendorName");
    setFormData((prev) => ({
      ...prev,
      vendorName,
      vendorId: vendor._id || vendor.id || "",
    }));
    setBillingAddress(vendor.billingAddress || null);
    setShippingAddress(vendor.shippingAddress || null);
    setVendorDropdownSearch("");
    setVendorDropdownOpen(false);
    setVendorSearchModalOpen(false);
    setVendorSearchTerm("");
    setVendorSearchResults([]);
  };

  const clearVendorSelection = () => {
    setFormData((prev) => ({
      ...prev,
      vendorName: "",
      vendorId: "",
    }));
    setBillingAddress(null);
    setShippingAddress(null);
    setVendorDropdownSearch("");
    setVendorDropdownOpen(false);
    setVendorSearchModalOpen(false);
    setVendorSearchTerm("");
    setVendorSearchResults([]);
  };

  const renderAddressLines = (address: AddressRecord | null | undefined, fallbackName: string) => {
    if (!address) {
      return <p className="text-xs text-gray-400 italic">No address available</p>;
    }

    const primaryName = address.attention || address.name || fallbackName;
    const cityState = [address.city, address.state].filter(Boolean).join(", ");
    const countryZip = [address.country, address.zipCode].filter(Boolean).join(" ");

    return (
      <div className="text-sm leading-7 text-gray-800">
        <p className="font-semibold text-black">{primaryName}</p>
        {address.street1 && <p>{address.street1}</p>}
        {address.street2 && <p>{address.street2}</p>}
        {cityState && <p>{cityState}</p>}
        {countryZip && <p>{countryZip}</p>}
        {address.phone && <p>Phone: {address.phone}</p>}
        {address.fax && <p>Fax: {address.fax}</p>}
      </div>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (uploadMenuRef.current && !uploadMenuRef.current.contains(target)) {
        setUploadMenuOpen(false);
      }
      if (!(target instanceof Element) || !target.closest('.vendor-search-criteria-dropdown')) {
        setVendorSearchCriteriaOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) {
        setBulkActionsOpen(false);
      }
      // Close item menu if clicking outside
      const clickedInsideItemTrigger = Object.values(itemMenuTriggerRefs.current).some((ref) => ref?.contains(target));
      const clickedInsideItemMenu = Boolean(itemMenuPortalRef.current?.contains(target));
      const clickedInsideItemDetailTrigger = Object.values(itemDetailActionTriggerRefs.current).some((ref) => ref?.contains(target));
      const clickedInsideItemDetailMenu = Boolean(itemDetailActionPortalRef.current?.contains(target));
      if (!clickedInsideItemTrigger && !clickedInsideItemMenu) {
        setItemMenuOpen(null);
      }
      if (!clickedInsideItemDetailTrigger && !clickedInsideItemDetailMenu) {
        setItemDetailActionOpen(null);
      }
      // Close customer dropdown if clicking outside
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(target)) {
        setVendorDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setCustomerDropdownOpen(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(target) &&
        (!projectMenuRef.current || !projectMenuRef.current.contains(target))
      ) {
        setProjectDropdownOpen(false);
      }
      if (
        reportingTagsRef.current &&
        !reportingTagsRef.current.contains(target) &&
        (!reportingTagsMenuRef.current || !reportingTagsMenuRef.current.contains(target)) &&
        (!reportingTagOptionMenuRef.current || !reportingTagOptionMenuRef.current.contains(target))
      ) {
        setReportingTagsOpen(false);
        setReportingTagOptionOpenKey(null);
      }
      if (transactionLevelDropdownRef.current && !transactionLevelDropdownRef.current.contains(target)) {
        setTransactionLevelDropdownOpen(false);
      }
      Object.keys(openTaxDropdowns).forEach((itemId) => {
        if (!openTaxDropdowns[itemId]) return;
        const ref = taxDropdownRefs.current[itemId];
        if (ref && !ref.contains(target)) {
          setOpenTaxDropdowns((prev) => ({ ...prev, [itemId]: false }));
        }
      });
    };

    if (
      uploadMenuOpen ||
      vendorSearchCriteriaOpen ||
      bulkActionsOpen ||
      itemMenuOpen ||
      vendorDropdownOpen ||
      customerDropdownOpen ||
      projectDropdownOpen ||
      reportingTagsOpen ||
      transactionLevelDropdownOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    uploadMenuOpen,
    vendorSearchCriteriaOpen,
    bulkActionsOpen,
    itemMenuOpen,
    vendorDropdownOpen,
    customerDropdownOpen,
    projectDropdownOpen,
    reportingTagsOpen,
    transactionLevelDropdownOpen,
    openTaxDropdowns,
  ]);

  useEffect(() => {
    const openTaxIds = Object.keys(openTaxDropdowns).filter((itemId) => openTaxDropdowns[itemId]);
    if (openTaxIds.length === 0) return;

    const refresh = () => {
      openTaxIds.forEach((itemId) => updateTaxDropdownMenuPosition(itemId));
    };

    refresh();
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [openTaxDropdowns]);

  useEffect(() => {
    const syncOverlayPositions = () => {
      if (projectDropdownOpen && projectDropdownRef.current) {
        const rect = projectDropdownRef.current.getBoundingClientRect();
        setProjectMenuStyle({
          left: rect.left,
          top: rect.bottom + 8,
          width: Math.max(rect.width, 240),
        });
      }

      if (reportingTagsOpen && reportingTagsRef.current) {
        const rect = reportingTagsRef.current.getBoundingClientRect();
        setReportingTagsMenuStyle({
          left: rect.left,
          top: rect.bottom + 8,
          width: Math.max(rect.width + 190, 440),
        });
      }
    };

    if (!projectDropdownOpen && !reportingTagsOpen) return;

    syncOverlayPositions();
    window.addEventListener("resize", syncOverlayPositions);
    window.addEventListener("scroll", syncOverlayPositions, true);

    return () => {
      window.removeEventListener("resize", syncOverlayPositions);
      window.removeEventListener("scroll", syncOverlayPositions, true);
    };
  }, [projectDropdownOpen, reportingTagsOpen]);

  useEffect(() => {
    if (itemMenuOpen === null) {
      setItemMenuStyle(null);
      return;
    }

    const syncItemMenuPosition = () => {
      const trigger = itemMenuTriggerRefs.current[itemMenuOpen];
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setItemMenuStyle({
        left: rect.left - 186 + rect.width,
        top: rect.bottom + 8,
      });
    };

    syncItemMenuPosition();
    window.addEventListener("resize", syncItemMenuPosition);
    window.addEventListener("scroll", syncItemMenuPosition, true);

    return () => {
      window.removeEventListener("resize", syncItemMenuPosition);
      window.removeEventListener("scroll", syncItemMenuPosition, true);
    };
  }, [itemMenuOpen]);

  useEffect(() => {
    if (itemDetailActionOpen === null) {
      setItemDetailActionStyle(null);
      return;
    }

    const syncItemDetailActionPosition = () => {
      const trigger = itemDetailActionTriggerRefs.current[itemDetailActionOpen];
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setItemDetailActionStyle({
        left: rect.left - 4,
        top: rect.bottom + 8,
      });
    };

    syncItemDetailActionPosition();
    window.addEventListener("resize", syncItemDetailActionPosition);
    window.addEventListener("scroll", syncItemDetailActionPosition, true);

    return () => {
      window.removeEventListener("resize", syncItemDetailActionPosition);
      window.removeEventListener("scroll", syncItemDetailActionPosition, true);
    };
  }, [itemDetailActionOpen]);

  useEffect(() => {
    if (!reportingTagOptionOpenKey) {
      setReportingTagOptionMenuStyle(null);
      return;
    }

    const syncOptionMenuPosition = () => {
      const trigger = reportingTagOptionTriggerRefs.current[reportingTagOptionOpenKey];
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      setReportingTagOptionMenuStyle({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    };

    syncOptionMenuPosition();
    window.addEventListener("resize", syncOptionMenuPosition);
    window.addEventListener("scroll", syncOptionMenuPosition, true);

    return () => {
      window.removeEventListener("resize", syncOptionMenuPosition);
      window.removeEventListener("scroll", syncOptionMenuPosition, true);
    };
  }, [reportingTagOptionOpenKey]);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(projectSearch.trim().toLowerCase())
  );
  const activeItemMenuRow = itemMenuOpen !== null
    ? formData.items.find((item) => item.id === itemMenuOpen) || null
    : null;
  const filteredBulkItems = bulkItems.filter((item) =>
    `${item.name} ${item.sku}`.toLowerCase().includes(bulkItemsSearch.toLowerCase())
  );
  const totalBulkQuantity = bulkSelectedItems.reduce(
    (sum, item) => sum + Math.max(1, Math.floor(Number(bulkItemQuantities[item.id] || 1))),
    0
  );
  const totalQuantity = formData.items
    .filter((item) => item.rowType !== "header")
    .reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

  const selectedReportingTagsCount = availableReportingTags.reduce((count, tag) => {
    const tagId = String(tag?._id || tag?.id || "").trim();
    return tagId && reportingTagDrafts[tagId] ? count + 1 : count;
  }, 0);

  const requiredReportingTagsCount = availableReportingTags.filter((tag) => Boolean(tag?.isRequired || tag?.required || tag?.isMandatory)).length;
  const hasRequiredReportingTags = requiredReportingTagsCount > 0;
  const reportingTagsSummary = availableReportingTags.length
    ? `${selectedReportingTagsCount} out of ${availableReportingTags.length} selected.`
    : "No reporting tags";
  const activeReportingTagId = reportingTagOptionOpenKey?.replace("purchase-order-reporting-tag-", "") || "";
  const activeReportingTag = availableReportingTags.find((tag) => String(tag?._id || tag?.id || "").trim() === activeReportingTagId) || null;
  const activeReportingTagValue = activeReportingTagId ? String(reportingTagDrafts[activeReportingTagId] || "") : "";
  const activeReportingTagOptions = activeReportingTag
    ? [
        { value: "", label: "None" },
        ...((Array.isArray(activeReportingTag.options) ? activeReportingTag.options : []) as any[])
          .map((option: any) => {
            const value = typeof option === "string"
              ? option
              : String(option?.value || option?.label || option?.name || "").trim();
            return { value, label: value };
          })
          .filter((option: { value: string; label: string }) => option.value),
      ]
    : [];
  const activeReportingTagSearch = activeReportingTagId ? String(reportingTagSearches[activeReportingTagId] || "").trim().toLowerCase() : "";
  const filteredActiveReportingTagOptions = activeReportingTagOptions.filter((option) =>
    option.label.toLowerCase().includes(activeReportingTagSearch)
  );

  const handleProjectSelect = (project: ProjectOption) => {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
    setProjectSearch("");
    setProjectDropdownOpen(false);
  };

  const clearProjectSelection = () => {
    setSelectedProjectId("");
    setSelectedProjectName("");
    setProjectSearch("");
    setProjectDropdownOpen(false);
  };

  const getFieldInputClass = (field: PurchaseOrderFieldErrorKey, baseClass: string) =>
    `${baseClass} ${validationErrors[field] ? "border-red-400 ring-1 ring-red-100" : ""}`;

  const clearFieldError = (field: PurchaseOrderFieldErrorKey) => {
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearItemFieldError = (itemId: number, field: keyof PurchaseOrderItemError) => {
    setItemValidationErrors((prev) => {
      if (!prev[itemId]?.[field]) return prev;
      const next = { ...prev };
      next[itemId] = { ...next[itemId] };
      delete next[itemId][field];
      if (Object.keys(next[itemId]).length === 0) {
        delete next[itemId];
      }
      return next;
    });
  };

  const validatePurchaseOrderForm = () => {
    const nextErrors: Partial<Record<PurchaseOrderFieldErrorKey, string>> = {};
    const nextItemErrors: Record<number, PurchaseOrderItemError> = {};
    const { resolvedVendorId, resolvedVendorName } = resolveVendorForSubmit();
    const parsedOrderDate = parseDisplayDateToIso(dateInputValue);
    const parsedDeliveryDate = parseDisplayDateToIso(deliveryDateInputValue);

    if (!resolvedVendorId && !resolvedVendorName) {
      nextErrors.vendorName = "Please select a valid vendor.";
    }

    if (!String(warehouseLocation || "").trim()) {
      nextErrors.warehouseLocation = "Please select a location.";
    }

    if (formData.deliveryAddressType === "Customer") {
      if (!selectedCustomer) {
        nextErrors.customer = "Please select a customer.";
      }
      if (!deliveryAddress) {
        nextErrors.deliveryAddress = "Please choose a valid delivery address.";
      }
    } else if (!deliveryAddress) {
      nextErrors.deliveryAddress = "Please choose a delivery location.";
    }

    if (!String(formData.purchaseOrderNumber || "").trim()) {
      nextErrors.purchaseOrderNumber = "Purchase order number is required.";
    }

    if (!String(dateInputValue || "").trim()) {
      nextErrors.date = "Date is required.";
    } else if (!parsedOrderDate) {
      nextErrors.date = "Enter the date in dd/MM/yyyy format.";
    } else {
      const orderDateValue = parseIsoDateToLocalDate(parsedOrderDate);
      if (orderDateValue && orderDateValue < today) {
        nextErrors.date = "Date cannot be earlier than today.";
      }
    }

    if (!String(formData.paymentTerms || "").trim()) {
      nextErrors.paymentTerms = "Payment terms are required.";
    }

    if (String(deliveryDateInputValue || "").trim() && !parsedDeliveryDate) {
      nextErrors.deliveryDate = "Enter the delivery date in dd/MM/yyyy format.";
    } else if (parsedDeliveryDate) {
      const deliveryDateValue = parseIsoDateToLocalDate(parsedDeliveryDate);
      if (deliveryDateValue && deliveryDateValue < today) {
        nextErrors.deliveryDate = "Delivery date cannot be earlier than today.";
      }
    } else if (parsedDeliveryDate && parsedOrderDate && parsedDeliveryDate < parsedOrderDate) {
      nextErrors.deliveryDate = "Delivery date cannot be earlier than the purchase order date.";
    }

    const missingRequiredReportingTags = availableReportingTags.filter((tag) => {
      const tagId = String(tag?._id || tag?.id || "").trim();
      return Boolean(tagId) && Boolean(tag?.isRequired || tag?.required || tag?.isMandatory) && !String(reportingTagDrafts[tagId] || "").trim();
    });
    if (missingRequiredReportingTags.length > 0) {
      nextErrors.reportingTags = "Please select all required reporting tags.";
    }

    const normalizedItems = Array.isArray(formData.items) ? formData.items : [];
    const lineItems = normalizedItems.filter((item) => item.rowType !== "header");
    if (!lineItems.length) {
      nextErrors.items = "At least one item row is required.";
    } else {
      lineItems.forEach((item) => {
        const rowErrors: PurchaseOrderItemError = {};
        const quantity = Number(item.quantity);
        const rate = Number(item.rate);

        if (!String(item.itemDetails || "").trim()) {
          rowErrors.itemDetails = "Select an item.";
        }
        if (!String(item.account || "").trim()) {
          rowErrors.account = "Select an account.";
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
          rowErrors.quantity = "Enter a quantity greater than 0.";
        }
        if (!Number.isFinite(rate) || rate < 0) {
          rowErrors.rate = "Enter a valid rate.";
        }

        if (Object.keys(rowErrors).length > 0) {
          nextItemErrors[item.id] = rowErrors;
        }
      });
    }

    if (Object.keys(nextItemErrors).length > 0 && !nextErrors.items) {
      nextErrors.items = "Please fix the highlighted item rows.";
    }

    setValidationErrors(nextErrors);
    setItemValidationErrors(nextItemErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0 && Object.keys(nextItemErrors).length === 0,
      resolvedVendorId,
      resolvedVendorName,
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : value;
    if (name === "purchaseOrderNumber") {
      clearFieldError("purchaseOrderNumber");
      setPoNumberingMode("manual");
    }
    if (name === "date") clearFieldError("date");
    if (name === "deliveryDate") clearFieldError("deliveryDate");
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    } as PurchaseOrderFormData));
  };

  const handleDateFieldChange = (field: "date" | "deliveryDate", value: string) => {
    if (field === "date") {
      setDateInputValue(value);
      clearFieldError("date");
    } else {
      setDeliveryDateInputValue(value);
      clearFieldError("deliveryDate");
    }

    const parsedValue = parseDisplayDateToIso(value);
    setFormData((prev) => ({
      ...prev,
      [field]: parsedValue || "",
    }));
  };

  // Handle delivery address type change
  const handleDeliveryAddressTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as PurchaseOrderFormData["deliveryAddressType"];
    clearFieldError("deliveryAddress");
    clearFieldError("customer");
    setFormData((prev) => ({ ...prev, deliveryAddressType: value }));

    if (value === "Organization" && organizationData) {
      // Set organization address
      setDeliveryAddress({
        name: organizationData.organizationName || organizationData.name || '',
        address1: organizationData.address?.street1 || '',
        address2: organizationData.address?.street2 || '',
        city: organizationData.address?.city || '',
        state: organizationData.address?.state || '',
        country: organizationData.address?.country || '',
        zipCode: organizationData.address?.zipCode || '',
      });
      setSelectedCustomer(null);
      setCustomerBillingAddress(null);
      setCustomerShippingAddress(null);
    } else if (value === "Customer") {
      // Clear delivery address until customer is selected
      setDeliveryAddress(null);
    }
  };

  const handleItemSelect = (id: number, selectedItem: SelectableItem) => {
    clearItemFieldError(id, "itemDetails");
    clearFieldError("items");
    setFormData((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === id) {
          const rate = Number(selectedItem.purchaseRate || 0);

          const updatedItem = {
            ...item,
            itemId: selectedItem._id || selectedItem.id, // Save item ID reference
            itemDetails: selectedItem.name,
            description: selectedItem.description || item.description || "",
            rate: rate.toFixed(2),
            trackInventory: Boolean(selectedItem.trackInventory),
            stockOnHand: Number(selectedItem.stockOnHand || 0),
            unit: selectedItem.unit || "",
          };

          // Set account based on inventory tracking status
          if (selectedItem.trackInventory && selectedItem.inventoryAccount) {
            updatedItem.account = selectedItem.inventoryAccount;
          } else if (selectedItem.purchaseAccount) {
            updatedItem.account = selectedItem.purchaseAccount;
          }

          return updatedItem;
        }
        return item;
      });
      return recalcForm({
        ...prev,
        items: updatedItems,
      });
    });
  };

  const handleItemChange = (id: number, field: PurchaseOrderItemField, value: string) => {
    if (field === "itemDetails" || field === "account" || field === "quantity" || field === "rate") {
      clearItemFieldError(id, field);
      clearFieldError("items");
    }
    setFormData((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      );
      return recalcForm({
        ...prev,
        items: updatedItems,
      });
    });
  };

  const clearItemSelection = (id: number) => {
    clearItemFieldError(id, "itemDetails");
    clearItemFieldError(id, "account");
    setFormData((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === id
          ? {
              ...createEmptyItem(id),
              description: item.description,
              showAdditionalInfo: item.showAdditionalInfo,
            }
          : item
      );

      return recalcForm({
        ...prev,
        items: updatedItems,
      });
    });
  };

  const handleViewItemDetails = (id: number) => {
    const row = formData.items.find((item) => item.id === id);
    const itemId = String(row?.itemId || "").trim();
    if (!itemId) return;
    setItemDetailActionOpen(null);
    navigate("/items", {
      state: {
        selectedItemId: itemId,
        initialView: "detail",
        returnTo: location.pathname,
      },
    });
  };

  const handleEditItemDetails = (id: number) => {
    const row = formData.items.find((item) => item.id === id);
    const itemId = String(row?.itemId || "").trim();
    if (!itemId) return;
    setItemDetailActionOpen(null);
    navigate("/items", {
      state: {
        selectedItemId: itemId,
        initialView: "edit",
        returnTo: location.pathname,
      },
    });
  };

  const toggleAdditionalInfo = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, showAdditionalInfo: !item.showAdditionalInfo } : item
      ),
    }));
  };

  const handleHeaderTitleChange = (id: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, headerTitle: value } : item
      ),
    }));
  };

  const addNewRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem(Date.now())],
    }));
  };

  const insertRowAfter = (id: number) => {
    setFormData((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const nextItems = [...prev.items];
      nextItems.splice(index + 1, 0, createEmptyItem(Date.now()));
      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const insertHeaderAfter = (id: number) => {
    setFormData((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const nextItems = [...prev.items];
      nextItems.splice(index + 1, 0, createHeaderRow(Date.now()));
      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const cloneRow = (id: number) => {
    setFormData((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const sourceRow = prev.items[index];
      const clonedRow: PurchaseOrderItem = {
        ...sourceRow,
        id: Date.now(),
      };

      const nextItems = [...prev.items];
      nextItems.splice(index + 1, 0, clonedRow);
      return recalcForm({
        ...prev,
        items: nextItems,
      });
    });
  };

  const removeRow = (id: number) => {
    const lineItemsCount = formData.items.filter((item) => item.rowType !== "header").length;
    const targetRow = formData.items.find((item) => item.id === id);
    const canRemove = targetRow?.rowType === "header" || lineItemsCount > 1;

    if (canRemove) {
      setFormData((prev) =>
        recalcForm({
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        })
      );
    }
  };

  const loadBulkItems = async (silent = false) => {
    try {
      if (!silent) {
        setBulkItemsLoading(true);
      }
      const response = await itemsAPI.getAll();
      const rawItems = filterActiveRecords<any>(Array.isArray(response) ? response : (response?.data || []));
      const normalizedItems: BulkItemOption[] = (rawItems || []).map((item: any) => ({
        id: String(item._id || item.id || ""),
        name: item.name || "",
        sku: item.sku || "",
        purchaseRate: Number(item.purchaseRate ?? item.costPrice ?? item.rate ?? 0),
        purchaseAccount: item.purchaseAccount || item.purchase_account || "",
        inventoryAccount: item.inventoryAccount || item.inventory_account || "",
        trackInventory: !!item.trackInventory,
        stockOnHand: Number(item.stockQuantity ?? item.stockOnHand ?? item.quantityOnHand ?? 0),
        unit: item.unit || "",
      })).filter((item) => item.id);
      setBulkItems(normalizedItems);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem("purchase-order-items-cache", JSON.stringify(normalizedItems));
        } catch {
          // ignore cache write failures
        }
      }
    } catch (error) {
      console.error("Error loading items for bulk insert:", error);
      setBulkItems([]);
    } finally {
      if (!silent) {
        setBulkItemsLoading(false);
      }
    }
  };

  const closeBulkItemsModal = () => {
    setBulkItemsModalOpen(false);
    setBulkItemsSearch("");
    setBulkSelectedItemIds({});
    setBulkSelectedItems([]);
    setBulkItemQuantities({});
    setBulkInsertAfterRowId(null);
  };

  const openBulkItemsModal = async (afterRowId?: number) => {
    setBulkItemsModalOpen(true);
    setBulkInsertAfterRowId(typeof afterRowId === "number" ? afterRowId : null);
    if (bulkItems.length === 0) {
      await loadBulkItems();
    }
  };

  const handleBulkItemSelect = (selectedItem: BulkItemOption) => {
    const isSelected = bulkSelectedItems.some((item) => item.id === selectedItem.id);
    if (isSelected) {
      setBulkSelectedItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setBulkSelectedItemIds((prev) => {
        const next = { ...prev };
        delete next[selectedItem.id];
        return next;
      });
      setBulkItemQuantities((prev) => {
        const next = { ...prev };
        delete next[selectedItem.id];
        return next;
      });
      return;
    }

    setBulkSelectedItems((prev) => [...prev, selectedItem]);
    setBulkSelectedItemIds((prev) => ({ ...prev, [selectedItem.id]: true }));
    setBulkItemQuantities((prev) => ({ ...prev, [selectedItem.id]: prev[selectedItem.id] || 1 }));
  };

  const handleBulkQuantityChange = (itemId: string, quantity: number) => {
    setBulkItemQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, Math.floor(Number(quantity) || 1)),
    }));
  };

  const handleAddSelectedBulkItems = () => {
    if (!bulkSelectedItems.length) return;

    setFormData((prev) => {
      const newRows: PurchaseOrderItem[] = bulkSelectedItems.map((selectedItem) => {
        const rate = Number(selectedItem.purchaseRate || 0);
        const account = selectedItem.trackInventory && selectedItem.inventoryAccount
          ? selectedItem.inventoryAccount
          : (selectedItem.purchaseAccount || "");
        const quantity = Math.max(1, Math.floor(Number(bulkItemQuantities[selectedItem.id] || 1)));

        return {
          id: Date.now() + Math.random(),
          rowType: "item",
          headerTitle: "",
          itemId: selectedItem.id,
          itemDetails: selectedItem.name,
          description: "",
          account,
          quantity: quantity.toString(),
          rate: rate.toFixed(2),
          tax: "",
          amount: (quantity * rate).toFixed(2),
          trackInventory: selectedItem.trackInventory,
          stockOnHand: Number(selectedItem.stockOnHand || 0),
          unit: selectedItem.unit || "",
          showAdditionalInfo: false,
        };
      });

      const nextItems = [...prev.items];
      if (bulkInsertAfterRowId !== null) {
        const insertIndex = nextItems.findIndex((item) => item.id === bulkInsertAfterRowId);
        if (insertIndex !== -1) {
          nextItems.splice(insertIndex + 1, 0, ...newRows);
        } else {
          nextItems.push(...newRows);
        }
      } else {
        nextItems.push(...newRows);
      }

      return recalcForm({
        ...prev,
        items: nextItems,
      });
    });

    closeBulkItemsModal();
  };

  const normalizeText = (value: unknown) => String(value ?? "").trim();
  const isObjectId = (value: unknown) => /^[a-f\d]{24}$/i.test(normalizeText(value));

  const resolveVendorForSubmit = () => {
    const typedVendorName = normalizeText(formData.vendorName);
    const normalizedVendorName = typedVendorName.toLowerCase();

    const matchedVendor = vendors.find((vendor) => {
      const candidateNames = [
        vendor?.displayName,
        vendor?.name,
        vendor?.companyName,
        vendor?.formData?.displayName,
        vendor?.formData?.name,
        vendor?.formData?.companyName,
      ]
        .map((name) => normalizeText(name).toLowerCase())
        .filter(Boolean);

      return candidateNames.includes(normalizedVendorName);
    });

    const vendorIdCandidates = [
      formData.vendorId,
      matchedVendor?._id,
      matchedVendor?.id,
    ]
      .map((id) => normalizeText(id))
      .filter(Boolean);

    const resolvedVendorId = vendorIdCandidates.find((candidate) => isObjectId(candidate)) || "";
    const resolvedVendorName =
      typedVendorName
      || normalizeText(
        matchedVendor?.displayName
        || matchedVendor?.name
        || matchedVendor?.formData?.displayName
        || matchedVendor?.formData?.name
      );

    return { resolvedVendorId, resolvedVendorName };
  };

  const isDuplicatePurchaseOrderNumberError = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    const status = Number(error?.status || 0);
    const hasPONumberText = message.includes("purchase order number") || message.includes("po number");
    const hasDuplicateText = message.includes("already exists") || message.includes("duplicate");
    return hasPONumberText && hasDuplicateText && (status === 0 || status === 400 || status === 409);
  };

  const fetchLatestPurchaseOrderNumber = async () => {
    try {
      const response = await purchaseOrdersAPI.getNextNumber();
      const nextNumber = String(response?.data?.number || "").trim();
      if (nextNumber) {
        setFormData((prev) => ({
          ...prev,
          purchaseOrderNumber: nextNumber,
        }));
        return nextNumber;
      }
    } catch (error) {
      console.warn("Failed to refresh purchase order number:", error);
    }

    return "";
  };

  const createPurchaseOrderWithNumberRetry = async (purchaseOrderData: any) => {
    const shouldAutoRefreshNumber = !isEdit && poNumberingMode === "auto";
    const payload = { ...purchaseOrderData };

    try {
      return await purchaseOrdersAPI.create(payload);
    } catch (error: any) {
      if (!shouldAutoRefreshNumber || !isDuplicatePurchaseOrderNumberError(error)) {
        throw error;
      }

      const retryNumber = await fetchLatestPurchaseOrderNumber();
      if (!retryNumber) {
        throw error;
      }

      const retryPayload = {
        ...payload,
        purchase_order_number: retryNumber,
      };
      return await purchaseOrdersAPI.create(retryPayload);
    }
  };

  const syncPurchaseOrderCache = (savedOrder: any) => {
    if (typeof window === "undefined") return [];

    try {
      const cached = window.sessionStorage.getItem(PURCHASE_ORDERS_CACHE_KEY);
      const parsed = cached ? JSON.parse(cached) : [];
      const currentCache = Array.isArray(parsed) ? parsed : [];
      const savedId = String(savedOrder?._id || savedOrder?.id || "").trim();

      const nextCache = savedId
        ? currentCache.map((order: any) => {
            const orderId = String(order?._id || order?.id || "").trim();
            return orderId === savedId ? { ...order, ...savedOrder, id: savedId } : order;
          })
        : currentCache;

      if (savedId && !nextCache.some((order: any) => String(order?._id || order?.id || "").trim() === savedId)) {
        nextCache.unshift({ ...savedOrder, id: savedId });
      }

      writeCachedArray(PURCHASE_ORDERS_CACHE_KEY, nextCache);
      return nextCache;
    } catch (error) {
      console.error("Failed to sync purchase order cache:", error);
      return [];
    }
  };

  const removePurchaseOrderFromCache = (orderId: string) => {
    if (typeof window === "undefined" || !orderId) return [];

    try {
      const cached = window.sessionStorage.getItem(PURCHASE_ORDERS_CACHE_KEY);
      const parsed = cached ? JSON.parse(cached) : [];
      const currentCache = Array.isArray(parsed) ? parsed : [];
      const nextCache = currentCache.filter((order: any) => String(order?._id || order?.id || "").trim() !== orderId);
      writeCachedArray(PURCHASE_ORDERS_CACHE_KEY, nextCache);
      return nextCache;
    } catch (error) {
      console.error("Failed to remove purchase order from cache:", error);
      return [];
    }
  };

  const buildOptimisticPurchaseOrder = (purchaseOrderData: any, status: PurchaseOrderSaveStatus) => {
    const optimisticId = isEdit
      ? String(routeOrderId || editOrder?._id || editOrder?.id || `po-temp-${Date.now()}`)
      : `po-temp-${Date.now()}`;

    return {
      _id: optimisticId,
      id: optimisticId,
      date: purchaseOrderData.date,
      purchaseOrderNumber: purchaseOrderData.purchase_order_number,
      purchase_order_number: purchaseOrderData.purchase_order_number,
      referenceNumber: purchaseOrderData.reference_number,
      reference_number: purchaseOrderData.reference_number,
      vendorName: purchaseOrderData.vendor_name,
      vendor_name: purchaseOrderData.vendor_name,
      vendorId: purchaseOrderData.vendor_id,
      vendor_id: purchaseOrderData.vendor_id,
      deliveryDate: purchaseOrderData.delivery_date,
      delivery_date: purchaseOrderData.delivery_date,
      expectedDate: purchaseOrderData.delivery_date,
      paymentTerms: purchaseOrderData.payment_terms,
      payment_terms: purchaseOrderData.payment_terms,
      shipmentPreference: purchaseOrderData.shipment_preference,
      shipment_preference: purchaseOrderData.shipment_preference,
      status,
      billedStatus: "Unbilled",
      billed_status: "unbilled",
      total: Number(purchaseOrderData.total || 0),
      subTotal: Number(purchaseOrderData.sub_total || 0),
      sub_total: Number(purchaseOrderData.sub_total || 0),
      notes: purchaseOrderData.notes || "",
      terms: purchaseOrderData.terms || "",
      items: purchaseOrderData.items || [],
      reportingTags: purchaseOrderData.reporting_tags || [],
      reporting_tags: purchaseOrderData.reporting_tags || [],
      projectId: purchaseOrderData.project_id,
      project_id: purchaseOrderData.project_id,
      projectName: purchaseOrderData.project_name,
      project_name: purchaseOrderData.project_name,
      isOptimistic: true,
    };
  };

  const handleSubmit = async (e: React.SyntheticEvent | undefined, status: PurchaseOrderSaveStatus) => {
    e?.preventDefault?.();
    if (saveLoadingState || submitLockRef.current) return;
    submitLockRef.current = true;
    setSaveLoadingState(status === "issued" ? "issued" : "draft");
    let optimisticOrderId = "";

    try {
      const { isValid, resolvedVendorId, resolvedVendorName } = validatePurchaseOrderForm();
      if (!isValid) {
        alert("Please fix the validation errors before saving this purchase order.");
        return;
      }

      const currentNumber = String(formData.purchaseOrderNumber || "").trim();

      // Construct payload
      const purchaseOrderData = {
        date: formData.date,
        purchase_order_number: currentNumber,
        reference_number: formData.referenceNumber,
        vendor_name: resolvedVendorName,
        vendor_id: resolvedVendorId,
        status: "draft", // Always save as draft initially, status will change to ISSUED after email is sent
        delivery_date: formData.deliveryDate,
        project_id: selectedProjectId || undefined,
        project_name: selectedProjectName || undefined,
        reporting_tags: availableReportingTags
          .map((tag) => {
            const tagId = String(tag?._id || tag?.id || "").trim();
            const value = String(reportingTagDrafts[tagId] || "").trim();
            if (!tagId || !value) return null;
            return {
              tagId,
              name: String(tag?.name || "Tag").trim(),
              value,
            };
          })
          .filter(Boolean),
        transaction_level: formData.transactionLevel,
        total: parseFloat(formData.total),
        sub_total: parseFloat(formData.subTotal),
        items: (formData.items || [])
          .filter((item) => item.rowType !== "header")
          .map(item => ({
          item: item.itemId, // Send the item ID reference
          name: item.itemDetails, // Explicitly send name/details
          description: item.description || "",
          itemDetails: item.itemDetails,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount),
          tax_id: item.tax || null,
          account_id: item.account
        })),
        tax_exclusive: !!formData.taxExclusive,
        payment_terms: formData.paymentTerms,
        shipment_preference: formData.shipmentPreference,
        notes: formData.notes,
        terms: formData.termsAndConditions // Update key to match backend 'terms'
      };

      const shouldNavigateOptimistically = status === "draft";
      if (shouldNavigateOptimistically) {
        const optimisticOrder = buildOptimisticPurchaseOrder(purchaseOrderData, status);
        optimisticOrderId = String(optimisticOrder._id || optimisticOrder.id || "").trim();
        const cachedOrders = syncPurchaseOrderCache(optimisticOrder);
        window.dispatchEvent(new Event("purchaseOrdersUpdated"));
        navigate("/purchases/purchase-orders", {
          state: { purchaseOrders: cachedOrders.length > 0 ? cachedOrders : undefined },
        });
      }

      let response;
      if (isEdit && (routeOrderId || editOrder?._id || editOrder?.id)) {
        // Update existing order
        const orderId = routeOrderId || editOrder?.id || editOrder?._id;
        response = await purchaseOrdersAPI.update(orderId, purchaseOrderData);
      } else {
        // Create new order
        response = await createPurchaseOrderWithNumberRetry(purchaseOrderData);
      }

      if (response && (response.code === 0 || response.success)) {
        const savedOrder = response.data || response.purchaseOrder || response.purchase_order || null;
        if (optimisticOrderId) {
          removePurchaseOrderFromCache(optimisticOrderId);
        }
        const cachedOrders = savedOrder ? syncPurchaseOrderCache(savedOrder) : [];

        // Trigger custom event for same-tab updates
        window.dispatchEvent(new Event("purchaseOrdersUpdated"));

        // If Save and Send was clicked, navigate to email page
        if (status === "issued" && savedOrder?._id) {
          navigate(`/purchases/purchase-orders/${savedOrder._id}/email`, {
            state: { purchaseOrder: savedOrder },
          });
        } else if (!shouldNavigateOptimistically) {
          // Otherwise go back to the list
          navigate("/purchases/purchase-orders", {
            state: { purchaseOrders: cachedOrders.length > 0 ? cachedOrders : undefined },
          });
        }
      } else {
        if (optimisticOrderId) {
          removePurchaseOrderFromCache(optimisticOrderId);
          window.dispatchEvent(new Event("purchaseOrdersUpdated"));
        }
        alert(response?.message || "Failed to create purchase order");
      }
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      if (optimisticOrderId) {
        removePurchaseOrderFromCache(optimisticOrderId);
        window.dispatchEvent(new Event("purchaseOrdersUpdated"));
      }
      if (isDuplicatePurchaseOrderNumberError(error)) {
        alert("Purchase order number already exists. Please use a different number.");
      } else {
        alert(error?.message || "An error occurred while creating the purchase order.");
      }
    } finally {
      if (isMountedRef.current) {
        setSaveLoadingState(null);
      }
      submitLockRef.current = false;
    }
  };

  const handleCancel = () => {
    navigate("/purchases/purchase-orders");
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => {
      return recalcForm({
        ...prev,
        discountPercent: showTransactionDiscount ? value : "0",
      });
    });
  };

  const handleAdjustmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => {
      return recalcForm({
        ...prev,
        adjustment: value,
      });
    });
  };

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      minHeight: "100vh",
    },
    header: {
      backgroundColor: "#ffffff",
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    form: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "24px",
    },
    section: {
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "16px",
    },
    formRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
      marginBottom: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    input: {
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    select: {
      padding: "10px 32px 10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
    },
    textarea: {
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      width: "100%",
      minHeight: "80px",
      resize: "vertical",
      fontFamily: "inherit",
    },
    button: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    primaryButton: {
      backgroundColor: "#156372",
      color: "#ffffff",
    },
    secondaryButton: {
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "16px",
    },
    tableHeader: {
      backgroundColor: "#f9fafb",
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      borderBottom: "1px solid #e5e7eb",
    },
    tableCell: {
      padding: "12px",
      borderBottom: "1px solid #e5e7eb",
    },
    actions: {
      display: "flex",
      gap: "12px",
      paddingTop: "24px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "24px",
    },
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white" style={{ backgroundColor: "#ffffff" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-[0_1px_0_rgba(229,231,235,0.9)]">
        <h1 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Purchase Order" : "New Purchase Order"}</h1>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={(e) => handleSubmit(e, "issued")} className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col">
            {/* Main Content Area */}
            <div className="pl-0 pr-6 py-6 space-y-6">
          {/* Vendor and Delivery Section */}
          <div className="mb-2 max-w-[860px] space-y-4">
              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <div className="max-w-[540px]" ref={vendorDropdownRef}>
                  <input
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    value={formData.vendorName}
                    onChange={() => {}}
                    className="absolute h-0 w-0 opacity-0 pointer-events-none"
                  />
                  <div className="relative">
                    <div className="flex items-stretch gap-0">
                      <button
                        type="button"
                        onClick={() => setVendorDropdownOpen((prev) => !prev)}
                        className={`relative flex h-9 flex-1 items-center rounded-md rounded-r-none border bg-white px-3 pr-14 text-left text-sm text-gray-900 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] ${
                          validationErrors.vendorName ? "border-red-400 ring-1 ring-red-100" : "border-gray-300"
                        }`}
                      >
                        <span className={formData.vendorName ? "text-gray-900" : "text-gray-400"}>
                          {formData.vendorName || "Select a Vendor"}
                        </span>
                        {formData.vendorName ? (
                          <button
                            type="button"
                            aria-label="Clear vendor"
                            onClick={(event) => {
                              event.stopPropagation();
                              clearVendorSelection();
                            }}
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        ) : null}
                        {vendorDropdownOpen ? (
                          <ChevronUp size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#156372]" />
                        ) : (
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVendorDropdownOpen(true)}
                        className="ml-0 flex h-9 items-center justify-center rounded-md rounded-l-none border border-[#156372] bg-[#156372] px-3 text-white hover:bg-[#0D4A52]"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      >
                        <Search size={14} />
                      </button>
                    </div>

                    {vendorDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-20 rounded-xl border border-[#d7e3ff] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                        <div className="relative mb-2">
                          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={vendorDropdownSearch}
                            onChange={(e) => setVendorDropdownSearch(e.target.value)}
                            placeholder="Search"
                            className="h-9 w-full rounded-md border border-[#8ab4ff] bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {filteredVendorDropdownOptions.length > 0 ? (
                            filteredVendorDropdownOptions.map((vendor, index) => {
                              const vendorName =
                                vendor.displayName || vendor.name || vendor.formData?.displayName || vendor.formData?.name || "";
                              const vendorEmail = vendor.email || vendor.formData?.email || "";
                              const vendorCompany = vendor.companyName || vendor.formData?.companyName || "";
                              const isSelected = formData.vendorId === (vendor._id || vendor.id || "");
                              return (
                                <button
                                  key={vendor._id || vendor.id || `${vendorName}-${index}`}
                                  type="button"
                                  onClick={() => selectVendor(vendor)}
                                  className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors last:mb-0 ${
                                    isSelected ? "bg-[#eef4ff] text-[#0f172a] ring-1 ring-[#cfe0ff]" : "bg-white text-[#0f172a] hover:bg-[#f8fafc]"
                                  }`}
                                >
                                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                                    isSelected ? "bg-white text-[#156372]" : "bg-[#f1f5f9] text-gray-600"
                                  }`}>
                                    {(vendorName || "V").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className={`text-sm font-medium ${isSelected ? "text-[#0f172a]" : "text-[#0f172a]"}`}>
                                      {vendorName}
                                    </div>
                                    <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${
                                      isSelected ? "text-[#64748b]" : "text-[#64748b]"
                                    }`}>
                                      {vendorEmail ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Mail size={12} />
                                          <span>{vendorEmail}</span>
                                        </span>
                                      ) : null}
                                      {vendorCompany ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Building2 size={12} />
                                          <span>{vendorCompany}</span>
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-4 text-sm text-gray-500">No vendors found</div>
                          )}
                        </div>

                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <button
                            type="button"
                            onClick={() => navigate("/purchases/vendors/new")}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-[#156372] hover:text-[#0D4A52]"
                          >
                            <Plus size={14} />
                            <span>New Vendor</span>
                          </button>
                        </div>
                      </div>
                    )}
                    {validationErrors.vendorName ? (
                      <p className="mt-2 text-sm text-red-500">{validationErrors.vendorName}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Location Field */}
              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                      <div className="max-w-[330px]">
                        <LocationSelectDropdown
                          value={warehouseLocation}
                          options={locationOptions}
                    onSelect={(location) => {
                      setWarehouseLocation(location.label);
                      clearFieldError("warehouseLocation");
                      clearFieldError("deliveryAddress");
                    }}
                    placeholder="Select Warehouse"
                  />
                  {validationErrors.warehouseLocation ? (
                    <p className="mt-2 text-sm text-red-500">{validationErrors.warehouseLocation}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Billing and Shipping Address (Auto-populated) */}
            {(billingAddress || shippingAddress) && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Billing Address</span>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <Pencil size={10} />
                    </button>
                  </div>
                  {billingAddress ? (
                    <div className="text-xs text-gray-800 space-y-0.5">
                      <p className="font-bold text-black">{billingAddress.attention || formData.vendorName}</p>
                      <p>{billingAddress.street1}</p>
                      <p>{billingAddress.street2}</p>
                      <p>{billingAddress.city}</p>
                      <p>{billingAddress.state} {billingAddress.zipCode}</p>
                      <p>{billingAddress.country}</p>
                      {billingAddress.phone && <p className="text-gray-600">Phone: {billingAddress.phone}</p>}
                      {billingAddress.fax && <p className="text-gray-600">Fax: {billingAddress.fax}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No billing address</p>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Shipping Address</span>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <Pencil size={10} />
                    </button>
                  </div>
                  {shippingAddress ? (
                    <div className="text-xs text-gray-800 space-y-0.5">
                      <p className="font-bold text-black">{shippingAddress.attention || formData.vendorName}</p>
                      <p>{shippingAddress.street1}</p>
                      <p>{shippingAddress.street2}</p>
                      <p>{shippingAddress.city}</p>
                      <p>{shippingAddress.state} {shippingAddress.zipCode}</p>
                      <p>{shippingAddress.country}</p>
                      {shippingAddress.phone && <p className="text-gray-600">Phone: {shippingAddress.phone}</p>}
                      {shippingAddress.fax && <p className="text-gray-600">Fax: {shippingAddress.fax}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No shipping address</p>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="pl-0 pr-6 pt-2 mt-2">
            <div className="max-w-[640px] space-y-4">
              <div className="pt-4 border-t border-gray-100">
                <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)] md:items-start">
                  <label className="block text-sm font-medium text-red-500 md:pt-2">
                    Delivery Address<span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryAddressType"
                          checked={formData.deliveryAddressType === "Organization"}
                          onChange={() =>
                            handleDeliveryAddressTypeChange({
                              target: { value: "Organization", name: "deliveryAddressType" },
                            } as any)
                          }
                          className="h-4 w-4 text-[#156372] focus:ring-[#156372]"
                        />
                        <span>Locations</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryAddressType"
                          checked={formData.deliveryAddressType === "Customer"}
                          onChange={() =>
                            handleDeliveryAddressTypeChange({
                              target: { value: "Customer", name: "deliveryAddressType" },
                            } as any)
                          }
                          className="h-4 w-4 text-[#156372] focus:ring-[#156372]"
                        />
                        <span>Customer</span>
                      </label>
                    </div>

                    {formData.deliveryAddressType === "Organization" ? (
                      <div className="max-w-[330px]">
                    <LocationSelectDropdown
                      value={warehouseLocation}
                      options={locationOptions}
                      onSelect={(location) => {
                        setWarehouseLocation(location.label);
                        clearFieldError("warehouseLocation");
                        clearFieldError("deliveryAddress");
                          }}
                          placeholder="Select Warehouse"
                        />
                        {validationErrors.deliveryAddress ? (
                          <p className="mt-2 text-sm text-red-500">{validationErrors.deliveryAddress}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="max-w-[720px] space-y-5" ref={customerDropdownRef}>
                        <div className="relative max-w-[330px]">
                          <div className="flex items-stretch gap-0">
                            <button
                              type="button"
                              onClick={() => setCustomerDropdownOpen((prev) => !prev)}
                              className={`relative flex h-9 flex-1 items-center rounded-md rounded-r-none border bg-white px-3 text-left text-sm text-gray-900 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] ${
                                validationErrors.customer || validationErrors.deliveryAddress ? "border-red-400 ring-1 ring-red-100" : "border-gray-300"
                              }`}
                            >
                              <span className={`${selectedCustomer ? "text-gray-900" : "text-gray-400"}`}>
                                {selectedCustomer?.displayName || "Select Customer"}
                              </span>
                              {customerDropdownOpen ? (
                                <ChevronUp size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#156372]" />
                              ) : (
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomerDropdownOpen(true)}
                              className="ml-0 flex h-9 items-center justify-center rounded-md rounded-l-none border border-[#156372] bg-[#156372] px-3 text-white hover:bg-[#0D4A52]"
                              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                            >
                              <Search size={14} />
                            </button>
                          </div>

                          {customerDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-20 rounded-xl border border-[#d7e3ff] bg-white p-3 shadow-[0_8px_24px_rgba(37,99,235,0.12)]">
                              <div className="relative mb-2">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  value={customerSearch}
                                  onChange={(e) => setCustomerSearch(e.target.value)}
                                  placeholder="Search"
                                  className="h-9 w-full rounded-md border border-[#8ab4ff] bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                />
                              </div>

                              <div className="max-h-56 space-y-2 overflow-y-auto">
                                {customers
                                  .filter((c) => c.displayName.toLowerCase().includes(customerSearch.toLowerCase()))
                                  .map((customer, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => {
                                        clearFieldError("customer");
                                        clearFieldError("deliveryAddress");
                                        setSelectedCustomer(customer);
                                        setCustomerSearch("");
                                        setCustomerDropdownOpen(false);
                                        const nextBillingAddress = customer.billingAddress || null;
                                        const nextShippingAddress = customer.shippingAddress || customer.billingAddress || null;

                                        setCustomerBillingAddress(nextBillingAddress);
                                        setCustomerShippingAddress(nextShippingAddress);

                                        if (nextShippingAddress || nextBillingAddress) {
                                          const deliverySource = nextShippingAddress || nextBillingAddress;
                                          setDeliveryAddress({
                                            name: customer.displayName,
                                            address1: deliverySource?.street1 || "",
                                            address2: deliverySource?.street2 || "",
                                            city: deliverySource?.city || "",
                                            state: deliverySource?.state || "",
                                            country: deliverySource?.country || "",
                                            zipCode: deliverySource?.zipCode || "",
                                            phone: deliverySource?.phone || "",
                                            fax: deliverySource?.fax || "",
                                          });
                                        } else {
                                          setDeliveryAddress(null);
                                        }
                                      }}
                                      className="flex w-full items-center gap-3 rounded-lg bg-[#eaf2ff] px-4 py-3 text-left transition-colors hover:bg-[#dbeafe]"
                                    >
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-gray-600">
                                        {(customer.displayName || "C").charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white/0 sr-only">{customer.displayName}</div>
                                        <div className="text-sm font-medium text-[#0f172a]">{customer.displayName}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#2563eb]">
                                          {customer.email ? (
                                            <span className="inline-flex items-center gap-1 text-[#2563eb]">
                                              <Mail size={12} />
                                              <span className="text-[#2563eb]">{customer.email}</span>
                                            </span>
                                          ) : null}
                                          {customer.companyName ? (
                                            <span className="inline-flex items-center gap-1 text-[#2563eb]">
                                              <Building2 size={12} />
                                              <span className="text-[#2563eb]">{customer.companyName}</span>
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                {customers.filter((c) => c.displayName.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 ? (
                                  <div className="px-2 py-3 text-sm text-gray-500">No customers found</div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                        {validationErrors.customer ? (
                          <p className="text-sm text-red-500">{validationErrors.customer}</p>
                        ) : null}
                        {validationErrors.deliveryAddress ? (
                          <p className="text-sm text-red-500">{validationErrors.deliveryAddress}</p>
                        ) : null}

                        {selectedCustomer ? (
                          <div className="w-full min-w-0">
                            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                              <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Billing Address</span>
                                  <button type="button" className="text-gray-400 hover:text-gray-600">
                                    <Pencil size={10} />
                                  </button>
                                </div>
                                {renderAddressLines(customerBillingAddress, selectedCustomer.displayName)}
                              </div>
                              <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Shipping Address</span>
                                  <button type="button" className="text-gray-400 hover:text-gray-600">
                                    <Pencil size={10} />
                                  </button>
                                </div>
                                {renderAddressLines(customerShippingAddress, selectedCustomer.displayName)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="max-w-[360px] text-sm leading-7 text-slate-500">
                            Stock on Hand will not be affected only in case of dropshipments. Selecting the Customer option in the Deliver To field of a normal purchase order will have an effect on your stock level
                          </p>
                        )}
                      </div>
                    )}

                    {formData.deliveryAddressType === "Organization" && deliveryAddress && (
                      <div className="pt-1 text-[#1e293b]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">{deliveryAddress.name}</span>
                          <button type="button" className="text-[#2563eb] hover:text-[#1d4ed8]">
                            <Pencil size={12} />
                          </button>
                        </div>
                        <div className="text-sm leading-7 text-slate-600">
                          {deliveryAddress.address1 && <div>{deliveryAddress.address1}</div>}
                          <div>{deliveryAddress.city}{deliveryAddress.state ? `, ${deliveryAddress.state}` : ""}</div>
                          <div>{deliveryAddress.country}{deliveryAddress.zipCode ? ` ${deliveryAddress.zipCode}` : ""}</div>
                        </div>
                        <button type="button" className="mt-3 text-sm text-[#2563eb] hover:text-[#1d4ed8]">
                          Change destination to deliver
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-red-500">
                  Purchase Order#<span className="text-red-500">*</span>
                </label>
                <div className="relative max-w-[330px]">
                  <input
                    type="text"
                    name="purchaseOrderNumber"
                    value={formData.purchaseOrderNumber}
                    onChange={handleChange}
                    className={getFieldInputClass("purchaseOrderNumber", "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-1 focus:ring-[#156372] outline-none")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPoConfigModalOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#156372] hover:text-[#0D4A52]"
                  >
                    <Settings size={14} />
                  </button>
                </div>
                {validationErrors.purchaseOrderNumber ? (
                  <p className="mt-2 text-sm text-red-500">{validationErrors.purchaseOrderNumber}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-gray-700">Reference#</label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  className="w-full max-w-[330px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-[#156372] outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <div className="w-full max-w-[330px]">
                  <DatePicker
                    value={dateInputValue}
                    onChange={(value) => handleDateFieldChange("date", value)}
                    placeholder="dd/MM/yyyy"
                    minDate={today}
                  />
                </div>
                {validationErrors.date ? (
                  <p className="text-sm text-red-500">{validationErrors.date}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                <div className="grid gap-6 md:grid-cols-[330px_minmax(320px,1fr)] md:items-center">
                  <div className="w-full">
                    <DatePicker
                      value={deliveryDateInputValue}
                      onChange={(value) => handleDateFieldChange("deliveryDate", value)}
                      placeholder="dd/MM/yyyy"
                      minDate={today}
                    />
                  </div>
                  {validationErrors.deliveryDate ? (
                    <p className="mt-2 text-sm text-red-500">{validationErrors.deliveryDate}</p>
                  ) : null}
                  <div className="grid gap-2 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                    <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                    <div className="min-w-[220px]">
                      <PaymentTermsDropdown
                        value={formData.paymentTerms}
                        onChange={(val) => {
                          clearFieldError("paymentTerms");
                          setFormData({ ...formData, paymentTerms: val });
                        }}
                        onConfigureTerms={() => setConfigureTermsOpen(true)}
                        customTerms={paymentTermsList}
                      />
                      {validationErrors.paymentTerms ? (
                        <p className="mt-2 text-sm text-red-500">{validationErrors.paymentTerms}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                <label className="block text-sm font-medium text-gray-700">Shipment Preference</label>
                <input
                  type="text"
                  name="shipmentPreference"
                  value={formData.shipmentPreference}
                  onChange={handleChange}
                  placeholder="Choose the shipment preference or type to add"
                  className="w-full max-w-[330px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-[#156372] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 mb-8">
            <div className="mr-24 max-w-[1180px]">
              <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">Warehouse Location</label>
                  <div className="w-[210px]">
                        <LocationSelectDropdown
                          value={warehouseLocation}
                          options={locationOptions}
                          onSelect={(location) => {
                            setWarehouseLocation(location.label);
                            clearFieldError("warehouseLocation");
                            clearFieldError("deliveryAddress");
                          }}
                          placeholder="Select Warehouse"
                        />
                  </div>
                </div>

                <div ref={transactionLevelDropdownRef} className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-5">
                  <Tag size={16} className="text-gray-500" />
                  <div className="relative w-[220px]">
                    <button
                      type="button"
                      onClick={() => {
                        setTransactionLevelDropdownOpen((prev) => {
                          const next = !prev;
                          if (next) setTransactionLevelSearch("");
                          return next;
                        });
                      }}
                      className="flex h-10 w-full items-center justify-between bg-transparent px-0 text-left text-sm text-gray-700 outline-none transition-colors hover:text-[#156372] focus:text-[#156372]"
                    >
                      <span className="flex items-center gap-2">
                        <Info size={16} className="text-gray-500" />
                        <span className={formData.transactionLevel ? "text-gray-900" : "text-gray-400"}>
                          {formData.transactionLevel || "At Transaction Level"}
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${transactionLevelDropdownOpen ? "rotate-180 text-[#3B82F6]" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {transactionLevelDropdownOpen && transactionLevelMenuStyle && typeof document !== "undefined" && document.body && createPortal(
                <div
                  className="fixed z-[13000] overflow-hidden rounded-lg bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
                  style={{
                    left: transactionLevelMenuStyle.left,
                    top: transactionLevelMenuStyle.top,
                    width: transactionLevelMenuStyle.width,
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <div className="border-b border-slate-200 bg-white p-2.5">
                    <div className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-2.5 py-2 focus-within:border-blue-500">
                      <Search size={14} className="shrink-0 text-slate-400" />
                      <input
                        type="text"
                        className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        placeholder="Search"
                        value={transactionLevelSearch}
                        onChange={(event) => setTransactionLevelSearch(event.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto bg-white p-1">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Discount Type
                    </div>
                    {transactionLevelOptions
                      .filter((option) => option.label.toLowerCase().includes(transactionLevelSearch.trim().toLowerCase()))
                      .map((option) => {
                        const isSelected = formData.transactionLevel === option.label;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, transactionLevel: option.label }));
                              setTransactionLevelDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                              isSelected ? "bg-[#3B82F6] text-white" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="min-w-0 truncate">{option.label}</span>
                            {isSelected && <Check size={15} className="shrink-0 text-white" />}
                          </button>
                        );
                      })}
                  </div>
                </div>,
                document.body
              )}

              <div className="flex items-center justify-between rounded-t-xl border border-gray-200 border-b-0 bg-gray-50 px-4 py-4">
                <h3 className="text-[18px] font-semibold text-gray-900">Item Table</h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded px-2 py-1 text-[14px] font-medium text-[#156372] hover:bg-teal-50"
                >
                  <Check size={16} className="text-[#156372]" />
                  Bulk Actions
                </button>
              </div>

              <div className="overflow-visible rounded-b-2xl border border-t-0 border-gray-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "34%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "2%" }} />
                  </colgroup>
                  <thead className="border-b border-gray-200 bg-white">
                    <tr>
                      <th className="border-r border-gray-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ITEM DETAILS</th>
                      <th className="border-r border-gray-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">ACCOUNT</th>
                      <th className="border-r border-gray-200 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">QUANTITY</th>
                      <th className="border-r border-gray-200 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">RATE</th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">AMOUNT</th>
                      <th className="px-2 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {formData.items.map((item, index) => {
                      const rowTrackInventory = Boolean(item.trackInventory);
                      const rowStockOnHand = Number(item.stockOnHand || 0);
                      const rowUnit = item.unit || "";
                      const isHeaderRow = item.rowType === "header";

                      if (isHeaderRow) {
                        return (
                          <tr key={item.id || index} className="group border-b border-gray-200 bg-slate-50/60 align-middle">
                            <td colSpan={5} className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1 cursor-move px-0.5 py-1.5">
                                  <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                  <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                  <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                </div>
                                <input
                                  type="text"
                                  value={item.headerTitle || ""}
                                  onChange={(e) => handleHeaderTitleChange(item.id, e.target.value)}
                                  placeholder="Enter header name"
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-600"
                                />
                              </div>
                            </td>
                            <td className="relative w-0 px-0 py-2.5 text-sm overflow-visible">
                              <div className="pointer-events-none absolute -right-16 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                                <button
                                  type="button"
                                  ref={(element) => {
                                    itemMenuTriggerRefs.current[item.id] = element;
                                  }}
                                  onClick={() => {
                                    setItemMenuOpen((prev) => prev === item.id ? null : item.id);
                                  }}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRow(item.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-rose-400 shadow-sm hover:bg-rose-50 hover:text-rose-500"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <React.Fragment key={item.id || index}>
                        <tr className="group border-b border-gray-200 align-top min-h-[118px]">
                          <td className="border-r border-gray-200 px-3 py-2.5 text-sm">
                            <div className="relative flex items-start gap-2">
                              <div className="flex flex-col gap-1 cursor-move px-0.5 py-1.5">
                                <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                                <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                              </div>
                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                                <ImageIcon size={18} className="text-gray-300" />
                              </div>
                              <div className="relative flex-1">
                                <ItemSelectDropdown
                                  value={item.itemDetails}
                                  onSelect={(selectedItem) => handleItemSelect(item.id, selectedItem)}
                                  className="flex-1"
                                />
                                {!!item.itemId && (
                                  <div className="absolute right-0 top-0 flex items-center gap-1">
                                    <button
                                      type="button"
                                      ref={(element) => {
                                        itemDetailActionTriggerRefs.current[item.id] = element;
                                      }}
                                      onClick={() => {
                                        setItemDetailActionOpen((prev) => (prev === item.id ? null : item.id));
                                      }}
                                      className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                                      aria-label="Open item actions"
                                    >
                                      <MoreVertical size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => clearItemSelection(item.id)}
                                      className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                                      aria-label="Clear selected item"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                )}
                                {(item.showAdditionalInfo || item.description) && (
                                  <textarea
                                    value={item.description || ""}
                                    onChange={(e) => setFormData((prev) => ({
                                      ...prev,
                                      items: prev.items.map((row) =>
                                        row.id === item.id ? { ...row, description: e.target.value } : row
                                      ),
                                    }))}
                                    placeholder="Add a description to your item"
                                    className="mt-3 min-h-[64px] w-full rounded-lg border border-gray-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600"
                                  />
                                )}
                                {!!item.sku && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    SKU: {item.sku}
                                  </div>
                                )}
                                {itemValidationErrors[item.id]?.itemDetails ? (
                                  <p className="mt-1 text-xs text-red-500">{itemValidationErrors[item.id]?.itemDetails}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2.5 text-sm">
                            <div>
                              <AccountSelectDropdown
                                value={item.account}
                                onSelect={(acc) => handleItemChange(item.id, "account", acc.name)}
                                className="w-full"
                                allowedTypes={PURCHASE_ACCOUNT_TYPES}
                              />
                              {itemValidationErrors[item.id]?.account ? (
                                <p className="mt-1 text-xs text-red-500">{itemValidationErrors[item.id]?.account}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2.5 text-sm align-top">
                            <div className="flex min-h-[118px] flex-col items-stretch justify-start">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                                className={`h-11 w-full rounded-lg border bg-gray-50 px-3 text-right text-sm font-medium text-gray-900 tabular-nums shadow-sm outline-none focus:border-teal-600 ${
                                  itemValidationErrors[item.id]?.quantity ? "border-red-400 ring-1 ring-red-100" : "border-gray-200"
                                }`}
                              />
                              {rowTrackInventory ? (
                                <div className="mt-2 space-y-1 text-center text-[11px] leading-4">
                                  <div className="text-gray-700">
                                    <span className="font-medium">Stock on Hand:</span>{" "}
                                    <span className="text-gray-900">
                                      {rowStockOnHand.toFixed(0)} {rowUnit}
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
                            {itemValidationErrors[item.id]?.quantity ? (
                              <p className="mt-1 text-xs text-red-500">{itemValidationErrors[item.id]?.quantity}</p>
                            ) : null}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2.5 text-sm">
                            <div className="flex flex-col items-end">
                              <input
                                type="text"
                                value={item.rate}
                                onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                                className={`h-11 w-full rounded-lg border bg-white px-3 text-right text-sm font-medium text-gray-900 tabular-nums shadow-sm outline-none focus:border-teal-600 ${
                                  itemValidationErrors[item.id]?.rate ? "border-red-400 ring-1 ring-red-100" : "border-gray-200"
                                }`}
                              />
                              <button
                                type="button"
                                className="mt-4 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb]"
                              >
                                Recent Transactions
                              </button>
                            </div>
                            {itemValidationErrors[item.id]?.rate ? (
                              <p className="mt-1 text-xs text-red-500">{itemValidationErrors[item.id]?.rate}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <div className="flex items-center justify-end">
                              <input
                                type="text"
                                value={item.amount}
                                readOnly
                                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-right text-sm font-medium text-gray-900 tabular-nums shadow-sm outline-none"
                              />
                            </div>
                          </td>
                          <td className="relative w-0 px-0 py-2.5 text-sm overflow-visible">
                            <div className="absolute -right-16 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                              <button
                                type="button"
                                ref={(element) => {
                                  itemMenuTriggerRefs.current[item.id] = element;
                                }}
                                onClick={() => {
                                  setItemMenuOpen((prev) => prev === item.id ? null : item.id);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600"
                              >
                                <MoreVertical size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRow(item.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-rose-400 shadow-sm hover:bg-rose-50 hover:text-rose-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200 bg-slate-50/60">
                          <td colSpan={5} className="px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-6 text-sm">
                              <button
                                type="button"
                                ref={projectDropdownRef}
                                onClick={() => {
                                  setProjectDropdownOpen((prev) => !prev);
                                  setReportingTagsOpen(false);
                                  setReportingTagOptionOpenKey(null);
                                }}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                              >
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-gray-400/20 text-gray-500">
                                  <Building2 size={12} />
                                </span>
                                <span className={selectedProjectName ? "text-gray-800" : "text-gray-500"}>
                                  {selectedProjectName || "Select a project"}
                                </span>
                                <ChevronDown size={12} className="text-gray-400" />
                              </button>
                              <button
                                type="button"
                                ref={reportingTagsRef}
                                onClick={() => {
                                  setReportingTagsOpen((prev) => !prev);
                                  setProjectDropdownOpen(false);
                                }}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                              >
                                <Tag size={12} className={hasRequiredReportingTags ? "text-green-500" : "text-gray-400"} />
                                <span className={hasRequiredReportingTags ? "text-red-500" : "text-gray-600"}>
                                  {hasRequiredReportingTags ? "Reporting Tags*" : "Reporting Tags"}
                                </span>
                                <span className="text-gray-500">{reportingTagsSummary}</span>
                                <ChevronDown size={12} className="text-gray-400" />
                              </button>
                            </div>
                            {validationErrors.reportingTags ? (
                              <p className="mt-2 text-sm text-red-500">{validationErrors.reportingTags}</p>
                            ) : null}
                            {validationErrors.items ? (
                              <p className="mt-2 text-sm text-red-500">{validationErrors.items}</p>
                            ) : null}
                          </td>
                          <td className="px-0 py-0"></td>
                        </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={addNewRow}
                      className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#eef2ff] px-4 py-2.5 text-sm font-medium text-[#156372] shadow-sm hover:bg-[#e0e7ff]"
                    >
                      <Plus size={14} className="text-[#3b82f6]" />
                      Add New Row
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>
                    <button
                      type="button"
                      onClick={openBulkItemsModal}
                      className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#eef2ff] px-4 py-2.5 text-sm font-medium text-[#156372] shadow-sm hover:bg-[#e0e7ff]"
                    >
                      <Plus size={14} className="text-[#3b82f6]" />
                      Add Items in Bulk
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Will be displayed on purchase order"
                      className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm font-inherit outline-none resize-y focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="w-full max-w-[420px] flex-shrink-0 xl:ml-auto">
                  <div className="rounded-3xl border border-gray-200 bg-gray-50/80 px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[14px] font-semibold text-gray-900">Sub Total</div>
                        <div className="mt-1 text-[14px] font-medium text-gray-900">
                          Total Quantity : {totalQuantity}
                        </div>
                      </div>
                      <span className="text-[14px] font-semibold text-gray-900 tabular-nums">{formData.subTotal}</span>
                    </div>
                    {showTransactionDiscount && (
                      <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
                        <label className="text-[14px] font-medium text-gray-700">Discount</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={formData.discountPercent}
                            onChange={handleDiscountChange}
                            className="h-10 w-28 rounded-l-lg border border-gray-200 bg-white px-3 text-right text-sm outline-none focus:border-teal-600"
                            min="0"
                            max="100"
                          />
                          <span className="-ml-2 flex h-10 w-8 items-center justify-center rounded-r-lg border border-l-0 border-gray-200 bg-white text-sm text-gray-600">%</span>
                          <span className="w-24 text-right text-[14px] font-medium text-gray-900 tabular-nums">{formData.discountAmount}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5">
                      <span className="text-[17px] font-semibold text-gray-900">Total</span>
                      <div className="text-right">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">USD</div>
                        <span className="text-[17px] font-semibold text-gray-900 tabular-nums">{formData.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Terms &amp; Conditions</label>
                  <textarea
                    name="termsAndConditions"
                    value={formData.termsAndConditions}
                    onChange={handleChange}
                    placeholder="Enter terms and conditions..."
                    className="min-h-[96px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none resize-y focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Attach File(s) to Purchase Order</label>
                  <div className="relative" ref={uploadMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                      className="inline-flex w-full items-center justify-between rounded-md border border-dashed border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-gray-400"
                    >
                      <span className="inline-flex items-center gap-2">
                        <UploadIcon size={16} />
                        Upload File
                      </span>
                      <ChevronDown size={14} />
                    </button>
                    {uploadMenuOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-gray-200 bg-white shadow-md">
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setUploadMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-teal-50"
                        >
                          Attach From Desktop
                        </button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" multiple className="hidden" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>

      {itemMenuOpen !== null && itemMenuStyle && typeof document !== "undefined" && document.body && createPortal(
        <div
          ref={itemMenuPortalRef}
          className="fixed z-[1250] min-w-[196px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]"
          style={{
            left: itemMenuStyle.left,
            top: itemMenuStyle.top,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (activeItemMenuRow?.rowType !== "header" && itemMenuOpen !== null) {
                toggleAdditionalInfo(itemMenuOpen);
              }
              setItemMenuOpen(null);
            }}
            className={`m-1 flex w-[calc(100%-8px)] items-center rounded-lg px-3 py-2 text-left text-sm font-medium shadow-sm ${
              activeItemMenuRow?.rowType === "header"
                ? "cursor-default border border-slate-200 bg-slate-100 text-slate-500"
                : "border-2 border-blue-500 bg-[#4b8bf4] text-white"
            }`}
          >
            {activeItemMenuRow?.rowType === "header"
              ? "Header Row"
              : activeItemMenuRow?.showAdditionalInfo
                ? "Hide Additional Information"
                : "Show Additional Information"}
          </button>
          <button
            type="button"
            onClick={() => {
              cloneRow(itemMenuOpen);
              setItemMenuOpen(null);
            }}
            className="flex w-full items-center px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Clone
          </button>
          <button
            type="button"
            onClick={() => {
              insertRowAfter(itemMenuOpen);
              setItemMenuOpen(null);
            }}
            className="flex w-full items-center border-t border-slate-100 px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Insert New Row
          </button>
          <button
            type="button"
            onClick={() => {
              openBulkItemsModal(itemMenuOpen);
              setItemMenuOpen(null);
            }}
            className="flex w-full items-center border-t border-slate-100 px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Insert Items in Bulk
          </button>
          <button
            type="button"
            onClick={() => {
              insertHeaderAfter(itemMenuOpen);
              setItemMenuOpen(null);
            }}
            className="flex w-full items-center border-t border-slate-100 px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Insert New Header
          </button>
        </div>,
        document.body
      )}

      {itemDetailActionOpen !== null && itemDetailActionStyle && typeof document !== "undefined" && document.body && createPortal(
        <div
          ref={itemDetailActionPortalRef}
          className="fixed z-[1260] min-w-[198px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]"
          style={{
            left: itemDetailActionStyle.left,
            top: itemDetailActionStyle.top,
          }}
        >
          <button
            type="button"
            onClick={() => handleEditItemDetails(itemDetailActionOpen)}
            className="m-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg border-2 border-blue-500 bg-[#4b8bf4] px-3 py-2 text-left text-sm font-medium text-white shadow-sm"
          >
            <Pencil size={14} />
            Edit Item
          </button>
          <button
            type="button"
            onClick={() => handleViewItemDetails(itemDetailActionOpen)}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Package size={14} />
            View Item Details
          </button>
        </div>,
        document.body
      )}

      {projectDropdownOpen && projectMenuStyle && typeof document !== "undefined" && document.body && createPortal(
        <div
          ref={projectMenuRef}
          className="z-[1200] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.16)]"
          style={{
            position: "fixed",
            left: projectMenuStyle.left,
            top: projectMenuStyle.top,
            width: projectMenuStyle.width,
          }}
        >
          <div className="border-b border-slate-200 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-blue-400 bg-white px-3 py-2 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]">
              <Search size={15} className="text-slate-400" />
              <input
                autoFocus
                type="text"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search"
                className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {selectedProjectName ? (
              <button
                type="button"
                onClick={clearProjectSelection}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
              >
                None
              </button>
            ) : null}
            {filteredProjects.length ? (
              filteredProjects.map((project) => {
                const isSelected = project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleProjectSelect(project)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                      isSelected
                        ? "bg-[#4b8bf4] text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {project.name}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">No projects found.</div>
            )}
          </div>
        </div>,
        document.body
      )}

      {reportingTagsOpen && reportingTagsMenuStyle && typeof document !== "undefined" && document.body && createPortal(
        <div
          ref={reportingTagsMenuRef}
          className="z-[1200] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
          style={{
            position: "fixed",
            left: reportingTagsMenuStyle.left,
            top: reportingTagsMenuStyle.top,
            width: reportingTagsMenuStyle.width,
          }}
        >
          <div className="border-b border-slate-200 px-4 py-3 text-lg font-medium text-slate-800">
            Reporting Tags
          </div>
          <div className="space-y-4 px-5 py-5">
            {isReportingTagsLoading ? (
              <div className="text-sm text-slate-500">Loading reporting tags...</div>
            ) : availableReportingTags.length === 0 ? (
              <div className="text-sm text-slate-500">There are no reporting tags for purchase orders.</div>
            ) : (
              availableReportingTags.map((tag) => {
                const tagId = String(tag?._id || tag?.id || "").trim();
                if (!tagId) return null;

                const selectedValue = String(reportingTagDrafts[tagId] || "");
                const normalizedOptions = [
                  { value: "", label: "None" },
                  ...((Array.isArray(tag?.options) ? tag.options : []) as any[]).map((option: any) => {
                    const value = typeof option === "string"
                      ? option
                      : String(option?.value || option?.label || option?.name || "").trim();
                    return { value, label: value };
                  }).filter((option: { value: string; label: string }) => option.value),
                ];
                const optionKey = `purchase-order-reporting-tag-${tagId}`;
                const selectedLabel = normalizedOptions.find((option) => option.value === selectedValue)?.label || "None";
                const isOptionOpen = reportingTagOptionOpenKey === optionKey;

                return (
                  <div key={tagId} className="max-w-[320px]">
                    <label className={`mb-2 block text-sm ${tag?.isRequired ? "text-red-500" : "text-slate-700"}`}>
                      {String(tag?.name || "Reporting Tag")}
                      {tag?.isRequired ? " *" : ""}
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        ref={(element) => {
                          reportingTagOptionTriggerRefs.current[optionKey] = element;
                        }}
                        onClick={() => {
                          setReportingTagOptionOpenKey((prev) => prev === optionKey ? null : optionKey);
                        }}
                        className="flex h-11 w-full items-center justify-between rounded-lg border border-blue-400 bg-white px-3 text-sm text-slate-700 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
                      >
                        <span className={selectedValue ? "text-slate-700" : "text-slate-500"}>{selectedLabel}</span>
                        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOptionOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {activeReportingTag && reportingTagOptionMenuStyle && typeof document !== "undefined" && document.body && createPortal(
            <div
              ref={reportingTagOptionMenuRef}
              className="fixed z-[1300] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
              style={{
                left: reportingTagOptionMenuStyle.left,
                top: reportingTagOptionMenuStyle.top,
                width: reportingTagOptionMenuStyle.width,
              }}
            >
              <div className="border-b border-slate-200 p-2">
                <div className="flex items-center gap-2 rounded-lg border border-blue-400 bg-white px-3 py-2 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    value={reportingTagSearches[activeReportingTagId] || ""}
                    onChange={(e) => setReportingTagSearches((prev) => ({ ...prev, [activeReportingTagId]: e.target.value }))}
                    placeholder="Search"
                    className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {filteredActiveReportingTagOptions.map((option) => {
                  const isSelected = option.value === activeReportingTagValue;
                  return (
                    <button
                      key={`${activeReportingTagId}-${option.value || "none"}`}
                      type="button"
                              onClick={() => {
                                clearFieldError("reportingTags");
                                setReportingTagDrafts((prev) => ({ ...prev, [activeReportingTagId]: option.value }));
                                setReportingTagOptionOpenKey(null);
                                setReportingTagSearches((prev) => ({ ...prev, [activeReportingTagId]: "" }));
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                        isSelected
                          ? "bg-[#4b8bf4] text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {!filteredActiveReportingTagOptions.length ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No options found.</div>
                ) : null}
              </div>
            </div>,
            document.body
          )}
          <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setReportingTagsOpen(false);
                setReportingTagOptionOpenKey(null);
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setReportingTagsOpen(false);
                setReportingTagOptionOpenKey(null);
              }}
              className="rounded-md bg-[#22c55e] px-4 py-2 text-sm font-medium text-white hover:bg-[#16a34a]"
            >
              Save
            </button>
          </div>
        </div>,
        document.body
      )}

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
                      {VENDOR_SEARCH_CRITERIA_OPTIONS.map((criteria) => (
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
                    vendorPaginatedResults.map((vendor, index) => (
                      <tr
                        key={vendor._id || vendor.id || `${vendor.displayName || vendor.name || "vendor"}-${index}`}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectVendor(vendor)}
                      >
                        <td className="px-4 py-3 text-sm text-teal-700 hover:underline">
                          {vendor.displayName || vendor.name || vendor.formData?.displayName || vendor.formData?.name || ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.email || vendor.formData?.email || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.companyName || vendor.formData?.companyName || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.workPhone || vendor.mobile || vendor.formData?.workPhone || vendor.formData?.mobile || ""}</td>
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

      {/* Configure Purchase Order# Preferences Modal */}
      {poConfigModalOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setPoConfigModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Configure Purchase Order# Preferences</h2>
              <button
                type="button"
                onClick={() => setPoConfigModalOpen(false)}
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center hover:bg-[#0D4A52]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Configure Multiple Series Section */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Settings size={20} className="text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Configure multiple transaction number series to auto-generate transaction numbers with unique prefixes according to your business needs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPoConfigModalOpen(false);
                    navigate("/settings/purchase-orders");
                  }}
                  className="text-teal-700 hover:text-teal-800 text-sm font-medium whitespace-nowrap"
                >
                  Configure →
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-gray-700 mb-6">
                {poNumberingMode === "auto"
                  ? "Your purchase order numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?"
                  : "You have selected manual purchase order numbering. Do you want us to auto-generate it for you?"}
              </p>

              {/* Radio Options */}
              <div className="space-y-4">
                {/* Auto-generate option */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="poNumberingMode"
                    value="auto"
                    checked={poNumberingMode === "auto"}
                    onChange={(e) => setPoNumberingMode(e.target.value)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        Continue auto-generating purchase order numbers
                      </span>
                      <Info size={16} className="text-gray-400" />
                    </div>
                    {poNumberingMode === "auto" && (
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Prefix</label>
                          <input
                            type="text"
                            value={poPrefix}
                            onChange={(e) => setPoPrefix(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Next Number</label>
                          <input
                            type="text"
                            value={poNextNumber}
                            onChange={(e) => setPoNextNumber(e.target.value)}
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* Manual option */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="poNumberingMode"
                    value="manual"
                    checked={poNumberingMode === "manual"}
                    onChange={(e) => setPoNumberingMode(e.target.value)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Enter purchase order numbers manually
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  // Update the purchase order number based on settings
                  if (poNumberingMode === "auto") {
                    setFormData((prev) => ({
                      ...prev,
                      purchaseOrderNumber: `${poPrefix}${poNextNumber}`,
                    }));
                  }
                  setPoConfigModalOpen(false);
                }}
                className="cursor-pointer transition-all bg-[#156372] text-white px-6 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setPoConfigModalOpen(false)}
                className="cursor-pointer transition-all bg-white text-gray-700 px-6 py-2 rounded-lg border-gray-300 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white flex gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, "draft")}
          disabled={!!saveLoadingState}
          className="cursor-pointer transition-all bg-white text-gray-700 px-6 py-2 rounded-lg border-gray-300 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saveLoadingState === "draft" ? "Saving..." : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, "issued")}
          disabled={!!saveLoadingState}
          className="cursor-pointer transition-all bg-[#156372] text-white px-6 py-2 rounded-lg border-[#0D4A52] border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saveLoadingState === "issued" ? "Saving..." : "Save and Send"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={!!saveLoadingState}
          className="cursor-pointer transition-all bg-white text-gray-700 px-6 py-2 rounded-lg border-gray-300 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          Cancel
        </button>
      </div>

      {bulkItemsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeBulkItemsModal}>
          <div className="flex h-[72vh] min-h-[620px] w-[92vw] max-w-[1030px] flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="relative border-b border-gray-200 px-5 py-4">
              <h3 className="text-[18px] font-medium text-gray-900">Add Items in Bulk</h3>
              <button
                type="button"
                onClick={closeBulkItemsModal}
                className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label="Close bulk items modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="flex w-[46%] min-w-0 flex-col border-r border-gray-200">
                <div className="border-b border-gray-200 p-4">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={bulkItemsSearch}
                      onChange={(e) => setBulkItemsSearch(e.target.value)}
                      placeholder="Type to search or scan the barcode of the item"
                      className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-2">
                  {bulkItemsLoading ? (
                    <div className="p-6 text-sm text-gray-500">Loading items...</div>
                  ) : filteredBulkItems.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">No items found.</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredBulkItems.map((item: any, index: number) => {
                        const isSelected = bulkSelectedItems.some((selected) => selected.id === item.id);
                        return (
                          <button
                            key={item.id || `${item.name || item.sku || "bulk-item"}-${index}`}
                            type="button"
                            onClick={() => handleBulkItemSelect(item)}
                            className={`flex w-full items-start justify-between rounded-md border px-4 py-3 text-left ${
                              isSelected ? "border-[#156372] bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                {item.sku ? `SKU: ${item.sku} ` : ""}
                                Purchase Rate: {Number(item.purchaseRate || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="ml-4 flex-shrink-0 text-right">
                              <div className="text-xs text-blue-500">Stock on Hand</div>
                              <div className={`text-sm ${Number(item.stockOnHand || 0) > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                {Number(item.stockOnHand || 0).toFixed(2)} {item.unit || ""}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-gray-800">Selected Items</span>
                    <span className="rounded-full border border-gray-300 px-3 py-0.5 text-sm text-gray-700">
                      {bulkSelectedItems.length}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">Total Quantity: {totalBulkQuantity}</span>
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                  {bulkSelectedItems.length === 0 ? (
                    <div className="flex h-full min-h-[360px] items-center justify-center text-center text-sm text-gray-500">
                      Click the item names from the left pane to select them
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bulkSelectedItems.map((item) => {
                        const quantity = Math.max(1, Math.floor(Number(bulkItemQuantities[item.id] || 1)));
                        return (
                          <div key={item.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
                            <div className="min-w-0 pr-4 text-sm text-gray-900">
                              <div className="truncate">{item.sku ? `[${item.sku}] ` : ""}{item.name}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-full border-2 border-blue-500 px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkQuantityChange(item.id, quantity - 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={quantity}
                                  onChange={(e) => handleBulkQuantityChange(item.id, Number(e.target.value))}
                                  className="w-12 border-0 bg-transparent text-center text-sm font-medium text-gray-900 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleBulkQuantityChange(item.id, quantity + 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleBulkItemSelect(item)}
                                className="text-rose-500 hover:text-rose-600"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeBulkItemsModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSelectedBulkItems}
                disabled={bulkSelectedItems.length === 0}
                className="px-4 py-2 text-sm bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Add Items
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Configure Payment Terms Modal */}
      <ConfigurePaymentTermsModal
        isOpen={configureTermsOpen}
        onClose={() => setConfigureTermsOpen(false)}
        initialTerms={paymentTermsList}
        onSave={(newTerms) => {
          setPaymentTermsList(newTerms);
          // Optionally save to backend/local storage here
        }}
      />
    </div>
  );
}

