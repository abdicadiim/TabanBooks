import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Edit3,
  Upload as UploadIcon,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Info,
  MoreVertical,
  Calendar,
  Check,
  Image as ImageIcon,
  FileText,
  Bookmark,
  File,
  Trash2,
} from "lucide-react";
import DatePicker from "../../../components/DatePicker";
import NewVendorModal from "../bills/NewVendorModal";
import { vendorsAPI, customersAPI, expensesAPI, chartOfAccountsAPI, bankAccountsAPI, journalEntriesAPI, projectsAPI, currenciesAPI as dbCurrenciesAPI, taxesAPI } from "../../../services/api";
import NewCurrencyModal from "../../settings/organization-settings/setup-configurations/currencies/NewCurrencyModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";
import { getBankAccountsFromResponse, getChartAccountsFromResponse, mergeAccountOptions } from "../shared/accountOptions";

// Currency API
const currenciesAPI = {
  getAll: async () => {
    const response = await fetch('/api/settings/currencies?isActive=true', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
    return response.json();
  },
};

// Accounts API
const accountsAPI = {
  getAll: async () => {
    const response = await fetch('/api/accounting/chart-of-accounts', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch('/api/accounting/chart-of-accounts', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

const EXPENSE_ACCOUNTS_STRUCTURE = {
  "Cost Of Goods Sold": [
    "Cost of Goods Sold"
  ],
  "Expense": [
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
    "Parking",
    "Postage",
    "Printing and Stationery",
    "Purchase Discounts",
    "Rent Expense",
    "Repairs and Maintenance",
    "Salaries and Employee Wages",
    "Telephone Expense",
    "Travel Expense"
  ],
  "Other Current Liability": [
    "Employee Reimbursements",
    "VAT Payable"
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

const ACCOUNT_TYPES_STRUCTURE = {
  "Asset": [
    "Other Asset",
    "Other Current Asset",
    "Fixed Asset",
    "Intangible Asset",
    "Non Current Asset"
  ],
  "Liability": [
    "Other Current Liability",
    "Non Current Liability",
    "Other Liability"
  ],
  "Expense": [
    "Expense",
    "Cost of Goods Sold",
    "Other Expense"
  ]
};

const ACCOUNT_TYPE_DESCRIPTIONS = {
  "Fixed Asset": {
    title: "Asset",
    description: "Any long term investment or an asset that cannot be converted into cash easily like:",
    points: ["Land and Buildings", "Plant, Machinery and Equipment", "Computers", "Furniture"]
  },
  "Other Asset": {
    title: "Other Asset",
    description: "Assets that do not fall under Fixed Assets or Current Assets.",
    points: ["Security Deposits", "Prepaid long-term expenses"]
  },
  "Other Current Asset": {
    title: "Other Current Asset",
    description: "Assets that can be converted into cash within one year.",
    points: ["Prepaid expenses", "Inventory"]
  },
  "Intangible Asset": {
    title: "Intangible Asset",
    description: "Assets that are not physical in nature.",
    points: ["Patents", "Copyrights"]
  },
  "Non Current Asset": {
    title: "Non Current Asset",
    description: "Long term investments.",
    points: ["Long term investments"]
  },
  "Expense": {
    title: "Expense",
    description: "Costs incurred for the day-to-day operation of the business.",
    points: ["Rent", "Salaries", "Utilities"]
  },
  "Cost of Goods Sold": {
    title: "COGS",
    description: "Direct costs attributable to the production of the goods sold in a company.",
    points: ["Material costs", "Direct labor"]
  },
  "Other Expense": {
    title: "Other Expense",
    description: "Expenses that are not directly related to the main business.",
    points: ["Exchange gain or loss"]
  },
  "Other Current Liability": {
    title: "Other Current Liability",
    description: "Short-term financial obligations that do not fit into other liability categories.",
    points: ["Short term loans", "Sales Tax Payable"]
  },
  "Non Current Liability": {
    title: "Non Current Liability",
    description: "Long term financial obligations.",
    points: ["Long term loans"]
  },
  "Other Liability": {
    title: "Other Liability",
    description: "Miscellaneous liabilities.",
    points: ["Tax payable"]
  }
};

const PAID_THROUGH_STRUCTURE = {
  "Cash": [
    "Petty Cash",
    "Undeposited Funds"
  ],
  "Other Current Asset": [
    "Advance Tax",
    "Employee Advance",
    "Prepaid Expenses"
  ],
  "Fixed Asset": [
    "Furniture and Equipment"
  ],
  "Other Current Liability": [
    "Employee Reimbursements"
  ],
  "Equity": [
    "Drawings",
    "Opening Balance Offset",
    "Owner's Equity"
  ]
};

const VENDORS_LIST = [
  "Vendor A",
  "Vendor B",
  "Vendor C",
  "Sample Vendor"
];

const CUSTOMERS_LIST = [
  "KOWNI",
  "Customer A",
  "Customer B",
  "Sample Customer"
];

export default function RecordExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const expenseAccountRef = useRef(null);
  const customerRef = useRef(null);
  const uploadDropdownRef = useRef(null);
  const paidThroughRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);
  const [expenseAccountSearch, setExpenseAccountSearch] = useState("");

  // Parent account dropdown state
  const [parentAccountOpen, setParentAccountOpen] = useState(false);
  const [parentAccountSearch, setParentAccountSearch] = useState("");

  // Paid Through dropdown state
  const [paidThroughOpen, setPaidThroughOpen] = useState(false);
  const [paidThroughSearch, setPaidThroughSearch] = useState("");

  // Vendor dropdown state
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");

  // Customer dropdown state
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [newVendorModalOpen, setNewVendorModalOpen] = useState(false);
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [associateTagsModalOpen, setAssociateTagsModalOpen] = useState(false);
  const [vendorSearchModalOpen, setVendorSearchModalOpen] = useState(false);
  const [customerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
  const [newCurrencyModalOpen, setNewCurrencyModalOpen] = useState(false);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [accountQuickActionTarget, setAccountQuickActionTarget] = useState<"expenseAccount" | "paidThrough">("expenseAccount");

  // Vendor search modal state
  const [vendorSearchCriteria, setVendorSearchCriteria] = useState("Display Name");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState<any[]>([]);
  const [vendorSearchPage, setVendorSearchPage] = useState(1);
  const [vendorSearchCriteriaOpen, setVendorSearchCriteriaOpen] = useState(false);

  // Customer search modal state
  const [customerSearchCriteria, setCustomerSearchCriteria] = useState("Display Name");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchCriteriaOpen, setCustomerSearchCriteriaOpen] = useState(false);

  // Helper function to close all dropdowns
  const closeAllDropdowns = () => {
    setExpenseAccountOpen(false);
    setPaidThroughOpen(false);
    setVendorOpen(false);
    setCustomerOpen(false);
    setUploadDropdownOpen(false);
    setVendorSearchCriteriaOpen(false);
    setCustomerSearchCriteriaOpen(false);
    setParentAccountOpen(false);
  };

  // Load vendors and customers from API
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Currencies from database
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Accounts from database
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Projects from database
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [customerProjects, setCustomerProjects] = useState<Array<{ id: string; name: string; customerId: string }>>([]);
  const [loadingCustomerProjects, setLoadingCustomerProjects] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saveLoadingState, setSaveLoadingState] = useState<null | "save" | "saveAndNew">(null);

  const normalizeText = (value: any) => String(value ?? "").trim();
  const isObjectId = (value: any) => /^[a-f\d]{24}$/i.test(normalizeText(value));
  const getProjectId = (project: any) =>
    normalizeText(project?._id || project?.id || project?.project_id || project?.projectId);
  const getProjectName = (project: any) =>
    normalizeText(project?.name || project?.projectName || project?.project_name || project?.title);
  const getProjectCustomerId = (project: any) => {
    const rawCustomer = project?.customer_id || project?.customerId || project?.customer;
    if (rawCustomer && typeof rawCustomer === "object") {
      return normalizeText(rawCustomer?._id || rawCustomer?.id);
    }
    return normalizeText(rawCustomer);
  };

  const normalizeProjectRecords = (records: any[]) => {
    const seen = new Set<string>();
    return records
      .map((project: any) => ({
        id: getProjectId(project),
        name: getProjectName(project),
        customerId: getProjectCustomerId(project),
      }))
      .filter((project) => {
        if (!project.id || !project.name) return false;
        if (seen.has(project.id)) return false;
        seen.add(project.id);
        return true;
      });
  };

  const loadSelectableAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const [chartAccountsResponse, bankAccountsResponse] = await Promise.all([
        chartOfAccountsAPI.getAccounts({ isActive: true, limit: 1000 }),
        bankAccountsAPI.getAll({ limit: 1000 }),
      ]);

      const mergedAccounts = mergeAccountOptions(
        getChartAccountsFromResponse(chartAccountsResponse),
        getBankAccountsFromResponse(bankAccountsResponse)
      );

      setAccounts(mergedAccounts);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadProjectsForSelectedCustomer = async (customerIdRaw: any) => {
    const customerId = normalizeText(customerIdRaw);
    if (!customerId) {
      setCustomerProjects([]);
      return;
    }

    setLoadingCustomerProjects(true);
    try {
      if (!isObjectId(customerId)) {
        const fallbackProjects = normalizeProjectRecords(allProjects).filter(
          (project) => project.customerId === customerId
        );
        setCustomerProjects(fallbackProjects);
        return;
      }

      let projectRecords: any[] = [];
      const response = await projectsAPI.getByCustomer(customerId);
      if (Array.isArray(response?.data)) {
        projectRecords = response.data;
      } else if (Array.isArray(response)) {
        projectRecords = response;
      }

      let normalizedProjects = normalizeProjectRecords(projectRecords);

      if (normalizedProjects.length === 0) {
        normalizedProjects = normalizeProjectRecords(allProjects).filter(
          (project) => project.customerId === customerId
        );
      }

      setCustomerProjects(normalizedProjects);
    } catch (error) {
      console.error("Error loading projects for selected customer:", error);
      const fallbackProjects = normalizeProjectRecords(allProjects).filter(
        (project) => project.customerId === customerId
      );
      setCustomerProjects(fallbackProjects);
    } finally {
      setLoadingCustomerProjects(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingVendors(true);
        const vendorsResponse = await vendorsAPI.getAll({ limit: 1000 });
        if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
          setAllVendors(filterActiveRecords(vendorsResponse.data));
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
        setAllVendors([]);
      } finally {
        setLoadingVendors(false);
      }

      try {
        setLoadingCustomers(true);
        const customersResponse = await customersAPI.getAll({ limit: 1000 });
        if (customersResponse && customersResponse.success && customersResponse.data) {
          setAllCustomers(filterActiveRecords(customersResponse.data));
        }
      } catch (error) {
        console.error("Error loading customers:", error);
        setAllCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }

      try {
        setLoadingCurrencies(true);
        const currenciesResponse = await dbCurrenciesAPI.getAll();
        if (currenciesResponse && currenciesResponse.success && currenciesResponse.data) {
          setCurrencies(currenciesResponse.data);
          if (currenciesResponse.data.length > 0) {
            const baseCurrency = currenciesResponse.data.find((c: any) => c.isBaseCurrency || c.is_base_currency) || currenciesResponse.data[0];
            const baseCode = baseCurrency?.code || (currenciesResponse.data[0] && currenciesResponse.data[0].code) || '';
            setFormData(prev => ({ ...prev, currency: baseCode || baseCurrencyCode || prev.currency }));
            setBulkExpenses(prev => prev.map(e => ({ ...e, currency: baseCode || baseCurrencyCode || e.currency })));
          }
        }
      } catch (error) {
        console.error("Error loading currencies:", error);
        setCurrencies([]);
      } finally {
        setLoadingCurrencies(false);
      }

      await loadSelectableAccounts();

      try {
        setLoadingProjects(true);
        const projectsResponse = await projectsAPI.getAll();
        if (projectsResponse && projectsResponse.success && projectsResponse.data) {
          setAllProjects(projectsResponse.data);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
        setAllProjects([]);
      } finally {
        setLoadingProjects(false);
      }

      try {
        const taxesResponse = await taxesAPI.getAll({ status: "active" });
        const taxList = taxesResponse?.data || taxesResponse?.taxes || [];
        setTaxes(filterActiveRecords(Array.isArray(taxList) ? taxList : []));
      } catch (error) {
        console.error("Error loading taxes:", error);
        setTaxes([]);
      }
    };

    loadData();

    // Listen for vendor updates
    const handleVendorUpdate = async (e: any) => {
      try {
        const [vendorsResponse, customersResponse] = await Promise.all([
          vendorsAPI.getAll({ limit: 1000 }),
          customersAPI.getAll({ limit: 1000 }),
        ]);

        if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
          setAllVendors(filterActiveRecords(vendorsResponse.data));
        }
        if (customersResponse && customersResponse.success && customersResponse.data) {
          setAllCustomers(filterActiveRecords(customersResponse.data));
        }
      } catch (refreshError) {
        console.error("Error refreshing vendors/customers:", refreshError);
      }
      // If vendor was just created, update the vendor field
      if (e.detail) {
        const vendor = e.detail;
        const vendorId = vendor._id || vendor.id;
        const displayName = vendor.displayName || vendor.companyName || vendor.name || "";
        if (displayName && vendorId) {
          setFormData(prev => ({
            ...prev,
            vendor: displayName,
            vendor_id: vendorId
          }));
        }
      }
    };
    window.addEventListener("vendorCreated" as any, handleVendorUpdate);

    return () => {
      window.removeEventListener("vendorCreated" as any, handleVendorUpdate);
    };
  }, []);

  const [vendorMoreDetailsExpanded, setVendorMoreDetailsExpanded] = useState(false);
  const [customerMoreDetailsExpanded, setCustomerMoreDetailsExpanded] = useState(false);

  // New state for account type dropdown in modal
  const [accountTypeOpen, setAccountTypeOpen] = useState(false);
  const [accountTypeSearch, setAccountTypeSearch] = useState("");

  const [structuredAccounts, setStructuredAccounts] = useState(EXPENSE_ACCOUNTS_STRUCTURE);
  const [structuredPaidThrough, setStructuredPaidThrough] = useState(PAID_THROUGH_STRUCTURE);

  useEffect(() => {
    if (accounts.length > 0) {
      // Helper to format account type keys (e.g. 'fixed_asset' -> 'Fixed Asset')
      const formatType = (type: string) => {
        if (!type) return "Other";
        return type
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      // 1. Build Expense Structure
      const newExpenseStructure: any = {};
      const expenseTypes = [
        'expense',
        'cost_of_goods_sold'
      ];

      // Strictly filter accounts to only these types
      const relevantAccounts = accounts.filter(acc =>
        expenseTypes.includes(acc.accountType)
      );

      relevantAccounts.forEach((acc: any) => {
        let key = formatType(acc.accountType);
        // Map specific keys to match UI expectations if needed
        if (acc.accountType === 'expense' || acc.accountType === 'other_expense') key = 'Expense';

        if (!newExpenseStructure[key]) {
          newExpenseStructure[key] = [];
        }
        newExpenseStructure[key].push(acc.accountName);
      });

      // Sort lists
      Object.keys(newExpenseStructure).forEach(k => newExpenseStructure[k].sort());
      setStructuredAccounts(newExpenseStructure);

      // 2. Build Paid Through Structure - Only include real money movement accounts
      const newPaidThroughStructure: any = {};
      const paidThroughTypes = [
        'bank',
        'cash',
        'mobile_wallet',
        'credit_card',
        'other_current_liability',
        'equity',
        'other_current_asset',
        'payment_clearing_account'
      ];

      // Filter for active accounts of specific types only
      const paidAccounts = accounts.filter(acc =>
        acc.isActive && paidThroughTypes.includes(acc.accountType?.toLowerCase())
      );

      paidAccounts.forEach((acc: any) => {
        let key = formatType(acc.accountType);
        // Group mappings
        if (acc.accountType === 'other_current_liability') key = 'Other Current Liability';

        if (!newPaidThroughStructure[key]) {
          newPaidThroughStructure[key] = [];
        }
        newPaidThroughStructure[key].push(acc.accountName);
      });

      // Sort lists
      Object.keys(newPaidThroughStructure).forEach(k => newPaidThroughStructure[k].sort());
      setStructuredPaidThrough(
        Object.keys(newPaidThroughStructure).length ? newPaidThroughStructure : PAID_THROUGH_STRUCTURE
      );
    }
  }, [accounts]);

  const [newAccountData, setNewAccountData] = useState({
    accountType: "Fixed Asset",
    accountName: "",
    isSubAccount: false,
    accountCode: "",
    description: "",
    tabanExpense: false,
  });
  const [activeTab, setActiveTab] = useState("expense");
  const [isItemized, setIsItemized] = useState(false);
  const [itemRows, setItemRows] = useState([
    {
      id: 1,
      itemDetails: "",
      account: "",
      quantity: 100,
      rate: 0.00,
      amount: 0.00
    }
  ]);
  const [discount, setDiscount] = useState({ value: 0, type: "%" });

  const formatDateForAPI = (dateStr: string) => {
    if (!dateStr) return "";
    // If it's dd/mm/yyyy, convert it
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    // If it's already YYYY-MM-DD or other, return as is
    return dateStr;
  };

  // Bulk expenses state
  const [bulkExpenses, setBulkExpenses] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      date: (() => {
        const today = new Date();
        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        return `${d}/${m}/${y}`;
      })(),
      expenseAccount: "",
      amount: "",
      currency: "",
      paidThrough: "",
      vendor: "",
      customerName: "",
      projects: "",
      billable: false
    }))
  );
  const [formData, setFormData] = useState({
    location: "Head Office",
    date: (() => {
      const today = new Date();
      const d = String(today.getDate()).padStart(2, '0');
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const y = today.getFullYear();
      return `${d}/${m}/${y}`;
    })(),
    expenseAccount: "",
    amount: "",
    currency: "",
    is_inclusive_tax: true,
    paidThrough: "",
    tax: "",
    vendor: "",
    vendor_id: "",
    reference: "",
    notes: "",
    customerName: "",
    customer_id: "",
    projectName: "",
    project_id: "",
    billable: false,
  });

  useEffect(() => {
    if (!baseCurrencyCode) return;
    setFormData((prev) => ({ ...prev, currency: baseCurrencyCode }));
    setBulkExpenses((prev) => prev.map((e) => ({ ...e, currency: baseCurrencyCode })));
  }, [baseCurrencyCode]);

  // Handle location state to pre-fill form with project/customer data or edit existing expense
  useEffect(() => {
    if (location.state) {
      const { projectName, customerName, editExpense, isEdit: isEditFromState, clonedData } = location.state;

      if (isEditFromState && editExpense) {
        setIsEdit(true);
        setEditId(editExpense.id);

        // Convert raw_date to dd/MM/yyyy if available
        let formattedDate = editExpense.date;
        if (editExpense.raw_date) {
          const d = new Date(editExpense.raw_date);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }
        }

        setFormData({
          location: "Head Office",
          date: formattedDate,
          expenseAccount: editExpense.expenseAccount || "",
          amount: String(editExpense.amount || ""),
          currency: baseCurrencyCode || editExpense.currency || "",
          is_inclusive_tax: editExpense.is_inclusive_tax !== undefined ? editExpense.is_inclusive_tax : true,
          paidThrough: editExpense.paidThrough || "",
          tax: "",
          vendor: editExpense.vendor || "",
          vendor_id: editExpense.vendor_id || "",
          reference: editExpense.reference || "",
          notes: editExpense.notes || "",
          customerName: editExpense.customerName || "",
          customer_id: editExpense.customer_id || "",
          projectName: editExpense.projectName || editExpense.project_name || editExpense.project?.name || "",
          project_id: editExpense.project_id || editExpense.project?._id || editExpense.project?.id || "",
          billable: !!editExpense.is_billable,
        });

        if (editExpense.is_billable) {
          // You might have a state for this if it's not in formData
        }

        if (editExpense.is_itemized_expense && editExpense.line_items) {
          setIsItemized(true);
          setItemRows(editExpense.line_items.map((line: any, idx: number) => ({
            id: line._id || line.id || idx + 1,
            itemDetails: line.description || "",
            account: line.account_name || "",
            quantity: line.quantity || 1,
            rate: line.rate || line.amount || 0,
            amount: line.amount || 0
          })));
        }
      } else if (clonedData) {
        setIsEdit(false);
        setEditId(null);

        let formattedDate = clonedData.date;
        if (clonedData.raw_date) {
          const d = new Date(clonedData.raw_date);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }
        }

        setFormData({
          location: clonedData.location || "Head Office",
          date: formattedDate || new Date().toLocaleDateString("en-GB"),
          expenseAccount: clonedData.expenseAccount || "",
          amount: String(clonedData.amount || ""),
          currency: baseCurrencyCode || clonedData.currency || "",
          is_inclusive_tax: clonedData.is_inclusive_tax !== undefined ? clonedData.is_inclusive_tax : true,
          paidThrough: clonedData.paidThrough || "",
          tax: "",
          vendor: clonedData.vendor || "",
          vendor_id: clonedData.vendor_id || "",
          reference: "",
          notes: clonedData.notes || "",
          customerName: clonedData.customerName || "",
          customer_id: clonedData.customer_id || "",
          projectName: clonedData.projectName || clonedData.project_name || clonedData.project?.name || "",
          project_id: clonedData.project_id || clonedData.project?._id || clonedData.project?.id || "",
          billable: !!clonedData.is_billable,
        });

        if (clonedData.is_itemized_expense && clonedData.line_items) {
          setIsItemized(true);
          setItemRows(clonedData.line_items.map((line: any, idx: number) => ({
            id: line._id || line.id || idx + 1,
            itemDetails: line.description || "",
            account: line.account_name || "",
            quantity: line.quantity || 1,
            rate: line.rate || line.amount || 0,
            amount: line.amount || 0
          })));
        }
      } else if (projectName || customerName) {
        setFormData(prev => ({
          ...prev,
          customerName: customerName || prev.customerName,
          customer_id: prev.customer_id,
          projectName: projectName || prev.projectName,
        }));
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!formData.customer_id) {
      setCustomerProjects([]);
      setFormData((prev) => {
        if (!prev.billable && !prev.project_id && !prev.projectName) {
          return prev;
        }
        return {
          ...prev,
          billable: false,
          project_id: "",
          projectName: "",
        };
      });
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (!formData.billable || !formData.customer_id) {
      setCustomerProjects([]);
      return;
    }

    void loadProjectsForSelectedCustomer(formData.customer_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.billable, formData.customer_id, allProjects]);

  useEffect(() => {
    if (!formData.billable || !formData.customer_id) return;
    if (formData.project_id || !formData.projectName || customerProjects.length === 0) return;

    const projectNameLower = normalizeText(formData.projectName).toLowerCase();
    const matchedProject = customerProjects.find(
      (project) => normalizeText(project.name).toLowerCase() === projectNameLower
    );

    if (matchedProject) {
      setFormData((prev) => ({
        ...prev,
        project_id: matchedProject.id,
        projectName: matchedProject.name,
      }));
    }
  }, [formData.billable, formData.customer_id, formData.project_id, formData.projectName, customerProjects]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => {
      const nextValue = type === "checkbox" ? checked : value;
      const nextState: any = { ...prev, [name]: nextValue };

      if (name === "billable" && !checked) {
        nextState.projectName = "";
        nextState.project_id = "";
      }

      return nextState;
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        processFiles(files);
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).value = "";
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId: number) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const generateJournalEntry = async (expenseData: any) => {
    try {
      // Prefer provided account IDs; otherwise attempt to resolve by name
      let paidThroughAccount = null;
      if (expenseData.paid_through_account_id) {
        paidThroughAccount = accounts.find(a => a._id === expenseData.paid_through_account_id || a.id === expenseData.paid_through_account_id);
      }
      if (!paidThroughAccount) {
        paidThroughAccount = accounts.find(a => a.accountName === expenseData.paid_through_account_name || a.accountName?.toLowerCase() === (expenseData.paid_through_account_name || '').toLowerCase());
      }

      let expenseAccount = null;
      if (expenseData.account_id) {
        expenseAccount = accounts.find(a => a._id === expenseData.account_id || a.id === expenseData.account_id);
      }
      if (!expenseAccount) {
        expenseAccount = accounts.find(a => a.accountName === expenseData.account_name || a.accountName?.toLowerCase() === (expenseData.account_name || '').toLowerCase());
      }

      if (!paidThroughAccount || !expenseAccount) {
        console.error('Accounts required for journal entry not found:', {
          expenseAccount: expenseData.account_name || expenseData.account_id,
          paidThrough: expenseData.paid_through_account_name || expenseData.paid_through_account_id
        });
        // Do not block expense creation â€” log and return so system remains consistent
        return;
      }

      // Build journal entry; include currency on entry and lines
      const amt = parseFloat(expenseData.amount) || 0;
      const journalEntry: any = {
        date: expenseData.date,
        referenceNumber: `EXP-${Date.now()}`,
        description: `Expense - ${expenseData.description || 'No description'}`,
        currency: expenseData.currency_code || expenseData.currency || undefined,
        journalLines: [
          {
            accountId: expenseAccount._id || expenseAccount.id,
            accountName: expenseAccount.accountName,
            accountType: expenseAccount.accountType,
            debit: amt,
            credit: 0,
            currency: expenseData.currency_code || expenseData.currency || undefined,
            description: `Expense: ${expenseData.description || 'No description'}`
          },
          {
            accountId: paidThroughAccount._id || paidThroughAccount.id,
            accountName: paidThroughAccount.accountName,
            accountType: paidThroughAccount.accountType,
            debit: 0,
            credit: amt,
            currency: expenseData.currency_code || expenseData.currency || undefined,
            description: `Paid through: ${paidThroughAccount.accountName}`
          }
        ],
        totalDebit: amt,
        totalCredit: amt,
        status: 'Posted',
        notes: `Auto-generated journal entry for expense ${expenseData.referenceNumber || 'N/A'}`,
        relatedTransaction: {
          type: 'Expense',
          id: expenseData.id,
          referenceNumber: expenseData.reference_number
        }
      };

      // Save journal entry
      const response = await journalEntriesAPI.create(journalEntry);
      if (response && response.success) {
        console.log('Journal entry created successfully:', response.data);
      } else {
        console.error('Failed to create journal entry:', response);
      }
    } catch (error) {
      console.error('Error generating journal entry:', error);
    }
  };

  const handleSave = async (navigateAway = true) => {
    if (saveLoadingState) return false;
    setSaveLoadingState(navigateAway ? "save" : "saveAndNew");
    if (activeTab === "bulk") {
      // Filter out empty rows - require at least Date, Account, Amount, and Paid Through
      const validBulkExpenses = bulkExpenses.filter(
        exp => exp.date && exp.expenseAccount && exp.amount && exp.paidThrough
      );

      if (validBulkExpenses.length === 0) {
        alert("Please fill in at least one expense with all required fields (Date, Expense Account, Amount, Paid Through)");
        setSaveLoadingState(null);
        return false;
      }

      try {
        let successCount = 0;
        let errorMessages = [];

        for (const exp of validBulkExpenses) {
          // Find vendor_id and customer_id from names
          const vendor = allVendors.find(v => (v.displayName || v.name) === exp.vendor);
          const customer = allCustomers.find(c => (c.displayName || c.name) === exp.customerName);

          // Resolve account IDs when possible to make journal creation robust
          const expenseAccountObj = accounts.find(a => a.accountName === exp.expenseAccount || a.accountName?.toLowerCase() === (exp.expenseAccount || '').toLowerCase());
          const paidThroughObj = accounts.find(a => a.accountName === exp.paidThrough || a.accountName?.toLowerCase() === (exp.paidThrough || '').toLowerCase());

          const expenseData: any = {
            date: formatDateForAPI(exp.date),
            account_name: exp.expenseAccount,
            account_id: expenseAccountObj?._id || expenseAccountObj?.id,
            amount: parseFloat(exp.amount),
            paid_through_account_name: exp.paidThrough,
            paid_through_account_id: paidThroughObj?._id || paidThroughObj?.id,
            currency_code: baseCurrencyCode || exp.currency,
            description: "",
            vendor_id: vendor ? (vendor._id || vendor.id) : undefined,
            customer_id: customer ? (customer._id || customer.id) : undefined,
            is_billable: exp.billable,
            is_inclusive_tax: true, // Defaulting to true for bulk
          };

          const response = await expensesAPI.create(expenseData);

          if (response && (response.code === 0 || response.success)) {
            // Generate journal entry for the expense
            await generateJournalEntry(expenseData);
            successCount++;
          } else {
            errorMessages.push(`Row ${exp.id}: ${response?.message || "Error"}`);
          }
        }

        if (successCount > 0) {
          alert(`${successCount} expenses saved successfully!${errorMessages.length > 0 ? `\nErrors: ${errorMessages.join(', ')}` : ''}`);
          window.dispatchEvent(new Event("expensesUpdated"));

          if (navigateAway) {
            navigate("/purchases/expenses");
          }
          return true;
        } else {
          alert(`Failed to save expenses: ${errorMessages.join(', ')}`);
          return false;
        }
      } catch (error: any) {
        console.error("Error saving bulk expenses:", error);
        alert(error?.message || "Error creating bulk expenses. Please try again.");
        return false;
      } finally {
        setSaveLoadingState(null);
      }
    }

    // Validate required fields for single expense
    if (!formData.date || !formData.expenseAccount || !formData.amount || !formData.paidThrough) {
      alert("Please fill in all required fields (Date, Expense Account, Amount, Paid Through)");
      setSaveLoadingState(null);
      return false;
    }

    try {
      const formattedDate = formatDateForAPI(formData.date);

      // Resolve account IDs for more reliable journal creation
      const expenseAccountObj = accounts.find(a => a.accountName === formData.expenseAccount || a.accountName?.toLowerCase() === (formData.expenseAccount || '').toLowerCase());
      const paidThroughObj = accounts.find(a => a.accountName === formData.paidThrough || a.accountName?.toLowerCase() === (formData.paidThrough || '').toLowerCase());

      const expenseData: any = {
        date: formattedDate,
        account_name: formData.expenseAccount, // preserve name for API compatibility
        account_id: expenseAccountObj?._id || expenseAccountObj?.id,
        amount: parseFloat(formData.amount),
        paid_through_account_name: formData.paidThrough,
        paid_through_account_id: paidThroughObj?._id || paidThroughObj?.id,
        reference_number: formData.reference || "",
        description: formData.notes || "",
        currency_code: baseCurrencyCode || formData.currency,
        is_inclusive_tax: formData.is_inclusive_tax,
      };

      if (formData.tax && /^[a-f\d]{24}$/i.test(String(formData.tax))) {
        expenseData.tax_id = formData.tax;
      }

      // Add vendor_id if vendor is selected
      if (formData.vendor_id) {
        expenseData.vendor_id = formData.vendor_id;
      }

      // Billable/status behavior:
      // - With customer + billable checked => UNBILLED
      // - Otherwise => NON-BILLABLE
      if (formData.customer_id) {
        expenseData.customer_id = formData.customer_id;
      }
      expenseData.is_billable = !!(formData.customer_id && formData.billable);
      expenseData.status = expenseData.is_billable ? "unbilled" : "non-billable";

      if (expenseData.is_billable && isObjectId(formData.project_id)) {
        expenseData.project_id = formData.project_id;
        if (formData.projectName) {
          expenseData.project_name = formData.projectName;
        }
      }

      // Handle itemized expenses
      if (isItemized && itemRows.length > 0) {
        expenseData.is_itemized_expense = true;
        expenseData.line_items = itemRows
          .filter(row => row.account && row.amount > 0)
          .map((row, index) => {
            return {
              account_name: row.account, // Send account name instead of ID
              description: row.itemDetails || "",
              amount: row.amount,
              item_order: index + 1,
            };
          });
      }

      console.log("Sending expense data:", expenseData);
      let response;
      if (isEdit && editId) {
        response = await expensesAPI.update(editId, expenseData);
      } else {
        response = await expensesAPI.create(expenseData);
      }

      if (response && (response.code === 0 || response.success)) {
        // Generate journal entry for the expense
        await generateJournalEntry(expenseData);

        alert("Expense saved successfully!");
        window.dispatchEvent(new Event("expensesUpdated"));

        if (navigateAway) {
          navigate("/purchases/expenses");
        }
        return true;
      } else {
        alert(response?.message || "Error creating expense");
        return false;
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      alert(error?.message || "Error creating expense. Please try again.");
      return false;
    } finally {
      setSaveLoadingState(null);
    }
  };


  const handleSaveAndNew = async () => {
    // Use the same save logic, but don't navigate away
    const success = await handleSave(false);

    if (success) {
      if (activeTab === "bulk") {
        setBulkExpenses(
          Array.from({ length: 10 }, (_, i) => ({
            id: Date.now() + i,
            date: (() => {
              const today = new Date();
              const d = String(today.getDate()).padStart(2, '0');
              const m = String(today.getMonth() + 1).padStart(2, '0');
              const y = today.getFullYear();
              return `${d}/${m}/${y}`;
            })(),
            expenseAccount: "",
            amount: "",
            currency: baseCurrencyCode || currencies.find(c => (c.isBaseCurrency || c.is_base_currency))?.code || "USD",
            paidThrough: "",
            vendor: "",
            customerName: "",
            projects: "",
            billable: false
          }))
        );
      } else {
        // Reset form for single expense
        setFormData({
          location: "Head Office",
          date: (() => {
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = today.getFullYear();
            return `${d}/${m}/${y}`;
          })(),
          expenseAccount: '',
          amount: '',
          currency: baseCurrencyCode || currencies.find(c => (c.isBaseCurrency || c.is_base_currency))?.code || 'USD',
          is_inclusive_tax: true,
          paidThrough: '',
          tax: '',
          vendor: '',
          vendor_id: '',
          reference: '',
          notes: '',
          customerName: '',
          customer_id: '',
          projectName: '',
          project_id: '',
          billable: false
        });
        setItemRows([{
          id: 1,
          itemDetails: "",
          account: "",
          quantity: 100,
          rate: 0.00,
          amount: 0.00
        }]);
        setIsItemized(false);
        setUploadedFiles([]);
      }
    }
  };

  const handleCancel = () => {
    navigate("/purchases/expenses");
  };

  // Keyboard shortcuts for Save and Save and New
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleSaveAndNew();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]); // Update dependency to include formData if save functions use it

  // Vendor search handlers
  const handleVendorSearch = () => {
    const searchTerm = vendorSearchTerm.toLowerCase();
    let results = [];

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
        const companyName = vendor.companyName || "";
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

  // Customer search handlers
  const handleCustomerSearch = () => {
    const searchTerm = customerSearchTerm.toLowerCase();
    let results = [];

    if (customerSearchCriteria === "Display Name") {
      results = allCustomers.filter(customer => {
        const displayName = customer.displayName || customer.name || "";
        return displayName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Email") {
      results = allCustomers.filter(customer => {
        const email = customer.email || "";
        return email.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Company Name") {
      results = allCustomers.filter(customer => {
        const companyName = customer.companyName || "";
        return companyName.toLowerCase().includes(searchTerm);
      });
    } else if (customerSearchCriteria === "Phone") {
      results = allCustomers.filter(customer => {
        const phone = customer.workPhone || customer.mobile || "";
        return phone.includes(searchTerm);
      });
    }

    setCustomerSearchResults(results);
    setCustomerSearchPage(1);
  };

  // Pagination helpers
  const itemsPerPage = 10;
  const vendorStartIndex = (vendorSearchPage - 1) * itemsPerPage;
  const vendorEndIndex = vendorStartIndex + itemsPerPage;
  const vendorPaginatedResults = vendorSearchResults.slice(vendorStartIndex, vendorEndIndex);
  const vendorTotalPages = Math.ceil(vendorSearchResults.length / itemsPerPage);

  const customerStartIndex = (customerSearchPage - 1) * itemsPerPage;
  const customerEndIndex = customerStartIndex + itemsPerPage;
  const customerPaginatedResults = customerSearchResults.slice(customerStartIndex, customerEndIndex);
  const customerTotalPages = Math.ceil(customerSearchResults.length / itemsPerPage);

  // Filter accounts logic
  const getFilteredAccounts = () => {
    if (!expenseAccountSearch) return structuredAccounts;

    const filtered: any = {};
    Object.entries(structuredAccounts).forEach(([category, items]) => {
      const filteredItems = (items as string[]).filter(item =>
        item.toLowerCase().includes(expenseAccountSearch.toLowerCase())
      );
      if (filteredItems.length > 0 || category.toLowerCase().includes(expenseAccountSearch.toLowerCase())) {
        filtered[category] = filteredItems.length > 0 ? filteredItems : items;
      }
    });
    return filtered;
  };

  const filteredAccounts = getFilteredAccounts();

  // Filter paid through accounts
  const getFilteredPaidThrough = () => {
    if (!paidThroughSearch) return structuredPaidThrough;

    const filtered: any = {};
    Object.entries(structuredPaidThrough).forEach(([category, items]) => {
      const filteredItems = items.filter(item =>
        item.toLowerCase().includes(paidThroughSearch.toLowerCase())
      );
      if (filteredItems.length > 0 || category.toLowerCase().includes(paidThroughSearch.toLowerCase())) {
        filtered[category] = filteredItems.length > 0 ? filteredItems : items;
      }
    });
    return filtered;
  };

  const filteredPaidThrough = getFilteredPaidThrough();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        expenseAccountRef.current &&
        !(expenseAccountRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setExpenseAccountOpen(false);
        setExpenseAccountSearch("");
      }

      if (
        uploadDropdownRef.current &&
        !(uploadDropdownRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setUploadDropdownOpen(false);
      }

      if (
        paidThroughRef.current &&
        !(paidThroughRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setPaidThroughOpen(false);
        setPaidThroughSearch("");
      }

      if (
        customerRef.current &&
        !(customerRef.current as HTMLDivElement).contains(event.target as Node)
      ) {
        setCustomerOpen(false);
        setCustomerSearch("");
      }

      // Also close account type dropdown if clicking outside (would need a ref but for now simple check)
      // Since it is in a portal, event target logic might be tricky, keeping it simple or adding ref:
    };

    if (expenseAccountOpen || customerOpen || uploadDropdownOpen || paidThroughOpen || vendorSearchCriteriaOpen || customerSearchCriteriaOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expenseAccountOpen, customerOpen, uploadDropdownOpen, paidThroughOpen, vendorSearchCriteriaOpen, customerSearchCriteriaOpen]);

  // Adding useEffect for account type dropdown close
  useEffect(() => {
    const handleCloseTypeDropdown = (e: MouseEvent) => {
      // Simple logic: if click is not in a dropdown related element... 
      // For robustness we rely on e.stopPropagation() in the dropdown itself
    }
    document.addEventListener('click', handleCloseTypeDropdown);
    return () => document.removeEventListener('click', handleCloseTypeDropdown);
  }, []);


  const handleExpenseAccountSelect = (account: string) => {
    setFormData((prev) => ({ ...prev, expenseAccount: account }));
    setExpenseAccountOpen(false);
    setExpenseAccountSearch("");
  };


  const handleNewAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setNewAccountData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveAndSelect = async () => {
    if (!newAccountData.accountName.trim()) {
      alert("Please enter an account name");
      return;
    }

    try {
      // Map UI type to Backend Enum
      const typeMap: any = {
        "Fixed Asset": "fixed_asset",
        "Other Asset": "other_asset",
        "Other Current Asset": "other_current_asset",
        "Cash": "cash",
        "Bank": "bank",
        "Credit Card": "credit_card",
        "Equity": "equity",
        "Expense": "expense",
        "Cost of Goods Sold": "cost_of_goods_sold",
        "Other Expense": "other_expense",
        "Other Current Liability": "other_current_liability",
        "Accounts Payable": "accounts_payable",
        "Accounts Receivable": "accounts_receivable",
        "Income": "income",
        "Other Income": "other_income",
        "Intangible Asset": "intangible_asset",
        "Non Current Asset": "non_current_asset",
        "Non Current Liability": "non_current_liability",
        "Other Liability": "other_liability"
      };

      const accountTypeEnum = typeMap[newAccountData.accountType] || "expense"; // Fallback to expense

      // Prepare payload
      const payload = {
        accountName: newAccountData.accountName,
        accountCode: newAccountData.accountCode || `AUTO-${Date.now()}`, // Ensure code exists
        accountType: accountTypeEnum,
        description: newAccountData.description,
        isSystemAccount: false,
        isActive: true,
        // Default currency if needed
        currency: baseCurrencyCode || formData.currency || "USD"
      };

      // Call API
      const response = await accountsAPI.create(payload);

      if (response && (response.success || response.code === 0)) {
        await loadSelectableAccounts();

        // Set the new account on the target selector
        setFormData((prev) => ({
          ...prev,
          ...(accountQuickActionTarget === "paidThrough"
            ? { paidThrough: newAccountData.accountName }
            : { expenseAccount: newAccountData.accountName })
        }));
        setNewAccountModalOpen(false);

        // Reset form
        setNewAccountData({
          accountType: "Fixed Asset",
          accountName: "",
          isSubAccount: false,
          accountCode: "",
          description: "",
          tabanExpense: false,
        });

        alert("Account created successfully!");
      } else {
        alert(response.message || "Failed to create account");
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      alert("Error creating account: " + (error.message || "Unknown error"));
    }
  };

  const handleCancelNewAccount = () => {
    setNewAccountModalOpen(false);
  };

  const styles = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
    },
    tabs: {
      display: "flex",
      borderBottom: "1px solid #e5e7eb",
      padding: "0 24px",
      backgroundColor: "#ffffff",
    },
    tab: {
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      background: "none",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      marginBottom: "-1px",
    },
    tabActive: {
      color: "#156372",
      borderBottomColor: "#156372",
    },
    content: {
      display: "flex",
      flex: 1,
      gap: "24px",
      padding: "24px",
      overflow: "auto",
    },
    formSection: {
      flex: 1,
      maxWidth: "600px",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
    },
    required: {
      color: "#156372",
      marginLeft: "2px",
    },
    input: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    inputGroup: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    searchBtn: {
      padding: "8px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    select: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      outline: "none",
      width: "100%",
      backgroundColor: "#ffffff",
      cursor: "pointer",
    },
    accountWrapper: {
      position: "relative",
      width: "100%",
    },
    accountButton: {
      width: "100%",
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      textAlign: "left",
    },
    accountButtonPlaceholder: {
      color: "#9ca3af",
    },
    accountDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: "4px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      zIndex: 1000,
      maxHeight: "300px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      minWidth: "100%",
    },
    accountSearch: {
      padding: "8px 12px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 10
    },
    accountSearchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "14px",
    },
    accountList: {
      padding: "4px 0",
    },
    accountCategory: {
      padding: "8px 12px",
      fontSize: "12px",
      fontWeight: "700",
      color: "#4b5563",
      backgroundColor: "transparent",
      textTransform: "capitalize",
      marginTop: "4px",
      marginBottom: "2px"
    },
    accountNew: {
      padding: "10px 12px",
      borderTop: "1px solid #e5e7eb",
      fontSize: "14px",
      color: "#156372",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "500",
      backgroundColor: "white",
      position: "sticky",
      bottom: 0,
      zIndex: 10
    },
    linkButton: {
      marginTop: "4px",
      padding: "0",
      border: "none",
      background: "none",
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textAlign: "left",
    },
    amountGroup: {
      display: "flex",
      gap: "0",
      alignItems: "stretch",
    },
    currency: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRight: "none",
      borderTopLeftRadius: "6px",
      borderBottomLeftRadius: "6px",
      backgroundColor: "#f9fafb",
      outline: "none",
      cursor: "pointer",
    },
    amountInput: {
      flex: 1,
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderTopRightRadius: "6px",
      borderBottomRightRadius: "6px",
      outline: "none",
    },
    radioGroup: {
      display: "flex",
      gap: "16px",
      marginTop: "4px",
    },
    radio: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      cursor: "pointer",
    },
    textareaWrapper: {
      position: "relative",
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      outline: "none",
      resize: "vertical",
      minHeight: "80px",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    textareaIcon: {
      position: "absolute",
      bottom: "8px",
      right: "8px",
      color: "#9ca3af",
      cursor: "pointer",
    },
    tagsButton: {
      padding: "8px 12px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    tagsIcon: {
      fontSize: "12px",
    },
    receiptSection: {
      width: "400px",
    },
    receiptArea: {
      border: "2px dashed #d1d5db",
      borderRadius: "8px",
      padding: "40px 24px",
      textAlign: "center",
      backgroundColor: "#f9fafb",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    receiptAreaDragging: {
      borderColor: "#156372",
      backgroundColor: "#15637210",
    },
    receiptIcon: {
      marginBottom: "16px",
    },
    receiptTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "8px",
    },
    receiptSubtitle: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "16px",
    },
    receiptBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
    },
    actions: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
    },
    saveBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    saveNewBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    cancelBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      color: "#374151",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
    },
    shortcut: {
      fontSize: "12px",
      opacity: 0.7,
    },
  };

  const getAccountTypeInfo = (type: string) => (ACCOUNT_TYPE_DESCRIPTIONS as any)[type] || ACCOUNT_TYPE_DESCRIPTIONS["Fixed Asset"];

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-[#f8fafc] px-6 pt-4">
          <div className="flex items-end gap-0">
            <button
              className={`px-5 py-3 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${activeTab === "expense"
                ? "bg-white text-[#334155] border-[#d1d5db] border-t-[3px] border-t-[#156372]"
                : "bg-[#f1f5f9] text-[#475569] border-[#d1d5db]"
                }`}
              onClick={() => setActiveTab("expense")}
            >
              Record Expense
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${activeTab === "bulk"
                ? "bg-white text-[#334155] border-[#d1d5db] border-t-[3px] border-t-[#156372]"
                : "bg-[#f8fafc] text-[#156372] border-transparent"
                }`}
              onClick={() => setActiveTab("bulk")}
            >
              Bulk Add Expenses
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === "expense" ? (
            isItemized ? (
              /* Itemized Expense View */
              <div className="max-w-[900px] mx-auto p-6">
                {/* Date Field */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Date<span className="text-red-600">*</span>
                  </label>
                  <div className="max-w-[400px]">
                    <DatePicker
                      value={formData.date}
                      onChange={(date: string) => setFormData(prev => ({ ...prev, date }))}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>

                {/* Paid Through */}
                <div className="mb-4">
                  <label className="block text-sm text-red-600 mb-1">
                    Paid Through<span className="text-red-600">*</span>
                  </label>
                  <div className="max-w-[400px] relative" ref={paidThroughRef}>
                    <div
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!paidThroughOpen) {
                          closeAllDropdowns();
                        }
                        setPaidThroughOpen(!paidThroughOpen);
                      }}
                    >
                      <span className={!formData.paidThrough ? "text-gray-400" : ""}>
                        {formData.paidThrough || "Select an account"}
                      </span>
                      <ChevronDown size={14} className="text-gray-500" />
                    </div>
                    {paidThroughOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-[300px] overflow-y-auto flex flex-col min-w-full">
                        <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0 z-10">
                          <Search size={14} className="text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            value={paidThroughSearch}
                            onChange={(e) => setPaidThroughSearch(e.target.value)}
                            className="flex-1 border-none outline-none text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="py-1 overflow-y-auto max-h-[250px]">
                          {Object.entries(filteredPaidThrough).map(([category, items]: [string, any]) => (
                            <div key={category}>
                              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 mb-0.5">
                                {category}
                              </div>
                              {Array.isArray(items) && items.map((account: string) => {
                                const isSelected = formData.paidThrough === account;
                                return (
                                  <div
                                    key={account}
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, paidThrough: account }));
                                      setPaidThroughOpen(false);
                                      setPaidThroughSearch("");
                                    }}
                                    className={`w-full px-6 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected
                                      ? "bg-[#156372] text-white"
                                      : "text-gray-700 hover:bg-gray-50"
                                      }`}
                                  >
                                    <span>{account}</span>
                                    {isSelected && <Check size={14} className="text-white" />}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        <div
                          className="p-3 border-t border-gray-200 text-sm font-medium text-[#156372] cursor-pointer hover:bg-gray-50 sticky bottom-0 bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaidThroughOpen(false);
                            navigate("/accountant/chart-of-accounts", {
                              state: { from: location.pathname },
                            });
                          }}
                        >
                          + New Account
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Currency */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-700 mb-1">
                    Currency
                  </label>
                  <div className="max-w-[400px]">
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    >
                      {currencies.map((currency) => (
                        <option value={baseCurrencyCode || formData.currency || "USD"}>
                          {baseCurrencyCode || formData.currency || "USD"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Back to single expense view link */}
                <button
                  onClick={() => setIsItemized(false)}
                  className="text-[#156372] text-sm mb-4 flex items-center gap-1 hover:underline"
                >
                  &lt; Back to single expense view
                </button>

                {/* Itemized Expenses Table */}
                <div className="mb-6 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left pb-2 pr-3 font-medium text-red-600 uppercase text-xs tracking-wide">EXPENSE ACCOUNT</th>
                          <th className="text-left pb-2 pr-3 font-medium text-gray-700 uppercase text-xs tracking-wide">DESCRIPTION</th>
                          <th className="text-right pb-2 pr-3 font-medium text-red-600 uppercase text-xs tracking-wide">AMOUNT</th>
                          <th className="w-8 pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemRows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-gray-100">
                            <td className="py-3 pr-3 align-top" style={{ width: '220px' }}>
                              <div className="flex items-start gap-2">
                                <div className="mt-2 cursor-move text-gray-400">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                    <circle cx="2" cy="2" r="1.5" />
                                    <circle cx="2" cy="6" r="1.5" />
                                    <circle cx="2" cy="10" r="1.5" />
                                    <circle cx="6" cy="2" r="1.5" />
                                    <circle cx="6" cy="6" r="1.5" />
                                    <circle cx="6" cy="10" r="1.5" />
                                  </svg>
                                </div>
                                <select
                                  value={row.account}
                                  onChange={(e) => {
                                    const newRows = [...itemRows];
                                    newRows[idx].account = e.target.value;
                                    setItemRows(newRows);
                                  }}
                                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] text-gray-500"
                                >
                                  <option value="">Select an account</option>
                                  {Object.values(structuredAccounts).flat().map((acc: string) => (
                                    <option key={acc} value={acc}>{acc}</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="py-3 pr-3 align-top">
                              <textarea
                                value={row.itemDetails}
                                onChange={(e) => {
                                  const newRows = [...itemRows];
                                  newRows[idx].itemDetails = e.target.value;
                                  setItemRows(newRows);
                                }}
                                placeholder="Max. 500 characters"
                                maxLength={500}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] resize-none text-gray-700"
                                rows={2}
                              />
                            </td>
                            <td className="py-3 pr-3 align-top" style={{ width: '140px' }}>
                              <input
                                type="number"
                                value={row.amount || ''}
                                onChange={(e) => {
                                  const newRows = [...itemRows];
                                  newRows[idx].amount = parseFloat(e.target.value) || 0;
                                  setItemRows(newRows);
                                  const total = newRows.reduce((sum, r) => sum + r.amount, 0);
                                  setFormData(prev => ({ ...prev, amount: total.toString() }));
                                }}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                placeholder=""
                                step="0.01"
                              />
                            </td>
                            <td className="py-3 align-top text-center">
                              <button
                                onClick={() => {
                                  const newRows = itemRows.filter((_, i) => i !== idx);
                                  setItemRows(newRows);
                                  const total = newRows.reduce((sum, r) => sum + r.amount, 0);
                                  setFormData(prev => ({ ...prev, amount: total.toString() }));
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                              >
                                <MoreVertical size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => setItemRows([...itemRows, { id: Date.now(), itemDetails: "", account: "", quantity: 1, rate: 0, amount: 0 }])}
                    className="mt-3 text-sm text-[#2196F3] hover:underline flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#2196F3] flex items-center justify-center">
                      <Plus size={12} className="text-white" />
                    </div>
                    Add New Row
                  </button>
                </div>

                {/* Expense Total */}
                <div className="flex justify-end mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-8">
                    <span className="text-sm font-semibold text-gray-900">Expense Total ( {formData.currency} )</span>
                    <span className="text-base font-semibold text-gray-900">{parseFloat(formData.amount || '0').toFixed(2)}</span>
                  </div>
                </div>

                {/* Vendor */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Vendor
                  </label>
                  <div className="max-w-[400px] flex gap-2">
                    <select
                      name="vendor"
                      value={formData.vendor}
                      onChange={handleChange}
                      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    >
                      <option value=""></option>
                      {allVendors.map((vendor) => (
                        <option key={vendor.id || vendor._id} value={vendor.displayName || vendor.name}>
                          {vendor.displayName || vendor.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setVendorSearchModalOpen(true)}
                      className="px-3 py-2 border border-[#26A69A] rounded bg-[#26A69A] text-white hover:bg-[#239b8f]"
                      type="button"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                {/* Reference# */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Reference#
                  </label>
                  <div className="max-w-[400px]">
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                    />
                  </div>
                </div>

                {/* Customer Name */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <div className="max-w-[560px] flex items-center gap-2">
                    <select
                      name="customerName"
                      value={formData.customerName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        const selectedCustomer = allCustomers.find(
                          (c) => (c.displayName || c.name) === selectedName
                        );
                        setFormData((prev) => ({
                          ...prev,
                          customerName: selectedName,
                          customer_id: selectedCustomer?._id || selectedCustomer?.id || "",
                          billable: selectedCustomer ? prev.billable : false,
                          projectName: "",
                          project_id: "",
                        }));
                        setCustomerProjects([]);
                      }}
                      className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] text-gray-400"
                    >
                      <option value="">Select or add a customer</option>
                      {allCustomers.map((customer, index) => (
                        <option
                          key={customer._id || customer.id || `${customer.displayName || customer.name || "customer"}-${index}`}
                          value={customer.displayName || customer.name}
                        >
                          {customer.displayName || customer.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setCustomerSearchModalOpen(true)}
                      className="px-3 py-2 border border-[#26A69A] rounded bg-[#26A69A] text-white hover:bg-[#239b8f]"
                      type="button"
                    >
                      <Search size={16} />
                    </button>
                    <label className={`flex items-center gap-1.5 text-sm ${formData.customer_id ? "text-gray-700" : "text-gray-400"}`}>
                      <input
                        type="checkbox"
                        name="billable"
                        checked={!!formData.billable}
                        disabled={!formData.customer_id}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372] disabled:cursor-not-allowed"
                      />
                      Billable
                    </label>
                  </div>
                  {formData.billable && formData.customer_id && (
                    <div className="max-w-[560px] mt-3">
                      <label className="block text-sm text-gray-700 mb-1">
                        Projects
                      </label>
                      <select
                        value={formData.project_id}
                        onChange={(e) => {
                          const selectedProject = customerProjects.find((project) => project.id === e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            project_id: e.target.value,
                            projectName: selectedProject?.name || "",
                          }));
                        }}
                        onFocus={() => {
                          if (!loadingCustomerProjects && customerProjects.length === 0) {
                            void loadProjectsForSelectedCustomer(formData.customer_id);
                          }
                        }}
                        disabled={!formData.customer_id || loadingCustomerProjects}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        <option value="">
                          {loadingCustomerProjects ? "Loading projects..." : "Select a project"}
                        </option>
                        {customerProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      {!loadingCustomerProjects && customerProjects.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">No projects found for the selected customer.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full px-6 py-8 flex gap-14">
                {/* Left Section - Form */}
                <div className="flex-1 space-y-6">
                  {/* Location */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-900">Location</label>
                    <div className="max-w-[460px]">
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 bg-[#f8fafc] px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      >
                        <option value="Head Office">Head Office</option>
                      </select>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-red-600 flex items-center">
                      Date<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px]">
                      <DatePicker
                        value={formData.date}
                        onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>

                  {/* Expense Account */}
                  <div className="grid grid-cols-[180px_1fr] items-start gap-4">
                    <label className="text-sm font-medium text-red-600 mt-2 flex items-center">
                      Expense Account<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px] relative" ref={expenseAccountRef}>
                      {!isItemized ? (
                        <>
                          <div
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                            onClick={() => {
                              if (!expenseAccountOpen) {
                                closeAllDropdowns();
                              }
                              setExpenseAccountOpen(!expenseAccountOpen);
                            }}
                          >
                            <span className={!formData.expenseAccount ? "text-gray-400" : ""}>
                              {formData.expenseAccount || "Select an account"}
                            </span>
                            <ChevronDown size={14} className="text-gray-500" />
                          </div>
                          <button
                            onClick={() => setIsItemized(true)}
                            className="text-xs text-[#156372] hover:underline mt-1 flex items-center gap-1"
                          >
                            <Edit3 size={12} />
                            Itemize
                          </button>
                        </>
                      ) : (
                        <div className="w-full">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 font-medium">
                                <th className="text-left pb-2 font-normal">Account</th>
                                <th className="text-right pb-2 font-normal">Amount</th>
                                <th className="w-8 pb-2"></th>
                              </tr>
                            </thead>
                            <tbody className="space-y-2">
                              {itemRows.map((row, idx) => (
                                <tr key={row.id}>
                                  <td className="pr-2 pb-2">
                                    <select
                                      value={row.account}
                                      onChange={(e) => {
                                        const newRows = [...itemRows];
                                        newRows[idx].account = e.target.value;
                                        setItemRows(newRows);
                                      }}
                                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                    >
                                      <option value="">Select Account</option>
                                      {Object.values(structuredAccounts).flat().map(acc => (
                                        <option key={acc} value={acc}>{acc}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="w-32 pb-2">
                                    <input
                                      type="number"
                                      value={row.amount}
                                      onChange={(e) => {
                                        const newRows = [...itemRows];
                                        newRows[idx].amount = parseFloat(e.target.value) || 0;
                                        setItemRows(newRows);
                                        // Update total amount in formData
                                        const total = newRows.reduce((sum, r) => sum + r.amount, 0);
                                        setFormData(prev => ({ ...prev, amount: total.toString() }));
                                      }}
                                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-right outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="pl-2 pb-2 text-center">
                                    {itemRows.length > 1 && (
                                      <button onClick={() => setItemRows(itemRows.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex justify-between items-center mt-2">
                            <button
                              onClick={() => setItemRows([...itemRows, { id: Date.now(), itemDetails: "", account: "", quantity: 1, rate: 0, amount: 0 }])}
                              className="text-xs text-[#156372] hover:underline"
                            >
                              + Add another line
                            </button>
                            <button
                              onClick={() => {
                                setIsItemized(false);
                                // Keep the first account if possible
                                if (itemRows.length > 0) {
                                  setFormData(prev => ({ ...prev, expenseAccount: itemRows[0].account }));
                                }
                              }}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              Cancel Itemize
                            </button>
                          </div>
                        </div>
                      )}
                      {expenseAccountOpen && !isItemized && (
                        <div className="absolute top-full left-0 w-[320px] mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto flex flex-col">
                          <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0 z-10">
                            <Search size={14} className="text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={expenseAccountSearch}
                              onChange={(e) => setExpenseAccountSearch(e.target.value)}
                              className="flex-1 border-none outline-none text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="py-1 overflow-y-auto max-h-[250px]">
                            {Object.keys(filteredAccounts).length === 0 ? (
                              <div className="p-3 text-sm text-gray-500 text-center">
                                No accounts found
                              </div>
                            ) : (
                              Object.entries(filteredAccounts).map(([category, items]: [string, any]) => (
                                <div key={category}>
                                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 mb-0.5">
                                    {category}
                                  </div>
                                  {Array.isArray(items) && items.map((account: string) => {
                                    const isSelected = formData.expenseAccount === account;
                                    return (
                                      <div
                                        key={account}
                                        onClick={() => handleExpenseAccountSelect(account)}
                                        className={`w-full px-6 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected
                                          ? "bg-[#156372] text-white"
                                          : "text-gray-700 hover:bg-gray-50"
                                          }`}
                                      >
                                        <span>{account}</span>
                                        {isSelected && <Check size={14} className="text-white" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))
                            )}
                          </div>
                          <div
                            className="p-3 border-t border-gray-200 text-sm font-medium text-[#156372] cursor-pointer hover:bg-gray-50 sticky bottom-0 bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpenseAccountOpen(false);
                              navigate("/accountant/chart-of-accounts", {
                                state: { from: location.pathname },
                              });
                            }}
                          >
                            + New Account
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-red-600 flex items-center">
                      Amount<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px] flex">
                      <div className="relative flex-1 flex border border-gray-300 rounded-md overflow-hidden focus-within:border-[#156372] focus-within:ring-1 focus-within:ring-[#156372]">
                        <div className="relative bg-gray-100 border-r border-gray-300">
                          <select
                            name="currency"
                            value={formData.currency}
                            onChange={(e) => {
                              if (e.target.value === "ADD_NEW") {
                                setNewCurrencyModalOpen(true);
                              } else {
                                handleChange(e);
                              }
                            }}
                            className="appearance-none bg-transparent pl-3 pr-8 py-2 text-sm outline-none cursor-pointer font-medium text-gray-700"
                            style={{ minWidth: "80px" }}
                          >
                            <option value={baseCurrencyCode || formData.currency || "USD"}>
                              {baseCurrencyCode || formData.currency || "USD"}
                            </option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="flex-1 px-3 py-2 text-sm outline-none border-none"
                          readOnly={isItemized}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount Is - Tax Inclusive/Exclusive */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4 mt-4">
                    <label className="text-sm font-medium text-gray-700">
                      Amount Is
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="amountIs"
                            checked={formData.is_inclusive_tax === true}
                            onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: true }))}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#2196F3] checked:bg-[#2196F3] transition-all"
                          />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                        </div>
                        <span className="text-sm text-gray-700">Tax Inclusive</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative flex items-center">
                          <input
                            type="radio"
                            name="amountIs"
                            checked={formData.is_inclusive_tax === false}
                            onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: false }))}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-[#2196F3] checked:bg-[#2196F3] transition-all"
                          />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none"></div>
                        </div>
                        <span className="text-sm text-gray-700">Tax Exclusive</span>
                      </label>
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 my-8"></div>

                  {/* Paid Through */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-red-600 flex items-center">
                      Paid Through<span className="ml-[1px]">*</span>
                    </label>
                    <div className="max-w-[460px] relative" ref={paidThroughRef}>
                      <div
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                        onClick={() => {
                          if (!paidThroughOpen) {
                            closeAllDropdowns();
                          }
                          setPaidThroughOpen(!paidThroughOpen);
                        }}
                      >
                        <span className={!formData.paidThrough ? "text-gray-400" : ""}>
                          {formData.paidThrough || "Select an account"}
                        </span>
                        <ChevronDown size={14} className="text-gray-500" />
                      </div>
                      {paidThroughOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto flex flex-col min-w-full">
                          <div className="p-2 border-b border-gray-200 flex items-center gap-2 bg-white sticky top-0 z-10">
                            <Search size={14} className="text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search"
                              value={paidThroughSearch}
                              onChange={(e) => setPaidThroughSearch(e.target.value)}
                              className="flex-1 border-none outline-none text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="py-1 overflow-y-auto max-h-[250px]">
                            {Object.entries(filteredPaidThrough).map(([category, items]) => (
                              <div key={category}>
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 mb-0.5">
                                  {category}
                                </div>
                                {items.map((account) => {
                                  const isSelected = formData.paidThrough === account;
                                  return (
                                    <div
                                      key={account}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, paidThrough: account }));
                                        setPaidThroughOpen(false);
                                        setPaidThroughSearch("");
                                      }}
                                      className={`w-full px-6 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${isSelected
                                        ? "bg-[#156372] text-white"
                                        : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                      <span>{account}</span>
                                      {isSelected && <Check size={14} className="text-white" />}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                          <div
                            className="p-3 border-t border-gray-200 text-sm font-medium text-[#156372] cursor-pointer hover:bg-gray-50 sticky bottom-0 bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaidThroughOpen(false);
                              navigate("/accountant/chart-of-accounts", {
                                state: { from: location.pathname },
                              });
                            }}
                          >
                            + New Account
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tax */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Tax</label>
                    <div className="max-w-[460px]">
                      <select
                        name="tax"
                        value={formData.tax}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 bg-[#f8fafc] px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      >
                        <option value="">Select a Tax</option>
                        {taxes.map((tax: any) => (
                          <option key={tax._id || tax.id} value={tax._id || tax.id}>
                            {tax.name} [{Number(tax.rate || 0)}%]
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/settings/taxes/new", {
                            state: { from: location.pathname },
                          })
                        }
                        className="mt-1 text-xs text-[#156372] hover:underline"
                      >
                        + New Tax
                      </button>
                    </div>
                  </div>

                  {/* Vendor */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Vendor</label>
                    <div className="max-w-[460px] flex gap-0">
                      <div className="flex-1 relative">
                        <div
                          className="w-full rounded-l-md rounded-r-none border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          onClick={() => setVendorOpen(!vendorOpen)}
                        >
                          <span className={!formData.vendor ? "text-gray-400" : ""}>
                            {formData.vendor || "Select a vendor"}
                          </span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </div>
                        {vendorOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2 sticky top-0 bg-white">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search vendors"
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                className="flex-1 border-none outline-none text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="py-1">
                              {loadingVendors ? (
                                <div className="p-3 text-sm text-gray-500 text-center">Loading...</div>
                              ) : allVendors.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 text-center">No vendors found</div>
                              ) : (
                                allVendors
                                  .filter(v => (v.displayName || v.name || "").toLowerCase().includes(vendorSearch.toLowerCase()))
                                  .map(v => (
                                    <div
                                      key={v._id || v.id}
                                      onClick={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          vendor: v.displayName || v.name,
                                          vendor_id: v._id || v.id
                                        }));
                                        setVendorOpen(false);
                                      }}
                                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    >
                                      {v.displayName || v.name}
                                    </div>
                                  ))
                              )}
                            </div>
                            <div
                              className="p-3 border-t border-gray-200 text-sm font-medium text-[#156372] cursor-pointer hover:bg-gray-50 sticky bottom-0 bg-white"
                              onClick={() => {
                                setVendorOpen(false);
                                navigate("/purchases/vendors/new", {
                                  state: { from: location.pathname },
                                });
                              }}
                            >
                              + New Vendor
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setVendorSearchModalOpen(true)}
                        className="p-2 bg-[#156372] text-white rounded-r-md rounded-l-none hover:bg-[#156372] transition-colors"
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Reference#</label>
                    <div className="max-w-[460px]">
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid grid-cols-[180px_1fr] items-start gap-4">
                    <label className="text-sm font-medium text-gray-700 mt-2">Description</label>
                    <div className="max-w-[460px]">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Max. 500 characters"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] min-h-[100px] resize-none"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 my-8"></div>

                  {/* Customer Name */}
                  <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Customer Name</label>
                    <div className="max-w-[560px] flex items-center gap-0">
                      <div className="flex-1 relative" ref={customerRef}>
                        <div
                          className="w-full rounded-l-md rounded-r-none border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 flex items-center justify-between cursor-pointer focus:border-[#156372] focus:ring-1 focus:ring-[#156372]"
                          onClick={() => setCustomerOpen(!customerOpen)}
                        >
                          <span className={!formData.customerName ? "text-gray-400" : ""}>
                            {formData.customerName || "Select or add a customer"}
                          </span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </div>
                        {customerOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
                            <div className="p-2 border-b border-gray-200 flex items-center gap-2 sticky top-0 bg-white">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search customers"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="flex-1 border-none outline-none text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="py-1">
                              {loadingCustomers ? (
                                <div className="p-3 text-sm text-gray-500 text-center">
                                  Loading customers...
                                </div>
                              ) : allCustomers.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 text-center">
                                  No customers found
                                </div>
                              ) : (
                                allCustomers
                                  .filter(c => (c.displayName || c.name || "").toLowerCase().includes(customerSearch.toLowerCase()))
                                  .map(c => (
                                    <div
                                      key={c._id || c.id}
                                      onClick={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          customerName: c.displayName || c.name,
                                          customer_id: c._id || c.id,
                                          billable: c ? prev.billable : false,
                                          projectName: "",
                                          project_id: "",
                                        }));
                                        setCustomerProjects([]);
                                        setCustomerOpen(false);
                                      }}
                                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    >
                                      {c.displayName || c.name}
                                    </div>
                                  ))
                              )}
                            </div>
                            <div
                              className="p-3 border-t border-gray-200 text-sm font-medium text-[#156372] cursor-pointer hover:bg-gray-50 sticky bottom-0 bg-white"
                              onClick={() => {
                                setCustomerOpen(false);
                                navigate("/sales/customers/new", {
                                  state: { from: location.pathname },
                                });
                              }}
                            >
                              + New Customer
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setCustomerSearchModalOpen(true)}
                        className="p-2 bg-[#156372] text-white rounded-r-md rounded-l-none hover:bg-[#156372] transition-colors"
                      >
                        <Search size={16} />
                      </button>
                      <label className={`ml-3 flex items-center gap-1.5 text-sm ${formData.customer_id ? "text-gray-700" : "text-gray-400"}`}>
                        <input
                          type="checkbox"
                          name="billable"
                          checked={!!formData.billable}
                          disabled={!formData.customer_id}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-300 text-[#156372] focus:ring-[#156372] disabled:cursor-not-allowed"
                        />
                        Billable
                      </label>
                    </div>
                  </div>

                  {formData.billable && formData.customer_id && (
                    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">Projects</label>
                      <div className="max-w-[460px]">
                        <select
                          value={formData.project_id}
                          onChange={(e) => {
                            const selectedProject = customerProjects.find((project) => project.id === e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              project_id: e.target.value,
                              projectName: selectedProject?.name || "",
                            }));
                          }}
                          onFocus={() => {
                            if (!loadingCustomerProjects && customerProjects.length === 0) {
                              void loadProjectsForSelectedCustomer(formData.customer_id);
                            }
                          }}
                          disabled={!formData.customer_id || loadingCustomerProjects}
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#156372] focus:ring-1 focus:ring-[#156372] disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <option value="">
                            {loadingCustomerProjects ? "Loading projects..." : "Select a project"}
                          </option>
                          {customerProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        {!loadingCustomerProjects && customerProjects.length === 0 && (
                          <p className="mt-1 text-xs text-gray-500">No projects found for the selected customer.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reporting Tags */}
                  <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Reporting Tags</label>
                    <button
                      onClick={() => setAssociateTagsModalOpen(true)}
                      className="flex items-center gap-2 text-sm text-[#156372] font-medium hover:underline"
                    >
                      <Bookmark size={14} className="rotate-90" />
                      Associate Tags
                    </button>
                  </div>
                </div>

                {/* Right Section - Receipts */}
                <div className="w-[380px]">
                  <div className="bg-white border border-dashed border-[#cbd5e1] rounded-lg p-8 min-h-[440px] flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-teal-50 rounded-lg flex items-center justify-center mb-6">
                      <ImageIcon size={32} className="text-blue-900" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Drag or Drop your Receipts</h3>
                    <p className="text-xs text-gray-500 mb-8">Maximum file size allowed is 10MB</p>

                    <div className="flex w-full items-stretch">
                      <button
                        onClick={handleUploadClick}
                        className="flex-1 bg-[#f1f5f9] border border-[#d1d5db] text-[#334155] py-2.5 px-4 rounded-l-md text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#e2e8f0] transition-colors"
                      >
                        <UploadIcon size={16} />
                        Upload your Files
                      </button>
                      <button
                        className="px-3 bg-[#f1f5f9] border border-[#d1d5db] border-l-0 rounded-r-md text-gray-500 hover:bg-[#e2e8f0]"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <div className="mt-6 w-full space-y-2">
                      {uploadedFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-600 truncate">{file.name}</span>
                          </div>
                          <button onClick={() => handleRemoveFile(file.id)} className="text-gray-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf"
                  />
                </div>
              </div>

            )) : (
            <div className="p-6 max-w-full">
              {/* Bulk Add Expenses Table */}
              <div style={{ backgroundColor: "white", borderRadius: "6px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          DATE<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          EXPENSE ACCOUNT<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          AMOUNT<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          PAID THROUGH<span style={{ color: "#156372" }}>*</span>
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          VENDOR
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          CUSTOMER NAME
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          PROJECTS
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          BILLABLE
                        </th>
                        <th style={{ padding: "12px 16px", textAlign: "center", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkExpenses.map((expense, index) => (
                        <tr key={expense.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          {/* DATE */}
                          <td style={{ padding: "8px 16px" }}>
                            <DatePicker
                              value={expense.date}
                              onChange={(date) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].date = date;
                                setBulkExpenses(newExpenses);
                              }}
                              placeholder="dd/mm/yyyy"
                            />
                          </td>

                          {/* EXPENSE ACCOUNT */}
                          <td style={{ padding: "8px 16px" }}>
                            <select
                              value={expense.expenseAccount}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].expenseAccount = e.target.value;
                                setBulkExpenses(newExpenses);
                              }}
                              style={{
                                padding: "6px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                width: "100%",
                                outline: "none",
                                color: expense.expenseAccount ? "#374151" : "#9ca3af"
                              }}
                            >
                              <option value="">Select an account</option>
                              {Object.entries(structuredAccounts).map(([category, items]: [string, any]) => (
                                <optgroup key={category} label={category}>
                                  {items.map((acc: string) => (
                                    <option key={acc} value={acc}>{acc}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>

                          {/* AMOUNT */}
                          <td style={{ padding: "8px 16px" }}>
                            <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: "4px", overflow: "hidden", minWidth: "160px" }}>
                              <div style={{ position: "relative", backgroundColor: "#f3f4f6", borderRight: "1px solid #d1d5db" }}>
                                <select
                                  value={expense.currency}
                                  onChange={(e) => {
                                    if (e.target.value === "ADD_NEW") {
                                      setNewCurrencyModalOpen(true);
                                    } else {
                                      const newExpenses = [...bulkExpenses];
                                      newExpenses[index].currency = e.target.value;
                                      setBulkExpenses(newExpenses);
                                    }
                                  }}
                                  style={{
                                    padding: "6px 28px 6px 12px",
                                    fontSize: "14px",
                                    border: "none",
                                    backgroundColor: "transparent",
                                    outline: "none",
                                    appearance: "none",
                                    cursor: "pointer",
                                    color: "#374151",
                                    fontWeight: "500"
                                  }}
                                >
                                  <option value={baseCurrencyCode || expense.currency || "USD"}>
                                    {baseCurrencyCode || expense.currency || "USD"}
                                  </option>
                                </select>
                                <ChevronDown size={14} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7280" }} />
                              </div>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={expense.amount}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].amount = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "14px",
                                  border: "none",
                                  flex: 1,
                                  outline: "none",
                                  width: "100%"
                                }}
                              />
                            </div>
                          </td>

                          {/* PAID THROUGH */}
                          <td style={{ padding: "8px 16px" }}>
                            <select
                              value={expense.paidThrough}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].paidThrough = e.target.value;
                                setBulkExpenses(newExpenses);
                              }}
                              style={{
                                padding: "6px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                width: "100%",
                                outline: "none",
                                color: expense.paidThrough ? "#374151" : "#9ca3af"
                              }}
                            >
                              <option value="">Select an account</option>
                              {Object.entries(structuredPaidThrough).map(([category, items]: [string, any]) => (
                                <optgroup key={category} label={category}>
                                  {items.map((account: string) => (
                                    <option key={account} value={account}>
                                      {account}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>

                          {/* VENDOR */}
                          <td style={{ padding: "8px 16px" }}>
                            <div style={{ position: "relative" }}>
                              <select
                                value={expense.vendor}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].vendor = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  color: expense.vendor ? "#374151" : "#9ca3af",
                                  appearance: "none",
                                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "right 8px center",
                                  backgroundSize: "16px"
                                }}
                              >
                                <option value="">Select a vendor</option>
                                {allVendors.map(v => (
                                  <option key={v._id || v.id} value={v.displayName || v.name}>
                                    {v.displayName || v.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* CUSTOMER NAME */}
                          <td style={{ padding: "8px 16px" }}>
                            <div style={{ position: "relative" }}>
                              <select
                                value={expense.customerName}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].customerName = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  color: expense.customerName ? "#374151" : "#9ca3af",
                                  appearance: "none",
                                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "right 8px center",
                                  backgroundSize: "16px"
                                }}
                              >
                                <option value="">Select a customer</option>
                                {allCustomers.map(c => (
                                  <option key={c._id || c.id} value={c.displayName || c.name}>
                                    {c.displayName || c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* PROJECTS */}
                          <td style={{ padding: "8px 16px" }}>
                            <div style={{ position: "relative" }}>
                              <select
                                value={expense.projects}
                                onChange={(e) => {
                                  const newExpenses = [...bulkExpenses];
                                  newExpenses[index].projects = e.target.value;
                                  setBulkExpenses(newExpenses);
                                }}
                                style={{
                                  padding: "6px 32px 6px 12px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  color: expense.projects ? "#374151" : "#9ca3af",
                                  appearance: "none"
                                }}
                              >
                                <option value="">Select a project</option>
                                {allProjects.map(p => (
                                  <option key={p._id || p.id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={16} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
                            </div>
                          </td>

                          {/* BILLABLE */}
                          <td style={{ padding: "8px 16px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={expense.billable}
                              onChange={(e) => {
                                const newExpenses = [...bulkExpenses];
                                newExpenses[index].billable = e.target.checked;
                                setBulkExpenses(newExpenses);
                              }}
                              style={{ width: "16px", height: "16px", cursor: "pointer" }}
                            />
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "8px 16px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (bulkExpenses.length > 1) {
                                  setBulkExpenses(bulkExpenses.filter((_, i) => i !== index));
                                }
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "#9ca3af",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add More Expenses Button */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkExpenses([...bulkExpenses, {
                        id: Date.now(),
                        date: "",
                        expenseAccount: "",
                        amount: "",
                        currency: baseCurrencyCode || "USD",
                        paidThrough: "",
                        vendor: "",
                        customerName: "",
                        projects: "",
                        billable: false
                      }]);
                    }}
                    style={{
                      padding: "0",
                      fontSize: "14px",
                      color: "#156372",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "500",
                      textAlign: "left"
                    }}
                  >
                    + Add More Expenses
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Bottom Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex gap-3">
            <button
              type="button"
              className="bg-[#156372] hover:bg-[#156372] text-white px-6 py-2.5 rounded-md border border-[#156372] text-sm font-medium"
              onClick={handleSave}
              disabled={!!saveLoadingState}
            >
              {saveLoadingState === "save" ? "Saving..." : (isEdit ? "Update" : "Save")} <span className="text-xs opacity-75">(Alt+S)</span>
            </button>
            {!isEdit && (
              <button
                type="button"
                className="bg-white text-gray-700 px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-medium"
                onClick={handleSaveAndNew}
                disabled={!!saveLoadingState}
              >
                {saveLoadingState === "saveAndNew" ? "Saving..." : "Save and New"} <span className="text-xs opacity-75">(Alt+N)</span>
              </button>
            )}
            <button
              type="button"
              className="bg-white text-gray-700 px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-medium"
              onClick={handleCancel}
              disabled={!!saveLoadingState}
            >
              Cancel
            </button>
          </div>
        </div >

        {/* New Currency Modal */}
        {newCurrencyModalOpen && (
          <NewCurrencyModal
            onClose={() => setNewCurrencyModalOpen(false)}
            onSave={async (currencyData) => {
              try {
                // Currencies are usually created in settings, but we can call the API here if needed
                // For now, reload currencies after save
                const response = await fetch('/api/settings/currencies', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                  },
                  body: JSON.stringify({
                    code: currencyData.code.split(' - ')[0],
                    symbol: currencyData.symbol,
                    name: currencyData.name,
                    decimal_places: parseInt(currencyData.decimalPlaces) || 2,
                    format: currencyData.format,
                    is_base_currency: currencyData.isBaseCurrency
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  if (data.success) {
                    // Update currencies and select the new one
                    const updatedCurrencies = await dbCurrenciesAPI.getAll();
                    if (updatedCurrencies && updatedCurrencies.success) {
                      setCurrencies(updatedCurrencies.data);
                      const newCode = currencyData.code.split(' - ')[0];
                      setFormData(prev => ({ ...prev, currency: newCode }));
                    }
                  }
                }
                setNewCurrencyModalOpen(false);
              } catch (error) {
                console.error("Error saving currency:", error);
                alert("Error saving currency");
              }
            }}
          />
        )}

        {/* New Account Modal */}
        {
          newAccountModalOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999
              }}
              onClick={handleCancelNewAccount}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "4px",
                  width: "750px",
                  maxWidth: "95vw",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "inherit"
                }}
              >
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9fafb",
                  borderTopLeftRadius: "4px",
                  borderTopRightRadius: "4px"
                }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>Create Account</h2>
                  <button
                    type="button"
                    onClick={handleCancelNewAccount}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: "24px", display: "flex", gap: "32px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Account Type */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>
                        Account Type*
                      </label>
                      <div style={{ position: "relative" }}>
                        <div
                          onClick={() => setAccountTypeOpen(!accountTypeOpen)}
                          style={{
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none",
                            cursor: "pointer",
                            backgroundColor: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            boxSizing: "border-box"
                          }}
                        >
                          <span>{newAccountData.accountType}</span>
                          {accountTypeOpen ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                        </div>

                        {accountTypeOpen && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            marginTop: "4px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            zIndex: 999999,
                            maxHeight: "300px",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column"
                          }}>
                            <div style={{
                              padding: "8px 12px",
                              borderBottom: "1px solid #e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              backgroundColor: "#ffffff",
                              position: "sticky",
                              top: 0
                            }}>
                              <Search size={14} style={{ color: "#9ca3af" }} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={accountTypeSearch}
                                onChange={(e) => setAccountTypeSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{
                                  border: "none",
                                  outline: "none",
                                  fontSize: "14px",
                                  width: "100%"
                                }}
                              />
                            </div>

                            {Object.entries(ACCOUNT_TYPES_STRUCTURE).map(([category, types]) => {
                              const filteredTypes = types.filter(t => t.toLowerCase().includes(accountTypeSearch.toLowerCase()));
                              if (filteredTypes.length === 0 && !category.toLowerCase().includes(accountTypeSearch.toLowerCase())) return null;

                              // If category matches but types don't, show all? Or just matching types? 
                              // Standard behavior: if category matches, show all. If type matches, show type.
                              const typesToShow = category.toLowerCase().includes(accountTypeSearch.toLowerCase()) ? types : filteredTypes;

                              if (typesToShow.length === 0) return null;

                              return (
                                <div key={category}>
                                  <div style={{
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    color: "#1f2937",
                                    backgroundColor: "transparent",
                                    marginTop: "4px"
                                  }}>
                                    {category}
                                  </div>
                                  {typesToShow.map(type => (
                                    <div
                                      key={type}
                                      onClick={() => {
                                        handleNewAccountChange({ target: { name: 'accountType', value: type } });
                                        setAccountTypeOpen(false);
                                        setAccountTypeSearch("");
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#156372";
                                        e.currentTarget.style.color = "#ffffff";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.color = "#374151";
                                      }}
                                      style={{
                                        padding: "8px 24px",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        color: "#374151",
                                        transition: "all 0.1s"
                                      }}
                                    >
                                      <span>{type}</span>
                                      {newAccountData.accountType === type && <Check size={14} />}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account Name */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>
                        Account Name*
                      </label>
                      <input
                        type="text"
                        name="accountName"
                        value={newAccountData.accountName}
                        onChange={handleNewAccountChange}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none"
                        }}
                      />
                    </div>

                    {/* Sub Account Checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        name="isSubAccount"
                        checked={newAccountData.isSubAccount}
                        onChange={handleNewAccountChange}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "14px", color: "#374151" }}>Make this a sub-account</span>
                      <Info size={14} color="#9ca3af" />
                    </div>

                    {/* Parent Account Field - Conditional */}
                    {newAccountData.isSubAccount && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>
                          Parent Account*
                        </label>
                        <div style={{ position: "relative" }}>
                          <div
                            onClick={() => setParentAccountOpen(!parentAccountOpen)}
                            style={{
                              padding: "8px 12px",
                              fontSize: "14px",
                              border: "1px solid #156372", // Highlighted border as in screenshot
                              borderRadius: "4px",
                              width: "100%",
                              outline: "none",
                              cursor: "pointer",
                              backgroundColor: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              boxSizing: "border-box"
                            }}
                          >
                            <span style={{ color: newAccountData.parentAccount ? "#374151" : "#9ca3af" }}>
                              {newAccountData.parentAccount || "Select an account"}
                            </span>
                            {parentAccountOpen ? <ChevronUp size={16} color="#156372" /> : <ChevronDown size={16} color="#6b7280" />}
                          </div>

                          {parentAccountOpen && (
                            <div style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              marginTop: "4px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                              zIndex: 999999,
                              maxHeight: "200px",
                              overflowY: "auto",
                              display: "flex",
                              flexDirection: "column"
                            }}>
                              <div style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                backgroundColor: "#ffffff",
                                position: "sticky",
                                top: 0
                              }}>
                                <Search size={14} style={{ color: "#9ca3af" }} />
                                <input
                                  type="text"
                                  placeholder="Search"
                                  value={parentAccountSearch}
                                  onChange={(e) => setParentAccountSearch(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                  style={{
                                    border: "none",
                                    outline: "none",
                                    fontSize: "14px",
                                    width: "100%"
                                  }}
                                />
                              </div>

                              {/* Show filtered accounts from the SAME category as selected accountType if possible */}
                              {(() => {
                                // Simple logic: mapping accountType to main structure keys
                                let targetCategory = "Expense";
                                const type = newAccountData.accountType;
                                // Match the earlier mapping logic
                                if (type === "Cost of Goods Sold") targetCategory = "Cost of Goods Sold";
                                else if (type === "Fixed Asset") targetCategory = "Fixed Asset";
                                else if (type.includes("Liability")) targetCategory = "Other Current Liability"; // Approximate
                                else if (type.includes("Asset")) targetCategory = "Other Current Asset"; // Approximate
                                else targetCategory = "Expense";

                                // Or better, just show active category if it exists in structure, else fallback
                                let accountsToShow = [];
                                let categoryTitle = targetCategory;

                                // Try to find exact match in structure keys
                                // structuredAccounts keys: "Cost of Goods Sold", "Expense", "Other Current Liability", "Fixed Asset", "Other Current Asset"

                                // We will iterate and find best match or simply list all relevant
                                if (structuredAccounts[targetCategory]) {
                                  accountsToShow = structuredAccounts[targetCategory];
                                } else {
                                  // Fallback: Show all? No, likely empty.
                                  // Show Fixed Asset if select key matches
                                  if (type === 'Fixed Asset' && structuredAccounts['Fixed Asset']) {
                                    accountsToShow = structuredAccounts['Fixed Asset'];
                                    categoryTitle = "Fixed Asset";
                                  }
                                }

                                const filtered = accountsToShow.filter(a => a.toLowerCase().includes(parentAccountSearch.toLowerCase()));

                                if (filtered.length === 0) return <div style={{ padding: "12px", color: "#9ca3af", fontSize: "13px", textAlign: "center" }}>No accounts found</div>

                                return (
                                  <div>
                                    <div style={{
                                      padding: "8px 12px",
                                      fontSize: "12px",
                                      fontWeight: "700",
                                      color: "#4b5563",
                                      backgroundColor: "transparent",
                                      marginTop: "4px"
                                    }}>
                                      {categoryTitle}
                                    </div>
                                    {filtered.map(acc => (
                                      <div
                                        key={acc}
                                        onClick={() => {
                                          setNewAccountData(prev => ({ ...prev, parentAccount: acc }));
                                          setParentAccountOpen(false);
                                          setParentAccountSearch("");
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = "#156372";
                                          e.currentTarget.style.color = "#ffffff";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                          e.currentTarget.style.color = "#374151";
                                        }}
                                        style={{
                                          padding: "8px 24px",
                                          fontSize: "14px",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          color: "#374151",
                                          transition: "all 0.1s"
                                        }}
                                      >
                                        <span>{acc}</span>
                                        {newAccountData.parentAccount === acc && <Check size={14} />}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Account Code */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", textDecoration: "underline dashed #9ca3af", textUnderlineOffset: "4px", alignSelf: "flex-start" }}>
                        Account Code
                      </label>
                      <input
                        type="text"
                        name="accountCode"
                        value={newAccountData.accountCode}
                        onChange={handleNewAccountChange}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          maxWidth: "200px",
                          outline: "none"
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={newAccountData.description}
                        onChange={handleNewAccountChange}
                        placeholder="Max. 500 characters"
                        maxLength={500}
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none",
                          minHeight: "80px",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                      />
                    </div>

                    {/* Taban Books Expense Checkbox */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        name="tabanExpense"
                        checked={newAccountData.tabanExpense}
                        onChange={handleNewAccountChange}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "14px", color: "#374151" }}>Show as an active account in Taban Books Expense</span>
                      <Info size={14} color="#9ca3af" />
                    </div>
                  </div>

                  {/* Right Side Info Box - Dynamic based on account type */}
                  <div style={{ width: "240px", flexShrink: 0 }}>
                    <div style={{
                      backgroundColor: "#1e293b",
                      borderRadius: "6px",
                      padding: "20px",
                      color: "white",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>
                        {getAccountTypeInfo(newAccountData.accountType).title}
                      </div>
                      <div style={{ fontSize: "13px", lineHeight: "1.6", opacity: 0.9 }}>
                        {getAccountTypeInfo(newAccountData.accountType).description}
                        <ul style={{ paddingLeft: "20px", marginTop: "12px", margin: 0, listStyleType: "disc" }}>
                          {getAccountTypeInfo(newAccountData.accountType).points.map((point, idx) => (
                            <li key={idx} style={{ marginBottom: "4px" }}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "12px",
                  backgroundColor: "#ffffff",
                  borderBottomLeftRadius: "4px",
                  borderBottomRightRadius: "4px"
                }}>
                  <button
                    type="button"
                    onClick={handleSaveAndSelect}
                    style={{
                      padding: "8px 20px",
                      fontSize: "14px",
                      backgroundColor: "#156372",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                    }}
                  >
                    Save and Select
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNewAccount}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* New Vendor Modal */}
        <NewVendorModal
          isOpen={newVendorModalOpen}
          onClose={() => setNewVendorModalOpen(false)}
          onVendorCreated={async (vendor) => {
            // Update vendor field with the created vendor's display name and ID
            const vendorId = vendor._id || vendor.id;
            const displayName = vendor.displayName || vendor.companyName || vendor.name || "";
            if (displayName && vendorId) {
              setFormData(prev => ({
                ...prev,
                vendor: displayName,
                vendor_id: vendorId
              }));
            }
            // Reload vendors list from API
            try {
              const vendorsResponse = await vendorsAPI.getAll({ limit: 1000 });
              if (vendorsResponse && vendorsResponse.success && vendorsResponse.data) {
                setAllVendors(filterActiveRecords(vendorsResponse.data));
              }
            } catch (error) {
              console.error("Error reloading vendors:", error);
            }
            setNewVendorModalOpen(false);
          }}
        />

        {/* Old inline modal - keeping for reference but commented out */}
        {
          false && newVendorModalOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999
              }}
              onClick={() => setNewVendorModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "4px",
                  width: "700px",
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "inherit",
                  overflow: "hidden"
                }}
              >
                {/* Modal Header */}
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9fafb"
                }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>New Vendor</h2>
                  <button
                    type="button"
                    onClick={() => setNewVendorModalOpen(false)}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#156372" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                  {/* Primary Contact */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Primary Contact
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        outline: "none",
                        width: "120px"
                      }}>
                        <option>Salutation</option>
                        <option>Mr</option>
                        <option>Mrs</option>
                        <option>Ms</option>
                        <option>Dr</option>
                      </select>
                      <input
                        type="text"
                        placeholder="First Name"
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #156372",
                          borderRadius: "4px",
                          outline: "none",
                          flex: 1
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          outline: "none",
                          flex: 1
                        }}
                      />
                    </div>
                  </div>

                  {/* Company Name */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        width: "100%",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Display Name */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Display Name*
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <select style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      width: "100%",
                      outline: "none",
                      color: "#9ca3af"
                    }}>
                      <option>Select or type to add</option>
                    </select>
                  </div>

                  {/* Email Address */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Email Address
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>âœ‰</span>
                      <input
                        type="email"
                        style={{
                          padding: "8px 12px 8px 36px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Phone
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>ðŸ“ž</span>
                        <input
                          type="text"
                          placeholder="Work Phone"
                          style={{
                            padding: "8px 12px 8px 36px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>ðŸ“±</span>
                        <input
                          type="text"
                          placeholder="Mobile"
                          style={{
                            padding: "8px 12px 8px 36px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vendor Language */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Vendor Language
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <select style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      width: "100%",
                      outline: "none"
                    }}>
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>

                  {/* Tabs */}
                  <div style={{ borderBottom: "2px solid #e5e7eb", marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "24px" }}>
                      <div style={{
                        padding: "12px 0",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#156372",
                        borderBottom: "2px solid #156372",
                        marginBottom: "-2px",
                        cursor: "pointer"
                      }}>
                        Other Details
                      </div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Address</div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Custom Fields</div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Reporting Tags</div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Remarks</div>
                    </div>
                  </div>

                  {/* Other Details Tab Content */}
                  <div>
                    {/* Location Code */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                        Location Code
                        <Info size={14} color="#9ca3af" />
                      </label>
                      <input
                        type="text"
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    {/* Currency */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Currency
                      </label>
                      <select style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        width: "100%",
                        outline: "none"
                      }}>
                        <option>{`${baseCurrencyCode || "USD"} - Base Currency`}</option>
                      </select>
                    </div>

                    {/* Opening Balance */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Opening Balance
                      </label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          backgroundColor: "#f9fafb",
                          fontWeight: "500"
                        }}>
                          {baseCurrencyCode || "USD"}
                        </div>
                        <input
                          type="text"
                          style={{
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            flex: 1,
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Payment Terms
                      </label>
                      <select style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        width: "100%",
                        outline: "none"
                      }}>
                        <option>Due on Receipt</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 60</option>
                      </select>
                    </div>

                    {/* Enable Portal */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                        Enable Portal?
                        <Info size={14} color="#9ca3af" />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input type="checkbox" style={{ width: "16px", height: "16px" }} />
                        <span style={{ fontSize: "14px", color: "#374151" }}>Allow portal access for this vendor</span>
                      </label>
                    </div>

                    {/* Documents */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Documents
                      </label>
                      <div>
                        <button
                          type="button"
                          style={{
                            padding: "8px 16px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            backgroundColor: "white",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#374151",
                            marginBottom: "8px"
                          }}
                        >
                          <UploadIcon size={14} />
                          Upload File
                          <ChevronDown size={14} />
                        </button>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          You can upload a maximum of 10 files, 10MB each
                        </div>
                      </div>
                    </div>

                    {/* Add more details toggle and expanded section */}
                    <div>
                      {!vendorMoreDetailsExpanded ? (
                        <button
                          type="button"
                          onClick={() => setVendorMoreDetailsExpanded(true)}
                          style={{
                            fontSize: "14px",
                            color: "#156372",
                            border: "1px solid #156372",
                            background: "white",
                            cursor: "pointer",
                            padding: "6px 12px",
                            fontWeight: "500",
                            borderRadius: "4px"
                          }}
                        >
                          Add more details
                        </button>
                      ) : (
                        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
                          {/* Website URL */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Website URL
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>ðŸŒ</span>
                              <input
                                type="text"
                                placeholder="ex: www.zyiker.com"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Department */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Department
                            </label>
                            <input
                              type="text"
                              style={{
                                padding: "8px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                width: "100%",
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          {/* Designation */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Designation
                            </label>
                            <input
                              type="text"
                              style={{
                                padding: "8px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                width: "100%",
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          {/* X (Twitter) */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              X
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>ð•</span>
                              <input
                                type="text"
                                placeholder="https://x.com/"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Skype Name/Number */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Skype Name/Number
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#00aff0", fontSize: "16px" }}>S</span>
                              <input
                                type="text"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Facebook */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Facebook
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#1877f2", fontSize: "16px" }}>f</span>
                              <input
                                type="text"
                                placeholder="http://www.facebook.com/"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Customer Owner */}
                          <div style={{
                            marginTop: "24px",
                            padding: "16px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "4px",
                            border: "1px solid #e5e7eb"
                          }}>
                            <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.6" }}>
                              <strong style={{ color: "#374151" }}>Customer Owner:</strong> Assign a user as the customer owner to provide access only to the data of this customer.{" "}
                              <a
                                href="#"
                                style={{ color: "#156372", textDecoration: "none", fontWeight: "500" }}
                                onClick={(e) => e.preventDefault()}
                              >
                                Learn More
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-start"
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Save vendor logic here
                      setNewVendorModalOpen(false);
                    }}
                    style={{
                      padding: "8px 24px",
                      fontSize: "14px",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVendorModalOpen(false)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* New Customer Modal */}
        {
          newCustomerModalOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999
              }}
              onClick={() => setNewCustomerModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "4px",
                  width: "750px",
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "inherit",
                  overflow: "hidden"
                }}
              >
                {/* Modal Header */}
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9fafb"
                }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>New Customer</h2>
                  <button
                    type="button"
                    onClick={() => setNewCustomerModalOpen(false)}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#156372" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                  {/* Customer Type */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Customer Type
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="radio" name="customerType" value="Business" defaultChecked style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                        <span style={{ fontSize: "14px", color: "#374151" }}>Business</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input type="radio" name="customerType" value="Individual" style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                        <span style={{ fontSize: "14px", color: "#374151" }}>Individual</span>
                      </label>
                    </div>
                  </div>

                  {/* Primary Contact */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Primary Contact
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        outline: "none",
                        width: "120px"
                      }}>
                        <option>Salutation</option>
                        <option>Mr</option>
                        <option>Mrs</option>
                        <option>Ms</option>
                        <option>Dr</option>
                      </select>
                      <input
                        type="text"
                        placeholder="First Name"
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          outline: "none",
                          flex: 1
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          outline: "none",
                          flex: 1
                        }}
                      />
                    </div>
                  </div>

                  {/* Company Name */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        width: "100%",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Display Name */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Display Name*
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <select style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      width: "100%",
                      outline: "none",
                      color: "#9ca3af"
                    }}>
                      <option>Select or type to add</option>
                    </select>
                  </div>

                  {/* Email Address */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Email Address
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>âœ‰</span>
                      <input
                        type="email"
                        style={{
                          padding: "8px 12px 8px 36px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Phone
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>ðŸ“ž</span>
                        <input
                          type="text"
                          placeholder="Work Phone"
                          style={{
                            padding: "8px 12px 8px 36px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>ðŸ“±</span>
                        <input
                          type="text"
                          placeholder="Mobile"
                          style={{
                            padding: "8px 12px 8px 36px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Language */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                      Customer Language
                      <Info size={14} color="#9ca3af" />
                    </label>
                    <select style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      width: "100%",
                      outline: "none"
                    }}>
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>

                  {/* Tabs */}
                  <div style={{ borderBottom: "2px solid #e5e7eb", marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "24px" }}>
                      <div style={{
                        padding: "12px 0",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#156372",
                        borderBottom: "2px solid #156372",
                        marginBottom: "-2px",
                        cursor: "pointer"
                      }}>
                        Other Details
                      </div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Address</div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Custom Fields</div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Reporting Tags</div>
                      <div style={{ padding: "12px 0", fontSize: "14px", color: "#6b7280", cursor: "pointer" }}>Remarks</div>
                    </div>
                  </div>

                  {/* Other Details Tab Content */}
                  <div>
                    {/* Location Code */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                        Location Code
                        <Info size={14} color="#9ca3af" />
                      </label>
                      <input
                        type="text"
                        style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          width: "100%",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    {/* Currency */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Currency
                      </label>
                      <select style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        width: "100%",
                        outline: "none"
                      }}>
                        <option>{`${baseCurrencyCode || "USD"} - Base Currency`}</option>
                      </select>
                    </div>

                    {/* Opening Balance */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Opening Balance
                      </label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{
                          padding: "8px 12px",
                          fontSize: "14px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          backgroundColor: "#f9fafb",
                          fontWeight: "500"
                        }}>
                          {baseCurrencyCode || "USD"}
                        </div>
                        <input
                          type="text"
                          style={{
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            flex: 1,
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Payment Terms
                      </label>
                      <select style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        width: "100%",
                        outline: "none"
                      }}>
                        <option>Due on Receipt</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 60</option>
                      </select>
                    </div>

                    {/* Enable Portal */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                        Enable Portal?
                        <Info size={14} color="#9ca3af" />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input type="checkbox" style={{ width: "16px", height: "16px" }} />
                        <span style={{ fontSize: "14px", color: "#374151" }}>Allow portal access for this customer</span>
                      </label>
                    </div>

                    {/* Documents */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                        Documents
                      </label>
                      <div>
                        <button
                          type="button"
                          style={{
                            padding: "8px 16px",
                            fontSize: "14px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            backgroundColor: "white",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#374151",
                            marginBottom: "8px"
                          }}
                        >
                          <UploadIcon size={14} />
                          Upload File
                          <ChevronDown size={14} />
                        </button>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          You can upload a maximum of 10 files, 10MB each
                        </div>
                      </div>
                    </div>

                    {/* Add more details toggle and expanded section */}
                    <div>
                      {!customerMoreDetailsExpanded ? (
                        <button
                          type="button"
                          onClick={() => setCustomerMoreDetailsExpanded(true)}
                          style={{
                            fontSize: "14px",
                            color: "#156372",
                            border: "1px solid #156372",
                            background: "white",
                            cursor: "pointer",
                            padding: "6px 12px",
                            fontWeight: "500",
                            borderRadius: "4px"
                          }}
                        >
                          Add more details
                        </button>
                      ) : (
                        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
                          {/* Website URL */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Website URL
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>ðŸŒ</span>
                              <input
                                type="text"
                                placeholder="ex: www.zylker.com"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Department */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Department
                            </label>
                            <input
                              type="text"
                              style={{
                                padding: "8px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                width: "100%",
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          {/* Designation */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Designation
                            </label>
                            <input
                              type="text"
                              style={{
                                padding: "8px 12px",
                                fontSize: "14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                width: "100%",
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                            />
                          </div>

                          {/* X (Twitter) */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              X
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>ð•</span>
                              <input
                                type="text"
                                placeholder="https://x.com/"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Skype Name/Number */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Skype Name/Number
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#00aff0", fontSize: "16px" }}>S</span>
                              <input
                                type="text"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>

                          {/* Facebook */}
                          <div style={{ marginBottom: "20px" }}>
                            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>
                              Facebook
                            </label>
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#1877f2", fontSize: "16px" }}>f</span>
                              <input
                                type="text"
                                placeholder="http://www.facebook.com/"
                                style={{
                                  padding: "8px 12px 8px 36px",
                                  fontSize: "14px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  width: "100%",
                                  outline: "none",
                                  boxSizing: "border-box"
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Customer Owner */}
                    <div style={{
                      marginTop: "24px",
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "4px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.6" }}>
                        <strong style={{ color: "#374151" }}>Customer Owner:</strong> Assign a user as the customer owner to provide access only to the data of this customer.{" "}
                        <a
                          href="#"
                          style={{ color: "#156372", textDecoration: "none", fontWeight: "500" }}
                          onClick={(e) => e.preventDefault()}
                        >
                          Learn More
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-start"
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Save customer logic here
                      setNewCustomerModalOpen(false);
                    }}
                    style={{
                      padding: "8px 24px",
                      fontSize: "14px",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustomerModalOpen(false)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* Associate Tags Modal */}
        {
          associateTagsModalOpen && typeof document !== 'undefined' && document.body && createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999
              }}
              onClick={() => setAssociateTagsModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "white",
                  borderRadius: "4px",
                  width: "500px",
                  maxWidth: "90vw",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "inherit"
                }}
              >
                {/* Modal Header */}
                <div style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>Associate Tags</h2>
                  <button
                    type="button"
                    onClick={() => setAssociateTagsModalOpen(false)}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#156372",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      backgroundColor: "#156372"
                    }}
                  >
                    <X size={16} color="white" />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "24px" }}>
                  <p style={{
                    fontSize: "14px",
                    color: "#374151",
                    margin: 0,
                    lineHeight: "1.5"
                  }}>
                    There are no active reporting tags or you haven't created a reporting tag yet. You can create/edit reporting tags under settings.
                  </p>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* Advanced Vendor Search Modal */}
        {
          vendorSearchModalOpen && typeof document !== 'undefined' && document.body && createPortal(
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
                            key={vendor.id || vendor.name}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                vendor: vendor.displayName || vendor.name || "",
                                vendor_id: vendor.id || vendor._id || ""
                              }));
                              setVendorSearchModalOpen(false);
                              setVendorSearchTerm("");
                              setVendorSearchResults([]);
                            }}
                          >
                            <td className="px-4 py-3 text-sm text-[#156372] hover:underline">
                              {vendor.displayName || vendor.name || ""}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{vendor.email || ""}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{vendor.companyName || ""}</td>
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
          )
        }

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
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
                      placeholder="Enter search term"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleCustomerSearch}
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
                        customerPaginatedResults.map((customer, index) => (
                          <tr
                            key={customer._id || customer.id || `${customer.displayName || customer.name || "customer"}-${index}`}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                customerName: customer.displayName || customer.name || "",
                                customer_id: customer._id || customer.id || "",
                                billable: customer ? prev.billable : false,
                                projectName: "",
                                project_id: "",
                              }));
                              setCustomerProjects([]);
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
          )
        }
      </div>
    </>
  );
}

