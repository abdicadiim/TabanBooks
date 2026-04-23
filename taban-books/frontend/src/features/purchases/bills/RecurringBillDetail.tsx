import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  MoreVertical,
  X,
  Edit,
  FileText,
  User,
  Trash2,
  Copy,
} from "lucide-react";

import { recurringBillsAPI } from "../../../services/api";
import toast from "react-hot-toast";
import { useCurrency } from "../../../hooks/useCurrency";

export default function RecurringBillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  
  // Use location state if available for instant loading
  const [recurringBill, setRecurringBill] = useState(() => {
    if (location.state?.bill && (location.state.bill.id === id || location.state.bill._id === id)) {
      return location.state.bill;
    }
    return null;
  });

  const [recurringBills, setRecurringBills] = useState([]);
  const [isLoading, setIsLoading] = useState(!recurringBill);
  const [activeTab, setActiveTab] = useState("Overview");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [childBillsExpanded, setChildBillsExpanded] = useState(true);
  const buttonClickedRef = useRef(false);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        const listResponse = await recurringBillsAPI.getAll();
        if (listResponse && (listResponse.code === 0 || listResponse.success)) {
          const loadedBills = listResponse.recurring_bills || listResponse.data || [];
          setRecurringBills(loadedBills.map(b => ({
            ...b,
            id: b.id || b._id,
            vendorName: b.vendor_name || b.vendorName,
            profileName: b.profile_name || b.profileName,
            amount: b.total || b.amount,
            frequency: b.repeat_every || b.repeatEvery,
            nextBillDate: b.next_bill_date ? new Date(b.next_bill_date).toLocaleDateString() : (b.nextBillDate || '-')
          })));
        }
      } catch (error) {
        console.error("Error loading sidebar data:", error);
      }
    };
    loadSidebarData();

    const handleUpdate = () => loadSidebarData();
    window.addEventListener("recurringBillsUpdated", handleUpdate);
    return () => window.removeEventListener("recurringBillsUpdated", handleUpdate);
  }, []);

  useEffect(() => {
    const loadDetailData = async () => {
      if (!id) return;
      // Only show spinner if we don't already have some data
      if (!recurringBill) setIsLoading(true);
      try {
        const detailResponse = await recurringBillsAPI.getById(id);
        if (detailResponse && (detailResponse.code === 0 || detailResponse.success)) {
          let bill = detailResponse.recurring_bill || detailResponse.data;
          bill = {
            ...bill,
            vendorName: bill.vendor_name || bill.vendorName,
            profileName: bill.profile_name || bill.profileName,
            repeatEvery: bill.repeat_every || bill.repeatEvery,
            startOn: bill.start_date || bill.startOn,
            endsOn: bill.end_date || bill.endsOn,
            amount: bill.total || bill.amount,
            status: bill.status ? bill.status.toUpperCase() : "ACTIVE",
            nextBillDate: bill.next_bill_date ? new Date(bill.next_bill_date).toLocaleDateString() : (bill.nextBillDate || '-'),
          };
          setRecurringBill(bill);
        }
      } catch (error) {
        console.error("Error loading detail data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDetailData();
  }, [id]);

  useEffect(() => {
    if (!moreMenuOpen) return;

    const handleClickOutside = (event) => {
      // Ignore if we just clicked the button
      if (buttonClickedRef.current) {
        buttonClickedRef.current = false;
        return;
      }

      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };

    // Use click event instead of mousedown
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [moreMenuOpen]);

  const handleEdit = () => {
    navigate("/purchases/recurring-bills/new", {
      state: {
        editBill: recurringBill,
        isEdit: true,
      },
    });
  };

  const handleCreateBill = () => {
    if (!recurringBill) return;

    // Navigate to create bill page with recurring bill data pre-filled
    navigate("/purchases/bills/new", {
      state: {
        fromRecurringBill: true,
        vendorName: recurringBill.vendorName || "",
        items: recurringBill.items || [],
        paymentTerms: recurringBill.paymentTerms || "Due on Receipt",
        accountsPayable: recurringBill.accountsPayable || "Accounts Payable",
        notes: recurringBill.notes || "",
        billDate: new Date().toISOString().split("T")[0],
        dueDate: new Date().toISOString().split("T")[0],
        amount: recurringBill.amount || "0.00",
        currency: resolvedBaseCurrency,
      },
    });
  };

  const handleDelete = async () => {
    if (!recurringBill) return;

    if (window.confirm("Are you sure you want to delete this recurring bill?")) {
      try {
        await recurringBillsAPI.delete(id);
        toast.success("Recurring bill deleted successfully");
        navigate("/purchases/recurring-bills");
      } catch (error) {
        console.error("Error deleting recurring bill:", error);
        toast.error("Failed to delete recurring bill");
      }
    }
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

  const handleClone = async () => {
    setMoreMenuOpen(false);
    if (!recurringBill) return;

    try {
      const sourceId = String(recurringBill._id || recurringBill.id || id || "");
      const sourceResponse = sourceId ? await recurringBillsAPI.getById(sourceId) : null;
      const sourceBill = sourceResponse?.recurring_bill || sourceResponse?.data || recurringBill;

      if (!sourceBill) {
        throw new Error("Could not load recurring bill details for cloning.");
      }

      const vendorId = toEntityId(sourceBill.vendor || sourceBill.vendor_id);
      if (!vendorId) {
        throw new Error("Cannot clone this recurring bill because it has no vendor.");
      }

      const sourceItems = Array.isArray(sourceBill.items) ? sourceBill.items : [];
      const clonedItems = sourceItems.map((item: any) => {
        const quantity = Math.max(1, toFiniteNumber(item?.quantity, 1));
        const unitPrice = toFiniteNumber(item?.unitPrice ?? item?.rate ?? item?.price, 0);
        const total = toFiniteNumber(item?.total ?? item?.amount, quantity * unitPrice);

        return {
          item: toEntityId(item?.item || item?.itemId) || undefined,
          name: item?.name || item?.itemDetails || item?.description || "Item",
          description: item?.description || item?.itemDetails || item?.name || "",
          quantity,
          unitPrice,
          total,
          account: item?.account || "",
          tax: item?.tax || "",
        };
      });

      const subtotal = toFiniteNumber(sourceBill.subtotal ?? sourceBill.subTotal);
      const tax = toFiniteNumber(sourceBill.tax ?? sourceBill.taxAmount);
      const discount = toFiniteNumber(sourceBill.discount);
      const totalFromSource = toFiniteNumber(sourceBill.total ?? sourceBill.amount);
      const computedTotal = subtotal + tax - discount;
      const total = totalFromSource > 0 ? totalFromSource : Math.max(0, computedTotal);

      if (total <= 0) {
        throw new Error("Cannot clone recurring bill because total amount is invalid.");
      }

      const profileBase = String(sourceBill.profile_name || sourceBill.profileName || "Recurring Bill").trim();
      const clonedProfileName = /copy|clone/i.test(profileBase) ? profileBase : `${profileBase} (Copy)`;

      const clonePayload = {
        profile_name: clonedProfileName,
        repeat_every: sourceBill.repeat_every || sourceBill.repeatEvery || "months",
        start_date: toISODate(sourceBill.start_date || sourceBill.startOn),
        end_date: (sourceBill.never_expire || sourceBill.neverExpires)
          ? null
          : (sourceBill.end_date || sourceBill.endsOn ? toISODate(sourceBill.end_date || sourceBill.endsOn) : null),
        never_expire: sourceBill.never_expire ?? sourceBill.neverExpires ?? true,
        accounts_payable: sourceBill.accounts_payable || sourceBill.accountsPayable || "Accounts Payable",
        vendor: vendorId,
        vendor_name: sourceBill.vendor_name || sourceBill.vendorName || "",
        items: clonedItems,
        subtotal,
        tax,
        tax_mode: sourceBill.tax_mode || sourceBill.taxMode,
        tax_level: sourceBill.tax_level || sourceBill.taxLevel,
        discount,
        total,
        currency: sourceBill.currency || resolvedBaseCurrency,
        paymentTerms: sourceBill.paymentTerms || sourceBill.payment_terms || "Due on Receipt",
        notes: sourceBill.notes || "",
        status: "active",
      };

      const cloneResponse = await recurringBillsAPI.create(clonePayload);
      if (!cloneResponse || (!cloneResponse.success && cloneResponse.code !== 0)) {
        throw new Error(cloneResponse?.message || "Failed to clone recurring bill.");
      }

      const clonedRecurringBillId =
        cloneResponse?.recurring_bill?._id
        || cloneResponse?.recurring_bill?.id
        || cloneResponse?.data?._id
        || cloneResponse?.data?.id;

      window.dispatchEvent(new Event("recurringBillsUpdated"));

      if (clonedRecurringBillId) {
        toast.success("Recurring bill cloned successfully");
        navigate(`/purchases/recurring-bills/${clonedRecurringBillId}`);
        return;
      }

      toast.success("Recurring bill cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning recurring bill:", error);
      toast.error(error?.message || "Failed to clone recurring bill");
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        padding: "24px", 
        minHeight: "100vh", 
        backgroundColor: "#ffffff", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #f3f4f6",
          borderTop: "3px solid #156372",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px"
        }} />
        <p style={{ fontSize: "14px", color: "#6b7280" }}>Loading recurring bill details...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!recurringBill) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "16px" }}>Recurring bill not found</p>
        <button
          onClick={() => navigate("/purchases/recurring-bills")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#156372",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          Back to Recurring Bills
        </button>
      </div>
    );
  }

  const styles = {
    container: {
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      position: "relative",
    },
    sidebar: {
      width: "280px",
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
    },
    sidebarTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    dropdownWrapper: {
      position: "relative",
      display: "inline-block",
    },
    sidebarActions: {
      display: "flex",
      gap: "8px",
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
    sidebarMoreButton: {
      padding: "6px",
      backgroundColor: "#f3f4f6",
      color: "#111827",
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
    },
    sidebarItemActive: {
      backgroundColor: "#eff6ff",
      borderLeft: "3px solid #156372",
    },
    sidebarItemContent: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "8px",
    },
    sidebarItemLeft: {
      flex: 1,
    },
    sidebarItemVendor: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "4px",
    },
    sidebarItemProfile: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "8px",
    },
    sidebarItemRight: {
      textAlign: "right",
    },
    sidebarItemAmount: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "4px",
    },
    sidebarItemFrequency: {
      fontSize: "12px",
      color: "#6b7280",
      marginBottom: "4px",
    },
    sidebarItemStatus: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#10b981",
      marginBottom: "4px",
    },
    sidebarItemNextBill: {
      fontSize: "12px",
      color: "#6b7280",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    },
    header: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
      position: "relative",
      overflow: "visible",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    headerTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    headerButton: {
      padding: "8px 12px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#111827",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    headerIconButton: {
      padding: "8px",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: "0",
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      minHeight: 0, // Important for flex scrolling
      height: "100%",
    },
    tabs: {
      display: "flex",
      gap: "24px",
      borderBottom: "1px solid #e5e7eb",
      padding: "0 24px",
      paddingTop: "16px",
    },
    tab: {
      padding: "12px 0",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
    },
    tabActive: {
      color: "#111827",
      borderBottom: "2px solid #2563eb",
    },
    section: {
      marginBottom: "32px",
    },
    summaryRow: {
      display: "flex",
      gap: "32px",
      padding: "16px",
      backgroundColor: "#f9fafb",
      borderRadius: "8px",
      marginBottom: "24px",
    },
    summaryItem: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    summaryLabel: {
      fontSize: "12px",
      color: "#6b7280",
      fontWeight: "500",
    },
    summaryValue: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
    },
    summaryValueBlue: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#156372",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "16px",
      textTransform: "uppercase",
    },
    detailsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    detailItem: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    detailLabel: {
      fontSize: "14px",
      color: "#6b7280",
      fontWeight: "500",
    },
    detailValue: {
      fontSize: "14px",
      color: "#111827",
    },
    statusTag: {
      display: "inline-block",
      padding: "4px 12px",
      fontSize: "12px",
      fontWeight: "500",
      color: "#f97316",
      backgroundColor: "#fed7aa",
      borderRadius: "4px",
      width: "fit-content",
    },
    childBillsHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
      cursor: "pointer",
    },
    childBillsList: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    childBillItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "16px",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
    },
    childBillLeft: {
      flex: 1,
    },
    childBillVendor: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "8px",
    },
    childBillProfile: {
      fontSize: "14px",
      color: "#156372",
      marginBottom: "4px",
    },
    childBillDate: {
      fontSize: "14px",
      color: "#6b7280",
    },
    childBillRight: {
      textAlign: "right",
    },
    childBillAmount: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "4px",
    },
    moreDropdownWrapper: {
      position: "relative",
      display: "inline-block",
      zIndex: 1001,
    },
    moreButton: {
      padding: "8px",
      color: "#111827",
      backgroundColor: "#f3f4f6",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
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
      zIndex: 1000,
      padding: "4px 0",
    },
    moreDropdownItem: {
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
  };

  // Sample child bills data (in a real app, this would come from the recurring bill or be stored separately)
  // For now, we'll generate child bills based on the recurring bill's frequency and start date
  const generateChildBills = () => {
    if (!recurringBill) return [];

    const childBills = [];
    const startDate = new Date(recurringBill.startOn || recurringBill.lastBillDate || new Date());
    const today = new Date();

    // Format date as DD Mon YYYY (e.g., "13 Dec 2025")
    const formatDateForChildBill = (date) => {
      const day = date.getDate();
      const month = date.toLocaleString("en-GB", { month: "short" });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };

    // Always show at least one child bill - use the start date
    const firstBillDate = new Date(startDate);
    const dateStr = formatDateForChildBill(firstBillDate);

    childBills.push({
      id: `child-1`,
      vendorName: recurringBill.vendorName || "RVSD",
      profileName: recurringBill.profileName || "sc",
      date: dateStr,
      amount: `${resolvedBaseCurrencySymbol}${parseFloat(recurringBill.amount || 0).toFixed(2)}`,
      status: "OVERDUE",
    });

    return childBills.length > 0 ? childBills : [{
      id: "child-1",
      vendorName: recurringBill.vendorName || "RVSD",
      profileName: recurringBill.profileName || "sc",
      date: startDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      amount: `${resolvedBaseCurrencySymbol}${parseFloat(recurringBill.amount || 0).toFixed(2)}`,
      status: recurringBill.status || "STOPPED",
    }];
  };

  const childBills = generateChildBills();

  return (
    <div style={styles.container}>
      {/* Left Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.dropdownWrapper} ref={dropdownRef}>
            <h2 style={styles.sidebarTitle}>
              All Recurring Bills
              <button
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </h2>
          </div>
          <div style={styles.sidebarActions}>
            <button
              style={styles.sidebarButton}
              onClick={() => navigate("/purchases/recurring-bills/new")}
            >
              <Plus size={16} />
            </button>
            <button style={styles.sidebarMoreButton}>
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        {/* Selected Bill Details in Sidebar removed as per new UI */}

        <div style={styles.sidebarList}>
          {recurringBills.map((bill) => (
            <div
              key={bill.id}
              style={{
                ...styles.sidebarItem,
                ...(bill.id === id ? styles.sidebarItemActive : {}),
              }}
              onClick={() => navigate(`/purchases/recurring-bills/${bill.id}`)}
              onMouseEnter={(e) => {
                if (bill.id !== id) {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (bill.id !== id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <div style={styles.sidebarItemContent}>
                <div style={styles.sidebarItemLeft}>
                  <div style={styles.sidebarItemVendor}>{bill.vendorName}</div>
                  <div style={styles.sidebarItemProfile}>{bill.profileName}</div>
                </div>
                <div style={styles.sidebarItemRight}>
                  <div style={styles.sidebarItemAmount}>{resolvedBaseCurrencySymbol} {parseFloat(bill.amount || 0).toFixed(2)}</div>
                  <div style={styles.sidebarItemFrequency}>{bill.frequency}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={styles.sidebarItemStatus}>{bill.status}</div>
                <div style={styles.sidebarItemNextBill}>Next Bill on {bill.nextBillDate}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>{recurringBill.profileName}</h1>
          </div>
          <div style={styles.headerRight}>
            <button
              style={styles.headerIconButton}
              onClick={handleEdit}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              <Edit size={18} />
            </button>
            <button
              style={styles.headerButton}
              onClick={handleCreateBill}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#ffffff";
              }}
            >
              <FileText size={16} />
              Create Bill
            </button>
            <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
              <button
                type="button"
                style={styles.moreButton}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  buttonClickedRef.current = true;
                  setMoreMenuOpen(!moreMenuOpen);
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f3f4f6";
                }}
              >
                <MoreVertical size={18} />
              </button>
              {moreMenuOpen && (
                <div
                  style={styles.moreDropdown}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Clone */}
                  <button
                    style={{
                      ...styles.moreDropdownItem,
                      display: "flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                    onClick={handleClone}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Copy size={16} style={{ color: "#6b7280" }} />
                      <span>Clone</span>
                    </div>
                  </button>

                  <div style={{ borderTop: "1px solid #e5e7eb", margin: "4px 0" }}></div>

                  {/* Delete */}
                  <button
                    style={{
                      ...styles.moreDropdownItem,
                      display: "flex",
                      alignItems: "center",
                      color: "#156372",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#fef2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                    onClick={handleDelete}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Trash2 size={16} style={{ color: "#156372" }} />
                      <span>Delete</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button
              style={styles.headerIconButton}
              onClick={() => navigate("/purchases/recurring-bills")}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === "Overview" ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab("Overview")}
            >
              Overview
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === "Next Bill" ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab("Next Bill")}
            >
              Next Bill
            </button>
          </div>

          {activeTab === "Overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", minHeight: "calc(100% - 60px)" }}>
              {/* Left Column - Details */}
              <div style={{ padding: "32px", borderRight: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px" }}>
                  <div style={{ 
                    width: "48px", height: "48px", borderRadius: "50%", border: "1px solid #e5e7eb", 
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" 
                  }}>
                    <User size={24} />
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "500", color: "#2563eb" }}>
                    {recurringBill.vendorName}
                  </div>
                </div>

                <h3 style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.5px", marginBottom: "24px" }}>
                  DETAILS
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Profile Status:</span>
                    <span style={{
                      display: "inline-block", padding: "4px 10px", fontSize: "11px", fontWeight: "600",
                      color: "#ffffff",
                      backgroundColor: recurringBill.status.toLowerCase() === "active" ? "#10b981" : "#f59e0b",
                      borderRadius: "4px", width: "fit-content", textTransform: "uppercase"
                    }}>
                      {recurringBill.status}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Location:</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>Head Office</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Start Date:</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>{recurringBill.lastBillDate || recurringBill.startOn || "-"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>End Date:</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>{recurringBill.neverExpires ? "Never Expires" : recurringBill.endsOn || "-"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Payment Terms:</span>
                    <span style={{ fontSize: "13px", color: "#111827" }}>{recurringBill.paymentTerms || "Due on Receipt"}</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Financials & Child Bills */}
              <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
                {/* Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "24px 0", borderBottom: "1px solid #e5e7eb", margin: "0 24px" }}>
                  <div style={{ textAlign: "center", borderRight: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>Bill Amount</div>
                    <div style={{ fontSize: "15px", fontWeight: "500", color: "#b91c1c" }}>{resolvedBaseCurrencySymbol}{parseFloat(recurringBill.amount || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: "center", borderRight: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>Next Bill Date</div>
                    <div style={{ fontSize: "15px", fontWeight: "500", color: "#2563eb" }}>{recurringBill.nextBillDate || "--"}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>Recurring Period</div>
                    <div style={{ fontSize: "15px", fontWeight: "500", color: "#111827" }}>{recurringBill.repeatEvery || "Weekly"}</div>
                  </div>
                </div>

                {/* Child Bills List */}
                <div style={{ padding: "32px 24px" }}>
                  <div 
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "32px" }}
                    onClick={() => setChildBillsExpanded(!childBillsExpanded)}
                  >
                    <span style={{ fontSize: "15px", color: "#374151" }}>All Child Bills</span>
                    {childBillsExpanded ? <ChevronDown size={16} color="#2563eb" /> : <ChevronUp size={16} color="#2563eb" />}
                  </div>

                  {childBillsExpanded && childBills.map((bill, index) => (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "20px", borderBottom: "1px solid #f3f4f6", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "14px", color: "#111827", marginBottom: "8px" }}>{bill.vendorName}</div>
                        <div style={{ fontSize: "13px", color: "#2563eb" }}>
                          {bill.profileName} | {bill.date}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>{bill.amount}</div>
                        <div style={{ fontSize: "11px", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "1px" }}>{bill.status === "OVERDUE" ? "OPEN" : bill.status}</div>
                        <button 
                          onClick={() => {
                            navigate("/purchases/payments-made/new", {
                              state: {
                                billId: bill.id,
                                billNumber: bill.profileName, // Or bill.billNumber if available
                                vendorName: bill.vendorName,
                                amount: bill.amount,
                                fromBill: true
                              }
                            });
                          }}
                          style={{ 
                            padding: "6px 16px", 
                            backgroundColor: "#10b981", 
                            color: "#ffffff", 
                            fontSize: "12px", 
                            fontWeight: "500", 
                            border: "none", 
                            borderRadius: "4px", 
                            cursor: "pointer",
                            marginTop: "4px"
                          }}
                        >
                          Record Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Next Bill" && (
            <div style={styles.section}>
              {/* Bill Form */}
              <div style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "32px",
                border: "1px solid #e5e7eb",
              }}>
                {/* Bill Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "32px",
                }}>
                  <div>
                    <h1 style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      color: "#111827",
                      margin: "0 0 16px 0",
                    }}>BILL</h1>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>
                        BILL DATE
                      </div>
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>
                        PAYMENT TERMS: <span style={{ color: "#111827", fontWeight: "500" }}>{recurringBill.paymentTerms || "Net 30"}</span>
                      </div>
                      <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
                        TOTAL: <span style={{ color: "#111827", fontWeight: "700", fontSize: "16px" }}>{resolvedBaseCurrencySymbol}0.00</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                      VENDOR ADDRESS
                    </div>
                    <div style={{ fontSize: "14px", color: "#156372", cursor: "pointer" }}
                      onClick={() => {
                        const vendors = JSON.parse(localStorage.getItem("vendors") || "[]");
                        const vendor = vendors.find((v) => v.name === recurringBill.vendorName);
                        if (vendor) {
                          navigate(`/purchases/vendors/${vendor.id}`);
                        }
                      }}
                    >
                      {recurringBill.vendorName || "RVSD"}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ marginBottom: "32px" }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: "#f9fafb",
                        borderBottom: "2px solid #e5e7eb",
                      }}>
                        <th style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                        }}>ITEMS & DESCRIPTION</th>
                        <th style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                        }}>ACCOUNT</th>
                        <th style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                        }}>QUANTITY</th>
                        <th style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                        }}>RATE</th>
                        <th style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6b7280",
                          textTransform: "uppercase",
                        }}>AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurringBill.items && recurringBill.items.length > 0 ? (
                        recurringBill.items.map((item, index) => (
                          <tr key={index} style={{
                            borderBottom: "1px solid #e5e7eb",
                          }}>
                            <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                              {item.itemDetails || ""}
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                              {item.account || "Prepaid Expenses"}
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                              {item.quantity || "1"}
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                              {item.rate || "0"}
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>
                              {((parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)).toFixed(2))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}></td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>Prepaid Expenses</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>1</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>0</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "#111827" }}>0.00</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "24px",
                }}>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    minWidth: "250px",
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      color: "#111827",
                    }}>
                      <span>Sub Total</span>
                      <span>{resolvedBaseCurrencySymbol}0.00</span>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      color: "#111827",
                    }}>
                      <span>Discount</span>
                      <span>(-){resolvedBaseCurrencySymbol}0.00</span>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#111827",
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid #e5e7eb",
                    }}>
                      <span>Total</span>
                      <span>{resolvedBaseCurrencySymbol}0.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

