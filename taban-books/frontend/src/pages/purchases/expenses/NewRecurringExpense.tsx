import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
} from "lucide-react";
import { recurringExpensesAPI, vendorsAPI, customersAPI, accountantAPI, bankAccountsAPI, taxesAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import { filterActiveRecords } from "../shared/activeFilters";
import { getBankAccountsFromResponse, getChartAccountsFromResponse, mergeAccountOptions } from "../shared/accountOptions";

const REPEAT_EVERY_OPTIONS = [
  "Week",
  "2 Weeks",
  "Month",
  "2 Months",
  "3 Months",
  "6 Months",
  "Year",
  "2 Years",
  "3 Years"
];

interface AccountOption {
  id: string;
  name: string;
}

interface ContactOption {
  id?: string;
  _id?: string;
  name?: string;
  displayName?: string;
}

interface RecurringExpenseFormData {
  profileName: string;
  location: string;
  repeatEvery: string;
  startDate: string;
  endsOn: string;
  neverExpires: boolean;
  expenseAccount: string;
  expenseAccountId: string;
  amount: string;
  currency: string;
  is_inclusive_tax: boolean;
  tax: string;
  paidThrough: string;
  paidThroughId: string;
  vendor: string;
  vendor_id: string;
  description: string;
  customerName: string;
  customFieldXcv: string;
}

interface RecurringExpensePayload {
  profile_name: string;
  repeat_every: string;
  start_date: string;
  end_date: string | null;
  account_id: string | null;
  account_name: string;
  amount: number;
  currency_code: string;
  paid_through_account_id: string | null;
  paid_through_account_name: string;
  vendor_id?: string;
  vendor_name?: string;
  description?: string;
  customer_name?: string;
  status: string;
  never_expire: boolean;
  tax_id?: string;
}

export default function NewRecurringExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const editExpense = location.state?.editExpense || null;
  const isEditMode = Boolean(location.state?.isEdit && editExpense);

  // Form state
  const [formData, setFormData] = useState<RecurringExpenseFormData>({
    profileName: "",
    location: "Head Office",
    repeatEvery: "Week",
    startDate: new Date().toISOString().split('T')[0],
    endsOn: "",
    neverExpires: true,
    expenseAccount: "",
    expenseAccountId: "",
    amount: "",
    currency: "",
    is_inclusive_tax: false,
    tax: "",
    paidThrough: "",
    paidThroughId: "",
    vendor: "",
    vendor_id: "",
    description: "",
    customerName: "",
    customFieldXcv: "None",
  });

  // Dropdown states
  const [expenseAccountOpen, setExpenseAccountOpen] = useState(false);
  const [expenseAccountSearch, setExpenseAccountSearch] = useState("");
  const [paidThroughOpen, setPaidThroughOpen] = useState(false);
  const [paidThroughSearch, setPaidThroughSearch] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [repeatEveryOpen, setRepeatEveryOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // Data from API
  const [allVendors, setAllVendors] = useState<ContactOption[]>([]);
  const [allCustomers, setAllCustomers] = useState<ContactOption[]>([]);
  const [structuredAccounts, setStructuredAccounts] = useState<Record<string, AccountOption[]>>({});
  const [structuredPaidThrough, setStructuredPaidThrough] = useState<Record<string, AccountOption[]>>({});
  const [availableTaxes, setAvailableTaxes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { code: baseCurrencyCode, loading: baseCurrencyLoading } = useCurrency();

  // Refs
  const expenseAccountRef = useRef<HTMLDivElement>(null);
  const paidThroughRef = useRef<HTMLDivElement>(null);
  const vendorRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const repeatEveryRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Vendors
        const vendorsResponse = await vendorsAPI.getAll();
        if (vendorsResponse && (vendorsResponse.code === 0 || vendorsResponse.status === 'success' || vendorsResponse.success === true)) {
          const vendorsList = filterActiveRecords<ContactOption>(vendorsResponse.vendors || vendorsResponse.data || []);
          setAllVendors(vendorsList);
        }

        // Load Customers
        const customersResponse = await customersAPI.getAll({ limit: 1000 });
        if (customersResponse && (customersResponse.code === 0 || customersResponse.status === 'success' || customersResponse.success === true)) {
          const customersList = filterActiveRecords<ContactOption>(customersResponse.customers || customersResponse.contacts || customersResponse.data || []);
          setAllCustomers(customersList);
        }

        // Load Accounts
        const [accountsResponse, bankAccountsResponse] = await Promise.all([
          accountantAPI.getAccounts({ isActive: true, limit: 1000 }),
          bankAccountsAPI.getAll({ limit: 1000 }),
        ]);
        const mergedAccounts = mergeAccountOptions(
          getChartAccountsFromResponse(accountsResponse),
          getBankAccountsFromResponse(bankAccountsResponse)
        );
        processAccounts(mergedAccounts);

        // Load Purchase Taxes
        try {
          const taxesResponse = await taxesAPI.getForTransactions("purchase");
          const taxes = taxesResponse?.data || taxesResponse?.taxes || [];
          if (Array.isArray(taxes) && taxes.length > 0) {
            setAvailableTaxes(filterActiveRecords(taxes));
          } else {
            const fallbackResponse = await taxesAPI.getAll({ status: "active" }).catch(() => null);
            const fallbackTaxes = fallbackResponse?.data || fallbackResponse?.taxes || [];
            setAvailableTaxes(filterActiveRecords(Array.isArray(fallbackTaxes) ? fallbackTaxes : []));
          }
        } catch (taxError) {
          console.error("Error loading taxes:", taxError);
          const fallbackResponse = await taxesAPI.getAll({ status: "active" }).catch(() => null);
          const fallbackTaxes = fallbackResponse?.data || fallbackResponse?.taxes || [];
          setAvailableTaxes(filterActiveRecords(Array.isArray(fallbackTaxes) ? fallbackTaxes : []));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();

    // Load saved draft form data
    const savedDraft = localStorage.getItem("recurringExpenseDraft");
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...draftData }));
      } catch (e) {
        console.error("Error loading draft:", e);
      }
    }
  }, []);

  const formatDateForInput = (value: any): string => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!isEditMode || !editExpense) return;

    const vendorName =
      editExpense?.vendor_name
      || editExpense?.vendorName
      || editExpense?.vendor?.displayName
      || editExpense?.vendor?.name
      || "";
    const vendorId = editExpense?.vendor_id || editExpense?.vendor?._id || editExpense?.vendor?.id || "";

    const customerName =
      editExpense?.customer_name
      || editExpense?.customerName
      || editExpense?.customer?.displayName
      || editExpense?.customer?.name
      || "";

    const accountName = editExpense?.account_name || editExpense?.expenseAccount || "";
    const accountId = editExpense?.account_id || editExpense?.account?._id || editExpense?.account?.id || "";

    const paidThroughName = editExpense?.paid_through_account_name || editExpense?.paidThrough || "";
    const paidThroughId =
      editExpense?.paid_through_account_id
      || editExpense?.paidThroughId
      || editExpense?.paid_through_account?._id
      || editExpense?.paid_through_account?.id
      || "";

    setFormData((prev) => ({
      ...prev,
      profileName: editExpense?.profile_name || editExpense?.profileName || prev.profileName,
      repeatEvery: editExpense?.repeat_every || editExpense?.repeatEvery || prev.repeatEvery,
      startDate: formatDateForInput(editExpense?.start_date || editExpense?.startDate) || prev.startDate,
      endsOn: formatDateForInput(editExpense?.end_date || editExpense?.endDate) || "",
      neverExpires: Boolean(editExpense?.never_expire ?? !editExpense?.end_date),
      expenseAccount: accountName || prev.expenseAccount,
      expenseAccountId: accountId || prev.expenseAccountId,
      amount: String(editExpense?.amount ?? prev.amount ?? ""),
      currency: editExpense?.currency_code || editExpense?.currency || prev.currency,
      is_inclusive_tax: Boolean(editExpense?.is_inclusive_tax),
      tax: String(editExpense?.tax_id || editExpense?.tax || ""),
      paidThrough: paidThroughName || prev.paidThrough,
      paidThroughId: paidThroughId || prev.paidThroughId,
      vendor: vendorName || prev.vendor,
      vendor_id: vendorId || prev.vendor_id,
      description: editExpense?.description || prev.description,
      customerName: customerName || prev.customerName,
    }));
  }, [isEditMode, editExpense]);

  useEffect(() => {
    if (baseCurrencyCode) {
      setFormData(prev => ({ ...prev, currency: baseCurrencyCode }));
    }
  }, [baseCurrencyCode]);

  const processAccounts = (accounts: any[]) => {
    // Helper to format account type keys
    const formatType = (type: string) => {
      if (!type) return "Other";
      return type
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // 1. Build Expense Structure
    const newExpenseStructure: Record<string, { id: string; name: string }[]> = {};
    const expenseTypes = [
      'expense', 'cost_of_goods_sold', 'other_expense',
      'fixed_asset', 'other_current_asset', 'other_current_liability'
    ];

    const relevantAccounts = accounts.filter((acc: any) =>
      expenseTypes.includes(acc.accountType) ||
      acc.accountType === 'liability' ||
      acc.accountType === 'asset'
    );

    relevantAccounts.forEach((acc: any) => {
      let key = formatType(acc.accountType);
      if (acc.accountType === 'expense' || acc.accountType === 'other_expense') key = 'Expense';

      if (!newExpenseStructure[key]) newExpenseStructure[key] = [];
      newExpenseStructure[key].push({ id: acc._id || acc.id, name: acc.accountName });
    });
    // Sort items by name
    Object.keys(newExpenseStructure).forEach(k => {
      newExpenseStructure[k].sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
    setStructuredAccounts(newExpenseStructure);

    // 2. Build Paid Through Structure
    const newPaidThroughStructure: Record<string, { id: string; name: string }[]> = {};
    const paidThroughTypes = [
      'cash', 'bank', 'equity', 'other_current_liability',
      'credit_card', 'payment_clearing_account', 'other_current_asset'
    ];

    const relevantPaidThrough = accounts.filter((acc: any) =>
      paidThroughTypes.includes(acc.accountType) ||
      acc.accountType === 'liq_asset' ||
      acc.accountType === 'bank' ||
      acc.accountType === 'cash'
    );

    relevantPaidThrough.forEach((acc: any) => {
      let key = formatType(acc.accountType);

      if (!newPaidThroughStructure[key]) newPaidThroughStructure[key] = [];
      newPaidThroughStructure[key].push({ id: acc._id || acc.id, name: acc.accountName });
    });
    // Sort items by name
    Object.keys(newPaidThroughStructure).forEach(k => {
      newPaidThroughStructure[k].sort((a: any, b: any) => a.name.localeCompare(b.name));
    });
    setStructuredPaidThrough(newPaidThroughStructure);
  };

  // Save form data as draft when it changes
  useEffect(() => {
    const draftTimer = setTimeout(() => {
      localStorage.setItem("recurringExpenseDraft", JSON.stringify(formData));
    }, 500);
    return () => clearTimeout(draftTimer);
  }, [formData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expenseAccountRef.current && !expenseAccountRef.current.contains(event.target as Node)) {
        setExpenseAccountOpen(false);
        setExpenseAccountSearch("");
      }
      if (paidThroughRef.current && !paidThroughRef.current.contains(event.target as Node)) {
        setPaidThroughOpen(false);
        setPaidThroughSearch("");
      }
      if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) {
        setVendorOpen(false);
        setVendorSearch("");
      }
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
        setCustomerOpen(false);
        setCustomerSearch("");
      }
      if (repeatEveryRef.current && !repeatEveryRef.current.contains(event.target as Node)) {
        setRepeatEveryOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // content editable or textarea doesn't have checked, but we only check if type is checkbox
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : false;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const calculateNextExpenseDate = () => {
    if (!formData.startDate) return "";
    const startDate = new Date(formData.startDate);
    const frequencyMap = {
      "Week": 7, "2 Weeks": 14, "Month": 30, "2 Months": 60,
      "3 Months": 90, "6 Months": 180, "Year": 365, "2 Years": 730, "3 Years": 1095,
    };
    const days = frequencyMap[formData.repeatEvery as keyof typeof frequencyMap] || 7;
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getFilteredAccounts = () => {
    if (!expenseAccountSearch) return structuredAccounts;
    const filtered: Record<string, any[]> = {};
    Object.entries(structuredAccounts).forEach(([category, items]) => {
      const filteredItems = (items as any[]).filter(item => item.name.toLowerCase().includes(expenseAccountSearch.toLowerCase()));
      if (filteredItems.length > 0 || category.toLowerCase().includes(expenseAccountSearch.toLowerCase())) {
        filtered[category] = filteredItems.length > 0 ? filteredItems : (items as any[]);
      }
    });
    return filtered;
  };

  const getFilteredPaidThrough = () => {
    if (!paidThroughSearch) return structuredPaidThrough;
    const filtered: Record<string, any[]> = {};
    Object.entries(structuredPaidThrough).forEach(([category, items]) => {
      const filteredItems = (items as any[]).filter(item => item.name.toLowerCase().includes(paidThroughSearch.toLowerCase()));
      if (filteredItems.length > 0 || category.toLowerCase().includes(paidThroughSearch.toLowerCase())) {
        filtered[category] = filteredItems.length > 0 ? filteredItems : (items as any[]);
      }
    });
    return filtered;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.profileName.trim()) { alert("Please enter a Profile Name"); return; }
    if (!formData.expenseAccount) { alert("Please select an Expense Account"); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { alert("Please enter a valid Amount"); return; }
    if (!formData.paidThrough) { alert("Please select a Paid Through account"); return; }
    if (!formData.startDate) { alert("Please select a Start Date"); return; }

    try {
      setIsSaving(true);
      const recurringExpenseData: RecurringExpensePayload = {
        profile_name: formData.profileName,
        repeat_every: formData.repeatEvery,
        start_date: formData.startDate,
        end_date: formData.neverExpires ? null : formData.endsOn,
        account_id: formData.expenseAccountId || null,
        account_name: formData.expenseAccount,
        amount: parseFloat(formData.amount),
        currency_code: formData.currency,
        paid_through_account_id: formData.paidThroughId || null,
        paid_through_account_name: formData.paidThrough,
        vendor_id: formData.vendor_id || undefined,
        vendor_name: formData.vendor || undefined,
        description: formData.description || undefined,
        customer_name: formData.customerName || undefined,
        status: "active",
        never_expire: formData.neverExpires
      };
      if (formData.tax) recurringExpenseData.tax_id = formData.tax;

      // Validate that we have account IDs
      if (!recurringExpenseData.account_id) {
        alert("Please select an expense account from the dropdown");
        return;
      }
      if (!recurringExpenseData.paid_through_account_id) {
        alert("Please select a paid through account from the dropdown");
        return;
      }

      const editId = editExpense?._id || editExpense?.id || editExpense?.recurring_expense_id;
      const response = isEditMode && editId
        ? await recurringExpensesAPI.update(editId, recurringExpenseData)
        : await recurringExpensesAPI.create(recurringExpenseData);

      if (response && (response.code === 0 || response.success)) {
        const recurringExpenseId =
          response.recurring_expense?._id
          || response.data?._id
          || editId;

        // Automatically generate the first expense only for new profiles
        if (!isEditMode && recurringExpenseId) {
          try {
            await recurringExpensesAPI.generateExpense(recurringExpenseId);
            console.log("First expense generated successfully");
          } catch (genError) {
            console.error("Error generating initial expense:", genError);
            // We don't block the redirect if generation fails, as the profile is already created
          }
        }

        localStorage.removeItem("recurringExpenseDraft");
        window.dispatchEvent(new Event("recurringExpensesUpdated"));

        // Show success message and navigate
        alert(isEditMode ? "Recurring expense updated successfully." : "Recurring expense created and initial expense generated successfully.");
        navigate("/purchases/recurring-expenses");
      } else {
        alert(response?.message || `Failed to ${isEditMode ? "update" : "create"} recurring expense`);
      }
    } catch (error) {
      console.error("Error creating recurring expense:", error);
      alert(`An error occurred while ${isEditMode ? "updating" : "creating"} the recurring expense.`);
    } finally {
      setIsSaving(false);
    }
  };

  const styles = {
    page: { height: "100vh", width: "100%", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column", overflow: "hidden" } as React.CSSProperties,
    header: { padding: "16px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" },
    input: { padding: "8px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", width: "100%", boxSizing: "border-box" },
    dropdownMenu: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", zIndex: 1000, maxHeight: "300px", overflowY: "auto" },
    searchInput: { padding: "8px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#ffffff", position: "sticky", top: 0 },
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={20} color="#374151" />
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111827", margin: 0 }}>New Recurring Expense</h1>
        </div>
        <button onClick={() => navigate("/purchases/recurring-expenses")} style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}><X size={20} /></button>
      </div>

      <div style={{ flex: 1, padding: "24px", overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Profile Name */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Profile Name<span style={{ color: "#156372" }}>*</span></label>
            <input type="text" name="profileName" value={formData.profileName} onChange={handleChange} style={{ ...styles.input, maxWidth: "375px", backgroundColor: "#f9fafb" } as React.CSSProperties} />
          </div>

          {/* Location */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Location</label>
            <select
              name="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              style={{ ...styles.input, maxWidth: "375px", backgroundColor: "#f9fafb" } as React.CSSProperties}
            >
              <option value="Head Office">Head Office</option>
            </select>
          </div>

          {/* Repeat Every */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Repeat Every<span style={{ color: "#156372" }}>*</span></label>
            <div style={{ position: "relative", maxWidth: "375px" }} ref={repeatEveryRef}>
              <div onClick={() => setRepeatEveryOpen(!repeatEveryOpen)} style={{ ...styles.input, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" } as React.CSSProperties}>
                {formData.repeatEvery}
                {repeatEveryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {repeatEveryOpen && (
                <div style={styles.dropdownMenu as React.CSSProperties}>
                  {REPEAT_EVERY_OPTIONS.map(opt => (
                    <div key={opt} onClick={() => { setFormData(prev => ({ ...prev, repeatEvery: opt })); setRepeatEveryOpen(false); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"} onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Start Date */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "start" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", paddingTop: "8px" }}>Start Date</label>
            <div style={{ width: "100%", maxWidth: "375px" }}>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} style={{ ...styles.input, backgroundColor: "#f9fafb" } as React.CSSProperties} />
              {formData.startDate && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>The recurring expense will be created on {calculateNextExpenseDate()}</div>}
            </div>
          </div>

          {/* Ends On */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "start" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", paddingTop: "8px" }}>Ends On</label>
            <div style={{ maxWidth: "375px" }}>
              <input type="date" name="endsOn" value={formData.endsOn} onChange={handleChange} disabled={formData.neverExpires} style={{ ...styles.input, backgroundColor: formData.neverExpires ? "#f3f4f6" : "#ffffff", cursor: formData.neverExpires ? "not-allowed" : "text" } as React.CSSProperties} />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <input type="checkbox" name="neverExpires" checked={formData.neverExpires} onChange={handleChange} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                <label style={{ fontSize: "14px", color: "#374151" }}>Never Expires</label>
              </div>
            </div>
          </div>

          {/* Expense Account */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Expense Account<span style={{ color: "#156372" }}>*</span></label>
            <div style={{ position: "relative", maxWidth: "375px" }} ref={expenseAccountRef}>
              <div onClick={() => setExpenseAccountOpen(!expenseAccountOpen)} style={{ ...styles.input, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" } as React.CSSProperties}>
                <span style={{ color: formData.expenseAccount ? "#000" : "#9ca3af" }}>{formData.expenseAccount || "Select an account"}</span>
                {expenseAccountOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {expenseAccountOpen && (
                <div style={styles.dropdownMenu as React.CSSProperties}>
                  <div style={styles.searchInput as React.CSSProperties}>
                    <Search size={14} color="#9ca3af" />
                    <input type="text" placeholder="Search..." value={expenseAccountSearch} onChange={e => setExpenseAccountSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }} />
                  </div>
                  {Object.entries(getFilteredAccounts()).map(([cat, items]) => (
                    <div key={cat}>
                      <div style={{ padding: "8px 12px", fontSize: "12px", fontWeight: "bold", color: "#6b7280", backgroundColor: "#f9fafb" }}>{cat}</div>
                      {(items as any[]).map(acc => (
                        <div key={acc.id} onClick={() => { setFormData(prev => ({ ...prev, expenseAccount: acc.name, expenseAccountId: acc.id })); setExpenseAccountOpen(false); }} style={{ padding: "8px 24px", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"} onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}>{acc.name}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Amount<span style={{ color: "#156372" }}>*</span></label>
            <div style={{ display: "flex", maxWidth: "375px" }}>
              <div style={{ position: "relative" }} ref={currencyRef}>
                <div onClick={() => setCurrencyOpen(!currencyOpen)} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "6px 0 0 6px", cursor: "pointer", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", gap: "4px" }}>
                  {baseCurrencyCode || (formData.currency || "").split(" - ")[0]} <ChevronDown size={14} />
                </div>
                {currencyOpen && (
                  <div style={{ ...styles.dropdownMenu, minWidth: "80px" } as React.CSSProperties}>
                    <div
                      onClick={() => { setFormData(prev => ({ ...prev, currency: baseCurrencyCode || prev.currency })); setCurrencyOpen(false); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}
                    >
                      {baseCurrencyCode || "USD"}
                    </div>
                  </div>
                )}
              </div>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="" style={{ ...styles.input, borderRadius: "0 6px 6px 0", backgroundColor: "#f9fafb" } as React.CSSProperties} />
            </div>
          </div>

          {/* Amount Is */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Amount Is<span style={{ color: "#156372" }}>*</span></label>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#111827" }}>
                <input type="radio" checked={formData.is_inclusive_tax === true} onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: true }))} />
                Tax Inclusive
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#111827" }}>
                <input type="radio" checked={formData.is_inclusive_tax === false} onChange={() => setFormData(prev => ({ ...prev, is_inclusive_tax: false }))} />
                Tax Exclusive
              </label>
            </div>
          </div>

          {/* Tax */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Tax</label>
            <select
              name="tax"
              value={formData.tax}
              onChange={(e) => setFormData(prev => ({ ...prev, tax: e.target.value }))}
              style={{ ...styles.input, maxWidth: "375px", backgroundColor: "#f9fafb" } as React.CSSProperties}
            >
              <option value="">Select a Tax</option>
              {availableTaxes.map((tax: any) => {
                const taxId = tax?._id || tax?.id;
                const taxName = tax?.taxName || tax?.name || tax?.tax_name || "Tax";
                const rate = Number(tax?.taxPercentage ?? tax?.rate ?? tax?.percentage ?? 0);
                return (
                  <option key={String(taxId)} value={String(taxId)}>
                    {rate ? `${taxName} (${rate}%)` : taxName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Paid Through */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>Paid Through<span style={{ color: "#156372" }}>*</span></label>
            <div style={{ position: "relative", maxWidth: "375px" }} ref={paidThroughRef}>
              <div onClick={() => setPaidThroughOpen(!paidThroughOpen)} style={{ ...styles.input, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" } as React.CSSProperties}>
                <span style={{ color: formData.paidThrough ? "#000" : "#9ca3af" }}>{formData.paidThrough || "Select an account"}</span>
                {paidThroughOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {paidThroughOpen && (
                <div style={styles.dropdownMenu as React.CSSProperties}>
                  <div style={styles.searchInput as React.CSSProperties}>
                    <Search size={14} color="#9ca3af" />
                    <input type="text" placeholder="Search..." value={paidThroughSearch} onChange={e => setPaidThroughSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }} />
                  </div>
                  {Object.entries(getFilteredPaidThrough()).map(([cat, items]) => (
                    <div key={cat}>
                      <div style={{ padding: "8px 12px", fontSize: "12px", fontWeight: "bold", color: "#6b7280", backgroundColor: "#f9fafb" }}>{cat}</div>
                      {(items as any[]).map(acc => (
                        <div key={acc.id} onClick={() => { setFormData(prev => ({ ...prev, paidThrough: acc.name, paidThroughId: acc.id })); setPaidThroughOpen(false); }} style={{ padding: "8px 24px", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"} onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}>{acc.name}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vendor */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Vendor</label>
            <div style={{ position: "relative", maxWidth: "406px", display: "flex" }} ref={vendorRef}>
              <div onClick={() => setVendorOpen(!vendorOpen)} style={{ ...styles.input, borderRadius: "6px 0 0 6px", borderRight: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb", flex: 1 } as React.CSSProperties}>
                <span style={{ color: formData.vendor ? "#000" : "#9ca3af" }}>{formData.vendor || ""}</span>
                {vendorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              <button type="button" style={{ width: "34px", border: "1px solid #156372", borderRadius: "0 6px 6px 0", backgroundColor: "#156372", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Search size={14} />
              </button>
              {vendorOpen && (
                <div style={{ ...styles.dropdownMenu, right: "34px" } as React.CSSProperties}>
                  <div style={styles.searchInput as React.CSSProperties}>
                    <Search size={14} color="#9ca3af" />
                    <input type="text" placeholder="Search..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }} />
                  </div>
                  {allVendors.filter((v: any) => (v.displayName || v.name || "").toLowerCase().includes(vendorSearch.toLowerCase())).map((v: any) => (
                    <div key={v.id || v._id} onClick={() => { setFormData(prev => ({ ...prev, vendor: v.displayName || v.name, vendor_id: v._id || v.id })); setVendorOpen(false); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"} onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}>
                      {v.displayName || v.name}
                    </div>
                  ))}
                  {allVendors.length === 0 && <div style={{ padding: "8px 12px", color: "#6b7280" }}>No vendors found</div>}
                </div>
              )}
            </div>
          </div>

          {/* Customer */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Customer Name</label>
            <div style={{ position: "relative", maxWidth: "406px", display: "flex" }} ref={customerRef}>
              <div onClick={() => setCustomerOpen(!customerOpen)} style={{ ...styles.input, borderRadius: "6px 0 0 6px", borderRight: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb", flex: 1 } as React.CSSProperties}>
                <span style={{ color: formData.customerName ? "#000" : "#9ca3af" }}>{formData.customerName || ""}</span>
                {customerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              <button type="button" style={{ width: "34px", border: "1px solid #156372", borderRadius: "0 6px 6px 0", backgroundColor: "#156372", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Search size={14} />
              </button>
              {customerOpen && (
                <div style={{ ...styles.dropdownMenu, right: "34px" } as React.CSSProperties}>
                  <div style={styles.searchInput as React.CSSProperties}>
                    <Search size={14} color="#9ca3af" />
                    <input type="text" placeholder="Search..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} onClick={e => e.stopPropagation()} autoFocus style={{ border: "none", outline: "none", width: "100%", fontSize: "14px" }} />
                  </div>
                  {allCustomers.filter((c: any) => (c.displayName || c.name || "").toLowerCase().includes(customerSearch.toLowerCase())).map((c: any) => (
                    <div key={c.id || c._id} onClick={() => { setFormData(prev => ({ ...prev, customerName: c.displayName || c.name })); setCustomerOpen(false); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }} onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = "#f3f4f6"} onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = "transparent"}>
                      {c.displayName || c.name}
                    </div>
                  ))}
                  {allCustomers.length === 0 && <div style={{ padding: "8px 12px", color: "#6b7280" }}>No customers found</div>}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "start" }}>
            <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", paddingTop: "8px" }}>Notes</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Max. 500 characters" style={{ ...styles.input, maxWidth: "375px", height: "66px", fontFamily: "inherit", backgroundColor: "#f9fafb" } as React.CSSProperties} />
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "14px", marginTop: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", alignItems: "center" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#156372" }}>xcv *</label>
              <select
                name="customFieldXcv"
                value={formData.customFieldXcv}
                onChange={(e) => setFormData(prev => ({ ...prev, customFieldXcv: e.target.value }))}
                style={{ ...styles.input, maxWidth: "245px", backgroundColor: "#f9fafb" } as React.CSSProperties}
              >
                <option value="None">None</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-start", gap: "10px", marginTop: "20px", paddingTop: "10px", borderTop: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
            <button onClick={handleSave} disabled={isSaving} style={{ padding: "8px 16px", fontSize: "14px", border: "none", borderRadius: "6px", backgroundColor: "#156372", color: "#ffffff", cursor: "pointer", opacity: isSaving ? 0.7 : 1 }}>{isSaving ? "Saving..." : "Save"}</button>
            <button onClick={() => navigate("/purchases/recurring-expenses")} disabled={isSaving} style={{ padding: "8px 16px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#ffffff", cursor: "pointer", color: "#374151", opacity: isSaving ? 0.7 : 1 }}>Cancel</button>
          </div>

        </div>
      </div>
    </div>
  );
}
