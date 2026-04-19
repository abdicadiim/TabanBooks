import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ChevronDown,
  Edit,
  RotateCw,
  MoreVertical,
  Upload as UploadIcon,
  X,
  MessageCircle,
  Trash2,
  FileText,
  ChevronRight,
  Paperclip,
  Plus,
  History,
} from "lucide-react";
import { expensesAPI, chartOfAccountsAPI, currenciesAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

const EXPENSES_KEY = "expenses_v1";

type ExpenseId = string | number | null | undefined;

interface ExpenseComment {
  id?: string;
  _id?: string;
  text?: string;
  author?: string;
  createdAt?: string;
  date?: string;
  [key: string]: any;
}

interface UploadedFilePlaceholder {
  name: string;
  size: number;
  lastModified: number;
  type?: string;
}

type UploadedFile = File | UploadedFilePlaceholder;

interface ExpenseRecord {
  id?: ExpenseId;
  _id?: ExpenseId;
  expense_id?: ExpenseId;
  comments?: ExpenseComment[];
  receipts?: string[];
  expenseAccount?: string;
  amount?: string | number;
  date?: string;
  paidThrough?: string;
  vendor?: string;
  customerName?: string;
  reference?: string;
  status?: string;
  notes?: string;
  raw_date?: string;
  currency?: string;
  account_id?: any;
  paid_through_account_id?: any;
  vendor_id?: any;
  customer_id?: any;
  line_items?: any[];
  is_itemized_expense?: boolean;
  is_inclusive_tax?: boolean;
  is_billable?: boolean;
  [key: string]: any;
}

const getLS = (k: string) => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(k);
  }
  return null;
};

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const [expense, setExpense] = useState<ExpenseRecord | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>(id ? [String(id)] : []);
  const [showHistory, setShowHistory] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadExpense = async () => {
    setIsLoading(true);
    let hasLocalExpense = false;

    // Fetch currencies first or concurrently
    try {
      const cursResp = await currenciesAPI.getAll();
      const cursList = Array.isArray(cursResp) ? cursResp : (cursResp?.data || []);
      setCurrencies(cursList);
    } catch (err) {
      console.error('Error fetching currencies:', err);
    }
    // Try localStorage first for faster UX
    try {
      const savedExpenses = getLS(EXPENSES_KEY);
      if (savedExpenses) {
        const parsed = JSON.parse(savedExpenses);
        const expensesList: ExpenseRecord[] = Array.isArray(parsed) ? parsed : [];
        setExpenses(expensesList);
        const foundExpense = expensesList.find((e: ExpenseRecord) => String(e.id) === String(id));
        if (foundExpense) {
          const normalizedFoundExpense: ExpenseRecord = {
            ...foundExpense,
            comments: Array.isArray(foundExpense.comments) ? foundExpense.comments : [],
          };
          hasLocalExpense = true;
          setExpense(normalizedFoundExpense);
          if (normalizedFoundExpense.receipts && normalizedFoundExpense.receipts.length > 0) {
            const fileObjects = normalizedFoundExpense.receipts.map((name: string, index: number) => ({
              name,
              size: 0,
              lastModified: Date.now() - (normalizedFoundExpense.receipts.length - index) * 1000,
            }));
            setUploadedFiles(fileObjects);
          }
          // Show cached detail immediately; API fetch below refreshes canonical data.
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error reading local expenses:', err);
    }

    // If not found locally, fetch from API
    try {
      const resp = await expensesAPI.getById(id);
      // Resp shape may vary; try common fields
      const apiExpense = (resp && (resp.expense || resp.data)) || resp;
      if (apiExpense) {
        // Helper function to extract account name from populated object or string
        const extractAccountName = (field: any): string => {
          if (!field) return '';
          if (typeof field === 'string') return field;
          if (typeof field === 'object') {
            return field.accountName || field.name || field.account_name || field.displayName || '';
          }
          return '';
        };

        // Helper function to extract vendor/customer name
        const extractEntityName = (field: any): string => {
          if (!field) return '';
          if (typeof field === 'string') return field;
          if (typeof field === 'object') {
            return field.displayName || field.name || '';
          }
          return '';
        };

        const mapped: any = {
          id: apiExpense.expense_id || apiExpense._id || apiExpense.id || id,
          _id: apiExpense._id || undefined,
          expense_id: apiExpense.expense_id || undefined,
          date: apiExpense.date ? new Date(apiExpense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (apiExpense.dateString || ''),
          expenseAccount: extractAccountName(apiExpense.account_id) || apiExpense.account_name || apiExpense.account || '',
          amount: apiExpense.total || apiExpense.amount || 0,
          currency: baseCurrencyCode || apiExpense.currency_code || apiExpense.currency || '',
          currencySymbol: (apiExpense.currency && apiExpense.currency.symbol) || undefined,
          paidThrough: extractAccountName(apiExpense.paid_through_account_id) || apiExpense.paid_through_account_name || apiExpense.paidThrough || '',
          vendor: extractEntityName(apiExpense.vendor_id) || apiExpense.vendor_name || apiExpense.vendorName || '',
          reference: apiExpense.reference_number || apiExpense.reference || '',
          customerName: extractEntityName(apiExpense.customer_id) || apiExpense.customer_name || apiExpense.customerName || '',
          status: (apiExpense.status || '').toUpperCase(),
          notes: apiExpense.description || apiExpense.notes || '',
          receipts: apiExpense.receipts || apiExpense.uploads || [],
          comments: Array.isArray(apiExpense.comments) ? apiExpense.comments : [],
          // Store IDs separately for reference (with null checks)
          account_id: (apiExpense.account_id && typeof apiExpense.account_id === 'object') ? apiExpense.account_id._id : apiExpense.account_id,
          paid_through_account_id: (apiExpense.paid_through_account_id && typeof apiExpense.paid_through_account_id === 'object') ? apiExpense.paid_through_account_id._id : apiExpense.paid_through_account_id,
          vendor_id: (apiExpense.vendor_id && typeof apiExpense.vendor_id === 'object') ? apiExpense.vendor_id._id : apiExpense.vendor_id,
          customer_id: (apiExpense.customer_id && typeof apiExpense.customer_id === 'object') ? apiExpense.customer_id._id : apiExpense.customer_id,
          is_itemized_expense: apiExpense.is_itemized_expense || false,
          line_items: apiExpense.line_items || [],
          raw_date: apiExpense.date,
          is_inclusive_tax: apiExpense.is_inclusive_tax,
          is_billable: apiExpense.is_billable,
        };
        // Try to resolve account names using Chart of Accounts
        try {
          const accountsResp: any = await chartOfAccountsAPI.getAccounts({ limit: 1000 });
          const accountsList = Array.isArray(accountsResp) ? accountsResp : (accountsResp?.data || []);

          const findAccountName = (acctCandidate: any): string | null => {
            if (!acctCandidate) return null;

            // If it's already a populated object, extract the name directly
            if (typeof acctCandidate === 'object' && acctCandidate !== null) {
              return acctCandidate.accountName || acctCandidate.name || acctCandidate.account_name || acctCandidate.displayName || null;
            }

            // If it's a string, try to find it by ID or name
            const byId = accountsList.find((a: any) => String(a._id || a.id) === String(acctCandidate));
            if (byId) return byId.accountName || byId.name || byId.account_name || byId.displayName;
            const byName = accountsList.find((a: any) => (a.accountName || a.name || a.account_name || a.displayName) === acctCandidate);
            if (byName) return byName.accountName || byName.name || byName.account_name || byName.displayName;

            // If it's a string and not found, return the string itself
            if (typeof acctCandidate === 'string') return acctCandidate;

            return null;
          };

          // Resolve expense account - try the populated object first, then fall back to name fields
          const expenseAcctCandidate = apiExpense.account_id || apiExpense.account_name || apiExpense.account || apiExpense.expenseAccount || apiExpense.accountId;
          const resolvedExpenseAcct = findAccountName(expenseAcctCandidate) || '';
          mapped.expenseAccount = resolvedExpenseAcct;

          // Resolve paid through account
          const paidThroughCandidate = apiExpense.paid_through_account_id || apiExpense.paid_through_account_name || apiExpense.paidThrough || apiExpense.paid_through_account;
          const resolvedPaidThrough = findAccountName(paidThroughCandidate) || '';
          mapped.paidThrough = resolvedPaidThrough;
        } catch (acctErr) {
          // If account resolution fails, keep whatever values exist
          console.error('Error resolving accounts for expense:', acctErr);
        }

        setExpense(mapped);
        if (mapped.receipts && mapped.receipts.length > 0) {
          const fileObjects = mapped.receipts.map((name: string, index: number) => ({
            name,
            size: 0,
            lastModified: Date.now() - (mapped.receipts.length - index) * 1000,
          }));
          setUploadedFiles(fileObjects);
        }
      } else {
        if (!hasLocalExpense) {
          setExpense(null);
        }
      }
    } catch (err) {
      console.error('Error fetching expense from API:', err);
      if (!hasLocalExpense) {
        setExpense(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
    // Initialize selected expenses with current expense
    setSelectedExpenses(id ? [String(id)] : []);

    // Listen for updates
    const handleExpensesUpdate = () => {
      loadExpense();
    };

    window.addEventListener("expensesUpdated", handleExpensesUpdate);
    window.addEventListener("storage", handleExpensesUpdate);
    window.addEventListener("focus", handleExpensesUpdate);

    return () => {
      window.removeEventListener("expensesUpdated", handleExpensesUpdate);
      window.removeEventListener("storage", handleExpensesUpdate);
      window.removeEventListener("focus", handleExpensesUpdate);
    };
  }, [id, baseCurrencyCode]);

  // Handle Esc key to clear selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedExpenses.length > 0) {
        setSelectedExpenses([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedExpenses.length]);

  const exportSubmenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
        setExportSubmenuOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(target)) {
        setUploadMenuOpen(false);
      }
      if (exportSubmenuRef.current && !exportSubmenuRef.current.contains(target)) {
        setExportSubmenuOpen(false);
      }
    };

    if (moreMenuOpen || uploadMenuOpen || exportSubmenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuOpen, uploadMenuOpen, exportSubmenuOpen]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Validate file size (10MB max)
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
      if (validFiles.length !== files.length) {
        alert("Some files exceed the 10MB limit and were not uploaded.");
      }
      if (validFiles.length > 0) {
        setUploadedFiles(prev => {
          const newFiles = [...prev, ...validFiles];
          // Set current file index to the first newly uploaded file
          setCurrentFileIndex(prev.length);
          return newFiles;
        });
        // Update expense with uploaded files
        const updatedExpense = { ...expense, receipts: [...(expense?.receipts || []), ...validFiles.map((f: File) => f.name)] };
        setExpense(updatedExpense);
        // Save to localStorage
        const updatedExpenses = expenses.map((e: ExpenseRecord) => e.id === id ? updatedExpense : e);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      // Validate file size (10MB max)
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
      if (validFiles.length !== files.length) {
        alert("Some files exceed the 10MB limit and were not uploaded.");
      }
      if (validFiles.length > 0) {
        setUploadedFiles(prev => {
          const newFiles = [...prev, ...validFiles];
          // Set current file index to the first newly uploaded file
          setCurrentFileIndex(prev.length);
          return newFiles;
        });
        // Update expense with uploaded files
        const updatedExpense = { ...expense, receipts: [...(expense?.receipts || []), ...validFiles.map((f: File) => f.name)] };
        setExpense(updatedExpense);
        // Save to localStorage
        const updatedExpenses = expenses.map((e: ExpenseRecord) => e.id === id ? updatedExpense : e);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    // Update expense with remaining files
    const updatedExpense = {
      ...expense,
      receipts: updatedFiles.map(f => f.name)
    };
    setExpense(updatedExpense);
    // Save to localStorage
    const updatedExpenses = expenses.map((e: ExpenseRecord) => e.id === id ? updatedExpense : e);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
    // Adjust current file index if needed
    if (currentFileIndex >= updatedFiles.length && updatedFiles.length > 0) {
      setCurrentFileIndex(updatedFiles.length - 1);
    } else if (updatedFiles.length === 0) {
      setCurrentFileIndex(0);
    }
  };

  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Update current file index when files are added
  useEffect(() => {
    if (uploadedFiles.length > 0 && currentFileIndex === 0 && uploadedFiles.length > 1) {
      // Keep current index, but ensure it's valid
      if (currentFileIndex >= uploadedFiles.length) {
        setCurrentFileIndex(uploadedFiles.length - 1);
      }
    }
  }, [uploadedFiles.length]);

  const handleEdit = () => {
    // Navigate to edit page with expense data
    navigate(`/purchases/expenses/new`, { state: { editExpense: expense, isEdit: true } });
  };

  const handleMakeRecurring = () => {
    // Navigate to create recurring expense with current expense data
    navigate("/purchases/recurring-expenses/new", {
      state: {
        fromExpense: expense,
        expenseAccount: expense.expenseAccount,
        amount: expense.amount,
        currency: expense.currency,
        vendor: expense.vendor,
        paidThrough: expense.paidThrough,
      }
    });
  };

  const getCurrentUserLabel = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const fullName = String(parsedUser?.name || "").trim();
      if (fullName) return fullName;
      const emailName = String(parsedUser?.email || "").trim();
      if (emailName) return emailName;
    } catch (error) {
      console.error("Failed to parse current user:", error);
    }
    return "User";
  };

  const formatCommentDate = (value: any) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleAddComment = async () => {
    const content = String(commentText || "").trim();
    if (!content || !expense) return;

    const expenseId = String(expense.expense_id || expense.id || id || "").trim();
    if (!expenseId) {
      alert("Unable to save comment because this expense has no ID.");
      return;
    }

    const newComment = {
      id: `comment-${Date.now()}`,
      text: content,
      author: getCurrentUserLabel(),
      createdAt: new Date().toISOString(),
    };

    const previousExpense = expense;
    const previousText = commentText;
    const previousComments = Array.isArray(expense.comments) ? expense.comments : [];
    const nextComments = [...previousComments, newComment];

    setIsSavingComment(true);
    setCommentText("");
    setExpense({ ...expense, comments: nextComments });

    try {
      const response = await expensesAPI.update(expenseId, { comments: nextComments });
      const persistedExpense = response?.expense || response?.data;
      const persistedComments = Array.isArray(persistedExpense?.comments)
        ? persistedExpense.comments
        : nextComments;

      setExpense((prev: any) => {
        if (!prev) return prev;
        return { ...prev, comments: persistedComments };
      });

      setExpenses((prev: any[]) => {
        const updated = (Array.isArray(prev) ? prev : []).map((item: any) => {
          const itemId = String(item?.id || item?.expense_id || item?._id || "");
          if (itemId !== expenseId) return item;
          return { ...item, comments: persistedComments };
        });
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
        return updated;
      });

      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));
    } catch (error: any) {
      console.error("Failed to save comment:", error);
      setExpense(previousExpense);
      setCommentText(previousText);
      alert(error?.message || "Failed to save comment.");
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDelete = () => {
    const deleteExpense = async () => {
      if (!window.confirm("Are you sure you want to delete this expense?")) {
        return;
      }

      try {
        const expenseIdCandidates = getExpenseIdCandidates(expense);
        let deleted = false;
        let lastError: any = null;

        for (const candidateId of expenseIdCandidates) {
          try {
            const deleteResponse = await expensesAPI.delete(candidateId);
            const success =
              deleteResponse === null ||
              deleteResponse?.success ||
              deleteResponse?.code === 0;

            if (success || typeof deleteResponse === "object") {
              deleted = true;
              break;
            }
          } catch (deleteError: any) {
            lastError = deleteError;
          }
        }

        if (!deleted) {
          throw lastError || new Error("Failed to delete expense.");
        }

        const idSet = new Set(expenseIdCandidates);
        const updatedExpenses = expenses.filter((item: any) => {
          const rowIds = [
            item?._id,
            item?.expense_id,
            item?.id,
          ]
            .map((value) => String(value || "").trim())
            .filter(Boolean);
          return !rowIds.some((rowId) => idSet.has(rowId));
        });
        setExpenses(updatedExpenses);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(updatedExpenses));
        window.dispatchEvent(new Event("expensesUpdated"));
        window.dispatchEvent(new Event("storage"));
        navigate("/purchases/expenses");
      } catch (error: any) {
        console.error("Failed to delete expense:", error);
        alert(error?.message || "Failed to delete expense.");
      }
    };

    deleteExpense();
    setMoreMenuOpen(false);
  };

  const toEntityId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return String(value._id || value.id || "");
    return "";
  };

  const toFiniteNumber = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toISODate = (value: any) => {
    if (!value) return new Date().toISOString().split("T")[0];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
    return parsed.toISOString().split("T")[0];
  };

  const getExpenseIdCandidates = (record: any): string[] => {
    const values = [
      record?._id,
      record?.expense_id,
      record?.id,
      id,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return Array.from(new Set(values));
  };

  const handleClone = async () => {
    setMoreMenuOpen(false);
    if (!expense) return;

    try {
      const sourceIdCandidates = getExpenseIdCandidates(expense);
      if (!sourceIdCandidates.length) {
        alert("Cannot clone this expense because it has no ID.");
        return;
      }

      let sourceExpense: any = null;
      for (const candidateId of sourceIdCandidates) {
        try {
          const sourceResponse = await expensesAPI.getById(candidateId);
          const fetched = sourceResponse?.expense || sourceResponse?.data || sourceResponse;
          if (fetched) {
            sourceExpense = fetched;
            break;
          }
        } catch {
          // Try next candidate ID
        }
      }

      if (!sourceExpense) {
        throw new Error("Could not load expense details for cloning.");
      }

      const accountId = toEntityId(sourceExpense.account_id) || toEntityId(expense.account_id);
      const paidThroughAccountId = toEntityId(sourceExpense.paid_through_account_id) || toEntityId(expense.paid_through_account_id);
      const accountName = sourceExpense.account_name || expense.expenseAccount || "";
      const paidThroughName = sourceExpense.paid_through_account_name || expense.paidThrough || "";

      if (!accountId && !accountName) {
        throw new Error("Cannot clone this expense because its expense account is missing.");
      }
      if (!paidThroughAccountId && !paidThroughName) {
        throw new Error("Cannot clone this expense because its paid through account is missing.");
      }

      const amount = toFiniteNumber(sourceExpense.amount ?? sourceExpense.total ?? expense.amount, 0);
      if (amount <= 0) {
        throw new Error("Cannot clone this expense because its amount is invalid.");
      }

      const vendorId = toEntityId(sourceExpense.vendor_id) || toEntityId(expense.vendor_id);
      const customerId = toEntityId(sourceExpense.customer_id) || toEntityId(expense.customer_id);

      const clonePayload: any = {
        date: toISODate(sourceExpense.date || expense.raw_date || new Date().toISOString()),
        account_name: accountName,
        account_id: accountId || undefined,
        amount,
        paid_through_account_name: paidThroughName,
        paid_through_account_id: paidThroughAccountId || undefined,
        reference_number: "",
        description: sourceExpense.description || sourceExpense.notes || expense.notes || "",
        currency_code: sourceExpense.currency_code || sourceExpense.currency || expense.currency || baseCurrencyCode || "USD",
        is_inclusive_tax: sourceExpense.is_inclusive_tax ?? expense.is_inclusive_tax ?? true,
      };

      const taxId = toEntityId(sourceExpense.tax_id);
      if (taxId) {
        clonePayload.tax_id = taxId;
      }

      if (vendorId) {
        clonePayload.vendor_id = vendorId;
      }
      if (customerId) {
        clonePayload.customer_id = customerId;
      }

      clonePayload.is_billable = Boolean(sourceExpense.is_billable ?? expense.is_billable);
      clonePayload.status = clonePayload.is_billable && clonePayload.customer_id ? "unbilled" : "non-billable";

      const sourceLineItems = Array.isArray(sourceExpense.line_items)
        ? sourceExpense.line_items
        : (Array.isArray(expense.line_items) ? expense.line_items : []);

      if ((sourceExpense.is_itemized_expense || expense.is_itemized_expense) && sourceLineItems.length > 0) {
        const clonedLineItems = sourceLineItems
          .map((line: any, index: number) => {
            const lineAccountId = toEntityId(line?.account_id) || accountId;
            const lineAmount = toFiniteNumber(line?.amount, 0);
            if (!lineAccountId || lineAmount <= 0) return null;

            return {
              account_id: lineAccountId,
              account_name: line?.account_name || accountName,
              description: line?.description || "",
              amount: lineAmount,
              item_order: line?.item_order || index + 1,
            };
          })
          .filter(Boolean);

        if (clonedLineItems.length > 0) {
          clonePayload.is_itemized_expense = true;
          clonePayload.line_items = clonedLineItems;
        }
      }

      const cloneResponse = await expensesAPI.create(clonePayload);
      if (!cloneResponse || (!cloneResponse.success && cloneResponse.code !== 0)) {
        throw new Error(cloneResponse?.message || "Failed to clone expense.");
      }

      const clonedExpenseId =
        cloneResponse?.data?.expense_id
        || cloneResponse?.expense?.expense_id
        || cloneResponse?.data?._id
        || cloneResponse?.data?.id
        || cloneResponse?.expense?._id
        || cloneResponse?.expense?.id;

      window.dispatchEvent(new Event("expensesUpdated"));

      if (clonedExpenseId) {
        navigate(`/purchases/expenses/${clonedExpenseId}`);
        return;
      }

      alert("Expense cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning expense:", error);
      alert(error?.message || "Failed to clone expense.");
    }
  };

  const handleExport = () => {
    if (!expense) return;

    const pdf = new jsPDF("p", "mm", "a4");
    let y = 16;
    const lineHeight = 7;
    const labelWidth = 45;

    const addField = (label: string, value: any) => {
      const safeValue = String(value || "-");
      const split = pdf.splitTextToSize(safeValue, 130);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${label}:`, 14, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(split, 14 + labelWidth, y);
      y += Math.max(lineHeight, split.length * 6);
      if (y > 275) {
        pdf.addPage();
        y = 16;
      }
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Expense Details", 14, y);
    y += 10;
    pdf.setFontSize(11);

    addField("Reference#", expense.reference || expense.id);
    addField("Date", expense.date);
    addField("Expense Account", expense.expenseAccount);
    addField("Paid Through", expense.paidThrough);
    addField("Vendor", expense.vendor);
    addField("Customer", expense.customerName);
    addField("Status", expense.status);
    addField("Currency", expense.currency || baseCurrencyCode || "USD");
    addField("Amount", `${Number.parseFloat(String(expense.amount || 0)).toFixed(2)}`);
    addField("Notes", expense.notes);

    pdf.save(`expense-${expense.id}.pdf`);
    setMoreMenuOpen(false);
  };

  const handleChat = () => {
    setShowHistory(!showHistory);
  };

  if (!isLoading && expense === null) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "16px" }}>Expense not found</p>
        <button
          onClick={() => navigate("/purchases/expenses")}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#156372",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Back to Expenses
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "16px", color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  const getCurrencySymbol = () => {
    if (baseCurrencySymbol) return baseCurrencySymbol;
    const code = baseCurrencyCode || "";
    if (!code) return "";
    const match = currencies.find(c => c.code === code);
    return match ? match.symbol : code;
  };

  // Calculate journal entries
  const debitAmount = parseFloat(expense.amount || 0);
  const creditAmount = parseFloat(expense.amount || 0);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      position: "relative",
    },
    sidebar: {
      width: "320px",
      borderRight: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    },
    sidebarHeader: {
      padding: "16px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    },
    sidebarHeaderLeft: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "4px",
      backgroundColor: "#f3f4f6",
    },
    sidebarHeaderTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
    },
    sidebarHeaderActions: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    sidebarIconButton: {
      padding: "6px",
      borderRadius: "4px",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "1px solid #e5e7eb",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    sidebarPlusButton: {
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
    },
    sidebarSearchWrapper: {
      padding: "8px 16px",
      borderBottom: "1px solid #e5e7eb",
    },
    sidebarSearch: {
      width: "100%",
      padding: "6px 10px",
      fontSize: "13px",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      outline: "none",
    },
    sidebarList: {
      flex: 1,
      overflowY: "auto",
    },
    sidebarItem: {
      padding: "12px 16px",
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      position: "relative",
    },
    sidebarItemActive: {
      backgroundColor: "#15637210",
      borderLeft: "4px solid #156372",
    },
    sidebarCheckbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    sidebarContent: {
      flex: 1,
    },
    sidebarAccount: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#111827",
      marginBottom: "2px",
    },
    sidebarAmount: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      float: "right",
    },
    sidebarDate: {
      fontSize: "12px",
      color: "#6b7280",
    },
    sidebarAttachment: {
      marginLeft: "auto",
      color: "#9ca3af",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    },
    header: {
      display: "flex",
      flexDirection: "column",
      borderBottom: "1px solid #e5e7eb",
      flexShrink: 0,
    },
    topHeader: {
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    chatIconBox: {
      padding: "6px",
      borderRadius: "6px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #e5e7eb",
      color: "#374151",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    },
    closeIconRed: {
      color: "#156372",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px",
    },
    actionToolbar: {
      padding: "6px 24px",
      display: "flex",
      alignItems: "center",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
    },
    toolbarAction: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      fontSize: "13px",
      color: "#374151",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      fontWeight: "500",
    },
    toolbarSeparator: {
      width: "1px",
      height: "16px",
      backgroundColor: "#e5e7eb",
      margin: "0 2px",
    },
    moreMenuItem: {
      padding: "8px 16px",
      fontSize: "13px",
      color: "#374151",
      backgroundColor: "transparent",
      border: "none",
      width: "100%",
      textAlign: "left" as any,
      cursor: "pointer",
      display: "block",
    },
    historySidebar: {
      width: "300px",
      borderLeft: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    },
    historyHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    historyTitle: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#111827",
    },
    historyList: {
      flex: 1,
      overflowY: "auto",
      padding: "16px 0",
    },
    historyItem: {
      padding: "12px 20px",
      display: "flex",
      gap: "12px",
      borderLeft: "2px solid transparent",
    },
    historyIconBox: {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    historyContent: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flex: 1,
    },
    historyUserRow: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    historyUser: {
      fontSize: "13px",
      fontWeight: "700",
      color: "#111827",
    },
    historyTime: {
      fontSize: "11px",
      color: "#9ca3af",
      textTransform: "uppercase" as any,
    },
    historyBubble: {
      padding: "10px 14px",
      backgroundColor: "#f9fafb",
      borderRadius: "6px",
      fontSize: "13px",
      color: "#374151",
      width: "fit-content",
      maxWidth: "100%",
    },
    contentScroll: {
      flex: 1,
      overflowY: "auto",
    },
    contentArea: {
      padding: "32px",
      maxWidth: "1000px",
      margin: "0 auto",
      width: "100%",
    },
    detailGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gap: "40px",
    },
    mainInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    },
    amountLabel: {
      fontSize: "13px",
      color: "#6b7280",
      marginBottom: "4px",
    },
    amountValue: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#156372",
    },
    amountDate: {
      fontSize: "14px",
      color: "#111827",
      marginLeft: "8px",
      fontWeight: "400",
    },
    statusBadge: {
      fontSize: "11px",
      fontWeight: "600" as any,
      color: "#6b7280",
      textTransform: "uppercase" as any,
      marginTop: "4px",
    },
    categoryTag: {
      display: "inline-block",
      padding: "4px 10px",
      fontSize: "13px",
      fontWeight: "500",
      color: "#0d9488",
      backgroundColor: "#ccfbf1",
      borderRadius: "4px",
      width: "fit-content",
      marginTop: "16px",
    },
    infoBlock: {
      marginTop: "24px",
    },
    infoBlockLabel: {
      fontSize: "13px",
      color: "#6b7280",
      marginBottom: "4px",
      fontWeight: "500",
    },
    infoBlockValue: {
      fontSize: "14px",
      color: "#111827",
      fontWeight: "500",
    },
    receiptCard: {
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      backgroundColor: "#ffffff",
      overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    receiptHeader: {
      padding: "12px 16px",
      borderBottom: "1px solid #f3f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
    },
    receiptPreview: {
      padding: "24px",
      minHeight: "340px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
    },
    receiptFooter: {
      padding: "10px 16px",
      borderTop: "1px dashed #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "12px",
      color: "#6b7280",
    },
    journalSection: {
      marginTop: "48px",
      paddingTop: "24px",
      borderTop: "1px solid #e5e7eb",
    },
    journalTab: {
      display: "inline-block",
      padding: "8px 0",
      fontSize: "14px",
      fontWeight: "600",
      color: "#156372",
      borderBottom: "2px solid #156372",
      marginBottom: "20px",
    },
    journalSummary: {
      fontSize: "12px",
      color: "#6b7280",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    currencyBadge: {
      backgroundColor: "#156372",
      color: "#ffffff",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "700",
    },
    journalTable: {
      width: "100%",
      borderCollapse: "collapse" as any,
      marginTop: "8px",
    },
    journalTableHeader: {
      borderBottom: "1px solid #e5e7eb",
    },
    journalTableHeaderCell: {
      padding: "12px 16px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textAlign: "left" as any,
      backgroundColor: "#ffffff",
    },
    journalTableCell: {
      padding: "16px",
      fontSize: "14px",
      color: "#111827",
      borderBottom: "1px solid #f3f4f6",
    },
    journalTotalRow: {
      backgroundColor: "#ffffff",
      fontWeight: "700",
    },
  };

  const sidebarScrollHide = `
    .sidebar-list::-webkit-scrollbar {
        display: none;
    }
    .sidebar-list {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `;

  if (isLoading || !expense) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{sidebarScrollHide}</style>

      {/* Left Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarHeaderLeft} onClick={() => navigate("/purchases/expenses")}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            <span style={styles.sidebarHeaderTitle}>All Expenses</span>
          </div>
          <div style={styles.sidebarHeaderActions}>
            <button style={styles.sidebarIconButton}><MoreVertical size={16} /></button>
            <button style={{ ...styles.sidebarIconButton, ...styles.sidebarPlusButton }} onClick={() => navigate("/purchases/expenses/new")}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div style={styles.sidebarSearchWrapper}>
          <input type="text" placeholder="Search..." style={styles.sidebarSearch as any} />
        </div>
        <div className="sidebar-list" style={styles.sidebarList}>
          {expenses.map((exp) => (
            <div
              key={exp.id}
              style={{ ...styles.sidebarItem, ...(String(exp.id) === String(id) ? styles.sidebarItemActive : {}) }}
              onClick={() => navigate(`/purchases/expenses/${exp.id}`)}
            >
              <input
                type="checkbox"
                checked={selectedExpenses.includes(String(exp.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedExpenses([...selectedExpenses, String(exp.id)]);
                  } else {
                    setSelectedExpenses(selectedExpenses.filter(id => id !== String(exp.id)));
                  }
                }}
                style={styles.sidebarCheckbox}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={styles.sidebarContent}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={styles.sidebarAccount}>{exp.expenseAccount || "No Account"}</div>
                  <div style={styles.sidebarAmount}>{getCurrencySymbol()} {parseFloat(exp.amount || 0).toFixed(2)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={styles.sidebarDate}>{exp.date}</div>
                  {exp.receipts && exp.receipts.length > 0 && <Paperclip size={12} style={styles.sidebarAttachment} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div style={styles.main}>
        <div style={styles.header}>
          {/* Top Row */}
          <div style={styles.topHeader}>
            <h1 style={styles.title}>Expense Details</h1>
            <div style={styles.headerRight}>
              <button style={styles.chatIconBox} onClick={handleChat}>
                <MessageCircle size={18} />
              </button>
              <div style={{ ...styles.toolbarSeparator, height: "24px", margin: "0 8px" }} />
              <button style={styles.closeIconRed} onClick={() => navigate("/purchases/expenses")}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div style={styles.actionToolbar}>
            <button style={styles.toolbarAction} onClick={handleEdit}>
              <Edit size={14} />
              Edit
            </button>
            <div style={styles.toolbarSeparator} />
            <button style={styles.toolbarAction} onClick={handleMakeRecurring}>
              <RotateCw size={14} />
              Make Recurring
            </button>
            <div style={styles.toolbarSeparator} />
            <button style={styles.toolbarAction} onClick={handleExport}>
              <FileText size={14} />
              PDF
            </button>
            <div style={styles.toolbarSeparator} />
            <button
              style={{ ...styles.toolbarAction, color: showHistory ? "#156372" : "#374151" }}
              onClick={() => setShowHistory(!showHistory)}
            >
              <History size={14} />
            </button>
            <div style={styles.toolbarSeparator} />
            <div style={{ position: "relative" }} ref={moreMenuRef}>
              <button style={styles.toolbarAction} onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
                <MoreVertical size={16} />
              </button>
              {moreMenuOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  zIndex: 100,
                  minWidth: "160px",
                  padding: "4px 0",
                }}>
                  <button style={styles.moreMenuItem as any} onClick={handleClone}>Clone</button>
                  <button style={styles.moreMenuItem as any} onClick={handleDelete}>Delete</button>
                </div>
              )}
            </div>
            <div style={styles.toolbarSeparator} />
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={styles.contentScroll}>
            <div style={styles.contentArea}>
              <div style={styles.detailGrid}>
                {/* Info Section */}
                <div style={styles.mainInfo}>
                  <div>
                    <div style={styles.amountLabel}>AMOUNT</div>
                    <div style={{ display: "flex", alignItems: "baseline" }}>
                      <span style={styles.amountValue}>{getCurrencySymbol()} {parseFloat(expense.amount || 0).toFixed(2)}</span>
                      <span style={styles.amountDate}>on {expense.date}</span>
                    </div>
                    <div style={styles.statusBadge}>{expense.status || "NON-BILLABLE"}</div>
                    <div style={styles.categoryTag}>{expense.expenseAccount}</div>
                  </div>

                  <div style={styles.infoBlock}>
                    <div style={styles.infoBlockLabel}>PAID THROUGH</div>
                    <div style={styles.infoBlockValue}>{expense.paidThrough}</div>
                  </div>

                  {expense.vendor && (
                    <div style={styles.infoBlock}>
                      <div style={styles.infoBlockLabel}>VENDOR</div>
                      <div style={styles.infoBlockValue}>{expense.vendor}</div>
                    </div>
                  )}

                  {expense.customerName && (
                    <div style={styles.infoBlock}>
                      <div style={styles.infoBlockLabel}>CUSTOMER NAME</div>
                      <div style={styles.infoBlockValue}>{expense.customerName}</div>
                    </div>
                  )}

                  {expense.reference && (
                    <div style={styles.infoBlock}>
                      <div style={styles.infoBlockLabel}>REFERENCE#</div>
                      <div style={styles.infoBlockValue}>{expense.reference}</div>
                    </div>
                  )}

                  {expense.notes && (
                    <div style={styles.infoBlock}>
                      <div style={styles.infoBlockLabel}>NOTES</div>
                      <div style={{ ...styles.infoBlockValue, fontWeight: "400", color: "#374151" }}>{expense.notes}</div>
                    </div>
                  )}
                </div>

                {/* Receipt Section */}
                <div>
                  <div style={styles.receiptCard}>
                    <div style={styles.receiptHeader} onClick={() => setUploadMenuOpen(!uploadMenuOpen)} ref={uploadMenuRef}>
                      <UploadIcon size={14} style={{ color: "#6b7280" }} />
                      <span>Upload your Files</span>
                      <ChevronDown size={14} style={{ color: "#9ca3af" }} />

                      {uploadMenuOpen && (
                        <div style={{
                          position: "absolute",
                          top: "40px",
                          left: "16px",
                          right: "16px",
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          zIndex: 100,
                          padding: "4px 0",
                        }}>
                          <button style={{
                            width: "100%",
                            padding: "8px 16px",
                            fontSize: "14px",
                            color: "#111827",
                            cursor: "pointer",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                          }} onClick={handleUploadClick}>
                            Attach From Desktop
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      style={styles.receiptPreview}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {uploadedFiles.length > 0 ? (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {uploadedFiles[currentFileIndex] && uploadedFiles[currentFileIndex] instanceof File && uploadedFiles[currentFileIndex].type?.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(uploadedFiles[currentFileIndex])}
                              alt={uploadedFiles[currentFileIndex].name}
                              style={{
                                maxWidth: "100%",
                                maxHeight: "300px",
                                objectFit: "contain",
                                borderRadius: "4px",
                              }}
                            />
                          ) : (
                            <div style={{ textAlign: "center" as any }}>
                              <FileText size={48} style={{ color: "#9ca3af", marginBottom: "8px" }} />
                              <div style={{ fontSize: "13px", color: "#6b7280" }}>{uploadedFiles[currentFileIndex]?.name}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center" as any, color: "#9ca3af" }}>
                          <UploadIcon size={48} style={{ marginBottom: "12px" }} />
                          <div style={{ fontSize: "14px" }}>No receipt uploaded</div>
                        </div>
                      )}
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div style={styles.receiptFooter}>
                        <span>{currentFileIndex + 1} of {uploadedFiles.length} Files</span>
                        <button onClick={() => handleDeleteFile(currentFileIndex)} style={{ background: "none", border: "none", cursor: "pointer", color: "#156372" }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Journal Section */}
              <div style={styles.journalSection}>
                <div style={styles.journalTab}>Journal</div>
                <div style={styles.journalSummary}>
                  Amount is displayed in your base currency
                  <span style={styles.currencyBadge}>{baseCurrencyCode || expense.currency || "USD"}</span>
                </div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Expense</div>
                <table style={styles.journalTable}>
                  <thead>
                    <tr style={styles.journalTableHeader}>
                      <th style={styles.journalTableHeaderCell}>ACCOUNT</th>
                      <th style={{ ...styles.journalTableHeaderCell, textAlign: "right" as any }}>DEBIT</th>
                      <th style={{ ...styles.journalTableHeaderCell, textAlign: "right" as any }}>CREDIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.journalTableCell}>{expense.paidThrough}</td>
                      <td style={{ ...styles.journalTableCell, textAlign: "right" as any }}>0.00</td>
                      <td style={{ ...styles.journalTableCell, textAlign: "right" as any }}>{creditAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style={styles.journalTableCell}>{expense.expenseAccount}</td>
                      <td style={{ ...styles.journalTableCell, textAlign: "right" as any }}>{debitAmount.toFixed(2)}</td>
                      <td style={{ ...styles.journalTableCell, textAlign: "right" as any }}>0.00</td>
                    </tr>
                    <tr style={styles.journalTotalRow}>
                      <td style={styles.journalTableCell}>Total</td>
                      <td style={{ ...styles.journalTableCell, textAlign: "right" as any }}>{debitAmount.toFixed(2)}</td>
                      <td style={{ ...styles.journalTableCell, textAlign: "right" as any }}>{creditAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* History Sidebar */}
          {showHistory && (
            <div style={styles.historySidebar}>
              <div style={styles.historyHeader}>
                <span style={styles.historyTitle}>Comments & History</span>
                <button
                  onClick={() => setShowHistory(false)}
                  style={{
                    background: "none",
                    border: "1px solid #156372",
                    borderRadius: "4px",
                    padding: "2px",
                    cursor: "pointer",
                    color: "#156372",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={styles.historyList}>
                <div style={styles.historyItem}>
                  <div style={styles.historyIconBox}>
                    <FileText size={14} style={{ color: "#fbbf24" }} />
                  </div>
                  <div style={styles.historyContent}>
                    <div style={styles.historyUserRow}>
                      <span style={styles.historyUser}>asc wcs</span>
                      <span style={{ color: "#9ca3af" }}>•</span>
                      <span style={styles.historyTime}>31 JAN 2026 01:17 PM</span>
                    </div>
                    <div style={styles.historyBubble}>
                      Expense Created for {getCurrencySymbol()} {parseFloat(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "4px 20px 16px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.02em", color: "#6b7280", marginBottom: "8px" }}>
                    COMMENTS
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      resize: "vertical",
                      outline: "none",
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleAddComment}
                      disabled={isSavingComment || !String(commentText || "").trim()}
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#ffffff",
                        backgroundColor: isSavingComment || !String(commentText || "").trim() ? "#9ca3af" : "#156372",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isSavingComment || !String(commentText || "").trim() ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSavingComment ? "Saving..." : "Add Comment"}
                    </button>
                  </div>
                </div>

                <div style={{ padding: "0 20px 16px" }}>
                  {(Array.isArray(expense.comments) ? expense.comments : []).length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>No comments yet.</div>
                  ) : (
                    [...(Array.isArray(expense.comments) ? expense.comments : [])]
                      .reverse()
                      .map((comment: any, idx: number) => (
                        <div
                          key={String(comment?.id || comment?._id || idx)}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px",
                            marginBottom: "10px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                            {String(comment?.author || "User")}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                            {formatCommentDate(comment?.createdAt || comment?.date)}
                          </div>
                          <div style={{ fontSize: "13px", color: "#1f2937", whiteSpace: "pre-wrap" }}>
                            {String(comment?.text || "")}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
}
