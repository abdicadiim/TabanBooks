import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Edit,
  MoreVertical,
  X,
  ChevronDown,
  FileText,
  Info,
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  Plus,
  Paperclip,
  MessageSquare,
  Link2
} from "lucide-react";
import { vendorCreditsAPI, vendorsAPI, billsAPI, currenciesAPI, settingsAPI, pdfTemplatesAPI, profileAPI } from "../../../services/api";
import TransactionPDFDocument from "../../../components/Transactions/TransactionPDFDocument";
import toast from "react-hot-toast";
import { downloadVendorCreditsPaperPdf } from "./vendorCreditPdf";

export default function VendorCreditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preloadedVendorCredit = location.state?.vendorCredit || null;
  const preloadedVendorCredits = Array.isArray(location.state?.vendorCredits) ? location.state.vendorCredits : [];
  const [vendorCredit, setVendorCredit] = useState<any>(() => {
    if (!preloadedVendorCredit) return null;
    return {
      ...preloadedVendorCredit,
      id: preloadedVendorCredit.id || preloadedVendorCredit._id,
    };
  });
  const [vendorCredits, setVendorCredits] = useState<any[]>(() => preloadedVendorCredits);
  const [vendor, setVendor] = useState(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [bills, setBills] = useState([]);
  const [creditApplications, setCreditApplications] = useState<Record<string, any>>({});
  const [appliedOnDate, setAppliedOnDate] = useState(true);
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split("T")[0]);
  const [baseCurrency, setBaseCurrency] = useState<string>("AED");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !preloadedVendorCredit);
  const [activePdfTemplate, setActivePdfTemplate] = useState<any>(null);
  const isInitialLoad = useRef(!preloadedVendorCredit);
  const moreMenuRef = useRef(null);
  const pdfMenuRef = useRef(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const journalSectionRef = useRef<HTMLDivElement | null>(null);

  const parseMoneyValue = (value: any): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const normalized = String(value ?? "")
      .replace(/[^0-9.-]/g, "")
      .trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getBillOutstandingBalance = (bill: any): number => {
    if (bill?.balance !== undefined && bill?.balance !== null && bill?.balance !== "") {
      const parsedBalance = parseMoneyValue(bill.balance);
      if (Number.isFinite(parsedBalance)) return Math.max(0, parsedBalance);
    }

    const total = parseMoneyValue(bill?.total ?? bill?.amount ?? 0);
    const paid = parseMoneyValue(bill?.paidAmount ?? 0);
    const vendorCreditsApplied = parseMoneyValue(bill?.vendorCreditsApplied ?? 0);
    return Math.max(0, total - paid - vendorCreditsApplied);
  };

  const isBillEligibleForCreditApplication = (bill: any): boolean => {
    const status = String(bill?.status || "").toLowerCase().trim();
    if (status === "draft" || status === "void" || status === "cancelled" || status === "paid") {
      return false;
    }

    return getBillOutstandingBalance(bill) > 0;
  };

  const fetchData = async (forceSidebar = false) => {
    if (isInitialLoad.current && !vendorCredit) setIsLoading(true);
    try {
      const fetchSidebar = forceSidebar || isInitialLoad.current;

      const requests: Promise<any>[] = [
        vendorCreditsAPI.getById(id).catch(e => { console.error("Error loading credit:", e); return null; })
      ];

      if (fetchSidebar) {
        requests.push(vendorCreditsAPI.getAll().catch(e => { console.error("Error loading vendor credits:", e); return null; }));
        requests.push(currenciesAPI.getBaseCurrency().catch(e => { console.error("Error loading base currency:", e); return null; }));
        requests.push(settingsAPI.getOrganizationProfile().catch(e => { console.error("Error loading org profile:", e); return null; }));
      }

      const results = await Promise.all(requests);
      const creditResponse = results[0];
      const creditsResp = fetchSidebar ? results[1] : null;
      const baseResp = fetchSidebar ? results[2] : null;
      const orgResp = fetchSidebar ? results[3] : null;

      if (creditsResp && creditsResp.data) {
        setVendorCredits(creditsResp.data);
      }

      if (creditResponse && creditResponse.data) {
        const foundCredit = creditResponse.data;
        if (!foundCredit.id) foundCredit.id = foundCredit._id;
        setVendorCredit(foundCredit);

        if (foundCredit.vendor) {
          const vendorId = typeof foundCredit.vendor === 'object' ? foundCredit.vendor._id : foundCredit.vendor;
          vendorsAPI.getById(vendorId).then(vResp => {
            if (vResp && vResp.data) setVendor(vResp.data);
          }).catch(e => console.error("Error loading vendor:", e));
        }

        const currentBaseCurrency = baseResp?.data?.code || baseCurrency;
        if (baseResp && baseResp.data) {
          setBaseCurrency(baseResp.data.code || "AED");
        }

        if (foundCredit.currency && foundCredit.currency !== currentBaseCurrency) {
          currenciesAPI.getAll().then(allCurResp => {
            if (allCurResp && allCurResp.data) {
              const creditCurrency = allCurResp.data.find((c: any) => c.code === foundCredit.currency);
              if (creditCurrency && creditCurrency.exchangeRate) {
                setExchangeRate(creditCurrency.exchangeRate);
              }
            }
          }).catch(e => console.error("Error loading all currencies:", e));
        } else {
          setExchangeRate(1.0);
        }
      } else {
        setVendorCredit(null);
      }

      if (orgResp && orgResp.data) {
        setOrganizationInfo(orgResp.data);
      }

      isInitialLoad.current = false;
    } catch (error) {
      console.error("Error fetching vendor credit details:", error);
      toast.error("Failed to load vendor credit details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const fetchTemplate = async () => {
      try {
        const response = await pdfTemplatesAPI.get();
        if (response?.success && Array.isArray(response.data)) {
          const template = response.data.find((t: any) => t.moduleType === 'vendor_credits');
          if (template) {
            setActivePdfTemplate(template);
          }
        }
      } catch (error) {
        console.error("Error fetching vendor credits template:", error);
      }
    };
    fetchTemplate();

    const handleUpdate = () => {
      fetchData(true);
    };

    window.addEventListener("vendorCreditsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("vendorCreditsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [id]);

  const loadEligibleBillsForApplication = async () => {
    if (!vendorCredit) return [];

    const vendorId = typeof vendorCredit.vendor === "object" ? vendorCredit.vendor._id : vendorCredit.vendor;
    if (!vendorId) return [];

    const response = await billsAPI.getByVendor(vendorId);
    const responseBills = Array.isArray(response?.data) ? response.data : [];
    const vendorBills = responseBills
      .filter((bill: any) => isBillEligibleForCreditApplication(bill))
      .map((bill: any) => ({
        ...bill,
        balance: getBillOutstandingBalance(bill),
        locationName: bill?.locationName || bill?.warehouseLocationName || bill?.location || "Head Office",
      }));

    setBills(vendorBills);

    const initialApplications: Record<string, number> = {};
    vendorBills.forEach((bill: any) => {
      initialApplications[bill.id || bill._id] = 0;
    });
    setCreditApplications(initialApplications);

    return vendorBills;
  };

  const handleOpenApplyModal = async () => {
    try {
      const vendorBills = await loadEligibleBillsForApplication();
      if (!vendorBills.length) {
        toast("There are no open bills for this vendor to apply credits to.");
        return;
      }
      setShowApplyModal(true);
    } catch (error) {
      console.error("Error loading bills for credit application:", error);
      toast.error("Failed to load bills");
    }
  };

  // Load bills when modal opens
  useEffect(() => {
    const loadBills = async () => {
      if (showApplyModal && vendorCredit) {
        try {
          await loadEligibleBillsForApplication();
        } catch (error) {
          console.error("Error loading bills for credit application:", error);
          toast.error("Failed to load bills");
        }
      }
    };
    loadBills();
  }, [showApplyModal, vendorCredit]);

  const handleCreditChange = (billId: string, value: string) => {
    const amount = parseMoneyValue(value);
    const bill = bills.find((b: any) => (b.id || b._id) === billId);
    if (!bill) return;

    const balance = getBillOutstandingBalance(bill);
    const availableTotal = parseMoneyValue(vendorCredit?.balance ?? vendorCredit?.amount ?? 0);

    // Current total applied excluding this bill
    const currentApplied = Object.entries(creditApplications)
      .filter(([id]) => id !== billId)
      .reduce((sum, [_, val]) => sum + (val as number), 0);

    // Max allowed for this bill is min(bill balance, remaining available credits)
    const maxAllowed = Math.max(0, Math.min(balance, availableTotal - currentApplied));
    const finalAmount = Math.max(0, Math.min(amount, maxAllowed));

    setCreditApplications(prev => ({
      ...prev,
      [billId]: finalAmount
    }));
  };

  const calculateTotalCreditsApplied = () => {
    return Object.values(creditApplications).reduce((sum, val) => sum + parseMoneyValue(val), 0);
  };

  const creditBalance = parseMoneyValue(vendorCredit?.balance ?? vendorCredit?.amount ?? 0);
  const creditTotal = parseMoneyValue(vendorCredit?.total ?? vendorCredit?.amount ?? 0);
  const appliedCreditsAmount = Math.max(0, creditTotal - creditBalance);
  const normalizedCreditStatus = String(vendorCredit?.status || "").toLowerCase().trim();
  const hasAppliedBills = appliedCreditsAmount > 0 || normalizedCreditStatus === "closed" || normalizedCreditStatus === "applied";

  const handleSaveApplication = async () => {
    const allocations = Object.entries(creditApplications)
      .filter(([_, amount]) => (amount as number) > 0)
      .map(([billId, amount]) => ({
        billId,
        amount: parseMoneyValue(amount),
        date: appliedDate
      }));

    if (allocations.length === 0) {
      toast.error("Please apply credit to at least one bill");
      return;
    }

    try {
      const response = await vendorCreditsAPI.applyToBills(vendorCredit.id || vendorCredit._id, allocations);
      if (response && (response.success || response.data)) {
        toast.success("Credits applied successfully");
        setShowApplyModal(false);
        fetchData();
      }
    } catch (error: any) {
      console.error("Error applying credits:", error);
      toast.error(error.message || "Failed to apply credits");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(event.target)) {
        setPdfMenuOpen(false);
      }
    };

    if (moreMenuOpen || pdfMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuOpen, pdfMenuOpen]);

  // Format date
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = new Date(typeof dateString === 'string' && !dateString.includes('T') ? dateString + "T00:00:00" : dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount, currency = "CAD") => {
    const symbol = currency === "CAD" ? "$" : currency === "USD" ? "$" : currency === "AWG" ? "AWG" : currency === "USD" ? "USD" : currency;
    const formattedAmount = parseFloat(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol}${formattedAmount}`;
  };

  // Calculate totals
  const calculateSubTotal = () => {
    if (!vendorCredit || !vendorCredit.items) return 0;
    return vendorCredit.items.reduce((sum, item) => sum + (parseFloat(item.total || item.amount) || 0), 0);
  };

  const calculateTaxAmount = () => {
    if (!vendorCredit || !vendorCredit.items) return 0;
    let taxTotal = 0;
    vendorCredit.items.forEach(item => {
      if (item.tax) {
        const taxMatch = item.tax.match(/(\d+(?:\.\d+)?)/);
        const taxPercent = taxMatch ? parseFloat(taxMatch[1]) : 0;
        if (vendorCredit.formData?.taxExclusive === "Tax Inclusive") {
          const subtotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || item.rate || 0);
          taxTotal += (subtotal * taxPercent) / (100 + taxPercent);
        } else {
          taxTotal += ((item.total || item.amount || 0) * taxPercent) / 100;
        }
      }
    });
    return taxTotal;
  };

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    const taxAmount = calculateTaxAmount();
    const adjustment = vendorCredit?.formData?.adjustment || 0;
    return subTotal + taxAmount + adjustment;
  };

  // Get base currency amount (assuming exchange rate)
  const getBaseCurrencyAmount = () => {
    if (!vendorCredit) return "0.00";
    const amount = calculateTotal();
    return (amount * exchangeRate).toFixed(2);
  };

  // Get vendor address
  const getVendorAddress = () => {
    if (!vendor || !vendor.formData) return null;
    const billing = vendor.formData;
    return {
      name: vendor.name,
      email: billing.email || vendor.email || "",
      country: billing.billingCountry || "",
      street1: billing.billingStreet1 || "",
      street2: billing.billingStreet2 || "",
      city: billing.billingCity || "",
      state: billing.billingState || "",
      zipCode: billing.billingZipCode || "",
    };
  };

  const handleDownloadPdf = async () => {
    if (!vendorCredit) return;
    try {
      await downloadVendorCreditsPaperPdf([vendorCredit], organizationInfo);
    } catch (error: any) {
      console.error("Error generating vendor credit PDF:", error);
      toast.error(error?.message || "Failed to generate PDF");
    }
  };

  const handleDeleteVendorCredit = async () => {
    const creditId = vendorCredit?.id || vendorCredit?._id || id;
    if (!creditId) return;
    if (!window.confirm("Are you sure you want to delete this vendor credit?")) return;

    try {
      await vendorCreditsAPI.delete(String(creditId));
      toast.success("Vendor credit deleted successfully");
      window.dispatchEvent(new Event("vendorCreditsUpdated"));
      window.dispatchEvent(new Event("storage"));
      navigate("/purchases/vendor-credits");
    } catch (error: any) {
      console.error("Error deleting vendor credit:", error);
      toast.error(error?.message || "Failed to delete vendor credit");
    }
  };

  const handleCloneVendorCredit = () => {
    if (!vendorCredit) return;
    setMoreMenuOpen(false);
    navigate("/purchases/vendor-credits/new", {
      state: {
        cloneCredit: vendorCredit,
      },
    });
  };

  const handleViewJournal = () => {
    setMoreMenuOpen(false);
    if (!journalSectionRef.current) return;
    journalSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const getVendorCreditId = () => String(vendorCredit?.id || vendorCredit?._id || id || "");

  const getCurrentUserName = () => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return "User";
      const parsed = JSON.parse(rawUser);
      return (
        parsed?.name
        || parsed?.fullName
        || parsed?.displayName
        || parsed?.email
        || "User"
      );
    } catch {
      return "User";
    }
  };

  const getVendorCreditAttachments = () => {
    if (Array.isArray(vendorCredit?.attachments)) return vendorCredit.attachments;
    if (Array.isArray(vendorCredit?.attachedFiles)) return vendorCredit.attachedFiles;
    return [];
  };

  const persistVendorCreditPatch = async (patch: Record<string, any>) => {
    const creditId = getVendorCreditId();
    if (!creditId) {
      throw new Error("Vendor credit ID is missing.");
    }

    const response = await vendorCreditsAPI.update(creditId, patch);
    const updated = response?.data || response?.vendorCredit || response;

    if (updated && typeof updated === "object") {
      setVendorCredit((prev: any) => ({
        ...(prev || {}),
        ...(updated || {}),
        id: updated.id || updated._id || prev?.id || prev?._id,
      }));
    } else {
      setVendorCredit((prev: any) => ({ ...(prev || {}), ...patch }));
    }

    window.dispatchEvent(new Event("vendorCreditsUpdated"));
    window.dispatchEvent(new Event("storage"));

    return updated;
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSaveComment = async () => {
    const text = commentDraft.trim();
    if (!text) {
      toast.error("Please enter a comment.");
      return;
    }

    const existingComments = Array.isArray(vendorCredit?.comments) ? vendorCredit.comments : [];
    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      author: getCurrentUserName(),
      createdAt: new Date().toISOString(),
    };

    setIsSavingComment(true);
    try {
      await persistVendorCreditPatch({ comments: [...existingComments, newComment] });
      setCommentDraft("");
      setShowCommentModal(false);
      toast.success("Comment saved.");
    } catch (error: any) {
      console.error("Error saving vendor credit comment:", error);
      toast.error(error?.message || "Failed to save comment.");
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const existingAttachments = getVendorCreditAttachments();

    setIsUploadingAttachment(true);
    try {
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

      await persistVendorCreditPatch({ attachments: [...existingAttachments, ...attachments] });
      toast.success("Attachment uploaded.");
    } catch (error: any) {
      console.error("Error uploading vendor credit attachment:", error);
      toast.error(error?.message || "Failed to upload attachment.");
    } finally {
      if (event.target) event.target.value = "";
      setIsUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    const attachmentUrl = String(attachment?.url || "");
    if (!attachmentUrl) return;

    const link = document.createElement("a");
    link.href = attachmentUrl;
    link.download = String(attachment?.name || "attachment");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#ffffff" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 16px" }} />
          <p>Loading vendor credit details...</p>
        </div>
      </div>
    );
  }

  if (!vendorCredit) {
    return (
      <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#ffffff" }}>
        <div style={{ textAlign: "center", padding: "48px", color: "#6b7280" }}>
          <h2>Vendor Credit not found</h2>
          <p>Vendor credit with ID "{id}" could not be found.</p>
          <button
            onClick={() => navigate("/purchases/vendor-credits")}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#156372",
              color: "#ffffff",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to Vendor Credits
          </button>
        </div>
      </div>
    );
  }

  const vendorAddress = getVendorAddress();
  const total = calculateTotal();
  const baseAmount = getBaseCurrencyAmount();
  const vendorCreditComments = Array.isArray(vendorCredit?.comments) ? vendorCredit.comments : [];
  const vendorCreditAttachments = getVendorCreditAttachments();

  const styles = {
    container: {
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      position: "relative",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    sidebar: {
      width: "280px",
      borderRight: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      overflowY: "auto" as const,
      display: "flex",
      flexDirection: "column" as const,
      flexShrink: 0,
    },
    sidebarHeader: {
      padding: "16px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
      position: "sticky" as const,
      top: 0,
      zIndex: 10,
    },
    sidebarTitle: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      cursor: "pointer",
    },
    sidebarActions: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    sidebarNewButton: {
      width: "32px",
      height: "32px",
      backgroundColor: "#156372",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    sidebarMoreButton: {
      width: "32px",
      height: "32px",
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
    },
    creditItem: {
      padding: "16px",
      borderBottom: "1px solid #f3f4f6",
      cursor: "pointer",
      display: "flex",
      gap: "12px",
      backgroundColor: "#ffffff",
      transition: "background-color 0.2s",
    },
    creditItemActive: {
      backgroundColor: "#f0f7ff",
    },
    creditItemCheckbox: {
      marginTop: "4px",
    },
    creditItemContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      gap: "2px",
    },
    creditItemMain: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    creditItemVendor: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
    },
    creditItemAmount: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
    },
    creditItemSub: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "2px",
    },
    creditItemMeta: {
      fontSize: "12px",
      color: "#6b7280",
    },
    creditItemStatus: {
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase" as const,
      marginTop: "4px",
    },
    mainContent: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
      backgroundColor: "#ffffff",
    },
    topBar: {
      padding: "12px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
    },
    topBarLeft: {
      fontSize: "15px",
      fontWeight: "700",
      color: "#111827",
    },
    topBarRight: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    utilityIcon: {
      width: "28px",
      height: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
      cursor: "pointer",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      backgroundColor: "#ffffff",
      position: "relative" as const,
    },
    utilityBadge: {
      position: "absolute" as const,
      top: "-6px",
      right: "-6px",
      minWidth: "16px",
      height: "16px",
      borderRadius: "8px",
      padding: "0 4px",
      backgroundColor: "#156372",
      color: "#ffffff",
      fontSize: "10px",
      fontWeight: "700",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
    },
    utilityIconDisabled: {
      opacity: 0.55,
      cursor: "not-allowed",
    },
    actionBar: {
      padding: "8px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#f9fafb",
    },
    actionButton: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "5px 10px",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      cursor: "pointer",
    },
    scrollArea: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "32px 32px 64px 32px",
      backgroundColor: "#f8f9fa",
    },
    documentWrapper: {
      maxWidth: "850px",
      margin: "0 auto",
      backgroundColor: "#ffffff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      padding: "48px",
      position: "relative" as const,
      minHeight: "800px",
      border: "1px solid #e5e7eb",
      borderRadius: "2px",
    },
    journalWrapper: {
      maxWidth: "850px",
      margin: "0 auto",
      marginTop: "40px",
    },
    ribbon: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      borderLeft: "64px solid #156372",
      borderBottom: "64px solid transparent",
      zIndex: 10,
    },
    ribbonClosed: {
      borderLeftColor: "#10b981",
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
    docHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "32px",
    },
    orgInfo: {
      textAlign: "left" as const,
    },
    orgName: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#111827",
      marginBottom: "2px",
    },
    orgAddress: {
      fontSize: "13px",
      color: "#4b5563",
      maxWidth: "200px",
      lineHeight: "1.4",
    },
    docType: {
      textAlign: "right" as const,
    },
    docTitle: {
      fontSize: "36px",
      fontWeight: "300",
      color: "#111827",
      letterSpacing: "1px",
      marginBottom: "4px",
    },
    creditNoteRef: {
      fontSize: "14px",
      color: "#111827",
      fontWeight: "500",
    },
    creditsRemainingBox: {
      textAlign: "right" as const,
      marginBottom: "32px",
    },
    creditsLabel: {
      fontSize: "12px",
      color: "#6b7280",
      marginBottom: "2px",
      fontWeight: "500",
    },
    creditsAmount: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#111827",
    },
    docGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "40px",
      marginBottom: "32px",
      marginTop: "48px",
    },
    addressBlock: {
      textAlign: "left" as const,
    },
    labelSmall: {
      fontSize: "12px",
      color: "#6b7280",
      marginBottom: "6px",
      fontWeight: "500",
    },
    vendorLink: {
      fontSize: "14px",
      color: "#156372",
      textDecoration: "none",
      fontWeight: "600",
      cursor: "pointer",
    },
    metaBlock: {
      textAlign: "right" as const,
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    },
    metaItem: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      fontSize: "13px",
    },
    metaLabel: {
      color: "#6b7280",
      fontWeight: "500",
    },
    metaValue: {
      color: "#111827",
      fontWeight: "500",
      width: "100px",
    },
    itemsTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
      marginBottom: "24px",
    },
    itemsTableHeader: {
      backgroundColor: "#333333",
      color: "#ffffff",
    },
    itemsTableHeaderCell: {
      padding: "8px 12px",
      fontSize: "11px",
      fontWeight: "600",
      textAlign: "left" as const,
      textTransform: "uppercase" as const,
    },
    itemsTableRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    itemsTableCell: {
      padding: "12px",
      fontSize: "13px",
      color: "#111827",
      verticalAlign: "top" as const,
    },
    itemsTotalSection: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "flex-end",
      gap: "4px",
      marginBottom: "40px",
    },
    totalLine: {
      width: "200px",
      display: "flex",
      justifyContent: "space-between",
      padding: "4px 0",
      fontSize: "13px",
      color: "#4b5563",
    },
    grandTotalLine: {
      width: "200px",
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      fontSize: "15px",
      fontWeight: "700",
      color: "#111827",
    },
    shadedBox: {
      width: "100%",
      backgroundColor: "#f3f4f6",
      padding: "16px 24px",
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "48px",
      marginTop: "16px",
      borderRadius: "2px",
    },
    shadedBoxLabel: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#4b5563",
    },
    shadedBoxValue: {
      fontSize: "14px",
      fontWeight: "700",
      color: "#111827",
    },
    journalSection: {
      marginTop: "64px",
      borderTop: "1px solid #e5e7eb",
    },
    journalTab: {
      display: "inline-block",
      padding: "12px 24px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#156372",
      borderBottom: "2px solid #156372",
      marginBottom: "24px",
      cursor: "pointer",
    },
    journalContent: {
      backgroundColor: "#ffffff",
    },
    journalInfo: {
      fontSize: "12px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginBottom: "16px",
    },
    journalCurrencyBadge: {
      backgroundColor: "#10b981",
      color: "#ffffff",
      padding: "1px 4px",
      borderRadius: "2px",
      fontSize: "10px",
      fontWeight: "700",
    },
    journalTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
    },
    journalTableHeaderCell: {
      padding: "8px 12px",
      fontSize: "11px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase" as const,
      textAlign: "right" as const,
      borderBottom: "1px solid #e5e7eb",
    },
    journalTableCell: {
      padding: "10px 12px",
      fontSize: "13px",
      color: "#111827",
      textAlign: "right" as const,
      borderBottom: "1px solid #f3f4f6",
    },
    journalTotalRow: {
      fontWeight: "700",
      borderBottom: "none",
    },
    modalOverlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      width: "90%",
      maxWidth: "900px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column" as const,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    },
    modalHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#111827",
    },
    modalCloseButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modalBody: {
      padding: "24px",
      overflowY: "auto" as const,
      flex: 1,
      msOverflowStyle: "none",
      scrollbarWidth: "none",
    },
    modalTopBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px",
      flexWrap: "wrap" as const,
      gap: "16px",
    },
    setAppliedDateOption: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    toggleSwitch: {
      width: "44px",
      height: "24px",
      borderRadius: "12px",
      backgroundColor: appliedOnDate ? "#156372" : "#d1d5db",
      position: "relative" as const,
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    toggleThumb: {
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      position: "absolute" as const,
      top: "2px",
      left: appliedOnDate ? "22px" : "2px",
      transition: "left 0.2s",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    },
    availableCredits: {
      fontSize: "14px",
      color: "#111827",
      fontWeight: "500",
    },
    billsTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
      marginBottom: "20px",
    },
    billsTableHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "2px solid #e5e7eb",
    },
    billsTableHeaderCell: {
      padding: "12px",
      textAlign: "left" as const,
      fontSize: "12px",
      fontWeight: "600",
      color: "#6b7280",
      textTransform: "uppercase" as const,
    },
    billsTableRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    billsTableCell: {
      padding: "12px",
      fontSize: "14px",
      color: "#111827",
    },
    creditInput: {
      width: "100px",
      padding: "6px 8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
      outline: "none",
    },
    journalSectionStyle: {
      marginTop: "40px",
      borderTop: "1px solid #e5e7eb",
      paddingTop: "24px",
    },
    journalAccordion: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#6b7280",
      fontSize: "14px",
      marginBottom: "16px",
    },
    journalHeader: {
      marginBottom: "16px",
    },
    journalTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "4px",
    },
    journalBaseCurrency: {
      fontSize: "12px",
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    summaryBox: {
      minWidth: "300px",
    },
    metaPanelsWrapper: {
      maxWidth: "850px",
      margin: "24px auto 0",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    metaPanel: {
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "14px",
      minHeight: "160px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "10px",
    },
    metaPanelHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      borderBottom: "1px solid #f3f4f6",
      paddingBottom: "10px",
    },
    metaPanelTitle: {
      fontSize: "13px",
      fontWeight: "700",
      color: "#111827",
    },
    metaPanelAction: {
      padding: "6px 10px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      backgroundColor: "#ffffff",
      cursor: "pointer",
    },
    metaItemCard: {
      border: "1px solid #f3f4f6",
      borderRadius: "6px",
      backgroundColor: "#fafafa",
      padding: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
    },
    metaItemText: {
      fontSize: "13px",
      color: "#111827",
      fontWeight: "500",
      wordBreak: "break-word" as const,
    },
    metaItemSubtext: {
      fontSize: "11px",
      color: "#6b7280",
      marginTop: "4px",
    },
    metaItemAction: {
      padding: "5px 9px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "12px",
      color: "#156372",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      flexShrink: 0,
    },
    metaEmpty: {
      fontSize: "13px",
      color: "#6b7280",
      padding: "8px 0",
    },
    commentTextarea: {
      width: "100%",
      minHeight: "140px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      padding: "10px 12px",
      fontSize: "14px",
      color: "#111827",
      resize: "vertical" as const,
      outline: "none",
    },
    hideScrollbar: `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `,
    modalFooter: {
      padding: "16px 24px",
      borderTop: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "12px",
    },
    cancelButton: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    saveButton: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "6px",
      border: "none",
      backgroundColor: "#156372",
      color: "#ffffff",
      cursor: "pointer",
    },
    // Missing styles used in JSX
    headerIconBtn: {
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      cursor: "pointer",
    },
    headerButton: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      cursor: "pointer",
    },
    moreDropdownWrapper: {
      position: "relative",
    },
    moreDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "4px",
      width: "200px",
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      zIndex: 50,
      padding: "4px 0",
    },
    moreDropdownItem: {
      width: "100%",
      padding: "8px 16px",
      fontSize: "13px",
      color: "#374151",
      textAlign: "left" as const,
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    content: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "32px",
      backgroundColor: "#f8f9fa",
    },
    creditDocument: {
      maxWidth: "850px",
      margin: "0 auto",
      backgroundColor: "#ffffff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      borderRadius: "4px",
    },
    itemsHeaderCell: {
      padding: "12px",
      textAlign: "left" as const,
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase" as const,
    },
    itemsRow: {
      borderBottom: "1px solid #f3f4f6",
    },
    itemsCell: {
      padding: "12px",
      fontSize: "13px",
      color: "#111827",
    },
  };

  // Calculate total amount to credit
  const totalAmountToCredit = Object.values(creditApplications).reduce((sum: number, amount: any) => {
    return sum + parseMoneyValue(amount);
  }, 0) as number;

  // Calculate remaining credits
  const availableCredits = parseMoneyValue(vendorCredit?.balance ?? vendorCredit?.amount ?? 0);
  const remainingCredits = Math.max(0, availableCredits - (totalAmountToCredit as number));

  // Format date for display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Handle credit application change
  // const handleCreditChange = (billId, value) => {
  //   const bill = bills.find(b => b.id === billId);
  //   if (!bill) return;

  //   const maxCredit = Math.min(
  //     parseFloat(bill.balanceDue || bill.amount || 0),
  //     remainingCredits + (parseFloat(creditApplications[billId]) || 0)
  //   );

  //   const creditAmount = Math.max(0, Math.min(parseFloat(value) || 0, maxCredit));

  //   setCreditApplications(prev => ({
  //     ...prev,
  //     [billId]: creditAmount,
  //   }));
  // };

  // Handle save
  const handleSave = async () => {
    // Prepare allocations
    const allocations = Object.keys(creditApplications)
      .filter(billId => parseFloat(creditApplications[billId] as any) > 0)
      .map(billId => ({
        billId,
        amount: parseFloat(creditApplications[billId] as any)
      }));

    if (allocations.length === 0) {
      toast.error("Please enter credit amount to apply");
      return;
    }

    try {
      await vendorCreditsAPI.applyToBills(id, allocations);
      toast.success("Credits applied successfully");
      setShowApplyModal(false);
      setCreditApplications({});
      fetchData(); // Reload credit and sidebar
    } catch (error: any) {
      console.error("Error applying credits:", error);
      toast.error(error.message || "Failed to apply credits");
    }
  };

  return (
    <div style={styles.container}>
      <style>{styles.hideScrollbar}</style>

      {/* Sidebar - Left Column */}
      <div style={styles.sidebar} className="hide-scrollbar">
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>
            All Vendor Credits
            <ChevronDown size={14} />
          </div>
          <div style={styles.sidebarActions}>
            <button style={styles.sidebarMoreButton} onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
              <ArrowUpDown size={14} />
            </button>
            <button style={styles.sidebarNewButton} onClick={() => navigate("/purchases/vendor-credits/new")}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {vendorCredits.map((credit: any) => (
          <div
            key={credit.id || credit._id}
            style={{
              ...styles.creditItem,
              ...(id === (credit.id || credit._id) ? styles.creditItemActive : {}),
            }}
            onClick={() =>
              navigate(`/purchases/vendor-credits/${credit.id || credit._id}`, {
                state: {
                  vendorCredit: credit,
                  vendorCredits,
                },
              })
            }
          >
            <input type="checkbox" style={styles.creditItemCheckbox} onClick={(e) => e.stopPropagation()} />
            <div style={styles.creditItemContent}>
              <div style={styles.creditItemMain}>
                <span style={styles.creditItemVendor}>
                  {credit.vendorName || (credit.vendor && typeof credit.vendor === 'object' ? (credit.vendor.displayName || credit.vendor.name) : "Vendor")}
                </span>
                <span style={styles.creditItemAmount}>{formatCurrency(credit.balance || credit.amount, credit.currency)}</span>
              </div>
              <div style={styles.creditItemSub}>
                <span style={styles.creditItemMeta}>{credit.creditNumber || credit.creditNote} | {formatDate(credit.date)}</span>
              </div>
              <div style={{
                ...styles.creditItemStatus,
                color: credit.status?.toLowerCase() === 'closed' ? "#10b981" : "#156372"
              }}>
                {credit.status || "OPEN"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* Top Utility Bar */}
        <div style={styles.topBar}>
          <div style={styles.topBarLeft}>{vendorCredit.creditNumber || vendorCredit.creditNote}</div>
          <div style={styles.topBarRight}>
            <div style={styles.utilityIcon} title="Apply to bills">
              <Link2 size={16} />
            </div>
            <div
              style={styles.utilityIcon}
              title="Add comment"
              onClick={() => setShowCommentModal(true)}
            >
              <MessageSquare size={16} />
              {vendorCreditComments.length > 0 && (
                <span style={styles.utilityBadge}>{vendorCreditComments.length}</span>
              )}
            </div>
            <div
              style={{
                ...styles.utilityIcon,
                ...(isUploadingAttachment ? styles.utilityIconDisabled : {}),
              }}
              title="Attach files"
              onClick={() => {
                if (isUploadingAttachment) return;
                attachmentInputRef.current?.click();
              }}
            >
              <Paperclip size={16} />
              {vendorCreditAttachments.length > 0 && (
                <span style={styles.utilityBadge}>{vendorCreditAttachments.length}</span>
              )}
            </div>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleAttachmentUpload}
            />
            <div style={{ ...styles.utilityIcon, color: "#156372" }} onClick={() => navigate("/purchases/vendor-credits")}>
              <X size={18} />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={styles.actionBar}>
          <button
            style={styles.actionButton}
            onClick={() => {
              navigate(`/purchases/vendor-credits/${vendorCredit?.id || vendorCredit?._id || id}/edit`, {
                state: { editCredit: vendorCredit, isEdit: true, creditId: vendorCredit?.id || vendorCredit?._id || id },
              });
            }}
          >
            <Edit size={14} /> Edit
          </button>
          <div style={styles.moreDropdownWrapper} ref={pdfMenuRef}>
            <button style={styles.actionButton} onClick={() => setPdfMenuOpen(!pdfMenuOpen)}>
              <FileText size={14} /> PDF <ChevronDown size={12} />
            </button>
            {pdfMenuOpen && (
              <div style={styles.moreDropdown}>
                <button
                  style={styles.moreDropdownItem}
                  onClick={() => {
                    setPdfMenuOpen(false);
                    handleDownloadPdf();
                  }}
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
          {!hasAppliedBills && (
            <button style={styles.actionButton} onClick={handleOpenApplyModal}>
              <Link2 size={14} /> Apply to Bills
            </button>
          )}
          <div style={styles.moreDropdownWrapper} ref={moreMenuRef}>
            <button style={{ ...styles.actionButton, padding: "5px" }} onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
              <MoreVertical size={14} />
            </button>
            {moreMenuOpen && (
              <div style={styles.moreDropdown}>
                <button
                  style={styles.moreDropdownItem}
                  onClick={handleCloneVendorCredit}
                >
                  Clone
                </button>
                <button
                  style={styles.moreDropdownItem}
                  onClick={handleViewJournal}
                >
                  View Journal
                </button>
                {!hasAppliedBills && (
                  <button
                    style={styles.moreDropdownItem}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      handleDeleteVendorCredit();
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div style={styles.scrollArea} className="hide-scrollbar">
          <div className="w-full max-w-4xl mx-auto">
            <TransactionPDFDocument
              data={{
                ...vendorCredit,
                number: vendorCredit.creditNumber || vendorCredit.creditNote,
                date: vendorCredit.date,
                customerName: vendorCredit.vendorName || (vendorCredit.vendor && typeof vendorCredit.vendor === 'object' ? (vendorCredit.vendor.displayName || vendorCredit.vendor.name) : "Vendor"),
                billingAddress: vendorCredit.vendorAddress || (vendorCredit.vendor && typeof vendorCredit.vendor === 'object' ? vendorCredit.vendor.billingAddress : ""),
                items: (vendorCredit.items || []).map((item: any) => ({
                  ...item,
                  name: (item.item && typeof item.item === 'object' ? item.item.name : item.name) || item.name || item.description || item.itemDetails || "Item",
                  description: "",
                  quantity: item.quantity || 0,
                  rate: item.unitPrice || item.rate || 0,
                  amount: item.total || item.amount || 0,
                  unit: item.unit || ""
                }))
              }}
              config={activePdfTemplate?.config || {}}
              moduleType="vendor_credits"
              organization={organizationInfo}
              totalsMeta={{
                subTotal: calculateSubTotal(),
                total: total,
                balance: creditBalance,
                creditsApplied: appliedCreditsAmount
              }}
            />
          </div>
          {/* End of Document Card */}

          {/* Journal Section - Outside the card */}
          <div ref={journalSectionRef} style={(styles as any).journalWrapper}>
            <div style={styles.journalSectionStyle}>
              <div style={styles.journalTab}>Journal</div>
              <div style={styles.journalContent}>
                <div style={styles.journalInfo}>
                  Amount is displayed in your base currency <span style={styles.journalCurrencyBadge}>{baseCurrency}</span>
                </div>
                <div style={styles.journalTitle}>Inventory Valuation for Vendor Credits</div>
                <table style={styles.journalTable}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.journalTableHeaderCell, textAlign: "left" as const }}>Account</th>
                      <th style={styles.journalTableHeaderCell}>Debit</th>
                      <th style={styles.journalTableHeaderCell}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorCredit.items && vendorCredit.items.length > 0 ? vendorCredit.items.map((item: any, idx: number) => {
                      const itemAmount = parseFloat(item.total || item.amount || 0);
                      const baseItemAmount = itemAmount * exchangeRate;
                      const itemName = (item.item && typeof item.item === 'object' ? item.item.name : item.name) || item.name || item.description || item.itemDetails || "No description";
                      return (
                        <React.Fragment key={idx}>
                          <tr>
                            <td style={{ ...styles.journalTableCell, textAlign: "left" as const }}>Cost of Goods Sold ({itemName})</td>
                            <td style={styles.journalTableCell}>{baseItemAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td style={styles.journalTableCell}>0.00</td>
                          </tr>
                          <tr>
                            <td style={{ ...styles.journalTableCell, textAlign: "left" as const }}>Inventory Asset ({itemName})</td>
                            <td style={styles.journalTableCell}>0.00</td>
                            <td style={styles.journalTableCell}>{baseItemAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td style={{ ...styles.journalTableCell, textAlign: "left" as const }}>Accounts Payable</td>
                            <td style={styles.journalTableCell}>{baseItemAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td style={styles.journalTableCell}>0.00</td>
                          </tr>
                          <tr>
                            <td style={{ ...styles.journalTableCell, textAlign: "left" as const }}>Cost of Goods Sold</td>
                            <td style={styles.journalTableCell}>0.00</td>
                            <td style={styles.journalTableCell}>{baseItemAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </React.Fragment>
                      );
                    }) : null}
                    <tr style={styles.journalTotalRow}>
                      <td style={{ ...styles.journalTableCell, textAlign: "left" as const, fontWeight: 700 }}>Total</td>
                      <td style={{ ...styles.journalTableCell, fontWeight: 700 }}>
                        {(parseFloat(baseAmount) * 2).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...styles.journalTableCell, fontWeight: 700 }}>
                        {(parseFloat(baseAmount) * 2).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={styles.metaPanelsWrapper}>
            <div style={styles.metaPanel}>
              <div style={styles.metaPanelHeader}>
                <span style={styles.metaPanelTitle}>Comments ({vendorCreditComments.length})</span>
                <button
                  type="button"
                  style={styles.metaPanelAction}
                  onClick={() => setShowCommentModal(true)}
                >
                  Add Comment
                </button>
              </div>
              {vendorCreditComments.length > 0 ? (
                vendorCreditComments.map((comment: any) => (
                  <div key={String(comment?.id || comment?._id || Math.random())} style={styles.metaItemCard}>
                    <div style={styles.metaItemText}>{String(comment?.text || "").trim()}</div>
                    <div style={styles.metaItemSubtext}>
                      {comment?.author ? `${comment.author} • ` : ""}
                      {formatDate(comment?.createdAt || comment?.date || new Date().toISOString())}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.metaEmpty}>No comments yet.</div>
              )}
            </div>

            <div style={styles.metaPanel}>
              <div style={styles.metaPanelHeader}>
                <span style={styles.metaPanelTitle}>Attachments ({vendorCreditAttachments.length})</span>
                <button
                  type="button"
                  style={styles.metaPanelAction}
                  disabled={isUploadingAttachment}
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  {isUploadingAttachment ? "Uploading..." : "Attach File"}
                </button>
              </div>
              {vendorCreditAttachments.length > 0 ? (
                vendorCreditAttachments.map((attachment: any) => (
                  <div key={String(attachment?.id || attachment?._id || Math.random())} style={styles.metaItemCard}>
                    <div>
                      <div style={styles.metaItemText}>{attachment?.name || "Attachment"}</div>
                      <div style={styles.metaItemSubtext}>
                        {formatDate(attachment?.uploadedAt || new Date().toISOString())}
                        {attachment?.size ? ` • ${(Number(attachment.size) / (1024 * 1024)).toFixed(2)} MB` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={styles.metaItemAction}
                      onClick={() => handleDownloadAttachment(attachment)}
                    >
                      Download
                    </button>
                  </div>
                ))
              ) : (
                <div style={styles.metaEmpty}>No attachments yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCommentModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCommentModal(false)}>
          <div
            style={{ ...styles.modal, maxWidth: "560px", width: "92%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add Comment</h2>
              <button style={styles.modalCloseButton} onClick={() => setShowCommentModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ ...styles.modalBody, paddingTop: "18px", paddingBottom: "18px" }}>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Write your comment..."
                style={styles.commentTextarea}
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.cancelButton, marginRight: "auto" }} onClick={() => setShowCommentModal(false)}>
                Cancel
              </button>
              <button style={styles.saveButton} disabled={isSavingComment} onClick={handleSaveComment}>
                {isSavingComment ? "Saving..." : "Save Comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApplyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowApplyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Apply credits from {vendorCredit.creditNote || vendorCredit.creditNumber}</h2>
              <button style={styles.modalCloseButton} onClick={() => setShowApplyModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalTopBar}>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#374151" }}>Bills to Apply</div>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div style={styles.setAppliedDateOption}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Set Applied on Date</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={styles.toggleSwitch} onClick={() => setAppliedOnDate(!appliedOnDate)}>
                        <div style={styles.toggleThumb} />
                      </div>
                      {appliedOnDate && (
                        <input
                          type="date"
                          value={appliedDate}
                          onChange={(e) => setAppliedDate(e.target.value)}
                          style={{ ...styles.creditInput, width: "130px", padding: "4px 8px" }}
                        />
                      )}
                    </div>
                  </div>
                  <div style={styles.availableCredits}>
                    Available Credits: <span style={{ fontWeight: "700" }}>{vendorCredit.currency} {availableCredits.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    <span style={{ color: "#6b7280", fontSize: "13px", fontWeight: "400", marginLeft: "4px" }}>({formatDate(vendorCredit.date || new Date().toISOString())})</span>
                  </div>
                </div>
              </div>

              <table style={styles.billsTable}>
                <thead style={styles.billsTableHeader}>
                  <tr>
                    <th style={styles.billsTableHeaderCell}>BILL#</th>
                    <th style={styles.billsTableHeaderCell}>BILL DATE</th>
                    <th style={styles.billsTableHeaderCell}>LOCATION</th>
                    <th style={styles.billsTableHeaderCell}>BILL AMOUNT</th>
                    <th style={styles.billsTableHeaderCell}>BILL BALANCE</th>
                    <th style={styles.billsTableHeaderCell}>CREDITS APPLIED ON</th>
                    <th style={{ ...styles.billsTableHeaderCell, textAlign: "right" as const }}>CREDITS TO APPLY</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length > 0 ? bills.map((bill: any, idx: number) => {
                    const billId = bill.id || bill._id;
                    const appliedAmount = creditApplications[billId] || 0;
                    return (
                      <tr key={idx} style={styles.billsTableRow}>
                        <td style={styles.billsTableCell}>{bill.billNumber}</td>
                        <td style={styles.billsTableCell}>{formatDate(bill.date)}</td>
                        <td style={styles.billsTableCell}>{bill.locationName || "Head Office"}</td>
                        <td style={styles.billsTableCell}>{vendorCredit.currency} {parseMoneyValue(bill.amount || bill.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td style={styles.billsTableCell}>{vendorCredit.currency} {getBillOutstandingBalance(bill).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td style={styles.billsTableCell}>
                          {appliedOnDate ? (
                            <span>{formatDate(appliedDate)}</span>
                          ) : (
                            <input
                              type="date"
                              value={appliedDate}
                              onChange={(e) => setAppliedDate(e.target.value)}
                              style={{ ...styles.creditInput, width: "130px", border: "none", background: "transparent" }}
                            />
                          )}
                        </td>
                        <td style={{ ...styles.billsTableCell, textAlign: "right" as const }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={appliedAmount || ""}
                            placeholder="0.00"
                            onChange={(e) => handleCreditChange(billId, e.target.value)}
                            style={{ ...styles.creditInput, textAlign: "right" as const }}
                          />
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                        No unpaid bills found for this vendor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <div style={{
                  backgroundColor: "#f9fafb",
                  padding: "20px 24px",
                  borderRadius: "8px",
                  minWidth: "300px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: "#4b5563" }}>Total Amount to Credit:</span>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                      {calculateTotalCreditsApplied().toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: "#4b5563" }}>Remaining credits:</span>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>
                      {(parseFloat(vendorCredit.balance || vendorCredit.amount || 0) - calculateTotalCreditsApplied()).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.cancelButton, marginRight: "auto" }} onClick={() => setShowApplyModal(false)}>Cancel</button>
              <button style={styles.saveButton} onClick={handleSaveApplication}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
