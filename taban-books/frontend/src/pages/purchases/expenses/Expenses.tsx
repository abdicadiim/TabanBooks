
import React, { useState, useRef, useEffect, useMemo } from "react";
import { getExpenseCustomViews } from "../shared/purchasesModel";
import { useNavigate, useLocation } from "react-router-dom";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import DeleteConfirmationModal from "../shared/DeleteConfirmationModal";
import ExportExpenses from "./ExportExpenses";
import { jsPDF } from "jspdf";
import {
  expensesAPI,
  vendorsAPI,
  customersAPI,
  chartOfAccountsAPI,
  bankAccountsAPI,
  currenciesAPI
} from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { getBankAccountsFromResponse, getChartAccountsFromResponse, mergeAccountOptions } from "../shared/accountOptions";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  MoreVertical,
  Play,
  Star,
  ArrowUpDown,
  Download,
  Upload,
  Settings,
  FileText,
  RotateCw,
  Search,
  X,
  GripVertical,
  Trash2,
  Check,
  Lock,
  Users,
  ChevronDown as ChevronDownIcon,
  Filter,
  Info,
} from "lucide-react";

const EXPENSES_KEY = "expenses_v1";

const getLS = (k: string) => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(k);
  }
  return null;
};

export default function Expenses() {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseCurrency, symbol } = useCurrency();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [selectedSort, setSelectedSort] = useState("Created Time");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<any[]>([]);
  const [showCustomViewModal, setShowCustomViewModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [searchType, setSearchType] = useState("Expenses");
  const searchTypeOptions = [
    "Customers",
    "Items",
    "Inventory Adjustments",
    "Banking",
    "Quotes",
    "Invoices",
    "Payments Received",
    "Recurring Invoices",
    "Credit Notes",
    "Vendors",
    "Expenses",
    "Recurring Expenses",
    "Purchase Orders",
    "Bills",
    "Payments Made",
    "Recurring Bills",
    "Vendor Credits",
    "Projects",
    "Timesheet",
    "Journals",
    "Chart of Accounts",
    "Documents",
    "Task"
  ];
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState(false);
  const searchTypeDropdownRef = useRef(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [searchModalData, setSearchModalData] = useState({
    // Customers
    displayName: "",
    companyName: "",
    lastName: "",
    status: "All",
    address: "",
    customerType: "",
    firstName: "",
    email: "",
    phone: "",
    notes: "",
    // Items
    itemName: "",
    description: "",
    purchaseRate: "",
    salesAccount: "",
    sku: "",
    rate: "",
    purchaseAccount: "",
    // Expenses
    expenseAccount: "",
    expenseNotes: "",
    dateRangeFromExpense: "",
    dateRangeToExpense: "",
    totalRangeFromExpense: "",
    totalRangeToExpense: "",
    customerName: "",
    vendorName: "",
    taxExemptions: "",
    paidThrough: "",
    referenceNumber: "",
    statusExpense: "",
    source: "",
    employee: "",
    projectName: "",
    // Bills
    billNumber: "",
    vendorNameBill: "",
    referenceNumberBill: "",
    dateRangeFromBill: "",
    dateRangeToBill: "",
    totalRangeFromBill: "",
    totalRangeToBill: "",
    statusBill: "",
    // Quotes
    quoteNumber: "",
    referenceNumberQuote: "",
    // Invoices
    invoiceNumber: "",
    orderNumber: ""
  });

  const [notification, setNotification] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("expenses");
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const sortSubmenuRef = useRef(null);
  const exportSubmenuRef = useRef(null);
  const importSubmenuRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState(null);

  // Load expenses from API
  const loadExpenses = async () => {
    try {
      setIsRefreshing(true);
      // Fetch expenses, contacts and accounts in parallel to ensure we can display names
      const [response, vendorsResponse, customersResponse, accountsResponse, bankAccountsResponse, cursResp] = await Promise.all([
        expensesAPI.getAll({ limit: 1000 }),
        vendorsAPI.getAll({ limit: 1000 }),
        customersAPI.getAll({ limit: 1000 }),
        chartOfAccountsAPI.getAccounts({ limit: 1000 }),
        bankAccountsAPI.getAll({ limit: 1000 }),
        currenciesAPI.getAll(),
      ]);

      const vendors = (vendorsResponse && (vendorsResponse.data || vendorsResponse.vendors || vendorsResponse.data?.data)) || [];
      const customers = (customersResponse && (customersResponse.data || customersResponse.customers || customersResponse.data?.data)) || [];
      const chartAccounts = getChartAccountsFromResponse(accountsResponse);
      const bankAccounts = getBankAccountsFromResponse(bankAccountsResponse);
      const cursList = Array.isArray(cursResp) ? cursResp : (cursResp?.data || []);

      const accounts = mergeAccountOptions(chartAccounts, bankAccounts);

      setVendorsList(vendors);
      setCustomersList(customers);
      setAccountsList(accounts);
      setCurrencies(cursList);

      if (response && (response.code === 0 || response.success) && (response.expenses || response.data)) {
        const apiExpenses = response.expenses || response.data || [];

        // Create quick lookup maps
        const vendorById = new Map(vendors.map((v: any) => [v._id || v.id, v]));
        const customerById = new Map(customers.map((c: any) => [c._id || c.id, c]));
        const accountById = new Map(accounts.map((a: any) => [a._id || a.id, a]));

        const mapped = apiExpenses.map((expense: any) => {
          const vendorName = expense.vendor_name || expense.vendorName || expense.vendor?.name || (expense.vendor_id ? (vendorById.get(expense.vendor_id)?.displayName || vendorById.get(expense.vendor_id)?.name) : "");
          const customerName = expense.customer_name || expense.customerName || expense.customer?.name || (expense.customer_id ? (customerById.get(expense.customer_id)?.displayName || customerById.get(expense.customer_id)?.name) : "");
          const paidThroughName = expense.paid_through_account_name || expense.paidThrough || (expense.paid_through_account_id ? (accountById.get(expense.paid_through_account_id)?.accountName) : "");

          return {
            ...expense,
            id: expense.expense_id || expense._id || expense.id,
            date: expense.date ? new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
            expenseAccount: expense.account_name || (expense.account_id ? (accountById.get(expense.account_id)?.accountName) : ""),
            amount: expense.total ?? expense.amount ?? expense.sub_total ?? 0,
            currency: baseCurrency?.code || expense.currency_code || "USD",
            currencySymbol: (() => {
              const currencyStr = baseCurrency?.code || expense.currency_code || "USD";
              const code = currencyStr.split(" - ")[0];
              const match = cursList.find((c: any) => c.code === code || c.code === currencyStr);
              return match ? match.symbol : code || currencyStr;
            })(),
            paidThrough: paidThroughName || "",
            vendor: vendorName || "",
            reference: expense.reference_number,
            customerName: customerName || "",
            status: (expense.status || "").toUpperCase(),
            notes: expense.description,
          };
        });

        setExpenses(mapped);

        // Backfill missing vendor_name / paid_through_account_name on the server if we could resolve them locally
        const updates: Array<Promise<any>> = [];
        mapped.forEach((m) => {
          const raw = m; // includes raw fields
          const apiId = raw.expense_id || raw.id;
          const payload: any = {};
          let needsUpdate = false;
          if (!raw.vendor_name && raw.vendor && (raw.vendor_id || vendors.length > 0)) {
            // try to find vendor id
            const v = vendors.find((x: any) => (x.displayName || x.name) === raw.vendor || x._id === raw.vendor_id || x.id === raw.vendor_id);
            if (v) {
              payload.vendor_id = v._id || v.id;
              payload.vendor_name = v.displayName || v.name;
              needsUpdate = true;
            } else if (raw.vendor) {
              payload.vendor_name = raw.vendor;
              needsUpdate = true;
            }
          }
          if (!raw.paid_through_account_name && raw.paidThrough && (raw.paid_through_account_id || accounts.length > 0)) {
            const a = accounts.find((x: any) => x.accountName === raw.paidThrough || x._id === raw.paid_through_account_id || x.id === raw.paid_through_account_id);
            if (a) {
              payload.paid_through_account_id = a._id || a.id;
              payload.paid_through_account_name = a.accountName;
              needsUpdate = true;
            } else if (raw.paidThrough) {
              payload.paid_through_account_name = raw.paidThrough;
              needsUpdate = true;
            }
          }
          if (needsUpdate && apiId) {
            updates.push(expensesAPI.update(apiId, payload).catch((err) => { console.error('Backfill update failed for expense', apiId, err); }));
          }
        });

        if (updates.length > 0) {
          // fire and forget; continue after they settle
          Promise.allSettled(updates).then(() => {
            // refresh to reflect server changes
            loadExpenses();
          });
        }
      } else {
        setExpenses([]);
      }
    } catch (e) {
      console.error("Error loading expenses:", e);
      setExpenses([]);
      setVendorsList([]);
      setCustomersList([]);
      setAccountsList([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadSampleFile = (type) => {
    const headers = ["Expense Date", "Expense Account", "Amount", "Paid Through", "Vendor Name", "Customer Name", "Reference#", "Description"];
    const sampleData = [
      ["2023-11-01", "Office Supplies", "50.00", "Cash", "Sample Vendor", "Sample Customer", "REF-001", "Pens and notebooks"],
      ["2023-11-02", "Travel Expense", "120.00", "Bank", "Airline", "Sample Customer", "REF-002", "Flight to Nairobi"]
    ];

    let content = "";
    let mimeType = "";
    let extension = "";

    if (type === 'csv') {
      content = [headers.join(","), ...sampleData.map(row => row.join(","))].join("\n");
      mimeType = "text/csv;charset=utf-8;";
      extension = "csv";
    } else {
      content = [headers.join("\t"), ...sampleData.map(row => row.join("\t"))].join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
      extension = "xls";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sample_expenses.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    loadExpenses();
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Reload expenses when location changes (e.g., coming back from new expense page)
  useEffect(() => {
    loadExpenses();
  }, [location.pathname]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedExpenses.length > 0) {
        setSelectedExpenses([]);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedExpenses.length]);

  const handleDeleteSelected = () => {
    if (selectedExpenses.length === 0) {
      alert("Please select at least one expense to delete.");
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    const count = selectedExpenses.length;
    if (count === 0) {
      return;
    }

    try {
      const selectedIdSet = new Set(selectedExpenses.map((id) => String(id)));
      const deleteTargets = expenses.filter((expense) =>
        selectedIdSet.has(String(expense.id || expense.expense_id || expense._id))
      );

      if (!deleteTargets.length) {
        setNotification("No valid expense IDs selected for delete." as any);
        setTimeout(() => setNotification(null), 3000);
        setShowDeleteModal(false);
        return;
      }

      // Delete each selected expense from the database
      const deletePromises = deleteTargets.map(async (expense: any) => {
        const expenseId = expense.expense_id || expense.id || expense._id;
        if (!expense) {
          return { success: false, id: "unknown", error: "Not found" };
        }

        try {
          await expensesAPI.delete(expenseId);
          return { success: true, id: expenseId };
        } catch (error) {
          console.error(`Error deleting expense ${expenseId}:`, error);
          return { success: false, id: expenseId, error };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      // Refresh expenses from database
      await loadExpenses();

      // Show success/error notification
      if (failed === 0) {
        setNotification(`The selected expense${count > 1 ? "s have" : " has"} been deleted successfully.` as any);
      } else if (successful > 0) {
        setNotification(`${successful} expense${successful > 1 ? "s" : ""} deleted successfully. ${failed} failed.` as any);
      } else {
        setNotification(`Failed to delete expenses. Please try again.` as any);
      }
      setTimeout(() => setNotification(null), 3000);

      setSelectedExpenses([]);
      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting expenses:", error);
      setNotification("Failed to delete expenses. Please try again." as any);
      setTimeout(() => setNotification(null), 3000);
      setShowDeleteModal(false);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedExpenses.length === 0) {
      alert("Please select at least one expense to update.");
      return;
    }
    setShowBulkUpdateModal(true);
  };

  const normalizeText = (input: any) => String(input || "").trim().toLowerCase();

  const formatDateToDisplay = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const normalizeStatusForApi = (value: any) => {
    const normalized = normalizeText(value).replace(/\s+/g, "-");
    if (!normalized) return "";
    if (normalized === "nonbillable") return "non-billable";
    return normalized;
  };

  const resolveAccountByName = (name: string) => {
    const target = normalizeText(name);
    return (
      accountsList.find((a: any) => normalizeText(a.accountName || a.name) === target) || null
    );
  };

  const resolveVendorByName = (name: string) => {
    const target = normalizeText(name);
    return (
      vendorsList.find((v: any) => normalizeText(v.displayName || v.name) === target) || null
    );
  };

  const resolveCustomerByName = (name: string) => {
    const target = normalizeText(name);
    return (
      customersList.find((c: any) => normalizeText(c.displayName || c.name) === target) || null
    );
  };

  const handleBulkUpdateSubmit = async (field: string, value: any) => {
    if (!selectedExpenses.length) {
      alert("Please select at least one expense.");
      return;
    }

    if (value === "" || value === null || value === undefined) {
      alert("Please enter a new value.");
      return;
    }

    const selectedIdSet = new Set(selectedExpenses.map((id) => String(id)));
    const selectedRows = expenses.filter((expense) =>
      selectedIdSet.has(String(expense.id || expense.expense_id || expense._id))
    );

    if (!selectedRows.length) {
      alert("No valid expenses selected.");
      return;
    }

    let displayValue: any = value;
    if (field === "date") {
      displayValue = formatDateToDisplay(String(value));
    } else if (field === "currency") {
      displayValue = String(value || "").toUpperCase();
    } else if (field === "status") {
      displayValue = String(value || "").toUpperCase();
    } else if (field === "amount") {
      const numeric = Number.parseFloat(String(value));
      if (!Number.isFinite(numeric)) {
        alert("Please enter a valid amount.");
        return;
      }
      displayValue = numeric;
    }

    // Optimistic UI update
    setExpenses((prev) =>
      prev.map((expense) => {
        if (!selectedIdSet.has(String(expense.id || expense.expense_id || expense._id))) {
          return expense;
        }
        return {
          ...expense,
          [field]: displayValue,
        };
      })
    );

    try {
      const updateResults = await Promise.all(
        selectedRows.map(async (expense: any) => {
          const apiId = expense.expense_id || expense.id || expense._id;
          if (!apiId) {
            return { success: false, id: "unknown" };
          }

          const payload: any = {};

          switch (field) {
            case "date": {
              payload.date = String(value);
              break;
            }
            case "expenseAccount": {
              const acc = resolveAccountByName(String(value));
              if (acc) {
                payload.account_id = acc._id || acc.id;
                payload.account_name = acc.accountName || acc.name;
              } else {
                payload.account_name = String(value);
              }
              break;
            }
            case "vendor": {
              const vendor = resolveVendorByName(String(value));
              if (vendor) {
                payload.vendor_id = vendor._id || vendor.id;
                payload.vendor_name = vendor.displayName || vendor.name;
              } else {
                payload.vendor_name = String(value);
              }
              break;
            }
            case "paidThrough": {
              const account = resolveAccountByName(String(value));
              if (account) {
                payload.paid_through_account_id = account._id || account.id;
                payload.paid_through_account_name = account.accountName || account.name;
              } else {
                payload.paid_through_account_name = String(value);
              }
              break;
            }
            case "customerName": {
              const customer = resolveCustomerByName(String(value));
              if (customer) {
                payload.customer_id = customer._id || customer.id;
                payload.customer_name = customer.displayName || customer.name;
              } else {
                payload.customer_name = String(value);
              }
              break;
            }
            case "currency": {
              payload.currency_code = String(value || "").toUpperCase();
              break;
            }
            case "status": {
              const statusValue = normalizeStatusForApi(value);
              payload.status = statusValue;
              if (statusValue === "non-billable") payload.is_billable = false;
              if (statusValue === "unbilled" || statusValue === "billable") payload.is_billable = true;
              break;
            }
            case "amount": {
              payload.amount = Number.parseFloat(String(value));
              payload.total = payload.amount;
              payload.sub_total = payload.amount;
              break;
            }
            case "notes": {
              payload.description = String(value);
              break;
            }
            default: {
              payload[field] = value;
            }
          }

          try {
            const response = await expensesAPI.update(apiId, payload);
            const success = response?.code === 0 || response?.success || !!response?.expense || !!response?.data;
            return { success, id: apiId };
          } catch (error) {
            console.error("Bulk update failed for expense", apiId, error);
            return { success: false, id: apiId };
          }
        })
      );

      const failed = updateResults.filter((result) => !result.success).length;
      if (failed === 0) {
        setNotification("Bulk update successful");
      } else {
        setNotification(`Bulk update completed with ${failed} failure${failed > 1 ? "s" : ""}`);
      }
      setTimeout(() => setNotification(null), 3000);

      setSelectedExpenses([]);
      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));
      await loadExpenses();
    } catch (err) {
      console.error("Bulk update error", err);
      setNotification("Bulk update failed");
      setTimeout(() => setNotification(null), 3000);
      await loadExpenses();
    }
  };

  const expenseFieldOptions = useMemo(() => {
    const uniqueAccountNames = Array.from(
      new Set(
        accountsList
          .map((account: any) => account?.accountName || account?.name)
          .filter(Boolean)
      )
    );
    const uniqueVendorNames = Array.from(
      new Set(vendorsList.map((vendor: any) => vendor?.displayName || vendor?.name).filter(Boolean))
    );
    const uniqueCustomerNames = Array.from(
      new Set(customersList.map((customer: any) => customer?.displayName || customer?.name).filter(Boolean))
    );
    const uniqueCurrencyCodes = Array.from(
      new Set(currencies.map((currency: any) => currency?.code).filter(Boolean))
    );

    return [
      { value: "date", label: "Date", type: "date" },
      {
        value: "expenseAccount",
        label: "Expense Account",
        type: "select",
        options: uniqueAccountNames.map((name) => ({ label: name, value: name })),
      },
      {
        value: "paidThrough",
        label: "Paid Through",
        type: "select",
        options: uniqueAccountNames.map((name) => ({ label: name, value: name })),
      },
      {
        value: "vendor",
        label: "Vendor",
        type: "select",
        options: uniqueVendorNames.map((name) => ({ label: name, value: name })),
      },
      {
        value: "customerName",
        label: "Customer Name",
        type: "select",
        options: uniqueCustomerNames.map((name) => ({ label: name, value: name })),
      },
      {
        value: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Unbilled", value: "unbilled" },
          { label: "Invoiced", value: "invoiced" },
          { label: "Reimbursed", value: "reimbursed" },
          { label: "Non-Billable", value: "non-billable" },
          { label: "Billable", value: "billable" },
        ],
      },
      {
        value: "currency",
        label: "Currency",
        type: "select",
        options: uniqueCurrencyCodes.map((code) => ({ label: code, value: code })),
      },
      { value: "amount", label: "Amount", type: "number", min: 0, step: "0.01" },
      { value: "notes", label: "Notes", type: "text", placeholder: "Enter notes" },
    ];
  }, [accountsList, vendorsList, customersList, currencies]);

  const handleDownloadReceipt = () => {
    // If expenses are selected, export only selected expenses
    // Otherwise, open export modal to choose what to export
    if (selectedExpenses.length > 0) {
      // Download selected expenses as PDF
      const selectedSet = new Set(selectedExpenses.map((id) => String(id)));
      const selectedExpenseData = expenses.filter((exp) =>
        selectedSet.has(String(exp.id || exp.expense_id || exp._id))
      );
      downloadExpensesAsPDF(selectedExpenseData);
    } else {
      // Open export modal to export all expenses or configure export
      setExportType("expenses");
      setShowExportModal(true);
    }
  };

  const downloadExpensesAsPDF = (expensesToExport: any[]) => {
    if (expensesToExport.length === 0) {
      alert("No expenses to download.");
      return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    pdf.setFontSize(14);
    pdf.text("Expenses Export", margin, y);
    y += 7;
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 5;
    pdf.text(`Total Expenses: ${expensesToExport.length}`, margin, y);
    y += 8;

    expensesToExport.forEach((expense: any, index: number) => {
      const amount = Number.parseFloat(String(expense.amount || 0)) || 0;
      const line = `${index + 1}. ${expense.date || "-"} | ${expense.expenseAccount || "-"} | ${expense.currency || "USD"
        } ${amount.toFixed(2)} | ${expense.status || "-"}`;
      const wrapped = pdf.splitTextToSize(line, contentWidth);
      const notesText = expense.notes ? `Notes: ${expense.notes}` : "";
      const wrappedNotes = notesText ? pdf.splitTextToSize(notesText, contentWidth) : [];

      if (y + wrapped.length * 5 + wrappedNotes.length * 5 + 8 > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      pdf.setFont("helvetica", "normal");
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 5;

      if (wrappedNotes.length) {
        pdf.setFont("helvetica", "italic");
        pdf.text(wrappedNotes, margin + 3, y);
        y += wrappedNotes.length * 5;
      }

      y += 3;
    });

    pdf.save(`expenses_${new Date().toISOString().split("T")[0]}.pdf`);

    // Show notification
    setNotification(`${expensesToExport.length} expense${expensesToExport.length > 1 ? 's' : ''} exported to PDF.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClearSelection = () => {
    setSelectedExpenses([]);
  };

  /* Custom Views Integration */
  const [customViews, setCustomViews] = useState([]);

  useEffect(() => {
    setCustomViews(getExpenseCustomViews());
  }, [location.pathname]);

  const expenseViews = [
    "All",
    "Unbilled",
    "Invoiced",
    "Reimbursed",
    "Billable",
    "Non-Billable",
    "With Receipts",
    "Without Receipts",
    "From Taban Books Expense",
    ...customViews.map(cv => cv.name)
  ];

  const sortOptions = [
    "Created Time",
    "Date",
    "Expense Account",
    "Vendor Name",
    "Paid Through",
    "Customer Name",
    "Amount",
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !(dropdownRef.current as any).contains(event.target)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !(moreMenuRef.current as any).contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (uploadMenuRef.current && !(uploadMenuRef.current as any).contains(event.target)) {
        setUploadMenuOpen(false);
      }
      if (searchTypeDropdownRef.current && !(searchTypeDropdownRef.current as any).contains(event.target)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !(filterDropdownRef.current as any).contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
      if (importSubmenuRef.current && !(importSubmenuRef.current as any).contains(event.target)) {
        setImportSubmenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen || uploadMenuOpen || isSearchTypeDropdownOpen || isFilterDropdownOpen || importSubmenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen, uploadMenuOpen, importSubmenuOpen, isSearchTypeDropdownOpen, isFilterDropdownOpen]);

  const handleViewSelect = (view: string) => {
    setSelectedView(view);
    setDropdownOpen(false);
  };

  const handleAttachFromDesktop = () => {
    setUploadMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: any) => {
    const files = e.target.files;
    if (files.length > 0) {
      // Handle file upload
      console.log("Files selected:", files);
    }
  };

  // Get display text for header
  const getDisplayText = () => {
    return selectedView === "All" ? "All Expenses" : selectedView;
  };



  // Filter expenses based on selected view and selected expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // First apply view filter
    if (selectedView !== "All") {
      const customView = customViews.find(cv => cv.name === selectedView);

      if (customView) {
        filtered = expenses.filter(expense => {
          return customView.criteria.every(criterion => {
            if (!criterion.field || !criterion.value) return true;

            let expenseValue = "";
            switch (criterion.field) {
              case "Date": expenseValue = expense.date; break;
              case "Expense Account": expenseValue = expense.expenseAccount; break;
              case "Vendor Name": expenseValue = expense.vendorName; break;
              case "Amount": expenseValue = expense.amount; break;
              case "Reference#": expenseValue = expense.referenceNumber; break;
              case "Status": expenseValue = expense.status; break;
              case "Customer Name": expenseValue = expense.customerName; break;
              case "Paid Through": expenseValue = expense.paidThrough; break;
              default: expenseValue = "";
            }

            const val = String(expenseValue || "").toLowerCase();
            const critVal = String(criterion.value).toLowerCase();

            switch (criterion.comparator) {
              case "is": return val === critVal;
              case "is not": return val !== critVal;
              case "contains": return val.includes(critVal);
              case "doesn't contain": return !val.includes(critVal);
              case "starts with": return val.startsWith(critVal);
              case "is empty": return val === "";
              case "is not empty": return val !== "";
              default: return true;
            }
          });
        });
      } else {
        filtered = expenses.filter((expense) => {
          const status = (expense.status || "").toUpperCase();

          switch (selectedView) {
            case "Unbilled":
              return status !== "INVOICED" && status !== "REIMBURSED" && !expense.invoiced && !expense.reimbursed;
            case "Invoiced":
              return status === "INVOICED" || expense.invoiced === true;
            case "Reimbursed":
              return status === "REIMBURSED" || expense.reimbursed === true;
            case "Billable":
              return expense.billable === true || (status !== "NON-BILLABLE" && expense.billable !== false);
            case "Non-Billable":
              return expense.billable === false || status === "NON-BILLABLE";
            case "With Receipts":
              return expense.hasReceipt === true || expense.receipt || expense.receiptFile || expense.receiptUrl;
            case "Without Receipts":
              return !expense.hasReceipt && !expense.receipt && !expense.receiptFile && !expense.receiptUrl;
            case "From Taban Books Expense":
              return expense.fromZohoExpense === true || expense.source === "Taban Books Expense" || expense.importSource === "Taban Books";
            default:
              return true;
          }
        });
      }
    }

    // Apply sorting
    if (selectedSort) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (selectedSort) {
          case "Created Time":
            aValue = new Date(a.createdAt || a.date || 0).getTime();
            bValue = new Date(b.createdAt || b.date || 0).getTime();
            return bValue - aValue; // Descending (newest first)
          case "Date":
            aValue = new Date(a.date || 0).getTime();
            bValue = new Date(b.date || 0).getTime();
            return bValue - aValue; // Descending (newest first)
          case "Expense Account":
            aValue = (a.expenseAccount || "").toLowerCase();
            bValue = (b.expenseAccount || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Vendor Name":
            aValue = (a.vendorName || "").toLowerCase();
            bValue = (b.vendorName || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Paid Through":
            aValue = (a.paidThrough || "").toLowerCase();
            bValue = (b.paidThrough || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Customer Name":
            aValue = (a.customerName || "").toLowerCase();
            bValue = (b.customerName || "").toLowerCase();
            return aValue.localeCompare(bValue);
          case "Amount":
            aValue = parseFloat(a.amount || 0);
            bValue = parseFloat(b.amount || 0);
            return bValue - aValue; // Descending (highest first)
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [expenses, selectedView, customViews, selectedSort]);

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    headerContent: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flex: 1,
    },
    receiptsInboxLink: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      textDecoration: "none",
      borderRadius: "6px",
      border: "none",
      background: "none",
      cursor: "pointer",
    },
    receiptsInboxLinkActive: {
      color: "#156372",
      backgroundColor: "#15637210",
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    title: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexWrap: "wrap",
    },
    statusText: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      color: "#111827",
      fontWeight: "700",
    },
    chevronButton: {
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      color: "#156372",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    uploadButton: {
      padding: "8px 16px",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    uploadMenu: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 100,
      padding: "4px 0",
    },
    uploadMenuItem: {
      display: "flex",
      alignItems: "center",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    newButton: {
      padding: "8px 16px",
      background: "linear-gradient(to right, #156372, #0D4A52)",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "opacity 0.2s",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    moreButton: {
      padding: "8px",
      color: "#111827",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "240px",
      zIndex: 100,
      padding: "4px 0",
    },
    dropdownItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    dropdownItemSelected: {
      backgroundColor: "#15637210",
      borderLeft: "3px solid #156372",
    },
    dropdownItemText: {
      flex: 1,
    },
    dropdownStar: {
      color: "#9ca3af",
      width: "16px",
      height: "16px",
    },
    dropdownDivider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      margin: "4px 0",
    },
    dropdownNewView: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#156372",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    moreDropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    moreDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 100,
      padding: "4px 0",
    },
    moreDropdownItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    submenuWrapper: {
      position: "relative",
    },
    submenu: {
      position: "absolute",
      right: "100%",
      top: 0,
      marginRight: "4px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      minWidth: "200px",
      zIndex: 101,
      padding: "4px 0",
    },
    submenuItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    submenuItemSelected: {
      backgroundColor: "#15637210",
      color: "#156372",
    },
    tableContainer: {
      padding: "24px",
    },
    tableWrapper: {
      overflowX: "auto",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#ffffff",
    },
    tableHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    tableHeaderCell: {
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    tableHeaderCellWithCheckbox: {
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      position: "relative",
    },
    tableHeaderCheckboxWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tableHeaderAmount: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tableRow: {
      borderBottom: "1px solid #e5e7eb",
      cursor: "pointer",
    },
    tableCell: {
      padding: "12px",
      fontSize: "14px",
      color: "#111827",
      whiteSpace: "nowrap",
    },
    tableCheckbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    expenseAccountLink: {
      color: "#156372",
      textDecoration: "none",
      cursor: "pointer",
    },
    statusBadge: {
      padding: "4px 8px",
      fontSize: "12px",
      fontWeight: "500",
      backgroundColor: "#f3f4f6",
      color: "#374151",
      borderRadius: "4px",
      display: "inline-block",
    },
    tableAmount: {
      fontWeight: "500",
    },
    skeletonCell: {
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
    skeletonCheckbox: {
      width: "16px",
      height: "16px",
      backgroundColor: "#e5e7eb",
      borderRadius: "4px",
      animation: "pulse 1.5s ease-in-out infinite",
    },
  };

  return (
    <div style={styles.container}>
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />
      {/* Header */}
      {selectedExpenses.length === 0 && (
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#111827",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {getDisplayText()}
                  {dropdownOpen ? (
                    <ChevronUp size={16} style={{ color: "#156372" }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: "#156372" }} />
                  )}
                </button>
                {dropdownOpen && (
                  <div style={styles.dropdown}>
                    {expenseViews.map((view) => (
                      <button
                        key={view}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedView === view
                            ? styles.dropdownItemSelected
                            : {}),
                        }}
                        onClick={() => handleViewSelect(view)}
                        onMouseEnter={(e) => {
                          if (selectedView !== view) {
                            e.target.style.backgroundColor = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedView !== view) {
                            e.target.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        <span style={styles.dropdownItemText}>{view}</span>
                        <Star
                          size={16}
                          style={styles.dropdownStar}
                          fill="none"
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                    <div style={styles.dropdownDivider} />
                    <button
                      style={styles.dropdownNewView}
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate("/purchases/expenses/custom-view/new");
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      <Plus size={16} />
                      New Custom View
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.headerRight}>
              <button
                style={styles.newButton}
                onClick={() => navigate("/purchases/expenses/new")}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#0D4A52")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#156372")}
              >
                <Plus size={16} />
                New
              </button>
              <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
                <button
                  style={styles.moreButton}
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ffffff";
                  }}
                >
                  <MoreVertical size={18} />
                </button>
                {moreMenuOpen && (
                  <div style={styles.moreDropdown}>
                    <div
                      style={styles.submenuWrapper}
                      onMouseEnter={() => {
                        setSortSubmenuOpen(true);
                        setHoveredMenuItem('sort');
                      }}
                      onMouseLeave={() => {
                        setSortSubmenuOpen(false);
                        setHoveredMenuItem(null);
                      }}
                    >
                      <button
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#156372" : "transparent",
                          color: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#ffffff" : "#111827",
                        }}
                      >
                        <ArrowUpDown size={16} style={{ color: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                        <span>Sort by</span>
                        <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'sort' || sortSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                      </button>
                      {sortSubmenuOpen && (
                        <div style={styles.submenu}>
                          {sortOptions.map((option) => (
                            <button
                              key={option}
                              style={{
                                ...styles.submenuItem,
                                ...(selectedSort === option ? styles.submenuItemSelected : {}),
                              }}
                              onClick={() => {
                                setSelectedSort(option);
                                setSortSubmenuOpen(false);
                                setMoreMenuOpen(false);
                              }}
                              onMouseEnter={(e) => {
                                if (selectedSort !== option) {
                                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedSort !== option) {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              <span>{option}</span>
                              {selectedSort === option && (
                                <ChevronDown size={16} style={{ color: "#156372" }} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      style={styles.submenuWrapper}
                      ref={importSubmenuRef}
                      onMouseEnter={() => setImportSubmenuOpen(true)}
                      onMouseLeave={() => setImportSubmenuOpen(false)}
                    >
                      <button
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: (hoveredMenuItem === 'import' || importSubmenuOpen) ? "#156372" : "transparent",
                          color: (hoveredMenuItem === 'import' || importSubmenuOpen) ? "#ffffff" : "#111827",
                        }}
                        onMouseEnter={() => setHoveredMenuItem('import')}
                        onMouseLeave={() => setHoveredMenuItem(null)}
                      >
                        <Download size={16} style={{ color: (hoveredMenuItem === 'import' || importSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                        <span>Import</span>
                        <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'import' || importSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                      </button>
                      {importSubmenuOpen && (
                        <div style={styles.submenu}>
                          <button
                            style={{ ...styles.submenuItem, fontSize: "13px" }}
                            onClick={() => {
                              setMoreMenuOpen(false);
                              navigate("/purchases/expenses/import");
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          >
                            Import Expenses
                          </button>
                          <button
                            style={{ ...styles.submenuItem, fontSize: "13px" }}
                            onClick={() => downloadSampleFile('csv')}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          >
                            Download Sample CSV
                          </button>
                          <button
                            style={{ ...styles.submenuItem, fontSize: "13px" }}
                            onClick={() => downloadSampleFile('xls')}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          >
                            Download Sample XLS
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      style={styles.submenuWrapper}
                      onMouseEnter={() => {
                        setExportSubmenuOpen(true);
                        setHoveredMenuItem('export');
                      }}
                      onMouseLeave={() => {
                        setExportSubmenuOpen(false);
                        setHoveredMenuItem(null);
                      }}
                    >
                      <button
                        style={{
                          ...styles.moreDropdownItem,
                          backgroundColor: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#156372" : "transparent",
                          color: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#ffffff" : "#111827",
                        }}
                      >
                        <Upload size={16} style={{ color: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                        <span>Export</span>
                        <ChevronRight size={16} style={{ color: (hoveredMenuItem === 'export' || exportSubmenuOpen) ? "#ffffff" : "#6b7280" }} />
                      </button>
                      {exportSubmenuOpen && (
                        <div style={styles.submenu}>
                          <button
                            style={{
                              ...styles.submenuItem,
                              fontSize: "13px"
                            }}
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setExportSubmenuOpen(false);
                              setExportType("expenses");
                              setShowExportModal(true);
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          >
                            Export Expenses
                          </button>
                          <button
                            style={{
                              ...styles.submenuItem,
                              fontSize: "13px"
                            }}
                            onClick={() => {
                              setMoreMenuOpen(false);
                              setExportSubmenuOpen(false);
                              setExportType("current-view");
                              setShowExportModal(true);
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>





                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        backgroundColor: hoveredMenuItem === 'preferences' ? "#156372" : "transparent",
                        color: hoveredMenuItem === 'preferences' ? "#ffffff" : "#111827",
                      }}
                      onMouseEnter={() => setHoveredMenuItem('preferences')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        navigate("/settings/expenses");
                      }}
                    >
                      <Settings size={16} style={{ color: hoveredMenuItem === 'preferences' ? "#ffffff" : "#6b7280" }} />
                      <span>Preferences</span>
                    </button>

                    <button
                      style={{
                        ...styles.moreDropdownItem,
                        backgroundColor: hoveredMenuItem === 'refresh' ? "#156372" : "transparent",
                        color: hoveredMenuItem === 'refresh' ? "#ffffff" : "#111827",
                      }}
                      onMouseEnter={() => setHoveredMenuItem('refresh')}
                      onMouseLeave={() => setHoveredMenuItem(null)}
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                    >
                      <RotateCw
                        size={16}
                        style={{
                          color: hoveredMenuItem === 'refresh' ? "#ffffff" : "#6b7280",
                          animation: isRefreshing ? "spin 1s linear infinite" : "none"
                        }}
                      />
                      <span>Refresh List</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div style={styles.tableContainer}>
        {/* Action Bar - Shows when items are selected */}
        {selectedExpenses.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}>
              <button
                onClick={handleBulkUpdate}
                style={{
                  padding: "6px 12px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                Bulk Update
              </button>

              <button
                onClick={handleDownloadReceipt}
                style={{
                  padding: "6px",
                  fontSize: "14px",
                  color: "#374151",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                <FileText size={16} />
              </button>

              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: "6px 12px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#0D4A52",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fef2f2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                Delete
              </button>

              <span style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "24px",
                height: "24px",
                padding: "0 8px",
                background: "linear-gradient(to right, #156372, #0D4A52)",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#ffffff",
                marginLeft: "4px",
              }}>
                {selectedExpenses.length}
              </span>
              <span style={{
                fontSize: "14px",
                color: "#374151",
                fontWeight: "500",
                marginLeft: "4px",
              }}>
                Selected
              </span>
            </div>

            <button
              onClick={handleClearSelection}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                color: "#6b7280",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6b7280";
              }}
              title="Press Esc to clear selection"
            >
              <span style={{ fontSize: "11px" }}>Esc</span>
              <X size={14} />
            </button>
          </div>
        )}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCellWithCheckbox}>
                  <div style={styles.tableHeaderCheckboxWrapper}>
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExpenses(filteredExpenses.map((e) => e.id));
                        } else {
                          setSelectedExpenses([]);
                        }
                      }}
                      style={styles.tableCheckbox}
                    />
                  </div>
                </th>
                <th style={styles.tableHeaderCell}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    DATE
                    <button
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                        color: "#6b7280",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#156372";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#6b7280";
                      }}
                    >
                      <Filter size={14} />
                    </button>
                  </div>
                </th>
                <th style={styles.tableHeaderCell}>EXPENSE ACCOUNT</th>
                <th style={styles.tableHeaderCell}>REFERENCE#</th>
                <th style={styles.tableHeaderCell}>VENDOR NAME</th>
                <th style={styles.tableHeaderCell}>PAID THROUGH</th>
                <th style={styles.tableHeaderCell}>CUSTOMER NAME</th>
                <th style={styles.tableHeaderCell}>STATUS</th>
                <th style={styles.tableHeaderCell}>
                  <div style={styles.tableHeaderAmount}>
                    AMOUNT
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        color: "#6b7280",
                      }}
                      onClick={() => setShowSearchModal(true)}
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isRefreshing ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={styles.skeletonCheckbox}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "150px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "100px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "100px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "100px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "80px" }}></div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ ...styles.skeletonCell, width: "70px" }}></div>
                    </td>
                  </tr>
                ))
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    style={{
                      ...styles.tableRow,
                      backgroundColor: selectedExpenses.includes(expense.id) ? "#15637210" : "transparent",
                    }}
                    onClick={(e) => {
                      // Don't navigate if clicking on checkbox
                      if (e.target.type !== "checkbox") {
                        navigate(`/purchases/expenses/${expense.id}`);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedExpenses.includes(expense.id)) {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedExpenses.includes(expense.id)) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      } else {
                        e.currentTarget.style.backgroundColor = "#15637210";
                      }
                    }}
                  >
                    <td style={styles.tableCell} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExpenses([...selectedExpenses, expense.id]);
                          } else {
                            setSelectedExpenses(selectedExpenses.filter((id) => id !== expense.id));
                          }
                        }}
                        style={styles.tableCheckbox}
                      />
                    </td>
                    <td style={styles.tableCell}>{expense.date}</td>
                    <td style={styles.tableCell}>
                      <span
                        style={styles.expenseAccountLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {expense.expenseAccount}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{expense.reference || ""}</td>
                    <td style={styles.tableCell}>{expense.vendor || ""}</td>
                    <td style={styles.tableCell}>{expense.paidThrough || ""}</td>
                    <td style={styles.tableCell}>{expense.customerName || ""}</td>
                    <td style={styles.tableCell}>
                      <span style={styles.statusBadge}>{expense.status}</span>
                    </td>
                    <td style={{ ...styles.tableCell, ...styles.tableAmount }}>
                      {expense.currencySymbol || symbol || baseCurrency?.symbol || "KSh"} {parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ ...styles.tableCell, textAlign: "center", padding: "48px 16px", color: "#6b7280" }}>
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Custom View Modal */}
      {
        showCustomViewModal && (
          <NewCustomViewModal
            onClose={() => setShowCustomViewModal(false)}
            onSave={(customView) => {
              // Handle saving custom view
              console.log("Custom view saved:", customView);
              setShowCustomViewModal(false);
            }}
          />
        )
      }

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Expenses"
        fieldOptions={expenseFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="expenses"
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        entityName="expense(s)"
        count={selectedExpenses.length}
      />

      {/* Export Expenses Modal */}
      {showExportModal && (
        <ExportExpenses
          onClose={() => setShowExportModal(false)}
          exportType={exportType}
          data={exportType === "current-view" ? filteredExpenses : expenses}
        />
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSearchModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg w-full max-w-[800px] mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
              <div className="flex items-center gap-6">
                {/* Search Type Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <div className="relative" ref={searchTypeDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-[140px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isSearchTypeDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen);
                      }}
                    >
                      <span>{searchType}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isSearchTypeDropdownOpen && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[300px] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {searchTypeOptions.map((option) => (
                          <div
                            key={option}
                            className={`py-2.5 px-3.5 text-sm cursor-pointer transition-colors ${searchType === option
                              ? "bg-[#156372] text-white hover:bg-[#0D4A52]"
                              : "text-gray-700 hover:bg-gray-100"
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchType(option);
                              setIsSearchTypeDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter</label>
                  <div className="relative" ref={filterDropdownRef}>
                    <div
                      className={`flex items-center justify-between w-[160px] py-2 px-3 text-sm text-gray-700 bg-white border rounded-md cursor-pointer transition-colors ${isFilterDropdownOpen ? "border-[#156372]" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <span>{selectedView}</span>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isFilterDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#156372] border-t-0 rounded-b-md shadow-lg z-[1002] max-h-[200px] overflow-y-auto">
                        {["All", "Open", "Paid", "Draft"].map((view) => (
                          <div
                            key={view}
                            className="py-2.5 px-3.5 text-sm text-gray-700 cursor-pointer transition-colors hover:bg-gray-100"
                            onClick={() => {
                              setSelectedView(view);
                              setIsFilterDropdownOpen(false);
                            }}
                          >
                            {view}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowSearchModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Criteria Body */}
            <div style={{ padding: "24px" }}>
              {searchType === "Expenses" && (
                <div style={{ display: "flex", gap: "24px" }}>
                  {/* Left Column */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Expense Account */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Expense Account
                      </label>
                      <select
                        value={searchModalData.expenseAccount}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, expenseAccount: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select expense account</option>
                        <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                        <option value="Advertising And Marketing">Advertising And Marketing</option>
                        <option value="Office Supplies">Office Supplies</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Notes
                      </label>
                      <input
                        type="text"
                        value={searchModalData.notes}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, notes: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* Date Range */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Date Range
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.dateRangeFromExpense}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeFromExpense: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                        <span style={{ color: "#6b7280" }}>-</span>
                        <input
                          type="text"
                          placeholder="dd/MM/yyyy"
                          value={searchModalData.dateRangeToExpense}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, dateRangeToExpense: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {/* Total Range */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Total Range
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          value={searchModalData.totalRangeFromExpense}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeFromExpense: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                        <span style={{ color: "#6b7280" }}>-</span>
                        <input
                          type="text"
                          value={searchModalData.totalRangeToExpense}
                          onChange={(e) => setSearchModalData(prev => ({ ...prev, totalRangeToExpense: e.target.value }))}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Customer Name
                      </label>
                      <select
                        value={searchModalData.customerName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select customer</option>
                      </select>
                    </div>

                    {/* Vendor */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Vendor
                      </label>
                      <select
                        value={searchModalData.vendorName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, vendorName: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select vendor</option>
                      </select>
                    </div>

                    {/* Tax Exemptions */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Tax Exemptions
                      </label>
                      <select
                        value={searchModalData.taxExemptions}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, taxExemptions: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select a Tax Exemption</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Paid Through */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Paid Through
                      </label>
                      <select
                        value={searchModalData.paidThrough}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, paidThrough: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select paid through</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                      </select>
                    </div>

                    {/* Reference# */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Reference#
                      </label>
                      <input
                        type="text"
                        value={searchModalData.referenceNumber}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Status
                      </label>
                      <select
                        value={searchModalData.statusExpense}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, statusExpense: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">All</option>
                        <option value="Draft">Draft</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>

                    {/* Source */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Source
                      </label>
                      <select
                        value={searchModalData.source}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, source: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select source</option>
                        <option value="Manual">Manual</option>
                        <option value="Import">Import</option>
                      </select>
                    </div>

                    {/* Employee */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Employee
                      </label>
                      <select
                        value={searchModalData.employee}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, employee: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select employee</option>
                      </select>
                    </div>

                    {/* Project Name */}
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                        Project Name
                      </label>
                      <select
                        value={searchModalData.projectName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 28px 8px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                        }}
                      >
                        <option value="">Select a project</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {searchType === "Customers" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={searchModalData.displayName}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={searchModalData.email}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={searchModalData.phone}
                        onChange={(e) => setSearchModalData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full py-2 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #e5e7eb"
              }}>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchModalData({
                      ...searchModalData,
                      expenseAccount: "",
                      notes: "",
                      dateRangeFromExpense: "",
                      dateRangeToExpense: "",
                      totalRangeFromExpense: "",
                      totalRangeToExpense: "",
                      customerName: "",
                      vendorName: "",
                      taxExemptions: "",
                      paidThrough: "",
                      referenceNumber: "",
                      statusExpense: "",
                      source: "",
                      employee: "",
                      projectName: "",
                    });
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ffffff";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log("Search with:", searchType, searchModalData);
                    setShowSearchModal(false);
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    backgroundColor: "#156372",
                    color: "#ffffff",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#0D4A52";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#156372";
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {
        notification && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: "#d1fae5",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              zIndex: 10001,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                backgroundColor: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Check size={16} style={{ color: "#ffffff" }} />
            </div>
            <span
              style={{
                fontSize: "14px",
                color: "#065f46",
                fontWeight: "500",
              }}
            >
              {notification}
            </span>
          </div>
        )
      }
    </div >
  );
}

function NewCustomViewModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    markAsFavorite: false,
    criteria: [{ id: 1, field: "", comparator: "", value: "" }],
    availableColumns: [
      "Vendor Name",
      "Last Expense Date",
      "Customer Name",
      "Paid Through",
      "Reference#",
      "Status",
      "Currency",
      "Created Time",
      "Last Modified Time",
    ],
    selectedColumns: ["Date", "Expense Account", "Amount"],
    visibility: "Only Me",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [expenseAccountDropdowns, setExpenseAccountDropdowns] = useState({});
  const [expenseAccountSearch, setExpenseAccountSearch] = useState({});
  const [paidThroughDropdowns, setPaidThroughDropdowns] = useState({});
  const [paidThroughSearch, setPaidThroughSearch] = useState({});

  // Expense Account data with grouped categories
  const expenseAccounts = {
    "Cost Of Goods Sold": [
      "Cost of Goods Sold",
    ],
    "Expense": [
      "Advertising And Marketing",
      "Air Travel Expense",
      "Automobile Expense",
      "Bad Debt",
      "Bank Charges",
      "Consultant Expense",
      "Depreciation Expense",
      "Entertainment Expense",
      "Freight And Delivery",
      "Insurance Expense",
      "Interest Expense",
      "Legal And Professional Fees",
      "Meals And Entertainment",
      "Office Supplies",
      "Other Expenses",
      "Postage And Delivery",
      "Printing And Stationery",
      "Rent Expense",
      "Repairs And Maintenance",
      "Salaries And Wages",
      "Telephone Expense",
      "Travel Expense",
      "Utilities",
    ],
  };

  // Paid Through account data with grouped categories
  const paidThroughAccounts = {
    "Cash": [
      "Cash",
      "Petty Cash",
      "Undeposited Funds",
    ],
    "Other Current Asset": [
      "Advance Tax",
      "Employee Advance",
      "Prepaid Expenses",
    ],
    "Fixed Asset": [
      "Furniture and Equipment",
    ],
    "Other Current Liability": [
      "Employee Reimbursements",
    ],
    "Equity": [
      "Drawings",
      "Opening Balance Offset",
      "Owner's Equity",
    ],
  };

  const getAllAccounts = () => {
    return Object.values(expenseAccounts).flat();
  };

  const getFilteredAccounts = (criterionId) => {
    const searchTerm = (expenseAccountSearch[criterionId] || "").toLowerCase();
    if (!searchTerm) return expenseAccounts;

    const filtered = {};
    Object.keys(expenseAccounts).forEach(category => {
      const matching = expenseAccounts[category].filter(account =>
        account.toLowerCase().includes(searchTerm)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  };

  const toggleExpenseAccountDropdown = (criterionId) => {
    setExpenseAccountDropdowns(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const handleExpenseAccountSelect = (criterionId, account) => {
    handleCriterionChange(criterionId, "value", account);
    setExpenseAccountDropdowns(prev => ({
      ...prev,
      [criterionId]: false
    }));
    setExpenseAccountSearch(prev => ({
      ...prev,
      [criterionId]: ""
    }));
  };

  const getFilteredPaidThroughAccounts = (criterionId) => {
    const searchTerm = (paidThroughSearch[criterionId] || "").toLowerCase();
    if (!searchTerm) return paidThroughAccounts;

    const filtered = {};
    Object.keys(paidThroughAccounts).forEach(category => {
      const matching = paidThroughAccounts[category].filter(account =>
        account.toLowerCase().includes(searchTerm)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  };

  const togglePaidThroughDropdown = (criterionId) => {
    setPaidThroughDropdowns(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const handlePaidThroughSelect = (criterionId, account) => {
    handleCriterionChange(criterionId, "value", account);
    setPaidThroughDropdowns(prev => ({
      ...prev,
      [criterionId]: false
    }));
    setPaidThroughSearch(prev => ({
      ...prev,
      [criterionId]: ""
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCriterionChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          id: Date.now(),
          field: "",
          comparator: "",
          value: "",
        },
      ],
    }));
  };

  const removeCriterion = (id) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== id),
    }));
  };

  const moveColumnToSelected = (column) => {
    setFormData((prev) => ({
      ...prev,
      availableColumns: prev.availableColumns.filter((c) => c !== column),
      selectedColumns: [...prev.selectedColumns, column],
    }));
  };

  const moveColumnToAvailable = (column) => {
    // Don't allow removing required columns
    const requiredColumns = ["Date", "Expense Account", "Amount"];
    if (requiredColumns.includes(column)) return;
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((c) => c !== column),
      availableColumns: [...prev.availableColumns, column],
    }));
  };

  const filteredColumns = formData.availableColumns.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const modalStyles = {
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
      maxWidth: "900px",
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      backgroundColor: "#ffffff",
      zIndex: 10,
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      color: "#6b7280",
      fontSize: "24px",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      lineHeight: 1,
    },
    body: {
      padding: "24px",
      flex: 1,
    },
    section: {
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    nameRow: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    nameInput: {
      flex: 1,
    },
    favoriteCheckbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    criterionRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "12px",
    },
    criterionNumber: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      minWidth: "24px",
    },
    criterionField: {
      flex: 1,
    },
    criterionComparator: {
      flex: 1,
    },
    criterionValue: {
      flex: 1,
    },
    criterionActions: {
      display: "flex",
      gap: "8px",
    },
    iconButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
    },
    addCriterionButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: "#156372",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      padding: "4px 0",
    },
    columnsContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
    },
    columnSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
    },
    columnSectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      marginBottom: "12px",
      outline: "none",
    },
    columnList: {
      maxHeight: "300px",
      overflowY: "auto",
    },
    columnItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px",
      borderRadius: "4px",
      cursor: "pointer",
      marginBottom: "4px",
    },
    radioGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    radioOption: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "12px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "16px",
      position: "sticky",
      bottom: 0,
      backgroundColor: "#ffffff",
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
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(expenseAccountDropdowns).forEach(criterionId => {
        if (expenseAccountDropdowns[criterionId] && !event.target.closest(`[data-expense-account-dropdown="${criterionId}"]`)) {
          setExpenseAccountDropdowns(prev => ({
            ...prev,
            [criterionId]: false
          }));
        }
      });
      Object.keys(paidThroughDropdowns).forEach(criterionId => {
        if (paidThroughDropdowns[criterionId] && !event.target.closest(`[data-paid-through-dropdown="${criterionId}"]`)) {
          setPaidThroughDropdowns(prev => ({
            ...prev,
            [criterionId]: false
          }));
        }
      });
    };

    if (Object.values(expenseAccountDropdowns).some(open => open) || Object.values(paidThroughDropdowns).some(open => open)) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expenseAccountDropdowns, paidThroughDropdowns]);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>New Custom View</h2>
          <button onClick={onClose} style={modalStyles.close}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.body}>
          {/* Name Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.nameRow}>
              <div style={{ ...modalStyles.formGroup, ...modalStyles.nameInput }}>
                <label style={modalStyles.label}>
                  Name <span style={{ color: "#156372" }}>*</span>
                </label>
                <input
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.favoriteCheckbox}>
                <input
                  type="checkbox"
                  name="markAsFavorite"
                  checked={formData.markAsFavorite}
                  onChange={handleChange}
                  id="favorite"
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="favorite" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Star size={16} style={{ color: formData.markAsFavorite ? "#fbbf24" : "#9ca3af" }} />
                  Mark as Favorite
                </label>
              </div>
            </div>
          </div>

          {/* Define the criteria Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Define the criteria (if any)</div>
            {formData.criteria.map((criterion, index) => (
              <div key={criterion.id} style={modalStyles.criterionRow}>
                <span style={modalStyles.criterionNumber}>{index + 1}</span>
                <select
                  style={{ ...modalStyles.input, ...modalStyles.criterionField }}
                  value={criterion.field}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "field", e.target.value)
                  }
                >
                  <option>Select a field</option>
                  <option>Date</option>
                  <option>Expense Account</option>
                  <option>Paid Through</option>
                  <option>Vendor Name</option>
                  <option>Customer Name</option>
                  <option>Status</option>
                  <option>Amount</option>
                </select>
                <select
                  style={{ ...modalStyles.input, ...modalStyles.criterionComparator }}
                  value={criterion.comparator}
                  onChange={(e) =>
                    handleCriterionChange(criterion.id, "comparator", e.target.value)
                  }
                >
                  <option>Select a comparator</option>
                  <option>Equals</option>
                  <option>Contains</option>
                  <option>Starts with</option>
                  <option>Ends with</option>
                </select>
                {criterion.field === "Expense Account" ? (
                  <div style={{ ...modalStyles.criterionValue, position: "relative" }} data-expense-account-dropdown={criterion.id}>
                    <button
                      type="button"
                      style={{
                        ...modalStyles.input,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                      }}
                      onClick={() => toggleExpenseAccountDropdown(criterion.id)}
                    >
                      <span style={{ color: criterion.value ? "#111827" : "#9ca3af" }}>
                        {criterion.value || "Select an account"}
                      </span>
                      <ChevronDownIcon size={16} style={{ color: "#6b7280" }} />
                    </button>
                    {expenseAccountDropdowns[criterion.id] && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        zIndex: 1000,
                        maxHeight: "320px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}>
                        <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", zIndex: 1 }} />
                            <input
                              type="text"
                              placeholder="Search"
                              value={expenseAccountSearch[criterion.id] || ""}
                              onChange={(e) => setExpenseAccountSearch(prev => ({
                                ...prev,
                                [criterion.id]: e.target.value
                              }))}
                              style={{
                                width: "100%",
                                padding: "8px 8px 8px 36px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "14px",
                                outline: "none",
                                backgroundColor: "#ffffff",
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={(e) => {
                                e.target.style.borderColor = "#156372";
                                e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = "#d1d5db";
                                e.target.style.boxShadow = "none";
                              }}
                            />
                          </div>
                        </div>
                        <div style={{
                          maxHeight: "240px",
                          overflowY: "auto",
                          flex: 1,
                          WebkitOverflowScrolling: "touch",
                        }}>
                          {Object.entries(getFilteredAccounts(criterion.id)).map(([category, accounts]) => (
                            <div key={category}>
                              <div style={{
                                padding: "10px 12px",
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#374151",
                                backgroundColor: "#f9fafb",
                                borderBottom: "1px solid #e5e7eb",
                                textTransform: "none",
                              }}>
                                {category}
                              </div>
                              {accounts.map((account) => (
                                <button
                                  key={account}
                                  type="button"
                                  onClick={() => handleExpenseAccountSelect(criterion.id, account)}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    border: "none",
                                    background: criterion.value === account ? "#15637210" : "transparent",
                                    color: criterion.value === account ? "#156372" : "#111827",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    display: "block",
                                    transition: "background-color 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (criterion.value !== account) {
                                      e.target.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (criterion.value !== account) {
                                      e.target.style.backgroundColor = "transparent";
                                    }
                                  }}
                                >
                                  {account}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #e5e7eb",
                          backgroundColor: "#ffffff",
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              // Handle new account creation
                              console.log("Create new account");
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              textAlign: "left",
                              border: "none",
                              background: "transparent",
                              color: "#156372",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "transparent";
                            }}
                          >
                            <Plus size={16} />
                            New Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : criterion.field === "Paid Through" ? (
                  <div style={{ ...modalStyles.criterionValue, position: "relative" }} data-paid-through-dropdown={criterion.id}>
                    <button
                      type="button"
                      style={{
                        ...modalStyles.input,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                      }}
                      onClick={() => togglePaidThroughDropdown(criterion.id)}
                    >
                      <span style={{ color: criterion.value ? "#111827" : "#9ca3af" }}>
                        {criterion.value || "Select an account"}
                      </span>
                      <ChevronDownIcon size={16} style={{ color: "#6b7280" }} />
                    </button>
                    {paidThroughDropdowns[criterion.id] && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}>
                        <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={16} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                            <input
                              type="text"
                              placeholder="Search"
                              value={paidThroughSearch[criterion.id] || ""}
                              onChange={(e) => setPaidThroughSearch(prev => ({
                                ...prev,
                                [criterion.id]: e.target.value
                              }))}
                              style={{
                                width: "100%",
                                padding: "8px 8px 8px 32px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "14px",
                                outline: "none",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                          {Object.entries(getFilteredPaidThroughAccounts(criterion.id)).map(([category, accounts]) => (
                            <div key={category}>
                              <div style={{
                                padding: "8px 12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#6b7280",
                                textTransform: "uppercase",
                                backgroundColor: "#f9fafb",
                                borderBottom: "1px solid #e5e7eb",
                              }}>
                                {category}
                              </div>
                              {accounts.map((account) => (
                                <button
                                  key={account}
                                  type="button"
                                  onClick={() => handlePaidThroughSelect(criterion.id, account)}
                                  style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    border: "none",
                                    background: criterion.value === account ? "#15637210" : "transparent",
                                    color: criterion.value === account ? "#156372" : "#111827",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    display: "block",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (criterion.value !== account) {
                                      e.target.style.backgroundColor = "#f9fafb";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (criterion.value !== account) {
                                      e.target.style.backgroundColor = "transparent";
                                    }
                                  }}
                                >
                                  {account}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div style={{
                          padding: "8px 12px",
                          borderTop: "1px solid #e5e7eb",
                          backgroundColor: "#f9fafb",
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              // Handle new account creation
                              console.log("Create new account");
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              textAlign: "left",
                              border: "none",
                              background: "transparent",
                              color: "#156372",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "transparent";
                            }}
                          >
                            <Plus size={16} />
                            New Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    style={{ ...modalStyles.input, ...modalStyles.criterionValue }}
                    value={criterion.value}
                    onChange={(e) =>
                      handleCriterionChange(criterion.id, "value", e.target.value)
                    }
                    placeholder="Value"
                  />
                )}
                <div style={modalStyles.criterionActions}>
                  <button
                    type="button"
                    style={modalStyles.iconButton}
                    onClick={addCriterion}
                  >
                    <Plus size={16} />
                  </button>
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      style={modalStyles.iconButton}
                      onClick={() => removeCriterion(criterion.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              style={modalStyles.addCriterionButton}
              onClick={addCriterion}
            >
              <Plus size={16} />
              Add Criterion
            </button>
          </div>

          {/* Columns Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Columns Preference</div>
            <div style={modalStyles.columnsContainer}>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.columnSectionTitle}>AVAILABLE COLUMNS</div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={modalStyles.searchInput}
                />
                <div style={modalStyles.columnList}>
                  {filteredColumns.map((column) => (
                    <div
                      key={column}
                      style={modalStyles.columnItem}
                      onClick={() => moveColumnToSelected(column)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                    >
                      <GripVertical size={16} style={{ color: "#9ca3af" }} />
                      <span style={{ fontSize: "14px" }}>{column}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={modalStyles.columnSection}>
                <div style={modalStyles.columnSectionTitle}>
                  <Check size={16} style={{ color: "#10b981" }} />
                  SELECTED COLUMNS
                </div>
                <div style={modalStyles.columnList}>
                  {formData.selectedColumns.map((column) => {
                    const requiredColumns = ["Date", "Expense Account", "Amount"];
                    const isRequired = requiredColumns.includes(column);
                    return (
                      <div
                        key={column}
                        style={modalStyles.columnItem}
                        onClick={() => moveColumnToAvailable(column)}
                        onMouseEnter={(e) => {
                          if (!isRequired) {
                            e.target.style.backgroundColor = "#f3f4f6";
                          }
                        }}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                      >
                        <GripVertical size={16} style={{ color: "#9ca3af" }} />
                        <span style={{ fontSize: "14px" }}>
                          {column}
                          {isRequired && <span style={{ color: "#156372" }}>*</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Preference Section */}
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionTitle}>Visibility Preference</div>
            <div style={modalStyles.radioGroup}>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Me"
                  checked={formData.visibility === "Only Me"}
                  onChange={handleChange}
                />
                <Lock size={16} style={{ color: "#6b7280" }} />
                <span>Only Me</span>
              </label>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Only Selected Users & Roles"
                  checked={formData.visibility === "Only Selected Users & Roles"}
                  onChange={handleChange}
                />
                <Users size={16} style={{ color: "#6b7280" }} />
                <span>Only Selected Users & Roles</span>
              </label>
              <label style={modalStyles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="Everyone"
                  checked={formData.visibility === "Everyone"}
                  onChange={handleChange}
                />
                <FileText size={16} style={{ color: "#6b7280" }} />
                <span>Everyone</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={modalStyles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelBtn}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f9fafb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#ffffff")}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={modalStyles.saveBtn}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0D4A52")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#156372")}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


