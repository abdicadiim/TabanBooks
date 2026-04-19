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
  Grid3x3,
  MoreVertical,
  Check,
} from "lucide-react";

import { PaymentTermsDropdown } from "../../../components/PaymentTermsDropdown";
import { ConfigurePaymentTermsModal } from "../../../components/ConfigurePaymentTermsModal";
import { ItemSelectDropdown } from "../../../components/ItemSelectDropdown";
import { AccountSelectDropdown } from "../../../components/AccountSelectDropdown";
import { defaultPaymentTerms, PaymentTerm } from "../../../hooks/usePaymentTermsDropdown";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { purchaseOrdersAPI, vendorsAPI, customersAPI, taxesAPI, itemsAPI } from "../../../services/api";
import { filterActiveRecords } from "../shared/activeFilters";

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
};

type PurchaseOrderItem = {
  id: number;
  itemId?: RecordId;
  itemDetails: string;
  description?: string;
  account: string;
  quantity: string;
  rate: string;
  tax: string;
  amount: string;
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

const createEmptyItem = (id: number): PurchaseOrderItem => ({
  id,
  itemDetails: "",
  description: "",
  account: "",
  quantity: "1.00",
  rate: "0.00",
  tax: "",
  amount: "0.00",
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
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const vendorRef = useRef<HTMLDivElement>(null);
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);

  // Vendor search modal state
  const [vendorSearchCriteria, setVendorSearchCriteria] = useState<VendorSearchCriteria>("Display Name");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState<VendorRecord[]>([]);
  const [vendorSearchPage, setVendorSearchPage] = useState(1);
  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);
  const [allVendors, setAllVendors] = useState<VendorRecord[]>([]);

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
  const [billingAddress, setBillingAddress] = useState<AddressRecord | null>(null);
  const [shippingAddress, setShippingAddress] = useState<AddressRecord | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<AddressRecord | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationRecord | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [bulkItemsModalOpen, setBulkItemsModalOpen] = useState(false);
  const [bulkItemsLoading, setBulkItemsLoading] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItemOption[]>([]);
  const [bulkItemsSearch, setBulkItemsSearch] = useState("");
  const [bulkSelectedItemIds, setBulkSelectedItemIds] = useState<Record<string, boolean>>({});
  const [saveLoadingState, setSaveLoadingState] = useState<null | "draft" | "issued">(null);
  const submitLockRef = useRef(false);
  const [openTaxDropdowns, setOpenTaxDropdowns] = useState<Record<string, boolean>>({});
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const taxDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [warehouseLocation, setWarehouseLocation] = useState("Head Office");
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);
  const [taxPreferenceDropdownOpen, setTaxPreferenceDropdownOpen] = useState(false);
  const [taxPreferenceSearch, setTaxPreferenceSearch] = useState("");
  const taxPreferenceDropdownRef = useRef<HTMLDivElement>(null);
  const [transactionLevelDropdownOpen, setTransactionLevelDropdownOpen] = useState(false);
  const [transactionLevelSearch, setTransactionLevelSearch] = useState("");
  const transactionLevelDropdownRef = useRef<HTMLDivElement>(null);
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "both";
  const lockTaxExclusive = taxMode === "inclusive" || taxMode === "exclusive";
  const computedTaxExclusive = taxMode === "exclusive" ? true : taxMode === "inclusive" ? false : formData.taxExclusive;
  const warehouseOptions = ["Head Office"];
  const taxPreferenceOptions = ["Tax Exclusive", "Tax Inclusive"];
  const transactionLevelOptions = ["At Transaction Level", "At Line Item Level"];

  // Edit Mode State
  const location = useLocation();
  const { id: routeOrderId } = useParams();
  const { editOrder: stateEditOrder, isEdit: stateIsEdit, clonedData } = location.state || {};
  const [editOrder, setEditOrder] = useState<any>(stateEditOrder || null);
  const isEdit = !!(stateIsEdit || routeOrderId);

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
          itemId: item.item || item.itemId || item._id || item.id,
          itemDetails: item.name || item.description || item.itemDetails || "",
          description: item.description || "",
          account: item.account || item.account_id || "",
          quantity: item.quantity?.toString() || "1.00",
          rate: (item.unitPrice !== undefined ? item.unitPrice : item.rate)?.toString() || "0.00",
          tax: item.tax_id || item.tax || "",
          amount: (item.total !== undefined ? item.total : item.amount)?.toString() || "0.00",
        })),
        subTotal: editOrder.subTotal?.toString() || editOrder.sub_total?.toString() || "0.00",
        discountPercent: "0", // Need backend support for this if not just amount
        discountAmount: "0.00", // Need backend support
        adjustment: "0.00",
        total: editOrder.total?.toString() || "0.00",
        notes: editOrder.notes || "",
        termsAndConditions: editOrder.terms || editOrder.termsAndConditions || editOrder.terms_and_conditions || "",
      });
    }
  }, [isEdit, editOrder]);

  // Initialize form with cloned data
  useEffect(() => {
    if (!clonedData || isEdit) return;

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
        itemId: item.item || item.itemId || item._id || item.id,
        itemDetails: item.name || item.description || item.itemDetails || "",
        description: item.description || "",
        account: item.account || item.account_id || "",
        quantity: item.quantity?.toString() || "1.00",
        rate: (item.unitPrice !== undefined ? item.unitPrice : item.rate)?.toString() || "0.00",
        tax: item.tax_id || item.tax || "",
        amount: (item.total !== undefined ? item.total : item.amount)?.toString() || "0.00",
      })),
      subTotal: clonedData.subTotal?.toString() || clonedData.sub_total?.toString() || "0.00",
      discountPercent: "0",
      discountAmount: "0.00",
      adjustment: "0.00",
      total: clonedData.total?.toString() || "0.00",
      notes: clonedData.notes || "",
      termsAndConditions: clonedData.terms || clonedData.termsAndConditions || clonedData.terms_and_conditions || "",
    }));
  }, [clonedData, isEdit]);

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
      const line = computeLine(item, taxExclusive);
      return { ...item, amount: line.gross.toFixed(2) };
    });

    const baseSubTotal = itemsWithAmounts.reduce((sum: number, item) => sum + computeLine(item, taxExclusive).net, 0);
    const baseTaxTotal = itemsWithAmounts.reduce((sum: number, item) => sum + computeLine(item, taxExclusive).tax, 0);
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
          }));
          setCustomers(formattedCustomers);
        }
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    loadCustomers();
  }, []);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (vendorRef.current && !vendorRef.current.contains(target)) {
        setVendorOpen(false);
        setVendorSearch("");
      }
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
      Object.values(itemMenuRefs.current).forEach((ref) => {
        if (ref && !ref.contains(target)) {
          setItemMenuOpen(null);
        }
      });
      // Close customer dropdown if clicking outside
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
        setCustomerDropdownOpen(false);
      }
      Object.keys(openTaxDropdowns).forEach((itemId) => {
        if (!openTaxDropdowns[itemId]) return;
        const ref = taxDropdownRefs.current[itemId];
        if (ref && !ref.contains(target)) {
          setOpenTaxDropdowns((prev) => ({ ...prev, [itemId]: false }));
        }
      });
      if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(target)) {
        setWarehouseDropdownOpen(false);
      }
      if (taxPreferenceDropdownRef.current && !taxPreferenceDropdownRef.current.contains(target)) {
        setTaxPreferenceDropdownOpen(false);
      }
      if (transactionLevelDropdownRef.current && !transactionLevelDropdownRef.current.contains(target)) {
        setTransactionLevelDropdownOpen(false);
      }
    };

    if (
      vendorOpen ||
      uploadMenuOpen ||
      vendorSearchCriteriaOpen ||
      bulkActionsOpen ||
      itemMenuOpen ||
      customerDropdownOpen ||
      warehouseDropdownOpen ||
      taxPreferenceDropdownOpen ||
      transactionLevelDropdownOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    vendorOpen,
    uploadMenuOpen,
    vendorSearchCriteriaOpen,
    bulkActionsOpen,
    itemMenuOpen,
    customerDropdownOpen,
    warehouseDropdownOpen,
    taxPreferenceDropdownOpen,
    transactionLevelDropdownOpen,
    openTaxDropdowns,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue =
      e.target instanceof HTMLInputElement && e.target.type === "checkbox"
        ? e.target.checked
        : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    } as PurchaseOrderFormData));
  };

  // Handle delivery address type change
  const handleDeliveryAddressTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as PurchaseOrderFormData["deliveryAddressType"];
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
    } else if (value === "Customer") {
      // Clear delivery address until customer is selected
      setDeliveryAddress(null);
    }
  };

  const handleItemSelect = (id: number, selectedItem: SelectableItem) => {
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

  const addNewRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem(Date.now())],
    }));
  };

  const removeRow = (id: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) =>
        recalcForm({
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        })
      );
    }
  };

  const filteredVendors = vendors.filter((vendor) =>
    (vendor.name || vendor.formData?.name || vendor.displayName || "").toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const loadBulkItems = async () => {
    try {
      setBulkItemsLoading(true);
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
      })).filter((item) => item.id);
      setBulkItems(normalizedItems);
    } catch (error) {
      console.error("Error loading items for bulk insert:", error);
      setBulkItems([]);
    } finally {
      setBulkItemsLoading(false);
    }
  };

  const openBulkItemsModal = async () => {
    setBulkItemsModalOpen(true);
    if (bulkItems.length === 0) {
      await loadBulkItems();
    }
  };

  const handleAddSelectedBulkItems = () => {
    const selectedItems = bulkItems.filter((item) => bulkSelectedItemIds[item.id]);
    if (!selectedItems.length) return;

    setFormData((prev) => {
      const newRows: PurchaseOrderItem[] = selectedItems.map((selectedItem) => {
        const rate = Number(selectedItem.purchaseRate || 0);
        const account = selectedItem.trackInventory && selectedItem.inventoryAccount
          ? selectedItem.inventoryAccount
          : (selectedItem.purchaseAccount || "");

        return {
          id: Date.now() + Math.random(),
          itemId: selectedItem.id,
          itemDetails: selectedItem.name,
          description: "",
          account,
          quantity: "1.00",
          rate: rate.toFixed(2),
          tax: "",
          amount: rate.toFixed(2),
        };
      });

      return recalcForm({
        ...prev,
        items: [...prev.items, ...newRows],
      });
    });

    setBulkItemsModalOpen(false);
    setBulkItemsSearch("");
    setBulkSelectedItemIds({});
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
    let payload = { ...purchaseOrderData };

    if (shouldAutoRefreshNumber) {
      const latestNumber = await fetchLatestPurchaseOrderNumber();
      if (latestNumber) {
        payload = {
          ...payload,
          purchase_order_number: latestNumber,
        };
      }
    }

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

  const handleSubmit = async (e: React.SyntheticEvent | undefined, status: PurchaseOrderSaveStatus) => {
    e?.preventDefault?.();
    if (saveLoadingState || submitLockRef.current) return;
    submitLockRef.current = true;
    setSaveLoadingState(status === "issued" ? "issued" : "draft");

    try {
      const { resolvedVendorId, resolvedVendorName } = resolveVendorForSubmit();
      if (!resolvedVendorId && !resolvedVendorName) {
        alert("Please select a valid vendor before saving the purchase order.");
        return;
      }

      // Construct payload
      const purchaseOrderData = {
        date: formData.date,
        purchase_order_number: formData.purchaseOrderNumber,
        reference_number: formData.referenceNumber,
        vendor_name: resolvedVendorName,
        vendor_id: resolvedVendorId,
        status: "draft", // Always save as draft initially, status will change to ISSUED after email is sent
        delivery_date: formData.deliveryDate,
        total: parseFloat(formData.total),
        sub_total: parseFloat(formData.subTotal),
        items: (formData.items || []).map(item => ({
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
        // Trigger custom event for same-tab updates
        window.dispatchEvent(new Event("purchaseOrdersUpdated"));

        // If Save and Send was clicked, navigate to email page
        if (status === "issued" && response.data?._id) {
          navigate(`/purchases/purchase-orders/${response.data._id}/email`);
        } else {
          // Otherwise go back to the list
          navigate("/purchases/purchase-orders");
        }
      } else {
        alert(response?.message || "Failed to create purchase order");
      }
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      if (isDuplicatePurchaseOrderNumberError(error)) {
        alert("Purchase order number already exists. Please use a different number.");
      } else {
        alert(error?.message || "An error occurred while creating the purchase order.");
      }
    } finally {
      setSaveLoadingState(null);
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
    <div className="flex flex-col" style={{ backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">New Purchase Order</h1>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={(e) => handleSubmit(e, "issued")} className="flex-1" style={{ backgroundColor: "#f9fafb" }}>
        <div className="w-full pr-6 py-6">
          {/* Vendor and Delivery Section */}
          <div className="mb-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 mb-6">
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 relative" ref={vendorRef}>
                  <div className="flex">
                    <input
                      type="text"
                      value={vendorSearch || formData.vendorName}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        if (!vendorOpen) setVendorOpen(true);
                      }}
                      onFocus={() => setVendorOpen(true)}
                      placeholder="Select a Vendor"
                      className="flex-1 rounded-md rounded-r-none bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVendorSearchModalOpen(true);
                      }}
                      className="ml-0 px-2 py-1.5 bg-[#156372] text-white rounded-md rounded-l-none hover:bg-[#156372] flex items-center justify-center"
                      style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    >
                      <Search size={14} />
                    </button>
                  </div>
                  {vendorOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "#ffffff",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        marginTop: "4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {filteredVendors.length > 0 ? (
                        <>
                          {filteredVendors.map((vendor, index) => (
                            <div
                              key={vendor._id || vendor.id || `${vendor.displayName || vendor.name || "vendor"}-${index}`}
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  vendorName: vendor.displayName || vendor.name || vendor.formData?.displayName || vendor.formData?.name || "",
                                  vendorId: vendor._id || vendor.id || "",
                                }));
                                setBillingAddress(vendor.billingAddress || null);
                                setShippingAddress(vendor.shippingAddress || null);
                                setVendorSearch("");
                                setVendorOpen(false);
                              }}
                              style={{
                                padding: "10px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f3f4f6",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                            >
                              {vendor.name || vendor.formData?.name || "Unnamed Vendor"}
                            </div>
                          ))}
                          <div
                            style={{
                              padding: "10px 12px",
                              borderTop: "1px solid #e5e7eb",
                              backgroundColor: "#f9fafb",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setVendorOpen(false);
                                navigate("/purchases/vendors/new");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] text-sm font-medium"
                            >
                              <Plus size={16} />
                              New Vendor
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ padding: "10px 12px", color: "#6b7280" }}>
                            No vendors found
                          </div>
                          <div
                            style={{
                              padding: "10px 12px",
                              borderTop: "1px solid #e5e7eb",
                              backgroundColor: "#f9fafb",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setVendorOpen(false);
                                navigate("/purchases/vendors/new");
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-[#156372] text-white rounded-md hover:bg-[#0D4A52] text-sm font-medium"
                            >
                              <Plus size={16} />
                              New Vendor
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Billing and Shipping Address (Auto-populated) */}
            {(billingAddress || shippingAddress) && (
              <div className="grid grid-cols-2 gap-8 mb-8 p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Billing Address</span>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <Pencil size={12} />
                    </button>
                  </div>
                  {billingAddress ? (
                    <div className="text-sm text-gray-800 space-y-0.5">
                      <p className="font-bold text-black">{billingAddress.attention || formData.vendorName}</p>
                      <p>{billingAddress.street1}</p>
                      <p>{billingAddress.street2}</p>
                      <p>{billingAddress.city}</p>
                      <p>{billingAddress.state} {billingAddress.zipCode}</p>
                      <p>{billingAddress.country}</p>
                      {billingAddress.phone && <p className="text-gray-600">Phone: {billingAddress.phone}</p>}
                      {billingAddress.fax && <p className="text-gray-600">Fax Number: {billingAddress.fax}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No billing address provided</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Shipping Address</span>
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <Pencil size={12} />
                    </button>
                  </div>
                  {shippingAddress ? (
                    <div className="text-sm text-gray-800 space-y-0.5">
                      <p className="font-bold text-black">{shippingAddress.attention || formData.vendorName}</p>
                      <p>{shippingAddress.street1}</p>
                      <p>{shippingAddress.street2}</p>
                      <p>{shippingAddress.city}</p>
                      <p>{shippingAddress.state} {shippingAddress.zipCode}</p>
                      <p>{shippingAddress.country}</p>
                      {shippingAddress.phone && <p className="text-gray-600">Phone: {shippingAddress.phone}</p>}
                      {shippingAddress.fax && <p className="text-gray-600">Fax Number: {shippingAddress.fax}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No shipping address provided</p>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Address (Always visible) */}
            <div className="sm:col-span-6">
              <label className="block text-sm/6 font-medium text-gray-900">
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryAddressType"
                    value="Organization"
                    checked={formData.deliveryAddressType === "Organization"}
                    onChange={handleDeliveryAddressTypeChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900">Organization</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryAddressType"
                    value="Customer"
                    checked={formData.deliveryAddressType === "Customer"}
                    onChange={handleDeliveryAddressTypeChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900">Customer</span>
                </label>
              </div>

              {/* Customer Dropdown (when Customer is selected) */}
              {formData.deliveryAddressType === "Customer" && (
                <div className="mb-4 relative max-w-[60%]" ref={customerDropdownRef}>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={selectedCustomer?.displayName || customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          if (!customerDropdownOpen) setCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        placeholder="Select Customer"
                        className="block w-full rounded-md rounded-r-none bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                      {customerDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
                          {customers.filter(c =>
                            c.displayName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.customerNumber.toLowerCase().includes(customerSearch.toLowerCase())
                          ).map((customer, index) => (
                            <div
                              key={customer._id || customer.id || `${customer.displayName || customer.customerNumber || "customer"}-${index}`}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearch("");
                                setCustomerDropdownOpen(false);
                                // Set customer delivery address
                                if (customer.billingAddress) {
                                  setDeliveryAddress({
                                    name: customer.displayName,
                                    address1: customer.billingAddress.street1 || '',
                                    address2: customer.billingAddress.street2 || '',
                                    city: customer.billingAddress.city || '',
                                    state: customer.billingAddress.state || '',
                                    country: customer.billingAddress.country || '',
                                    zipCode: customer.billingAddress.zipCode || '',
                                  });
                                }
                              }}
                              className="px-3 py-2.5 hover:bg-teal-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#156372] text-white flex items-center justify-center text-sm font-semibold">
                                  {customer.avatar}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {customer.displayName} | {customer.customerNumber}
                                  </div>
                                  {customer.email && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <span>✉</span> {customer.email}
                                    </div>
                                  )}
                                  {customer.companyName && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <span>🏢</span> {customer.companyName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                      className="px-3 py-1.5 bg-[#156372] text-white rounded-md rounded-l-none hover:bg-[#0D4A52] flex items-center justify-center"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                  {customers.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Stock on Hand will not be affected only in case of dropshipments. Selecting the Customer option in the Deliver field of a normal purchase order will have an effect on your stock level
                    </p>
                  )}
                </div>
              )}

              {/* Display selected address */}
              {deliveryAddress && (
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {deliveryAddress.name}
                      {formData.deliveryAddressType === "Organization" && (
                        <LinkIcon size={14} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {deliveryAddress.address1 && <>{deliveryAddress.address1}<br /></>}
                    {deliveryAddress.address2 && <>{deliveryAddress.address2}<br /></>}
                    {deliveryAddress.city && <>{deliveryAddress.city}{deliveryAddress.state && `, ${deliveryAddress.state}`}<br /></>}
                    {deliveryAddress.country && <>{deliveryAddress.country}{deliveryAddress.zipCode && `, ${deliveryAddress.zipCode}`}</>}
                  </div>
                  {formData.deliveryAddressType === "Organization" && (
                    <button
                      type="button"
                      onClick={() => {
                        // Handle change destination
                      }}
                      className="mt-3 text-sm text-teal-700 hover:text-teal-800"
                    >
                      Change destination to deliver
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="mb-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">
                  Purchase Order# <span className="text-red-500">*</span>
                  <Info size={14} className="inline ml-1 text-gray-400" />
                </label>
                <div className="mt-2 relative">
                  <input
                    type="text"
                    name="purchaseOrderNumber"
                    value={formData.purchaseOrderNumber}
                    onChange={handleChange}
                    className="block w-full rounded-md bg-white px-3 py-1.5 pr-10 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPoConfigModalOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-teal-700 hover:text-teal-800"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">Reference#</label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">Date</label>
                <div className="mt-2">
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">Delivery Date</label>
                <div className="mt-2">
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">Payment Terms</label>
                <div className="mt-2">
                  <PaymentTermsDropdown
                    value={formData.paymentTerms}
                    onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                    onConfigureTerms={() => setConfigureTermsOpen(true)}
                    customTerms={paymentTermsList}
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900">Shipment Preference</label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="shipmentPreference"
                    value={formData.shipmentPreference}
                    onChange={handleChange}
                    placeholder="Choose the shipment preference or type to ad"
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Item Bar */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-0 text-sm">
              <div className="relative flex items-center gap-2 px-4 py-3 border-r border-gray-200" ref={warehouseDropdownRef}>
                <span className="text-gray-500">Warehouse Location</span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-gray-800"
                  onClick={() => {
                    setWarehouseDropdownOpen((prev) => !prev);
                    setTaxPreferenceDropdownOpen(false);
                    setTransactionLevelDropdownOpen(false);
                  }}
                >
                  <span>{warehouseLocation}</span>
                  {warehouseDropdownOpen ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </button>
                {warehouseDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[250px] bg-white border border-gray-200 rounded-md shadow-lg z-50 p-2">
                    <div className="flex items-center gap-2 border border-blue-300 rounded-md px-2 py-1.5 mb-2">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        className="w-full text-sm focus:outline-none"
                        placeholder="Search"
                      />
                    </div>
                    {warehouseOptions
                      .filter((opt) => opt.toLowerCase().includes(warehouseSearch.toLowerCase()))
                      .map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                            warehouseLocation === opt
                              ? "bg-[#156372] text-white"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setWarehouseLocation(opt);
                            setWarehouseDropdownOpen(false);
                            setWarehouseSearch("");
                          }}
                        >
                          <span>{opt}</span>
                          {warehouseLocation === opt && <Check size={14} />}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="relative flex items-center gap-2 px-4 py-3 border-r border-gray-200" ref={taxPreferenceDropdownRef}>
                <Grid3x3 size={14} className="text-gray-500" />
                <button
                  type="button"
                  disabled={lockTaxExclusive}
                  className="flex items-center gap-1 text-gray-800 disabled:opacity-60"
                  onClick={() => {
                    if (lockTaxExclusive) return;
                    setTaxPreferenceDropdownOpen((prev) => !prev);
                    setWarehouseDropdownOpen(false);
                    setTransactionLevelDropdownOpen(false);
                  }}
                >
                  <span>{computedTaxExclusive ? "Tax Exclusive" : "Tax Inclusive"}</span>
                  {taxPreferenceDropdownOpen ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </button>
                {taxPreferenceDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[250px] bg-white border border-gray-200 rounded-md shadow-lg z-50 p-2">
                    <div className="flex items-center gap-2 border border-blue-300 rounded-md px-2 py-1.5 mb-2">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        value={taxPreferenceSearch}
                        onChange={(e) => setTaxPreferenceSearch(e.target.value)}
                        className="w-full text-sm focus:outline-none"
                        placeholder="Search"
                      />
                    </div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">Item Tax Preference</div>
                    {taxPreferenceOptions
                      .filter((opt) => opt.toLowerCase().includes(taxPreferenceSearch.toLowerCase()))
                      .map((opt) => {
                        const isSelected =
                          (computedTaxExclusive && opt === "Tax Exclusive") ||
                          (!computedTaxExclusive && opt === "Tax Inclusive");
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                              isSelected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-gray-50"
                            }`}
                            onClick={() => {
                              setFormData((prev) => recalcForm({
                                ...prev,
                                taxExclusive: opt === "Tax Exclusive",
                              }));
                              setTaxPreferenceDropdownOpen(false);
                              setTaxPreferenceSearch("");
                            }}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check size={14} />}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
              <div className="relative flex items-center gap-2 px-4 py-3" ref={transactionLevelDropdownRef}>
                <Info size={14} className="text-gray-500" />
                <button
                  type="button"
                  className="flex items-center gap-1 text-gray-800"
                  onClick={() => {
                    setTransactionLevelDropdownOpen((prev) => !prev);
                    setWarehouseDropdownOpen(false);
                    setTaxPreferenceDropdownOpen(false);
                  }}
                >
                  <span>{formData.transactionLevel}</span>
                  {transactionLevelDropdownOpen ? (
                    <ChevronUp size={14} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500" />
                  )}
                </button>
                {transactionLevelDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[250px] bg-white border border-gray-200 rounded-md shadow-lg z-50 p-2">
                    <div className="flex items-center gap-2 border border-blue-300 rounded-md px-2 py-1.5 mb-2">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        value={transactionLevelSearch}
                        onChange={(e) => setTransactionLevelSearch(e.target.value)}
                        className="w-full text-sm focus:outline-none"
                        placeholder="Search"
                      />
                    </div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">Discount Type</div>
                    {transactionLevelOptions
                      .filter((opt) => opt.toLowerCase().includes(transactionLevelSearch.toLowerCase()))
                      .map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                            formData.transactionLevel === opt
                              ? "bg-[#156372] text-white"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, transactionLevel: opt }));
                            setTransactionLevelDropdownOpen(false);
                            setTransactionLevelSearch("");
                          }}
                        >
                          <span>{opt}</span>
                          {formData.transactionLevel === opt && <Check size={14} />}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-4 rounded-lg border border-gray-200 bg-white overflow-visible">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Item Table</h3>
              <div className="relative" ref={bulkActionsRef}>
                <button
                  type="button"
                  onClick={() => setBulkActionsOpen(!bulkActionsOpen)}
                  className="text-sm text-[#156372] hover:text-[#0D4A52] flex items-center gap-1"
                >
                  <Check size={14} />
                  <span>Bulk Actions</span>
                </button>
                {bulkActionsOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm bg-[#156372] text-white rounded-t-md hover:bg-[#0D4A52]"
                    >
                      Bulk Update Line Items
                    </button>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-md"
                    >
                      Show All Additional Information
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-visible">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ width: "36%" }}>ITEM DETAILS</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ width: "18%" }}>ACCOUNT</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ width: "9%" }}>QUANTITY</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ width: "10%" }}>
                      <div className="flex items-center justify-end gap-2">
                        <span>RATE</span>
                        <Grid3x3 size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200" style={{ width: "13%" }}>TAX</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: "12%" }}>AMOUNT</th>
                    <th className="px-3 py-3 overflow-visible" style={{ width: "2%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={item.id || item.itemId || `${item.itemDetails || "line-item"}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 border-r border-gray-200 relative overflow-visible">
                        <div className="flex items-center gap-2">
                          <GripVertical size={16} className="text-gray-400 cursor-move" />
                          <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <ImageIcon size={16} className="text-gray-400" />
                          </div>
                          <ItemSelectDropdown
                            value={item.itemDetails}
                            onSelect={(selectedItem) => handleItemSelect(item.id, selectedItem)}
                            className="flex-1"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 relative overflow-visible">
                        <div className="min-w-[150px]">
                          <AccountSelectDropdown
                            value={item.account}
                            onSelect={(account) => handleItemChange(item.id, "account", account.name)}
                            className="w-full"
                            allowedTypes={PURCHASE_ACCOUNT_TYPES}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                          className="w-full border-none outline-none bg-transparent text-sm text-gray-900 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                          className="w-full border-none outline-none bg-transparent text-sm text-gray-900 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 relative overflow-visible" ref={(el) => { taxDropdownRefs.current[String(item.id)] = el; }}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenTaxDropdowns((prev) => ({ ...prev, [String(item.id)]: !prev[String(item.id)] }))
                          }
                          className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-gray-900"
                        >
                          <span className={item.tax ? "text-gray-900" : "text-gray-500"}>
                            {item.tax ? getTaxLabel(item.tax) : "Select a Tax"}
                          </span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </button>
                        {openTaxDropdowns[String(item.id)] && (
                          <div className="absolute left-0 top-full mt-1 w-[250px] bg-white border border-gray-200 rounded-md shadow-lg z-[9999] p-2">
                            <div className="flex items-center gap-2 border border-blue-300 rounded-md px-2 py-1.5 mb-2">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={taxSearches[String(item.id)] || ""}
                                onChange={(e) =>
                                  setTaxSearches((prev) => ({ ...prev, [String(item.id)]: e.target.value }))
                                }
                                className="w-full text-sm focus:outline-none"
                                placeholder="Search"
                              />
                            </div>
                            <button
                              type="button"
                              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                                !item.tax ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                handleItemChange(item.id, "tax", "");
                                setOpenTaxDropdowns((prev) => ({ ...prev, [String(item.id)]: false }));
                                setTaxSearches((prev) => ({ ...prev, [String(item.id)]: "" }));
                              }}
                            >
                              <span>Non-Taxable</span>
                              {!item.tax && <Check size={14} />}
                            </button>
                            <div className="px-2 py-1 text-xs font-semibold text-gray-500">Tax</div>
                            {taxOptions
                              .filter((tax: any) =>
                                `${tax.name} ${tax.rate}`.toLowerCase().includes((taxSearches[String(item.id)] || "").toLowerCase())
                              )
                              .map((tax: any) => {
                                const taxId = String(tax.id || tax._id);
                                const selected = String(item.tax || "") === taxId;
                                return (
                                  <button
                                    key={taxId}
                                    type="button"
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm ${
                                      selected ? "bg-[#156372] text-white" : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                    onClick={() => {
                                      handleItemChange(item.id, "tax", taxId);
                                      setOpenTaxDropdowns((prev) => ({ ...prev, [String(item.id)]: false }));
                                      setTaxSearches((prev) => ({ ...prev, [String(item.id)]: "" }));
                                    }}
                                  >
                                    <span>{getTaxLabel(taxId)}</span>
                                    {selected && <Check size={14} />}
                                  </button>
                                );
                              })}
                            <button
                              type="button"
                              onClick={() => navigate("/settings/taxes/new", { state: { from: "/purchases/purchase-orders/new" } })}
                              className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded"
                            >
                              <Plus size={14} />
                              New Tax
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end">
                          <input
                            type="text"
                            value={item.amount}
                            readOnly
                            className="w-full border-none outline-none bg-transparent text-sm text-gray-900 text-right"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 relative overflow-visible">
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className="relative"
                            ref={(el) => {
                              itemMenuRefs.current[item.id] = el;
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setItemMenuOpen(itemMenuOpen === item.id ? null : item.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {itemMenuOpen === item.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-[180px]">
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm bg-[#156372] text-white rounded-t-md hover:bg-[#0D4A52]"
                                >
                                  Show Additional Information
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Clone
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Insert New Row
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemMenuOpen(null);
                                    openBulkItemsModal();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Insert Items in Bulk
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-md"
                                >
                                  Insert New Header
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(item.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-6 text-sm text-gray-600">
              <button type="button" className="flex items-center gap-1 hover:text-gray-900">
                <List size={14} />
                Select a project
                <ChevronDown size={12} />
              </button>
              <button type="button" className="flex items-center gap-1 hover:text-gray-900">
                <Grid3x3 size={14} />
                Reporting Tags
                <ChevronDown size={12} />
              </button>
            </div>

            <div className="px-3 py-3 flex gap-3">
              <button
                type="button"
                onClick={addNewRow}
                className="px-3 py-1.5 bg-[#e9f5f7] text-[#156372] rounded-md hover:bg-[#d7eef2] text-sm font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Add New Row
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={openBulkItemsModal}
                className="px-3 py-1.5 bg-[#e9f5f7] text-[#156372] rounded-md hover:bg-[#d7eef2] text-sm font-medium flex items-center gap-2"
              >
                <List size={16} />
                Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Notes + Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm/6 font-medium text-gray-900 mb-2">Notes</label>
              <div className="relative">
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Will be displayed on purchase order"
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 min-h-[100px] resize-y"
                />
                <Pencil
                  size={16}
                  className="absolute bottom-3 right-3 text-gray-400"
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-[#fafafa] p-4">
              <div className="flex justify-between mb-5">
                <span className="text-sm font-medium text-gray-900">Sub Total</span>
                <span className="text-sm font-semibold text-gray-900">{formData.subTotal}</span>
              </div>
              {(() => {
                const taxMap: Record<string, number> = {};
                const discountFactor = Math.max(0, 1 - (showTransactionDiscount ? (parseFloat(formData.discountPercent) || 0) : 0) / 100);
                formData.items.forEach((item: any) => {
                  if (!item.tax) return;
                  const line = computeLine(item, !!formData.taxExclusive);
                  taxMap[item.tax] = (taxMap[item.tax] || 0) + line.tax * discountFactor;
                });
                return Object.entries(taxMap).map(([taxId, amount]) => (
                  <div key={taxId} className="flex justify-between mb-3">
                    <span className="text-sm text-gray-700">{getTaxLabel(taxId)}</span>
                    <span className="text-sm font-medium text-gray-900">{amount.toFixed(2)}</span>
                  </div>
                ));
              })()}
              {showTransactionDiscount && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-700 flex-1">Discount</span>
                  <input
                    type="text"
                    value={formData.discountPercent}
                    onChange={handleDiscountChange}
                    className="w-20 rounded-md bg-white px-2 py-1 text-sm text-gray-900 border border-gray-300 text-right focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                  />
                  <span className="text-sm text-gray-700">%</span>
                  <span className="text-sm font-medium text-gray-900 min-w-[64px] text-right">{formData.discountAmount}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-700 flex-1">Adjustment</span>
                <input
                  type="text"
                  value={formData.adjustment}
                  onChange={handleAdjustmentChange}
                  className="w-24 rounded-md bg-white px-2 py-1 text-sm text-gray-900 border border-gray-300 text-right focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                />
                <Info size={14} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-900 min-w-[64px] text-right">{formData.adjustment || "0.00"}</span>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-[22px] font-semibold text-gray-900">Total</span>
                <span className="text-[30px] font-bold text-gray-900 leading-none">{formData.total}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions and File Upload */}
          <div className="mb-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900 mb-2">Terms & Conditions</label>
                <div className="relative">
                  <textarea
                    name="termsAndConditions"
                    value={formData.termsAndConditions}
                    onChange={handleChange}
                    placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 min-h-[100px] resize-y"
                  />
                  <Pencil
                    size={16}
                    className="absolute bottom-3 right-3 text-gray-400"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm/6 font-medium text-gray-900 mb-2">Attach File(s) to Purchase Order</label>
                <div className="relative" ref={uploadMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                    className="w-full rounded-md border-2 border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <UploadIcon size={16} />
                      Upload File
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {uploadMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setUploadMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Attach From Desktop
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    You can upload a maximum of 10 files, 10MB each
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Additional Fields: Start adding custom fields for your purchase orders by going to Settings → Purchases → Purchase Orders.
            </p>
          </div>
        </div>
      </form>

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
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            vendorName: vendor.displayName || vendor.name || vendor.formData?.displayName || vendor.formData?.name || "",
                            vendorId: vendor._id || vendor.id || "",
                          }));
                          setVendorSearchModalOpen(false);
                          setVendorSearchTerm("");
                          setVendorSearchResults([]);
                        }}
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
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setBulkItemsModalOpen(false)}>
          <div className="bg-white rounded-lg w-[92vw] max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Items in Bulk</h3>
              <button
                type="button"
                onClick={() => setBulkItemsModalOpen(false)}
                className="w-8 h-8 bg-[#156372] text-white rounded flex items-center justify-center hover:bg-[#0D4A52]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={bulkItemsSearch}
                  onChange={(e) => setBulkItemsSearch(e.target.value)}
                  placeholder="Search by item name or SKU"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#156372]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {bulkItemsLoading ? (
                <div className="p-6 text-sm text-gray-500">Loading items...</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Select</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Purchase Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkItems
                      .filter((item: any) =>
                        `${item.name} ${item.sku}`.toLowerCase().includes(bulkItemsSearch.toLowerCase())
                      )
                      .map((item: any, index: number) => (
                        <tr key={item.id || `${item.name || item.sku || "bulk-item"}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!!bulkSelectedItemIds[item.id]}
                              onChange={(e) =>
                                setBulkSelectedItemIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.sku || "-"}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{Number(item.purchaseRate || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkItemsModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSelectedBulkItems}
                className="px-4 py-2 text-sm bg-[#156372] text-white rounded-md hover:bg-[#0D4A52]"
              >
                Add Selected Items
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

