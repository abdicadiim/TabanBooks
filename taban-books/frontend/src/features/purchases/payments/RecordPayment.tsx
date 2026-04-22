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
    paidThrough: "",
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
    setExcessAmount(Math.max(0, paymentAmount - totalUsed));
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
    };

    if (vendorOpen || uploadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [vendorOpen, uploadMenuOpen]);

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
        // Backend usually handles journal entries, but we could add a manual trigger here if needed
        navigate("/purchases/payments-made");
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

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f9fafb", // bg-gray-50
      minHeight: "100vh",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      flexShrink: 0,
      backgroundColor: "#ffffff",
      width: "100%",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    headerTitle: {
      fontSize: "20px",
      fontWeight: "500",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    form: {
      display: "block",
    },
    leftColumn: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      minWidth: 0,
    },
    rightColumn: {
      width: "360px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      flexShrink: 0,
      alignSelf: "flex-start",
    },
    section: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "8px",
    },
    formRow: {
      display: "grid",
      gridTemplateColumns: "460px 1fr",
      gap: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#111827",
    },
    required: {
      color: "#156372",
    },
    input: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
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
    },
    dropdownWrapper: {
      position: "relative",
      width: "100%",
    },
    dropdownButton: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxSizing: "border-box",
    },
    dropdownMenu: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: "4px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      zIndex: 100,
      maxHeight: "300px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    dropdownSearch: {
      padding: "8px 12px",
      border: "none",
      borderBottom: "1px solid #e5e7eb",
      fontSize: "14px",
      outline: "none",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    dropdownSearchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "14px",
    },
    dropdownList: {
      maxHeight: "250px",
      overflowY: "auto",
      padding: "4px 0",
    },
    dropdownItem: {
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    noResults: {
      padding: "16px",
      textAlign: "center",
      color: "#6b7280",
      fontSize: "14px",
    },
    paymentMadeRow: {
      display: "flex",
      gap: "8px",
      alignItems: "flex-start",
    },
    currencySelect: {
      width: "100px",
    },
    amountInput: {
      flex: 1,
    },
    bankChargesRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    bankChargesInput: {
      flex: 1,
    },
    checkboxGroup: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    checkbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    exchangeRate: {
      fontSize: "12px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginTop: "4px",
    },
    clearLink: {
      color: "#156372",
      fontSize: "14px",
      textDecoration: "none",
      cursor: "pointer",
      marginBottom: "8px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      borderTop: "1px solid #e5e7eb",
      borderBottom: "1px solid #e5e7eb",
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
    },
    tableBody: {
      backgroundColor: "#ffffff",
    },
    tableRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    tableCell: {
      padding: "12px",
      fontSize: "14px",
      color: "#111827",
    },
    emptyState: {
      padding: "48px",
      textAlign: "center",
      color: "#6b7280",
      fontSize: "14px",
    },
    tableTotal: {
      padding: "12px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
    },
    summaryItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "14px",
    },
    summaryLabel: {
      color: "#111827",
      fontWeight: "500",
    },
    summaryValue: {
      color: "#111827",
      fontWeight: "600",
    },
    summaryWarning: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#92400e",
    },
    textarea: {
      padding: "12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      resize: "vertical",
      minHeight: "120px",
      fontFamily: "inherit",
      position: "relative",
    },
    textareaIcon: {
      position: "absolute",
      bottom: "12px",
      right: "12px",
      color: "#9ca3af",
    },
    uploadWrapper: {
      position: "relative",
    },
    uploadButton: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "2px dashed #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
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
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    uploadInfo: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "8px",
    },
    additionalFieldsInfo: {
      fontSize: "14px",
      color: "#6b7280",
      marginTop: "16px",
      fontStyle: "italic",
    },
    actions: {
      display: "flex",
      gap: "12px",
      paddingTop: "24px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "0",
    },
    cancelButton: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    saveDraftButton: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    savePaidButton: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.headerTitle}>
            <Upload size={28} style={{ color: "#111827" }} />
            {isEditMode
              ? "Edit Payment"
              : location.state?.fromBill && location.state?.bill?.billNumber
                ? `Payment for ${location.state.bill.billNumber}`
                : "Record Payment"}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}
        >
          <X size={34} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={(e) => handleSubmit(e, "paid")} style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#f9fafb" }}>
        <div style={{ ...styles.form, flex: 1, padding: "24px", width: "100%", backgroundColor: "#f9fafb" }}>
          {/* Left Column */}
          <div style={styles.leftColumn}>
            {/* Vendor and Payment Details */}
            <div style={styles.section}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Vendor Name<span style={styles.required}>*</span>
                  </label>
                  <div style={{ ...styles.dropdownWrapper, flex: 1 }} ref={vendorRef}>
                    <button
                      type="button"
                      style={styles.dropdownButton}
                      onClick={() => setVendorOpen(!vendorOpen)}
                      onFocus={(e: any) => (e.target.style.borderColor = "#156372")}
                      onBlur={(e: any) => (e.target.style.borderColor = "#d1d5db")}
                    >
                      <span style={formData.vendorName ? {} : { color: "#9ca3af" }}>
                        {formData.vendorName || "Select vendor"}
                      </span>
                      {vendorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {vendorOpen && (
                      <div style={styles.dropdownMenu}>
                        <div style={styles.dropdownSearch}>
                          <Search size={16} style={{ color: "#9ca3af" }} />
                          <input
                            type="text"
                            placeholder="Search vendor"
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            style={styles.dropdownSearchInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div style={styles.dropdownList}>
                          {filteredVendors.length > 0 ? (
                            filteredVendors.map((vendor: any) => (
                              <button
                                key={vendor.id || vendor._id}
                                type="button"
                                style={styles.dropdownItem}
                                onClick={() => handleVendorSelect(vendor)}
                                onMouseEnter={(e: any) => (e.target.style.backgroundColor = "#f9fafb")}
                                onMouseLeave={(e: any) => (e.target.style.backgroundColor = "transparent")}
                              >
                                {vendor.displayName || vendor.name}
                              </button>
                            ))
                          ) : (
                            <div style={styles.noResults}>NO RESULTS FOUND</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  {formData.vendorName && (
                    <button
                      type="button"
                      onClick={() => navigate(`/purchases/vendors/${formData.vendorId}`)}
                      style={{
                        backgroundColor: "#4b5563",
                        color: "white",
                        padding: "10px 18px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        border: "none",
                        marginTop: "30px",
                        width: "300px",
                      }}
                    >
                      {formData.vendorName}'s Details
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.select,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  >
                    <option value="Head Office">Head Office</option>
                    <option value="Branch Office">Branch Office</option>
                  </select>
                </div>
                <div />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Payment #<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="paymentNumber"
                    value={formData.paymentNumber}
                    onChange={handleChange}
                    required
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.input,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  />
                </div>
                <div />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Payment Made<span style={styles.required}>*</span>
                  </label>
                  <div style={styles.paymentMadeRow}>
                    <select
                      name="paymentCurrency"
                      value={formData.paymentCurrency}
                      onChange={handleChange}
                      disabled={!isFormEnabled}
                      style={{
                        ...styles.select,
                        ...styles.currencySelect,
                        ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                      }}
                    >
                      <option value={resolvedBaseCurrency}>{resolvedBaseCurrency}</option>
                    </select>
                    <input
                      type="number"
                      name="paymentAmount"
                      value={formData.paymentAmount}
                      onChange={handleChange}
                      required
                      placeholder="0.00"
                      disabled={!isFormEnabled || formData.payFullAmount}
                      style={{
                        ...styles.input,
                        ...styles.amountInput,
                        ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                      }}
                    />
                  </div>
                  <div style={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      name="payFullAmount"
                      checked={formData.payFullAmount}
                      onChange={handleChange}
                      disabled={!isFormEnabled}
                      style={styles.checkbox}
                    />
                    <label style={{ ...styles.label, fontSize: '13px', fontWeight: 400 }}>
                      Pay full amount ({formData.paymentCurrency}{bills.reduce((sum, b) => sum + getBillDueAmount(b), 0).toFixed(2)})
                    </label>
                  </div>
                  <div style={styles.exchangeRate}>
                    Exchange Rate: 1.00 {resolvedBaseCurrency} = 1.00 {resolvedBaseCurrency}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <div style={styles.bankChargesRow}>
                    <label style={styles.label}>Bank Charges (if any)</label>
                    <Info size={14} style={{ color: "#6b7280" }} />
                  </div>
                  <input
                    type="number"
                    name="bankCharges"
                    value={formData.bankCharges}
                    onChange={handleChange}
                    placeholder="0.00"
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.input,
                      ...styles.bankChargesInput,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Payment Date<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    required
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.input,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Payment Mode
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleChange}
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.select,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Paid Through<span style={styles.required}>*</span>
                  </label>
                  <TabanSelect
                    options={paidThroughAccounts}
                    value={formData.paidThrough}
                    onChange={(selectedName) => {
                      const account = findPaidThroughAccount(selectedName);
                      setFormData(prev => ({
                        ...prev,
                        paidThroughId: String(account?.value || account?.id || account?._id || ""),
                        paidThrough: selectedName
                      }));
                    }}
                    placeholder="Select Account"
                    disabled={!isFormEnabled}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Reference#
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.input,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    name="deductTDS"
                    checked={formData.deductTDS}
                    onChange={handleChange}
                    style={styles.checkbox}
                  />
                  <label style={styles.label}>
                    Deduct TDS Tax
                  </label>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    xcv <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="xcv"
                    value={formData.xcv}
                    onChange={handleChange}
                    disabled={!isFormEnabled}
                    style={{
                      ...styles.select,
                      ...(isFormEnabled ? {} : { backgroundColor: "#f3f4f6", cursor: "not-allowed" }),
                    }}
                  >
                    <option value="None">None</option>
                  </select>
                </div>
                <div />
              </div>
            </div>

            {/* Unpaid Bills Table */}
            {bills.length > 0 && (
              <div style={styles.section}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={styles.sectionTitle}>Unpaid Bills</h3>
                  <div style={styles.clearLink} onClick={() => setAllocations({})}>
                    Clear Applied Amount
                  </div>
                </div>

                <table style={styles.table}>
                  <thead style={styles.tableHeader}>
                    <tr>
                      <th style={styles.tableHeaderCell}>Date</th>
                      <th style={styles.tableHeaderCell}>Bill#</th>
                      <th style={styles.tableHeaderCell}>PO#</th>
                      <th style={styles.tableHeaderCell}>Location</th>
                      <th style={styles.tableHeaderCell}>Bill Amount</th>
                      <th style={styles.tableHeaderCell}>Amount Due</th>
                      <th style={styles.tableHeaderCell}>Payment Made on <Info size={12} style={{ display: 'inline' }} /></th>
                      <th style={styles.tableHeaderCell}>Payment</th>
                    </tr>
                  </thead>
                  <tbody style={styles.tableBody}>
                    {bills.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={styles.emptyState}>
                          No Unpaid Bills
                        </td>
                      </tr>
                    ) : (
                      bills.map((bill) => {
                        const billId = bill.id || bill._id;
                        const allocation = allocations[billId] || 0;
                        const dueAmount = getBillDueAmount(bill);

                        return (
                          <tr key={billId} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              {bill.billDate || bill.date || "--"}
                              {bill.dueDate && (
                                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                  Due Date: {bill.dueDate}
                                </div>
                              )}
                            </td>
                            <td style={styles.tableCell}>{bill.billNumber || "--"}</td>
                            <td style={styles.tableCell}>{bill.poNumber || "PO-00009"}</td>
                            <td style={styles.tableCell}>{bill.location || formData.location || "Head Office"}</td>
                            <td style={styles.tableCell}>{bill.total || "0.00"}</td>
                            <td style={styles.tableCell}>{Number(dueAmount || 0).toFixed(2)}</td>
                            <td style={styles.tableCell}>
                              <input
                                type="date"
                                defaultValue={formData.paymentDate}
                                style={{ ...styles.input, width: "130px", padding: '4px 8px' }}
                              />
                            </td>
                            <td style={styles.tableCell}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                <input
                                  type="number"
                                  value={allocation || ""}
                                  onChange={(e) => handleAllocationChange(billId, e.target.value)}
                                  placeholder="0"
                                  style={{ ...styles.input, width: "100px", textAlign: "right" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAllocationChange(billId, dueAmount.toString())}
                                  style={{ fontSize: "11px", color: "#156372", border: "none", background: "none", cursor: "pointer", padding: 0 }}
                                >
                                  Pay in Full
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={7} style={{ ...styles.tableTotal, textAlign: "right" }}>
                        Total
                      </td>
                      <td style={{ ...styles.tableTotal, textAlign: "right" }}>
                        {totalUsed.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "430px" }}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Amount Paid:</span>
                    <span style={styles.summaryValue}>{parseFloat(formData.paymentAmount || "0").toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Amount used for Payments:</span>
                    <span style={styles.summaryValue}>{totalUsed.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Amount Refunded:</span>
                    <span style={styles.summaryValue}>0.00</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}><AlertTriangle size={14} style={{ color: "#d97706", display: "inline", marginRight: "6px" }} />Amount in Excess:</span>
                    <span style={styles.summaryValue}>{formData.paymentCurrency} {excessAmount.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>Bank Charges :</span>
                    <span style={styles.summaryValue}>{formData.paymentCurrency} {(parseFloat(formData.bankCharges) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ ...styles.section, marginTop: "24px" }}>
                <h3 style={styles.sectionTitle}>Notes (Internal use. Not visible to vendor)</h3>
                <div style={{ position: "relative" }}>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    style={{ ...styles.textarea, width: "100%", minHeight: "90px" }}
                    maxLength={500}
                  />
                </div>
              </div>

              <div style={{ ...styles.section, marginTop: "8px" }}>
                <h3 style={styles.sectionTitle}>Attachments</h3>
                <div style={styles.uploadWrapper} ref={uploadMenuRef}>
                  <button
                    type="button"
                    style={{ ...styles.uploadButton }}
                    onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                  >
                    <Upload size={16} />
                    Upload File
                    <ChevronDown size={14} style={{ marginLeft: "8px" }} />
                  </button>
                  {uploadMenuOpen && (
                    <div style={styles.uploadMenu}>
                      <button
                        type="button"
                        style={styles.uploadMenuItem}
                        onClick={handleAttachFromDesktop}
                      >
                        Attach from Desktop
                      </button>
                      <button type="button" style={styles.uploadMenuItem}>
                        Attach from Cloud
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    multiple
                  />
                </div>
                <div style={styles.uploadInfo}>You can upload a maximum of 5 files, 10MB each</div>
                {uploadedFiles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", width: "420px" }}>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "4px",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ maxWidth: "320px" }}>
                          {file.name} ({formatFileSize(file.size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id)}
                          style={{ color: "#156372", border: "none", background: "none", cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.additionalFieldsInfo}>
                <strong>Additional Fields:</strong> Start adding custom fields for your payments made by going to Settings ? Purchases ? Payments Made.
              </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ ...styles.actions, padding: "14px 24px", width: "100%", backgroundColor: "#f9fafb" }}>
          <button
            type="button"
            disabled={!isFormEnabled || !!saveLoadingState}
            style={{
              ...styles.saveDraftButton,
              ...(isFormEnabled && !saveLoadingState ? {} : { opacity: 0.5, cursor: "not-allowed" }),
            }}
            onClick={(e) => handleSubmit(e as any, "draft")}
            onMouseEnter={(e: any) => {
              if (isFormEnabled) {
                e.target.style.backgroundColor = "#f9fafb";
              }
            }}
            onMouseLeave={(e: any) => {
              if (isFormEnabled) {
                e.target.style.backgroundColor = "#ffffff";
              }
            }}
          >
            {saveLoadingState === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="submit"
            disabled={!isFormEnabled || !!saveLoadingState}
            style={{
              ...styles.savePaidButton,
              ...(isFormEnabled && !saveLoadingState ? {} : { opacity: 0.5, cursor: "not-allowed" }),
            }}
            onMouseEnter={(e: any) => {
              if (isFormEnabled) {
                e.target.style.backgroundColor = "#0D4A52";
              }
            }}
            onMouseLeave={(e: any) => {
              if (isFormEnabled) {
                e.target.style.backgroundColor = "#156372";
              }
            }}
          >
            {saveLoadingState === "paid" ? "Saving..." : "Save as Paid"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={!!saveLoadingState}
            style={styles.cancelButton}
            onMouseEnter={(e: any) => (e.target.style.backgroundColor = "#f9fafb")}
            onMouseLeave={(e: any) => (e.target.style.backgroundColor = "#ffffff")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

