import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  Copy,
  Edit3,
  Upload as UploadIcon,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Minus,
  Info,
  ShoppingBag,
  Pencil,
  AlertTriangle,
  FileText,
  Grid3x3,
  Percent,
  Settings,
  Clock,
  RotateCw,
  Image as ImageIcon,
  Briefcase,
  Globe,
  Tag,
  MoreVertical,
  GripVertical,
  Check,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { filterActiveRecords } from "../shared/activeFilters";
import { accountantAPI, itemsAPI, locationsAPI, taxesAPI, vendorsAPI, vendorCreditsAPI } from "../../../services/api";
import toast from "react-hot-toast";

const ACCOUNT_TYPE_OPTIONS = [
  "Asset",
  "Other Asset",
  "Other Current Asset",
  "Fixed Asset",
  "Intangible Asset",
  "Non Current Asset",
  "Liability",
  "Other Current Liability",
  "Non Current Liability",
  "Other Liability",
  "Equity",
  "Income",
  "Other Income",
  "Expense",
  "Cost Of Goods Sold",
  "Other Expense",
];

const FIXED_ASSET_TYPE_OPTIONS = [
  "Other Asset",
  "Other Current Asset",
  "Fixed Asset",
  "Intangible Asset",
  "Non Current Asset",
];

