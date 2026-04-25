import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  Edit3,
  Upload as UploadIcon,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Info,
  ShoppingBag,
  Pencil,
  AlertTriangle,
  FileText,
  Settings,
  Clock,
  RotateCw,
  Image as ImageIcon,
  MoreVertical,
  GripVertical,
  Check,
  CheckCircle,
  PlusCircle,
  Grid3x3,
  Mountain,
  Briefcase,
  Tag,
  Lock,
  User,
  Copy,
  // PlusCircle,
} from "lucide-react";
import { vendorsAPI, itemsAPI, taxesAPI, accountantAPI, vendorCreditsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import toast from "react-hot-toast";
import NewVendorModal from "../../../components/modals/NewVendorModal";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { filterActiveRecords } from "../shared/activeFilters";

export default function NewVendorCredit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeCreditId } = useParams();
  const { editCredit: stateEditCredit, isEdit: stateIsEdit } = location.state || {};
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
  const [discountDropdownOpen, setDiscountDropdownOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [billingAddressEditMode, setBillingAddressEditMode] = useState(false);

  const [itemRows, setItemRows] = useState([
    {
      itemDetails: "",
      account: "",
      quantity: 1.0,
      rate: 0.0,
      discount: "0 %-",
      tax: "",
      amount: 0.0,
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
    },
  ]);
  const [exchangeRateEditMode, setExchangeRateEditMode] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1.30077230885);
  const [showItemWarning, setShowItemWarning] = useState(false);

  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);

  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);
  const [allVendors, setAllVendors] = useState<any[]>([]);

  // const [accountDropdownOpen, setAccountDropdownOpen] = useState<{ [key: string]: boolean }>({});
  // const [taxDropdownOpen, setTaxDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [accountsPayableOpen, setAccountsPayableOpen] = useState(false);
  const [taxExclusiveOpen, setTaxExclusiveOpen] = useState(false);
  const [taxLevelOpen, setTaxLevelOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [addNewRowDropdownOpen, setAddNewRowDropdownOpen] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [taxExclusiveSearch, setTaxExclusiveSearch] = useState("");
  const [taxLevelSearch, setTaxLevelSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [rowMenuOpen, setRowMenuOpen] = useState<{ [key: string]: boolean }>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [itemDropdownOpen, setItemDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [accountSearch, setAccountSearch] = useState<{ [key: string]: string }>({});
  const [taxSearch, setTaxSearch] = useState<{ [key: string]: string }>({});
  const [itemSearch, setItemSearch] = useState<{ [key: string]: string }>({});
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showBulkItemsModal, setShowBulkItemsModal] = useState(false);
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
  const itemRefs = useRef({});
  const rowMenuRefs = useRef({});

  const vendorRef = useRef(null);
  const currencyRef = useRef(null);
  const accountsPayableRef = useRef(null);
  const taxExclusiveRef = useRef(null);
  const taxLevelRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const bulkActionsRef = useRef(null);
  const addNewRowRef = useRef(null);

  // Load vendors from localStorage
  const [taxes, setTaxes] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [apSearchTerm, setApSearchTerm] = useState("");
  const discountMode = enabledSettings?.discountSettings?.discountType ?? "transaction";
  const showTransactionDiscount = discountMode === "transaction";
  const showAdjustment = enabledSettings?.chargeSettings?.adjustments !== false;
  const taxMode = enabledSettings?.taxSettings?.taxInclusive ?? "both";
  const lockTaxPreference = taxMode === "inclusive" || taxMode === "exclusive";
  const taxPreferenceOptions = taxMode === "exclusive"
    ? ["Tax Exclusive"]
    : taxMode === "inclusive"
      ? ["Tax Inclusive"]
      : ["Tax Exclusive", "Tax Inclusive", "Out of Scope"];

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close account dropdowns
      setAccountDropdownOpen({});
      // Close tax dropdowns
      setTaxDropdownOpen({});
      // Close item dropdowns
      setItemDropdownOpen({});
      // Close AP dropdown
      setAccountsPayableOpen(false);
      // Close Discount dropdown
      setDiscountDropdownOpen(false);
      // Close New Vendor dropdown
      setVendorDropdownOpen(false);
      // Close Tax Preference dropdown
      setTaxExclusiveOpen(false);
      // Close Discount Level dropdown
      setTaxLevelOpen(false);
    };

    // Use 'click' instead of 'mousedown' to allow component onClick handlers to fire first
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
      if (vendorRef.current && !vendorRef.current.contains(event.target)) {
        setVendorDropdownOpen(false);
      }
      if (accountsPayableRef.current && !accountsPayableRef.current.contains(event.target)) {
        setAccountsPayableOpen(false);
      }
      if (taxExclusiveRef.current && !taxExclusiveRef.current.contains(event.target)) {
        setTaxExclusiveOpen(false);
      }
      if (taxLevelRef.current && !taxLevelRef.current.contains(event.target)) {
        setTaxLevelOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        setUploadMenuOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target)) {
        setCurrencyDropdownOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target)) {
        setBulkActionsOpen(false);
      }
      if (addNewRowRef.current && !addNewRowRef.current.contains(event.target)) {
        setAddNewRowDropdownOpen(false);
      }
      // Close item dropdowns
      Object.keys(itemDropdownOpen).forEach((index) => {
        if (itemRefs.current[index] && !itemRefs.current[index].contains(event.target)) {
          setItemDropdownOpen((prev) => ({ ...prev, [index]: false }));
          setItemSearch((prev) => ({ ...prev, [index]: "" }));
        }
      });
      // Close row menus
      Object.keys(rowMenuOpen).forEach((index) => {
        if (rowMenuOpen[index] && rowMenuRefs.current[index] && !rowMenuRefs.current[index].contains(event.target)) {
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

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...itemRows];
    newItems[index][field] = value;

    // Calculate amount
    if (field === "quantity" || field === "rate" || field === "discount") {
      const quantity = parseFloat(newItems[index].quantity || 0);
      const rate = parseFloat(newItems[index].rate || 0);
      const discountMatch = (newItems[index].discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
      const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
      const subtotal = quantity * rate;
      const discountAmount = (subtotal * discountPercent) / 100;
      newItems[index].amount = subtotal - discountAmount;
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
    // Default account to "Cost of Goods Sold" as requested by user
    newItems[index].account = "Cost of Goods Sold";
    // Set rate from item if available
    if (item.costPrice) {
      newItems[index].rate = item.costPrice;
      // Recalculate amount
      const quantity = parseFloat(newItems[index].quantity || 0);
      const rate = parseFloat(item.costPrice || 0);
      const discountMatch = (newItems[index].discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
      const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
      const subtotal = quantity * rate;
      const discountAmount = (subtotal * discountPercent) / 100;
      newItems[index].amount = subtotal - discountAmount;
    }
    setItemRows(newItems);
    setItemDropdownOpen((prev) => ({ ...prev, [index]: false }));
    setItemSearch((prev) => ({ ...prev, [index]: "" }));
  };

  const filteredItems = (index) => {
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
      quantity: 1.0,
      rate: 0.0,
      discount: "0 %-",
      tax: "",
      amount: 0.0,
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
    }]);
  };

  const removeRow = (index) => {
    if (itemRows.length > 1) {
      setItemRows(itemRows.filter((_, i) => i !== index));
    }
  };

  const cloneRow = (index: number) => {
    const rowToClone = itemRows[index];
    const newRow = {
      ...rowToClone,
      itemDetails: "",
      amount: 0.0,
    };
    const newRows = [...itemRows];
    newRows.splice(index + 1, 0, newRow);
    setItemRows(newRows);
    setRowMenuOpen((prev) => ({ ...prev, [index]: false }));
  };

  const insertNewRow = (index: number) => {
    const newRow = {
      itemDetails: "",
      account: "",
      quantity: 1.0,
      rate: 0.0,
      discount: "0 %-",
      tax: "",
      amount: 0.0,
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
    };
    const newRows = [...itemRows];
    newRows.splice(index + 1, 0, newRow);
    setItemRows(newRows);
    setRowMenuOpen((prev) => ({ ...prev, [index]: false }));
  };

  const insertItemsInBulk = (index: number) => {
    setBulkItemsInsertIndex(index);
    setShowBulkItemsModal(true);
    setBulkItemsSearch("");
    setSelectedBulkItems([]);
    setBulkItemQuantities({});
    setRowMenuOpen((prev) => ({ ...prev, [index]: false }));
  };

  const handleBulkItemSelect = (item) => {
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

  const handleBulkQuantityChange = (itemId, quantity) => {
    setBulkItemQuantities({ ...bulkItemQuantities, [itemId]: parseFloat(quantity) || 1 });
  };

  const handleAddBulkItems = () => {
    const newRows = selectedBulkItems.map(item => ({
      itemDetails: item.name,
      account: item.purchaseAccount || "Cost of Goods Sold",
      quantity: bulkItemQuantities[item.id] || 1,
      rate: parseFloat(item.costPrice) || 0.0,
      discount: "0 %-",
      tax: item.purchaseTax || "",
      amount: (bulkItemQuantities[item.id] || 1) * (parseFloat(item.costPrice) || 0.0),
      purchaseDiscount: "",
      project: "",
      reportingTag: "",
    }));
    const currentRows = [...itemRows];
    currentRows.splice(bulkItemsInsertIndex + 1, 0, ...newRows);
    setItemRows(currentRows);
    setShowBulkItemsModal(false);
    setSelectedBulkItems([]);
    setBulkItemQuantities({});
    setBulkItemsSearch("");
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
      sellingPrice: parseFloat(newItemData.sellingPrice || 0),
      salesAccount: newItemData.salesAccount,
      salesDescription: newItemData.salesDescription,
      salesTax: newItemData.salesTax,
      purchasable: newItemData.purchasable,
      costPrice: parseFloat(newItemData.costPrice || 0),
      purchaseAccount: newItemData.purchaseAccount,
      purchaseDescription: newItemData.purchaseDescription,
      purchaseTax: newItemData.purchaseTax,
      preferredVendor: newItemData.preferredVendor,
      sku: newItemData.sku,
      stockOnHand: parseFloat(newItemData.initialStock || 0),
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
    return itemRows.reduce((sum, item) => sum + (item.amount || 0), 0);
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
          const subtotal = parseFloat(item.quantity || 0) * parseFloat(item.rate || 0);
          taxTotal += (subtotal * taxPercent) / (100 + taxPercent);
        } else {
          taxTotal += ((item.amount || 0) * taxPercent) / 100;
        }
      }
    });
    return taxTotal;
  };

  const calculateDiscountAmount = () => {
    if (!showTransactionDiscount) return 0;
    const subTotal = calculateSubTotal();
    const discountValue = parseFloat(formData.discount as any || 0);
    if (formData.discountType === "%") {
      return (subTotal * discountValue) / 100;
    }
    return discountValue;
  };

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    const adjustment = showAdjustment ? (parseFloat(formData.adjustment as any || 0) || 0) : 0;
    return subTotal - discountAmount + taxAmount + adjustment;
  };

  const handleSave = async (status) => {
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
      const validItems = itemRows.filter(row => row.itemDetails && row.quantity > 0);
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

  const styles = {
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
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      overflow: "visible",
    },
    tableHeaderRow: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "8px 12px",
      fontSize: "11px",
      fontWeight: "500",
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      textAlign: "left",
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
      padding: "8px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    fieldGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    saveDraftButton: {
      padding: "8px 16px",
      backgroundColor: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    saveOpenButton: {
      padding: "8px 16px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    footerButton: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "4px",
      cursor: "pointer",
    },
    cancelButton: {
      padding: "8px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
    },
    itemDetailsContainer: {
      position: "relative",
      flex: 1,
    },
    itemDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 1000,
      maxHeight: "300px",
      overflowY: "auto",
      marginTop: "4px",
    },
    itemDropdownRow: {
      padding: "10px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #f3f4f6",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      transition: "background-color 0.2s",
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
      color: "#156372",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <div style={styles.container}>
        <style>
          {`
            .zoho-input:focus {
              border-color: #3b82f6 !important;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
              outline: none !important;
            }
            .zoho-input-error {
              border-color: #ef4444 !important;
            }
            .zoho-input-error:focus {
              box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
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
              <div style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
                <div style={{ flex: 1, position: "relative" }} ref={(el) => { vendorRef.current = el; }}>
                  <div
                    className={`zoho-input ${errors.vendorName ? "zoho-input-error" : ""}`}
                    style={{ 
                      ...styles.select, 
                      borderTopRightRadius: 0, 
                      borderBottomRightRadius: 0, 
                      height: "100%", 
                      display: "flex", 
                      alignItems: "center",
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
                    <ChevronDown size={16} style={{ color: "#6b7280", marginLeft: "auto" }} />
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
                      <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
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
                            placeholder="Search"
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>

                      <div style={{ overflowY: "auto", flex: 1 }}>
                        {vendors
                          .filter(v =>
                            (v.name?.toLowerCase().includes(vendorSearch.toLowerCase())) ||
                            (v.email?.toLowerCase().includes(vendorSearch.toLowerCase())) ||
                            (v.displayName?.toLowerCase().includes(vendorSearch.toLowerCase()))
                          )
                          .map(vendor => (
                            <div
                              key={vendor.id}
                              style={{
                                padding: "10px 12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                backgroundColor: formData.vendorName === (vendor.displayName || vendor.name) ? "#eff6ff" : "white",
                                borderBottom: "1px solid #f9fafb"
                              }}
                              onClick={() => handleVendorSelect(vendor)}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = formData.vendorName === (vendor.displayName || vendor.name) ? "#eff6ff" : "#f9fafb")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = formData.vendorName === (vendor.displayName || vendor.name) ? "#eff6ff" : "white")}
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
                                <span style={{ fontSize: "13px", fontWeight: "500", color: "#1f2937" }}>
                                  {vendor.displayName || vendor.name}
                                </span>
                                {vendor.email && (
                                  <span style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <FileText size={10} /> {vendor.email} | <Copy size={10} /> {vendor.displayName || vendor.name}
                                  </span>
                                )}
                              </div>
                              {formData.vendorName === (vendor.displayName || vendor.name) && (
                                <Check size={14} style={{ marginLeft: "auto", color: "#156372" }} />
                              )}
                            </div>
                          ))}
                      </div>

                      <div
                        style={{
                          padding: "12px",
                          borderTop: "1px solid #f3f4f6",
                          color: "#156372",
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
                        <PlusCircle size={16} /> New Vendor
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
              </div>
            </div>

            {/* Location */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Location</label>
              <div style={{ flex: 1, maxWidth: "450px" }}>
                <select 
                  className="zoho-input"
                  style={styles.input}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="Head Office">Head Office</option>
                </select>
              </div>
            </div>

            {/* Credit Note# */}
            <div style={styles.fieldRow}>
              <label style={{ ...styles.label, color: "#ef4444" }}>Credit Note#*</label>
              <div style={{ flex: 1, maxWidth: "450px", display: "flex", alignItems: "center", position: "relative" }}>
                <input
                  type="text"
                  className={`zoho-input ${errors.creditNote ? "zoho-input-error" : ""}`}
                  style={{ ...styles.input, borderColor: errors.creditNote ? "#ef4444" : "#d1d5db" }}
                  value={formData.creditNote}
                  onChange={(e) => {
                    setFormData({ ...formData, creditNote: e.target.value });
                    if (errors.creditNote) setErrors({ ...errors, creditNote: false });
                  }}
                />
                <Settings size={14} style={{ position: "absolute", right: "12px", color: "#156372", cursor: "pointer" }} />
              </div>
            </div>

            {/* Order Number */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Order Number</label>
              <div style={{ flex: 1, maxWidth: "450px" }}>
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
              <div style={{ flex: 1, maxWidth: "450px" }}>
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
              <div style={{ flex: 1, maxWidth: "450px" }}>
                <textarea
                  className="zoho-input"
                  style={{ ...styles.textarea, minHeight: "36px" }}
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
              <div style={{ flex: 1, maxWidth: "450px", position: "relative" }} ref={(el) => { accountsPayableRef.current = el; }}>
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
                  <ChevronDown size={16} style={{ color: "#6b7280" }} />
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
                              cursor: "pointer",
                              backgroundColor: formData.accountsPayable === acc.name ? "#eff6ff" : "white",
                              color: formData.accountsPayable === acc.name ? "#156372" : "#374151",
                              transition: "background-color 0.2s"
                            }}
                            onClick={() => {
                              setFormData({ ...formData, accountsPayable: acc.name });
                              setAccountsPayableOpen(false);
                              setApSearchTerm("");
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = formData.accountsPayable === acc.name ? "#eff6ff" : "#f3f4f6")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = formData.accountsPayable === acc.name ? "#eff6ff" : "white")}
                          >
                            {acc.name}
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
          </div>

          {/* Item Table Selection */}
          <div style={{ display: "flex", gap: "32px", marginBottom: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <span style={{ color: "#6b7280" }}>Warehouse Location</span>
              <select 
                style={{ ...styles.input, width: "auto", border: "none", color: "#156372", fontWeight: "600", padding: "0 4px" }}
                value={formData.warehouseLocation}
                onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
              >
                <option value="Head Office">Head Office</option>
              </select>
            </div>

            <div style={{ position: "relative" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151", cursor: "pointer" }}
                onClick={(e) => {
                  if (lockTaxPreference) return;
                  e.stopPropagation();
                  setTaxExclusiveOpen(!taxExclusiveOpen);
                }}
              >
                <ShoppingBag size={14} />
                {formData.taxExclusive}
                <ChevronDown size={14} style={{ transform: taxExclusiveOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </div>
              {taxExclusiveOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  marginTop: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  width: "220px",
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ position: "relative" }}>
                      <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input
                        style={{
                          width: "100%",
                          padding: "6px 8px 6px 30px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "12px",
                          outline: "none"
                        }}
                        placeholder="Search"
                        value={taxExclusiveSearch}
                        onChange={(e) => setTaxExclusiveSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ padding: "8px 12px", fontSize: "11px", fontWeight: "600", color: "#6b7280", background: "#f9fafb" }}>Item Tax Preference</div>
                  {taxPreferenceOptions
                    .filter(opt => opt.toLowerCase().includes(taxExclusiveSearch.toLowerCase()))
                    .map(opt => (
                      <div
                        key={opt}
                        style={{
                          padding: "10px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: formData.taxExclusive === opt ? "#eff6ff" : "white",
                          color: formData.taxExclusive === opt ? "#156372" : "#374151"
                        }}
                        onClick={() => {
                          if (lockTaxPreference) return;
                          setFormData({ ...formData, taxExclusive: opt });
                          setTaxExclusiveOpen(false);
                        }}
                      >
                        {opt}
                        {formData.taxExclusive === opt && <Check size={14} />}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151", cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setTaxLevelOpen(!taxLevelOpen); }}
              >
                <RotateCw size={14} />
                {formData.taxLevel}
                <ChevronDown size={14} style={{ transform: taxLevelOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </div>
              {taxLevelOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  marginTop: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  width: "220px",
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ position: "relative" }}>
                      <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input
                        style={{
                          width: "100%",
                          padding: "6px 8px 6px 30px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "12px",
                          outline: "none"
                        }}
                        placeholder="Search"
                        value={taxLevelSearch}
                        onChange={(e) => setTaxLevelSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ padding: "8px 12px", fontSize: "11px", fontWeight: "600", color: "#6b7280", background: "#f9fafb" }}>Discount Type</div>
                  {["At Transaction Level", "At Line Item Level"]
                    .filter(opt => opt.toLowerCase().includes(taxLevelSearch.toLowerCase()))
                    .map(opt => (
                      <div
                        key={opt}
                        style={{
                          padding: "10px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: formData.taxLevel === opt ? "#eff6ff" : "white",
                          color: formData.taxLevel === opt ? "#156372" : "#374151"
                        }}
                        onClick={() => {
                          setFormData({ ...formData, taxLevel: opt });
                          setTaxLevelOpen(false);
                        }}
                      >
                        {opt}
                        {formData.taxLevel === opt && <Check size={14} />}
                      </div>
                    ))}
                </div>
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
                  <th style={{ ...styles.tableHeaderCell, width: "35%" }}>Item Details</th>
                  <th style={{ ...styles.tableHeaderCell, width: "15%" }}>Account</th>
                  <th style={{ ...styles.tableHeaderCell, width: "10%", textAlign: "right" }}>Quantity</th>
                  <th style={{ ...styles.tableHeaderCell, width: "15%", textAlign: "right" }}>Rate <Grid3x3 size={12} style={{ display: "inline", marginLeft: "4px" }} /></th>
                  <th style={{ ...styles.tableHeaderCell, width: "10%" }}>Tax</th>
                  <th style={{ ...styles.tableHeaderCell, width: "15%", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={styles.tableCell}>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <GripVertical size={16} style={{ color: "#d1d5db", marginTop: "4px" }} />
                        <div style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ImageIcon size={16} color="#d1d5db" />
                        </div>
                        <div style={styles.itemDetailsContainer} ref={(el) => { itemRefs.current[index] = el; }}>
                          <input
                            style={{ ...styles.input, border: "none", padding: "0", fontSize: "13px", color: "#156372", fontWeight: "500" }}
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
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                                  >
                                    <div style={styles.itemDropdownInfo}>
                                      <div style={styles.itemDropdownName}>{shopItem.name}</div>
                                      <div style={styles.itemDropdownSubtext}>
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
                                <Plus size={16} /> Add New Item
                              </button>
                            </div>
                          )}
                          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                            {item.sku ? `SKU: ${item.sku}` : ""}
                          </div>
                          <div
                            style={{ color: "#156372", fontSize: "12px", marginTop: "8px", cursor: "pointer" }}
                            onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                          >
                            Add a description to your item
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ position: "relative" }}>
                        <div
                          style={{
                            ...styles.input,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            fontSize: "13px"
                          }}
                          onClick={(e) => { e.stopPropagation(); setAccountDropdownOpen(prev => ({ ...prev, [index]: !prev[index] })); }}
                        >
                          <span style={{ color: item.account ? "#374151" : "#9ca3af" }}>
                            {item.account || "Select an account"}
                          </span>
                          <ChevronDown size={14} style={{ color: "#6b7280" }} />
                        </div>
                        {accountDropdownOpen[index] && (
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
                          }}>
                            <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
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
                                  value={accountSearch[index] || ""}
                                  onChange={(e) => setAccountSearch(prev => ({ ...prev, [index]: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div style={{ padding: "4px 0" }}>
                              {Object.entries(
                                (accounts || []).reduce((acc: any, curr: any) => {
                                  const type = curr.type || "Other";
                                  if (!acc[type]) acc[type] = [];
                                  acc[type].push(curr);
                                  return acc;
                                }, {})
                              ).map(([type, typeAccounts]: [string, any]) => {
                                const filtered = typeAccounts.filter((acc: any) =>
                                  acc.name.toLowerCase().includes((accountSearch[index] || "").toLowerCase())
                                );
                                if (filtered.length === 0) return null;
                                return (
                                  <div key={type}>
                                    <div style={{ padding: "8px 12px", fontSize: "11px", fontWeight: "600", color: "#6b7280", background: "#f9fafb", textTransform: "uppercase", letterSpacing: "0.5px" }}>{type}</div>
                                    {filtered.map((acc: any) => (
                                      <div
                                        key={acc.id || acc._id}
                                        style={{
                                          padding: "10px 16px",
                                          fontSize: "13px",
                                          cursor: "pointer",
                                          backgroundColor: item.account === acc.name ? "#eff6ff" : "white",
                                          color: item.account === acc.name ? "#156372" : "#374151",
                                          transition: "background-color 0.2s"
                                        }}
                                        onClick={() => {
                                          handleItemChange(index, "account", acc.name);
                                          setAccountDropdownOpen(prev => ({ ...prev, [index]: false }));
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.account === acc.name ? "#eff6ff" : "#f3f4f6")}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.account === acc.name ? "#eff6ff" : "white")}
                                      >
                                        {acc.name}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                            <div
                              style={{
                                padding: "12px",
                                borderTop: "1px solid #f3f4f6",
                                color: "#156372",
                                fontSize: "13px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                position: "sticky",
                                bottom: 0,
                                background: "white",
                                zIndex: 1
                              }}
                              onClick={() => console.log("New Account clicked")}
                            >
                              <PlusCircle size={16} /> New Account
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ textAlign: "right" }}>
                        <input
                          style={{ ...styles.input, textAlign: "right", fontSize: "13px" }}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        />
                        {(item as any).trackInventory && (
                          <>
                            <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>Stock on Hand:</div>
                            <div style={{ fontSize: "10px", color: "#374151" }}>
                              {(item as any).stockQuantity || 0} {(item as any).unit || ""}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ textAlign: "right" }}>
                        <input
                          style={{ ...styles.input, textAlign: "right", fontSize: "13px" }}
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                        />
                        <div style={{ color: "#156372", fontSize: "10px", marginTop: "4px", cursor: "pointer" }}>Recent Transactions</div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ position: "relative" }}>
                        <div
                          style={{
                            ...styles.input,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            fontSize: "13px"
                          }}
                          onClick={(e) => { e.stopPropagation(); setTaxDropdownOpen(prev => ({ ...prev, [index]: !prev[index] })); }}
                        >
                          <span style={{ color: item.tax ? "#374151" : "#9ca3af" }}>
                            {item.tax || "Select a Tax"}
                          </span>
                          <ChevronDown size={14} style={{ color: "#6b7280" }} />
                        </div>
                        {taxDropdownOpen[index] && (
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
                          }}>
                            <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
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
                                  placeholder="Search taxes..."
                                  value={taxSearch[index] || ""}
                                  onChange={(e) => setTaxSearch(prev => ({ ...prev, [index]: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div style={{ padding: "4px 0" }}>
                              <div
                                style={{
                                  padding: "10px 16px",
                                  fontSize: "13px",
                                  cursor: "pointer",
                                  backgroundColor: item.tax === "Non-Taxable" ? "#eff6ff" : "white",
                                  color: item.tax === "Non-Taxable" ? "#156372" : "#374151",
                                  transition: "background-color 0.2s"
                                }}
                                onClick={() => {
                                  handleItemChange(index, "tax", "Non-Taxable");
                                  setTaxDropdownOpen(prev => ({ ...prev, [index]: false }));
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.tax === "Non-Taxable" ? "#eff6ff" : "#f3f4f6")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.tax === "Non-Taxable" ? "#eff6ff" : "white")}
                              >
                                Non-Taxable
                              </div>
                              {(taxes || []).filter((t: any) =>
                                t.name.toLowerCase().includes((taxSearch[index] || "").toLowerCase())
                              ).map((t: any) => (
                                <div
                                  key={t.id}
                                  style={{
                                    padding: "10px 16px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    backgroundColor: item.tax === t.name ? "#eff6ff" : "white",
                                    color: item.tax === t.name ? "#156372" : "#374151",
                                    transition: "background-color 0.2s"
                                  }}
                                  onClick={() => {
                                    handleItemChange(index, "tax", t.name);
                                    setTaxDropdownOpen(prev => ({ ...prev, [index]: false }));
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = item.tax === t.name ? "#eff6ff" : "#f3f4f6")}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = item.tax === t.name ? "#eff6ff" : "white")}
                                >
                                  {t.name}
                                </div>
                              ))}
                            </div>
                            <div
                              style={{
                                padding: "12px",
                                borderTop: "1px solid #f3f4f6",
                                color: "#156372",
                                fontSize: "13px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                position: "sticky",
                                bottom: 0,
                                background: "white",
                                zIndex: 1
                              }}
                              onClick={() => console.log("New Tax clicked")}
                            >
                              <PlusCircle size={16} /> New Tax
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500" }}>{parseFloat(item.amount || 0).toFixed(2)}</span>
                        <MoreVertical size={14} style={{ color: "#d1d5db", cursor: "pointer" }} onClick={() => setRowMenuOpen(prev => ({ ...prev, [index]: !prev[index] }))} />
                        <X size={14} style={{ color: "#156372", cursor: "pointer" }} onClick={() => removeRow(index)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "16px", display: "flex", gap: "16px" }}>
              <button type="button" onClick={addNewRow} style={{ ...styles.secondaryButton, display: "flex", alignItems: "center", gap: "4px", color: "#156372", border: "none", padding: "0" }}>
                <PlusCircle size={14} /> Add New Row
              </button>
              <button type="button" onClick={() => setShowBulkItemsModal(true)} style={{ ...styles.secondaryButton, display: "flex", alignItems: "center", gap: "4px", color: "#156372", border: "none", padding: "0" }}>
                <PlusCircle size={14} /> Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Summary */}
          <div style={styles.summarySection}>
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Sub Total</span>
                <span style={styles.summaryValue}>{calculateSubTotal().toFixed(2)}</span>
              </div>
              {showTransactionDiscount && (
                <div style={styles.summaryRow}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={styles.summaryLabel}>Discount</span>
                    <div style={{ display: "flex", position: "relative" }}>
                      <input
                        style={{
                          width: "80px",
                          padding: "6px 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px 0 0 4px",
                          fontSize: "13px",
                          textAlign: "right",
                          outline: "none"
                        }}
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                      />
                      <div
                        style={{
                          padding: "6px 12px",
                          border: "1px solid #d1d5db",
                          borderLeft: "none",
                          borderRadius: "0 4px 4px 0",
                          fontSize: "13px",
                          backgroundColor: "#f3f4f6",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          minWidth: "60px",
                          justifyContent: "center"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDiscountDropdownOpen(!discountDropdownOpen);
                        }}
                      >
                        {formData.discountType === "%" ? "%" : formData.currency}
                        <ChevronDown size={12} style={{ color: "#6b7280" }} />
                      </div>

                      {discountDropdownOpen && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          zIndex: 1000,
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          marginTop: "4px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                          width: "120px",
                          overflow: "hidden"
                        }}>
                          <div
                            style={{
                              padding: "10px 16px",
                              fontSize: "13px",
                              cursor: "pointer",
                              backgroundColor: formData.discountType === "%" ? "#eff6ff" : "white",
                              color: formData.discountType === "%" ? "#156372" : "#374151",
                              fontWeight: formData.discountType === "%" ? "500" : "400"
                            }}
                            onClick={() => {
                              setFormData({ ...formData, discountType: "%" });
                              setDiscountDropdownOpen(false);
                            }}
                          >
                            %
                          </div>
                          <div
                            style={{
                              padding: "10px 16px",
                              fontSize: "13px",
                              cursor: "pointer",
                              backgroundColor: formData.discountType === "Currency" ? "#eff6ff" : "white",
                              color: formData.discountType === "Currency" ? "#156372" : "#374151",
                              fontWeight: formData.discountType === "Currency" ? "500" : "400"
                            }}
                            onClick={() => {
                              setFormData({ ...formData, discountType: "Currency" });
                              setDiscountDropdownOpen(false);
                            }}
                          >
                            {formData.currency}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={styles.summaryValue}>{calculateDiscountAmount().toFixed(2)}</span>
                </div>
              )}

              {showAdjustment && (
              <div style={styles.summaryRow}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <div style={{
                    padding: "6px 12px",
                    border: "1px dashed #d1d5db",
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: "#6b7280",
                    backgroundColor: "#fff"
                  }}>
                    Adjustment
                  </div>
                  <input
                    style={{
                      width: "80px",
                      padding: "6px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "13px",
                      textAlign: "right",
                      outline: "none"
                    }}
                    value={formData.adjustment}
                    onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
                  />
                  <Info size={14} style={{ color: "#9ca3af" }} />
                </div>
                <span style={styles.summaryValue}>{parseFloat(formData.adjustment as any || 0).toFixed(2)}</span>
              </div>
              )}

              <div style={{ ...styles.totalRow, borderTop: "1px solid #e5e7eb", marginTop: "12px", paddingTop: "16px" }}>
                <span style={styles.totalLabel}>Total ({formData.currency})</span>
                <span style={styles.totalValue}>{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Attachments */}
          <div style={{ display: "flex", gap: "32px", marginTop: "40px", padding: "24px 0", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...styles.label, marginBottom: "8px", fontWeight: "500", width: "auto" }}>Notes</label>
              <textarea
                style={{ ...styles.textarea, minHeight: "100px" }}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter notes"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...styles.label, marginBottom: "8px", fontWeight: "500", width: "auto" }}>Attach File(s) to Vendor Credits</label>
              <div
                style={{
                  border: "2px dashed #e5e7eb",
                  borderRadius: "8px",
                  padding: "24px",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: "#f9fafb"
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ color: "#156372", fontWeight: "500", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <UploadIcon size={16} /> Upload File
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                  You can upload a maximum of 5 files, 10MB each
                </div>
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

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.saveDraftButton}
            onClick={() => handleSave("Draft")}
            disabled={!!saveLoadingState}
          >
            {saveLoadingState === "Draft" ? "Saving..." : (isEdit ? "Update as Draft" : "Save as Draft")}
          </button>
          <button
            style={styles.saveOpenButton}
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
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", width: "90%", maxWidth: "1000px", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>Add Items in Bulk</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: "60%", borderRight: "1px solid #eee", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px" }}>
              <input style={styles.input} placeholder="Search items..." value={bulkItemsSearch} onChange={e => setBulkItemsSearch(e.target.value)} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {filteredBulkItems.map((item: any) => {
                const isSelected = selectedItems.some((i: any) => i.id === item.id);
                return (
                  <div key={item.id} onClick={() => onToggleSelect(item)} style={{ padding: "12px", border: "1px solid #eee", borderRadius: "6px", marginBottom: "8px", cursor: "pointer", backgroundColor: isSelected ? "#eff6ff" : "#fff", borderColor: isSelected ? "#156372" : "#eee" }}>
                    <div style={{ fontWeight: "500" }}>{item.name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>SKU: {item.sku || "N/A"} | Price: {item.costPrice}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ width: "40%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #eee", fontWeight: "600" }}>Selected Items ({selectedItems.length})</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {selectedItems.map((item: any) => (
                <div key={item.id} style={{ padding: "12px", border: "1px solid #eee", borderRadius: "6px", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "500", marginBottom: "8px" }}>{item.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "12px" }}>Qty:</span>
                    <input style={{ ...styles.input, width: "70px", padding: "4px" }} type="number" value={quantities[item.id] || 1} onChange={e => onQuantityChange(item.id, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={styles.secondaryButton}>Cancel</button>
          <button onClick={onAdd} style={styles.primaryButton} disabled={selectedItems.length === 0}>Add Items</button>
        </div>
      </div>
    </div>
  );
};

