// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Info,
  FileText,
  Settings,
  Check,
  Trash2,
  Calculator,
  MoreVertical,
  Image as ImageIcon,
  Tag,
  Repeat2,
} from "lucide-react";
import { recurringBillsAPI, vendorsAPI, customersAPI, itemsAPI, paymentTermsAPI, accountsAPI, taxesAPI, locationsAPI } from "../../../services/api";
import toast from "react-hot-toast";
import DatePicker from "../../../components/DatePicker";
import { usePaymentTermsDropdown } from "../../../hooks/usePaymentTermsDropdown";
import { PaymentTermsDropdown } from "../../../components/PaymentTermsDropdown";
import { LocationSelectDropdown } from "../../../components/LocationSelectDropdown";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";

const EXPENSE_ACCOUNTS_STRUCTURE = {
  "Cost Of Goods Sold": [
    "Cost of Goods Sold"
  ],
  "Expense": [
    "Expense",
    "Advertising And Marketing",
    "Automobile Expense",
    "Bad Debt",
    "Bank Fees and Charges",
    "Consultant Expense",
    "Credit Card Charges",
    "Depreciation Expense",
    "Fuel/Mileage Expenses",
    "IT and Internet Expenses",
    "Janitorial Expense",
    "Lodging",
    "Meals and Entertainment",
    "Office Supplies",
    "Other Expenses",
    "Other Expense",
    "Parking",
    "Postage",
    "Printing and Stationery",
    "Purchase Discounts",
    "Rent Expense",
    "Repairs and Maintenance",
    "Salaries and Employee Wages",
    "Telephone Expense",
    "Travel Expense",
    "Uncategorized"
  ],
  "Asset": [
    "Asset",
    "Other Asset",
    "Other Current Asset",
    "Fixed Asset",
    "Stock",
    "Intangible Asset",
    "Non Current Asset",
    "Inventory Asset"
  ],
  "Liability": [
    "Liability",
    "Other Current Liability",
    "Credit Card",
    "Non Current Liability",
    "Other Liability",
    "Employee Reimbursements",
    "VAT Payable"
  ],
  "Equity": [
    "Equity"
  ],
  "Income": [
    "Income",
    "Other Income"
  ],
  "Fixed Asset": [
    "Furniture and Equipment"
  ],
  "Other Current Asset": [
    "Advance Tax",
    "Employee Advance",
    "Prepaid Expenses",
    "Sales to Customers (Cash)"
  ]
};

const CUSTOMERS_LIST = [
  "KOWNI",
  "Customer A",
  "Customer B",
  "Sample Customer"
];

const DEFAULT_TAX_OPTIONS = [
  { id: 1, name: "VAT 6%" },
  { id: 2, name: "VAT 12%" },
  { id: 3, name: "No Tax" },
];

interface PaymentTerm {
  name: string;
  days: number | null;
  isDefault: boolean;
  isNew?: boolean;
}

interface Vendor {
  id?: string;
  _id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  company?: string;
  companyName?: string;
  workPhone?: string;
  mobile?: string;
  avatar?: string;
  [key: string]: any;
}

interface Item {
  id: string | number;
  itemDetails: string;
  account: string;
  quantity: string;
  rate: string;
  tax: string;
  customerDetails: string;
  amount: string;
  description?: string;
}

interface ConfigurePaymentTermsModalProps {
  paymentTerms: PaymentTerm[];
  onClose: () => void;
  onSave: (terms: PaymentTerm[]) => void;
}

