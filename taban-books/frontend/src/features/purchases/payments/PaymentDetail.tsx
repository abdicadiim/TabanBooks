import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Edit,
  Mail,
  MoreVertical,
  X,
  FileText,
  ChevronDown,
  Plus,
  Search,
  RefreshCw,
} from "lucide-react";

import { paymentsMadeAPI, billsAPI, vendorsAPI, settingsAPI } from "../../../services/api";
import toast from "react-hot-toast";
import { useCurrency } from "../../../hooks/useCurrency";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { buildPaymentDeleteWarning } from "../../../utils/paymentDeleteWarning";

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  const [payment, setPayment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("cash");
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const moreMenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const emailModalRef = useRef(null);
  const fileInputRef = useRef(null);
  const statementRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async (forceSidebar = false) => {
    if (isInitialLoad.current) setIsLoading(true);
    try {
      const fetchSidebar = forceSidebar || isInitialLoad.current;

      const requests: Promise<any>[] = [
        paymentsMadeAPI.getById(id).catch(e => { console.error("Error loading payment:", e); return null; })
      ];

      if (fetchSidebar) {
        requests.push(paymentsMadeAPI.getAll().catch(e => { console.error("Error loading payments list:", e); return null; }));
        requests.push(settingsAPI.getOrganizationProfile().catch(e => { console.error("Error loading org profile:", e); return null; }));
      }

      const results = await Promise.all(requests);
      const paymentResponse = results[0];
      const paymentsResponse = fetchSidebar ? results[1] : null;
      const orgResponse = fetchSidebar ? results[2] : null;

      // Handle payments list
      if (paymentsResponse && paymentsResponse.data) {
        setPayments(paymentsResponse.data);
      }

      // Handle specific payment
      if (paymentResponse && paymentResponse.data) {
        const foundPayment = paymentResponse.data;
        setPayment(foundPayment);

        // Load vendor details (depends on payment)
        if (foundPayment.vendor) {
          const vendorId = typeof foundPayment.vendor === 'object' ? foundPayment.vendor._id : foundPayment.vendor;
          vendorsAPI.getById(vendorId).then(vResp => {
            if (vResp && vResp.data) setVendor(vResp.data);
          }).catch(e => console.error("Error loading vendor:", e));
        }
      } else {
        setPayment(null);
      }

      // Handle organization info
      if (orgResponse && orgResponse.data) {
        setOrganizationInfo(orgResponse.data);
      }

      isInitialLoad.current = false;
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load payment details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for updates
    const handlePaymentsUpdate = () => {
      fetchData(true);
    };

    window.addEventListener("paymentsUpdated", handlePaymentsUpdate);
    return () => {
      window.removeEventListener("paymentsUpdated", handlePaymentsUpdate);
    };
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (emailModalRef.current && !emailModalRef.current.contains(event.target)) {
        // Don't close on click outside for email modal - let user explicitly close
      }
    };

    if (moreMenuOpen || dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuOpen, dropdownOpen]);


  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format date for display (DD/MM/YYYY)
  const formatDateShort = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDownloadPDF = async () => {
    if (isDownloadingPdf) return;

    if (!statementRef.current) {
      toast.error("Payment statement is not ready to export");
      return;
    }

    try {
      setIsDownloadingPdf(true);
      const canvas = await html2canvas(statementRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: statementRef.current.scrollWidth,
        windowHeight: statementRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const imageHeight = (canvas.height * contentWidth) / canvas.width;

      let remainingHeight = imageHeight;
      let offsetY = margin;
      pdf.addImage(imgData, "PNG", margin, offsetY, contentWidth, imageHeight, undefined, "FAST");
      remainingHeight -= contentHeight;

      while (remainingHeight > 0) {
        offsetY -= contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, offsetY, contentWidth, imageHeight, undefined, "FAST");
        remainingHeight -= contentHeight;
      }

      const paymentNumber = String(payment?.paymentNumber || id || "payment-statement").replace(/[^a-z0-9-_]/gi, "_");
      pdf.save(`${paymentNumber}.pdf`);
    } catch (error: any) {
      console.error("Failed to download payment statement PDF:", error);
      toast.error(error?.message || "Failed to download PDF");
    } finally {
      setIsDownloadingPdf(false);
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

  const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

  const handleDelete = async () => {
    setMoreMenuOpen(false);

    const paymentId = String(payment?._id || payment?.id || id || "");
    if (!paymentId) return;

    const linkedBillLabels = (Array.isArray(payment?.allocations) ? payment.allocations : [])
      .map((allocation: any) => allocation?.bill)
      .map((bill: any) => String(bill?.billNumber || bill?.bill_number || ""))
      .filter(Boolean);

    const confirmed = window.confirm(
      buildPaymentDeleteWarning({
        paymentCount: 1,
        billLabels: linkedBillLabels,
      })
    );

    if (!confirmed) return;

    try {
      const response = await paymentsMadeAPI.delete(paymentId);
      if (!response || (!response.success && response.code !== 0)) {
        throw new Error(response?.message || "Failed to delete payment.");
      }

      window.dispatchEvent(new Event("paymentsUpdated"));
      window.dispatchEvent(new Event("billsUpdated"));
      toast.success("Payment deleted successfully");
      navigate("/purchases/payments-made");
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error(error?.message || "Failed to delete payment.");
    }
  };

  const handleClone = async () => {
    setMoreMenuOpen(false);
    if (!payment) return;

    try {
      const sourceId = String(payment._id || payment.id || id || "");
      const sourceResponse = sourceId ? await paymentsMadeAPI.getById(sourceId) : null;
      const sourcePayment = sourceResponse?.data || sourceResponse?.payment || payment;

      if (!sourcePayment) {
        throw new Error("Could not load payment details for cloning.");
      }

      const vendorId = toEntityId(sourcePayment.vendor || sourcePayment.vendorId);
      if (!vendorId) {
        throw new Error("Cannot clone this payment because it has no vendor.");
      }

      const sourceAllocations = Array.isArray(sourcePayment.allocations) ? sourcePayment.allocations : [];
      const validatedAllocationsRaw = await Promise.all(
        sourceAllocations.map(async (allocation: any) => {
          const billId = toEntityId(allocation?.bill || allocation?.billId);
          const requestedAmount = toFiniteNumber(allocation?.amount, 0);
          if (!billId || requestedAmount <= 0) return null;

          try {
            const billResponse = await billsAPI.getById(billId);
            const billData = billResponse?.data || billResponse?.bill;
            if (!billData) return null;

            const billTotal = toFiniteNumber(billData.total, 0);
            const billPaid = toFiniteNumber(billData.paidAmount, 0);
            const billCredits = toFiniteNumber(billData.vendorCreditsApplied, 0);
            const billBalance = Math.max(
              0,
              toFiniteNumber(billData.balance, billTotal - billPaid - billCredits)
            );

            const allowedAmount = Math.min(requestedAmount, billBalance);
            if (allowedAmount <= 0) return null;

            return {
              billId,
              amount: Number(allowedAmount.toFixed(2)),
            };
          } catch {
            return null;
          }
        })
      );

      const validatedAllocations = validatedAllocationsRaw.filter(Boolean);
      const allocatedTotal = validatedAllocations.reduce((sum: number, item: any) => sum + toFiniteNumber(item.amount, 0), 0);

      const baseAmount = toFiniteNumber(sourcePayment.amount ?? sourcePayment.paymentAmount, 0);
      const finalAmount = Math.max(baseAmount, allocatedTotal);

      const paidThroughId = toEntityId(
        sourcePayment.paidThroughId
        || sourcePayment.paidThrough
        || sourcePayment.bankAccount
        || sourcePayment.paidAccount
      );

      const clonePayload: any = {
        vendorId,
        vendorName: sourcePayment.vendorName || vendor?.displayName || vendor?.name || "",
        paymentNumber: sourcePayment.paymentNumber,
        date: toISODate(sourcePayment.date),
        amount: finalAmount,
        currency: sourcePayment.currency || resolvedBaseCurrency,
        bankCharges: toFiniteNumber(sourcePayment.bankCharges, 0),
        mode: sourcePayment.mode || sourcePayment.paymentMethod || "Cash",
        reference: sourcePayment.reference || sourcePayment.paymentReference || "",
        xcv: sourcePayment.xcv || "",
        notes: sourcePayment.notes || "",
        status: "PAID",
        allocations: validatedAllocations,
      };

      if (paidThroughId && isObjectId(paidThroughId)) {
        clonePayload.paidThrough = paidThroughId;
      }

      const cloneResponse = await paymentsMadeAPI.create(clonePayload);
      if (!cloneResponse || (!cloneResponse.success && cloneResponse.code !== 0)) {
        throw new Error(cloneResponse?.message || "Failed to clone payment.");
      }

      const clonedPaymentId =
        cloneResponse?.data?._id
        || cloneResponse?.data?.id
        || cloneResponse?.payment?._id
        || cloneResponse?.payment?.id;

      window.dispatchEvent(new Event("paymentsUpdated"));

      if (clonedPaymentId) {
        toast.success("Payment cloned successfully");
        navigate(`/purchases/payments-made/${clonedPaymentId}`);
        return;
      }

      toast.success("Payment cloned successfully, but it could not be opened automatically.");
    } catch (error: any) {
      console.error("Error cloning payment:", error);
      toast.error(error?.message || "Failed to clone payment.");
    }
  };

  // Filter payments based on search
  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.paymentNumber?.toLowerCase().includes(query) ||
      p.vendorName?.toLowerCase().includes(query) ||
      p.reference?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#ffffff" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 16px" }} />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div style={{ padding: "48px", textAlign: "center", minHeight: "100vh", backgroundColor: "#ffffff" }}>
        <div style={{ padding: "48px" }}>
          <p style={{ fontSize: "18px", color: "#1f2937", marginBottom: "16px" }}>Payment not found</p>
          <button
            onClick={() => navigate("/purchases/payments-made")}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#156372",
              color: "#ffffff",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to Payments Made
          </button>
        </div>
      </div>
    );
  }

  // Get bills associated with this payment
  const associatedBills = (payment.allocations || []).map((alloc) => {
    const bill = alloc.bill;
    if (!bill) return null;
    return {
      ...bill,
      amountApplied: alloc.amount
    };
  }).filter(Boolean);

  const vendorData = vendor || {};
  const formData = vendorData.formData || vendorData;
  const vendorAddressLines = [
    formData.billingStreet1 || formData.address,
    formData.billingCity || formData.city,
    formData.billingState || formData.state,
    formData.billingZipCode || formData.zipCode,
    formData.billingCountry || formData.country,
  ].filter(Boolean);

  const currencySymbol = resolvedBaseCurrencySymbol;

  const styles = {
    // Consolidated Styles
    container: {
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    },
    sidebar: {
      width: "320px",
      borderRight: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
    },
    sidebarHeader: {
      padding: "16px",
      borderBottom: "1px solid #e5e7eb",
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
      color: "#6b7280",
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
      backgroundColor: "#eff6ff",
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
      fontWeight: "600",
      color: "#111827",
      marginBottom: "4px",
    },
    sidebarItemNumber: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "4px",
    },
    sidebarItemStatus: {
      fontSize: "12px",
      fontWeight: "500",
      color: "#10b981",
    },
    sidebarItemAmount: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      textAlign: "right",
    },
    mainContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0, // Important for flex scrolling
      backgroundColor: "#ffffff",
    },
    header: {
      backgroundColor: "#ffffff",
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
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
      padding: "6px 12px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#374151",
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
      padding: "8px 16px",
      fontSize: "14px",
      color: "#111827",
      cursor: "pointer",
      border: "none",
      background: "none",
      width: "100%",
      textAlign: "left",
    },
    content: {
      flex: 1,
      overflowY: "auto",
      overflowX: "auto",
      padding: "24px",
      backgroundColor: "#f9fafb",
      display: "flex",
      justifyContent: "center",
      minHeight: 0, // Important for flex scrolling
      height: "100%",
    },
    document: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      padding: "48px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      position: "relative",
      overflow: "visible", // Changed from "hidden" to allow content to be visible
      maxWidth: "800px",
      width: "100%",
      minHeight: "fit-content", // Ensure content is fully visible
    },
    // Redesign Styles
    ribbon: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      borderLeft: "64px solid #34d399",
      borderBottom: "64px solid transparent",
      zIndex: 10,
    },
    ribbonText: {
      position: "absolute" as const,
      top: "12px",
      left: "-56px",
      color: "#ffffff",
      fontSize: "11px",
      fontWeight: "700",
      transform: "rotate(-45deg)",
      width: "80px",
      textAlign: "center" as const,
      letterSpacing: "0.5px",
    },
    amountBox: {
      backgroundColor: "#7ca45c",
      color: "#ffffff",
      padding: "20px 0",
      borderRadius: "0px",
      textAlign: "center" as const,
      minWidth: "131px",
      height: "fit-content",
    },
    amountBoxLabel: {
      fontSize: "11px",
      fontWeight: "600",
      marginBottom: "8px",
      textTransform: "uppercase" as const,
    },
    amountBoxValue: {
      fontSize: "18px",
      fontWeight: "700",
    },
    detailGrid: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: "24px",
      marginBottom: "32px",
    },
    infoStack: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    },
    infoRow: {
      display: "flex",
      gap: "16px",
      fontSize: "13px",
      borderBottom: "1px solid #f3f4f6",
      paddingBottom: "8px",
    },
    infoLabel: {
      width: "140px",
      color: "#6b7280",
    },
    infoValue: {
      color: "#111827",
      fontWeight: "500",
    },
    vendorLink: {
      color: "#156372",
      cursor: "pointer",
    },
    paymentForTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
      marginTop: "16px",
    },
    paymentForHeader: {
      backgroundColor: "#f3f4f6",
    },
    paymentForTh: {
      padding: "10px 12px",
      fontSize: "11px",
      fontWeight: "600",
      color: "#6b7280",
      textAlign: "left" as const,
      textTransform: "uppercase" as const,
    },
    paymentForTd: {
      padding: "12px",
      fontSize: "13px",
      color: "#111827",
      borderBottom: "1px solid #f3f4f6",
    },
    paymentForTdRight: {
      textAlign: "right" as const,
    },
    journalSectionStyle: {
      padding: "0",
      backgroundColor: "transparent",
      borderRadius: "0",
      marginTop: "40px",
    },
    journalTab: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#111827",
      borderBottom: "2px solid #156372",
      paddingBottom: "8px",
      width: "fit-content",
      marginBottom: "16px",
    },
    accrualCashToggle: {
      display: "flex",
      gap: "4px",
      padding: "2px",
      backgroundColor: "#f3f4f6",
      borderRadius: "4px",
    },
    toggleBtn: {
      padding: "2px 8px",
      fontSize: "10px",
      border: "1px solid #d1d5db",
      backgroundColor: "transparent",
      cursor: "pointer",
      color: "#6b7280",
    },
    toggleBtnActive: {
      backgroundColor: "#ffffff",
      color: "#111827",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    actionBar: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
      padding: "8px 24px",
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
  };

  // Get currency symbol
  const currency = resolvedBaseCurrency;
  // const currencySymbol = currency === "USD" ? "USD" : currency === "USD" ? "$" : currency === "CAD" ? "$" : currency === "AWG" ? "$" : currency;

  // Calculate journal entries
  const journalEntries = [
    {
      account: payment.paidThrough || "Petty Cash",
      debit: "0.00",
      credit: parseFloat(payment.amount || 0).toFixed(2),
    },
    {
      account: "Accounts Payable",
      debit: parseFloat(payment.amount || 0).toFixed(2),
      credit: "0.00",
    },
  ];

  const totalDebit = journalEntries.reduce((sum, entry) => sum + parseFloat(entry.debit), 0).toFixed(2);
  const totalCredit = journalEntries.reduce((sum, entry) => sum + parseFloat(entry.credit), 0).toFixed(2);

  return (
    <div style={styles.container}>
      {/* Left Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={styles.dropdownWrapper} ref={dropdownRef}>
              <h2 style={{ ...styles.sidebarTitle, marginBottom: 0 }}>
                All Payments
                <ChevronDown size={14} style={{ marginLeft: "4px" }} />
              </h2>
            </div>
            <div style={styles.sidebarActions}>
              <button
                style={{ ...styles.sidebarButton, backgroundColor: "#156372" }}
                onClick={() => navigate("/purchases/payments-made/new")}
              >
                <Plus size={16} />
              </button>
              <button style={{ ...styles.sidebarButton, backgroundColor: "transparent", color: "#6b7280", border: "1px solid #e5e7eb" }}>
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

        </div>

        <div style={styles.sidebarList}>
          {filteredPayments.map((p) => (
            <div
              key={p.id}
              style={{
                ...styles.sidebarItem,
                ...(String(p.id) === String(id) ? styles.sidebarItemActive : {}),
                padding: "12px 16px",
              }}
              onClick={() => navigate(`/purchases/payments-made/${p.id}`)}
            >
              <input type="checkbox" style={{ marginRight: "12px", marginTop: "4px" }} onClick={(e) => e.stopPropagation()} />
              <div style={styles.sidebarItemContent}>
                <div style={styles.sidebarItemVendor}>
                  {p.vendorName || "Vendor"}
                </div>
                <div style={{ ...styles.sidebarItemNumber, fontSize: "12px" }}>
                  {formatDateShort(p.date)} • {p.mode || "Cash"}
                </div>
                <div style={{ ...styles.sidebarItemStatus, color: "#10b981", fontSize: "11px" }}>PAID</div>
              </div>
              <div style={styles.sidebarItemAmount}>
                {currencySymbol}{parseFloat(p.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={{ ...styles.header, borderBottom: "1px solid #e5e7eb", backgroundColor: "#ffffff", padding: "12px 24px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>
            {payment.paymentNumber || id}
          </div>
          <div style={styles.headerRight}>

            <button style={styles.headerIconButton} onClick={() => navigate("/purchases/payments-made")}><X size={20} /></button>
          </div>
        </div>

        {/* Buttons Row */}
        <div style={{ ...styles.actionBar, display: "flex", gap: "12px", borderBottom: "1px solid #e5e7eb", padding: "8px 24px", backgroundColor: "#f9fafb" }}>
          <button
            style={styles.headerButton}
            onClick={() => navigate(`/purchases/payments-made/new`, {
              state: { editPayment: payment, isEdit: true, paymentId: id }
            })}
          >
            <Edit size={14} /> Edit
          </button>
          <button style={styles.headerButton} onClick={() => navigate(`/purchases/payments-made/${id}/email`)}>
            <Mail size={14} /> Send Email
          </button>
          <button style={styles.headerButton} onClick={handleDownloadPDF} disabled={isDownloadingPdf}>
            <FileText size={14} /> {isDownloadingPdf ? "Downloading..." : "Download PDF"}
          </button>
          <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
            <button style={styles.headerButton} onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
              <MoreVertical size={14} />
            </button>
            {moreMenuOpen && (
              <div style={styles.moreDropdown}>
                <button style={styles.moreDropdownItem} onClick={handleClone}>Clone</button>
                <button style={styles.moreDropdownItem}>Export</button>
                <button style={styles.moreDropdownItem} onClick={handleDelete}>Delete</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
          <div style={styles.content}>
          <div ref={statementRef} style={{ ...styles.document, padding: "48px", position: "relative" }}>
            {/* Paid Ribbon */}
            <div style={styles.ribbon}>
              <div style={styles.ribbonText}>Paid</div>
            </div>

            {/* Document Header (Org Info) */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "40px" }}>
              <div style={styles.infoStack}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                  {organizationInfo?.companyName?.[0] || organizationInfo?.name?.[0] || "d"}
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "16px" }}>
                  {organizationInfo?.address?.city || "Aland Islands"}<br />
                  {organizationInfo?.email || "ascwcs685@gmail.com"}
                </div>
              </div>
            </div>

            {/* Centered Document Title */}
            <div style={{ textAlign: "center", marginBottom: "40px", borderTop: "1px solid #f3f4f6", paddingTop: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>
                PAYMENTS MADE
              </div>
            </div>

            {/* Detail Grid with Amount Paid Box */}
            <div style={styles.detailGrid}>
              <div style={styles.infoStack}>
                <div style={styles.infoRow}>
                  <div style={styles.infoLabel}>Payment#</div>
                  <div style={styles.infoValue}>{payment.paymentNumber || id}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.infoLabel}>Payment Date</div>
                  <div style={styles.infoValue}>{formatDate(payment.date)}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.infoLabel}>Reference Number</div>
                  <div style={styles.infoValue}>{payment.reference || ""}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.infoLabel}>Paid To</div>
                  <div style={{ ...styles.infoValue, ...styles.vendorLink }} onClick={() => vendor && navigate(`/purchases/vendors/${vendor.id}`)}>
                    {payment.vendorName || "Vendor"}
                  </div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.infoLabel}>Payment Mode</div>
                  <div style={styles.infoValue}>{payment.mode || "Cash"}</div>
                </div>
                <div style={styles.infoRow}>
                  <div style={styles.infoLabel}>Paid Through</div>
                  <div style={styles.infoValue}>{payment.paidThrough || "Petty Cash"}</div>
                </div>

                <div style={{ marginTop: "32px", marginBottom: "32px" }}>
                  <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" }}>Paid To</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>{payment.vendorName || "Vendor"}</div>
                </div>
              </div>

              {/* Amount Paid Box */}
              <div style={styles.amountBox}>
                <div style={styles.amountBoxLabel}>Amount Paid</div>
                <div style={styles.amountBoxValue}>
                  {currencySymbol}{parseFloat(payment.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Payment for Table */}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "24px" }}>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>Payment for</div>
              <table style={styles.paymentForTable}>
                <thead style={styles.paymentForHeader}>
                  <tr>
                    <th style={styles.paymentForTh}>Bill Number</th>
                    <th style={styles.paymentForTh}>Bill Date</th>
                    <th style={styles.paymentForTh}>Bill Amount</th>
                    <th style={styles.paymentForTh}>Payment Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {associatedBills.length > 0 ? (
                    associatedBills.map((bill) => (
                      <tr key={bill.id}>
                        <td style={{ ...styles.paymentForTd, color: "#156372", cursor: "pointer" }} onClick={() => navigate(`/purchases/bills/${bill.id}`)}>
                          {bill.billNumber || bill.id}
                        </td>
                        <td style={styles.paymentForTd}>{formatDate(bill.date)}</td>
                        <td style={styles.paymentForTd}>{currencySymbol} {parseFloat(bill.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td style={styles.paymentForTd}>{currencySymbol} {parseFloat(bill.amountApplied || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ ...styles.paymentForTd, color: "#156372", cursor: "pointer" }} onClick={() => payment.billId && navigate(`/purchases/bills/${payment.billId}`)}>
                        {payment.billNumber || "---"}
                      </td>
                      <td style={styles.paymentForTd}>{formatDate(payment.billDate || payment.date)}</td>
                      <td style={styles.paymentForTd}>{currencySymbol} {parseFloat(payment.billAmount || payment.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td style={styles.paymentForTd}>{currencySymbol} {parseFloat(payment.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Journal Section - Integrated below */}
          <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", padding: "0 48px", marginBottom: "100px" }}>
            <div style={styles.journalSectionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", marginBottom: "16px" }}>
                <div style={{ ...styles.journalTab, borderBottom: "2px solid #156372", marginBottom: "-1px" }}>Journal</div>
                <div style={{ ...styles.accrualCashToggle, borderRadius: "2px", border: "1px solid #d1d5db", padding: 0 }}>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(activeTab === "accrual" ? styles.toggleBtnActive : {}),
                      border: "none",
                      borderRight: "1px solid #d1d5db"
                    }}
                    onClick={() => setActiveTab("accrual")}
                  >
                    Accrual
                  </button>
                  <button
                    style={{
                      ...styles.toggleBtn,
                      ...(activeTab === "cash" ? styles.toggleBtnActive : {}),
                      border: "none"
                    }}
                    onClick={() => setActiveTab("cash")}
                  >
                    Cash
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                Amount is displayed in your base currency
                <span style={{ backgroundColor: "#82ac5d", color: "#ffffff", padding: "0 4px", borderRadius: "2px", fontSize: "10px", fontWeight: "700" }}>{currency}</span>
              </div>

              <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", marginBottom: "12px" }}>
                Payments Made - {associatedBills.length > 0 ? associatedBills[0].billNumber : payment.billNumber || payment.paymentNumber || id}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ ...styles.paymentForTh, backgroundColor: "transparent", color: "#9ca3af", padding: "8px 0" }}>ACCOUNT</th>
                    <th style={{ ...styles.paymentForTh, backgroundColor: "transparent", textAlign: "right", color: "#9ca3af", padding: "8px 0" }}>DEBIT</th>
                    <th style={{ ...styles.paymentForTh, backgroundColor: "transparent", textAlign: "right", color: "#9ca3af", padding: "8px 0" }}>CREDIT</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((entry, index) => (
                    <tr key={index}>
                      <td style={{ ...styles.paymentForTd, padding: "8px 0", border: "none" }}>{entry.account}</td>
                      <td style={{ ...styles.paymentForTd, textAlign: "right", padding: "8px 0", border: "none" }}>{parseFloat(entry.debit).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...styles.paymentForTd, textAlign: "right", padding: "8px 0", border: "none" }}>{parseFloat(entry.credit).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: "700", borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ ...styles.paymentForTd, padding: "8px 0", border: "none" }}></td>
                    <td style={{ ...styles.paymentForTd, textAlign: "right", padding: "8px 0", border: "none" }}>{parseFloat(totalDebit).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...styles.paymentForTd, textAlign: "right", padding: "8px 0", border: "none" }}>{parseFloat(totalCredit).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
