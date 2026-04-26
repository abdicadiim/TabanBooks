import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  Paperclip,
  ExternalLink,
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
  const location = useLocation();
  const { code: baseCurrencyCode, symbol: baseCurrencySymbol } = useCurrency();
  const resolvedBaseCurrency = baseCurrencyCode || "USD";
  const resolvedBaseCurrencySymbol = baseCurrencySymbol || resolvedBaseCurrency;
  
  // Use passed state for instant load
  const initialPayment = location.state?.payment;
  const [payment, setPayment] = useState<any>(initialPayment || null);
  const [payments, setPayments] = useState<any[]>(location.state?.allPayments || []);
  const [vendor, setVendor] = useState<any>(initialPayment?.vendor && typeof initialPayment.vendor === 'object' ? initialPayment.vendor : null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("cash");
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!initialPayment);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const isInitialLoad = useRef(!initialPayment);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const emailModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statementRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async (forceSidebar = false) => {
    if (isInitialLoad.current) setIsLoading(true);
    try {
      const fetchSidebar = true; // Always fetch sidebar on mount or refresh

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
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setIsBulkActionsOpen(false);
      }
    };

    if (moreMenuOpen || dropdownOpen || isBulkActionsOpen) {
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

  const handleSelectPayment = (e: React.MouseEvent, paymentId: string) => {
    e.stopPropagation();
    if (selectedPayments.includes(paymentId)) {
      setSelectedPayments(selectedPayments.filter(id => id !== paymentId));
    } else {
      setSelectedPayments([...selectedPayments, paymentId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === filteredPayments.length && filteredPayments.length > 0) {
      setSelectedPayments([]);
    } else {
      const allIds = filteredPayments.map(p => p._id || p.id).filter(Boolean);
      setSelectedPayments(allIds);
    }
  };

  const clearSelection = () => {
    setSelectedPayments([]);
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

  if (isLoading && !payment) {
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



  const styles = {
    container: {
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
    sidebar: {
      width: "320px",
      borderRight: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column" as const,
      flexShrink: 0,
    },
    sidebarHeader: {
      padding: "12px 16px",
      borderBottom: "1px solid #e5e7eb",
      minHeight: "56px",
      display: "flex",
      alignItems: "center",
    },
    bulkActionsBar: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      width: "100%",
    },
    bulkButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 10px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    },
    selectedBadge: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "#374151",
      fontWeight: "500",
    },
    selectedCount: {
      width: "24px",
      height: "24px",
      backgroundColor: "#eff6ff",
      color: "#2563eb",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "600",
    },
    bulkMenu: {
      position: "absolute" as const,
      top: "100%",
      left: "16px",
      marginTop: "4px",
      width: "180px",
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e5e7eb",
      zIndex: 1000,
      padding: "4px",
    },
    bulkMenuItem: {
      padding: "10px 16px",
      fontSize: "14px",
      color: "#374151",
      cursor: "pointer",
      borderRadius: "6px",
      transition: "all 0.2s",
    },
    bulkMenuItemBlue: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
    },
    bulkMenuItemDanger: {
      color: "#ef4444",
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
      fontSize: "13px",
      color: "#111827",
    },
    sidebarTitle: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    sidebarList: {
      flex: 1,
      overflowY: "auto" as const,
    },
    sidebarItem: {
      padding: "16px",
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
      backgroundColor: "transparent",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      transition: "background-color 0.2s",
    },
    sidebarItemActive: {
      backgroundColor: "#f0f7ff",
      borderLeft: "4px solid #156372",
    },
    sidebarItemContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      gap: "4px",
    },
    sidebarItemVendor: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#111827",
    },
    sidebarItemNumber: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "2px",
    },
    sidebarItemStatus: {
      fontSize: "10px",
      fontWeight: "700",
      color: "#10b981",
      marginTop: "4px",
    },
    sidebarItemAmount: {
      fontSize: "13px",
      fontWeight: "700",
      color: "#111827",
      marginLeft: "auto",
    },
    sidebarCheckbox: {
      marginTop: "2px",
      width: "14px",
      height: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "2px",
    },
    mainContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
      backgroundColor: "#f9fafb",
    },
    header: {
      backgroundColor: "#ffffff",
      padding: "12px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    headerTitle: {
      fontSize: "16px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    actionBar: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
      padding: "8px 24px",
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
    },
    actionButton: {
      padding: "6px 12px",
      fontSize: "13px",
      fontWeight: "500",
      borderRadius: "4px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.2s",
    },
    actionButtonPrimary: {
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
    },
    headerIconButton: {
      padding: "6px",
      color: "#6b7280",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 0.2s",
    },
    contentArea: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "40px 24px",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
    },
    document: {
      backgroundColor: "#ffffff",
      borderRadius: "2px",
      padding: "60px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      position: "relative" as const,
      maxWidth: "800px",
      width: "100%",
      marginBottom: "40px",
    },
    ribbon: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      borderLeft: "64px solid #10b981",
      borderBottom: "64px solid transparent",
    },
    ribbonText: {
      position: "absolute" as const,
      top: "14px",
      left: "-54px",
      color: "#ffffff",
      fontSize: "10px",
      fontWeight: "800",
      transform: "rotate(-45deg)",
      width: "80px",
      textAlign: "center" as const,
      textTransform: "uppercase" as const,
      letterSpacing: "1px",
    },
    orgHeader: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "60px",
    },
    orgInfo: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "4px",
    },
    orgName: {
      fontSize: "24px",
      fontWeight: "800",
      color: "#111827",
      letterSpacing: "-0.5px",
    },
    orgSubText: {
      fontSize: "13px",
      color: "#6b7280",
      lineHeight: "1.6",
    },
    locationBadge: {
      fontSize: "11px",
      color: "#6b7280",
      marginBottom: "4px",
    },
    docTitleArea: {
      textAlign: "center" as const,
      marginBottom: "48px",
      marginTop: "20px",
    },
    docTitle: {
      fontSize: "16px",
      fontWeight: "700",
      color: "#a94442",
      textTransform: "uppercase" as const,
      letterSpacing: "1.5px",
    },
    mainDetails: {
      display: "grid",
      gridTemplateColumns: "1fr 200px",
      gap: "40px",
      marginBottom: "60px",
    },
    detailsGrid: {
      display: "flex",
      flexDirection: "column" as const,
    },
    detailRow: {
      display: "grid",
      gridTemplateColumns: "160px 1fr",
      padding: "10px 0",
      borderBottom: "1px solid #f3f4f6",
      alignItems: "center",
    },
    detailLabel: {
      fontSize: "13px",
      color: "#6b7280",
      fontWeight: "500",
    },
    detailValue: {
      fontSize: "13px",
      color: "#111827",
      fontWeight: "600",
    },
    detailValueBlue: {
      fontSize: "13px",
      color: "#2563eb",
      fontWeight: "600",
      cursor: "pointer",
    },
    amountCard: {
      backgroundColor: "#7cb342",
      color: "#ffffff",
      padding: "24px",
      borderRadius: "4px",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      height: "100px",
    },
    amountLabel: {
      fontSize: "13px",
      fontWeight: "600",
      marginBottom: "8px",
    },
    amountValue: {
      fontSize: "24px",
      fontWeight: "800",
    },
    vendorSection: {
      marginTop: "40px",
    },
    sectionTitle: {
      fontSize: "12px",
      fontWeight: "700",
      color: "#6b7280",
      textTransform: "uppercase" as const,
      letterSpacing: "1px",
      marginBottom: "12px",
      borderBottom: "1px solid #f3f4f6",
      paddingBottom: "8px",
    },
    vendorName: {
      fontSize: "16px",
      fontWeight: "700",
      color: "#156372",
      cursor: "pointer",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      marginTop: "20px",
    },
    th: {
      backgroundColor: "#f9fafb",
      padding: "12px",
      fontSize: "11px",
      fontWeight: "700",
      color: "#6b7280",
      textAlign: "left" as const,
      textTransform: "uppercase" as const,
      borderBottom: "2px solid #e5e7eb",
    },
    td: {
      padding: "16px 12px",
      fontSize: "13px",
      color: "#111827",
      borderBottom: "1px solid #f3f4f6",
    },
    journalSection: {
      width: "100%",
      maxWidth: "800px",
      backgroundColor: "#ffffff",
      borderRadius: "4px",
      padding: "32px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      marginBottom: "60px",
    },
    journalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      borderBottom: "1px solid #e5e7eb",
    },
    journalTabs: {
      display: "flex",
      gap: "24px",
    },
    journalTab: {
      paddingBottom: "12px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#6b7280",
      cursor: "pointer",
      position: "relative" as const,
    },
    journalTabActive: {
      color: "#156372",
    },
    journalTabIndicator: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      width: "100%",
      height: "2px",
      backgroundColor: "#156372",
    },
    toggleContainer: {
      display: "flex",
      backgroundColor: "#f3f4f6",
      padding: "2px",
      borderRadius: "4px",
    },
    toggleItem: {
      padding: "4px 12px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      cursor: "pointer",
      borderRadius: "3px",
      transition: "all 0.2s",
    },
    toggleItemActive: {
      backgroundColor: "#ffffff",
      color: "#111827",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    dropdownMenu: {
      position: "absolute" as const,
      top: "100%",
      right: 0,
      marginTop: "8px",
      backgroundColor: "#ffffff",
      borderRadius: "6px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      minWidth: "160px",
      zIndex: 50,
      overflow: "hidden",
    },
    dropdownItem: {
      padding: "10px 16px",
      fontSize: "13px",
      color: "#374151",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "background-color 0.2s",
      width: "100%",
      border: "none",
      background: "none",
      textAlign: "left" as const,
    },
  };



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

  const associatedBills = (payment.allocations || []).map((alloc: any) => {
    const bill = alloc.bill;
    if (!bill) return null;
    return { ...bill, amountApplied: alloc.amount };
  }).filter(Boolean);

  return (
    <div style={styles.container}>
      {/* Left Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          {selectedPayments.length > 0 ? (
            <div style={{ ...styles.bulkActionsBar, position: "relative" }} ref={bulkActionsRef}>
              <input 
                type="checkbox" 
                style={styles.sidebarCheckbox} 
                checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                onChange={handleSelectAll}
              />
              <button 
                style={styles.bulkButton}
                onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
              >
                Bulk Actions <ChevronDown size={14} />
              </button>
              
              {isBulkActionsOpen && (
                <div style={styles.bulkMenu}>
                  <div 
                    style={{ ...styles.bulkMenuItem, ...styles.bulkMenuItemBlue }}
                    onClick={() => {
                      setIsBulkActionsOpen(false);
                      toast.success("Bulk Update triggered for " + selectedPayments.length + " payments");
                    }}
                  >
                    Bulk Update
                  </div>
                  <div 
                    style={styles.bulkMenuItem}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#374151";
                    }}
                    onClick={() => {
                      setIsBulkActionsOpen(false);
                      if (window.confirm(`Are you sure you want to delete ${selectedPayments.length} payments?`)) {
                        toast.success("Payments deleted");
                        setSelectedPayments([]);
                      }
                    }}
                  >
                    Delete
                  </div>
                </div>
              )}

              <div style={{ width: "1px", height: "24px", backgroundColor: "#e5e7eb" }}></div>
              <div style={styles.selectedBadge}>
                <span style={styles.selectedCount}>{selectedPayments.length}</span>
                <span>Selected</span>
              </div>
              <button 
                style={{ ...styles.headerIconButton, marginLeft: "auto" }}
                onClick={clearSelection}
              >
                <X size={18} style={{ color: "#ef4444" }} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <div style={styles.sidebarTitle}>
                All Payments <ChevronDown size={14} />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  style={{ 
                    ...styles.headerIconButton, 
                    backgroundColor: "#10b981", 
                    color: "#ffffff", 
                    borderRadius: "4px",
                    padding: "4px 8px"
                  }}
                  onClick={() => navigate("/purchases/payments-made/new")}
                >
                  <Plus size={16} />
                </button>
                <button 
                  style={{ 
                    ...styles.headerIconButton, 
                    backgroundColor: "#f3f4f6", 
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    padding: "4px"
                  }}
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.sidebarList}>
          {filteredPayments.map((p) => {
            const pId = p._id || p.id;
            return (
              <div
                key={pId}
                style={{
                  ...styles.sidebarItem,
                  ...(String(pId) === String(id) ? styles.sidebarItemActive : {}),
                }}
                onClick={() => navigate(`/purchases/payments-made/${pId}`, { state: { payment: p, allPayments: payments } })}
              >
              <input 
                type="checkbox" 
                style={styles.sidebarCheckbox} 
                checked={selectedPayments.includes(String(pId))}
                onClick={(e) => handleSelectPayment(e, String(pId))}
                onChange={() => {}}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={styles.sidebarItemVendor}>{p.vendorName || "Vendor"}</div>
                  <div style={styles.sidebarItemAmount}>
                    {resolvedBaseCurrencySymbol}{parseFloat(p.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={styles.sidebarItemNumber}>
                  {formatDateShort(p.date)} • {p.mode || "Cash"}
                </div>
                <div style={styles.sidebarItemStatus}>PAID</div>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Top Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={styles.locationBadge}>Location: Head Office</div>
              <div style={styles.headerTitle}>{payment.paymentNumber || "4"}</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.headerIconButton}><Paperclip size={18} /></button>
            <button style={styles.headerIconButton}><ExternalLink size={18} /></button>
            <button style={styles.headerIconButton} onClick={() => navigate("/purchases/payments-made")}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div style={styles.actionBar}>
          <button
            style={styles.actionButton}
            onClick={() => navigate(`/purchases/payments-made/new`, {
              state: { editPayment: payment, isEdit: true, paymentId: id }
            })}
          >
            <Edit size={14} /> Edit
          </button>
          <button style={styles.actionButton} onClick={() => navigate(`/purchases/payments-made/${id}/email`)}>
            <Mail size={14} /> Send Email
          </button>
          <button style={styles.actionButton} onClick={handleDownloadPDF} disabled={isDownloadingPdf}>
            <FileText size={14} /> {isDownloadingPdf ? "Exporting..." : "Download PDF"}
          </button>
          <div style={{ position: "relative" }} ref={moreMenuRef}>
            <button style={styles.actionButton} onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
              <MoreVertical size={14} />
            </button>
            {moreMenuOpen && (
              <div style={styles.dropdownMenu}>
                <button style={styles.dropdownItem} onClick={handleClone}>
                  <Plus size={14} /> Clone
                </button>
                <button onClick={handleDelete} style={{ ...styles.dropdownItem, color: "#ef4444" }}>
                  <X size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.contentArea}>
          <div ref={statementRef} style={styles.document}>
            <div style={styles.ribbon}>
              <div style={styles.ribbonText}>Paid</div>
            </div>

            {/* Org Info */}
            <div style={styles.orgHeader}>
              <div style={styles.orgInfo}>
                <div style={styles.orgName}>
                  {organizationInfo?.companyName || organizationInfo?.name || "Taban Books"}
                </div>
                <div style={styles.orgSubText}>
                  {organizationInfo?.address?.city || "Aland Islands"}<br />
                  {organizationInfo?.email || "ascwcs685@gmail.com"}
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={styles.docTitleArea}>
              <div style={styles.docTitle}>PAYMENTS MADE</div>
            </div>

            {/* Main Details */}
            <div style={styles.mainDetails}>
              <div style={styles.detailsGrid}>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Payment#</div>
                  <div style={styles.detailValue}>{payment.paymentNumber || "4"}</div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Payment Date</div>
                  <div style={styles.detailValue}>{formatDateShort(payment.date)}</div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Reference Number</div>
                  <div style={styles.detailValue}>{payment.reference || "---"}</div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Paid To</div>
                  <div 
                    style={styles.detailValueBlue}
                    onClick={() => vendor && navigate(`/purchases/vendors/${vendor.id}`)}
                  >
                    {payment.vendorName || "Vendor Name"}
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Payment Mode</div>
                  <div style={styles.detailValue}>{payment.mode || "Cash"}</div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Paid Through</div>
                  <div style={styles.detailValue}>{payment.paidThrough || "Petty Cash"}</div>
                </div>
              </div>

              <div style={styles.amountCard}>
                <div style={styles.amountLabel}>Amount Paid</div>
                <div style={styles.amountValue}>
                  {resolvedBaseCurrencySymbol}{parseFloat(payment.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Vendor Info */}
            <div style={styles.vendorSection}>
              <div style={styles.sectionTitle}>Paid To</div>
              <div 
                style={styles.vendorName}
                onClick={() => vendor && navigate(`/purchases/vendors/${vendor.id}`)}
              >
                {payment.vendorName || "Vendor Name"}
              </div>
            </div>

            {/* Associated Bills Table */}
            <div style={{ marginTop: "40px" }}>
              <div style={styles.sectionTitle}>Payment For</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Bill Number</th>
                    <th style={styles.th}>Bill Date</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Bill Amount</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Amount Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {associatedBills.length > 0 ? (
                    associatedBills.map((bill: any) => (
                      <tr key={bill.id}>
                        <td 
                          style={{ ...styles.td, color: "#156372", fontWeight: "600", cursor: "pointer" }}
                          onClick={() => navigate(`/purchases/bills/${bill.id}`)}
                        >
                          {bill.billNumber || bill.id}
                        </td>
                        <td style={styles.td}>{formatDate(bill.date)}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {resolvedBaseCurrencySymbol}{parseFloat(bill.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: "600" }}>
                          {resolvedBaseCurrencySymbol}{parseFloat(bill.amountApplied || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ ...styles.td, color: "#156372", fontWeight: "600", cursor: "pointer" }} onClick={() => payment.billId && navigate(`/purchases/bills/${payment.billId}`)}>
                        {payment.billNumber || "---"}
                      </td>
                      <td style={styles.td}>{formatDate(payment.billDate || payment.date)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {resolvedBaseCurrencySymbol}{parseFloat(payment.billAmount || payment.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: "600" }}>
                        {resolvedBaseCurrencySymbol}{parseFloat(payment.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Journal Section */}
          <div style={styles.journalSection}>
            <div style={styles.journalHeader}>
              <div style={styles.journalTabs}>
                <div style={{ ...styles.journalTab, ...styles.journalTabActive }}>
                  Journal
                  <div style={styles.journalTabIndicator}></div>
                </div>
              </div>
              <div style={styles.toggleContainer}>
                <div 
                  style={{ ...styles.toggleItem, ...(activeTab === "accrual" ? styles.toggleItemActive : {}) }}
                  onClick={() => setActiveTab("accrual")}
                >
                  Accrual
                </div>
                <div 
                  style={{ ...styles.toggleItem, ...(activeTab === "cash" ? styles.toggleItemActive : {}) }}
                  onClick={() => setActiveTab("cash")}
                >
                  Cash
                </div>
              </div>
            </div>

            <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
              Amounts are in base currency
              <span style={{ backgroundColor: "#156372", color: "#ffffff", padding: "1px 6px", borderRadius: "2px", fontSize: "10px", fontWeight: "700" }}>
                {resolvedBaseCurrency}
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, backgroundColor: "transparent", borderBottom: "1px solid #e5e7eb", paddingLeft: 0 }}>Account</th>
                  <th style={{ ...styles.th, backgroundColor: "transparent", borderBottom: "1px solid #e5e7eb", textAlign: "right" }}>Debit</th>
                  <th style={{ ...styles.th, backgroundColor: "transparent", borderBottom: "1px solid #e5e7eb", textAlign: "right", paddingRight: 0 }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map((entry, index) => (
                  <tr key={index}>
                    <td style={{ ...styles.td, paddingLeft: 0, borderBottom: index === journalEntries.length - 1 ? "1px solid #e5e7eb" : "1px solid #f3f4f6" }}>
                      {entry.account}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", borderBottom: index === journalEntries.length - 1 ? "1px solid #e5e7eb" : "1px solid #f3f4f6" }}>
                      {parseFloat(entry.debit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", paddingRight: 0, borderBottom: index === journalEntries.length - 1 ? "1px solid #e5e7eb" : "1px solid #f3f4f6" }}>
                      {parseFloat(entry.credit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: "700" }}>
                  <td style={{ ...styles.td, paddingLeft: 0, border: "none" }}>Total</td>
                  <td style={{ ...styles.td, textAlign: "right", border: "none" }}>
                    {parseFloat(totalDebit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", paddingRight: 0, border: "none" }}>
                    {parseFloat(totalCredit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
