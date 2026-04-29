import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  RefreshCw,
  Plus,
  MoreVertical,
  X,
  Pencil,
  FileText,
  Folder,
  Eye,
  Download,
  Upload,
  Trash2,
  Copy,
  ChevronRight,
  Paperclip,
  MessageSquare,
  History,
  Mail,
  Share2,
  Settings,
} from "lucide-react";
import { billsAPI, purchaseOrdersAPI, chartOfAccountsAPI, bankAccountsAPI, paymentsMadeAPI, transactionNumberSeriesAPI, pdfTemplatesAPI, profileAPI } from "../../../services/api";
import TransactionPDFDocument from "../../../components/Transactions/TransactionPDFDocument";
import { getBillStatusDisplay } from "../../../utils/billUtils";
import { toast } from "react-hot-toast";
import { AlertTriangle, Info } from "lucide-react";
import PaymentModeDropdown from "../../../components/PaymentModeDropdown";
import TabanSelect from "../../../components/TabanSelect";
import { useCurrency } from "../../../hooks/useCurrency";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getAccountOptionLabel, getBankAccountsFromResponse, getChartAccountsFromResponse, mergeAccountOptions } from "../shared/accountOptions";
import ExportBills from "./ExportBills";

const BILLS_LIST_CACHE_KEY = "bills-list-cache";

interface BillItem {
  id: string;
  itemDetails: string;
  account: string;
  quantity: string | number;
  rate: string | number;
  tax: string;
  amount: string | number;
}

interface Bill {
  id: string | number;
  billNumber: string;
  vendorName: string;
  vendorAddress?: string;
  vendorCity?: string;
  vendorCountry?: string;
  vendorEmail?: string;
  billDate: string;
  dueDate: string;
  referenceNumber?: string;
  orderNumber?: string;
  paymentTerms?: string;
  subject?: string;
  items: BillItem[];
  subTotal: string | number;
  discountAmount?: string | number;
  total: string | number;
  balanceDue: string | number;
  currency: string;
  status: string;
  accountsPayable?: string;
  purchaseOrderId?: string | number;
  vendorId?: string | number;
  paidAmount?: string | number;
  comments?: Array<{
    text?: string;
    author?: string;
    createdAt?: string;
  }>;
  attachments?: Array<{
    id?: string;
    name?: string;
    url?: string;
    size?: number;
    type?: string;
    uploadedAt?: string;
  }>;
}

interface PurchaseOrder {
  id: string | number;
  _id?: string;
  purchaseOrderNumber: string;
  date: string;
  status: string;
}

interface Payment {
  id: string | number;
  billId: string | number;
  billNumber: string;
  amount: string | number;
  date: string;
  paymentNumber?: string;
  payment_number?: string;
  reference?: string;
  referenceNumber?: string;
  reference_number?: string;
  mode?: string;
  paymentMethod?: string;
  paymentMode?: string;
}

const mapBillsForView = (rows: any[] = []) =>
  rows.map((bill: any) => ({
    ...bill,
    id: bill._id || bill.id,
  }));

