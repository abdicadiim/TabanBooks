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
  Mail,
} from "lucide-react";
import { vendorsAPI, itemsAPI, taxesAPI, accountantAPI, vendorCreditsAPI, locationsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import toast from "react-hot-toast";
import NewVendorModal from "../../../components/modals/NewVendorModal";
import { API_BASE_URL, getToken } from "../../../services/auth";
import { filterActiveRecords } from "../shared/activeFilters";

export default function NewVendorCredit() {
  type SaveStatus = "Draft" | "Open";
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeCreditId } = useParams();
  const { editCredit: stateEditCredit, isEdit: stateIsEdit } = location.state || {};
  const [editCredit, setEditCredit] = useState<any>(stateEditCredit || null);
  const isEdit = !!(stateIsEdit || routeCreditId);
  const [enabledSettings, setEnabledSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    vendorId: "",
    vendorName: "",
    creditNote: "",
    orderNumber: "",
    vendorCreditDate: new Date().toISOString().split("T")[0],
    subject: "",
    accountsPayable: "Accounts Payable",
    taxExclusive: "Tax Inclusive",
    taxLevel: "At Transaction Level",
    locationId: "",
    locationName: "",
    discount: 0,
    discountType: "%", // "%" or "Currency"
    adjustment: 0,
    notes: "",
    currency: "CAD",
  });
  const { code: baseCurrencyCode } = useCurrency();
  const [discountDropdownOpen, setDiscountDropdownOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [billingAddressEditMode, setBillingAddressEditMode] = useState(false);

  const [itemRows, setItemRows] = useState<any[]>([
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
  const [showNumberSettings, setShowNumberSettings] = useState(false);
  const [numberingSettings, setNumberingSettings] = useState({
    mode: 'auto',
    prefix: 'DN-',
    nextNumber: '00001',
    restartFiscalYear: false
  });
  const [taxExclusiveSearch, setTaxExclusiveSearch] = useState("");
  const [taxLevelSearch, setTaxLevelSearch] = useState("");
  const [rowMenuOpen, setRowMenuOpen] = useState<{ [key: string]: boolean }>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [itemDropdownOpen, setItemDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [accountSearch, setAccountSearch] = useState<{ [key: string]: string }>({});
  
  const [locations, setLocations] = useState<any[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const locationRef = useRef<HTMLDivElement | null>(null);
  const [taxSearch, setTaxSearch] = useState<{ [key: string]: string }>({});
  const [itemSearch, setItemSearch] = useState<{ [key: string]: string }>({});
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showBulkItemsModal, setShowBulkItemsModal] = useState(false);
  const [bulkItemsInsertIndex, setBulkItemsInsertIndex] = useState(0);
  const [bulkItemsSearch, setBulkItemsSearch] = useState("");
  const [selectedBulkItems, setSelectedBulkItems] = useState<any[]>([]);
  const [bulkItemQuantities, setBulkItemQuantities] = useState<{ [key: string]: number }>({});
  const [saveLoadingState, setSaveLoadingState] = useState<null | "Draft" | "Open">(null);

  const [showNumberPreferencesModal, setShowNumberPreferencesModal] = useState(false);
  const [numberingPreference, setNumberingPreference] = useState<"auto" | "manual">("auto");
  const [numberPrefix, setNumberPrefix] = useState("DN-");
  const [nextNumber, setNextNumber] = useState("00001");
  const [restartYearly, setRestartYearly] = useState(false);
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
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const rowMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const vendorRef = useRef<HTMLDivElement | null>(null);
  const currencyRef = useRef<HTMLDivElement | null>(null);
  const accountsPayableRef = useRef<HTMLDivElement | null>(null);
  const taxExclusiveRef = useRef<HTMLDivElement | null>(null);
  const taxLevelRef = useRef<HTMLDivElement | null>(null);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkActionsRef = useRef<HTMLDivElement | null>(null);
  const addNewRowRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (vendorRef.current && !vendorRef.current.contains(target)) setVendorDropdownOpen(false);
      if (accountsPayableRef.current && !accountsPayableRef.current.contains(target)) setAccountsPayableOpen(false);
      if (taxExclusiveRef.current && !taxExclusiveRef.current.contains(target)) setTaxExclusiveOpen(false);
      if (taxLevelRef.current && !taxLevelRef.current.contains(target)) setTaxLevelOpen(false);
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(target)) setUploadMenuOpen(false);
      if (currencyRef.current && !currencyRef.current.contains(target)) setCurrencyDropdownOpen(false);
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) setBulkActionsOpen(false);
      if (addNewRowRef.current && !addNewRowRef.current.contains(target)) setAddNewRowDropdownOpen(false);
      
      setAccountDropdownOpen({});
      setTaxDropdownOpen({});
      setDiscountDropdownOpen(false);

      Object.keys(itemDropdownOpen).forEach((index) => {
        const itemEl = itemRefs.current[index];
        if (itemEl && !itemEl.contains(target)) {
          setItemDropdownOpen((prev) => ({ ...prev, [index]: false }));
          setItemSearch((prev) => ({ ...prev, [index]: "" }));
        }
      });
      Object.keys(rowMenuOpen).forEach((index) => {
        const rowMenuEl = rowMenuRefs.current[index];
        if (rowMenuOpen[index] && rowMenuEl && !rowMenuEl.contains(target)) {
          setRowMenuOpen((prev) => ({ ...prev, [index]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [itemDropdownOpen, rowMenuOpen]);

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
    const loadLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedLocations = filterActiveRecords(response.data || response.locations || []);
          setLocations(loadedLocations);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
      }
    };
    loadLocations();
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
      locationId: editCredit.location || prev.locationId,
      locationName: editCredit.locationName || prev.locationName,
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

  useEffect(() => {
    if (baseCurrencyCode) {
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

  const handleVendorSelect = (vendor: any) => {
    setSelectedVendor(vendor);
    setFormData({
      ...formData,
      vendorName: vendor.displayName || vendor.name,
    });
    setVendorDropdownOpen(false);
    setVendorSearch("");
  };

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

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...itemRows];
    (newItems[index] as any)[field] = value;

    if (field === "quantity" || field === "rate" || field === "discount") {
      const quantity = parseFloat(String(newItems[index].quantity || 0));
      const rate = parseFloat(String(newItems[index].rate || 0));
      const discountMatch = (newItems[index].discount || "0 %-").match(/(\d+(?:\.\d+)?)/);
      const discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;
      const subtotal = quantity * rate;
      const discountAmount = (subtotal * discountPercent) / 100;
      newItems[index].amount = subtotal - discountAmount;
    }

    setItemRows(newItems);

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
    newItems[index].account = "Cost of Goods Sold";
    if (item.costPrice) {
      newItems[index].rate = item.costPrice;
      const quantity = parseFloat(String(newItems[index].quantity || 0));
      const rate = parseFloat(String(item.costPrice || 0));
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

  const handleAddItem = (item: any, quantity: number) => {
    const isSelected = selectedBulkItems.some(selected => selected.id === item.id);
    if (isSelected) {
      setSelectedBulkItems(selectedBulkItems.filter(selected => selected.id !== item.id));
      const newQuantities = { ...bulkItemQuantities };
      delete newQuantities[item.id];
      setBulkItemQuantities(newQuantities);
    } else {
      setSelectedBulkItems([...selectedBulkItems, item]);
      setBulkItemQuantities({ ...bulkItemQuantities, [item.id]: quantity });
    }
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

  const calculateSubTotal = () => {
    return itemRows.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateTaxAmount = () => {
    let taxTotal = 0;
    itemRows.forEach(item => {
      if (item.tax) {
        const taxMatch = item.tax.match(/(\d+(?:\.\d+)?)/);
        const taxPercent = taxMatch ? parseFloat(taxMatch[1]) : 0;
        if (formData.taxExclusive === "Tax Inclusive") {
          const subtotal = parseFloat(String(item.quantity || 0)) * parseFloat(String(item.rate || 0));
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

  const handleSave = async (status: SaveStatus) => {
    if (saveLoadingState) return;
    if (!formData.vendorName || !selectedVendor) {
      toast.error("Please select a vendor");
      return;
    }
    if (!formData.creditNote) {
      toast.error("Credit Note# is required");
      return;
    }
    const validItems = itemRows.filter(row => row.itemDetails && row.itemDetails.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
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

      const payload = {
        vendor: vendorId,
        vendorName: formData.vendorName,
        creditNote: formData.creditNote,
        orderNumber: formData.orderNumber,
        date: formData.vendorCreditDate,
        items: validItems.map(row => ({
          item: (row as any).item,
          name: (row as any).name,
          description: (row as any).description,
          quantity: parseFloat(row.quantity as any || 0),
          rate: parseFloat(row.rate as any || 0),
          tax: row.tax,
          amount: row.amount,
          account: row.account
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
        location: formData.locationId,
        locationName: formData.locationName
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

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <style>{`
        .animated-field {
          transition: all 0.2s ease-in-out !important;
        }
        .animated-field:focus, .animated-field:focus-within {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
          outline: none !important;
        }
      `}</style>
      <div style={styles.container}>
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
              <label style={styles.requiredLabel}>Vendor Name*</label>
              <div style={{ display: "flex", gap: "0px", position: "relative" as any, flex: 1, maxWidth: "450px" }}>
                <div
                  style={{
                    ...styles.input,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: "#fff",
                    borderColor: vendorDropdownOpen ? "#2563eb" : "#d1d5db",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    flex: 1,
                    height: "36px"
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
                      <X
                        size={14}
                        style={{ color: "#ef4444", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, vendorId: "", vendorName: "" });
                          setSelectedVendor(null);
                        }}
                      />
                    )}
                    <ChevronDown size={16} style={{ color: "#3b82f6", transform: vendorDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    padding: "8px 12px",
                    borderTopRightRadius: "4px",
                    borderBottomRightRadius: "4px",
                    backgroundColor: "#22c55e",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    height: "36px",
                    width: "36px"
                  }}
                >
                  <Search size={16} color="#fff" />
                </button>

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
                    flexDirection: "column" as any,
                    overflow: "hidden"
                  }}>
                    <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ position: "relative" as any }}>
                        <Search size={14} style={{ position: "absolute" as any, left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
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

                    <div style={{ overflowY: "auto" as any, flex: 1 }}>
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
                            <div style={{ display: "flex", flexDirection: "column" as any }}>
                              <span style={{ fontSize: "13px", fontWeight: "500", color: "#1f2937" }}>
                                {vendor.displayName || vendor.name}
                              </span>
                              {vendor.email && (
                                <span style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Mail size={10} /> {vendor.email}
                                </span>
                              )}
                            </div>
                            {formData.vendorName === (vendor.displayName || vendor.name) && (
                              <Check size={14} style={{ marginLeft: "auto", color: "#2563eb" }} />
                            )}
                          </div>
                        ))}
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        borderTop: "1px solid #f3f4f6",
                        color: "#2563eb",
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

              {/* Billing Address Display */}
              {selectedVendor && (
                <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.5", marginTop: "12px" }}>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    BILLING ADDRESS <Pencil size={12} style={{ color: "#9ca3af", cursor: "pointer" }} />
                  </div>
                  <div style={{ fontWeight: "600", color: "#111827" }}>{selectedVendor.displayName || selectedVendor.name}</div>
                  {selectedVendor.billingAddress?.street1 && <div>{selectedVendor.billingAddress.street1}</div>}
                  {selectedVendor.billingAddress?.city && <div>{selectedVendor.billingAddress.city}, {selectedVendor.billingAddress.state}</div>}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #f3f4f6", margin: "24px 0", maxWidth: "800px" }}></div>

            {/* Credit Note# */}
            <div style={styles.fieldRow}>
              <label style={styles.requiredLabel}>Credit Note#*</label>
              <div style={{ display: "flex", alignItems: "center", position: "relative" as any, flex: 1, maxWidth: "350px" }}>
                <input
                  type="text"
                  style={{ ...styles.input, paddingRight: "40px", height: "36px" }}
                  value={formData.creditNote}
                  readOnly={numberingSettings.mode === 'auto'}
                  onChange={(e) => setFormData({ ...formData, creditNote: e.target.value })}
                />
                <div 
                  onClick={() => setShowNumberSettings(true)}
                  style={{
                    position: "absolute" as any,
                    right: "12px",
                    color: "#2563eb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    padding: "4px"
                  }}>
                  <Settings size={14} />
                </div>
              </div>
            </div>

            {/* Order Number */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Order Number</label>
              <div style={{ flex: 1, maxWidth: "350px" }}>
                <input
                  type="text"
                  style={{ ...styles.input, height: "36px" }}
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Vendor Credit Date */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Vendor Credit Date</label>
              <div style={{ flex: 1, maxWidth: "350px" }}>
                <input
                  type="date"
                  style={{ ...styles.input, height: "36px" }}
                  value={formData.vendorCreditDate}
                  onChange={(e) => setFormData({ ...formData, vendorCreditDate: e.target.value })}
                />
              </div>
            </div>

            {/* Location */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>Location</label>
              <div style={{ position: "relative" as any, flex: 1, maxWidth: "350px" }} ref={locationRef}>
                <div
                  style={{ ...styles.input, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", backgroundColor: "#fff", height: "36px" }}
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                >
                  <span style={{ fontSize: "14px", color: formData.locationName ? "#374151" : "#9ca3af" }}>
                    {formData.locationName || "Select Location"}
                  </span>
                  <div className="flex items-center gap-2">
                    {formData.locationName && (
                      <X
                        size={14}
                        style={{ color: "#ef4444", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, locationId: "", locationName: "" });
                        }}
                      />
                    )}
                    <ChevronDown size={16} style={{ color: "#6b7280" }} />
                  </div>
                </div>
                
                {locationDropdownOpen && (
                  <div style={{
                    position: "absolute" as any,
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
                    overflowY: "auto" as any
                  }}>
                    {locations.map(loc => (
                      <div
                        key={loc._id}
                        style={{
                          padding: "10px 16px",
                          fontSize: "13px",
                          cursor: "pointer",
                          backgroundColor: formData.locationId === loc._id ? "#eff6ff" : "white",
                          color: formData.locationId === loc._id ? "#2563eb" : "#374151"
                        }}
                        onClick={() => {
                          setFormData({ ...formData, locationId: loc._id, locationName: loc.name });
                          setLocationDropdownOpen(false);
                        }}
                      >
                        {loc.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>
                Description <Info size={14} style={{ color: "#9ca3af" }} />
              </label>
              <div style={{ flex: 1, maxWidth: "350px" }}>
                <textarea
                  style={{ ...styles.textarea, minHeight: "36px", padding: "8px 12px" }}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Enter a description"
                />
              </div>
            </div>

            {/* Accounts Payable */}
            <div style={styles.fieldRow}>
              <label style={styles.label}>
                Accounts Payable <Info size={14} style={{ color: "#9ca3af" }} />
              </label>
              <div style={{ flex: 1, maxWidth: "350px", position: "relative" as any }}>
                <div
                  style={{
                    ...styles.input,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: "#fff",
                    height: "36px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccountsPayableOpen(!accountsPayableOpen);
                  }}
                >
                  <span style={{ fontSize: "14px", color: formData.accountsPayable ? "#374151" : "#9ca3af" }}>
                    {formData.accountsPayable || "Accounts Payable"}
                  </span>
                  <div className="flex items-center gap-2">
                    {formData.accountsPayable && (
                      <X
                        size={14}
                        style={{ color: "#ef4444", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, accountsPayable: "" });
                        }}
                      />
                    )}
                    <ChevronDown size={16} style={{ color: "#6b7280" }} />
                  </div>
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
                    overflowY: "auto" as any
                  }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ position: "relative" as any }}>
                        <Search size={14} style={{ position: "absolute" as any, left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
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
                        />
                      </div>
                    </div>
                    {accounts
                      .filter(acc => acc.name.toLowerCase().includes(apSearchTerm.toLowerCase()))
                      .map(acc => (
                        <div
                          key={acc.id}
                          style={{
                            padding: "10px 16px",
                            fontSize: "13px",
                            cursor: "pointer",
                            backgroundColor: formData.accountsPayable === acc.name ? "#eff6ff" : "white"
                          }}
                          onClick={() => {
                            setFormData({ ...formData, accountsPayable: acc.name });
                            setAccountsPayableOpen(false);
                          }}
                        >
                          {acc.name}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Item Table Selection */}
          <div style={{ display: "flex", gap: "32px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ position: "relative" as any }}>
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
                  position: "absolute" as any,
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
                    <div style={{ position: "relative" as any }}>
                      <Search size={14} style={{ position: "absolute" as any, left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
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

            <div style={{ position: "relative" as any }}>
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
                  position: "absolute" as any,
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
                    <div style={{ position: "relative" as any }}>
                      <Search size={14} style={{ position: "absolute" as any, left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
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
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Item Table</h2>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                <CheckCircle size={16} />
                Bulk Actions
              </button>
            </div>
            
            <div className="overflow-x-auto overflow-y-visible rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfcfd] border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2 w-[30%]">Item Details</th>
                    <th className="px-3 py-2 w-[15%]">Account</th>
                    <th className="px-3 py-2 w-[12%] text-right">Quantity</th>
                    <th className="px-3 py-2 w-[15%] text-right">Rate</th>
                    {formData.taxLevel === "At Line Item Level" && (
                      <th className="px-3 py-2 w-[13%] text-right">Discount</th>
                    )}
                    <th className="px-3 py-2 w-[15%] text-right">Tax</th>
                    <th className="px-3 py-2 w-[13%] text-right">Amount</th>
                    <th className="w-0 px-0 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {itemRows.map((item, index) => (
                    <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="w-8 border-r border-gray-200 px-2 py-3 text-center align-top">
                        <div className="flex flex-col items-center gap-4">
                          <GripVertical size={14} className="cursor-move text-gray-300 group-hover:text-gray-400" />
                          <span className="text-[11px] font-medium text-gray-400">{index + 1}</span>
                        </div>
                      </td>
                      <td className="border-r border-gray-200 px-3 py-3 text-sm">
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <textarea
                              style={{ ...styles.textarea, minHeight: "36px", padding: "8px 12px", fontSize: "13px", lineHeight: "1.4" }}
                              value={item.itemDetails || ""}
                              placeholder="Type to search items..."
                              onChange={(e) => {
                                handleItemChange(index, "itemDetails", e.target.value);
                                setItemDropdownOpen(prev => ({ ...prev, [index]: true }));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemDropdownOpen(prev => ({ ...prev, [index]: true }));
                              }}
                            />
                            {itemDropdownOpen[index] && (
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
                                overflowY: "auto" as any
                              }}>
                                {items
                                  .filter(i => (i.name || "").toLowerCase().includes((item.itemDetails || "").toLowerCase()))
                                  .map(i => (
                                    <div
                                      key={i.id}
                                      style={{
                                        padding: "10px 16px",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #f9fafb"
                                      }}
                                      onClick={() => {
                                        handleItemSelect(index, i);
                                        setItemDropdownOpen(prev => ({ ...prev, [index]: false }));
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                                    >
                                      <div style={{ fontWeight: "500", color: "#111827" }}>{i.name}</div>
                                      <div style={{ fontSize: "11px", color: "#6b7280" }}>SKU: {i.sku || "N/A"} | Rate: {i.purchaseRate || 0}</div>
                                    </div>
                                  ))}
                                <div
                                  style={{
                                    padding: "12px",
                                    borderTop: "1px solid #f3f4f6",
                                    color: "#2563eb",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    cursor: "pointer",
                                    backgroundColor: "#fff"
                                  }}
                                  onClick={() => {
                                    setShowNewItemModal(true);
                                    setItemDropdownOpen(prev => ({ ...prev, [index]: false }));
                                  }}
                                >
                                  <PlusCircle size={16} /> New Item
                                </div>
                              </div>
                            )}
                          <textarea
                            style={{ ...styles.textarea, minHeight: "48px", padding: "8px 12px", fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}
                            placeholder="Add item description"
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          />
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2.5 text-sm">
                        <div className="relative">
                          <div
                            style={{ ...styles.input, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", height: "36px", padding: "0 12px" }}
                            onClick={() => setAccountDropdownOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                          >
                            <span style={{ fontSize: "13px", color: item.account ? "#374151" : "#9ca3af" }}>
                              {item.account || "Select Account"}
                            </span>
                            <ChevronDown size={14} style={{ color: "#9ca3af" }} />
                          </div>
                          {accountDropdownOpen[index] && (
                            <>
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
                                overflowY: "auto" as any
                              }}>
                                <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
                                  <div style={{ position: "relative" as any }}>
                                    <Search size={14} style={{ position: "absolute" as any, left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
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
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                {accounts.map(acc => (
                                  <div
                                    key={acc.id}
                                    style={{
                                      padding: "10px 16px",
                                      fontSize: "13px",
                                      cursor: "pointer",
                                      backgroundColor: item.account === acc.name ? "#eff6ff" : "white"
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
                              <div
                                style={{
                                  padding: "12px",
                                  borderTop: "1px solid #f3f4f6",
                                  color: "#2563eb",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  backgroundColor: "#fff"
                                }}
                                onClick={() => console.log("New Account clicked")}
                              >
                                <PlusCircle size={16} /> New Account
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-sm">
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-right text-sm font-medium text-gray-900 outline-none focus:border-teal-600 transition-all"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-sm">
                        <div className="flex flex-col items-end">
                          <input
                            type="text"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-right text-sm font-medium text-gray-900 tabular-nums shadow-sm outline-none focus:border-teal-600 transition-all"
                          />
                          <button
                            type="button"
                            className="mt-4 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb]"
                          >
                            Recent Transactions
                          </button>
                        </div>
                      </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-sm">
                          <div className="relative">
                            <input
                              type="text"
                              value={item.discount || ""}
                              onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-right text-sm font-medium text-gray-900 outline-none focus:border-teal-600 transition-all"
                              placeholder="0"
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 text-xs">%</div>
                          </div>
                        </td>
                      <td className="border-r border-gray-200 px-3 py-2.5 text-sm">
                        <div className="relative">
                          <div
                            className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm shadow-sm hover:border-teal-600 transition-all"
                            onClick={(e) => { e.stopPropagation(); setTaxDropdownOpen(prev => ({ ...prev, [index]: !prev[index] })); }}
                          >
                            <span className={item.tax ? "text-gray-900 font-medium" : "text-gray-400"}>
                              {item.tax || "Select a Tax"}
                            </span>
                            <ChevronDown size={14} className="text-gray-400" />
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
                              overflowY: "auto" as any
                            }}>
                              <div style={{ padding: "12px", borderBottom: "1px solid #f3f4f6", position: "sticky" as any, top: 0, background: "white", zIndex: 1 }}>
                                <div style={{ position: "relative" as any }}>
                                  <Search size={14} style={{ position: "absolute" as any, left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
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
                                  position: "sticky" as any,
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
                      <td className="px-3 py-2 text-sm">
                        <div className="text-right font-semibold text-gray-900 tabular-nums">
                          {parseFloat(String(item.amount || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className="relative w-0 px-0 py-2.5 text-sm overflow-visible">
                        <div className="absolute -right-16 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => setRowMenuOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600"
                          >
                            <MoreVertical size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-rose-400 shadow-sm hover:bg-rose-50 hover:text-rose-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
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
                    onClick={() => setShowBulkItemsModal(true)}
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
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter notes"
                    className="min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm font-inherit outline-none resize-y focus:border-teal-600"
                  />
                </div>
                
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Attachments</label>
                  <div
                    className="relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center hover:border-gray-400"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-sm font-medium text-[#156372]">
                      Upload File
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Maximum File Size: 10MB
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

              <div className="w-full max-w-[350px] flex-shrink-0 xl:ml-auto">
                <div style={styles.summaryBox}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[14px] font-semibold text-gray-900">Sub Total</div>
                      <div className="mt-1 text-[14px] font-medium text-gray-900">
                        Total Quantity : {itemRows.reduce((sum, item) => sum + (parseFloat(item.quantity as any) || 0), 0)}
                      </div>
                    </div>
                    <span className="text-[14px] font-semibold text-gray-900 tabular-nums">{calculateSubTotal().toFixed(2)}</span>
                  </div>
                  {showTransactionDiscount && (
                    <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
                      <label className="text-[14px] font-medium text-gray-700">Discount</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                          className="h-9 w-24 rounded-l-lg border border-gray-200 bg-white px-3 text-right text-sm outline-none focus:border-teal-600"
                          min="0"
                        />
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDiscountDropdownOpen(!discountDropdownOpen);
                            }}
                            className="-ml-2 flex h-9 w-12 items-center justify-center gap-1 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-sm text-gray-600 hover:bg-gray-100"
                          >
                            {formData.discountType === "%" ? "%" : formData.currency}
                            <ChevronDown size={12} className="text-gray-400" />
                          </button>
                          {discountDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-24 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, discountType: "%" });
                                  setDiscountDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm ${formData.discountType === "%" ? "bg-blue-50 text-teal-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, discountType: "Currency" });
                                  setDiscountDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm ${formData.discountType === "Currency" ? "bg-blue-50 text-teal-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                              >
                                {formData.currency}
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="w-20 text-right text-[14px] font-medium text-gray-900 tabular-nums">
                          {calculateDiscountAmount().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {showAdjustment && (
                    <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-gray-700 border-b border-dashed border-gray-400 cursor-pointer">
                          Adjustment
                        </span>
                        <Info size={14} className="text-gray-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.adjustment}
                          onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
                          className="h-10 w-24 rounded-lg border border-gray-200 bg-white px-3 text-right text-sm outline-none focus:border-teal-600"
                        />
                        <span className="w-20 text-right text-[14px] font-medium text-gray-900 tabular-nums">
                          {parseFloat(formData.adjustment as any || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5">
                    <span className="text-[17px] font-semibold text-gray-900">Total</span>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{formData.currency}</div>
                      <span className="text-[17px] font-semibold text-gray-900 tabular-nums">{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
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
      <NumberSettingsModal 
        show={showNumberSettings} 
        onClose={() => setShowNumberSettings(false)} 
        settings={numberingSettings}
        onSave={(newSettings: any) => {
          setNumberingSettings(newSettings);
          if (newSettings.mode === 'auto') {
            setFormData({ ...formData, creditNote: `${newSettings.prefix}${newSettings.nextNumber}` });
          }
          setShowNumberSettings(false);
        }}
        styles={styles}
      />

      {/* Number Preferences Modal */}
      {showNumberPreferencesModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: "60px",
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            width: "600px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: "500", color: "#156372", margin: 0 }}>Configure Vendor Credit Number Preferences</h2>
              <X 
                size={20} 
                style={{ color: "#ef4444", cursor: "pointer" }} 
                onClick={() => setShowNumberPreferencesModal(false)}
              />
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {/* Context Info */}
              <div style={{ display: "flex", gap: "40px", marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#111827", fontWeight: "600", marginBottom: "4px" }}>Location</div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>{formData.locationName || "Head Office"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "#111827", fontWeight: "600", marginBottom: "4px" }}>Associated Series</div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Default Transaction Series</div>
                </div>
              </div>

              {/* Dynamic Text based on selection */}
              <p style={{ fontSize: "13px", color: "#374151", marginBottom: "20px", lineHeight: "1.5" }}>
                {numberingPreference === "auto" 
                  ? "Your Vendor Credits numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?"
                  : "You have selected manual Vendor Credits numbering. Do you want us to auto-generate it for you?"}
              </p>

              {/* Radio 1: Auto */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: numberingPreference === "auto" ? "12px" : "0" }}>
                  <input 
                    type="radio" 
                    checked={numberingPreference === "auto"}
                    onChange={() => setNumberingPreference("auto")}
                    style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#3b82f6" }}
                  />
                  <span style={{ fontSize: "14px", color: "#111827" }}>Continue auto-generating Vendor Credits numbers</span>
                  <Info size={14} style={{ color: "#9ca3af" }} />
                </label>

                {numberingPreference === "auto" && (
                  <div style={{ marginLeft: "24px" }}>
                    <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Prefix</label>
                        <div style={{ position: "relative" }}>
                          <input 
                            type="text" 
                            value={numberPrefix}
                            onChange={(e) => setNumberPrefix(e.target.value)}
                            style={{ 
                              width: "100%", 
                              padding: "8px 12px", 
                              border: "1px solid #d1d5db", 
                              borderRadius: "4px", 
                              fontSize: "13px", 
                              color: "#111827",
                              boxSizing: "border-box"
                            }} 
                          />
                          <Settings size={14} style={{ position: "absolute", right: "12px", top: "10px", color: "#3b82f6" }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Next Number</label>
                        <input 
                          type="text" 
                          value={nextNumber}
                          onChange={(e) => setNextNumber(e.target.value)}
                          style={{ 
                            width: "100%", 
                            padding: "8px 12px", 
                            border: "1px solid #d1d5db", 
                            borderRadius: "4px", 
                            fontSize: "13px", 
                            color: "#111827",
                            boxSizing: "border-box"
                          }} 
                        />
                      </div>
                    </div>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input 
                        type="checkbox"
                        checked={restartYearly}
                        onChange={(e) => setRestartYearly(e.target.checked)}
                        style={{ cursor: "pointer", width: "14px", height: "14px", borderRadius: "3px" }}
                      />
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>Restart numbering for vendor credits at the start of each fiscal year.</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Radio 2: Manual */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    checked={numberingPreference === "manual"}
                    onChange={() => setNumberingPreference("manual")}
                    style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#3b82f6" }}
                  />
                  <span style={{ fontSize: "14px", color: "#111827" }}>Enter Vendor Credits numbers manually</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ 
              padding: "16px 24px", 
              backgroundColor: "#f9fafb", 
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: "12px"
            }}>
              <button 
                onClick={() => {
                  if (numberingPreference === "auto") {
                    setFormData({ ...formData, creditNote: `${numberPrefix}${nextNumber}` });
                  }
                  setShowNumberPreferencesModal(false);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Save
              </button>
              <button 
                onClick={() => setShowNumberPreferencesModal(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "white",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
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

const NewItemModal = ({ show, onClose, data, onChange, onSave, styles }: any) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={onClose}>
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" as any, padding: "24px" }} onClick={e => e.stopPropagation()}>
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
    <div style={{ position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", width: "90%", maxWidth: "1000px", maxHeight: "90vh", display: "flex", flexDirection: "column" as any }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>Add Items in Bulk</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: "60%", borderRight: "1px solid #eee", display: "flex", flexDirection: "column" as any }}>
            <div style={{ padding: "16px" }}>
              <input style={styles.input} placeholder="Search items..." value={bulkItemsSearch} onChange={e => setBulkItemsSearch(e.target.value)} />
            </div>
            <div style={{ flex: 1, overflowY: "auto" as any, padding: "16px" }}>
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
          <div style={{ width: "40%", display: "flex", flexDirection: "column" as any }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #eee", fontWeight: "600" }}>Selected Items ({selectedItems.length})</div>
            <div style={{ flex: 1, overflowY: "auto" as any, padding: "16px" }}>
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

const NumberSettingsModal = ({ show, onClose, settings, onSave, styles }: any) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, show]);

  if (!show) return null;

  return (
    <div style={{ position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }} onClick={onClose}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "600px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>Configure Vendor Credit Number Preferences</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", padding: "4px", borderRadius: "4px" }}><X size={20} /></button>
        </div>
        
        <div style={{ padding: "28px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Location</div>
              <div style={{ fontSize: "15px", color: "#111827", fontWeight: "500" }}>Head Office</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Associated Series</div>
              <div style={{ fontSize: "15px", color: "#111827", fontWeight: "500" }}>Default Transaction Series</div>
            </div>
          </div>

          <div style={{ padding: "14px 18px", backgroundColor: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", marginBottom: "32px", fontSize: "14px", lineHeight: "1.5", color: "#991b1b" }}>
            {localSettings.mode === 'auto' ? 
              "Your Vendor Credits numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?" :
              "You have selected manual Vendor Credits numbering. Do you want us to auto-generate it for you?"
            }
          </div>

          <div style={{ display: "flex", flexDirection: "column" as any, gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }} onClick={() => setLocalSettings({ ...localSettings, mode: 'auto' })}>
              <div style={{ 
                width: "20px", 
                height: "20px", 
                borderRadius: "50%", 
                border: localSettings.mode === 'auto' ? "6px solid #3b82f6" : "2px solid #d1d5db",
                backgroundColor: "#fff",
                marginTop: "2px",
                flexShrink: 0,
                transition: "all 0.2s"
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                  Continue auto-generating Vendor Credits numbers
                  <Info size={14} style={{ color: "#9ca3af", cursor: "help" }} />
                </div>
                
                {localSettings.mode === 'auto' && (
                  <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "500", color: "#4b5563", marginBottom: "8px", display: "block" }}>Prefix</label>
                      <input 
                        style={{ ...styles.input, padding: "10px 12px", width: "100%", fontSize: "14px" }} 
                        value={localSettings.prefix} 
                        onChange={(e) => setLocalSettings({ ...localSettings, prefix: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "13px", fontWeight: "500", color: "#4b5563", marginBottom: "8px", display: "block" }}>Next Number</label>
                      <input 
                        style={{ ...styles.input, padding: "10px 12px", width: "100%", fontSize: "14px" }} 
                        value={localSettings.nextNumber} 
                        onChange={(e) => setLocalSettings({ ...localSettings, nextNumber: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#4b5563" }}>
                        <input 
                          type="checkbox" 
                          checked={localSettings.restartFiscalYear} 
                          onChange={(e) => setLocalSettings({ ...localSettings, restartFiscalYear: e.target.checked })}
                          style={{ width: "16px", height: "16px", borderRadius: "4px" }}
                        />
                        Restart numbering for vendor credits at the start of each fiscal year.
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setLocalSettings({ ...localSettings, mode: 'manual' })}>
              <div style={{ 
                width: "20px", 
                height: "20px", 
                borderRadius: "50%", 
                border: localSettings.mode === 'manual' ? "6px solid #3b82f6" : "2px solid #d1d5db",
                backgroundColor: "#fff",
                flexShrink: 0,
                transition: "all 0.2s"
              }} />
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                Enter Vendor Credits numbers manually
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "12px", backgroundColor: "#fff" }}>
          <button 
            style={{ 
              ...styles.primaryButton, 
              padding: "10px 24px", 
              backgroundColor: "#10b981", 
              fontSize: "14px", 
              fontWeight: "600",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer"
            }} 
            onClick={() => onSave(localSettings)}
          >
            Save
          </button>
          <button 
            style={{ 
              ...styles.secondaryButton, 
              padding: "10px 24px", 
              fontSize: "14px", 
              fontWeight: "600",
              backgroundColor: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              color: "#4b5563",
              cursor: "pointer"
            }} 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


