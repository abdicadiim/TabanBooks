import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { chartOfAccountsAPI, bankAccountsAPI, vendorsAPI, billsAPI, paymentsMadeAPI } from "../../../services/api";
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Info,
  AlertTriangle,
  Upload,
  Trash2,
} from "lucide-react";
import TabanSelect from "../../../components/TabanSelect";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";
import { getAccountOptionLabel, getBankAccountsFromResponse, getChartAccountsFromResponse, mergeAccountOptions } from "../shared/accountOptions";

export default function RecordPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnToRecurringBillId = location.state?.returnToRecurringBillId || "";

  // Add global styles for focus states and animations
  useEffect(() => {
    const styleId = "record-payment-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .form-animate {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .input-advanced {
          transition: all 0.2s ease-in-out !important;
        }
        .input-advanced:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
          background-color: #ffffff !important;
        }
        .button-advanced:hover {
          background-color: #f9fafb !important;
          border-color: #2563eb !important;
        }
        .vendor-item-advanced:hover {
          background-color: #eff6ff !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const { code: baseCurrencyCode } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const isEditMode = location.state?.isEdit || false;
  const editPayment = location.state?.editPayment || null;
  const clonedData = location.state?.clonedData || null;

  const [formData, setFormData] = useState({
    vendorName: "",
    vendorId: "",
    location: "Head Office",
    paymentNumber: "1",
    paymentCurrency: resolvedBaseCurrency,
    paymentAmount: "",
    bankCharges: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: "Cash",
    paidThrough: "Petty Cash",
    paidThroughId: "",
    reference: "",
    deductTDS: false,
    xcv: "None",
    notes: "",
    payFullAmount: false,
  });
  const hasAppliedCloneRef = useRef(false);

  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const vendorRef = useRef<HTMLDivElement>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Bill Allocation State
  const [bills, setBills] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [totalUsed, setTotalUsed] = useState(0);
  const [excessAmount, setExcessAmount] = useState(0);
  const [paidThroughAccounts, setPaidThroughAccounts] = useState<any[]>([]);
  const [saveLoadingState, setSaveLoadingState] = useState<null | "draft" | "paid">(null);

  // Payment Mode Custom Dropdown State
  const [paymentModeOpen, setPaymentModeOpen] = useState(false);
  const [paymentModeSearch, setPaymentModeSearch] = useState("");
  const paymentModeRef = useRef<HTMLDivElement>(null);
  const paymentModes = [
    "Bank Remittance",
    "Bank Transfer",
    "Cash",
    "Check",
    "Credit Card",
    "Mobile Money"
  ];


  const findPaidThroughAccount = (value: string) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) return null;

    return (
      paidThroughAccounts.find(
        (account: any) =>
          String(account.value || account.id || account._id || "") === normalizedValue ||
          String(account.name || "").trim().toLowerCase() === normalizedValue.toLowerCase(),
      ) || null
    );
  };

  useEffect(() => {
    if (!resolvedBaseCurrency) return;
    setFormData((prev) => ({
      ...prev,
      paymentCurrency: resolvedBaseCurrency,
    }));
  }, [resolvedBaseCurrency]);

  const getBillDueAmount = (bill: any): number => {
    const balance = Number(bill?.balance);
    if (!Number.isNaN(balance) && bill?.balance !== undefined && bill?.balance !== null && bill?.balance !== "") {
      return Math.max(0, balance);
    }
    const balanceDue = Number(bill?.balanceDue);
    if (!Number.isNaN(balanceDue) && bill?.balanceDue !== undefined && bill?.balanceDue !== null && bill?.balanceDue !== "") {
      return Math.max(0, balanceDue);
    }
    const total = Number(bill?.total || 0);
    const paid = Number(bill?.paidAmount || 0);
    return Math.max(0, total - paid);
  };

  // Load vendors from API
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        if (response && (response.code === 0 || response.success)) {
          setVendors(filterActiveRecords(response.data || response.vendors || []));
        }
      } catch (error) {
        console.error("Error loading vendors:", error);
      }
    };
    loadVendors();
  }, []);

  // Update excess amount when payment amount changes
  useEffect(() => {
    const paymentAmount = parseFloat(formData.paymentAmount) || 0;
    setExcessAmount(paymentAmount - totalUsed);
  }, [formData.paymentAmount, totalUsed]);

  // Handle Pay Full Amount Checkbox
  useEffect(() => {
    if (formData.payFullAmount && bills.length > 0) {
      const totalDue = bills.reduce((sum, bill) => {
        return sum + getBillDueAmount(bill);
      }, 0);

      setFormData(prev => ({
        ...prev,
        paymentAmount: totalDue.toFixed(2)
      }));
    }
  }, [formData.payFullAmount, bills]);

  // Load paid through accounts from database
  useEffect(() => {
    const loadPaidThroughAccounts = async () => {
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
        const filteredAccounts = mergedAccounts.filter((account: any) =>
          paidThroughTypes.includes(String(account.accountType || "").toLowerCase())
        );
        const transformed = filteredAccounts.map((acc: any) => ({
          ...acc,
          name: getAccountOptionLabel(acc),
          value: acc.id || acc._id
        }));
        setPaidThroughAccounts(transformed);
      } catch (error) {
        console.error('Error loading paid through accounts:', error);
      }
    };

    loadPaidThroughAccounts();
  }, []);

  // Pre-populate if coming from BillDetail
  useEffect(() => {
    const initFromBill = async () => {
      if (location.state?.fromBill && location.state?.bill) {
        const bill = location.state.bill;
        const vendorId = bill.vendorId || bill.vendor;
        const vendorName = bill.vendorName;

        setFormData(prev => ({
          ...prev,
          vendorName: vendorName || "",
          vendorId: vendorId || "",
          paymentAmount: String(getBillDueAmount(bill) || ""),
          paymentCurrency: resolvedBaseCurrency,
          reference: bill.billNumber ? `Payment for ${bill.billNumber}` : "",
        }));
        setIsFormEnabled(true);

        // ONLY show the current bill in the table
        setBills([bill]);

        // Pre-allocate to this specific bill
        const billId = bill.id || bill._id;
        const amountToApply = getBillDueAmount(bill);
        setAllocations({ [billId]: amountToApply });
        setTotalUsed(amountToApply);
      }
    };
    initFromBill();
  }, [location.state, resolvedBaseCurrency]);

  // Load payment data if in edit mode
  useEffect(() => {
    if (isEditMode && editPayment) {
      setFormData({
        vendorName: editPayment.vendorName || "",
        vendorId: editPayment.vendorId || "",
        location: editPayment.location || "Head Office",
        paymentNumber: editPayment.paymentNumber || "1",
        paymentCurrency: resolvedBaseCurrency,
        paymentAmount: editPayment.amount || "",
        bankCharges: editPayment.bankCharges || "",
        paymentDate: editPayment.date || new Date().toISOString().split('T')[0],
        paymentMode: editPayment.mode || "Cash",
        paidThrough: editPayment.paidThrough || "Petty Cash",
        paidThroughId: editPayment.paidThroughId || "",
        reference: editPayment.reference || "",
        deductTDS: editPayment.deductTDS || false,
        xcv: editPayment.xcv || "None",
        notes: editPayment.notes || "",
        payFullAmount: false,
      });
      setIsFormEnabled(true); // Enable form in edit mode
    }
  }, [isEditMode, editPayment, resolvedBaseCurrency]);

  useEffect(() => {
    if (paidThroughAccounts.length === 0) return;

    setFormData((prev) => {
      const currentId = String(prev.paidThroughId || "").trim();
      const currentName = String(prev.paidThrough || "").trim();
      const matchedAccount = findPaidThroughAccount(currentId || currentName);

      if (!matchedAccount) {
        return prev;
      }

      const nextId = String(matchedAccount.value || matchedAccount.id || matchedAccount._id || "");
      const nextName = String(matchedAccount.name || "");

      if (nextId === currentId && nextName === currentName) {
        return prev;
      }

      return {
        ...prev,
        paidThroughId: nextId,
        paidThrough: nextName,
      };
    });
  }, [paidThroughAccounts]);

  useEffect(() => {
    if (isEditMode || !clonedData || hasAppliedCloneRef.current) return;
    hasAppliedCloneRef.current = true;

    const cloned = clonedData as any;
    const toInputDate = (value: any) => {
      if (!value) return new Date().toISOString().split("T")[0];
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
      return d.toISOString().split("T")[0];
    };

    setFormData(prev => ({
      ...prev,
      vendorName: cloned.vendorName || prev.vendorName,
      vendorId: cloned.vendorId || cloned.vendor || prev.vendorId,
      location: cloned.location || prev.location,
      paymentCurrency: resolvedBaseCurrency,
      paymentAmount: String(cloned.amount ?? cloned.paymentAmount ?? prev.paymentAmount ?? ""),
      bankCharges: String(cloned.bankCharges ?? prev.bankCharges ?? ""),
      paymentDate: toInputDate(cloned.date || cloned.paymentDate),
      paymentMode: cloned.mode || cloned.paymentMode || prev.paymentMode,
      paidThrough: cloned.paidThrough || prev.paidThrough,
      paidThroughId: cloned.paidThroughId || prev.paidThroughId,
      reference: cloned.reference || prev.reference,
      deductTDS: Boolean(cloned.deductTDS ?? prev.deductTDS),
      xcv: cloned.xcv || prev.xcv,
      notes: cloned.notes || prev.notes,
      payFullAmount: false
    }));
    setIsFormEnabled(true);
  }, [clonedData, isEditMode, resolvedBaseCurrency]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) {
        setVendorOpen(false);
        setVendorSearch("");
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setUploadMenuOpen(false);
      }
      if (paymentModeRef.current && !paymentModeRef.current.contains(event.target as Node)) {
        setPaymentModeOpen(false);
        setPaymentModeSearch("");
      }
    };

    if (vendorOpen || uploadMenuOpen || paymentModeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [vendorOpen, uploadMenuOpen, paymentModeOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    // @ts-ignore
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleVendorSelect = async (vendor: any) => {
    const vendorName = vendor.displayName || vendor.name;
    const vendorId = vendor.id || vendor._id;

    setFormData((prev) => ({
      ...prev,
      vendorName,
      vendorId
    }));
    setVendorOpen(false);
    setVendorSearch("");
    setIsFormEnabled(true);

    // Load bills for this vendor
    try {
      const response = await billsAPI.getByVendor(vendorId);
      if (response && (response.code === 0 || response.success)) {
        const vendorBills = response.data || [];
        // Filter for Open, Overdue, or Partially Paid bills
        const openBills = vendorBills.filter((bill: any) => {
          const s = (bill.status || "").toUpperCase();
          return s === "OPEN" || s === "OVERDUE" || s === "PARTIALLY_PAID" || s === "PARTIALLY PAID";
        });

        // Sort by date (oldest first)
        openBills.sort((a: any, b: any) => new Date(a.date || a.billDate).getTime() - new Date(b.date || b.billDate).getTime());

        setBills(openBills);
        // Reset allocations
        setAllocations({});
        setTotalUsed(0);
      }
    } catch (error) {
      console.error("Error loading bills:", error);
      setBills([]);
    }
  };

  // Auto-allocate payment amount to bills
  useEffect(() => {
    if (bills.length === 0 || isEditMode || location.state?.fromBill) return;

    const amount = parseFloat(formData.paymentAmount) || 0;
    let remaining = amount;
    const newAllocations: Record<string, number> = {};

    bills.forEach(bill => {
      if (remaining <= 0) return;

      const billId = bill.id || bill._id;
      const dueAmount = getBillDueAmount(bill);

      const toAllocate = Math.min(remaining, dueAmount);
      // specific precision handling if needed, usually 2 decimals
      const allocated = Math.round(toAllocate * 100) / 100;

      if (allocated > 0) {
        newAllocations[billId] = allocated;
        remaining -= allocated;
      }
    });

    setAllocations(newAllocations);
    const newTotalUsed = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);
    setTotalUsed(newTotalUsed);
  }, [formData.paymentAmount, bills]);

  const handleAllocationChange = (billId: string, amount: string) => {
    const value = parseFloat(amount) || 0;
    const bill = bills.find(b => (b.id || b._id) === billId);

    if (!bill) return;

    // Validate amount doesn't exceed due amount
    const dueAmount = getBillDueAmount(bill);
    if (value > dueAmount) {
      return;
    }

    setAllocations(prev => {
      const newAllocations = { ...prev, [billId]: value };

      // Calculate total used
      const newTotalUsed = Object.values(newAllocations).reduce((sum, val: number) => sum + val, 0);
      setTotalUsed(newTotalUsed);

      return newAllocations;
    });
  };

  const filteredVendors = vendors.filter((vendor) =>
    (vendor.displayName || vendor.name || "").toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent, status: "draft" | "paid") => {
    e.preventDefault();
    if (saveLoadingState) return;

    if (!formData.vendorId || !formData.paymentAmount) {
      alert("Please select a vendor and enter a payment amount.");
      return;
    }

    try {
      setSaveLoadingState(status);
      // Create payment object for API
      const paymentData = {
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        paymentNumber: formData.paymentNumber,
        location: formData.location,
        date: formData.paymentDate,
        amount: parseFloat(formData.paymentAmount) || 0,
        currency: formData.paymentCurrency,
        bankCharges: parseFloat(formData.bankCharges) || 0,
        mode: formData.paymentMode,
        paidThrough: formData.paidThroughId || formData.paidThrough,
        reference: formData.reference,
        xcv: formData.xcv,
        notes: formData.notes,
        status: status === "paid" ? "PAID" : "DRAFT",
        allocations: Object.entries(allocations).map(([billId, amount]) => ({
          billId,
          amount
        }))
      };

      const response = await paymentsMadeAPI.create(paymentData);

      if (response && (response.code === 0 || response.success)) {
        window.dispatchEvent(new Event("paymentsUpdated"));
        window.dispatchEvent(new Event("billsUpdated"));
        window.dispatchEvent(new Event("recurringBillsUpdated"));

        if (returnToRecurringBillId) {
          navigate(`/purchases/recurring-bills/${returnToRecurringBillId}`);
        } else {
          navigate("/purchases/payments-made");
        }
      } else {
        alert(response?.message || "Failed to record payment.");
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert("An error occurred while saving the payment.");
    } finally {
      setSaveLoadingState(null);
    }
  };

  const handleCancel = () => {
    if (returnToRecurringBillId) {
      navigate(`/purchases/recurring-bills/${returnToRecurringBillId}`);
      return;
    }
    navigate("/purchases/payments-made");
  };

  const handleAttachFromDesktop = () => {
    fileInputRef.current?.click();
    setUploadMenuOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (uploadedFiles.length + files.length > 5) {
      alert("You can upload a maximum of 5 files.");
      return;
    }

    // Validate file sizes (10MB each)
    const invalidFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert("Some files exceed the 10MB limit. Please select smaller files.");
      return;
    }

    // Add files to state
    const newFiles = files.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = (fileId: number) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: "#ffffff",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#111827",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 24px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    headerTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: 0,
    },
    form: {
      flex: 1,
      overflowY: "auto",
      padding: "24px",
    },
    section: {
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "16px",
    },
    formRow: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "24px",
      marginBottom: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    horizontalField: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
      marginBottom: "16px",
    },
    horizontalLabel: {
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      width: "120px",
      flexShrink: 0,
    },
    label: {
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
    },
    required: {
      color: "#ef4444",
      marginLeft: "2px",
    },
    input: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      width: "420px",
      boxSizing: "border-box",
    },
    select: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      width: "420px",
    },
    vendorDropdownWrapper: {
      position: "relative",
      width: "420px",
    },
    vendorDropdownButton: {
      width: "420px",
      padding: "8px 12px",
      border: "1px solid #3b82f6",
      borderRadius: "6px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      textAlign: "left",
      outline: "none",
    },
    vendorDropdownMenu: {
      position: "absolute",
      top: "100%",
      left: 0,
      width: "420px",
      marginTop: "4px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e5e7eb",
      zIndex: 1000,
      overflow: "hidden",
    },
    vendorSearchBox: {
      padding: "8px 12px",
      borderBottom: "1px solid #f3f4f6",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    vendorSearchInput: {
      border: "none",
      outline: "none",
      fontSize: "14px",
      flex: 1,
    },
    vendorList: {
      maxHeight: "300px",
      overflowY: "auto",
    },
    vendorItem: {
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      cursor: "pointer",
      transition: "background-color 0.2s",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    vendorAvatar: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: "#e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "600",
      color: "#4b5563",
    },
    vendorInfo: {
      display: "flex",
      flexDirection: "column",
    },
    vendorName: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#111827",
    },
    vendorSubInfo: {
      fontSize: "12px",
      color: "#6b7280",
    },
    divider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      margin: "24px 0",
      width: "100%",
    },
    paymentMadeWrapper: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    paymentMadeInputRow: {
      display: "flex",
      gap: "12px",
      width: "420px",
    },
    currencyBox: {
      width: "80px",
      padding: "8px",
      backgroundColor: "#f9fafb",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#4b5563",
    },
    amountInput: {
      flex: 1,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "16px",
    },
    tableHeaderCell: {
      padding: "12px 8px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      borderBottom: "1px solid #e5e7eb",
      textTransform: "uppercase",
    },
    tableCell: {
      padding: "12px 8px",
      fontSize: "13px",
      color: "#374151",
      borderBottom: "1px solid #f3f4f6",
      verticalAlign: "top",
    },
    payInFull: {
      fontSize: "11px",
      color: "#3b82f6",
      cursor: "pointer",
      marginTop: "4px",
      display: "block",
    },
    summaryContainer: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: "32px",
    },
    summaryBox: {
      width: "360px",
      backgroundColor: "#fff7ed",
      borderRadius: "12px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "14px",
    },
    summaryLabel: {
      color: "#4b5563",
    },
    summaryValue: {
      fontWeight: "600",
      color: "#111827",
    },
    footer: {
      display: "flex",
      gap: "12px",
      padding: "20px 24px",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
    },
    primaryButton: {
      padding: "8px 20px",
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      border: "none",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    secondaryButton: {
      padding: "8px 20px",
      backgroundColor: "#ffffff",
      color: "#374151",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      border: "1px solid #d1d5db",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    clearLink: {
      fontSize: "13px",
      color: "#3b82f6",
      cursor: "pointer",
      float: "right" as any,
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>
          <Upload size={24} />
          {isEditMode ? "Edit Payment" : "Record Payment"}
        </h1>
        <X 
          size={24} 
          style={{ cursor: "pointer", color: "#6b7280" }} 
          onClick={handleCancel} 
        />
      </div>

      <div className="form-animate" style={styles.form}>
        {/* Top Information Block */}
        <div style={styles.section}>
          {/* Vendor Name */}
          <div style={styles.horizontalField}>
            <label style={{ ...styles.horizontalLabel, color: "#ef4444" }}>Vendor Name*</label>
            <div style={styles.vendorDropdownWrapper} ref={vendorRef}>
              <button
                type="button"
                className="input-advanced"
                style={styles.vendorDropdownButton}
                onClick={() => setVendorOpen(!vendorOpen)}
              >
                <span style={formData.vendorName ? { color: "#111827" } : { color: "#9ca3af" }}>
                  {formData.vendorName || "Select Vendor"}
                </span>
                <ChevronDown size={18} style={{ color: "#3b82f6" }} />
              </button>

              {vendorOpen && (
                <div style={styles.vendorDropdownMenu}>
                  <div style={styles.vendorSearchBox}>
                    <Search size={16} style={{ color: "#9ca3af" }} />
                    <input
                      type="text"
                      placeholder="Search"
                      style={styles.vendorSearchInput}
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div style={styles.vendorList}>
                    {filteredVendors.map((vendor: any) => (
                      <button
                        key={vendor.id || vendor._id}
                        style={styles.vendorItem}
                        onClick={() => handleVendorSelect(vendor)}
                        onMouseEnter={(e: any) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                        onMouseLeave={(e: any) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div style={styles.vendorAvatar}>
                          {(vendor.displayName || vendor.name || "V").charAt(0).toUpperCase()}
                        </div>
                        <div style={styles.vendorInfo}>
                          <span style={styles.vendorName}>{vendor.displayName || vendor.name}</span>
                          <span style={styles.vendorSubInfo}>
                            {vendor.email} | {vendor.companyName || "Organization"}
                          </span>
                        </div>
                      </button>
                    ))}
                    {filteredVendors.length === 0 && (
                      <div style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>No results found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div style={styles.horizontalField}>
            <label style={styles.horizontalLabel}>Location</label>
            <select 
              className="input-advanced"
              style={styles.select} 
              name="location" 
              value={formData.location} 
              onChange={handleChange}
            >
              <option value="Head Office">Head Office</option>
              <option value="Branch Office">Branch Office</option>
            </select>
          </div>

          {/* Payment # */}
          <div style={styles.horizontalField}>
            <label style={{ ...styles.horizontalLabel, color: "#ef4444" }}>Payment #*</label>
            <div style={{ position: "relative", width: "420px" }}>
                <input 
                  className="input-advanced"
                  style={styles.input} 
                  name="paymentNumber" 
                  value={formData.paymentNumber} 
                  onChange={handleChange} 
                />
              <Info size={14} style={{ position: "absolute", right: "12px", top: "10px", color: "#3b82f6" }} />
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Form Fields Section - Grayed out if no vendor selected */}
        <div style={{ opacity: isFormEnabled ? 1 : 0.4, pointerEvents: isFormEnabled ? "auto" : "none" }}>

          <div style={{ ...styles.horizontalField, alignItems: "flex-start" }}>
            <label style={{ ...styles.horizontalLabel, color: "#ef4444", marginTop: "8px" }}>Payment Made*</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <div style={{ ...styles.paymentMadeInputRow, width: "300px" }}>
                  <div style={styles.currencyBox}>{formData.paymentCurrency}</div>
                  <input
                    className="input-advanced"
                    style={{ ...styles.input, flex: 1, width: "auto" }}
                    placeholder="0.00"
                    name="paymentAmount"
                    value={formData.paymentAmount}
                    onChange={handleChange}
                  />
                </div>
                
                <label style={{ ...styles.label, fontWeight: "normal", color: "#374151" }}>Bank Charges (if any)</label>
                <div style={{ position: "relative" }}>
                  <input 
                    className="input-advanced"
                    style={{ ...styles.input, width: "150px" }} 
                    placeholder="0.00" 
                    name="bankCharges" 
                    value={formData.bankCharges} 
                    onChange={handleChange} 
                  />
                  <Info size={14} style={{ position: "absolute", right: "-24px", top: "10px", color: "#6b7280" }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input 
                  type="checkbox" 
                  name="payFullAmount"
                  checked={formData.payFullAmount}
                  onChange={handleChange}
                />
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Pay full amount ({formData.paymentCurrency}{bills.reduce((sum, b) => sum + getBillDueAmount(b), 0).toLocaleString()})
                </span>
              </div>
            </div>
          </div>

          <div style={styles.horizontalField}>
            <label style={styles.horizontalLabel}>Payment Date*</label>
            <input 
              className="input-advanced"
              type="date" 
              style={styles.input} 
              name="paymentDate" 
              value={formData.paymentDate} 
              onChange={handleChange} 
            />
          </div>

          <div style={styles.horizontalField}>
            <label style={styles.horizontalLabel}>Payment Mode</label>
            <div style={styles.vendorDropdownWrapper} ref={paymentModeRef}>
              <button
                type="button"
                className="input-advanced"
                style={{ ...styles.vendorDropdownButton, border: "1px solid #d1d5db" }}
                onClick={() => setPaymentModeOpen(!paymentModeOpen)}
              >
                <span style={{ color: "#111827" }}>
                  {formData.paymentMode || "Select Mode"}
                </span>
                {paymentModeOpen ? <ChevronUp size={18} style={{ color: "#3b82f6" }} /> : <ChevronDown size={18} style={{ color: "#3b82f6" }} />}
              </button>

              {paymentModeOpen && (
                <div style={styles.vendorDropdownMenu}>
                  <div style={styles.vendorSearchBox}>
                    <Search size={16} style={{ color: "#9ca3af" }} />
                    <input
                      type="text"
                      placeholder="Search"
                      style={styles.vendorSearchInput}
                      value={paymentModeSearch}
                      onChange={(e) => setPaymentModeSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div style={styles.vendorList}>
                    {paymentModes
                      .filter(m => m.toLowerCase().includes(paymentModeSearch.toLowerCase()))
                      .map((mode) => (
                        <button
                          key={mode}
                          style={{
                            ...styles.vendorItem,
                            backgroundColor: formData.paymentMode === mode ? "#3b82f6" : "transparent",
                            color: formData.paymentMode === mode ? "#ffffff" : "#111827",
                            padding: "8px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, paymentMode: mode }));
                            setPaymentModeOpen(false);
                            setPaymentModeSearch("");
                          }}
                        >
                          <span style={{ fontSize: "14px" }}>{mode}</span>
                          {formData.paymentMode === mode && <span style={{ fontSize: "14px" }}>✓</span>}
                        </button>
                      ))}
                  </div>
                  <div style={{ 
                    padding: "10px 16px", 
                    borderTop: "1px solid #f3f4f6", 
                    color: "#3b82f6", 
                    fontSize: "13px", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span>
                    Configure Payment Mode
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.horizontalField}>
            <label style={styles.horizontalLabel}>Paid Through*</label>
            <div style={{ width: "420px" }}>
              <TabanSelect
                options={paidThroughAccounts}
                value={formData.paidThrough}
                onChange={(val) => {
                  const acc = findPaidThroughAccount(val);
                  setFormData(prev => ({ ...prev, paidThrough: val, paidThroughId: acc?.id || acc?._id || "" }));
                }}
                placeholder="Select Account"
              />
            </div>
          </div>

          <div style={styles.horizontalField}>
            <label style={styles.horizontalLabel}>Reference#</label>
            <input 
              className="input-advanced"
              style={styles.input} 
              name="reference" 
              value={formData.reference} 
              onChange={handleChange} 
            />
          </div>

          {/* Bills Table */}
          <div style={{ marginTop: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={styles.clearLink} onClick={() => setAllocations({})}>Clear Applied Amount</span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeaderCell}>Date</th>
                  <th style={styles.tableHeaderCell}>Bill#</th>
                  <th style={styles.tableHeaderCell}>PO#</th>
                  <th style={styles.tableHeaderCell}>Location</th>
                  <th style={styles.tableHeaderCell}>Bill Amount</th>
                  <th style={styles.tableHeaderCell}>Amount Due</th>
                  <th style={styles.tableHeaderCell}>Payment Made on <Info size={12} style={{ display: "inline" }} /></th>
                  <th style={styles.tableHeaderCell}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  const billId = bill.id || bill._id;
                  const due = getBillDueAmount(bill);
                  return (
                    <tr key={billId}>
                      <td style={styles.tableCell}>{new Date(bill.date || bill.billDate).toLocaleDateString("en-GB")}</td>
                      <td style={styles.tableCell}>{bill.billNumber}</td>
                      <td style={styles.tableCell}>{bill.poNumber || "-"}</td>
                      <td style={styles.tableCell}>{bill.location || "Head Office"}</td>
                      <td style={styles.tableCell}>{bill.total}</td>
                      <td style={styles.tableCell}>{due.toLocaleString()}</td>
                      <td style={styles.tableCell}>
                        <input type="date" defaultValue={formData.paymentDate} style={{ ...styles.input, width: "130px" }} />
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <input
                            style={{ ...styles.input, width: "100px", textAlign: "right" }}
                            value={allocations[billId] || 0}
                            onChange={(e) => handleAllocationChange(billId, e.target.value)}
                          />
                          <span 
                            style={styles.payInFull} 
                            onClick={() => handleAllocationChange(billId, due.toString())}
                          >
                            Pay in Full
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                      There are no bills for this vendor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 8px", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: "14px", color: "#6b7280", marginRight: "40px" }}>Total:</span>
              <span style={{ fontSize: "14px", fontWeight: "600" }}>{totalUsed.toFixed(2)}</span>
            </div>
          </div>

          {/* Summary Box */}
          <div style={styles.summaryContainer}>
            <div style={styles.summaryBox}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Amount Paid:</span>
                <span style={styles.summaryValue}>{parseFloat(formData.paymentAmount || "0").toFixed(2)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Amount used for Payments:</span>
                <span style={styles.summaryValue}>{totalUsed.toFixed(2)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Amount Refunded:</span>
                <span style={styles.summaryValue}>0.00</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>
                  {excessAmount < 0 && <AlertTriangle size={14} style={{ color: "#d97706", marginRight: "4px" }} />}
                  Amount in Excess:
                </span>
                <span style={styles.summaryValue}>{formData.paymentCurrency} {excessAmount.toFixed(2)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Bank Charges :</span>
                <span style={styles.summaryValue}>{formData.paymentCurrency} {(parseFloat(formData.bankCharges) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Attachments */}
          <div style={{ marginTop: "40px" }}>
            <label style={styles.label}>Notes (Internal use. Not visible to vendor)</label>
            <textarea 
              className="input-advanced"
              style={{ ...styles.input, minHeight: "80px", marginTop: "8px", width: "420px" }} 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button 
          style={styles.secondaryButton} 
          onClick={(e) => handleSubmit(e as any, "draft")}
        >
          Save as Draft
        </button>
        <button 
          style={styles.primaryButton} 
          onClick={(e) => handleSubmit(e as any, "paid")}
        >
          Save as Paid
        </button>
        <button style={styles.secondaryButton} onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );
}