export default function NewVendorCredit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeCreditId } = useParams();
  const {
    editCredit: stateEditCredit,
    isEdit: stateIsEdit,
    sourceBill,
    billId: sourceBillId,
    billNumber: sourceBillNumber,
    vendorId: sourceVendorId,
    vendorName: sourceVendorName,
  } = location.state || {};
  const [editCredit, setEditCredit] = useState<any>(stateEditCredit || null);
  const isEdit = !!(stateIsEdit || routeCreditId);
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    vendorName: "",
    creditNote: "",
    orderNumber: "",
    vendorCreditDate: new Date().toISOString().split("T")[0],
    subject: "",
    accountsPayable: "Accounts Payable",
    taxExclusive: "Tax Inclusive",
    taxLevel: "At Transaction Level",
    discount: 0,
    discountType: "%", // "%" or "Currency"
    adjustment: 0,
    notes: "",
    currency: "CAD",
    location: "Head Office",
    warehouseLocation: "Head Office",
  });
  const { code: baseCurrencyCode } = useCurrency();

  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [billingAddressEditMode, setBillingAddressEditMode] = useState(false);

  const [itemRows, setItemRows] = useState([
    {
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      discount: "0 %-",
      tax: "",
      amount: "0.00",
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
      showAdditionalInfo: true,
    },
  ]);
  const [bulkItemsInsertIndex, setBulkItemsInsertIndex] = useState(0);
  const [bulkItemsSearch, setBulkItemsSearch] = useState("");
  const [selectedBulkItems, setSelectedBulkItems] = useState<any[]>([]);
  const [bulkItemQuantities, setBulkItemQuantities] = useState<{ [key: string]: number }>({});
  const [saveLoadingState, setSaveLoadingState] = useState<null | "Draft" | "Open">(null);
  const [newItemData, setNewItemData] = useState({
    type: "Goods",
    name: "",
    sku: "",
    unit: "",
    initialStock: "0",
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
  });

  // RESTORED MISSING STATES
  const [vendors, setVendors] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState<Record<string, string>>({});
  const [itemDropdownOpen, setItemDropdownOpen] = useState<Record<string, boolean>>({});
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const [taxLevelOpen, setTaxLevelOpen] = useState(false);
  const [taxLevelSearch, setTaxLevelSearch] = useState("");
  const [taxLevelMenuStyle, setTaxLevelMenuStyle] = useState<{ left: number; top: number; width: number } | null>(null);
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<Record<string, boolean>>({});
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<Record<string, boolean>>({});
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});
  const [rowMenuOpen, setRowMenuOpen] = useState<Record<string, boolean>>({});
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [showBulkItemsModal, setShowBulkItemsModal] = useState(false);
  const [showNumberingModal, setShowNumberingModal] = useState(false);
  const [showItemWarning, setShowItemWarning] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [errors, setErrors] = useState<any>({});
  const [numberingPrefs, setNumberingPrefs] = useState({ mode: "auto", prefix: "VC-", nextNumber: "0001" });
  const [accountsPayableOpen, setAccountsPayableOpen] = useState(false);
  const [discountDropdownOpen, setDiscountDropdownOpen] = useState(false);
  const [taxPreferenceOpen, setTaxPreferenceOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [addNewRowDropdownOpen, setAddNewRowDropdownOpen] = useState(false);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState<Record<string, boolean>>({});
  const [tagDropdownOpen, setTagDropdownOpen] = useState<Record<string, boolean>>({});
  const [tagSearch, setTagSearch] = useState<Record<string, string>>({});
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [newAccountRowIndex, setNewAccountRowIndex] = useState<number | null>(null);
  const [newAccountData, setNewAccountData] = useState({
    accountType: "Fixed Asset",
    accountName: "",
    isSubAccount: false,
    parentAccount: "",
    accountCode: "",
    description: "",
    createItemAsFixedAsset: true,
    fixedAssetType: "",
  });
  const [accountTypeDropdownOpen, setAccountTypeDropdownOpen] = useState(false);
  const [parentAccountDropdownOpen, setParentAccountDropdownOpen] = useState(false);
  const [fixedAssetTypeDropdownOpen, setFixedAssetTypeDropdownOpen] = useState(false);
  const [newAccountSearch, setNewAccountSearch] = useState("");
  const [parentAccountSearch, setParentAccountSearch] = useState("");
  const [fixedAssetTypeSearch, setFixedAssetTypeSearch] = useState("");
  // END RESTORED STATES

  const itemRefs = useRef<Record<string, any>>({});
  const rowMenuRefs = useRef<Record<string, any>>({});
  const accountRefs = useRef<Record<string, any>>({});
  const vendorRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const accountsPayableRef = useRef<HTMLDivElement>(null);
  const taxExclusiveRef = useRef<HTMLDivElement>(null);
  const taxLevelRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const addNewRowRef = useRef<HTMLDivElement>(null);
  const warehouseRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const discountRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<Record<string, any>>({});
  const accountTypeDropdownRef = useRef<HTMLDivElement>(null);
  const parentAccountDropdownRef = useRef<HTMLDivElement>(null);
  const fixedAssetTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Load vendors from localStorage
  const [taxes, setTaxes] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [apSearchTerm, setApSearchTerm] = useState("");
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = formData.taxLevel !== "At Item Level";
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "both";
  const lockTaxPreference = taxMode === "inclusive" || taxMode === "exclusive";
  const taxPreferenceOptions = taxMode === "exclusive"
    ? ["Tax Exclusive"]
    : taxMode === "inclusive"
      ? ["Tax Inclusive"]
      : ["Tax Exclusive", "Tax Inclusive", "Out of Scope"];

  // Load vendors from API
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedVendors = filterActiveRecords(response.data || response.vendors || []);
          setVendors(loadedVendors);
          setAllVendors(loadedVendors);
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
      }
    };
    loadVendors();
  }, []);

  // Load locations from API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedLocations = filterActiveRecords(response.data || []) as any[];
          setLocations(loadedLocations);
          
          // Set default location if not already set
          if (!formData.location && loadedLocations.length > 0) {
            const firstLoc = loadedLocations[0] as any;
            const defaultLoc = loadedLocations.find((l: any) => l.isDefault)?.name || firstLoc?.name || "";
            setFormData(prev => ({ ...prev, location: defaultLoc, warehouseLocation: defaultLoc }));
          }
        }
      } catch (error) {
        console.error("Error loading locations:", error);
      }
    };
    loadLocations();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountTypeDropdownRef.current && !accountTypeDropdownRef.current.contains(event.target as Node)) {
        setAccountTypeDropdownOpen(false);
        setNewAccountSearch("");
      }
      if (parentAccountDropdownRef.current && !parentAccountDropdownRef.current.contains(event.target as Node)) {
        setParentAccountDropdownOpen(false);
        setParentAccountSearch("");
      }
      if (fixedAssetTypeDropdownRef.current && !fixedAssetTypeDropdownRef.current.contains(event.target as Node)) {
        setFixedAssetTypeDropdownOpen(false);
        setFixedAssetTypeSearch("");
      }
    };

    if (showNewAccountModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNewAccountModal]);

  useEffect(() => {
    if (!taxLevelOpen || !taxLevelRef.current) return;

    const updatePosition = () => {
      if (!taxLevelRef.current) return;
      const rect = taxLevelRef.current.getBoundingClientRect();
      setTaxLevelMenuStyle({
        left: rect.left - 8,
        top: rect.bottom + 8,
        width: 194,
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
  }, [taxLevelOpen]);

  useEffect(() => {
    if (stateEditCredit) {
      setEditCredit(stateEditCredit);
      return;
    }
    if (!isEdit || !routeCreditId) return;

    const loadCreditForEdit = async () => {
      try {
        const response = await vendorCreditsAPI.getById(routeCreditId);
        if (response && (response.success || response.data)) {
          setEditCredit(response.data);
        }
      } catch (error) {
        console.error("Error loading vendor credit for edit:", error);
      }
    };

    loadCreditForEdit();
  }, [stateEditCredit, isEdit, routeCreditId]);

  useEffect(() => {
    if (!isEdit || !editCredit) return;

    const vendorObj = typeof editCredit.vendor === "object" ? editCredit.vendor : null;
    const vendorId =
      vendorObj?._id ||
      vendorObj?.id ||
      editCredit.vendor ||
      editCredit.vendor_id ||
      "";
    const vendorName =
      editCredit.vendorName ||
      vendorObj?.displayName ||
      vendorObj?.name ||
      "";

    setSelectedVendor((prev: any) => prev || { _id: vendorId, id: vendorId, name: vendorName, displayName: vendorName });
    setFormData((prev) => ({
      ...prev,
      vendorName,
      creditNote: editCredit.creditNote || editCredit.vendorCreditNumber || "",
      orderNumber: editCredit.orderNumber || editCredit.referenceNumber || "",
      vendorCreditDate: editCredit.date ? new Date(editCredit.date).toISOString().split("T")[0] : prev.vendorCreditDate,
      subject: editCredit.subject || "",
      accountsPayable: editCredit.accountsPayable || prev.accountsPayable,
      taxExclusive: editCredit.taxPreference || prev.taxExclusive,
      taxLevel: editCredit.taxLevel || prev.taxLevel,
      discount: Number(editCredit.discount || 0),
      discountType: editCredit.discountType || prev.discountType,
      adjustment: Number(editCredit.adjustment || 0),
      notes: editCredit.notes || "",
      currency: editCredit.currency || prev.currency,
    }));

    const mappedItems = (editCredit.items || []).map((item: any) => ({
      itemDetails: item.name || item.item?.name || item.itemDetails || "",
      item: item.item?._id || item.item?.id || item.item || "",
      name: item.name || item.item?.name || "",
      description: item.description || "",
      account: item.account || item.account_id || "",
      quantity: Number(item.quantity || 1),
      rate: Number(item.rate ?? item.unitPrice ?? 0),
      discount: "0 %-",
      tax: item.tax || "",
      amount: Number(item.amount ?? item.total ?? 0),
      taxRate: Number(item.taxRate || 0),
      taxAmount: Number(item.taxAmount || 0),
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
    }));
    if (mappedItems.length > 0) {
      setItemRows(mappedItems);
    }
  }, [isEdit, editCredit]);

  useEffect(() => {
    if (isEdit || !sourceBill) return;

    const vendorId =
      sourceVendorId ||
      sourceBill?.vendorId ||
      sourceBill?.vendor_id ||
      sourceBill?.vendor?._id ||
      sourceBill?.vendor?.id ||
      sourceBill?.vendor ||
      "";
    const vendorName =
      sourceVendorName ||
      sourceBill?.vendorName ||
      sourceBill?.vendor?.displayName ||
      sourceBill?.vendor?.name ||
      "";
    const billNumber =
      sourceBillNumber ||
      sourceBill?.billNumber ||
      sourceBill?.bill_number ||
      "";
    const billDateRaw =
      sourceBill?.date ||
      sourceBill?.billDate ||
      sourceBill?.createdAt ||
      new Date().toISOString();
    const normalizedBillDate = new Date(billDateRaw).toISOString().split("T")[0];
    const locationName =
      sourceBill?.locationName ||
      sourceBill?.location ||
      sourceBill?.warehouseLocationName ||
      sourceBill?.warehouseLocation ||
      formData.location ||
      "Head Office";
    const poNumber =
      sourceBill?.orderNumber ||
      sourceBill?.purchaseOrderNumber ||
      sourceBill?.purchase_order_number ||
      "";

    if (vendorName) {
      setFormData((prev) => ({
        ...prev,
        vendorName,
        orderNumber: poNumber || prev.orderNumber || billNumber,
        vendorCreditDate: normalizedBillDate || prev.vendorCreditDate,
        location: locationName,
        warehouseLocation: locationName,
      }));
    }

    if (vendorId || vendorName) {
      setSelectedVendor((prev: any) => prev || {
        _id: vendorId,
        id: vendorId,
        name: vendorName,
        displayName: vendorName,
      });
    }

    const mappedBillItems = Array.isArray(sourceBill?.items)
      ? sourceBill.items
          .map((item: any) => {
            const rawItemId = item?.item?._id || item?.item?.id || item?.itemId || item?.item || "";
            const itemName =
              item?.name ||
              item?.item?.name ||
              item?.itemDetails ||
              item?.description ||
              "";
            const quantity = Number(item?.quantity || 0);
            const rate = Number(item?.rate ?? item?.unitPrice ?? 0);
            const amount = Number(item?.amount ?? item?.total ?? quantity * rate);

            if (!itemName || quantity <= 0) return null;

            return {
              itemDetails: itemName,
              item: rawItemId,
              name: item?.name || item?.item?.name || itemName,
              description: item?.description || "",
              account: item?.account || item?.account_id || "",
              quantity: String(quantity),
              rate: String(rate),
              discount: "0 %-",
              tax: item?.tax || "",
              amount: amount.toFixed(2),
              taxRate: Number(item?.taxRate || 0),
              taxAmount: Number(item?.taxAmount || 0),
              purchaseDiscount: "",
              project: "",
              reportingTag: "",
              showAdditionalInfo: true,
              sku: item?.sku || item?.item?.sku || "",
              stockQuantity: Number(item?.item?.stockQuantity || item?.stockQuantity || 0),
              unit: item?.item?.unit || item?.unit || "",
              trackInventory: Boolean(item?.item?.trackInventory ?? item?.trackInventory),
            };
          })
          .filter(Boolean)
      : [];

    if (mappedBillItems.length > 0) {
      setItemRows(mappedBillItems as any);
    }
  }, [isEdit, sourceBill, sourceBillId, sourceBillNumber, sourceVendorId, sourceVendorName]);

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

  // Update currency when base currency is loaded
  useEffect(() => {
    if (baseCurrencyCode) {
      // Use just the short code (e.g., "USD") instead of the full name
      const shortCode = baseCurrencyCode.split(' - ')[0] || baseCurrencyCode;
      setFormData(prev => ({ ...prev, currency: isEdit ? (prev.currency || shortCode) : shortCode }));
    }
  }, [baseCurrencyCode, isEdit]);

  useEffect(() => {
    setFormData((prev) => {
      const taxExclusive = taxMode === "exclusive"
        ? "Tax Exclusive"
        : taxMode === "inclusive"
          ? "Tax Inclusive"
          : prev.taxExclusive;
      return {
        ...prev,
        taxExclusive,
        discount: showTransactionDiscount ? prev.discount : 0,
        adjustment: showAdjustment ? prev.adjustment : 0,
      };
    });
  }, [showTransactionDiscount, showAdjustment, taxMode]);

  // Vendor selection handler
  const handleVendorSelect = (vendor: any) => {
    setSelectedVendor(vendor);
    setFormData({
      ...formData,
      vendorName: vendor.displayName || vendor.name,
    });
    setVendorDropdownOpen(false);
    setVendorSearch("");
    if (errors.vendorName) setErrors({ ...errors, vendorName: false });
  };

  const handleVendorCreated = (vendor: any) => {
    // Add new vendor to both lists and select it
    setVendors(prev => [vendor, ...prev]);
    setAllVendors(prev => [vendor, ...prev]);
    handleVendorSelect(vendor);
  };



  // Load items from API
  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await itemsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          setItems(filterActiveRecords(response.data || []));
        }
      } catch (error) {
        console.error("Error loading items:", error);
      }
    };
    loadItems();
  }, []);

  // Load taxes from API
  useEffect(() => {
    const loadTaxes = async () => {
      try {
        const response = await taxesAPI.getForTransactions("purchase");
        if (response && (response.code === 0 || response.success)) {
          setTaxes(filterActiveRecords(response.data || []));
        }
      } catch (error) {
        console.error("Error loading taxes:", error);
      }
    };
    loadTaxes();
  }, []);

  // Load accounts from API
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await accountantAPI.getAccounts();
        if (response && (response.code === 0 || response.success)) {
          const accountsList = filterActiveRecords(response.data || response.accounts || []);
          setAccounts(accountsList.map((acc: any) => ({
            id: acc._id || acc.id,
            name: acc.accountName || acc.name,
            type: acc.accountType || acc.type
          })));
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };
    loadAccounts();
  }, []);

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (vendor.email && vendor.email.toLowerCase().includes(vendorSearch.toLowerCase())) ||
    (vendor.companyName && vendor.companyName.toLowerCase().includes(vendorSearch.toLowerCase()))
  );

  // Get billing address from selected vendor
  const getBillingAddress = () => {
    if (!selectedVendor || !selectedVendor.formData) return null;
    const billing = selectedVendor.formData;
    return {
      companyName: billing.companyName || billing.billingAttention || "",
      street1: billing.billingStreet1 || "",
      street2: billing.billingStreet2 || "",
      city: billing.billingCity || "",
      state: billing.billingState || "",
      zipCode: billing.billingZipCode || "",
      country: billing.billingCountry || "",
      phone: billing.billingPhone || billing.workPhone || "",
      fax: billing.billingFax || "",
    };
  };

  const billingAddress = getBillingAddress();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) {
        setVendorDropdownOpen(false);
      }
      if (accountsPayableRef.current && !accountsPayableRef.current.contains(event.target as Node)) {
        setAccountsPayableOpen(false);
      }
      if (warehouseRef.current && !warehouseRef.current.contains(event.target as Node)) {
        setWarehouseDropdownOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setLocationDropdownOpen(false);
      }
      if (discountRef.current && !discountRef.current.contains(event.target as Node)) {
        setDiscountDropdownOpen(false);
      }
      if (taxExclusiveRef.current && !taxExclusiveRef.current.contains(event.target as Node)) {
        setTaxPreferenceOpen(false);
      }
      if (taxLevelRef.current && !taxLevelRef.current.contains(event.target as Node)) {
        setTaxLevelOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setUploadMenuOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setBulkActionsOpen(false);
      }
      if (addNewRowRef.current && !addNewRowRef.current.contains(event.target as Node)) {
        setAddNewRowDropdownOpen(false);
      }
      // Close item dropdowns
      Object.keys(itemDropdownOpen).forEach((index) => {
        if (itemRefs.current[index] && !itemRefs.current[index].contains(event.target as Node)) {
          setItemDropdownOpen((prev) => ({ ...prev, [index]: false }));
          setItemSearch((prev) => ({ ...prev, [index]: "" }));
        }
      });
      // Close row menus
      Object.keys(rowMenuOpen).forEach((index) => {
        if (rowMenuOpen[index] && rowMenuRefs.current[index] && !rowMenuRefs.current[index].contains(event.target as Node)) {
          setRowMenuOpen((prev) => ({ ...prev, [index]: false }));
        }
      });
    };

    const hasOpenDropdowns = vendorDropdownOpen || uploadMenuOpen || currencyDropdownOpen ||
      taxLevelOpen || bulkActionsOpen || addNewRowDropdownOpen || Object.values(itemDropdownOpen).some(Boolean) ||
      Object.values(rowMenuOpen).some(Boolean);

    if (hasOpenDropdowns) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [vendorDropdownOpen, uploadMenuOpen, currencyDropdownOpen, taxLevelOpen, bulkActionsOpen, addNewRowDropdownOpen, itemDropdownOpen, rowMenuOpen]);

  
  const toggleAdditionalInfo = (index: number) => {
    const newRows = [...itemRows];
    newRows[index].showAdditionalInfo = newRows[index].showAdditionalInfo === false ? true : false;
    setItemRows(newRows);
    setRowMenuOpen(prev => ({ ...prev, [index]: false }));
  };

  const cloneRow = (index: number) => {
    const rowToClone = JSON.parse(JSON.stringify(itemRows[index]));
    const newRows = [...itemRows];
    newRows.splice(index + 1, 0, rowToClone);
    setItemRows(newRows);
    setRowMenuOpen(prev => ({ ...prev, [index]: false }));
  };

  const insertNewRowBelow = (index: number) => {
    const emptyRow = {
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      discount: "0 %-",
      tax: "",
      amount: "0.00",
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
      showAdditionalInfo: true
    };
    const newRows = [...itemRows];
    newRows.splice(index + 1, 0, emptyRow);
    setItemRows(newRows);
    setRowMenuOpen(prev => ({ ...prev, [index]: false }));
  };

  const openBulkModalAtIndex = (index: number) => {
    setBulkItemsInsertIndex(index);
    setShowBulkItemsModal(true);
    setRowMenuOpen(prev => ({ ...prev, [index]: false }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...itemRows];
    (newItems[index] as any)[field] = value;

    // Calculate amount
    if (field === "quantity" || field === "rate" || field === "discount") {
      const quantity = parseFloat(String(newItems[index].quantity || 0));
      const rate = parseFloat(String(newItems[index].rate || 0));
      const discountMatch = (newItems[index].discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
      const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
      const subtotal = quantity * rate;
      const discountAmount = (subtotal * discountPercent) / 100;
      newItems[index].amount = (subtotal - discountAmount).toFixed(2);
    }

    setItemRows(newItems);

    // Check if item name is missing
    const hasEmptyItem = newItems.some(item => !item.itemDetails || item.itemDetails.trim() === "");
    setShowItemWarning(hasEmptyItem && newItems.length > 0);
  };

  const handleItemSelect = (index: number, item: any) => {
    const newItems = [...itemRows];
    newItems[index].itemDetails = item.name;
    (newItems[index] as any).item = item.id || item._id;
    (newItems[index] as any).sku = item.sku || "";
    (newItems[index] as any).stockQuantity = item.stockQuantity || 0;
    (newItems[index] as any).unit = item.unit || "";
    (newItems[index] as any).trackInventory = item.trackInventory || false;
    // Leave account unselected so the user chooses from the grouped account list
    newItems[index].account = "";
    // Set rate from item if available
    if (item.costPrice) {
      newItems[index].rate = item.costPrice;
      // Recalculate amount
      const quantity = parseFloat(String(newItems[index].quantity || 0));
      const rate = parseFloat(String(item.costPrice || 0));
      const discountMatch = (newItems[index].discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
      const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
      const subtotal = quantity * rate;
      const discountAmount = (subtotal * discountPercent) / 100;
      newItems[index].amount = (subtotal - discountAmount).toFixed(2);
    }
    setItemRows(newItems);
    setItemDropdownOpen((prev) => ({ ...prev, [index]: false }));
    setItemSearch((prev) => ({ ...prev, [index]: "" }));
  };

  const filteredItems = (index: any) => {
    const searchTerm = (itemSearch[index] || "").toLowerCase();
    if (!searchTerm) return items;
    return items.filter((item) =>
      (item.name || "").toLowerCase().includes(searchTerm) ||
      (item.sku || "").toLowerCase().includes(searchTerm)
    );
  };

  const addNewRow = () => {
    setItemRows([...itemRows, {
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      discount: "0 %-",
      tax: "",
      amount: "0.00",
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
    }]);
  };

  const removeRow = (index: number) => {
    if (itemRows.length > 1) {
      setItemRows(itemRows.filter((_, i) => i !== index));
    }
  };


  const insertItemsInBulk = (index: number) => {
    setBulkItemsInsertIndex(index);
    setShowBulkItemsModal(true);
    setBulkItemsSearch("");
    setSelectedBulkItems([]);
    setBulkItemQuantities({});
    setRowMenuOpen((prev) => ({ ...prev, [index]: false }));
  };

  const handleBulkItemSelect = (item: any) => {
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

  const handleBulkQuantityChange = (itemId: string, quantity: any) => {
    setBulkItemQuantities({ ...bulkItemQuantities, [itemId]: parseFloat(quantity) || 1 });
  };

  const filteredAccountTypeOptions = ACCOUNT_TYPE_OPTIONS.filter((type) =>
    type.toLowerCase().includes(newAccountSearch.toLowerCase())
  );

  const filteredParentAccounts = accounts.filter((account: any) => {
    const typeMatches = !newAccountData.accountType || account.type === newAccountData.accountType;
    const nameMatches = account.name?.toLowerCase().includes(parentAccountSearch.toLowerCase());
    return typeMatches && nameMatches;
  });

  const filteredFixedAssetTypeOptions = FIXED_ASSET_TYPE_OPTIONS.filter((type) =>
    type.toLowerCase().includes(fixedAssetTypeSearch.toLowerCase())
  );

  const resetNewAccountModal = () => {
    setShowNewAccountModal(false);
    setNewAccountRowIndex(null);
    setAccountTypeDropdownOpen(false);
    setParentAccountDropdownOpen(false);
    setFixedAssetTypeDropdownOpen(false);
    setNewAccountSearch("");
    setParentAccountSearch("");
    setFixedAssetTypeSearch("");
    setNewAccountData({
      accountType: "Fixed Asset",
      accountName: "",
      isSubAccount: false,
      parentAccount: "",
      accountCode: "",
      description: "",
      createItemAsFixedAsset: true,
      fixedAssetType: "",
    });
  };

  const handleCreateAccount = async () => {
    if (!newAccountData.accountType || !newAccountData.accountName.trim()) {
      toast.error("Please fill in all required account fields");
      return;
    }

    try {
      const payload: any = {
        name: newAccountData.accountName.trim(),
        type: newAccountData.accountType,
        code: newAccountData.accountCode.trim(),
        description: newAccountData.description.trim(),
        is_active: true,
      };

      if (newAccountData.isSubAccount && newAccountData.parentAccount) {
        const parentAccount = accounts.find((account: any) => account.name === newAccountData.parentAccount);
        if (parentAccount?.id) {
          payload.parentAccount = parentAccount.id;
        }
      }

      if (newAccountData.accountType === "Fixed Asset" && newAccountData.createItemAsFixedAsset && newAccountData.fixedAssetType) {
        payload.fixedAssetType = newAccountData.fixedAssetType;
      }

      const response = await accountantAPI.createAccount(payload);
      if (response && (response.code === 0 || response.success)) {
        toast.success("Account created successfully");
        const refreshedAccounts = await accountantAPI.getAccounts();
        if (refreshedAccounts && (refreshedAccounts.code === 0 || refreshedAccounts.success)) {
          const loadedAccounts = filterActiveRecords((refreshedAccounts.data || []) as any[]) as any[];
          setAccounts(loadedAccounts);
        }

        if (newAccountRowIndex !== null) {
          handleItemChange(newAccountRowIndex, "account", newAccountData.accountName.trim());
        }

        resetNewAccountModal();
      } else {
        toast.error("Failed to create account");
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error?.message || "Failed to create account");
    }
  };

  const handleAddBulkItems = () => {
    const newRows = selectedBulkItems.map(item => ({
      itemDetails: item.name,
      account: item.purchaseAccount || "",
      quantity: (bulkItemQuantities[item.id] || 1).toFixed(2),
      rate: (parseFloat(item.costPrice) || 0.0).toFixed(2),
      discount: "0 %-",
      tax: item.purchaseTax || "",
      amount: ((bulkItemQuantities[item.id] || 1) * (parseFloat(item.costPrice) || 0.0)).toFixed(2),
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
      showAdditionalInfo: true
    }));
    const currentRows = [...itemRows];
    
    // Check if we are inserting at a specific index
    if (bulkItemsInsertIndex !== undefined && bulkItemsInsertIndex < currentRows.length) {
        // If the current row is empty, we replace it; otherwise insert after
        if (!currentRows[bulkItemsInsertIndex].itemDetails) {
            currentRows.splice(bulkItemsInsertIndex, 1, ...newRows);
        } else {
            currentRows.splice(bulkItemsInsertIndex + 1, 0, ...newRows);
        }
    } else {
        currentRows.push(...newRows);
    }
    
    setItemRows(currentRows);
    setShowBulkItemsModal(false);
    setSelectedBulkItems([]);
    setBulkItemQuantities({});
    setBulkItemsSearch("");
    setBulkItemsInsertIndex(currentRows.length);
  };

  const filteredBulkItems = bulkItemsSearch.trim() === ""
    ? items
    : items.filter(item =>
      item.name?.toLowerCase().includes(bulkItemsSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(bulkItemsSearch.toLowerCase())
    );

  const handleNewItemSave = () => {
    const newItem = {
      id: Date.now().toString(),
      name: newItemData.name,
      type: newItemData.type,
      unit: newItemData.unit,
      sellable: newItemData.sellable,
      sellingPrice: parseFloat(String(newItemData.sellingPrice || 0)),
      salesAccount: newItemData.salesAccount,
      salesDescription: newItemData.salesDescription,
      salesTax: newItemData.salesTax,
      purchasable: newItemData.purchasable,
      costPrice: parseFloat(String(newItemData.costPrice || 0)),
      purchaseAccount: newItemData.purchaseAccount,
      purchaseDescription: newItemData.purchaseDescription,
      purchaseTax: newItemData.purchaseTax,
      preferredVendor: newItemData.preferredVendor,
      sku: newItemData.sku,
      stockOnHand: parseFloat(String(newItemData.initialStock || 0)),
      transactions: [],
    };

    const savedItems = JSON.parse(localStorage.getItem("inv_items_v1") || "[]");
    savedItems.push(newItem);
    localStorage.setItem("inv_items_v1", JSON.stringify(savedItems));
    setItems([...items, newItem]);

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
      sku: "",
      initialStock: "0",
    });
    setShowNewItemModal(false);
  };

  const calculateSubTotal = () => {
    return itemRows.reduce((sum, item) => sum + parseFloat(String(item.amount || 0)), 0);
  };

  const calculateTaxAmount = () => {
    // Calculate tax based on items with tax
    let taxTotal = 0;
    itemRows.forEach(item => {
      if (item.tax) {
        const taxMatch = item.tax.match(/(\d+(?:\.\d+)?)/);
        const taxPercent = taxMatch ? parseFloat(taxMatch[1]) : 0;
        if (formData.taxExclusive === "Tax Inclusive") {
          // Tax is already included in amount
          const quantity = parseFloat(String(item.quantity || 0));
          const rate = parseFloat(String(item.rate || 0));
          const subtotal = quantity * rate;
          taxTotal += (subtotal * taxPercent) / (100 + taxPercent);
        } else {
          taxTotal += (parseFloat(String(item.amount || 0)) * taxPercent) / 100;
        }
      }
    });
    return taxTotal;
  };

  const calculateDiscountAmount = () => {
    if (!showTransactionDiscount) return 0;
    const subTotal = calculateSubTotal();
    const discountValue = parseFloat(String(formData.discount || 0));
    if (formData.discountType === "%") {
      return (subTotal * discountValue) / 100;
    }
    return discountValue;
  };

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    const adjustment = showAdjustment ? (parseFloat(String(formData.adjustment || 0)) || 0) : 0;
    return subTotal - discountAmount + taxAmount + adjustment;
  };

  const handleSave = async (status: string) => {
    if (saveLoadingState) return;

    // Validate Items
    const newErrors: Record<string, boolean> = {};
    if (!formData.vendorName) newErrors.vendorName = true;
    if (!formData.creditNote) newErrors.creditNote = true;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields");
      return;
    }
    setErrors({});

    try {
      const validItems = itemRows.filter(row => row.itemDetails && parseFloat(String(row.quantity || 0)) > 0);
      if (validItems.length === 0) {
        toast.error("Please add at least one valid item");
        return;
      }
      setSaveLoadingState(status === "Draft" ? "Draft" : "Open");
      const objectIdRegex = /^[a-f\d]{24}$/i;
      const normalizedVendorName = String(formData.vendorName || "").trim().toLowerCase();
      const matchedVendor = (vendors || []).find((vendor: any) => {
        const name = String(vendor?.displayName || vendor?.name || "").trim().toLowerCase();
        return name && name === normalizedVendorName;
      });

      let vendorId =
        selectedVendor?._id
        || selectedVendor?.id
        || selectedVendor?.vendor_id
        || matchedVendor?._id
        || matchedVendor?.id
        || "";

      if (!objectIdRegex.test(String(vendorId || "")) && objectIdRegex.test(String(matchedVendor?._id || ""))) {
        vendorId = matchedVendor?._id;
      }

      if (!vendorId) {
        toast.error("Unable to resolve vendor. Please reselect vendor.");
        return;
      }

      // Prepare vendor credit data for API
      const payload = {
        vendor: vendorId,
        bill: sourceBillId || sourceBill?._id || sourceBill?.id || undefined,
        vendorName: formData.vendorName,
        creditNote: formData.creditNote,
        orderNumber: formData.orderNumber,
        date: formData.vendorCreditDate,
        items: itemRows.map((row: any) => ({
          itemDetails: row.itemDetails,
          quantity: row.quantity,
          rate: row.rate,
          tax: row.tax,
          amount: row.amount,
          account: row.account,
          sku: row.sku,
        })),
        subtotal: calculateSubTotal(),
        discount: showTransactionDiscount ? formData.discount : 0,
        discountType: formData.discountType,
        tax: calculateTaxAmount(),
        adjustment: showAdjustment ? formData.adjustment : 0,
        total: calculateTotal(),
        status: status === "Draft" ? "draft" : "open",
        currency: formData.currency,
        notes: formData.notes,
        subject: formData.subject,
        accountsPayable: formData.accountsPayable,
        taxPreference: formData.taxExclusive,
        taxLevel: formData.taxLevel,
        location: formData.location,
        warehouseLocation: formData.warehouseLocation,
      };

      const creditId = routeCreditId || editCredit?._id || editCredit?.id;
      const response = isEdit && creditId
        ? await vendorCreditsAPI.update(creditId, payload)
        : await vendorCreditsAPI.create(payload);

      if (response.success || response) {
        const actionLabel = isEdit
          ? (status === "Draft" ? "updated as draft" : "updated")
          : (status === "Draft" ? "saved as draft" : "saved");
        toast.success(`Vendor credit ${actionLabel} successfully`);
        // Remove from local storage to keep it clean if user previously had data there
        localStorage.removeItem("vendor_credits");
        if (isEdit && creditId) {
          navigate(`/purchases/vendor-credits/${creditId}`);
        } else {
          navigate("/purchases/vendor-credits");
        }
      }
    } catch (error: any) {
      console.error("Error saving vendor credit:", error);
      toast.error(error.message || "Failed to save vendor credit");
    } finally {
      setSaveLoadingState(null);
    }
  };

  const styles: any = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
    },
    headerTitle: {
      fontSize: "18px",
      fontWeight: "500",
      color: "#111827",
      margin: 0,
    },
    content: {
      padding: "32px",
      flex: 1,
      overflowY: "auto",
      backgroundColor: "#ffffff",
    },
    formSection: {
      maxWidth: "1000px",
      marginBottom: "32px",
    },
    fieldRow: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
      marginBottom: "16px",
      maxWidth: "850px",
    },
    label: {
      fontSize: "13px",
      fontWeight: "400",
      color: "#6b7280",
      width: "180px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexShrink: 0,
    },
    required: {
      color: "#156372",
    },
    input: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      backgroundColor: "#ffffff",
      outline: "none",
      transition: "border-color 0.2s",
    },
    select: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    textarea: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      width: "100%",
      minHeight: "40px",
      resize: "vertical",
      outline: "none",
    },
    itemTable: {
      marginTop: "32px",
      border: "none",
      borderRadius: "0",
      overflow: "visible",
    },
    tableHeaderRow: {
      backgroundColor: "transparent",
      borderBottom: "1.5px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "10px 16px",
      fontSize: "11px",
      color: "#6b7280",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      textAlign: "left",

      backgroundColor: "#f9fafb",
    },
    tableCell: {
      padding: "16px 12px",
      borderBottom: "1px solid #e5e7eb",

      verticalAlign: "top",
    },
    summarySection: {
      marginTop: "24px",
      display: "flex",
      justifyContent: "center",
    },
    summaryBox: {
      width: "420px",
      marginLeft: "auto",
      backgroundColor: "#f9fafb",
      padding: "20px",
      borderRadius: "4px",
      border: "1px solid #f3f4f6",
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    summaryLabel: {
      fontSize: "14px",
      color: "#111827",
    },
    summaryValue: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#111827",
    },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 0",
      marginTop: "8px",
    },
    totalLabel: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#111827",
    },
    totalValue: {
      fontSize: "15px",
      fontWeight: "700",
      color: "#111827",
    },
    footer: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexShrink: 0,
      justifyContent: "flex-start",
    },
    primaryButton: {
      padding: "8px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    secondaryButton: {
      padding: "6px 12px",
      backgroundColor: "#eff6ff",
      color: "#156372",
      border: "1px solid #dbeafe",
      borderRadius: "4px",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    fieldGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    saveDraftButton: {
      padding: "10px 20px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    saveOpenButton: {
      padding: "10px 24px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    cancelButton: {
      padding: "10px 24px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },

    itemDetailsContainer: {
      position: "relative",
      flex: 1,
      height: "36px",
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      backgroundColor: "#fff",
      boxSizing: "border-box",
    },
    itemDropdown: {
      position: "absolute",
      left: 0,
      right: 0,
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      zIndex: 1000,
      maxHeight: "300px",
      overflowY: "auto",
      marginTop: "4px",
    },
    itemDropdownRow: {
      padding: "8px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #f3f4f6",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      transition: "all 0.1s ease",
    },
    itemDropdownInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    itemDropdownName: {
      fontSize: "13px",
      fontWeight: "500",
      color: "#111827",
    },
    itemDropdownSubtext: {
      fontSize: "11px",
      color: "#6b7280",
    },
    itemDropdownStock: {
      textAlign: "right",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    },
    itemDropdownStockLabel: {
      fontSize: "10px",
      color: "#9ca3af",
    },
    itemDropdownStockValue: {
      fontSize: "11px",
      fontWeight: "500",
      color: "#059669",
    },
    addNewItemDropdownBtn: {
      padding: "10px 12px",
      width: "100%",
      textAlign: "left",
      backgroundColor: "#ffffff",
      border: "none",
      borderTop: "1px solid #e5e7eb",
      color: "#2563eb",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    rowActionsContainer: {
      position: "absolute",
      right: "-75px",
      top: "4px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      zIndex: 10,
    },
    actionCircle: {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      border: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      color: "#6b7280",
      transition: "all 0.2s",
    },
    deleteCircle: {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      border: "1px solid #fee2e2",
      backgroundColor: "#ffffff",
      color: "#ef4444",
      transition: "all 0.2s",
    },
    rowDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      width: "240px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      zIndex: 1000,
      padding: "8px 0",
      marginTop: "4px",
      border: "1px solid #e5e7eb",
      textAlign: "left",
    },
    rowDropdownItem: {
      padding: "10px 16px",
      fontSize: "13px",
      color: "#374151",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      transition: "all 0.1s ease",
    },
    bulkModalHeader: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#fff",
    },
    bulkModalTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    bulkModalContent: {
      display: "flex",
      flex: 1,
      overflow: "hidden",
      backgroundColor: "#f9fafb",
    },
    bulkModalLeft: {
      width: "60%",
      borderRight: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#fff",
    },
    bulkModalRight: {
      width: "40%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f9fafb",
    },
    bulkItemRow: {
      padding: "12px 16px",
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      transition: "all 0.2s",
    },
    bulkItemName: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#3b82f6",
    },
    bulkItemSku: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "2px",
    },
    bulkItemSelected: {
      backgroundColor: "#eff6ff",
    },
    bulkQuantityControl: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#fff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      padding: "2px 4px",
    },
    bulkQuantityBtn: {
      width: "24px",
      height: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
      border: "none",
      backgroundColor: "#f3f4f6",
      cursor: "pointer",
      color: "#374151",
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <div style={styles.container} data-testid="vendor-credit-ui-v2">
        <style>
          {`
            .zoho-input:focus {
              border-color: #3b82f6 !important;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
              outline: none !important;
            }
            .zoho-input-error {
              border-color: #ef4444 !important;
              background-color: #fffafb !important;
            }
            .zoho-input-error:focus {
              box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08) !important;
            }
            .premium-action-btn:hover {
              background-color: #e0f2fe !important;
              color: #0284c7 !important;
            }
            .save-btn-hover:hover {
              filter: brightness(0.95);
              transform: translateY(-1px);
            }
            .action-circle-hover:hover {
              background-color: #f9fafb !important;
              border-color: #d1d5db !important;
              color: #111827 !important;
            }
            .delete-circle-hover:hover {
              background-color: #fef2f2 !important;
              border-color: #fecaca !important;
              color: #dc2626 !important;
            }
          `}
        </style>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Briefcase size={20} style={{ color: "#374151" }} />
            <h1 style={styles.headerTitle}>{isEdit ? "Edit Vendor Credit" : "New Vendor Credits"}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/purchases/vendor-credits")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.formSection}>
            {/* Vendor Name */}
            <div style={styles.fieldRow}>
              <label style={{ ...styles.label, color: "#ef4444" }}>Vendor Name*</label>
              <div style={{ flex: 1, maxWidth: "520px", display: "flex", alignItems: "stretch" }}>
                <div style={{ flex: 1, position: "relative" } as any} ref={vendorRef}>
                  <div
                    className={`zoho-input ${errors.vendorName ? "zoho-input-error" : ""}`}
                    style={{ 
                      ...styles.select, 
                      borderTopRightRadius: 0, 
                      borderBottomRightRadius: 0, 
                      height: "100%", 
                      display: "flex", 
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderColor: errors.vendorName ? "#ef4444" : "#d1d5db"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setVendorDropdownOpen(!vendorDropdownOpen);
                    }}
                  >
                    <span style={{ fontSize: "14px", color: formData.vendorName ? "#374151" : "#9ca3af" }}>
                      {formData.vendorName || "Select a Vendor"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {formData.vendorName && (
                        <>
                          <X 
                            size={14} 
                            style={{ color: "#ef4444", cursor: "pointer" }} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, vendorName: "" });
                              setSelectedVendor(null);
                            }} 
                          />
                          <div style={{ width: "1px", height: "16px", backgroundColor: "#e5e7eb" }} />
                        </>
                      )}
                      <ChevronDown size={14} style={{ color: "#9ca3af" }} />
                    </div>
                  </div>

                  {vendorDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      marginTop: "4px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      maxHeight: "400px",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden"
                    }}>
                      <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ position: "relative" }}>
                          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                          <input
                            className="zoho-input"
                            style={{
                              width: "100%",
                              padding: "8px 8px 8px 32px",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              fontSize: "13px",
                              outline: "none"
                            }}
                            placeholder="Search"
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>

                      <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
                        {vendors
                          .filter(v =>
                            (v.name?.toLowerCase().includes(vendorSearch.toLowerCase())) ||
                            (v.email?.toLowerCase().includes(vendorSearch.toLowerCase())) ||
                            (v.displayName?.toLowerCase().includes(vendorSearch.toLowerCase()))
                          )
                          .map(vendor => {
                            const isSelected = formData.vendorName === (vendor.displayName || vendor.name);
                            return (
                              <div
                                key={vendor.id}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  backgroundColor: isSelected ? "#f3f4f6" : "white",
                                  color: "#374151",
                                  transition: "all 0.1s",
                                  borderBottom: "1px solid #f9fafb"
                                }}
                                onClick={() => handleVendorSelect(vendor)}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "#f9fafb";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "white";
                                  }
                                }}
                              >
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: "#f3f4f6",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#6b7280"
                                }}>
                                  {(vendor.displayName || vendor.name || "V")[0].toUpperCase()}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                                    {vendor.displayName || vendor.name}
                                  </span>
                                  {vendor.email && (
                                    <span style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                                      <FileText size={10} /> {vendor.email} | <Copy size={10} /> {vendor.displayName || vendor.name}
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check size={14} style={{ marginLeft: "auto", color: "#156372" }} />
                                )}
                              </div>
                            );
                          })}
                      </div>

                      <div
                        style={{
                          padding: "12px",
                          borderTop: "1px solid #f3f4f6",
                          color: "#3b82f6",
                          fontSize: "13px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          backgroundColor: "#fff"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewVendorModal(true);
                          setVendorDropdownOpen(false);
                        }}
                      >
                        <PlusCircle size={16} color="#3b82f6" /> New Vendor
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  style={{
                    padding: "0 12px",
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: "4px",
                    borderBottomRightRadius: "4px",
                    backgroundColor: "#156372",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <Search size={16} color="#fff" />
                </button>
                <div style={{
                  marginLeft: "12px",
                  padding: "6px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  color: "#374151",
                  backgroundColor: "#fff"
                }}>
                  <Globe size={14} style={{ color: "#10b981" }} />
                  <span style={{ fontWeight: "600" }}>KES</span>
                </div>
              </div>
            </div>

            {/* Billing Address (Conditional) */}
            {selectedVendor && (
              <div style={{ ...styles.fieldRow, alignItems: "flex-start", marginTop: "-8px" }}>
                <div style={styles.label}></div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                    Billing Address <Info size={14} style={{ cursor: "pointer" }} />
                  </div>
                  <div style={{ color: "#374151", fontSize: "13px", lineHeight: "1.5" }}>
                    <div style={{ fontWeight: "600" }}>{selectedVendor.displayName || selectedVendor.name}</div>
                    {selectedVendor.billingAddress?.address && <div>{selectedVendor.billingAddress.address}</div>}
                    {selectedVendor.billingAddress?.city && <div>{selectedVendor.billingAddress.city}</div>}
                    {selectedVendor.billingAddress?.state && <div>{selectedVendor.billingAddress.state}</div>}
                    {selectedVendor.billingAddress?.zipCode && <div>{selectedVendor.billingAddress.zipCode}</div>}
                    {selectedVendor.billingAddress?.country && <div>{selectedVendor.billingAddress.country}</div>}
                    {selectedVendor.phone && <div style={{ marginTop: "4px" }}>Phone: {selectedVendor.phone}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Location</label>
              <div style={{ flex: 1, maxWidth: "225px", position: "relative" }} ref={locationRef}>
                <div
                  className="zoho-input"
                  style={{
                    ...styles.input,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: "#fff"
                  }}
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                >
                  <span style={{ fontSize: "14px", color: "#374151" }}>
                    {formData.location || "Select Location"}
                  </span>
                  <ChevronDown size={14} style={{ color: "#6b7280", transform: locationDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </div>

                {locationDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    marginTop: "4px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden"
                  }}>
                    <div style={{ padding: "8px" }}>
                      <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input 
                          className="zoho-input"
                          style={{
                            width: "100%",
                            padding: "6px 8px 6px 30px",
                            fontSize: "12px",
                            borderRadius: "4px"
                          }}
                          placeholder="Search"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                      {locations
                        .map(l => l.name)
                        .filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase()))
                        .map(loc => {
                          const isSelected = formData.location === loc;
                          return (
                            <div
                              key={loc}
                              style={{
                                padding: "8px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                backgroundColor: isSelected ? "#3b82f6" : "white",
                                color: isSelected ? "#fff" : "#374151",
                                fontSize: "13px"
                              }}
                              onClick={() => {
                                setFormData({ ...formData, location: loc });
                                setLocationDropdownOpen(false);
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = "#f3f4f6";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = "white";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {!isSelected && <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9ca3af" }} />}
                                {loc}
                              </div>
                              {isSelected && <Check size={14} color="#fff" />}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Credit Note# */}
            <div style={styles.fieldRow}>
              <label style={{ ...styles.label, color: "#ef4444" }}>Credit Note#*</label>
              <div style={{ flex: 1, maxWidth: "225px", display: "flex", alignItems: "center", position: "relative" }}>
                  <input
                    type="text"
                    className={`zoho-input ${errors.creditNote ? "zoho-input-error" : ""}`}
                    style={{ 
                      ...styles.input, 
                      borderColor: errors.creditNote ? "#ef4444" : "#d1d5db",
                      backgroundColor: numberingPrefs.mode === "auto" ? "#f9fafb" : "white",
                      color: numberingPrefs.mode === "auto" ? "#6b7280" : "#374151",
                    }}
                    value={formData.creditNote}
                    onChange={(e) => {
                      if (numberingPrefs.mode === "manual") {
                        setFormData({ ...formData, creditNote: e.target.value });
                        if (errors.creditNote) setErrors({ ...errors, creditNote: false });
                      }
                    }}
                    placeholder={numberingPrefs.mode === "auto" ? `${numberingPrefs.prefix}${numberingPrefs.nextNumber}` : ""}
                    readOnly={numberingPrefs.mode === "auto"}
                  />
                  <div 
                    style={{ 
                      position: "absolute", 
                      right: "8px", 
                      height: "70%",
                      width: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderLeft: "1px solid #e5e7eb",
                      cursor: "pointer",
                      color: "#3b82f6"
                    }}
                    onClick={() => setShowNumberingModal(true)}
                  >
                    <Settings size={16} />
                  </div>
                </div>
              </div>

            {/* Order Number */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Order Number</label>
              <div style={{ flex: 1, maxWidth: "225px" }}>
                <input
                  type="text"
                  className="zoho-input"
                  style={styles.input}
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Vendor Credit Date */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Vendor Credit Date</label>
              <div style={{ flex: 1, maxWidth: "225px" }}>
                <input
                  type="date"
                  className="zoho-input"
                  style={styles.input}
                  value={formData.vendorCreditDate}
                  onChange={(e) => setFormData({ ...formData, vendorCreditDate: e.target.value })}
                />
              </div>
            </div>

            {/* Description (Formerly Subject) */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>
                Description <Info size={14} style={{ color: "#9ca3af" }} />
              </label>
              <div style={{ flex: 1, maxWidth: "225px" }}>
                <textarea
                  className="zoho-input"
                  style={{ ...styles.textarea, minHeight: "36px" } as any}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Enter a description within 250 characters"
                />
              </div>
            </div>

            {/* Accounts Payable */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>
                Accounts Payable <Info size={14} style={{ color: "#9ca3af" }} />
              </label>
              <div style={{ flex: 1, maxWidth: "225px", position: "relative" } as any} ref={accountsPayableRef}>
                <div
                  className="zoho-input"
                  style={{
                    ...styles.input,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: "#fff"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccountsPayableOpen(!accountsPayableOpen);
                  }}
                >
                  <span style={{ fontSize: "14px", color: formData.accountsPayable ? "#374151" : "#9ca3af" }}>
                    {formData.accountsPayable || "Select Accounts Payable"}
                  </span>
                  {accountsPayableOpen ? (
                    <ChevronUp size={16} style={{ color: "#3b82f6" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "#6b7280" }} />
                  )}
                </div>

                {accountsPayableOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    marginTop: "4px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                      <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input
                          style={{
                            width: "100%",
                            padding: "8px 8px 8px 32px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "13px",
                            outline: "none"
                          }}
                          placeholder="Search accounts..."
                          value={apSearchTerm}
                          onChange={(e) => setApSearchTerm(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div style={{ padding: "4px 0" }}>
                      {accounts
                        .filter(acc =>
                          (acc.type === "Accounts Payable" || acc.name === "Accounts Payable") &&
                          acc.name.toLowerCase().includes(apSearchTerm.toLowerCase())
                        )
                        .map(acc => (
                          <div
                            key={acc.id}
                            style={{
                              padding: "10px 16px",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              backgroundColor: formData.accountsPayable === acc.name ? "#3b82f6" : "white",
                              color: formData.accountsPayable === acc.name ? "#fff" : "#374151",
                              transition: "background-color 0.2s"
                            }}
                            onClick={() => {
                              setFormData({ ...formData, accountsPayable: acc.name });
                              setAccountsPayableOpen(false);
                              setApSearchTerm("");
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = formData.accountsPayable === acc.name ? "#3b82f6" : "#f3f4f6")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = formData.accountsPayable === acc.name ? "#3b82f6" : "white")}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {formData.accountsPayable !== acc.name && <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#9ca3af" }} />}
                              {acc.name}
                            </div>
                            {formData.accountsPayable === acc.name && <Check size={14} color="#fff" />}
                          </div>
                        ))}
                      {accounts.filter(acc => (acc.type === "Accounts Payable" || acc.name === "Accounts Payable") && acc.name.toLowerCase().includes(apSearchTerm.toLowerCase())).length === 0 && (
                        <div style={{ padding: "12px", fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
                          No matching liability accounts found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Item Table Selection */}
          <div style={{ display: "flex", gap: "24px", alignItems: "center", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", position: "relative" }} ref={warehouseRef}>
              <span style={{ color: "#6b7280" }}>Warehouse Location</span>
              <div 
                style={{ 
                  color: "#156372", 
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderBottom: "1px dashed #156372",
                  fontWeight: "500"
                }}
                onClick={() => setWarehouseDropdownOpen(!warehouseDropdownOpen)}
              >
                {formData.warehouseLocation || "Head Office"}
                <ChevronDown size={14} />
              </div>
              {warehouseDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: "135px",
                  width: "220px",
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  marginTop: "4px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  zIndex: 1000,
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "8px" }}>
                    <div style={{ position: "relative" }}>
                      <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input 
                        className="zoho-input"
                        style={{ width: "100%", padding: "6px 8px 6px 30px", fontSize: "12px", borderRadius: "4px" }}
                        placeholder="Search"
                        value={warehouseSearch}
                        onChange={(e) => setWarehouseSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {locations
                      .map(l => l.name)
                      .filter(loc => loc.toLowerCase().includes(warehouseSearch.toLowerCase()))
                      .map(loc => (
                        <div
                          key={loc}
                          style={{
                            padding: "8px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            backgroundColor: formData.warehouseLocation === loc ? "#eff6ff" : "white",
                            color: formData.warehouseLocation === loc ? "#156372" : "#374151",
                            fontSize: "13px"
                          }}
                          onClick={() => { setFormData({ ...formData, warehouseLocation: loc }); setWarehouseDropdownOpen(false); }}
                        >
                          {loc}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: "1px", height: "16px", backgroundColor: "#e5e7eb" }}></div>

            {/* Tax Level Dropdown */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", position: "relative" }}
              ref={taxLevelRef}
            >
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  minHeight: "28px",
                  padding: "0 4px",
                  cursor: "pointer",
                  color: "#374151",
                  fontWeight: "500",
                }}
                onClick={() => {
                  setTaxLevelOpen(!taxLevelOpen);
                  if (taxLevelOpen) {
                    setTaxLevelSearch("");
                  }
                }}
              >
                <Percent size={14} style={{ color: "#6b7280", strokeWidth: 1.8 }} />
                <span style={{ fontSize: "13px", color: "#374151" }}>
                  {formData.taxLevel === "At Item Level" ? "At Line Item Level" : (formData.taxLevel || "At Transaction Level")}
                </span>
                <ChevronDown
                  size={15}
                  style={{
                    color: "#6b7280",
                    transform: taxLevelOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease"
                  }}
                />
              </div>
              {taxLevelOpen &&
                taxLevelMenuStyle &&
                createPortal(
                  <div
                    style={{
                      position: "fixed",
                      top: taxLevelMenuStyle.top,
                      left: taxLevelMenuStyle.left,
                      width: `${taxLevelMenuStyle.width}px`,
                      backgroundColor: "white",
                      border: "1px solid #e6ebf2",
                      borderRadius: "10px",
                      boxShadow: "0 10px 26px rgba(15, 23, 42, 0.16)",
                      zIndex: 9999,
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ padding: "9px 9px 6px" }}>
                      <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input 
                          className="zoho-input"
                          style={{
                            width: "100%",
                            height: "34px",
                            padding: "7px 10px 7px 30px",
                            fontSize: "12px",
                            color: "#6b7280",
                            border: "1px solid #3b82f6",
                            borderRadius: "7px",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                          placeholder="Search"
                          value={taxLevelSearch}
                          onChange={(e) => setTaxLevelSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div style={{ padding: "6px 12px 5px", fontSize: "12px", fontWeight: "700", color: "#4b5563" }}>
                      Discount Type
                    </div>
                    {["At Transaction Level", "At Line Item Level"]
                      .filter((opt) => opt.toLowerCase().includes(taxLevelSearch.toLowerCase()))
                      .map((opt) => {
                        const internalVal = opt === "At Line Item Level" ? "At Item Level" : opt;
                        const isSelected = formData.taxLevel === internalVal || formData.taxLevel === opt;
                        return (
                          <div 
                            key={opt}
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: isSelected ? "#3b82f6" : "white",
                              color: isSelected ? "white" : "#4b5563",
                              margin: "0 7px 6px",
                              borderRadius: "7px",
                              fontWeight: isSelected ? "600" : "500"
                            }}
                            onClick={() => {
                              setFormData({ ...formData, taxLevel: internalVal });
                              setTaxLevelOpen(false);
                              setTaxLevelSearch("");
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = "white";
                            }}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check size={14} color="white" />}
                          </div>
                        );
                      })}
                    {!["At Transaction Level", "At Line Item Level"].some((opt) =>
                      opt.toLowerCase().includes(taxLevelSearch.toLowerCase())
                    ) && (
                      <div style={{ padding: "8px 12px 12px", fontSize: "12px", color: "#9ca3af" }}>
                        No matching options
                      </div>
                    )}
                  </div>,
                  document.body
                )}
            </div>
          </div>

          {/* Item Table */}
          <div style={styles.itemTable}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>Item Table</span>
              <div style={{ display: "flex", alignItems: "center", color: "#156372", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                <CheckCircle size={14} />
                Bulk Actions
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.tableHeaderCell, width: "4%", padding: "10px" } as any}></th>
                  <th style={{ ...styles.tableHeaderCell, width: "35%", fontSize: "11px", color: "#6b7280", fontWeight: "600", padding: "10px 16px" } as any}>ITEM DETAILS</th>
                  <th style={{ ...styles.tableHeaderCell, width: "20%", fontSize: "11px", color: "#6b7280", fontWeight: "600" } as any}>ACCOUNT</th>
                  <th style={{ ...styles.tableHeaderCell, width: "9%", fontSize: "11px", color: "#6b7280", fontWeight: "600", textAlign: "right" } as any}>QUANTITY</th>
                  <th style={{ ...styles.tableHeaderCell, width: "15%", fontSize: "11px", color: "#6b7280", fontWeight: "600", textAlign: "right" } as any}>RATE <Grid3x3 size={12} style={{ display: "inline", marginLeft: "4px" }} /></th>

                  <th style={{ ...styles.tableHeaderCell, width: "17%", fontSize: "11px", color: "#6b7280", fontWeight: "600", textAlign: "right", borderRight: "none" } as any}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ ...styles.tableCell, width: "4%", padding: "12px 10px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <GripVertical size={16} style={{ color: "#d1d5db" }} />
                        <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>{index + 1}</span>
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, width: "35%", padding: "12px 16px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "4px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" } as any}>
                          <ImageIcon size={20} color="#d1d5db" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div 
                            style={{
                              ...styles.itemDetailsContainer,
                              borderColor: itemDropdownOpen[index] ? "#2563eb" : "#e5e7eb",
                              borderWidth: itemDropdownOpen[index] ? "1.5px" : "1px"
                            }} 
                            ref={(el) => { (itemRefs.current as any)[index] = el; }}
                          >
                            <input
                              style={{ 
                                ...styles.input, 
                                border: "none", 
                                padding: "0", 
                                fontSize: "14px", 
                                color: "#111827", 
                                fontWeight: "400", 
                                backgroundColor: "transparent",
                                height: "100%",
                                width: "100%",
                                outline: "none"
                              }}
                              value={itemDropdownOpen[index] ? (itemSearch[index] || "") : item.itemDetails}
                              placeholder="Type or click to select an item."
                              onChange={(e) => {
                                handleItemChange(index, "itemDetails", e.target.value);
                                setItemSearch((prev) => ({ ...prev, [index]: e.target.value }));
                                setItemDropdownOpen((prev) => ({ ...prev, [index]: true }));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemDropdownOpen((prev) => ({ ...prev, [index]: !prev[index] }));
                              }}
                            />
                            {itemDropdownOpen[index] && (
                              <div style={styles.itemDropdown}>
                                {filteredItems(index).length > 0 ? (
                                  filteredItems(index).map((shopItem) => (
                                    <div
                                      key={shopItem.id || shopItem._id}
                                      style={styles.itemDropdownRow}
                                      onClick={(e) => { e.stopPropagation(); handleItemSelect(index, shopItem); }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#2563eb";
                                        const nameEl = e.currentTarget.querySelector('.item-name') as HTMLElement;
                                        const subEl = e.currentTarget.querySelector('.item-subtext') as HTMLElement;
                                        if (nameEl) nameEl.style.color = "#ffffff";
                                        if (subEl) subEl.style.color = "rgba(255, 255, 255, 0.8)";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff";
                                        const nameEl = e.currentTarget.querySelector('.item-name') as HTMLElement;
                                        const subEl = e.currentTarget.querySelector('.item-subtext') as HTMLElement;
                                        if (nameEl) nameEl.style.color = "#111827";
                                        if (subEl) subEl.style.color = "#6b7280";
                                      }}
                                    >
                                      <div style={styles.itemDropdownInfo}>
                                        <div className="item-name" style={styles.itemDropdownName}>{shopItem.name}</div>
                                        <div className="item-subtext" style={styles.itemDropdownSubtext}>
                                          SKU: {shopItem.sku || "N/A"} Purchase Rate: {formData.currency} {parseFloat(shopItem.costPrice || 0).toFixed(2)}
                                        </div>
                                      </div>
                                      {shopItem.trackInventory && (
                                        <div style={styles.itemDropdownStock}>
                                          <div style={styles.itemDropdownStockLabel}>Stock on Hand</div>
                                          <div style={styles.itemDropdownStockValue}>
                                            {parseFloat(shopItem.stockQuantity || 0).toFixed(2)} {shopItem.unit || "N/A"}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ padding: "12px", fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
                                    No items found
                                  </div>
                                )}
                                <button
                                  type="button"
                                  style={styles.addNewItemDropdownBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNewItemModal(true);
                                    setItemDropdownOpen((prev) => ({ ...prev, [index]: false }));
                                  }}
                                >
                                  <PlusCircle size={14} /> New Item
                                </button>
                              </div>
                            )}
                          </div>

                          
                          {/* Secondary Row for Project and Tags - Forced Single Line */}
                          {item.showAdditionalInfo !== false && (
                            <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center", flexWrap: "nowrap" }}>
                            <div style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "4px", 
                              fontSize: "11px", 
                              color: item.project ? "#ef4444" : "#6b7280", 
                              cursor: "pointer",
                              padding: "2px 6px",
                              backgroundColor: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              whiteSpace: "nowrap"
                            }}>
                              <Briefcase size={11} />
                              <span>{item.project || "Select a project"}</span>
                              <ChevronDown size={11} />
                            </div>
                            <div 
                               ref={(el) => { (tagsRef.current as any)[index] = el; }}
                               style={{ 
                                 display: "flex", 
                                 alignItems: "center", 
                                 gap: "4px", 
                                 fontSize: "11px", 
                                 color: "#6b7280", 
                                 cursor: "pointer",
                                 padding: "2px 6px",
                                 backgroundColor: "#f9fafb",
                                 border: "1px solid #e5e7eb",
                                 borderRadius: "4px",
                                 whiteSpace: "nowrap",
                                 position: "relative"
                               }}
                               onClick={() => setTagsPopoverOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                             >
                               <Tag size={11} />
                               <span style={{ color: "#ef4444" }}>Reporting Tags* :</span>
                               <span style={{ color: "#374151" }}>{item.reportingTag ? "1 out of 1 selected." : "Select tags"}</span>
                               <ChevronDown size={11} />

                               {tagsPopoverOpen[index] && (
                                 <div 
                                   style={{
                                     position: "absolute",
                                     top: "100%",
                                     left: "0",
                                     width: "400px",
                                     backgroundColor: "white",
                                     border: "1px solid #e5e7eb",
                                     borderRadius: "8px",
                                     marginTop: "8px",
                                     boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                     zIndex: 2000,
                                     padding: "0",
                                     cursor: "default"
                                   }}
                                   onClick={(e) => e.stopPropagation()}
                                 >
                                   <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontWeight: "600", color: "#111827", fontSize: "14px" }}>
                                     Reporting Tags
                                   </div>
                                   <div style={{ padding: "20px 24px" }}>
                                     <div style={{ marginBottom: "8px", color: "#ef4444", fontSize: "13px" }}>as *</div>
                                     <div style={{ position: "relative" }}>
                                       <div 
                                         style={{
                                           width: "100%",
                                           height: "36px",
                                           padding: "0 12px",
                                           border: "1px solid #3b82f6",
                                           borderRadius: "8px",
                                           display: "flex",
                                           alignItems: "center",
                                           justifyContent: "space-between",
                                           backgroundColor: "#fff",
                                           cursor: "pointer",
                                           fontSize: "14px",
                                           color: item.reportingTag ? "#111827" : "#9ca3af"
                                         }}
                                         onClick={() => setTagDropdownOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                                       >
                                         <span>{item.reportingTag || "None"}</span>
                                         <ChevronDown size={14} style={{ transform: tagDropdownOpen[index] ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                                       </div>

                                       {tagDropdownOpen[index] && (
                                         <div style={{
                                           position: "absolute",
                                           top: "100%",
                                           left: 0,
                                           right: 0,
                                           backgroundColor: "white",
                                           border: "1px solid #e5e7eb",
                                           borderRadius: "8px",
                                           marginTop: "4px",
                                           boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                           zIndex: 2100,
                                           maxHeight: "200px",
                                           overflowY: "auto"
                                         }}>
                                           <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
                                             <div style={{ position: "relative" }}>
                                               <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                                               <input 
                                                 style={{ width: "100%", padding: "6px 8px 6px 32px", fontSize: "13px", borderRadius: "4px", border: "1px solid #e5e7eb", outline: "none" }}
                                                 placeholder="Search"
                                                 value={tagSearch[index] || ""}
                                                 onChange={(e) => setTagSearch(prev => ({ ...prev, [index]: e.target.value }))}
                                               />
                                             </div>
                                           </div>
                                           {availableTags
                                             .filter(tag => tag.name.toLowerCase().includes((tagSearch[index] || "").toLowerCase()))
                                             .map(tag => (
                                               <div 
                                                 key={tag.id}
                                                 style={{ 
                                                   padding: "8px 12px", 
                                                   cursor: "pointer", 
                                                   fontSize: "13px",
                                                   backgroundColor: item.reportingTag === tag.name ? "#2563eb" : "transparent",
                                                   color: item.reportingTag === tag.name ? "white" : "#111827"
                                                 }}
                                                 onMouseEnter={(e) => { if (item.reportingTag !== tag.name) e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
                                                 onMouseLeave={(e) => { if (item.reportingTag !== tag.name) e.currentTarget.style.backgroundColor = "transparent"; }}
                                                 onClick={() => {
                                                   handleItemChange(index, "reportingTag", tag.name);
                                                   setTagDropdownOpen(prev => ({ ...prev, [index]: false }));
                                                 }}
                                               >
                                                 {tag.name}
                                               </div>
                                             ))}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                   <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "8px" }}>
                                     <button 
                                       style={{ padding: "6px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}
                                       onClick={() => setTagsPopoverOpen(prev => ({ ...prev, [index]: false }))}
                                     >
                                       Save
                                     </button>
                                     <button 
                                       style={{ padding: "6px 16px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}
                                       onClick={() => setTagsPopoverOpen(prev => ({ ...prev, [index]: false }))}
                                     >
                                       Cancel
                                     </button>
                                   </div>
                                 </div>
                               )}
                             </div>
                             </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, width: "20%", verticalAlign: "top", padding: "12px 8px" }}>
                      <div style={{ position: "relative" } as any} ref={(el) => { (accountRefs.current as any)[index] = el; }}>
                        <div
                          className="zoho-input"
                          style={{
                            ...styles.input,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            fontSize: "13px",
                            height: "36px",
                            border: accountDropdownOpen[index] ? "1.5px solid #2563eb" : "1px solid transparent",
                            borderRadius: "4px",
                            padding: "0 8px",
                            backgroundColor: accountDropdownOpen[index] ? "#fff" : "transparent",
                            boxSizing: "border-box",
                            width: "100%"
                          }}
                          onClick={() => setAccountDropdownOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                        >
                          <span style={{ color: item.account ? "#374151" : "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.account || "Select an account"}
                          </span>
                          {accountDropdownOpen[index] ? (
                            <ChevronUp size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
                          ) : (
                            <ChevronDown size={14} style={{ color: "#6b7280", flexShrink: 0 }} />
                          )}
                        </div>
                        {accountDropdownOpen[index] && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            width: "400px",
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            marginTop: "4px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            maxHeight: "350px",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column"
                          }}>
                            {/* Search Bar */}
                            <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 10 }}>
                              <div style={{ position: "relative" }}>
                                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                                <input 
                                  className="zoho-input"
                                  style={{ width: "100%", padding: "6px 8px 6px 32px", fontSize: "13px", borderRadius: "4px", border: "1px solid #e5e7eb", outline: "none" }}
                                  placeholder="Search"
                                  value={accountSearch[index] || ""}
                                  onChange={(e) => setAccountSearch(prev => ({ ...prev, [index]: e.target.value }))}
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* Grouped Accounts */}
                            <div style={{ flex: 1, overflowY: "auto" }}>
                              {Object.entries(
                                accounts
                                  .filter(acc => acc.name.toLowerCase().includes((accountSearch[index] || "").toLowerCase()))
                                  .reduce((acc: any, account: any) => {
                                    const type = account.type || 'Other';
                                    if (!acc[type]) acc[type] = [];
                                    acc[type].push(account);
                                    return acc;
                                  }, {})
                              ).map(([type, groupAccounts]: [string, any]) => (
                                <div key={type}>
                                  <div style={{ padding: "12px 16px 4px", fontSize: "13px", fontWeight: "700", color: "#4b5563", backgroundColor: "#fff" }}>
                                    {type}
                                  </div>
                                  {groupAccounts.map((acc: any) => (
                                    <div
                                      key={acc.id}
                                      style={{ 
                                        padding: "8px 16px", 
                                        margin: "2px 8px",
                                        fontSize: "13px", 
                                        cursor: "pointer", 
                                        borderRadius: "6px",
                                        backgroundColor: item.account === acc.name ? "#2563eb" : "white",
                                        color: item.account === acc.name ? "white" : "#374151"
                                      }}
                                      onMouseEnter={(e) => {
                                        if (item.account !== acc.name) e.currentTarget.style.backgroundColor = "#f3f4f6";
                                      }}
                                      onMouseLeave={(e) => {
                                        if (item.account !== acc.name) e.currentTarget.style.backgroundColor = "white";
                                      }}
                                      onClick={() => {
                                        handleItemChange(index, "account", acc.name);
                                        setAccountDropdownOpen(prev => ({ ...prev, [index]: false }));
                                      }}
                                    >
                                      {acc.name}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>

                            {/* New Account Button */}
                            <div 
                              style={{ 
                                padding: "10px 16px", 
                                borderTop: "1px solid #f3f4f6", 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "8px", 
                                color: "#2563eb", 
                                fontSize: "13px", 
                                cursor: "pointer",
                                backgroundColor: "#fff",
                                position: "sticky",
                                bottom: 0
                              }}
                              onClick={() => {
                                setNewAccountRowIndex(index);
                                setShowNewAccountModal(true);
                                setAccountDropdownOpen(prev => ({ ...prev, [index]: false }));
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                            >
                              <PlusCircle size={16} />
                              <span style={{ fontWeight: "500" }}>New Account</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, width: "9%", padding: "8px", verticalAlign: "top" }}>
                      <div style={{ height: "36px", display: "flex", alignItems: "center" }}>
                        <input
                          type="text"
                          style={{ 
                            width: "100%", 
                            border: "1px solid transparent", 
                            borderRadius: "4px",
                            backgroundColor: "transparent", 
                            textAlign: "right", 
                            fontSize: "13px", 
                            color: "#111827", 
                            outline: "none", 
                            padding: "8px 12px",
                            height: "36px",
                            boxSizing: "border-box",
                            transition: "all 0.2s"
                          }}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            handleItemChange(index, "quantity", val);
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#2563eb";
                            e.target.style.backgroundColor = "#fff";
                            e.target.style.borderWidth = "1.5px";
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "transparent";
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.borderWidth = "1px";
                            const val = parseFloat(item.quantity || "0").toFixed(2);
                            handleItemChange(index, "quantity", val);
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, width: "15%", padding: "8px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ height: "36px", display: "flex", alignItems: "center" }}>
                          <input
                            type="text"
                            style={{ 
                              width: "100%", 
                              border: "1px solid transparent", 
                              borderRadius: "4px",
                              backgroundColor: "transparent", 
                              textAlign: "right", 
                              fontSize: "13px", 
                              color: "#111827", 
                              outline: "none", 
                              padding: "8px 12px",
                              height: "36px",
                              boxSizing: "border-box",
                              transition: "all 0.2s"
                            }}
                            value={item.rate}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              handleItemChange(index, "rate", val);
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "#2563eb";
                              e.target.style.backgroundColor = "#fff";
                              e.target.style.borderWidth = "1.5px";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "transparent";
                              e.target.style.backgroundColor = "transparent";
                              e.target.style.borderWidth = "1px";
                              const val = parseFloat(item.rate || "0").toFixed(2);
                              handleItemChange(index, "rate", val);
                            }}
                          />
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "10px", color: "#156372", cursor: "pointer" }}>Recent Transactions</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, width: "17%", textAlign: "right", borderRight: "none", verticalAlign: "top", padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "36px", position: "relative" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{parseFloat(String(item.amount || 0)).toFixed(2)}</span>
                        {/* Row Actions - Outside */}
                        <div style={styles.rowActionsContainer} ref={(el) => { (rowMenuRefs.current as any)[index] = el; }}>
                          <div 
                            className="action-circle-hover" 
                            style={styles.actionCircle} 
                            title="More Actions"
                            onClick={() => setRowMenuOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                          >
                            <MoreVertical size={14} />
                          </div>

                          {rowMenuOpen[index] && (
                            <div style={styles.rowDropdown}>
                              <div className="action-circle-hover" style={styles.rowDropdownItem} onClick={() => toggleAdditionalInfo(index)}>
                                <Info size={14} /> {item.showAdditionalInfo === false ? "Show Additional Information" : "Hide Additional Information"}
                              </div>
                              <div className="action-circle-hover" style={styles.rowDropdownItem} onClick={() => cloneRow(index)}>
                                <Copy size={14} /> Clone
                              </div>
                              <div className="action-circle-hover" style={styles.rowDropdownItem} onClick={() => insertNewRowBelow(index)}>
                                <Plus size={14} /> Insert New Row
                              </div>
                              <div className="action-circle-hover" style={styles.rowDropdownItem} onClick={() => openBulkModalAtIndex(index)}>
                                <PlusCircle size={14} /> Insert Items in Bulk
                              </div>
                            </div>
                          )}
                          <div 
                            className="delete-circle-hover" style={styles.deleteCircle} 
                            onClick={() => removeRow(index)}
                            title="Delete Row"
                          >
                            <X size={14} />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px" }}>
              <div style={{ display: "flex", gap: "12px", marginLeft: "calc(4% + 16px)" }}>
                <button 
                  type="button" 
                  onClick={addNewRow} 
                  className="premium-action-btn"
                  style={{ padding: "0 14px", height: "34px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#3b82f6", backgroundColor: "#f0f7ff", border: "1px solid #dbeafe", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <PlusCircle size={16} /> Add New Row <ChevronDown size={14} style={{ opacity: 0.7 }} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowBulkItemsModal(true)} 
                  className="premium-action-btn"
                  style={{ padding: "0 14px", height: "34px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#3b82f6", backgroundColor: "#f0f7ff", border: "1px solid #dbeafe", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <PlusCircle size={16} /> Add Items in Bulk
                </button>
              </div>

              <div style={{ 
                backgroundColor: "transparent", 
                width: "350px",
                padding: "0",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "8px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#4b5563", fontWeight: "500" }}>Sub Total</span>
                  <span style={{ fontSize: "13px", color: "#111827", fontWeight: "600" }}>{calculateSubTotal().toFixed(2)}</span>
                </div>
                {showTransactionDiscount && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#4b5563", fontWeight: "500" }}>Discount</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", gap: "0", alignItems: "center", width: "120px" }}>
                        <input
                          style={{
                            width: "60px",
                            padding: "6px 8px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px 0 0 4px",
                            fontSize: "13px",
                            textAlign: "right",
                            outline: "none",
                            backgroundColor: "#fff"
                          }}
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                        />
                        <div style={{ position: "relative", flex: 1 }} ref={discountRef as any}>
                          <div
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #d1d5db",
                              borderLeft: "none",
                              borderRadius: "0 4px 4px 0",
                              fontSize: "13px",
                              backgroundColor: "#f3f4f6",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#374151",
                              fontWeight: "500",
                              gap: "4px",
                              height: "31px",
                              boxSizing: "border-box"
                            }}
                            onClick={(e) => { e.stopPropagation(); setDiscountDropdownOpen(!discountDropdownOpen); }}
                          >
                            {formData.discountType === "%" ? "%" : formData.currency}
                            <ChevronDown size={12} />
                          </div>
                          {discountDropdownOpen && (
                            <div style={{ 
                              position: "absolute", 
                              top: "100%", 
                              right: 0, 
                              backgroundColor: "white", 
                              border: "1px solid #e5e7eb", 
                              borderRadius: "6px", 
                              marginTop: "4px", 
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", 
                              zIndex: 100, 
                              minWidth: "80px" 
                            }}>
                              {["%", formData.currency || "KES"].map(opt => (
                                <div 
                                  key={opt} 
                                  style={{ 
                                    padding: "8px 16px", 
                                    cursor: "pointer", 
                                    fontSize: "13px", 
                                    backgroundColor: (formData.discountType === "%" ? "%" : formData.currency) === opt ? "#f3f4f6" : "white",
                                    color: "#374151"
                                  }} 
                                  onClick={() => { setFormData({ ...formData, discountType: opt === "%" ? "%" : "Currency" }); setDiscountDropdownOpen(false); }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = (formData.discountType === "%" ? "%" : formData.currency) === opt ? "#f3f4f6" : "white")}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: "13px", color: "#111827", fontWeight: "500", minWidth: "40px", textAlign: "right" }}>{calculateDiscountAmount().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}>Total</span>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Attachments */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 350px",
              gap: "32px",
              marginTop: "16px",
              padding: "8px 0 24px 0",
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label style={{ ...styles.label, marginBottom: "8px", fontWeight: "500", width: "auto" }}>Notes</label>
              <textarea
                style={{ ...styles.textarea, minHeight: "100px" } as any}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter notes"
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={{ ...styles.label, marginBottom: "8px", fontWeight: "500", width: "auto" }}>Attach File(s) to Vendor Credits</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => (fileInputRef.current as any)?.click()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  <UploadIcon size={16} style={{ color: "#6b7280" }} />
                  Upload File
                  <ChevronDown size={14} style={{ color: "#9ca3af" }} />
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
                You can upload a maximum of 5 files, 10MB each
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => console.log("Files selected:", e.target.files)}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            className="save-btn-hover" style={styles.saveDraftButton}
            onClick={() => handleSave("Draft")}
            disabled={!!saveLoadingState}
          >
            {saveLoadingState === "Draft" ? "Saving..." : (isEdit ? "Update as Draft" : "Save as Draft")}
          </button>
          <button
            className="save-btn-hover" style={styles.saveOpenButton}
            onClick={() => handleSave("Open")}
            disabled={!!saveLoadingState}
          >
            {saveLoadingState === "Open" ? "Saving..." : (isEdit ? "Update as Open" : "Save as Open")}
          </button>
          <button style={styles.cancelButton} onClick={() => navigate("/purchases/vendor-credits")} disabled={!!saveLoadingState}>Cancel</button>
        </div>
      </div>

      {showNewItemModal && (
        <NewItemModal
          show={showNewItemModal}
          onClose={() => setShowNewItemModal(false)}
          data={newItemData}
          onChange={setNewItemData}
          onSave={handleNewItemSave}
          taxes={taxes}
          vendors={vendors}
          styles={styles}
        />
      )}

      {showNewAccountModal && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17, 24, 39, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 12000,
            padding: "24px",
          }}
          onClick={resetNewAccountModal}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "840px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#111827" }}>Create Account</h2>
              <button
                type="button"
                onClick={resetNewAccountModal}
                style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 340px", minHeight: 0 }}>
              <div style={{ padding: "20px", overflowY: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "16px 16px", alignItems: "start" }}>
                  <label style={{ color: "#ef4444", fontSize: "14px", lineHeight: "40px" }}>Account Type*</label>
                  <div style={{ position: "relative" }} ref={accountTypeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setAccountTypeDropdownOpen((prev) => !prev)}
                      style={{ width: "100%", height: "40px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", color: "#374151", cursor: "pointer" }}
                    >
                      <span>{newAccountData.accountType}</span>
                      {accountTypeDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {accountTypeDropdownOpen && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)", zIndex: 20, maxHeight: "280px", overflow: "hidden" }}>
                        <div style={{ padding: "10px" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                            <input
                              value={newAccountSearch}
                              onChange={(e) => setNewAccountSearch(e.target.value)}
                              placeholder="Search"
                              style={{ width: "100%", height: "34px", border: "1px solid #3b82f6", borderRadius: "7px", padding: "0 10px 0 30px", outline: "none", fontSize: "13px" }}
                            />
                          </div>
                        </div>
                        <div style={{ maxHeight: "220px", overflowY: "auto", paddingBottom: "8px" }}>
                          {filteredAccountTypeOptions.map((type) => (
                            <div
                              key={type}
                              onClick={() => {
                                setNewAccountData((prev) => ({ ...prev, accountType: type, parentAccount: "", fixedAssetType: "" }));
                                setAccountTypeDropdownOpen(false);
                                setNewAccountSearch("");
                              }}
                              style={{ padding: "10px 14px", cursor: "pointer", fontSize: "14px", backgroundColor: newAccountData.accountType === type ? "#3b82f6" : "#fff", color: newAccountData.accountType === type ? "#fff" : "#374151", fontWeight: newAccountData.accountType === type ? 600 : 400 }}
                            >
                              {type}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <label style={{ color: "#ef4444", fontSize: "14px", lineHeight: "40px" }}>Account Name*</label>
                  <input
                    value={newAccountData.accountName}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, accountName: e.target.value }))}
                    style={{ width: "100%", height: "40px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0 12px", fontSize: "14px", outline: "none" }}
                  />

                  <div></div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#4b5563", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newAccountData.isSubAccount}
                      onChange={(e) => setNewAccountData((prev) => ({ ...prev, isSubAccount: e.target.checked, parentAccount: "" }))}
                    />
                    Make this a sub-account
                  </label>

                  {newAccountData.isSubAccount && (
                    <>
                      <label style={{ color: "#ef4444", fontSize: "14px", lineHeight: "40px" }}>Parent Account*</label>
                      <div style={{ position: "relative" }} ref={parentAccountDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setParentAccountDropdownOpen((prev) => !prev)}
                          style={{ width: "100%", height: "40px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", color: newAccountData.parentAccount ? "#374151" : "#9ca3af", cursor: "pointer" }}
                        >
                          <span>{newAccountData.parentAccount || "Select an account"}</span>
                          {parentAccountDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {parentAccountDropdownOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)", zIndex: 20, maxHeight: "280px", overflow: "hidden" }}>
                            <div style={{ padding: "10px" }}>
                              <div style={{ position: "relative" }}>
                                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                                <input
                                  value={parentAccountSearch}
                                  onChange={(e) => setParentAccountSearch(e.target.value)}
                                  placeholder="Search"
                                  style={{ width: "100%", height: "34px", border: "1px solid #3b82f6", borderRadius: "7px", padding: "0 10px 0 30px", outline: "none", fontSize: "13px" }}
                                />
                              </div>
                            </div>
                            <div style={{ maxHeight: "220px", overflowY: "auto", paddingBottom: "8px" }}>
                              {filteredParentAccounts.length > 0 ? filteredParentAccounts.map((account: any) => (
                                <div
                                  key={account.id || account._id || account.name}
                                  onClick={() => {
                                    setNewAccountData((prev) => ({ ...prev, parentAccount: account.name }));
                                    setParentAccountDropdownOpen(false);
                                    setParentAccountSearch("");
                                  }}
                                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: "14px", backgroundColor: newAccountData.parentAccount === account.name ? "#3b82f6" : "#fff", color: newAccountData.parentAccount === account.name ? "#fff" : "#374151", fontWeight: newAccountData.parentAccount === account.name ? 600 : 400 }}
                                >
                                  {account.name}
                                </div>
                              )) : (
                                <div style={{ padding: "10px 14px", fontSize: "13px", color: "#9ca3af" }}>No matching accounts found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <label style={{ color: "#ef4444", fontSize: "14px", lineHeight: "40px" }}>Account Code*</label>
                  <input
                    value={newAccountData.accountCode}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, accountCode: e.target.value }))}
                    style={{ width: "180px", height: "34px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0 12px", fontSize: "14px", outline: "none" }}
                  />

                  <label style={{ color: "#4b5563", fontSize: "14px", lineHeight: "24px" }}>Create Item as Fixed Asset</label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", color: "#4b5563", cursor: "pointer", paddingTop: "2px" }}>
                    <input
                      type="checkbox"
                      checked={newAccountData.createItemAsFixedAsset}
                      onChange={(e) => setNewAccountData((prev) => ({ ...prev, createItemAsFixedAsset: e.target.checked }))}
                    />
                    When this account is associated with a line item in a transaction, create the item as a fixed asset.
                  </label>

                  {newAccountData.accountType === "Fixed Asset" && newAccountData.createItemAsFixedAsset && (
                    <>
                      <label style={{ color: "#ef4444", fontSize: "14px", lineHeight: "40px" }}>Fixed Asset Type*</label>
                      <div style={{ position: "relative" }} ref={fixedAssetTypeDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setFixedAssetTypeDropdownOpen((prev) => !prev)}
                          style={{ width: "100%", height: "40px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", color: newAccountData.fixedAssetType ? "#374151" : "#9ca3af", cursor: "pointer" }}
                        >
                          <span>{newAccountData.fixedAssetType || "Select the Fixed Asset Type"}</span>
                          {fixedAssetTypeDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {fixedAssetTypeDropdownOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)", zIndex: 20, maxHeight: "260px", overflow: "hidden" }}>
                            <div style={{ padding: "10px" }}>
                              <div style={{ position: "relative" }}>
                                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                                <input
                                  value={fixedAssetTypeSearch}
                                  onChange={(e) => setFixedAssetTypeSearch(e.target.value)}
                                  placeholder="Search"
                                  style={{ width: "100%", height: "34px", border: "1px solid #3b82f6", borderRadius: "7px", padding: "0 10px 0 30px", outline: "none", fontSize: "13px" }}
                                />
                              </div>
                            </div>
                            <div style={{ maxHeight: "200px", overflowY: "auto", paddingBottom: "8px" }}>
                              <div style={{ padding: "0 14px 6px", fontSize: "14px", fontWeight: 600, color: "#4b5563" }}>Asset</div>
                              {filteredFixedAssetTypeOptions.length > 0 ? filteredFixedAssetTypeOptions.map((type) => (
                                <div
                                  key={type}
                                  onClick={() => {
                                    setNewAccountData((prev) => ({ ...prev, fixedAssetType: type }));
                                    setFixedAssetTypeDropdownOpen(false);
                                    setFixedAssetTypeSearch("");
                                  }}
                                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: "14px", backgroundColor: newAccountData.fixedAssetType === type ? "#3b82f6" : "#fff", color: newAccountData.fixedAssetType === type ? "#fff" : "#374151", fontWeight: newAccountData.fixedAssetType === type ? 600 : 400 }}
                                >
                                  {type}
                                </div>
                              )) : (
                                <div style={{ padding: "10px 14px", fontSize: "13px", color: "#9ca3af" }}>No results found</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <label style={{ color: "#4b5563", fontSize: "14px", lineHeight: "40px" }}>Description</label>
                  <textarea
                    value={newAccountData.description}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, description: e.target.value }))}
                    maxLength={500}
                    placeholder="Max. 500 characters"
                    style={{ width: "100%", minHeight: "72px", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ background: "#1f2743", color: "#fff", padding: "20px", fontSize: "14px" }}>
                <div style={{ fontWeight: 700, marginBottom: "10px" }}>{newAccountData.accountType || "Account"}</div>
                {newAccountData.accountType === "Asset" || newAccountData.accountType === "Fixed Asset" ? (
                  <div style={{ lineHeight: 1.6 }}>
                    <div>Any long term investment or an asset that cannot be converted into cash easily like:</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                      <li>Land and Buildings</li>
                      <li>Plant, Machinery and Equipment</li>
                      <li>Computers</li>
                      <li>Furniture</li>
                    </ul>
                  </div>
                ) : (
                  <div style={{ lineHeight: 1.6 }}>Select an account type to see more information.</div>
                )}
              </div>
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleCreateAccount}
                style={{ padding: "10px 16px", border: "none", borderRadius: "8px", background: "#10b981", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                Save and Select
              </button>
              <button
                type="button"
                onClick={resetNewAccountModal}
                style={{ padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", color: "#374151", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showBulkItemsModal && (
        <BulkItemsModal
          show={showBulkItemsModal}
          onClose={() => setShowBulkItemsModal(false)}
          items={items}
          selectedItems={selectedBulkItems}
          onToggleSelect={handleBulkItemSelect}
          onQuantityChange={handleBulkQuantityChange}
          quantities={bulkItemQuantities}
          onAdd={handleAddBulkItems}
          styles={styles}
          bulkItemsSearch={bulkItemsSearch}
          setBulkItemsSearch={setBulkItemsSearch}
          filteredBulkItems={filteredBulkItems}
        />
      )}
      {showNewVendorModal && (
        <NewVendorModal
          isOpen={showNewVendorModal}
          onClose={() => setShowNewVendorModal(false)}
          onCreated={handleVendorCreated}
        />
      )}

      {/* Numbering Preferences Modal */}
      {showNumberingModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 4000
        }}>
          <div style={{
            backgroundColor: "white",
            width: "550px",
            borderRadius: "8px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                Configure Vendor Credit Number Preferences
              </h3>
              <X 
                size={20} 
                style={{ cursor: "pointer", color: "#ef4444" }} 
                onClick={() => setShowNumberingModal(false)}
              />
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "4px" }}>Location</div>
                <div style={{ fontSize: "14px", color: "#111827" }}>Head Office</div>
                <div style={{ height: "1px", backgroundColor: "#f3f4f6", marginTop: "12px" }}></div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "20px" }}>
                  {numberingPrefs.mode === "auto" 
                    ? "Your Vendor Credits numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?"
                    : "You have selected manual Vendor Credits numbering. Do you want us to auto-generate it for you?"
                  }
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="numberingMode" 
                      checked={numberingPrefs.mode === "auto"}
                      onChange={() => setNumberingPrefs({ ...numberingPrefs, mode: "auto" })}
                      style={{ marginTop: "3px" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <span style={{ fontSize: "14px", color: "#111827" }}>
                        Continue auto-generating Vendor Credits numbers <Info size={14} style={{ display: "inline", color: "#9ca3af", marginLeft: "4px" }} />
                      </span>
                      
                      {numberingPrefs.mode === "auto" && (
                        <div style={{ display: "flex", gap: "16px", marginLeft: "4px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Prefix</div>
                            <input 
                              type="text" 
                              className="zoho-input"
                              style={{ ...styles.input, height: "36px" }}
                              value={numberingPrefs.prefix}
                              onChange={(e) => setNumberingPrefs({ ...numberingPrefs, prefix: e.target.value })}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Next Number</div>
                            <input 
                              type="text" 
                              className="zoho-input"
                              style={{ ...styles.input, height: "36px" }}
                              value={numberingPrefs.nextNumber}
                              onChange={(e) => setNumberingPrefs({ ...numberingPrefs, nextNumber: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {numberingPrefs.mode === "auto" && (
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={numberingPrefs.restartYearly}
                            onChange={(e) => setNumberingPrefs({ ...numberingPrefs, restartYearly: e.target.checked })}
                          />
                          <span style={{ fontSize: "13px", color: "#4b5563" }}>Restart numbering for vendor credits at the start of each fiscal year.</span>
                        </label>
                      )}
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="numberingMode" 
                      checked={numberingPrefs.mode === "manual"}
                      onChange={() => setNumberingPrefs({ ...numberingPrefs, mode: "manual" })}
                    />
                    <span style={{ fontSize: "14px", color: "#111827" }}>Enter Vendor Credits numbers manually</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "12px", backgroundColor: "#f9fafb" }}>
              <button 
                style={{
                  padding: "8px 24px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
                onClick={() => {
                  if (numberingPrefs.mode === "auto") {
                    setFormData({ ...formData, creditNote: `${numberingPrefs.prefix}${numberingPrefs.nextNumber}` });
                    if (errors.creditNote) setErrors({ ...errors, creditNote: false });
                  }
                  setShowNumberingModal(false);
                  toast.success("Preferences saved successfully");
                }}
              >
                Save
              </button>
              <button 
                style={{
                  padding: "8px 24px",
                  backgroundColor: "white",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
                onClick={() => setShowNumberingModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const NewItemModal = ({ show, onClose, data, onChange, onSave, taxes, vendors, styles }: any) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={onClose}>
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", padding: "24px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>New Item</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ gridColumn: "span 1" }}>
            <label style={styles.label}>Name*</label>
            <input style={styles.input} value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} />
          </div>
          <div style={{ gridColumn: "span 1" }}>
            <label style={styles.label}>SKU</label>
            <input style={styles.input} value={data.sku} onChange={e => onChange({ ...data, sku: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Type</label>
            <select style={styles.input} value={data.type} onChange={e => onChange({ ...data, type: e.target.value })}>
              <option value="Goods">Goods</option>
              <option value="Service">Service</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Unit</label>
            <input style={styles.input} value={data.unit} onChange={e => onChange({ ...data, unit: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Initial Stock</label>
            <input style={styles.input} type="number" value={data.initialStock} onChange={e => onChange({ ...data, initialStock: e.target.value })} />
          </div>
          <div style={{ gridColumn: "span 2", paddingTop: "10px", borderTop: "1px solid #eee" }}>
            <h3 style={{ fontSize: "16px", margin: "0 0 16px 0" }}>Sales Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={styles.label}>Selling Price*</label>
                <input style={styles.input} type="number" value={data.sellingPrice} onChange={e => onChange({ ...data, sellingPrice: e.target.value })} />
              </div>
              <div>
                <label style={styles.label}>Account*</label>
                <input style={styles.input} value={data.salesAccount} onChange={e => onChange({ ...data, salesAccount: e.target.value })} />
              </div>
            </div>
          </div>
          <div style={{ gridColumn: "span 2", paddingTop: "10px", borderTop: "1px solid #eee" }}>
            <h3 style={{ fontSize: "16px", margin: "0 0 16px 0" }}>Purchase Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={styles.label}>Cost Price*</label>
                <input style={styles.input} type="number" value={data.costPrice} onChange={e => onChange({ ...data, costPrice: e.target.value })} />
              </div>
              <div>
                <label style={styles.label}>Account*</label>
                <input style={styles.input} value={data.purchaseAccount} onChange={e => onChange({ ...data, purchaseAccount: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
          <button style={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button style={styles.primaryButton} onClick={onSave} disabled={!data.name}>Save</button>
        </div>
      </div>
    </div>
  );
};

const BulkItemsModal = ({ show, onClose, items, selectedItems, onToggleSelect, onQuantityChange, quantities, onAdd, styles, bulkItemsSearch, setBulkItemsSearch, filteredBulkItems }: any) => {
  if (!show) return null;

  const totalSelectedQty = Object.values(quantities).reduce((acc: number, qty: any) => acc + (parseFloat(String(qty)) || 0), 0);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "95%", maxWidth: "1100px", height: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={styles.bulkModalHeader}>
          <h2 style={styles.bulkModalTitle}>Add Items in Bulk</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.bulkModalContent}>
          {/* Left Side: Item Selection */}
          <div style={styles.bulkModalLeft}>
            <div style={{ padding: "20px" }}>
              <div style={{ position: "relative" }}>
                <input 
                  style={{ ...styles.input, width: "100%", height: "42px", padding: "0 16px", fontSize: "14px", borderColor: "#3b82f6" }} 
                  placeholder="Type to search or scan the barcode of the item" 
                  value={bulkItemsSearch} 
                  onChange={e => setBulkItemsSearch(e.target.value)} 
                  autoFocus
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredBulkItems.map((item: any) => {
                const isSelected = selectedItems.some((i: any) => i.id === item.id || i._id === item._id);
                return (
                  <div 
                    key={item.id || item._id} 
                    onClick={() => onToggleSelect(item)} 
                    style={{ 
                      ...styles.bulkItemRow,
                      backgroundColor: isSelected ? "#f0f7ff" : "#fff",
                    }}
                  >
                    <div>
                      <div style={styles.bulkItemName}>{item.name}</div>
                      <div style={styles.bulkItemSku}>
                        SKU: {item.sku || "N/A"} | Purchase Rate: KES{item.costPrice || "0.00"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Stock on Hand</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                         <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>{item.stockQuantity || "0.00"} {item.unit || "pcs"}</span>
                         {isSelected ? (
                           <CheckCircle size={20} color="#10b981" />
                         ) : (
                           <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #d1d5db", backgroundColor: "#fff" }} />
                         )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Selected Items List */}
          <div style={styles.bulkModalRight}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px", fontWeight: "600", color: "#111827" }}>Selected Items</span>
                <span style={{ backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: "12px", padding: "2px 10px", fontSize: "14px", fontWeight: "500" }}>{selectedItems.length}</span>
              </div>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>Total Quantity: {totalSelectedQty}</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
              {selectedItems.map((item: any) => (
                <div key={item.id || item._id} style={{ padding: "12px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>[{item.sku || "N/A"}] {item.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={styles.bulkQuantityControl}>
                      <button 
                        style={styles.bulkQuantityBtn} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentQty = parseFloat(String(quantities[item.id || item._id] || 1));
                          if (currentQty > 1) onQuantityChange(item.id || item._id, currentQty - 1);
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        style={{ border: "none", width: "40px", textAlign: "center", fontSize: "14px", fontWeight: "600", outline: "none" }} 
                        type="text" 
                        value={quantities[item.id || item._id] || 1} 
                        onChange={e => onQuantityChange(item.id || item._id, e.target.value)} 
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button 
                        style={styles.bulkQuantityBtn} 
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentQty = parseFloat(String(quantities[item.id || item._id] || 1));
                          onQuantityChange(item.id || item._id, currentQty + 1);
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <X 
                      size={18} 
                      style={{ color: "#ef4444", cursor: "pointer" }} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(item);
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "12px", backgroundColor: "#fff" }}>
          <button 
            onClick={onAdd} 
            style={{ 
              padding: "10px 24px", 
              backgroundColor: "#10b981", 
              color: "#ffffff", 
              border: "none", 
              borderRadius: "6px", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            disabled={selectedItems.length === 0}
          >
            Add Items
          </button>
          <button 
            onClick={onClose} 
            style={{ 
              padding: "10px 24px", 
              backgroundColor: "#ffffff", 
              color: "#374151", 
              border: "1px solid #d1d5db", 
              borderRadius: "6px", 
              fontSize: "14px", 
              fontWeight: "600", 
              cursor: "pointer" 
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