// Configure Payment Terms Modal Component
function ConfigurePaymentTermsModal({ paymentTerms, onClose, onSave }: ConfigurePaymentTermsModalProps) {
  const [terms, setTerms] = useState<PaymentTerm[]>(paymentTerms);
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

  const handleTermChange = (index: number, field: keyof PaymentTerm, value: string | number | boolean) => {
    const updatedTerms = terms.map((term, i) => {
      if (i === index) {
        return { ...term, [field]: value };
      }
      return term;
    });
    setTerms(updatedTerms);
  };

  const handleMarkAsDefault = (index) => {
    const updatedTerms = terms.map((term, i) => ({
      ...term,
      isDefault: i === index,
    }));
    setTerms(updatedTerms);
  };

  const handleDelete = (index) => {
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

  const modalStyles: { [key: string]: React.CSSProperties } = {
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
      flexDirection: "column" as const,
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
      overflowY: "auto" as const,
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
      textAlign: "left" as const,
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      textTransform: "uppercase" as const,
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
    <div style={modalStyles.overlay as React.CSSProperties} onClick={onClose}>
      <div style={modalStyles.modal as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header as React.CSSProperties}>
          <h2 style={modalStyles.title as React.CSSProperties}>Configure Payment Terms</h2>
          <button onClick={onClose} style={modalStyles.close as React.CSSProperties}>
            <X size={20} />
          </button>
        </div>

        <div style={modalStyles.body as React.CSSProperties}>
          <table style={modalStyles.table as React.CSSProperties}>
            <thead style={modalStyles.tableHeader as React.CSSProperties}>
              <tr>
                <th style={modalStyles.th as React.CSSProperties}>TERM NAME</th>
                <th style={modalStyles.th as React.CSSProperties}>NUMBER OF DAYS</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term, index) => (
                <tr
                  key={index}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={modalStyles.td as React.CSSProperties}>
                    <input
                      type="text"
                      value={term.name}
                      onChange={(e) => handleTermChange(index, "name", e.target.value)}
                      placeholder="Term name"
                      style={modalStyles.input as React.CSSProperties}
                    />
                  </td>
                  <td style={modalStyles.td as React.CSSProperties}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" } as React.CSSProperties}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 } as React.CSSProperties}>
                        {term.name === "Due end of the month" || term.name === "Due end of next month" || term.name === "Custom" ? (
                          <span style={{ fontSize: "14px", color: "#6b7280" } as React.CSSProperties}>-</span>
                        ) : (
                          <input
                            type="number"
                            value={term.days !== null && term.days !== undefined ? term.days : ""}
                            onChange={(e) => handleTermChange(index, "days", e.target.value ? parseInt(e.target.value) : 0)}
                            placeholder="Days"
                            style={{ ...modalStyles.input, width: "100px" } as React.CSSProperties}
                          />
                        )}
                      </div>
                      {hoveredRow === index && !term.isNew && terms.length > 1 && (
                        <div style={modalStyles.actions as React.CSSProperties}>
                          {!term.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsDefault(index)}
                              style={{ ...modalStyles.actionLink, color: "#156372" } as React.CSSProperties}
                            >
                              Mark as Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(index)}
                            style={{ ...modalStyles.actionLink, color: "#156372", display: "flex", alignItems: "center", gap: "4px" } as React.CSSProperties}
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

          <button type="button" onClick={handleAddNew} style={modalStyles.addButton as React.CSSProperties}>
            <Plus size={16} />
            Add New
          </button>
        </div>

        <div style={modalStyles.footer as React.CSSProperties}>
          <button
            type="button"
            onClick={handleSave}
            style={{ ...modalStyles.button, ...modalStyles.buttonSave } as React.CSSProperties}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ ...modalStyles.button, ...modalStyles.buttonCancel } as React.CSSProperties}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewRecurringBill() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  const isEdit = location.state?.isEdit || false;
  const editBill = location.state?.editBill || null;
  const billData = location.state?.billData || null;
  const clonedData = location.state?.clonedData || null;

  const [formData, setFormData] = useState({
    vendorName: "",
    profileName: "",
    repeatEvery: "Week",
    customRepeatValue: "",
    customRepeatUnit: "days",
    startOn: new Date().toISOString().split("T")[0],
    endsOn: "",
    neverExpires: true,
    paymentTerms: "Due on Receipt",
    taxLevel: "At Transaction Level",
    discount: 0,
    adjustment: 0,
    notes: "",
    currency: resolvedBaseCurrency,
    accountsPayable: "",
  });

  const [items, setItems] = useState<Item[]>([
    {
      id: Date.now(),
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      tax: "",
      customerDetails: "",
      amount: "0.00",
    },
  ]);

  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);

  // Vendor search modal state
  const [vendorSearchCriteria, setVendorSearchCriteria] = useState("Display Name");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState<Vendor[]>([]);
  const [vendorSearchPage, setVendorSearchPage] = useState(1);
  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);

  // Load all vendors for advanced search
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [repeatEveryOpen, setRepeatEveryOpen] = useState(false);
  const [showConfigurePaymentTermsModal, setShowConfigurePaymentTermsModal] = useState(false);
  const [paymentTermsList, setPaymentTermsList] = useState([
    { name: "Due on Receipt", days: 0, isDefault: true },
    { name: "Net 15", days: 15, isDefault: false },
    { name: "Net 30", days: 30, isDefault: false },
    { name: "Net 45", days: 45, isDefault: false },
    { name: "Net 60", days: 60, isDefault: false },
    { name: "Due end of the month", days: null, isDefault: false },
    { name: "Due end of next month", days: null, isDefault: false },
    { name: "Custom", days: null, isDefault: false },
  ]);



  const [taxLevelOpen, setTaxLevelOpen] = useState(false);
  const [taxLevelSearch, setTaxLevelSearch] = useState("");
  const [addRowMenuOpen, setAddRowMenuOpen] = useState(false);

  // Accounts Payable state
  const [accountsPayableList, setAccountsPayableList] = useState<any[]>([]);
  const [expenseAccountsStructure, setExpenseAccountsStructure] = useState<Record<string, string[]>>(EXPENSE_ACCOUNTS_STRUCTURE);

  useEffect(() => {
    setFormData((prev: any) => ({
      ...prev,
      currency: resolvedBaseCurrency,
    }));
  }, [resolvedBaseCurrency]);

  useEffect(() => {
    // Fetch Accounts Payable accounts
    const fetchAccounts = async () => {
      try {
        const response = await accountsAPI.getAll();
        if (response && response.data) {
          const activeAccounts = filterActiveRecords(response.data || []);
          const apAccounts = activeAccounts.filter((acc: any) =>
            ["accounts payable", "accounts_payable"].includes(String(acc.accountType || "").toLowerCase()) ||
            String(acc.name || acc.accountName || "").toLowerCase() === "accounts payable"
          );
          setAccountsPayableList(apAccounts);

          const dynamicStructure: Record<string, string[]> = {};
          activeAccounts.forEach((acc: any) => {
            const accountName = String(acc.accountName || acc.name || "").trim();
            if (!accountName) return;

            const rawType = String(acc.accountType || acc.type || "Expense");
            const category = rawType
              .split("_")
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            if (!dynamicStructure[category]) dynamicStructure[category] = [];
            dynamicStructure[category].push(accountName);
          });

          Object.keys(dynamicStructure).forEach((category) => {
            dynamicStructure[category] = Array.from(new Set(dynamicStructure[category])).sort((a, b) => a.localeCompare(b));
          });

          if (Object.keys(dynamicStructure).length > 0) {
            setExpenseAccountsStructure(dynamicStructure);
          }

          // Set default if not set and only one exists or find "Accounts Payable"
          if (!formData.accountsPayable && apAccounts.length > 0) {
            const defaultAcc = apAccounts.find((a: any) => String(a.name || a.accountName || "").toLowerCase() === "accounts payable") || apAccounts[0];
            setFormData(prev => ({ ...prev, accountsPayable: defaultAcc.name || defaultAcc.accountName || "" }));
          }
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
  }, []);
  const [bulkActionsDropdownOpen, setBulkActionsDropdownOpen] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState("Bulk Actions");
  const [showAdditionalFields, setShowAdditionalFields] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [warehouseLocation, setWarehouseLocation] = useState("Head Office");
  const [taxMode, setTaxMode] = useState("Tax Exclusive");

  // Account dropdown states for each item row
  const [accountDropdowns, setAccountDropdowns] = useState<{ [key: string]: boolean }>({});
  const [accountSearches, setAccountSearches] = useState<{ [key: string]: string }>({});
  const accountRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [accountDropdownPosition, setAccountDropdownPosition] = useState<{ [key: string]: { top: number, left: number, width: number } }>({});

  // Customer dropdown states for each item row
  const [customerDropdowns, setCustomerDropdowns] = useState<{ [key: string]: boolean }>({});
  const [customerSearches, setCustomerSearches] = useState<{ [key: string]: string }>({});
  const customerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [customerDropdownPosition, setCustomerDropdownPosition] = useState<{ [key: string]: { top: number, left: number, width: number } }>({});

  // Item dropdown states
  const [itemDropdownOpen, setItemDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [itemSearch, setItemSearch] = useState<{ [key: string]: string }>({});
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [allItems, setAllItems] = useState<any[]>([]);

  // Row menu states
  const [rowMenuOpen, setRowMenuOpen] = useState<{ [key: string]: boolean }>({});
  const rowMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Reporting Tags for each item row
  const [itemReportingTagsOpen, setItemReportingTagsOpen] = useState<{ [key: string]: boolean }>({});
  const itemReportingTagsRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const vendorRef = useRef<HTMLDivElement>(null);
  const repeatEveryRef = useRef<HTMLDivElement>(null);
  const paymentTermsRef = useRef<HTMLDivElement>(null);
  const taxLevelRef = useRef<HTMLDivElement>(null);
  const addRowMenuRef = useRef<HTMLDivElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [taxes, setTaxes] = useState<any[]>(DEFAULT_TAX_OPTIONS);

  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState<{id: string, label: string}[]>([]);

  // Load locations from API
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await locationsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedLocations = filterActiveRecords(response.data || []);
          const formattedLocations = loadedLocations.map((loc: any) => ({
            id: loc.name || loc.id || loc._id,
            label: loc.name || loc.label || "Unnamed Location",
          }));
          setLocations(formattedLocations);
        }
      } catch (error) {
        console.error("Error loading locations:", error);
      }
    };
    loadLocations();
  }, []);

  // Load vendors from API
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedVendors = filterActiveRecords(response.data || []);
          const formattedVendors = loadedVendors.map((v) => ({
            id: v._id || v.id,
            name: v.displayName || v.vendorName || v.companyName || "",
            email: v.email || "",
            company: v.companyName || v.company || "",
            avatar: (v.displayName || v.vendorName || "").charAt(0).toUpperCase() || "?",
            displayName: v.displayName || v.vendorName || "",
            companyName: v.companyName || "",
            workPhone: v.workPhone || "",
            mobile: v.mobile || "",
            ...v
          }));
          setVendors(formattedVendors);
          setAllVendors(loadedVendors);
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
      }
    };
    loadVendors();
  }, []);

  // Load payment terms from localStorage (kept as is for now if no API)
  // Load payment terms from API
  useEffect(() => {
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
    loadPaymentTerms();
  }, []);

  // Load customers from API
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customersAPI.getAll({ limit: 1000 });
        if (response && (response.code === 0 || response.success)) {
          const loadedCustomers = filterActiveRecords(response.data || []);
          setCustomers(loadedCustomers.map(c => c.displayName || c.name || ""));
        }
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    loadCustomers();
  }, []);

  // Load taxes from API
  useEffect(() => {
    const loadTaxes = async () => {
      try {
        const response = await taxesAPI.getForTransactions("purchase");
        if (response && (response.code === 0 || response.success)) {
          const loadedTaxes = filterActiveRecords(response.data || response.taxes || []);
          if (Array.isArray(loadedTaxes) && loadedTaxes.length > 0) {
            setTaxes(loadedTaxes);
            return;
          }
        }
      } catch (error) {
        console.error("Error loading taxes:", error);
      }
      setTaxes(DEFAULT_TAX_OPTIONS);
    };
    loadTaxes();
  }, []);

  // Load items from API
  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await itemsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          const loadedItems = filterActiveRecords(response.data || []);
          setAllItems(loadedItems);
        }
      } catch (error) {
        console.error("Error loading items:", error);
      }
    };
    loadItems();
  }, []);

  // Load bill data if passed from BillDetail (Make Recurring action)
  useEffect(() => {
    if (billData && !isEdit && vendors.length > 0) {
      // Find the matching vendor from the vendors list
      const matchingVendor = vendors.find(
        v => (v.name || v.displayName) === billData.vendorName
      );

      setFormData(prev => ({
        ...prev,
        // Store the full vendor object if found, otherwise store the name string
        vendorName: matchingVendor || billData.vendorName || "",
        paymentTerms: billData.paymentTerms || "Due on Receipt",
        currency: resolvedBaseCurrency,
      }));

      if (billData.items && billData.items.length > 0) {
        setItems(billData.items.map((item: any, index: number) => ({
          id: Date.now() + index,
          itemDetails: item.itemDetails || "",
          account: item.account || billData.accountsPayable || "",
          quantity: item.quantity?.toString() || "1.00",
          rate: item.rate?.toString() || "0.00",
          tax: item.tax || "",
          customerDetails: item.customerDetails || "",
          amount: item.amount?.toString() || "0.00",
        })));
      }
    }
  }, [billData, isEdit, vendors]);

  // Load edit bill data if in edit mode
  useEffect(() => {
    if (isEdit && editBill) {
      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        // Convert "09 Dec 2025" format to "2025-12-09"
        if (dateString.includes(" ")) {
          const date = new Date(dateString);
          return date.toISOString().split("T")[0];
        }
        return dateString;
      };

      // Check if frequency is a custom format (e.g., "5 days", "3 weeks")
      const frequency = editBill.frequency || "Week";
      let repeatEvery = frequency;
      let customRepeatValue = editBill.customRepeatValue || "";
      let customRepeatUnit = editBill.customRepeatUnit || "days";

      // Parse custom frequency if it's in format like "5 days", "3 weeks", etc.
      if (frequency && !repeatEveryOptions.includes(frequency)) {
        const match = frequency.match(/^(\d+)\s+(days?|weeks?|months?|years?)$/i);
        if (match) {
          repeatEvery = "Custom";
          customRepeatValue = match[1];
          customRepeatUnit = match[2].toLowerCase();
          // Normalize plural forms
          if (customRepeatUnit.endsWith('s')) {
            customRepeatUnit = customRepeatUnit;
          } else {
            customRepeatUnit = customRepeatUnit + 's';
          }
        }
      }

      setFormData({
        vendorName: editBill.vendorName || "",
        profileName: editBill.profileName || "",
        repeatEvery: repeatEvery,
        customRepeatValue: customRepeatValue,
        customRepeatUnit: customRepeatUnit,
        startOn: formatDateForInput(editBill.startOn) || new Date().toISOString().split("T")[0],
        endsOn: editBill.endsOn ? formatDateForInput(editBill.endsOn) : "",
        neverExpires: editBill.neverExpires !== false,
        paymentTerms: editBill.paymentTerms || "Due on Receipt",
        taxLevel: editBill.taxLevel || "At Transaction Level",
        discount: editBill.discount || 0,
        adjustment: editBill.adjustment || 0,
        notes: editBill.notes || "",
        currency: resolvedBaseCurrency,
      });

      if (editBill.items && editBill.items.length > 0) {
        setItems(editBill.items.map((item, index) => ({
          id: item.id || Date.now() + index,
          itemDetails: item.itemDetails || "",
          account: item.account || "",
          quantity: item.quantity?.toString() || "1.00",
          rate: item.rate?.toString() || "0.00",
          tax: item.tax || "",
          customerDetails: item.customerDetails || "",
          amount: item.amount?.toString() || (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)).toFixed(2),
        })));
      }
    }
  }, [isEdit, editBill]);

  // Handle cloned recurring bill data from detail page
  useEffect(() => {
    if (!clonedData || isEdit) return;

    const frequency = clonedData.frequency || clonedData.repeatEvery || "Week";
    let repeatEvery = frequency;
    let customRepeatValue = "";
    let customRepeatUnit = "days";
    if (frequency?.toLowerCase().startsWith("every ")) {
      const parts = frequency.split(" ");
      customRepeatValue = parts[1] || "";
      customRepeatUnit = parts[2] || "days";
      repeatEvery = "Custom";
    }

    setFormData((prev: any) => ({
      ...prev,
      vendorName: clonedData.vendorName || prev.vendorName,
      profileName: clonedData.profileName || prev.profileName,
      repeatEvery,
      customRepeatValue,
      customRepeatUnit,
      startOn: formatDateForInput(clonedData.startOn) || new Date().toISOString().split("T")[0],
      endsOn: clonedData.endsOn ? formatDateForInput(clonedData.endsOn) : "",
      neverExpires: clonedData.neverExpires !== false,
      paymentTerms: clonedData.paymentTerms || "Due on Receipt",
      taxLevel: clonedData.taxLevel || "At Transaction Level",
      discount: clonedData.discount || 0,
      adjustment: clonedData.adjustment || 0,
      notes: clonedData.notes || "",
      currency: resolvedBaseCurrency,
      accountsPayable: clonedData.accountsPayable || prev.accountsPayable,
    }));

    if (clonedData.items && clonedData.items.length > 0) {
      setItems(clonedData.items.map((item: any, index: number) => ({
        id: Date.now() + index,
        itemDetails: item.itemDetails || item.name || "",
        account: item.account || "",
        quantity: String(item.quantity || "1.00"),
        rate: String(item.rate || "0.00"),
        tax: item.tax || "",
        customerDetails: item.customerDetails || "",
        amount: String(item.amount || "0.00"),
      })));
    }
  }, [clonedData, isEdit]);

  const repeatEveryOptions = [
    "Week",
    "2 Weeks",
    "Month",
    "2 Months",
    "3 Months",
    "6 Months",
    "Year",
    "2 Years",
    "3 Years",
    "Custom",
  ];

  const accounts = [
    { id: 1, name: "Office Supplies" },
    { id: 2, name: "Travel Expenses" },
    { id: 3, name: "Utilities" },
  ];

  const filteredVendors = vendors.filter((vendor) => {
    const searchTerm = vendorSearch.toLowerCase();
    const name = (vendor.name || vendor.displayName || "").toLowerCase();
    const email = (vendor.email || "").toLowerCase();
    const company = (vendor.company || vendor.companyName || "").toLowerCase();
    return name.includes(searchTerm) || email.includes(searchTerm) || company.includes(searchTerm);
  });

  // Vendor search handlers
  const handleVendorSearch = () => {
    const searchTerm = vendorSearchTerm.toLowerCase();
    let results: Vendor[] = [];

    if (vendorSearchCriteria === "Display Name") {
      results = allVendors.filter(vendor => {
        const displayName = vendor.displayName || vendor.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Email") {
      results = allVendors.filter(vendor => {
        const email = vendor.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (vendorSearchCriteria === "Company Name") {
      results = allVendors.filter(vendor => {
        const companyName = vendor.companyName || vendor.company || "";
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

  // Pagination helpers
  const itemsPerPage = 10;
  const vendorStartIndex = (vendorSearchPage - 1) * itemsPerPage;
  const vendorEndIndex = vendorStartIndex + itemsPerPage;
  const vendorPaginatedResults = vendorSearchResults.slice(vendorStartIndex, vendorEndIndex);
  const vendorTotalPages = Math.ceil(vendorSearchResults.length / itemsPerPage);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (vendorRef.current && !vendorRef.current.contains(target)) {
        setVendorDropdownOpen(false);
      }
      // Close vendor search criteria dropdown if clicking outside (but not if modal is open)
      if (!vendorSearchModalOpen && vendorSearchCriteriaOpen) {
        setVendorSearchCriteriaOpen(false);
      }
      if (repeatEveryRef.current && !repeatEveryRef.current.contains(target)) {
        setRepeatEveryOpen(false);
      }
      if (paymentTermsRef.current && !paymentTermsRef.current.contains(target)) {
        setPaymentTermsOpen(false);
        setPaymentTermsSearch("");
      }
      if (taxLevelRef.current && !taxLevelRef.current.contains(target)) {
        setTaxLevelOpen(false);
        setTaxLevelSearch("");
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(target)) {
        setBulkActionsDropdownOpen(false);
      }

      // Close account dropdowns
      Object.keys(accountDropdowns).forEach((itemId) => {
        if (accountDropdowns[itemId] && accountRefs.current[itemId] && !accountRefs.current[itemId]!.contains(target)) {
          setAccountDropdowns(prev => ({ ...prev, [itemId]: false }));
          setAccountSearches(prev => ({ ...prev, [itemId]: "" }));
        }
      });

      // Close customer dropdowns
      Object.keys(customerDropdowns).forEach((itemId) => {
        if (customerDropdowns[itemId] && customerRefs.current[itemId] && !customerRefs.current[itemId]!.contains(target)) {
          setCustomerDropdowns(prev => ({ ...prev, [itemId]: false }));
          setCustomerSearches(prev => ({ ...prev, [itemId]: "" }));
        }
      });

      // Close item dropdowns
      Object.keys(itemDropdownOpen).forEach((itemId) => {
        if (itemDropdownOpen[itemId] && itemRefs.current[itemId] && !itemRefs.current[itemId]!.contains(target)) {
          setItemDropdownOpen(prev => ({ ...prev, [itemId]: false }));
          setItemSearch(prev => ({ ...prev, [itemId]: "" }));
        }
      });

      // Close row menus
      Object.keys(rowMenuOpen).forEach((itemId) => {
        if (rowMenuOpen[itemId] && rowMenuRefs.current[itemId] && !rowMenuRefs.current[itemId]!.contains(target)) {
          setRowMenuOpen(prev => ({ ...prev, [itemId]: false }));
        }
      });

      // Close reporting tags
      Object.keys(itemReportingTagsOpen).forEach((itemId) => {
        if (itemReportingTagsOpen[itemId] && itemReportingTagsRefs.current[itemId] && !itemReportingTagsRefs.current[itemId]!.contains(target)) {
          setItemReportingTagsOpen(prev => ({ ...prev, [itemId]: false }));
        }
      });
      if (addRowMenuRef.current && !addRowMenuRef.current.contains(target)) {
        setAddRowMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [vendorSearchModalOpen, vendorSearchCriteriaOpen]);

  const handleItemChange = (itemId: string | number, field: keyof Item, value: string | number) => {
    setItems(prevItems => prevItems.map(item => {
      if (String(item.id) === String(itemId)) {
        const updated = { ...item, [field]: value };
        // Calculate amount
        if (field === "quantity" || field === "rate") {
          const qty = Number(updated.quantity || "0");
          const rate = Number(updated.rate || "0");
          updated.amount = (qty * rate).toFixed(2);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleItemSelect = (itemId: string | number, selectedItem: any) => {
    handleItemChange(itemId, "itemDetails", selectedItem.name);
    if (selectedItem.trackInventory && selectedItem.inventoryAccount) {
      handleItemChange(itemId, "account", selectedItem.inventoryAccount);
    } else if (selectedItem.purchaseAccount) {
      handleItemChange(itemId, "account", selectedItem.purchaseAccount);
    }
    if (selectedItem.costPrice) {
      handleItemChange(itemId, "rate", parseFloat(selectedItem.costPrice).toFixed(2));
    }
    setItemDropdownOpen(prev => ({ ...prev, [itemId]: false }));
    setItemSearch(prev => ({ ...prev, [itemId]: "" }));
  };

  const filteredItems = (itemId: string | number) => {
    const search = itemSearch[itemId.toString()] || "";
    if (!search) return allItems.slice(0, 10);
    return allItems.filter(item =>
      item.name?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  };

  const filteredAccounts = () => {
    const searchTerms = Object.values(accountSearches).join(" ").toLowerCase();
    if (!searchTerms) return expenseAccountsStructure;

    const filtered: Record<string, string[]> = {};
    Object.entries(expenseAccountsStructure).forEach(([category, accounts]) => {
      const filteredAccounts = accounts.filter(account =>
        account.toLowerCase().includes(searchTerms) ||
        category.toLowerCase().includes(searchTerms)
      );
      if (filteredAccounts.length > 0) {
        filtered[category] = filteredAccounts;
      }
    });
    return filtered as { [key: string]: string[] };
  };

  const filteredCustomers = (itemId: string | number) => {
    const search = customerSearches[itemId.toString()] || "";
    if (!search) return customers;
    return customers.filter(customer =>
      customer.toLowerCase().includes(search.toLowerCase())
    );
  };

  const addNewRow = () => {
    setItems([...items, {
      id: Date.now(),
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      tax: "",
      customerDetails: "",
      amount: "0.00",
    }]);
  };

  const removeRow = (itemId: string | number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const cloneRow = (itemId: string | number) => {
    const itemToClone = items.find(item => item.id === itemId);
    if (itemToClone) {
      const newItem = {
        ...itemToClone,
        id: Date.now(),
      };
      const index = items.findIndex(item => item.id === itemId);
      const newItems = [...items];
      newItems.splice(index + 1, 0, newItem);
      setItems(newItems);
    }
  };

  const insertNewRow = (itemId: string | number) => {
    const newItem = {
      id: Date.now(),
      itemDetails: "",
      account: "",
      quantity: "1.00",
      rate: "0.00",
      tax: "",
      customerDetails: "",
      amount: "0.00",
    };
    const index = items.findIndex(item => item.id === itemId);
    const newItems = [...items];
    newItems.splice(index + 1, 0, newItem);
    setItems(newItems);
  };

  const insertItemsInBulk = (itemId: string | number) => {
    // TODO: Implement bulk items modal
    setRowMenuOpen((prev) => ({ ...prev, [itemId]: false }));
    toast("Bulk item insert will be enabled in this form soon.", { icon: "i" });
  };

  const normalizeTaxRateToDecimal = (rawRate: number) => {
    if (!Number.isFinite(rawRate) || rawRate <= 0) return 0;
    // Support both formats from backend/settings:
    // 1) percent number (5 => 5%)
    // 2) decimal fraction (0.05 => 5%)
    return rawRate <= 1 ? rawRate : rawRate / 100;
  };

  const getTaxRateFromLabel = (taxLabel?: string) => {
    if (!taxLabel) return 0;
    const selected = String(taxLabel).trim();

    // First, resolve from loaded tax options by exact selected name.
    const taxObj = taxes.find((t: any) => String(t?.name || "").trim() === selected);
    if (taxObj) {
      const rawRate = Number(taxObj.rate ?? taxObj.taxRate ?? taxObj.tax_percentage ?? 0);
      const normalized = normalizeTaxRateToDecimal(rawRate);
      if (normalized > 0) return normalized;
    }

    // Fallback: extract from label text (e.g. "VAT [5%]" / "asc 0.05%")
    const match = selected.match(/(-?\d+(?:\.\d+)?)\s*%/);
    if (!match) return 0;
    const parsed = parseFloat(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return normalizeTaxRateToDecimal(parsed);
  };

  const getLineAmount = (item: Item) => {
    const qty = parseFloat(String(item.quantity || "0")) || 0;
    const rate = parseFloat(String(item.rate || "0")) || 0;
    return qty * rate;
  };

  const calculateSubTotal = () => {
    return items.reduce((sum, item) => sum + getLineAmount(item), 0);
  };

  const calculateDiscount = () => {
    const subTotal = calculateSubTotal();
    const discountPercent = Math.min(100, Math.max(0, Number(formData.discount) || 0));
    return (subTotal * discountPercent) / 100;
  };

  const calculateTaxTotal = () => {
    const subTotal = calculateSubTotal();
    if (subTotal <= 0) return 0;

    const discountAmount = calculateDiscount();
    const discountRatio = Math.min(1, Math.max(0, discountAmount / subTotal));
    const mode = String(taxMode || "Tax Exclusive").toLowerCase();
    const isInclusive = mode.includes("inclusive");

    return items.reduce((sum, item) => {
      const lineAmount = getLineAmount(item);
      if (lineAmount <= 0) return sum;
      const discountedLine = lineAmount * (1 - discountRatio);
      const taxRate = getTaxRateFromLabel(item.tax);
      if (taxRate <= 0) return sum;

      const taxAmount = isInclusive
        ? discountedLine - (discountedLine / (1 + taxRate))
        : discountedLine * taxRate;
      return sum + taxAmount;
    }, 0);
  };

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    const discount = calculateDiscount();
    const adjustment = Number(formData.adjustment) || 0;
    const taxTotal = calculateTaxTotal();
    const mode = String(taxMode || "Tax Exclusive").toLowerCase();
    const isInclusive = mode.includes("inclusive");

    return isInclusive
      ? (subTotal - discount + adjustment)
      : (subTotal - discount + taxTotal + adjustment);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const [isLoading, setIsLoading] = useState(false);

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "";
    }
  };

  const parseDateFromDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [day, month, year] = dateString.split("/");
    if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
      const parsed = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      // Validate the date
      const date = new Date(parsed);
      if (!isNaN(date.getTime())) {
        return parsed;
      }
    }
    return "";
  };

  return (
    <>
      <div className="w-full bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 m-0">{isEdit ? "Edit Recurring Bill" : "New Recurring Bill"}</h1>
        <button
          className="p-2 text-gray-500 bg-transparent border-none cursor-pointer rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
          onClick={() => navigate("/purchases/recurring-bills")}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white">
        <div className="px-6 py-6 w-full max-w-5xl">
            <div className="flex flex-col gap-5">
              {/* Row 1 */}
              <div className="flex items-center">
                <label className="w-[200px] text-sm font-medium text-red-600 flex items-center shrink-0">
                  Vendor Name<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative flex items-center gap-0 w-[400px]" ref={vendorRef}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="px-3 py-2 text-sm border border-gray-300 rounded-l-md rounded-r-none w-full box-border h-10 bg-white"
                      placeholder="Select a Vendor"
                      value={typeof formData.vendorName === 'string' ? formData.vendorName : (formData.vendorName as any)?.displayName || (formData.vendorName as any)?.name || ""}
                      readOnly
                      onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                    />
                  </div>
                  <button
                    type="button"
                    className="p-2.5 bg-[#156372] text-white border-none rounded-r-md rounded-l-none cursor-pointer flex items-center justify-center h-10 w-10 shrink-0 hover:bg-[#0D4A52] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVendorSearchModalOpen(true);
                    }}
                  >
                    <Search size={16} />
                  </button>
                  {vendorDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md z-[100] min-w-[400px] w-full">
                      <div className="p-2 border-b border-gray-200 flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search vendor"
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          className="flex-1 border-none outline-none text-sm"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[250px] overflow-y-auto py-1">
                        {filteredVendors.length > 0 ? (
                          filteredVendors.map((vendor) => (
                            <button
                              key={vendor.id}
                              type="button"
                              className="px-4 py-2 text-sm text-gray-900 cursor-pointer border-none bg-transparent w-full text-left hover:bg-gray-50 flex items-center gap-3"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, vendorName: vendor }));
                                setVendorDropdownOpen(false);
                                setVendorSearch("");
                              }}
                            >
                              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {vendor.avatar || (vendor.name || vendor.displayName || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {vendor.name || vendor.displayName || "Unnamed Vendor"}
                                </div>
                                {vendor.email && (
                                  <div className="text-xs text-gray-500 truncate">{vendor.email}</div>
                                )}
                                {vendor.company && (
                                  <div className="text-xs text-gray-500 truncate">{vendor.company}</div>
                                )}
                              </div>
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
                            setVendorDropdownOpen(false);
                            navigate("/purchases/vendors/new");
                          }}
                        >
                          <Plus size={16} />
                          + New Vendor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center">
                <label className="w-[200px] text-sm font-medium text-gray-700 flex items-center shrink-0">
                  Location
                </label>
                <div className="relative w-[400px]">
                  <LocationSelectDropdown
                    value={warehouseLocation}
                    options={locations}
                    onSelect={(option) => setWarehouseLocation(option.id)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="w-full h-px bg-gray-100 my-2"></div>

              <div className="flex items-center">
                <label className="w-[200px] text-sm font-medium text-red-600 flex items-center shrink-0">
                  Profile Name<span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md w-[400px] box-border h-10 outline-none focus:border-teal-600"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <label className="w-[200px] text-sm font-medium text-red-600 flex items-center shrink-0">
                  Repeat Every<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="flex gap-2 items-start w-[400px]">
                  <div className="relative flex-1" ref={repeatEveryRef}>
                    <button
                      className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between outline-none hover:border-teal-600"
                      onClick={() => setRepeatEveryOpen(!repeatEveryOpen)}
                    >
                      {formData.repeatEvery}
                      {repeatEveryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {repeatEveryOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-md z-[100] max-h-[300px] overflow-y-auto">
                        {repeatEveryOptions.map((option) => (
                          <div
                            key={option}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                              setFormData({ ...formData, repeatEvery: option });
                              setRepeatEveryOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.repeatEvery === "Custom" && (
                    <div className="flex gap-2 items-center flex-1">
                      <input
                        type="number"
                        min="1"
                        className="px-3 py-2 text-sm border border-teal-600 rounded-md w-24 box-border h-10 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        placeholder="1"
                        value={formData.customRepeatValue}
                        onChange={(e) => setFormData({ ...formData, customRepeatValue: e.target.value })}
                      />
                      <select
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer flex-1 box-border h-10"
                        value={formData.customRepeatUnit}
                        onChange={(e) => setFormData({ ...formData, customRepeatUnit: e.target.value })}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center">
                <label className="w-[200px] text-sm font-medium text-gray-700 flex items-center shrink-0">
                  Start On
                </label>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-[200px]">
                    <DatePicker
                      value={formatDateForDisplay(formData.startOn)}
                      onChange={(dateString) => {
                        const parsed = parseDateFromDisplay(dateString);
                        if (parsed) setFormData({ ...formData, startOn: parsed });
                      }}
                      placeholder="dd/MM/yyyy"
                    />
                  </div>
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Ends On</label>
                  <div className="w-[160px]">
                    <DatePicker
                      value={formData.neverExpires ? "" : formatDateForDisplay(formData.endsOn)}
                      onChange={(dateString) => {
                        const parsed = parseDateFromDisplay(dateString);
                        setFormData({ ...formData, endsOn: parsed, neverExpires: false });
                      }}
                      placeholder="dd/MM/yyyy"
                      minDate={formData.startOn ? new Date(formData.startOn) : undefined} // End date cannot be before start date
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-teal-600"
                      checked={formData.neverExpires}
                      onChange={(e) => setFormData({ ...formData, neverExpires: e.target.checked, endsOn: e.target.checked ? "" : formData.endsOn })}
                    />
                    <label className="text-sm text-gray-700 cursor-pointer whitespace-nowrap" onClick={() => setFormData({ ...formData, neverExpires: !formData.neverExpires, endsOn: !formData.neverExpires ? "" : formData.endsOn })}>Never Expires</label>
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center">
                <div className="w-[200px] flex items-center shrink-0">
                  <label className="text-sm font-medium text-gray-700 mr-1">Accounts Payable</label>
                  <div className="relative group">
                    <Info size={14} className="text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Select the Accounts Payable account to track this bill
                    </div>
                  </div>
                </div>
                <div className="relative w-[400px]">
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm outline-none bg-white cursor-pointer focus:border-teal-600 hover:border-teal-600 appearance-none h-10"
                    value={formData.accountsPayable}
                    onChange={(e) => setFormData({ ...formData, accountsPayable: e.target.value })}
                  >
                    {accountsPayableList.length === 0 && (
                      <option value="">Loading accounts...</option>
                    )}
                    {accountsPayableList.map((account) => (
                      <option key={account.id || account._id} value={account.name}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {/* Row 5 */}
              <div className="flex items-center">
                <label className="w-[200px] text-sm font-medium text-gray-700 flex items-center shrink-0">
                  Payment Terms
                </label>
                <div className="w-[400px]">
                  <PaymentTermsDropdown
                    value={formData.paymentTerms}
                    onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                    onConfigureTerms={() => setShowConfigurePaymentTermsModal(true)}
                    customTerms={paymentTermsList.map(term => ({
                      id: term.name,
                      label: term.name,
                      value: term.name,
                      days: term.days,
                      isDefault: term.isDefault
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Item Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 border-b-0 rounded-t-md">
              <h3 className="text-[28px] font-semibold text-gray-900 leading-none">Item Table</h3>
              <div className="relative" ref={bulkActionsRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBulkActionsDropdownOpen(!bulkActionsDropdownOpen);
                  }}
                  className="px-3 py-1.5 text-sm text-teal-700 bg-transparent border-none cursor-pointer flex items-center gap-2 hover:bg-teal-50 rounded transition-colors"
                >
                  <Check size={16} className="text-teal-700" />
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
                    {/* Bulk Actions Option */}
                    <div
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: selectedBulkAction === "Bulk Actions" ? "#ffffff" : "#111827",
                        backgroundColor: selectedBulkAction === "Bulk Actions" ? "#156372" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBulkAction("Bulk Actions");
                        setBulkActionsDropdownOpen(false);
                      }}
                      onMouseEnter={(e) => {
                        if (selectedBulkAction !== "Bulk Actions") {
                          const target = e.currentTarget as HTMLElement;
                          target.style.backgroundColor = "#156372";
                          target.style.color = "#ffffff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        if (selectedBulkAction !== "Bulk Actions") {
                          target.style.backgroundColor = "transparent";
                          target.style.color = "#111827";
                        } else {
                          target.style.backgroundColor = "#156372";
                          target.style.color = "#ffffff";
                        }
                      }}
                    >
                      <Check size={16} style={{ color: selectedBulkAction === "Bulk Actions" ? "#ffffff" : "#156372" }} />
                      Bulk Actions
                    </div>
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
                          const target = e.currentTarget as HTMLElement;
                          target.style.backgroundColor = "#156372";
                          target.style.color = "#ffffff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        if (selectedBulkAction !== "Bulk Update Line Items") {
                          target.style.backgroundColor = "transparent";
                          target.style.color = "#111827";
                        } else {
                          target.style.backgroundColor = "#156372";
                          target.style.color = "#ffffff";
                        }
                      }}
                    >
                      Bulk Update Line Items
                    </div>
                    {/* Show/Hide Additional Information Option */}
                    <div
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: selectedBulkAction === "Hide All Additional Information" || selectedBulkAction === "Show All Additional Information" ? "#ffffff" : "#374151",
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
                          const target = e.currentTarget as HTMLElement;
                          target.style.backgroundColor = "#156372";
                          target.style.color = "#ffffff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        const actionText = showAdditionalFields ? "Hide All Additional Information" : "Show All Additional Information";
                        const target = e.currentTarget as HTMLElement;
                        if (selectedBulkAction !== actionText) {
                          target.style.backgroundColor = "transparent";
                          target.style.color = "#374151";
                        } else {
                          target.style.backgroundColor = "#156372";
                          target.style.color = "#ffffff";
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
                backgroundColor: "#ecfdf5",
                padding: "12px 16px",
                borderRadius: "6px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid #99f6e4",
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
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#0D4A52";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#156372";
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
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <table className="w-full border-collapse border border-gray-200 border-t-0">
              <thead className="bg-white">
                <tr className="border-b border-gray-200">
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-left uppercase" style={{ width: "30%" }}>
                    ITEM DETAILS
                  </th>
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-left uppercase" style={{ width: "20%" }}>ACCOUNT</th>
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-right uppercase" style={{ width: "10%" }}>QUANTITY</th>
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-right uppercase" style={{ width: "12%" }}>RATE</th>
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-left uppercase" style={{ width: "12%" }}>TAX</th>
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-left uppercase" style={{ width: "13%" }}>CUSTOMER DETAILS</th>
                  <th className="p-2 text-xs font-semibold tracking-wide text-gray-600 text-right uppercase" style={{ width: "10%" }}>AMOUNT</th>
                  <th className="p-2" style={{ width: "3%" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  if (!accountRefs.current[item.id]) accountRefs.current[item.id] = { current: null };
                  if (!customerRefs.current[item.id]) customerRefs.current[item.id] = { current: null };

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-gray-200">
                        <td className="p-2 text-sm">
                          <div className="relative flex items-center gap-2" ref={(el) => {
                            if (!itemRefs.current[item.id]) itemRefs.current[item.id] = { current: null };
                            itemRefs.current[item.id].current = el;
                          }}>
                            <div className="flex flex-col gap-1 cursor-move" style={{ padding: "4px 2px" }}>
                              <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                              <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                              <div style={{ width: "3px", height: "3px", borderRadius: "1px", backgroundColor: "#6b7280" }}></div>
                            </div>
                            <ImageIcon size={16} className="text-gray-400" />
                            <input
                              type="text"
                              value={item.itemDetails}
                              onChange={(e) => {
                                handleItemChange(item.id, "itemDetails", e.target.value);
                                setItemSearch((prev) => ({ ...prev, [item.id]: e.target.value }));
                                setItemDropdownOpen((prev) => ({ ...prev, [item.id]: true }));
                              }}
                              onFocus={() => setItemDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                              onClick={() => setItemDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                              className="flex-1 px-2 py-1.5 border rounded text-sm outline-none box-border"
                              style={{
                                borderColor: itemDropdownOpen[item.id] ? "#156372" : "#d1d5db"
                              }}
                              placeholder="Type or click to select an item."
                            />
                            {itemDropdownOpen[item.id] && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[100] max-h-[300px] overflow-y-auto" style={{ marginLeft: "40px" }}>
                                {filteredItems(item.id).length > 0 ? (
                                  filteredItems(item.id).map((itemOption, idx) => (
                                    <div
                                      key={itemOption.id || `item-${idx}`}
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
                                            <span>Purchase Rate: {resolvedBaseCurrencySymbol} {(itemOption.costPrice || 0).toFixed(2)}</span>
                                          </div>
                                        </div>
                                        {itemOption.trackInventory && (
                                          <div className="text-right ml-4 flex-shrink-0">
                                            <div className="text-[9px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                                              Stock on Hand
                                            </div>
                                            <div className={`text-xs font-semibold ${itemOption.stockQuantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                              {(itemOption.stockQuantity || 0).toFixed(2)} {itemOption.unit || ''}
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
                                  className="px-3 py-2 border-t border-gray-200 bg-gray-50 cursor-pointer text-sm flex items-center gap-2 hover:bg-teal-50"
                                  style={{ color: "#156372" }}
                                  onClick={() => {
                                    setItemDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                    // TODO: Open new item modal
                                  }}
                                >
                                  <Plus size={16} />
                                  Add New Item
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-sm">
                          <div className="relative" ref={accountRefs.current[item.id]}>
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
                                    width: buttonRect.width
                                  }
                                }));
                                setAccountDropdowns(prev => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }));
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none bg-white cursor-pointer flex items-center justify-between"
                            >
                              <span className={item.account ? "" : "text-gray-400"}>
                                {item.account || "Select an account"}
                              </span>
                              {accountDropdowns[item.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {accountDropdowns[item.id] && accountDropdownPosition[item.id] && createPortal(
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
                                <div className="px-3 py-2 border-b border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <Search size={14} className="text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search"
                                      value={accountSearches[item.id] || ""}
                                      onChange={(e) => {
                                        setAccountSearches(prev => ({
                                          ...prev,
                                          [item.id]: e.target.value
                                        }));
                                      }}
                                      className="flex-1 border-none outline-none text-sm"
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto py-1">
                                  {Object.keys(filteredAccounts()).length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                      No accounts found
                                    </div>
                                  ) : (
                                    Object.entries(filteredAccounts()).map(([category, accounts]) => (
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
                                              e.currentTarget.style.backgroundColor = "#f0fdfa";
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
                                      // TODO: Open new account modal
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
                        <td className="p-2 text-sm">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none box-border text-right"
                          />
                        </td>
                        <td className="p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm outline-none box-border text-right"
                            />
                            <Calculator size={16} className="text-gray-400" />
                          </div>
                        </td>
                        <td className="p-2 text-sm">
                          <select
                            value={item.tax || ""}
                            onChange={(e) => handleItemChange(item.id, "tax", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none bg-white cursor-pointer focus:border-teal-600 hover:border-teal-600 appearance-none"
                          >
                            <option value="">Select Tax</option>
                            {taxes.map((tax: any) => (
                              <option key={tax.id || tax._id || tax.name} value={tax.name || ""}>
                                {`${tax.name || ""}${tax?.rate !== undefined && tax?.rate !== null ? ` [${Number(tax.rate)}%]` : ""}`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-sm">
                          <div className="relative" ref={customerRefs.current[item.id]}>
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
                                    width: buttonRect.width
                                  }
                                }));
                                setCustomerDropdowns(prev => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }));
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none bg-white cursor-pointer flex items-center justify-between"
                            >
                              <span className={item.customerDetails ? "" : "text-gray-400"}>
                                {item.customerDetails || "Select Customer"}
                              </span>
                              {customerDropdowns[item.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {customerDropdowns[item.id] && customerDropdownPosition[item.id] && createPortal(
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
                                <div className="px-3 py-2 border-b border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <Search size={14} className="text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search"
                                      value={customerSearches[item.id] || ""}
                                      onChange={(e) => {
                                        setCustomerSearches(prev => ({
                                          ...prev,
                                          [item.id]: e.target.value
                                        }));
                                      }}
                                      className="flex-1 border-none outline-none text-sm"
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto py-1">
                                  {filteredCustomers(item.id).length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                      No customers found
                                    </div>
                                  ) : (
                                    filteredCustomers(item.id).map((customer) => {
                                      const isSelected = item.customerDetails === customer;
                                      return (
                                        <div
                                          key={customer}
                                          onClick={() => {
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
                                    // TODO: Open new customer modal
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
                        <td className="p-2 text-sm" style={{ position: "relative", overflow: "visible" }}>
                          <div className="flex items-center gap-2" style={{ justifyContent: "flex-end" }}>
                            <input
                              type="text"
                              value={getLineAmount(item).toFixed(2)}
                              readOnly
                              className="px-2 py-1.5 border border-gray-300 rounded text-sm outline-none box-border bg-white text-right"
                              style={{ width: "80px", minWidth: "80px" }}
                            />
                            <div style={{ position: "relative", zIndex: rowMenuOpen[item.id] ? 2000 : "auto" }} ref={(el) => (rowMenuRefs.current[item.id] = el)}>
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
                                    marginTop: "4px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                    zIndex: 9999,
                                    minWidth: "220px",
                                    overflow: "hidden",
                                  }}>
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      color: showAdditionalFields ? "#111827" : "#ffffff",
                                      backgroundColor: showAdditionalFields ? "transparent" : "#156372",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (showAdditionalFields) {
                                        setShowAdditionalFields(false);
                                        setShowBanner(true);
                                      } else {
                                        setShowAdditionalFields(true);
                                        setShowBanner(false);
                                      }
                                      setRowMenuOpen((prev) => ({ ...prev, [item.id]: false }));
                                    }}
                                    onMouseEnter={(e) => {
                                      const target = e.currentTarget as HTMLElement;
                                      if (!showAdditionalFields) {
                                        target.style.backgroundColor = "#0D4A52";
                                      } else {
                                        target.style.backgroundColor = "#156372";
                                        target.style.color = "#ffffff";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      const target = e.currentTarget as HTMLElement;
                                      if (!showAdditionalFields) {
                                        target.style.backgroundColor = "#156372";
                                        target.style.color = "#ffffff";
                                      } else {
                                        target.style.backgroundColor = "transparent";
                                        target.style.color = "#111827";
                                      }
                                    }}
                                  >
                                    {showAdditionalFields ? "Hide Additional Information" : "Show Additional Information"}
                                  </div>
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      color: "#111827",
                                      backgroundColor: "transparent",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cloneRow(item.id);
                                      setRowMenuOpen((prev) => ({ ...prev, [item.id]: false }));
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = "#f9fafb";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Clone
                                  </div>
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      color: "#111827",
                                      backgroundColor: "transparent",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      insertNewRow(item.id);
                                      setRowMenuOpen((prev) => ({ ...prev, [item.id]: false }));
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = "#f9fafb";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Insert New Row
                                  </div>
                                  <div
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      color: "#111827",
                                      backgroundColor: "transparent",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      insertItemsInBulk(item.id);
                                      setRowMenuOpen((prev) => ({ ...prev, [item.id]: false }));
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = "#f9fafb";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Insert Items in Bulk
                                  </div>
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
                          <td colSpan={6} className="p-2" style={{ borderTop: "none", paddingTop: "0" }}>
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              gap: "16px",
                              alignItems: "center",
                              paddingLeft: "44px",
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
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemReportingTagsOpen((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id]
                                    }));
                                  }}
                                >
                                  <span style={{ fontSize: "14px", color: "#6b7280" }}>Reporting Tags</span>
                                  <ChevronDown size={14} style={{ color: "#6b7280" }} />
                                  {itemReportingTagsOpen[item.id] && itemReportingTagsRefs.current[item.id] && typeof document !== 'undefined' && document.body && createPortal(
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: "fixed",
                                        top: `${itemReportingTagsRefs.current[item.id].getBoundingClientRect().bottom + 4}px`,
                                        left: `${itemReportingTagsRefs.current[item.id].getBoundingClientRect().left}px`,
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                        zIndex: 10000,
                                        minWidth: "300px",
                                        padding: "16px",
                                      }}
                                    >
                                      <div style={{
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        color: "#111827",
                                        marginBottom: "12px",
                                      }}>
                                        Reporting Tags
                                      </div>
                                      <div style={{
                                        fontSize: "14px",
                                        color: "#6b7280",
                                        marginBottom: "16px",
                                        lineHeight: "1.5",
                                      }}>
                                        There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setItemReportingTagsOpen((prev) => ({
                                            ...prev,
                                            [item.id]: false
                                          }));
                                        }}
                                        style={{
                                          padding: "6px 16px",
                                          fontSize: "14px",
                                          color: "#111827",
                                          backgroundColor: "#f3f4f6",
                                          border: "1px solid #d1d5db",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                          width: "100%",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = "#e5e7eb";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = "#f3f4f6";
                                        }}
                                      >
                                        OK
                                      </button>
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
            <div className="flex justify-between items-start mt-3 gap-8">
              {/* Left Side - Buttons stacked vertically */}
              <div className="flex flex-col gap-3">
                {/* Add New Row Button */}
                <div className="relative" ref={addRowMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAddRowMenuOpen(!addRowMenuOpen)}
                    className="px-4 py-2 text-sm bg-white text-[#156372] rounded-md border border-gray-200 cursor-pointer flex items-center gap-2 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <Plus size={16} className="text-[#156372]" />
                    Add New Row
                    <ChevronDown size={14} />
                  </button>
                  {addRowMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[10000] min-w-[200px] py-1">
                      <button
                        type="button"
                        onClick={() => {
                          addNewRow();
                          setAddRowMenuOpen(false);
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
                          setAddRowMenuOpen(false);
                          // TODO: Open bulk items modal
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
              <div className="w-[450px] flex-shrink-0 ml-auto">
                <div className="flex flex-col gap-3">
                  {/* Sub Total */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Sub Total</span>
                    <span className="text-gray-900 font-semibold">{calculateSubTotal().toFixed(2)}</span>
                  </div>

                  {/* Discount */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Discount</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-l text-sm outline-none text-right bg-white focus:border-teal-600"
                          min="0"
                          max="100"
                        />
                        <span className="px-2 py-1 border border-l-0 border-gray-300 rounded-r bg-white text-gray-500 text-xs">%</span>
                      </div>
                      <span className="text-gray-900 font-medium w-24 text-right">{calculateDiscount().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Tax */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">
                      Tax {String(taxMode || "").toLowerCase().includes("inclusive") ? "(Included)" : ""}
                    </span>
                    <span className="text-gray-900 font-medium">{calculateTaxTotal().toFixed(2)}</span>
                  </div>

                  {/* Adjustment */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600 font-medium">Adjustment</span>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.adjustment}
                        onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm outline-none text-right bg-white focus:border-teal-600"
                      />
                      <span className="text-gray-900 font-medium w-24 text-right">{formData.adjustment.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-1">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-base font-bold text-gray-900">{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Notes */}
          <div className="mt-8 px-6 py-4">
            <div className="flex flex-col gap-2 max-w-[600px]">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                className="px-3 py-2 text-sm border border-gray-300 rounded-md w-full min-h-[100px] resize-y font-inherit outline-none focus:border-teal-600"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes..."
              />
              <div className="text-[11px] text-gray-400">It will not be shown in PDF</div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="px-6 py-6 border-t border-gray-100 flex gap-3 bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
              </div>
            ) : (
              <>
                <button
                  className="px-5 py-2.5 text-sm font-medium rounded-md border border-teal-700 cursor-pointer bg-[#156372] text-white hover:bg-[#0D4A52] transition-colors"
                  onClick={() => {
                    if (isLoading) return;
                    setIsLoading(true);
                    // Calculate next bill date based on frequency
                    const calculateNextBillDate = (startDate, frequency, customValue, customUnit) => {
                      const start = new Date(startDate);
                      let nextDate = new Date(start);

                      if (frequency === "Custom" && customValue) {
                        const value = parseInt(customValue) || 1;
                        switch (customUnit) {
                          case "days":
                            nextDate.setDate(start.getDate() + value);
                            break;
                          case "weeks":
                            nextDate.setDate(start.getDate() + (value * 7));
                            break;
                          case "months":
                            nextDate.setMonth(start.getMonth() + value);
                            break;
                          case "years":
                            nextDate.setFullYear(start.getFullYear() + value);
                            break;
                          default:
                            nextDate.setDate(start.getDate() + value);
                        }
                      } else {
                        switch (frequency) {
                          case "Week":
                            nextDate.setDate(start.getDate() + 7);
                            break;
                          case "2 Weeks":
                            nextDate.setDate(start.getDate() + 14);
                            break;
                          case "Month":
                            nextDate.setMonth(start.getMonth() + 1);
                            break;
                          case "2 Months":
                            nextDate.setMonth(start.getMonth() + 2);
                            break;
                          case "3 Months":
                            nextDate.setMonth(start.getMonth() + 3);
                            break;
                          case "6 Months":
                            nextDate.setMonth(start.getMonth() + 6);
                            break;
                          case "Year":
                            nextDate.setFullYear(start.getFullYear() + 1);
                            break;
                          case "2 Years":
                            nextDate.setFullYear(start.getFullYear() + 2);
                            break;
                          case "3 Years":
                            nextDate.setFullYear(start.getFullYear() + 3);
                            break;
                          default:
                            nextDate.setDate(start.getDate() + 7);
                        }
                      }

                      return nextDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                    };

                    const formatDate = (dateString) => {
                      if (!dateString) return "";
                      const date = new Date(dateString);
                      return date.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                    };

                    const recurringBill = {
                      profile_name: formData.profileName || "Recurring Bill Profile",
                      repeat_every: formData.repeatEvery === "Custom"
                        ? `${formData.customRepeatValue || 1} ${formData.customRepeatUnit || "days"}`
                        : formData.repeatEvery,
                      start_date: formData.startOn || new Date().toISOString().split('T')[0],
                      end_date: formData.neverExpires ? null : formData.endsOn,
                      never_expire: formData.neverExpires,
                      accounts_payable: formData.accountsPayable,
                      vendor: typeof formData.vendorName === 'object' ? (formData.vendorName as any)._id || (formData.vendorName as any).id : null,
                      vendor_name: typeof formData.vendorName === 'string' ? formData.vendorName : (formData.vendorName as any)?.displayName || (formData.vendorName as any)?.name,
                      items: items.map(item => ({
                        name: item.itemDetails,
                        description: item.description,
                        quantity: parseFloat(item.quantity) || 0,
                        unitPrice: parseFloat(item.rate) || 0,
                        total: getLineAmount(item),
                        account: item.account,
                        tax: item.tax || ""
                      })),
                      subtotal: calculateSubTotal(),
                      tax: calculateTaxTotal(),
                      tax_mode: taxMode,
                      tax_level: formData.taxLevel,
                      discount: formData.discount || 0,
                      total: calculateTotal(),
                      currency: formData.currency,
                      paymentTerms: formData.paymentTerms,
                      notes: formData.notes,
                      status: "active"
                    };

                    // Validate required fields
                    if (!recurringBill.profile_name) {
                      toast.error("Please enter a profile name");
                      setIsLoading(false);
                      return;
                    }
                    if (!recurringBill.repeat_every) {
                      toast.error("Please select repeat frequency");
                      setIsLoading(false);
                      return;
                    }
                    if (!recurringBill.start_date) {
                      toast.error("Please select a start date");
                      setIsLoading(false);
                      return;
                    }
                    if (!recurringBill.vendor) {
                      toast.error("Please select a vendor from the dropdown");
                      setIsLoading(false);
                      return;
                    }
                    if (!recurringBill.total || recurringBill.total <= 0) {
                      toast.error("Total amount must be greater than zero");
                      setIsLoading(false);
                      return;
                    }


                    // Call API
                    const savePromise = isEdit && editBill
                      ? recurringBillsAPI.update(editBill.id || editBill._id, recurringBill)
                      : recurringBillsAPI.create(recurringBill);

                    savePromise
                      .then(async (response) => {
                        if (response && (response.code === 0 || response.success)) {
                          const recurringBillId = response.recurring_bill?._id || response.data?._id;

                          // Automatically generate the first bill
                          if (!isEdit && recurringBillId) {
                            try {
                              await recurringBillsAPI.generateBill(recurringBillId);
                            } catch (genError) {
                              console.error("Error generating initial bill:", genError);
                            }
                          }

                          toast.success(`Recurring bill ${isEdit ? "updated" : "created"} successfully ${!isEdit ? "and initial bill generated" : ""}`);
                          setIsLoading(false);
                          navigate("/purchases/recurring-bills");
                        } else {
                          throw new Error(response?.message || "Operation failed");
                        }
                      })
                      .catch((error) => {
                        console.error("Error saving recurring bill:", error);
                        toast.error(error.message || "Failed to save recurring bill");
                        setIsLoading(false);
                      });
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
                <button
                  className="px-5 py-2.5 text-sm font-medium rounded-md border border-gray-300 cursor-pointer bg-white text-gray-900 hover:bg-gray-50 transition-colors"
                  onClick={() => navigate("/purchases/recurring-bills")}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

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
                <div className="relative">
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
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-[#156372] hover:text-white"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-teal-600"
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
                        key={vendor.id || vendor.name}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setFormData({ ...formData, vendorName: vendor });
                          setVendorSearchModalOpen(false);
                          setVendorSearchTerm("");
                          setVendorSearchResults([]);
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-teal-700 hover:underline">
                          {vendor.displayName || vendor.name || ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.email || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vendor.companyName || vendor.company || ""}</td>
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

      {/* Configure Payment Terms Modal */}
      {showConfigurePaymentTermsModal && typeof document !== 'undefined' && document.body && createPortal(
        <ConfigurePaymentTermsModal
          paymentTerms={paymentTermsList}
          onClose={() => setShowConfigurePaymentTermsModal(false)}
          onSave={(updatedTerms) => {
            setPaymentTermsList(updatedTerms);
            localStorage.setItem("paymentTerms", JSON.stringify(updatedTerms));
            const defaultTerm = updatedTerms.find(term => term.isDefault) || updatedTerms[0];
            if (defaultTerm) {
              setFormData(prev => ({ ...prev, paymentTerms: defaultTerm.name }));
            }
            setShowConfigurePaymentTermsModal(false);
          }}
        />,
        document.body
      )}
    </>
  );
}