const readCachedBills = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(BILLS_LIST_CACHE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? mapBillsForView(parsed) : [];
  } catch (error) {
    console.error("Failed to parse cached bills for detail page:", error);
    return [];
  }
};

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  const stateBill = location.state?.bill || null;
  const stateBills = Array.isArray(location.state?.bills)
    ? mapBillsForView(location.state.bills)
    : [];
  const cachedBills = readCachedBills();
  const initialBills = stateBills.length > 0 ? stateBills : cachedBills;
  const matchedInitialBill =
    stateBill ||
    initialBills.find(
      (entry: any) => String(entry.id || entry._id) === String(id)
    ) ||
    null;
  const [bill, setBill] = useState<Bill | null>(() => matchedInitialBill);
  const [isBillLoading, setIsBillLoading] = useState(() => !matchedInitialBill);
  const [bills, setBills] = useState<Bill[]>(() => initialBills as Bill[]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sidebarMoreMenuOpen, setSidebarMoreMenuOpen] = useState(false);
  const [showPdfView, setShowPdfView] = useState(true);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedBills, setSelectedBills] = useState<(string | number)[]>([]);
  const [isBulkActionsDropdownOpen, setIsBulkActionsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Payments Made");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [moreActionsMenuOpen, setMoreActionsMenuOpen] = useState(false);
  const [selectedSidebarView, setSelectedSidebarView] = useState("All");
  const [sidebarSortBy, setSidebarSortBy] = useState<"billDate" | "billNumber" | "vendorName" | "amount" | "dueDate" | "status">("billDate");
  const [sidebarSortOrder, setSidebarSortOrder] = useState<"asc" | "desc">("desc");
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<"bills" | "current-view">("bills");
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewUrl, setPrintPreviewUrl] = useState("");
  const [activePdfTemplate, setActivePdfTemplate] = useState<any>(null);
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const bulkActionsDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreActionsMenuRef = useRef<HTMLDivElement>(null);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const sidebarMoreMenuRef = useRef<HTMLDivElement>(null);
  const exportSubmenuRef = useRef<HTMLDivElement>(null);
  const billDocumentRef = useRef<HTMLDivElement>(null);
  const journalSectionRef = useRef<HTMLDivElement>(null);
  const printPreviewFrameRef = useRef<HTMLIFrameElement>(null);
  const isGeneratingPrintPreviewRef = useRef(false);
  const printPreviewUrlRef = useRef("");

  // Payment Recording State
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paidThroughAccounts, setPaidThroughAccounts] = useState<any[]>([]);
  const [activePaymentField, setActivePaymentField] = useState<string>("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    location: "Head Office",
    paymentAmount: "",
    bankCharges: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMadeOn: new Date().toISOString().split('T')[0],
    paymentMode: "Cash",
    paidThrough: "",
    paidThroughId: "",
    reference: "",
    deductTDS: false,
    notes: "",
    paymentNumber: "1"
  });
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const billAttachmentInputRef = useRef<HTMLInputElement>(null);
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const endOfMonthIsoDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const getPaymentFieldStyle = (fieldName: string, baseStyle: React.CSSProperties = {}) => ({
    ...baseStyle,
    borderColor: activePaymentField === fieldName ? "#3b82f6" : "#cbd5e1",
    boxShadow: activePaymentField === fieldName
      ? "0 0 0 3px rgba(59, 130, 246, 0.12), inset 0 1px 2px rgba(15, 23, 42, 0.04)"
      : "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
    transform: activePaymentField === fieldName ? "translateY(-1px)" : "translateY(0)",
  });

  const normalizePaymentRecord = (paymentData: any): Payment => ({
    id: paymentData?._id || paymentData?.id || paymentData?.paymentNumber || "",
    billId:
      paymentData?.billId ||
      paymentData?.bill?._id ||
      paymentData?.bill?.id ||
      paymentData?.bill ||
      "",
    billNumber:
      paymentData?.billNumber ||
      paymentData?.bill?.billNumber ||
      paymentData?.bill_number ||
      "",
    amount: paymentData?.amountPaid ?? paymentData?.amount ?? 0,
    date: paymentData?.date || paymentData?.paymentDate || paymentData?.createdAt || "",
    paymentNumber: paymentData?.paymentNumber || paymentData?.payment_number || "",
    payment_number: paymentData?.payment_number || paymentData?.paymentNumber || "",
    reference:
      paymentData?.reference ||
      paymentData?.referenceNumber ||
      paymentData?.reference_number ||
      "",
    referenceNumber:
      paymentData?.referenceNumber ||
      paymentData?.reference ||
      paymentData?.reference_number ||
      "",
    reference_number:
      paymentData?.reference_number ||
      paymentData?.referenceNumber ||
      paymentData?.reference ||
      "",
    mode: paymentData?.mode || paymentData?.paymentMethod || paymentData?.paymentMode || "",
    paymentMethod:
      paymentData?.paymentMethod || paymentData?.paymentMode || paymentData?.mode || "",
    paymentMode:
      paymentData?.paymentMode || paymentData?.mode || paymentData?.paymentMethod || "",
  });

  const loadBillsList = async () => {
    try {
      const response = await billsAPI.getAll();
      if (response && response.success && response.data) {
        // Transform bills for sidebar
        const allBills = response.data.map((b: any) => ({
          id: b._id || b.id,
          billNumber: b.billNumber,
          vendorName: b.vendorName || b.vendor?.displayName || "",
          billDate: b.date,
          dueDate: b.dueDate,
          total: b.total || 0,
          balance: b.balance !== undefined ? b.balance : b.total,
          currency: b.currency || resolvedBaseCurrency,
          status: b.status || "DRAFT"
        }));
        setBills(allBills);
      }
    } catch (error) {
      console.error("Error loading bills list:", error);
    }
  };

  useEffect(() => {
    const fetchTemplateAndOrg = async () => {
      try {
        const [templatesRes, orgRes] = await Promise.all([
          pdfTemplatesAPI.get(),
          profileAPI.get()
        ]);
        
        if (templatesRes?.success && Array.isArray(templatesRes.data)) {
          const billsTemplate = templatesRes.data.find((t: any) => t.moduleType === 'bills');
          if (billsTemplate) {
            setActivePdfTemplate(billsTemplate);
          }
        }
        
        if (orgRes?.success) {
          setOrganizationProfile(orgRes.data);
        }
      } catch (error) {
        console.error("Error fetching templates or org profile:", error);
      }
    };
    
    fetchTemplateAndOrg();
  }, []);

  const loadPurchaseOrders = async (purchaseOrderId: string | number) => {
    try {
      const response = await purchaseOrdersAPI.getById(String(purchaseOrderId));
      if (response && response.success && response.data) {
        const poData = response.data;
        setPurchaseOrders([{
          id: poData._id || poData.id,
          _id: poData._id,
          purchaseOrderNumber: poData.purchaseOrderNumber || poData.orderNumber || '',
          date: poData.date || poData.orderDate || '',
          status: poData.status || 'open'
        }]);
      }
    } catch (error) {
      console.error("Error loading purchase orders:", error);
      setPurchaseOrders([]);
    }
  };

  const loadPayments = async () => {
    try {
      if (id) {
        const response = await paymentsMadeAPI.getByBill(id);
        if (response && response.success && response.data) {
          setPayments(
            Array.isArray(response.data)
              ? response.data.map((payment: any) => normalizePaymentRecord(payment))
              : []
          );
        } else {
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      setPayments([]);
    }
  };

  const loadBill = async () => {
    if (!bill) {
      setIsBillLoading(true);
    }
    try {
      if (!id || id === 'undefined' || id === 'null') {
        setBill(null);
        return;
      }

      const response = await billsAPI.getById(id);
      if (response && response.success && response.data) {
        const billData = response.data;
        const transformedBill: Bill = {
          id: billData._id || billData.id,
          billNumber: billData.billNumber,
          vendorName: billData.vendorName || billData.vendor?.displayName || '',
          vendorAddress: billData.vendor?.billingAddress?.street || '',
          vendorCity: billData.vendor?.billingAddress?.city || '',
          vendorCountry: billData.vendor?.billingAddress?.country || '',
          vendorEmail: billData.vendor?.email || '',
          billDate: billData.date,
          dueDate: billData.dueDate,
          referenceNumber: billData.referenceNumber || '',
          orderNumber: billData.orderNumber || '',
          paymentTerms: billData.paymentTerms || '',
          subject: billData.subject || '',
          items: (billData.items || []).map((item: any, index: number) => ({
            id: item._id || `item-${index}`,
            item: item.item?._id || item.item,
            itemId: item.item?._id || item.item,
            name: item.name || item.item?.name || item.itemDetails || item.description || '',
            description: item.description || '',
            itemDetails: item.description || item.name || item.itemDetails || '',
            account: item.account || '',
            quantity: item.quantity || 0,
            rate: item.unitPrice || item.rate || 0,
            tax: item.tax || item.taxRate || '',
            amount: item.total || item.amount || 0,
            sku: item.sku || item.item?.sku || '',
            unit: item.unit || item.item?.unit || '',
            stockQuantity: item.item?.stockQuantity || item.stockQuantity || 0,
            trackInventory: item.item?.trackInventory ?? item.trackInventory ?? false,
          })),
          subTotal: billData.subtotal || billData.subTotal || 0,
          discountAmount: billData.discount || 0,
          total: billData.total || 0,
          balanceDue: billData.balance !== undefined ? billData.balance : (billData.total || 0),
          currency: billData.currency || resolvedBaseCurrency,
          status: billData.status || 'draft',
          accountsPayable: billData.accountsPayable || '',
          purchaseOrderId: billData.purchaseOrderId || billData.purchaseOrder,
          vendorId: toEntityId(billData.vendor || billData.vendorId || billData.vendor_id),
          paidAmount: billData.paidAmount || 0,
          comments: Array.isArray(billData.comments) ? billData.comments : [],
          attachments: Array.isArray(billData.attachments) ? billData.attachments : [],
        };

        setBill(transformedBill);
        if (transformedBill.purchaseOrderId) {
          loadPurchaseOrders(transformedBill.purchaseOrderId);
        }
      } else {
        setBill(null);
      }
    } catch (error) {
      console.error('Error loading bill:', error);
      setBill(null);
    } finally {
      setIsBillLoading(false);
    }
  };

  useEffect(() => {
    loadBillsList();
    loadBill();
    loadPayments();
  }, [id]);

  // Load paid through accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [chartAccountsResponse, bankAccountsResponse] = await Promise.all([
          chartOfAccountsAPI.getAccounts({ isActive: true, limit: 1000 }),
          bankAccountsAPI.getAll({ limit: 1000 }),
        ]);
        const paidThroughTypes = [
          'bank',
          'cash',
          'mobile_wallet',
          'credit_card',
          'other_current_liability',
          'equity',
          'other_current_asset'
        ];
        const mergedAccounts = mergeAccountOptions(
          getChartAccountsFromResponse(chartAccountsResponse),
          getBankAccountsFromResponse(bankAccountsResponse)
        );
        const filtered = mergedAccounts.filter((acc: any) =>
          paidThroughTypes.includes(String(acc.accountType || "").toLowerCase())
        );
        const transformed = filtered.map((acc: any) => ({
          ...acc,
          name: getAccountOptionLabel(acc)
        }));
        setPaidThroughAccounts(transformed);
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    if (paidThroughAccounts.length === 0) return;
    setPaymentFormData(prev => {
      if (prev.paidThrough || prev.paidThroughId) return prev;
      const defaultAccount =
        paidThroughAccounts.find((acc: any) => String(acc.name || "").toLowerCase() === "petty cash") ||
        paidThroughAccounts.find((acc: any) => String(acc.accountType || "").toLowerCase() === "cash") ||
        paidThroughAccounts[0];
      return {
        ...prev,
        paidThrough: defaultAccount?.name || "",
        paidThroughId: defaultAccount?._id || defaultAccount?.id || "",
      };
    });
  }, [paidThroughAccounts]);

  useEffect(() => {
    if (bill && bill.id) {
      loadPayments();
    }
  }, [bill?.id]);

  useEffect(() => {
    const refreshData = async () => {
      const response = await billsAPI.getAll();
      if (response && response.success && response.data) {
        setBills(response.data.map((b: any) => ({
          id: b._id || b.id,
          billNumber: b.billNumber,
          vendorName: b.vendorName || b.vendor?.displayName || "",
          billDate: b.date,
          dueDate: b.dueDate,
          total: b.total || 0,
          balance: b.balance !== undefined ? b.balance : b.total,
          currency: b.currency || resolvedBaseCurrency,
          status: b.status || "DRAFT"
        })));
      }

      if (id && id !== 'undefined' && id !== 'null') {
        try {
          const billRes = await billsAPI.getById(id);
          if (billRes && billRes.success && billRes.data) {
            const billData = billRes.data;
            const transformedBill: Bill = {
              id: billData._id || billData.id,
              billNumber: billData.billNumber,
              vendorName: billData.vendorName || billData.vendor?.displayName || '',
              vendorAddress: billData.vendor?.billingAddress?.street || '',
              vendorCity: billData.vendor?.billingAddress?.city || '',
              vendorCountry: billData.vendor?.billingAddress?.country || '',
              vendorEmail: billData.vendor?.email || '',
              billDate: billData.date,
              dueDate: billData.dueDate,
              referenceNumber: billData.referenceNumber || '',
              orderNumber: billData.orderNumber || '',
              paymentTerms: billData.paymentTerms || '',
              subject: billData.subject || '',
              items: (billData.items || []).map((item: any, index: number) => ({
                id: item._id || `item-${index}`,
                item: item.item?._id || item.item,
                itemId: item.item?._id || item.item,
                name: item.name || item.item?.name || item.itemDetails || item.description || '',
                description: item.description || '',
                itemDetails: item.description || item.name || item.itemDetails || '',
                account: item.account || '',
                quantity: item.quantity || 0,
                rate: item.unitPrice || item.rate || 0,
                tax: item.tax || item.taxRate || '',
                amount: item.total || item.amount || 0,
                sku: item.sku || item.item?.sku || '',
                unit: item.unit || item.item?.unit || '',
                stockQuantity: item.item?.stockQuantity || item.stockQuantity || 0,
                trackInventory: item.item?.trackInventory ?? item.trackInventory ?? false,
              })),
              subTotal: billData.subtotal || billData.subTotal || 0,
              discountAmount: billData.discount || 0,
              total: billData.total || 0,
              balanceDue: billData.balance !== undefined ? billData.balance : (billData.total || 0),
              currency: billData.currency || resolvedBaseCurrency,
              status: billData.status || 'draft',
              accountsPayable: billData.accountsPayable || '',
              purchaseOrderId: billData.purchaseOrderId || billData.purchaseOrder
            };
            setBill(transformedBill);

            // Load purchase orders if purchaseOrderId exists
            if (transformedBill.purchaseOrderId) {
              loadPurchaseOrders(transformedBill.purchaseOrderId);
            } else {
              setPurchaseOrders([]);
            }
          } else {
            setBill(null);
            setPurchaseOrders([]);
          }
        } catch (error) {
          console.error("Error refreshing bill:", error);
          setBill(null);
          setPurchaseOrders([]);
        }
      }
    };

    // Listen for updates
    const handleBillsUpdate = () => {
      refreshData();
    };

    window.addEventListener("billsUpdated", handleBillsUpdate);
    window.addEventListener("paymentsUpdated", handleBillsUpdate);
    window.addEventListener("storage", handleBillsUpdate);
    window.addEventListener("focus", handleBillsUpdate);

    return () => {
      window.removeEventListener("billsUpdated", handleBillsUpdate);
      window.removeEventListener("paymentsUpdated", handleBillsUpdate);
      window.removeEventListener("storage", handleBillsUpdate);
      window.removeEventListener("focus", handleBillsUpdate);
    };
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(event.target as Node)) {
        setPdfMenuOpen(false);
      }
      if (sidebarMoreMenuRef.current && !sidebarMoreMenuRef.current.contains(event.target as Node)) {
        setSidebarMoreMenuOpen(false);
      }
      if (moreActionsMenuRef.current && !moreActionsMenuRef.current.contains(event.target as Node)) {
        setMoreActionsMenuOpen(false);
      }
    };

    if (dropdownOpen || moreMenuOpen || pdfMenuOpen || sidebarMoreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, moreMenuOpen, pdfMenuOpen, sidebarMoreMenuOpen, isBulkActionsDropdownOpen]);

  useEffect(() => {
    return () => {
      if (printPreviewUrlRef.current) {
        URL.revokeObjectURL(printPreviewUrlRef.current);
        printPreviewUrlRef.current = "";
      }
    };
  }, []);


  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return "";
    }
  };

  const formatDateShort = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
    } catch (e) {
      return "";
    }
  };

  // Calculate overdue days
  const calculateOverdueDays = (dueDate: string | undefined) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const toFiniteNumber = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toEntityId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return String(value._id || value.id || "");
    return "";
  };

  const toISODate = (value: any) => {
    if (!value) return new Date().toISOString().split("T")[0];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
    return parsed.toISOString().split("T")[0];
  };

  const getNextBillNumber = async () => {
    const seriesResponse = await transactionNumberSeriesAPI.getAll();
    if (!seriesResponse || (!seriesResponse.success && seriesResponse.code !== 0)) {
      return "";
    }

    const allSeries = Array.isArray(seriesResponse.data) ? seriesResponse.data : [];
    const billSeries = allSeries.find((series: any) => {
      const moduleName = String(series?.module || "").toLowerCase();
      return moduleName === "bill" || moduleName === "bills";
    });

    if (!billSeries?._id) return "";

    const nextNumberResponse = await transactionNumberSeriesAPI.getNextNumber(billSeries._id);
    if (!nextNumberResponse || (!nextNumberResponse.success && nextNumberResponse.code !== 0)) {
      return "";
    }

    return String(nextNumberResponse?.data?.number || nextNumberResponse?.number || "").trim();
  };

  const getFallbackBillNumber = (value: any) => {
    const source = String(value || "").trim();
    const matched = source.match(/^(.*?)(\d+)([^0-9]*)$/);

    if (matched) {
      const [, prefix, digits, suffix] = matched;
      const incremented = String(Number.parseInt(digits, 10) + 1).padStart(digits.length, "0");
      return `${prefix}${incremented}${suffix}`;
    }

    const uniqueSuffix = `${Date.now()}`.slice(-8);
    return source ? `${source}-${uniqueSuffix}` : `BILL-${uniqueSuffix}`;
  };

  const isDuplicateBillNumberError = (message: string) =>
    /duplicate|already exists|bill number/i.test(String(message || ""));

  const handleClone = async () => {
    setMoreMenuOpen(false);
    if (!bill) return;

    try {
      const sourceId = String((bill as any)._id || bill.id || id || "");
      if (!sourceId) {
        toast.error("Cannot clone this bill because it has no ID.");
        return;
      }

      const sourceResponse = await billsAPI.getById(sourceId);
      const sourceBill = sourceResponse?.data || sourceResponse?.bill || sourceResponse;
      if (!sourceBill) {
        throw new Error("Could not load bill details for cloning.");
      }

      const vendorId = toEntityId(sourceBill.vendor || sourceBill.vendorId || sourceBill.vendor_id || bill.vendorId);
      if (!vendorId) {
        throw new Error("Cannot clone this bill because it has no vendor.");
      }

      let nextBillNumber = await getNextBillNumber();
      if (!nextBillNumber) {
        nextBillNumber = getFallbackBillNumber(sourceBill.billNumber || sourceBill.bill_number || bill.billNumber);
      }

      const sourceItems = Array.isArray(sourceBill.items) ? sourceBill.items : [];
      const clonedItems = sourceItems.map((item: any) => {
        const quantity = Math.max(1, toFiniteNumber(item?.quantity, 1));
        const unitPrice = toFiniteNumber(item?.unitPrice ?? item?.rate ?? item?.price, 0);
        const lineTotal = toFiniteNumber(item?.total ?? item?.amount, quantity * unitPrice);
        const itemId = toEntityId(item?.item || item?.itemId);
        const account =
          typeof item?.account === "object"
            ? toEntityId(item?.account)
            : String(item?.account || "");

        return {
          item: itemId || undefined,
          account: account || undefined,
          name: item?.name || item?.itemDetails || item?.description || "Item",
          description: item?.description || item?.itemDetails || item?.name || "",
          quantity,
          unitPrice,
          taxRate: toFiniteNumber(item?.taxRate ?? item?.tax, 0),
          taxAmount: toFiniteNumber(item?.taxAmount, 0),
          total: lineTotal,
        };
      });

      const subtotal = toFiniteNumber(sourceBill.subtotal ?? sourceBill.subTotal ?? sourceBill.sub_total);
      const tax = toFiniteNumber(sourceBill.tax ?? sourceBill.taxAmount);
      const discount = toFiniteNumber(sourceBill.discount ?? sourceBill.discountAmount);
      const totalFromSource = toFiniteNumber(sourceBill.total ?? sourceBill.amount);
      const computedTotal = subtotal - discount + tax;
      const total = totalFromSource > 0 ? totalFromSource : Math.max(0, computedTotal);

      const clonePayload = {
        billNumber: nextBillNumber,
        orderNumber: sourceBill.orderNumber || sourceBill.order_number || "",
        referenceNumber: sourceBill.referenceNumber || sourceBill.reference_number || "",
        vendor: vendorId,
        vendorName:
          sourceBill.vendorName
          || sourceBill.vendor_name
          || sourceBill.vendor?.displayName
          || sourceBill.vendor?.name
          || bill.vendorName
          || "",
        date: toISODate(sourceBill.date || sourceBill.billDate),
        dueDate: toISODate(sourceBill.dueDate || sourceBill.date || sourceBill.billDate),
        items: clonedItems,
        subtotal,
        tax,
        discount,
        total,
        status: "draft",
        paymentTerms: sourceBill.paymentTerms || sourceBill.payment_terms || bill.paymentTerms || "Due on Receipt",
        accountsPayable: sourceBill.accountsPayable || sourceBill.accounts_payable || bill.accountsPayable || "Accounts Payable",
        notes: sourceBill.notes || "",
        terms: sourceBill.terms || "",
        currency: sourceBill.currency || bill.currency || resolvedBaseCurrency,
        purchaseOrderId: null,
        paidAmount: 0,
        vendorCreditsApplied: 0,
        balance: total,
      };

      let cloneResponse: any = null;
      let currentBillNumber = String(clonePayload.billNumber || "").trim();
      let lastErrorMessage = "";

      for (let attempt = 0; attempt < 3; attempt += 1) {
        cloneResponse = await billsAPI.create({ ...clonePayload, billNumber: currentBillNumber });
        if (cloneResponse && (cloneResponse.success || cloneResponse.code === 0)) {
          break;
        }

        lastErrorMessage = String(cloneResponse?.message || cloneResponse?.error || "");
        const shouldRetryWithNewNumber =
          isDuplicateBillNumberError(lastErrorMessage)
          || /generate bill number|number series|numbering/i.test(lastErrorMessage);

        if (!shouldRetryWithNewNumber) {
          break;
        }

        currentBillNumber = getFallbackBillNumber(`${currentBillNumber || sourceBill.billNumber || "BILL"}-${attempt + 1}`);
      }

      if (!cloneResponse || (!cloneResponse.success && cloneResponse.code !== 0)) {
        throw new Error(lastErrorMessage || cloneResponse?.message || "Failed to clone bill.");
      }

      const clonedBillId =
        cloneResponse?.data?._id
        || cloneResponse?.data?.id
        || cloneResponse?.bill?._id
        || cloneResponse?.bill?.id;

      window.dispatchEvent(new Event("billsUpdated"));

      if (clonedBillId) {
        toast.success("Bill cloned successfully");
        navigate(`/purchases/bills/${clonedBillId}`);
        return;
      }

      toast.success("Bill cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning bill:", error);
      toast.error(error?.message || "Failed to clone bill.");
    }
  };


  // Handle Void
  const handleVoid = async () => {
    if (!bill) return;
    if (window.confirm("Are you sure you want to void this bill? This action cannot be undone.")) {
      try {
        const response = await billsAPI.update(bill.id, { status: "void" });
        if (response && (response.code === 0 || response.success)) {
          toast.success("Bill voided successfully");
          // Refresh data
          await Promise.all([loadBill(), loadBillsList(), loadPayments()]);
        } else {
          toast.error("Failed to void bill: " + (response.message || "Unknown error"));
        }
      } catch (error) {
        console.error("Error voiding bill:", error);
        toast.error("An error occurred while voiding the bill.");
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!bill) return;
    setPdfMenuOpen(false);

    if (!billDocumentRef.current) {
      setShowPdfView(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const target = billDocumentRef.current;
    if (!target) {
      toast.error("Unable to generate PDF preview.");
      return;
    }

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0.01) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      const fileName = String(bill.billNumber || bill.id || "bill").replace(/[^a-z0-9-]/gi, "_");
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("Error generating bill PDF:", error);
      toast.error("Failed to generate PDF.");
    }
  };

  const handlePrintBill = async () => {
    if (!bill) return;
    if (isGeneratingPrintPreviewRef.current) return;
    isGeneratingPrintPreviewRef.current = true;
    setPdfMenuOpen(false);

    if (!billDocumentRef.current) {
      setShowPdfView(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const target = billDocumentRef.current;
    if (!target) {
      toast.error("Unable to open print preview.");
      return;
    }

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0.01) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);

      if (printPreviewUrlRef.current) {
        URL.revokeObjectURL(printPreviewUrlRef.current);
      }
      printPreviewUrlRef.current = url;
      setPrintPreviewUrl(url);
      setIsPrintPreviewOpen(true);
    } catch (error) {
      console.error("Error creating print preview:", error);
      toast.error("Failed to generate print preview.");
    } finally {
      isGeneratingPrintPreviewRef.current = false;
    }
  };

  const handleClosePrintPreview = () => {
    setIsPrintPreviewOpen(false);
    if (printPreviewUrlRef.current) {
      URL.revokeObjectURL(printPreviewUrlRef.current);
      printPreviewUrlRef.current = "";
      setPrintPreviewUrl("");
    }
  };

  const handlePrintFromPreview = () => {
    const frameWindow = printPreviewFrameRef.current?.contentWindow;
    if (!frameWindow) {
      toast.error("Print preview is not ready yet.");
      return;
    }
    frameWindow.focus();
    toast("Use the printer icon in the preview toolbar to print.");
  };

  const handleExpectedPaymentDate = async () => {
    if (!bill) return;
    const defaultDate = toISODate((bill as any).expectedPaymentDate || bill.dueDate || bill.billDate);
    const enteredDate = window.prompt("Enter expected payment date (YYYY-MM-DD)", defaultDate);
    if (!enteredDate) return;
    const normalizedDate = toISODate(enteredDate);

    try {
      await persistBillPatch({ expectedPaymentDate: normalizedDate });
      toast.success("Expected payment date updated.");
    } catch (error: any) {
      console.error("Error updating expected payment date:", error);
      toast.error(error?.message || "Failed to update expected payment date.");
    }
  };

  const handleCreateVendorCredits = () => {
    if (!bill) return;
    navigate("/purchases/vendor-credits/new", {
      state: {
        vendorId: bill.vendorId,
        vendorName: bill.vendorName,
        billId: getBillId(),
        billNumber: bill.billNumber,
        amount: bill.balanceDue || bill.total || 0,
        sourceBill: bill,
      },
    });
  };

  const handleViewJournal = () => {
    if (!showPdfView) {
      setShowPdfView(true);
      setTimeout(() => {
        journalSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
      return;
    }
    journalSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getBillId = () => String((bill as any)?._id || bill?.id || id || "");

  const persistBillPatch = async (patch: Record<string, any>) => {
    const billId = getBillId();
    if (!billId) throw new Error("Bill ID is missing.");
    const response = await billsAPI.update(billId, patch);
    const updated = response?.data || response?.bill || response;
    if (updated && typeof updated === "object") {
      setBill((prev: any) => ({ ...(prev || {}), ...updated }));
    }
    window.dispatchEvent(new Event("billsUpdated"));
  };

  const handleAddBillComment = async () => {
    if (!bill) return;
    const text = window.prompt("Enter comment");
    if (!String(text || "").trim()) return;

    try {
      const existing = Array.isArray(bill.comments) ? bill.comments : [];
      const comments = [
        ...existing,
        {
          id: `${Date.now()}`,
          text: String(text).trim(),
          author: "User",
          createdAt: new Date().toISOString(),
        },
      ];
      await persistBillPatch({ comments });
      toast.success("Comment saved");
    } catch (error: any) {
      console.error("Error saving bill comment:", error);
      toast.error(error?.message || "Failed to save comment");
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBillAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!bill) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const existing = Array.isArray(bill.attachments) ? bill.attachments : [];
      const attachments = await Promise.all(
        files.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          url: await readFileAsDataUrl(file),
          uploadedAt: new Date().toISOString(),
        }))
      );
      await persistBillPatch({ attachments: [...existing, ...attachments] });
      toast.success("Attachment uploaded");
    } catch (error: any) {
      console.error("Error uploading bill attachment:", error);
      toast.error(error?.message || "Failed to upload attachment");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const viewFilteredBills = bills.filter((b: Bill) => {
    const status = String(b.status || "").toLowerCase();
    const statusDisplay = getBillStatusDisplay(b).text.toLowerCase();

    switch (selectedSidebarView) {
      case "Draft":
        return status === "draft";
      case "Pending Approval":
        return status.includes("pending");
      case "Open":
        return status === "open" || statusDisplay.startsWith("due");
      case "Overdue":
        return statusDisplay.startsWith("overdue");
      case "Unpaid":
        return status !== "paid" && !statusDisplay.includes("partially paid") && !statusDisplay.startsWith("overdue") && status !== "void";
      case "Partially Paid":
        return statusDisplay.includes("partially paid");
      case "Paid":
        return status === "paid" || statusDisplay === "paid";
      case "Void":
        return status === "void" || status === "cancelled";
      default:
        return true;
    }
  });

  const filteredBills = [...viewFilteredBills].sort((a: Bill, b: Bill) => {
    let aValue: string | number = "";
    let bValue: string | number = "";

    switch (sidebarSortBy) {
      case "billDate":
        aValue = a.billDate ? new Date(a.billDate).getTime() : 0;
        bValue = b.billDate ? new Date(b.billDate).getTime() : 0;
        break;
      case "billNumber":
        aValue = String(a.billNumber || "").toLowerCase();
        bValue = String(b.billNumber || "").toLowerCase();
        break;
      case "vendorName":
        aValue = String(a.vendorName || "").toLowerCase();
        bValue = String(b.vendorName || "").toLowerCase();
        break;
      case "amount":
        aValue = toFiniteNumber(a.total, 0);
        bValue = toFiniteNumber(b.total, 0);
        break;
      case "dueDate":
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        break;
      case "status":
        aValue = getBillStatusDisplay(a).text.toLowerCase();
        bValue = getBillStatusDisplay(b).text.toLowerCase();
        break;
      default:
        return 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sidebarSortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return sidebarSortOrder === "asc"
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  // Bill selection handlers
  const handleBillCheckboxChange = (billId: string | number, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSelectedBills(prev => {
      if (prev.includes(billId)) {
        return prev.filter(id => id !== billId);
      } else {
        return [...prev, billId];
      }
    });
  };

  const handleSelectAllBills = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBills(filteredBills.map(b => b.id));
    } else {
      setSelectedBills([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedBills([]);
  };

  const handleSidebarRefresh = async () => {
    await Promise.all([loadBillsList(), loadBill(), loadPayments()]);
    toast.success("Bill list refreshed");
  };

  const downloadSampleFile = (type: "csv" | "xls") => {
    const headers = [
      "Vendor Name", "Bill#", "Reference#", "Order#", "Date", "Due Date",
      "Payment Terms", "Currency", "Item Name", "Item Description",
      "Quantity", "Rate", "Account", "Tax Rate"
    ];
    const sampleData = [
      ["John Doe", "BILL-001", "REF-001", "PO-001", "2024-01-01", "2024-01-15", "Net 15", resolvedBaseCurrency, "Consulting", "Work for Jan", "10", "150", "Professional Services", "0%"],
      ["Jane Smith", "BILL-002", "REF-002", "PO-002", "2024-01-05", "2024-01-20", "Net 15", resolvedBaseCurrency, "Software", "License fee", "1", "1200", "Software Subscriptions", "5%"]
    ];

    const content = type === "csv"
      ? [headers, ...sampleData].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
      : [headers, ...sampleData].map((row) => row.join("\t")).join("\n");
    const mimeType = type === "csv" ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel;charset=utf-8;";

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bills_sample.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Calculate payments total
  const paymentsTotal = payments.reduce((sum, payment) => {
    return sum + toFiniteNumber(payment.amount);
  }, 0);

  // Get currency
  const currency = resolvedBaseCurrencySymbol;

  if (isBillLoading) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p>Loading bill...</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p>Bill not found</p>
        <button onClick={() => navigate("/purchases/bills")}>
          Back to Bills
        </button>
      </div>
    );
  }

  const billStatusText = getBillStatusDisplay(bill).text;
  const billBalanceDue = toFiniteNumber(bill.balanceDue ?? bill.total, 0);
  const isBillPaid = billStatusText === "PAID" || billBalanceDue <= 0;
  const isBillUnpaid = !isBillPaid;
  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = e.target.checked;
    setPaymentFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePaymentSubmit = async (status: 'draft' | 'paid') => {
    if (!bill) return;
    if (!paymentFormData.paymentAmount) {
      toast.error("Please enter a payment amount.");
      return;
    }
    if (!paymentFormData.paymentMadeOn) {
      toast.error("Please select Payment Made on.");
      return;
    }

    const vendorId = toEntityId((bill as any).vendorId || (bill as any).vendor || (bill as any).vendor_id);
    const billId = toEntityId((bill as any)._id || bill.id || id);

    if (!vendorId) {
      toast.error("This bill is missing a vendor. Please reload the page and try again.");
      return;
    }

    if (!billId) {
      toast.error("This bill is missing an ID. Please reload the page and try again.");
      return;
    }

    try {
      const paymentData = {
        vendorId,
        vendor: vendorId,
        vendorName: bill.vendorName,
        paymentNumber: paymentFormData.paymentNumber,
        date: paymentFormData.paymentDate,
        amount: parseFloat(paymentFormData.paymentAmount) || 0,
        currency: resolvedBaseCurrency,
        location: paymentFormData.location,
        bankCharges: parseFloat(paymentFormData.bankCharges) || 0,
        mode: paymentFormData.paymentMode,
        paidThrough: paymentFormData.paidThroughId || paymentFormData.paidThrough,
        reference: paymentFormData.reference,
        notes: paymentFormData.notes,
        status: status === "paid" ? "PAID" : "DRAFT",
        allocations: [{
          billId,
          amount: parseFloat(paymentFormData.paymentAmount) || 0
        }]
      };

      const response = await paymentsMadeAPI.create(paymentData);
      if (response && (response.code === 0 || response.success)) {
        toast.success("Payment recorded successfully");
        setIsRecordingPayment(false);
        // Refresh payments list
        loadPayments();
        // Refresh bill data
        if (id) {
          const billRes = await billsAPI.getById(id);
          if (billRes && billRes.success) {
            const billData = billRes.data;
            const transformedBill: Bill = {
              id: billData._id || billData.id,
              billNumber: billData.billNumber,
              vendorName: billData.vendorName || billData.vendor?.displayName || '',
              vendorAddress: billData.vendor?.billingAddress?.street || '',
              vendorCity: billData.vendor?.billingAddress?.city || '',
              vendorCountry: billData.vendor?.billingAddress?.country || '',
              vendorEmail: billData.vendor?.email || '',
              billDate: billData.date,
              dueDate: billData.dueDate,
              referenceNumber: billData.referenceNumber || '',
              orderNumber: billData.orderNumber || '',
              paymentTerms: billData.paymentTerms || '',
              subject: billData.subject || '',
              items: (billData.items || []).map((item: any, index: number) => ({
                id: item._id || `item-${index}`,
                item: item.item?._id || item.item,
                itemId: item.item?._id || item.item,
                name: item.name || item.item?.name || item.itemDetails || item.description || '',
                description: item.description || '',
                itemDetails: item.description || item.name || item.itemDetails || '',
                account: item.account || '',
                quantity: item.quantity || 0,
                rate: item.unitPrice || item.rate || 0,
                tax: item.tax || item.taxRate || '',
                amount: item.total || item.amount || 0,
                sku: item.sku || item.item?.sku || '',
                unit: item.unit || item.item?.unit || '',
                stockQuantity: item.item?.stockQuantity || item.stockQuantity || 0,
                trackInventory: item.item?.trackInventory ?? item.trackInventory ?? false,
              })),
              subTotal: billData.subtotal || billData.subTotal || 0,
              discountAmount: billData.discount || 0,
              total: billData.total || 0,
              balanceDue: billData.balance || billData.total || 0,
              currency: billData.currency || resolvedBaseCurrency,
              status: billData.status || 'draft',
              accountsPayable: billData.accountsPayable || '',
              purchaseOrderId: billData.purchaseOrderId || billData.purchaseOrder,
              vendorId: toEntityId(billData.vendor || billData.vendorId || billData.vendor_id)
            };
            setBill(transformedBill);
          }
        }
        window.dispatchEvent(new Event("paymentsUpdated"));
        window.dispatchEvent(new Event("billsUpdated"));
        window.dispatchEvent(new Event("vendorSaved"));
      } else {
        toast.error(response?.message || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("An error occurred while saving the payment.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (uploadedFiles.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 files.");
      return;
    }
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setAttachmentMenuOpen(false);
  };

  const triggerAttachmentUpload = () => {
    fileInputRef.current?.click();
    setAttachmentMenuOpen(false);
  };

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      position: "relative",
    },
    sidebar: {
      width: isSidebarCollapsed ? "0px" : "320px",
      borderRight: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.3s ease",
      overflow: "hidden",
    },
    sidebarHeader: {
      padding: "16px",
      borderBottom: "1px solid #e5e7eb",
      position: "relative",
    },
    searchBar: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      backgroundColor: "#f9fafb",
      borderRadius: "6px",
      marginBottom: "12px",
      border: "1px solid #e5e7eb",
    },
    searchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      backgroundColor: "transparent",
      fontSize: "14px",
      color: "#111827",
    },
    sidebarTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sidebarActions: {
      display: "flex",
      gap: "4px",
    },
    sidebarButton: {
      padding: "6px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    sidebarDropdownMenu: {
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
      zIndex: 20,
      minWidth: "250px",
      maxHeight: "370px",
      overflowY: "auto",
    },
    sidebarDropdownItem: {
      padding: "10px 14px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      borderBottom: "1px solid #f3f4f6",
    },
    sidebarMoreMenu: {
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
      zIndex: 20,
      minWidth: "170px",
      overflow: "visible",
    },
    sidebarSubmenuPanel: {
      position: "absolute",
      left: "100%",
      top: 0,
      marginLeft: "6px",
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
      minWidth: "200px",
      zIndex: 30,
      padding: "4px 0",
    },
    sidebarMoreButton: {
      padding: "6px",
      backgroundColor: "transparent",
      color: "#6b7280",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    sidebarList: {
      flex: 1,
      overflowY: "auto",
    },
    sidebarItem: {
      padding: "16px",
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
      backgroundColor: "transparent",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    sidebarItemActive: {
      backgroundColor: "#f3f8ff",
      borderLeft: "3px solid #156372",
    },
    sidebarItemContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    sidebarItemVendor: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#111827",
    },
    sidebarItemNumber: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "2px",
    },
    sidebarItemStatus: {
      fontSize: "12px",
      fontWeight: "600",
      marginTop: "8px",
      textTransform: "uppercase",
    },
    sidebarItemAmount: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#111827",
      textAlign: "right",
    },
    mainContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    },
    header: {
      padding: "12px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
    },
    headerTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
    },
    headerActions: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      color: "#6b7280",
    },
    headerIconButton: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      border: "none",
      background: "transparent",
      color: "inherit",
      cursor: "pointer",
    },
    toolbar: {
      padding: "8px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#f9fafb",
    },
    toolbarLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    toolbarButton: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      fontSize: "13px",
      color: "#374151",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    recordPaymentBtn: {
      backgroundColor: "#ffffff",
      color: "#156372",
      border: "1px solid #156372",
    },
    bannerRecordPaymentBtn: {
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      border: "none",
    },
    tabsContainer: {
      display: "flex",
      padding: "0 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    tabItem: {
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      cursor: "pointer",
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tabItemActive: {
      color: "#156372",
      borderBottom: "2px solid #156372",
    },
    tabBadge: {
      padding: "2px 6px",
      fontSize: "11px",
      backgroundColor: "#f3f4f6",
      color: "#6b7280",
      borderRadius: "10px",
    },
    tabBadgeActive: {
      backgroundColor: "#eff6ff",
      color: "#156372",
    },
    banner: {
      margin: "16px 24px",
      padding: "12px 16px",
      backgroundColor: "#f0f7ff",
      border: "1px solid #e0f2fe",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    bannerText: {
      fontSize: "13px",
      color: "#0369a1",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    contentArea: {
      flex: 1,
      overflowY: "auto",
      padding: "32px 24px",
      backgroundColor: "#ffffff",
    },
    pdfControls: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: "16px",
    },
    billDocument: {
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "64px",
      maxWidth: "850px",
      margin: "0 auto",
      position: "relative",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    ribbon: {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100px",
      height: "100px",
      overflow: "hidden",
      zIndex: 1,
    },
    ribbonText: {
      position: "absolute",
      display: "block",
      width: "160px",
      padding: "8px 0",
      backgroundColor: "#f97316",
      boxShadow: "0 5px 10px rgba(0,0,0,.1)",
      color: "#fff",
      fontSize: "13px",
      fontWeight: "700",
      textShadow: "0 1px 1px rgba(0,0,0,.2)",
      textTransform: "uppercase",
      textAlign: "center",
      left: "-35px",
      top: "25px",
      transform: "rotate(-45deg)",
    },
    docHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "48px",
    },
    docHeaderRight: {
      textAlign: "right",
    },
    billType: {
      fontSize: "32px",
      fontWeight: "400",
      color: "#6b7280",
      letterSpacing: "2px",
    },
    billNo: {
      fontSize: "14px",
      color: "#111827",
      marginTop: "8px",
    },
    balanceDueSection: {
      marginTop: "24px",
      textAlign: "right",
    },
    balanceDueLabel: {
      fontSize: "12px",
      color: "#6b7280",
      textTransform: "uppercase",
      fontWeight: "600",
    },
    balanceDueValue: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#111827",
      marginTop: "4px",
    },
    docBody: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "48px",
    },
    billFromLabel: {
      fontSize: "12px",
      fontWeight: "700",
      color: "#f59e0b",
      textTransform: "uppercase",
      marginBottom: "8px",
    },
    vendorName: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#156372",
      textDecoration: "none",
    },
    vendorAddress: {
      fontSize: "13px",
      color: "#4b5563",
      marginTop: "4px",
      lineHeight: "1.5",
    },
    docDetailsList: {
      display: "grid",
      gridTemplateColumns: "150px 150px",
      gap: "12px 24px",
      fontSize: "13px",
    },
    detailLabel: {
      color: "#6b7280",
      textAlign: "right",
    },
    detailValue: {
      color: "#111827",
      fontWeight: "500",
    },
    itemsTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "32px",
    },
    itemsTableHeader: {
      backgroundColor: "#374151",
    },
    itemsTableHeaderCell: {
      padding: "10px 12px",
      textAlign: "left",
      color: "#ffffff",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
    },
    itemsTableRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    itemsTableCell: {
      padding: "12px",
      fontSize: "13px",
      color: "#111827",
    },
    docSummary: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      marginTop: "24px",
    },
    summaryRow: {
      display: "grid",
      gridTemplateColumns: "140px 120px",
      gap: "12px",
      fontSize: "13px",
      marginBottom: "8px",
      padding: "2px 0",
    },
    summaryTotal: {
      marginTop: "8px",
      fontWeight: "700",
      fontSize: "14px",
    },
    paymentsMadeRow: {
      color: "#156372",
    },
    finalBalanceDue: {
      marginTop: "12px",
      padding: "10px 16px",
      backgroundColor: "#f3f4f6",
      borderLeft: "none",
      fontWeight: "700",
      fontSize: "14px",
      display: "grid",
      gridTemplateColumns: "140px 120px",
      gap: "12px",
    },
    journalSection: {
      marginTop: "64px",
      paddingTop: "0",
    },
    journalHeader: {
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "16px",
      paddingBottom: "8px",
    },
    journalTitle: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#374151",
      position: "relative",
      paddingBottom: "6px",
    },
    journalTitleActive: {
      borderBottom: "2px solid #156372",
      color: "#111827",
    },
    journalCurrencyBadge: {
      padding: "2px 6px",
      backgroundColor: "#22c55e",
      color: "#ffffff",
      fontSize: "11px",
      fontWeight: "700",
      borderRadius: "2px",
      marginLeft: "8px",
      verticalAlign: "middle",
    },
    journalSubtitle: {
      fontSize: "16px",
      fontWeight: "700",
      color: "#111827",
      margin: "16px 0",
    },
    journalTable: {
      width: "100%",
      borderCollapse: "collapse",
    },
    journalTableHeaderCell: {
      padding: "8px 0",
      textAlign: "left",
      fontSize: "11px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase",
      borderBottom: "1px solid #e5e7eb",
    },
    journalTableCell: {
      padding: "12px 0",
      fontSize: "13px",
      color: "#374151",
      borderBottom: "1px solid #f3f4f6",
    },
    paymentForm: {
      padding: '0',
      background: 'transparent',
      border: 'none',
      borderRadius: '0',
      boxShadow: 'none',
      maxWidth: 'none',
      width: '100%',
    },
    paymentFormHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      marginBottom: '24px',
      paddingBottom: '18px',
      borderBottom: '1px solid #e6edf5',
    },
    paymentFormTitleWrap: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    },
    paymentFormEyebrow: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: '#156372',
    },
    paymentFormTitle: {
      fontSize: '30px',
      fontWeight: 700,
      color: '#0f172a',
      margin: 0,
      lineHeight: 1.15,
    },
    paymentFormHint: {
      fontSize: '13px',
      color: '#64748b',
      maxWidth: '480px',
      lineHeight: 1.5,
    },
    paymentSummaryBadge: {
      minWidth: '180px',
      padding: '14px 16px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #156372 0%, #0f4e5a 100%)',
      color: '#ffffff',
      boxShadow: '0 14px 32px rgba(21, 99, 114, 0.22)',
    },
    paymentSummaryLabel: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      opacity: 0.8,
      marginBottom: '8px',
    },
    paymentSummaryValue: {
      fontSize: '28px',
      fontWeight: 700,
      lineHeight: 1,
    },
    paymentSummarySubtext: {
      marginTop: '8px',
      fontSize: '12px',
      opacity: 0.82,
    },
    paymentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '28px 0px',
      alignItems: 'start',
    },
    paymentColumn: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    paymentColumnNarrow: {
      width: '100%',
    },
    paymentCompactColumn: {
      width: '100%',
      minWidth: '0',
    },
    paymentAmountWrap: {
      width: '100%',
      maxWidth: '260px',
    },
    locationSelectWrap: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: '260px',
    },
    paymentModeWrap: {
      width: '100%',
      maxWidth: '260px',
    },
    paymentFieldWrap: {
      width: '100%',
      maxWidth: '260px',
      alignSelf: 'start',
    },
    bankChargesInput: {
      minHeight: '44px',
      padding: '12px 12px',
    },
    paymentControlShell: {
      width: '100%',
      minHeight: '40px',
    },
    paymentTwoColRow: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      columnGap: '18px',
      rowGap: '18px',
      alignItems: 'flex-start',
    },
    paymentTwoColItem: {
      width: '100%',
      minWidth: '0',
    },
    paymentThreeColRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 260px))',
      columnGap: '10px',
      rowGap: '12px',
      alignItems: 'flex-start',
      justifyContent: 'start',
    },
    paymentThreeColItem: {
      width: '100%',
      minWidth: '0',
    },
    paymentSplitRow: {
      display: 'grid',
      gridTemplateColumns: 'minmax(260px, 260px) minmax(260px, 260px)',
      columnGap: '10px',
      rowGap: '0px',
      alignItems: 'start',
      justifyContent: 'start',
    },
    paymentStack: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '14px',
    },
    paymentSectionLabel: {
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: '#64748b',
      marginBottom: '8px',
    },
    formGroup: {
      marginBottom: '18px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#334155',
      marginBottom: '6px',
    },
    labelInline: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      minHeight: '20px',
    },
    input: {
      width: '100%',
      minHeight: '40px',
      padding: '10px 12px',
      fontSize: '13px',
      lineHeight: '1.2',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      outline: 'none',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      boxSizing: 'border-box' as const,
      boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
      transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
    },
    select: {
      width: '100%',
      minHeight: '40px',
      padding: '10px 36px 10px 12px',
      fontSize: '13px',
      lineHeight: '1.2',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      outline: 'none',
      backgroundColor: '#ffffff',
      appearance: 'none' as const,
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
    },
    paymentCheckboxRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '18px',
      color: '#334155',
      fontSize: '14px',
      fontWeight: 500,
    },
    paymentDivider: {
      height: '1px',
      backgroundColor: '#e6edf5',
      margin: '22px 0 20px',
    },
    paymentNotesBox: {
      minHeight: '110px',
      resize: 'vertical' as const,
      paddingTop: '12px',
    },
    attachmentButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      border: '1px dashed #94a3b8',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      color: '#0f172a',
      backgroundColor: '#f8fafc',
    },
    uploadedFileItem: {
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
      padding: '9px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      backgroundColor: '#ffffff',
      color: '#334155',
    },
    paymentActions: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      marginTop: '8px',
    },
    secondaryActionButton: {
      border: '1px solid #cbd5e1',
      backgroundColor: '#ffffff',
      color: '#334155',
      padding: '10px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    },
    primaryActionButton: {
      border: 'none',
      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      color: '#ffffff',
      padding: '10px 18px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: '0 12px 24px rgba(21, 128, 61, 0.22)',
    },
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                <h2 style={{ ...styles.sidebarTitle, marginBottom: 0 }}>{selectedSidebarView} Bills</h2>
                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {dropdownOpen && (
                <div style={styles.sidebarDropdownMenu}>
                  {["All", "Draft", "Pending Approval", "Open", "Overdue", "Unpaid", "Partially Paid", "Paid", "Void"].map((view) => (
                    <div
                      key={view}
                      style={{
                        ...styles.sidebarDropdownItem,
                        backgroundColor: selectedSidebarView === view ? "#f0f9ff" : "#ffffff",
                        color: selectedSidebarView === view ? "#156372" : "#374151",
                        fontWeight: selectedSidebarView === view ? "600" : "500",
                      }}
                      onClick={() => {
                        setSelectedSidebarView(view);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{view}</span>
                    </div>
                  ))}
                  <div
                    style={{ ...styles.sidebarDropdownItem, borderBottom: "none", color: "#156372", fontWeight: "600" }}
                    onClick={() => {
                      setDropdownOpen(false);
                      toast("Custom views can be created from the Bills list page.");
                    }}
                  >
                    <span>+ New Custom View</span>
                  </div>
                </div>
              )}
            </div>
            <div style={styles.sidebarActions}>
              <button style={{ ...styles.sidebarButton, backgroundColor: "#156372" }} onClick={() => navigate("/purchases/bills/new")}>
                <Plus size={16} />
              </button>
              <div style={{ position: "relative" }} ref={sidebarMoreMenuRef}>
                <button style={styles.sidebarMoreButton} onClick={() => setSidebarMoreMenuOpen((prev) => !prev)}>
                  <MoreVertical size={16} />
                </button>
                {sidebarMoreMenuOpen && (
                  <div style={styles.sidebarMoreMenu}>
                    <div
                      style={{ position: "relative" }}
                      onMouseEnter={() => setShowSortSubmenu(true)}
                      onMouseLeave={() => setShowSortSubmenu(false)}
                    >
                      <div style={{ ...styles.sidebarDropdownItem, backgroundColor: showSortSubmenu ? "#e3f2fd" : "#ffffff", color: "#1976d2" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <ArrowUpDown size={14} />
                          <span>Sort by</span>
                        </div>
                        <ChevronRight size={14} />
                      </div>
                      {showSortSubmenu && (
                        <div style={styles.sidebarSubmenuPanel}>
                          {[
                            { value: "billDate", label: "Date" },
                            { value: "billNumber", label: "Bill Number" },
                            { value: "vendorName", label: "Vendor" },
                            { value: "amount", label: "Amount" },
                            { value: "dueDate", label: "Due Date" },
                            { value: "status", label: "Status" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              style={{
                                width: "100%",
                                border: "none",
                                textAlign: "left",
                                backgroundColor: sidebarSortBy === option.value ? "#ecfeff" : "transparent",
                                color: sidebarSortBy === option.value ? "#156372" : "#111827",
                                padding: "10px 14px",
                                fontSize: "14px",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setSidebarSortOrder((prev) => (sidebarSortBy === option.value ? (prev === "asc" ? "desc" : "asc") : "asc"));
                                setSidebarSortBy(option.value as any);
                                setShowSortSubmenu(false);
                                setSidebarMoreMenuOpen(false);
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      style={{ position: "relative" }}
                      onMouseEnter={() => setShowImportSubmenu(true)}
                      onMouseLeave={() => setShowImportSubmenu(false)}
                    >
                      <div style={styles.sidebarDropdownItem}>
                        <span>Import Bills</span>
                        <ChevronRight size={14} />
                      </div>
                      {showImportSubmenu && (
                        <div style={styles.sidebarSubmenuPanel}>
                          <button
                            type="button"
                            style={{ width: "100%", border: "none", textAlign: "left", backgroundColor: "transparent", color: "#111827", padding: "10px 14px", fontSize: "14px", cursor: "pointer" }}
                            onClick={() => {
                              setSidebarMoreMenuOpen(false);
                              setShowImportSubmenu(false);
                              navigate("/purchases/bills/import");
                            }}
                          >
                            Import Bills
                          </button>
                          <button
                            type="button"
                            style={{ width: "100%", border: "none", textAlign: "left", backgroundColor: "transparent", color: "#111827", padding: "10px 14px", fontSize: "14px", cursor: "pointer" }}
                            onClick={() => downloadSampleFile("xls")}
                          >
                            Download Sample File
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      style={{ position: "relative" }}
                      onMouseEnter={() => setShowExportSubmenu(true)}
                      onMouseLeave={() => setShowExportSubmenu(false)}
                    >
                      <div style={styles.sidebarDropdownItem}>
                        <span>Export</span>
                        <ChevronRight size={14} />
                      </div>
                      {showExportSubmenu && (
                        <div style={styles.sidebarSubmenuPanel}>
                          <button
                            type="button"
                            style={{ width: "100%", border: "none", textAlign: "left", backgroundColor: "transparent", color: "#111827", padding: "10px 14px", fontSize: "14px", cursor: "pointer" }}
                            onClick={() => {
                              setExportType("bills");
                              setShowExportModal(true);
                              setShowExportSubmenu(false);
                              setSidebarMoreMenuOpen(false);
                            }}
                          >
                            Export Bills
                          </button>
                          <button
                            type="button"
                            style={{ width: "100%", border: "none", textAlign: "left", backgroundColor: "transparent", color: "#111827", padding: "10px 14px", fontSize: "14px", cursor: "pointer" }}
                            onClick={() => {
                              setExportType("current-view");
                              setShowExportModal(true);
                              setShowExportSubmenu(false);
                              setSidebarMoreMenuOpen(false);
                            }}
                          >
                            Export Current View
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      style={styles.sidebarDropdownItem}
                      onClick={() => {
                        setSidebarMoreMenuOpen(false);
                        navigate("/settings/bills");
                      }}
                    >
                      <span>Preferences</span>
                    </div>
                    <div
                      style={{ ...styles.sidebarDropdownItem, borderBottom: "none" }}
                      onClick={() => {
                        setSidebarMoreMenuOpen(false);
                        void handleSidebarRefresh();
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <RefreshCw size={14} />
                        <span>Refresh List</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={styles.sidebarList}>
          {filteredBills.map((b) => {
            const status = getBillStatusDisplay(b);
            const isSelected = String(b.id) === String(id);
            return (
              <div
                key={b.id}
                style={{
                  ...styles.sidebarItem,
                  ...(isSelected ? styles.sidebarItemActive : {}),
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "16px",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onClick={() => navigate(`/purchases/bills/${b.id}`)}
              >
                <input
                  type="checkbox"
                  checked={selectedBills.includes(b.id)}
                  onChange={(e) => handleBillCheckboxChange(b.id, e)}
                  style={{ marginTop: "4px" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={styles.sidebarItemVendor}>{b.vendorName || "Vendor"}</div>
                    <div style={styles.sidebarItemAmount}>
                      {resolvedBaseCurrencySymbol} {parseFloat(String(b.total || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div style={styles.sidebarItemNumber}>
                    {b.billNumber} â€¢ {formatDateShort(b.billDate)}
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${status.color}`}
                    style={{ marginTop: "8px", textTransform: "uppercase" }}
                  >
                    {status.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Top Header */}
        {!isRecordingPayment && (
          <div style={styles.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{ ...styles.sidebarMoreButton, padding: "4px" }}
              >
                <MoreVertical size={18} />
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "14px", color: "#374151" }}>
                  Location: {(bill as any)?.locationName || "Head Office"}
                </span>
                <h1 style={{ ...styles.headerTitle, margin: 0 }}>{bill.billNumber}</h1>
              </div>
            </div>
            <div style={styles.headerActions}>
              <button
                type="button"
                onClick={() => billAttachmentInputRef.current?.click()}
                title="Add Attachment"
                aria-label="Add Attachment"
                style={styles.headerIconButton}
              >
                <Paperclip size={18} />
              </button>
              <button
                type="button"
                onClick={handleAddBillComment}
                title="Add Comment"
                aria-label="Add Comment"
                style={styles.headerIconButton}
              >
                <MessageSquare size={18} />
              </button>
              <input
                type="file"
                ref={billAttachmentInputRef}
                onChange={handleBillAttachmentUpload}
                style={{ display: "none" }}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <X
                size={18}
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/purchases/bills")}
              />
            </div>
          </div>
        )}

        {/* Action Bar */}
        {!isRecordingPayment ? (
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <button
                style={styles.toolbarButton}
                onClick={() => navigate(`/purchases/bills/new`, { state: { editBill: bill, isEdit: true } })}
              >
                <Pencil size={14} /> Edit
              </button>
              <div style={{ position: "relative" }} ref={pdfMenuRef}>
                <button
                  style={styles.toolbarButton}
                  onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
                >
                  <Download size={14} /> PDF/Print <ChevronDown size={12} />
                </button>
              {pdfMenuOpen && (
                <div style={{
                  position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 100,
                    minWidth: "160px",
                    padding: "4px 0"
                  }}>
                  <div
                    style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    onClick={handleDownloadPDF}
                  >
                    PDF
                  </div>
                  <div
                    style={{ padding: "8px 12px", fontSize: "13px", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    onClick={handlePrintBill}
                  >
                    Print
                  </div>
                </div>
              )}
            </div>
            {isBillUnpaid && (
              <button
                style={{ ...styles.toolbarButton, ...styles.recordPaymentBtn }}
                onClick={() => {
                  setPaymentFormData(prev => ({
                    ...prev,
                    paymentAmount: String(bill.balanceDue || bill.total || ""),
                    reference: `Payment for ${bill.billNumber}`
                  }));
                  setIsRecordingPayment(true);
                }}
              >
                Record Payment
              </button>
            )}
              <div style={{ position: "relative" }} ref={moreActionsMenuRef}>
                <button
                  style={styles.toolbarButton}
                  onClick={() => setMoreActionsMenuOpen(!moreActionsMenuOpen)}
                >
                  ...
                </button>
                {moreActionsMenuOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    zIndex: 100,
                    minWidth: "200px",
                    padding: "4px 0",
                    overflow: "hidden"
                  }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                        color: "#111827"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => {
                        handleVoid();
                        setMoreActionsMenuOpen(false);
                      }}
                    >
                      Void
                    </div>
                    {[
                      {
                        key: "expected-payment-date",
                        label: "Expected Payment Date",
                        onClick: () => {
                          handleExpectedPaymentDate();
                          setMoreActionsMenuOpen(false);
                        },
                      },
                      {
                        key: "clone",
                        label: "Clone",
                        onClick: () => {
                          handleClone();
                          setMoreActionsMenuOpen(false);
                        },
                      },
                      {
                        key: "make-recurring",
                        label: "Make Recurring",
                        onClick: () => {
                          if (!bill) return;
                          navigate("/purchases/recurring-bills/new", {
                            state: {
                              billData: {
                                vendorName: bill.vendorName,
                                items: bill.items,
                                paymentTerms: bill.paymentTerms,
                                currency: resolvedBaseCurrency,
                                accountsPayable: bill.accountsPayable,
                                subTotal: bill.subTotal,
                                total: bill.total
                              }
                            }
                          });
                          setMoreActionsMenuOpen(false);
                        },
                      },
                      {
                        key: "create-vendor-credits",
                        label: "Create Vendor Credits",
                        onClick: () => {
                          handleCreateVendorCredits();
                          setMoreActionsMenuOpen(false);
                        },
                      },
                      {
                        key: "view-journal",
                        label: "View Journal",
                        onClick: () => {
                          handleViewJournal();
                          setMoreActionsMenuOpen(false);
                        },
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        style={{
                          padding: "10px 16px",
                          fontSize: "14px",
                          cursor: "pointer",
                          color: "#374151"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        onClick={item.onClick}
                      >
                        {item.label}
                      </div>
                    ))}
                    <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "4px 0" }} />
                    <div
                      style={{
                        padding: "10px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        color: "#156372"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={async () => {
                        const billId = getBillId();
                        if (!billId) return;
                        if (!window.confirm("Are you sure you want to delete this bill?")) return;
                        try {
                          await billsAPI.delete(billId);
                          window.dispatchEvent(new Event("billsUpdated"));
                          toast.success("Bill deleted successfully");
                          navigate("/purchases/bills");
                        } catch (error: any) {
                          console.error("Error deleting bill:", error);
                          toast.error(error?.message || "Failed to delete bill");
                        } finally {
                          setMoreActionsMenuOpen(false);
                        }
                      }}
                    >
                      Delete
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Banners */}
        {!isRecordingPayment && isBillUnpaid && (
          <div style={styles.banner}>
            <div style={styles.bannerText}>
              <span style={{ backgroundColor: "#8b5cf6", color: "#fff", borderRadius: "50%", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>âœ¨</span>
              <span>
                <strong>WHAT'S NEXT?</strong>{" "}
                {"This bill is still open. You can now record payment for this bill."}
              </span>
            </div>
            <button
              style={{ ...styles.toolbarButton, ...styles.bannerRecordPaymentBtn, padding: "4px 12px" }}
              onClick={() => {
                setPaymentFormData(prev => ({
                  ...prev,
                  paymentAmount: String(bill.balanceDue || bill.total || ""),
                  reference: `Payment for ${bill.billNumber}`
                }));
                setIsRecordingPayment(true);
              }}
            >
              Record Payment
            </button>
          </div>
        )}

        {/* Tabs */}
        {!isRecordingPayment && (
          <div style={styles.tabsContainer}>
            <div
              style={{ ...styles.tabItem, ...(activeTab === "Payments Made" ? styles.tabItemActive : {}) }}
              onClick={() => setActiveTab("Payments Made")}
            >
              Payments Made <span style={{ ...styles.tabBadge, ...(activeTab === "Payments Made" ? styles.tabBadgeActive : {}) }}>{payments.length}</span>
            </div>
            <div
              style={{ ...styles.tabItem, ...(activeTab === "Purchase Orders" ? styles.tabItemActive : {}) }}
              onClick={() => setActiveTab("Purchase Orders")}
            >
              Purchase Orders <span style={{ ...styles.tabBadge, ...(activeTab === "Purchase Orders" ? styles.tabBadgeActive : {}) }}>{purchaseOrders.length}</span>
            </div>
          </div>
        )}

        {/* Scrollable Area */}
        <div style={styles.contentArea}>
          {isRecordingPayment ? (
            <div style={styles.paymentForm}>
              <div style={styles.paymentFormHeader}>
                <div style={styles.paymentFormTitleWrap}>
                  <span style={styles.paymentFormEyebrow}>Record Payment</span>
                  <h2 style={styles.paymentFormTitle}>Payment for {bill.billNumber}</h2>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                <div style={styles.paymentSectionLabel}>Payment Details</div>
                <div style={styles.paymentCompactColumn}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Location</label>
                    <div style={styles.locationSelectWrap}>
                      <select
                        name="location"
                        value={paymentFormData.location}
                        onChange={handlePaymentChange}
                        onFocus={() => setActivePaymentField("location")}
                        onBlur={() => setActivePaymentField("")}
                        style={getPaymentFieldStyle("location", styles.select)}
                      >
                        <option value="Head Office">Head Office</option>
                        <option value="Branch Office">Branch Office</option>
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Payment Made *({resolvedBaseCurrency})</label>
                    <div style={styles.paymentAmountWrap}>
                      <input
                        type="text"
                        name="paymentAmount"
                        value={paymentFormData.paymentAmount}
                        onChange={handlePaymentChange}
                        onFocus={() => setActivePaymentField("paymentAmount")}
                        onBlur={() => setActivePaymentField("")}
                        style={getPaymentFieldStyle("paymentAmount", styles.input)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div style={styles.paymentSplitRow}>
                    <div style={styles.paymentStack}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Paid Through*</label>
                        <div style={styles.paymentFieldWrap}>
                          <div style={styles.paymentControlShell}>
                            <TabanSelect
                              value={paymentFormData.paidThrough}
                              options={paidThroughAccounts}
                              groupBy="accountType"
                              placeholder="Select Paid Through Account"
                              onChange={(val) => {
                                const account = paidThroughAccounts.find(a => a.name === val);
                                setPaymentFormData(prev => ({
                                  ...prev,
                                  paidThrough: val,
                                  paidThroughId: account?._id || account?.id || ""
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={{ ...styles.label, ...styles.labelInline }}>
                          <span>Bank Charges (if any)</span>
                          <Info size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                        </label>
                        <div style={styles.paymentFieldWrap}>
                        <input
                          type="text"
                          name="bankCharges"
                          value={paymentFormData.bankCharges}
                          onChange={handlePaymentChange}
                          onFocus={() => setActivePaymentField("bankCharges")}
                          onBlur={() => setActivePaymentField("")}
                          style={getPaymentFieldStyle("bankCharges", { ...styles.input, ...styles.bankChargesInput })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    </div>

                    <div style={styles.paymentStack}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Reference#</label>
                        <div style={styles.paymentFieldWrap}>
                          <input
                            type="text"
                            name="reference"
                            value={paymentFormData.reference}
                            onChange={handlePaymentChange}
                            onFocus={() => setActivePaymentField("reference")}
                            onBlur={() => setActivePaymentField("")}
                            style={getPaymentFieldStyle("reference", styles.input)}
                          />
                        </div>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Payment Mode</label>
                        <div style={styles.paymentModeWrap}>
                          <div style={styles.paymentControlShell}>
                            <PaymentModeDropdown
                              value={paymentFormData.paymentMode}
                              onChange={(value) => setPaymentFormData(prev => ({ ...prev, paymentMode: value }))}
                              onFocus={() => setActivePaymentField("paymentMode")}
                              onBlur={() => setActivePaymentField("")}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div style={styles.paymentThreeColRow}>
                    <div style={{ ...styles.formGroup, ...styles.paymentThreeColItem }}>
                      <label style={styles.label}>Payment Date*</label>
                      <div style={styles.paymentFieldWrap}>
                        <input
                          type="date"
                          name="paymentDate"
                          value={paymentFormData.paymentDate}
                          onChange={handlePaymentChange}
                          onFocus={() => setActivePaymentField("paymentDate")}
                          onBlur={() => setActivePaymentField("")}
                          style={getPaymentFieldStyle("paymentDate", styles.input)}
                        />
                      </div>
                    </div>

                    <div style={{ ...styles.formGroup, ...styles.paymentThreeColItem }}>
                      <label style={styles.label}>Payment #*</label>
                      <div style={styles.paymentFieldWrap}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            name="paymentNumber"
                            value={paymentFormData.paymentNumber}
                            onChange={handlePaymentChange}
                            onFocus={() => setActivePaymentField("paymentNumber")}
                            onBlur={() => setActivePaymentField("")}
                            style={getPaymentFieldStyle("paymentNumber", styles.input)}
                          />
                          <Settings size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: '#6b7280' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ ...styles.formGroup, ...styles.paymentThreeColItem }}>
                      <label style={styles.label}>Payment Made on</label>
                      <div style={styles.paymentFieldWrap}>
                        <input
                          type="date"
                          name="paymentMadeOn"
                          value={paymentFormData.paymentMadeOn}
                          onChange={handlePaymentChange}
                          onFocus={() => setActivePaymentField("paymentMadeOn")}
                          onBlur={() => setActivePaymentField("")}
                          required
                          min={todayIsoDate}
                          max={endOfMonthIsoDate}
                          style={getPaymentFieldStyle("paymentMadeOn", styles.input)}
                          placeholder="dd/MM/yyyy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.paymentDivider} />

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <textarea
                  name="notes"
                  value={paymentFormData.notes}
                  onChange={handlePaymentChange}
                  style={{ ...styles.input, ...styles.paymentNotesBox }}
                ></textarea>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={styles.label}>Attachments</label>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div
                    onClick={() => setAttachmentMenuOpen(prev => !prev)}
                    style={styles.attachmentButton}
                  >
                    <Upload size={14} /> Upload File <ChevronDown size={14} />
                  </div>
                  {attachmentMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      width: '220px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #dbe3ee',
                      borderRadius: '10px',
                      boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
                      zIndex: 40,
                      overflow: 'hidden'
                    }}>
                      {[
                        'Attach From Desktop',
                        'Attach From Documents',
                        'Attach From Cloud',
                      ].map((label) => (
                        <div
                          key={label}
                          onClick={triggerAttachmentUpload}
                          style={{
                            padding: '12px 14px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            color: '#111827',
                            backgroundColor: '#ffffff',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>You can upload a maximum of 5 files, 10MB each</p>

                {uploadedFiles.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {uploadedFiles.map(file => (
                      <div key={file.id} style={styles.uploadedFileItem}>
                        <Paperclip size={12} /> {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ ...styles.paymentCheckboxRow, marginBottom: '24px' }}>
                <input type="checkbox" />
                <span>Send a Payment Made email notification.</span>
              </div>

              <div style={styles.paymentActions}>
                <button
                  onClick={() => handlePaymentSubmit('draft')}
                  style={styles.secondaryActionButton}
                >Save as Draft</button>
                <button
                  onClick={() => handlePaymentSubmit('paid')}
                  style={styles.primaryActionButton}
                >Save as Paid</button>
                <button
                  onClick={() => setIsRecordingPayment(false)}
                  style={styles.secondaryActionButton}
                >Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* Payments Made Tab Content */}
              {activeTab === "Payments Made" && (
                <div style={{ padding: "24px", backgroundColor: "#ffffff" }}>
                  {payments.length > 0 ? (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Date</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Payment#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Reference#</th>
                          <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Mode</th>
                          <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "16px 12px", fontSize: "14px", color: "#111827" }}>
                              {formatDateShort(p.date)}
                            </td>
                            <td style={{ padding: "16px 12px", fontSize: "14px" }}>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/purchases/payments-made/${p.id}`);
                                }}
                                style={{ color: "#156372", textDecoration: "none", fontWeight: "500" }}
                              >
                                {p.paymentNumber || p.payment_number || String(p.id)}
                              </a>
                            </td>
                            <td style={{ padding: "16px 12px", fontSize: "14px", color: "#374151" }}>
                              {p.reference || p.referenceNumber || p.reference_number || "-"}
                            </td>
                            <td style={{ padding: "16px 12px", fontSize: "14px", color: "#374151", textTransform: "capitalize" }}>
                              {p.mode || p.paymentMethod || p.paymentMode || "-"}
                            </td>
                            <td style={{ padding: "16px 12px", fontSize: "14px", fontWeight: "600", textAlign: "right", color: "#111827" }}>
                              {resolvedBaseCurrencySymbol}
                              {parseFloat(String(p.amount)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                      No payments recorded for this bill.
                    </div>
                  )}
                </div>
              )}

              {/* Purchase Orders Tab Content */}
              {activeTab === "Purchase Orders" && purchaseOrders.length > 0 && (
                <div style={{ padding: "24px", backgroundColor: "#ffffff" }}>
                  <div style={{ border: "1px solid #dbe3f0", borderRadius: "8px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        borderBottom: "1px solid #dbe3f0",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Purchase Orders</span>
                        <span style={{ display: "inline-flex", minWidth: "18px", height: "18px", alignItems: "center", justifyContent: "center", borderRadius: "999px", backgroundColor: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: 700, padding: "0 6px" }}>
                          {purchaseOrders.length}
                        </span>
                      </div>
                      <ChevronDown size={14} style={{ color: "#6b7280" }} />
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Date</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Purchase Order#</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.map((po) => (
                          <tr key={po.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                            <td style={{ padding: "12px 14px", fontSize: "13px", color: "#111827" }}>
                              {formatDateShort(po.date)}
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/purchases/purchase-orders/${po.id}`);
                                }}
                                style={{ color: "#2f6fed", textDecoration: "none", fontWeight: 500 }}
                              >
                                {po.purchaseOrderNumber}
                              </a>
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  backgroundColor: po.status === "closed" ? "#d1fae5" : "#dbeafe",
                                  color: po.status === "closed" ? "#059669" : "#2563eb",
                                  textTransform: "capitalize",
                                }}
                              >
                                {po.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={styles.pdfControls}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#374151" }}>Show PDF View</span>
                  <div
                    style={{
                      width: "36px",
                      height: "18px",
                      borderRadius: "9px",
                      backgroundColor: showPdfView ? "#156372" : "#d1d5db",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onClick={() => setShowPdfView(!showPdfView)}
                  >
                    <div style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      position: "absolute",
                      top: "2px",
                      left: showPdfView ? "20px" : "2px",
                      transition: "left 0.2s"
                    }} />
                  </div>
                </div>
              </div>

              {showPdfView && (
                <div className="w-full max-w-4xl">
                  <TransactionPDFDocument
                    data={{
                      ...bill,
                      number: bill.billNumber,
                      date: bill.billDate,
                      customerName: bill.vendorName,
                      billingAddress: bill.vendorAddress || `${bill.vendorCity || ""}, ${bill.vendorCountry || ""}`,
                      items: (bill.items || []).map((item: any) => ({
                        ...item,
                        name: item.itemDetails || "Item",
                        description: "",
                        quantity: item.quantity || 0,
                        rate: item.rate || 0,
                        amount: item.amount || 0,
                        unit: ""
                      }))
                    }}
                    config={activePdfTemplate?.config || {}}
                    moduleType="bills"
                    organization={organizationProfile}
                    totalsMeta={{
                      subTotal: bill.subTotal,
                      total: bill.total,
                      paidAmount: paymentsTotal,
                      balance: bill.balanceDue
                    }}
                  />
                </div>
              )}

                  {/* Journal Section */}
                  <div style={styles.journalSection} ref={journalSectionRef}>
                    <div style={styles.journalHeader}>
                      <span style={{ ...styles.journalTitle, ...styles.journalTitleActive }}>Journal</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
                      Amount is displayed in your base currency <span style={styles.journalCurrencyBadge}>{resolvedBaseCurrency}</span>
                    </div>

                    <h3 style={styles.journalSubtitle}>Bill</h3>

                    <table style={styles.journalTable}>
                      <thead>
                        <tr>
                          <th style={styles.journalTableHeaderCell}>ACCOUNT</th>
                          <th style={{ ...styles.journalTableHeaderCell, textAlign: "right", width: "100px" }}>DEBIT</th>
                          <th style={{ ...styles.journalTableHeaderCell, textAlign: "right", width: "100px" }}>CREDIT</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={styles.journalTableCell}>Accounts Payable</td>
                          <td style={{ ...styles.journalTableCell, textAlign: "right" }}>0.00</td>
                          <td style={{ ...styles.journalTableCell, textAlign: "right" }}>{parseFloat(String(bill.total)).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style={styles.journalTableCell}>Cost Of Goods Sold</td>
                          <td style={{ ...styles.journalTableCell, textAlign: "right" }}>{parseFloat(String(bill.total)).toFixed(2)}</td>
                          <td style={{ ...styles.journalTableCell, textAlign: "right" }}>0.00</td>
                        </tr>
                        <tr style={{ fontWeight: "700" }}>
                          <td style={{ ...styles.journalTableCell, padding: "16px 0" }}></td>
                          <td style={{ ...styles.journalTableCell, textAlign: "right", padding: "16px 0" }}>{parseFloat(String(bill.total)).toFixed(2)}</td>
                          <td style={{ ...styles.journalTableCell, textAlign: "right", padding: "16px 0" }}>{parseFloat(String(bill.total)).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

              {/* Payments Made Tab Content */}
              {false && activeTab === "Payments Made" && (
                <div style={{ padding: "24px", backgroundColor: "#ffffff" }}>
                  {payments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                      No payments recorded yet
                    </div>
                  ) : (
                    <div>
                      {payments.map((payment) => (
                        <div key={payment.id} style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontWeight: "600" }}>Payment #{payment.id}</div>
                              <div style={{ fontSize: "13px", color: "#6b7280" }}>{formatDateShort(payment.date)}</div>
                            </div>
                            <div style={{ fontWeight: "600", color: "#059669" }}>
                              {resolvedBaseCurrencySymbol} {parseFloat(String(payment.amount)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showExportModal && typeof document !== "undefined" && document.body ? (
        <ExportBills
          onClose={() => setShowExportModal(false)}
          exportType={exportType === "current-view" ? "current-view" : "bills"}
          data={exportType === "current-view" ? filteredBills : bills}
        />
      ) : null}

      {isPrintPreviewOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "#f3f4f6",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: "64px",
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "32px", fontWeight: 400, color: "#111827" }}>Preview</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handlePrintFromPreview}
                style={{
                  height: "38px",
                  padding: "0 18px",
                  border: "1px solid #3b82f6",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                Print
              </button>
              <button
                onClick={handleClosePrintPreview}
                style={{
                  height: "38px",
                  padding: "0 18px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  borderRadius: "8px",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>

          <div
            style={{
              height: "56px",
              backgroundColor: "#2f3338",
              borderBottom: "1px solid #1f2937",
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, backgroundColor: "#2f3338", overflow: "hidden", padding: "0 12px 12px" }}>
            <iframe
              ref={printPreviewFrameRef}
              src={printPreviewUrl}
              title="Bill Print Preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "#2f3338",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
