import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPaymentById, getPayments, updatePayment, deletePayment, Payment } from "../../salesModel";
import { settingsAPI, bankAccountsAPI, refundsAPI, chartOfAccountsAPI } from "../../../../services/api";
import { useCurrency } from "../../../../hooks/useCurrency";
import { PAYMENT_MODE_OPTIONS } from "../../../../utils/paymentModes";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  X, Edit, Send, FileText, MoreVertical,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, Filter,
  ArrowUpDown, CheckSquare, Square, Search, Star, Link2, Mail, Settings,
  User, Calendar, ChevronDown as ChevronDownIcon, Paperclip, MessageCircle, RotateCcw,
  FileUp, Bold, Italic, Underline
} from "lucide-react";

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { baseCurrency, symbol } = useCurrency();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAllPaymentsDropdownOpen, setIsAllPaymentsDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    message: ""
  });
  const [refundData, setRefundData] = useState({
    amount: "",
    refundedOn: "",
    paymentMode: "",
    referenceNumber: "",
    fromAccount: "",
    fromAccountId: "",
    description: ""
  });
  const [isPaymentModeDropdownOpen, setIsPaymentModeDropdownOpen] = useState(false);
  const [isFromAccountDropdownOpen, setIsFromAccountDropdownOpen] = useState(false);
  const [isRefundDatePickerOpen, setIsRefundDatePickerOpen] = useState(false);
  const [refundDateCalendar, setRefundDateCalendar] = useState(new Date());
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [paymentAttachments, setPaymentAttachments] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBold, setCommentBold] = useState(false);
  const [commentItalic, setCommentItalic] = useState(false);
  const [commentUnderline, setCommentUnderline] = useState(false);
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState({
    name: "TABAN ENTERPRISES",
    street1: "",
    street2: "",
    city: "",
    stateProvince: "",
    country: "Somalia",
    zipCode: "",
    phone: "",
    email: "",
    websiteUrl: ""
  });
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const allPaymentsDropdownRef = useRef<HTMLDivElement>(null);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);
  const emailModalRef = useRef<HTMLDivElement>(null);
  const refundModalRef = useRef<HTMLDivElement>(null);
  const paymentModeDropdownRef = useRef<HTMLDivElement>(null);
  const fromAccountDropdownRef = useRef<HTMLDivElement>(null);
  const refundDatePickerRef = useRef<HTMLDivElement>(null);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);
  const receiptPaperRef = useRef<HTMLDivElement>(null);

  const paymentModeOptions = [...PAYMENT_MODE_OPTIONS];
  const depositToOptions = ["[123231] mohamed", "[123232] Account 1", "[123233] Account 2"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const statusFilters = [
    "All Payments",
    "Draft",
    "Paid",
    "Void"
  ];

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        const paymentData = await getPaymentById(id || "");
        if (paymentData) {
          setPayment(paymentData);
          setPaymentAttachments(Array.isArray((paymentData as any).attachments) ? (paymentData as any).attachments : []);
          setComments(Array.isArray((paymentData as any).comments) ? (paymentData as any).comments : []);
        } else {
          navigate("/sales/payments-received");
        }

        const allPayments = await getPayments();
        setPayments(allPayments);
      } catch (error) {
        console.error("Error loading payment data:", error);
      }
    };

    loadPaymentData();

    const fetchOrganizationProfile = async () => {
      try {
        const response = await settingsAPI.getOrganizationProfile();
        if (response && response.success && response.data) {
          const org = response.data;
          setOrganizationProfile(org);
          if (org.logo) setLogoPreview(org.logo);
          if (org.address) {
            setOrganizationData(prev => ({
              ...prev,
              name: org.name || prev.name,
              street1: org.address.street1 || prev.street1,
              street2: org.address.street2 || prev.street2,
              city: org.address.city || prev.city,
              stateProvince: org.address.state || prev.stateProvince,
              country: org.address.country || prev.country,
              zipCode: org.address.zipCode || prev.zipCode,
              phone: org.phone || prev.phone,
              email: org.email || prev.email,
              websiteUrl: org.website || prev.websiteUrl
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching organization profile:", error);
      }
    };
    fetchOrganizationProfile();

    const fetchDropdownData = async () => {
      try {
        const accountsResponse = await chartOfAccountsAPI.getAccounts({ limit: 1000 });
        if (accountsResponse && accountsResponse.data) {
          const cashBankAccounts = accountsResponse.data
            .filter((acc: any) => {
              const accountType = (acc.account_type || acc.accountType || "").toLowerCase();
              const name = (acc.accountName || acc.name || "").toLowerCase();
              return accountType === 'cash' ||
                accountType === 'bank' ||
                accountType === 'asset' ||
                name.includes('cash') ||
                name.includes('bank') ||
                name.includes('petty') ||
                name.includes('undeposited');
            })
            .map((acc: any) => {
              const name = acc.accountName || acc.name || "Unnamed Account";
              const code = acc.accountCode || acc.code || "";
              // If code looks like a slug (has underscores or no numbers), only show name
              const showCode = code && !/^[a-z_]+$/.test(code);
              return {
                ...acc,
                id: acc.id || acc._id,
                displayName: showCode ? `[${code}] ${name}` : name,
                accountName: name,
                accountCode: code
              };
            });
          setBankAccounts(cashBankAccounts);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };
    fetchDropdownData();

    const fetchRefunds = async () => {
      if (!id) return;
      try {
        const response = await refundsAPI.getByPaymentId(id);
        if (response && response.success) {
          setRefunds(response.data);
        }
      } catch (error) {
        console.error("Error fetching refunds:", error);
      }
    };
    fetchRefunds();
  }, [id, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (allPaymentsDropdownRef.current && !allPaymentsDropdownRef.current.contains(event.target as Node)) {
        setIsAllPaymentsDropdownOpen(false);
      }
      if (pdfDropdownRef.current && !pdfDropdownRef.current.contains(event.target as Node)) {
        setIsPdfDropdownOpen(false);
      }
      if (emailModalRef.current && !emailModalRef.current.contains(event.target as Node) && isEmailModalOpen) {
        setIsEmailModalOpen(false);
      }
      if (refundModalRef.current && !refundModalRef.current.contains(event.target as Node) && isRefundModalOpen) {
        setIsRefundModalOpen(false);
      }
      if (paymentModeDropdownRef.current && !paymentModeDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentModeDropdownOpen(false);
      }
      if (fromAccountDropdownRef.current && !fromAccountDropdownRef.current.contains(event.target as Node)) {
        setIsFromAccountDropdownOpen(false);
      }
      if (refundDatePickerRef.current && !refundDatePickerRef.current.contains(event.target as Node)) {
        setIsRefundDatePickerOpen(false);
      }
    };

    if (isMoreMenuOpen || isAllPaymentsDropdownOpen || isPdfDropdownOpen || isEmailModalOpen ||
      isRefundModalOpen || isPaymentModeDropdownOpen || isFromAccountDropdownOpen || isRefundDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen, isAllPaymentsDropdownOpen, isPdfDropdownOpen, isEmailModalOpen,
    isRefundModalOpen, isPaymentModeDropdownOpen, isFromAccountDropdownOpen, isRefundDatePickerOpen]);

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files as File[]);
    }
    e.target.value = ''; // Reset input
  };

  const formatCurrency = (amount: number | string, currency = symbol || baseCurrency?.code || "USD") => {
    return `${currency}${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    // If already formatted, return as is
    if (dateString.includes(" ")) return dateString;
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatJournalAmount = (value: number | string) =>
    parseFloat(String(value || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getRefundFromAccountName = (refund: any) =>
    refund?.fromAccount?.accountName ||
    refund?.fromAccount?.name ||
    refund?.fromAccountName ||
    payment?.depositTo ||
    "Petty Cash";

  const handleFilterSelect = (filter) => {
    setIsAllPaymentsDropdownOpen(false);
    if (filter === "All Payments") {
      navigate("/sales/payments-received");
    } else {
      navigate(`/sales/payments-received?status=${filter.toLowerCase()}`);
    }
  };

  const filteredStatusOptions = statusFilters.filter(filter =>
    filter.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const filteredPayments = Array.isArray(payments) ? payments.filter(p => {
    if (filterSearch) {
      return p.customerName?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.paymentNumber?.toString().includes(filterSearch);
    }
    return true;
  }) : [];

  // Initialize email data when payment is loaded
  useEffect(() => {
    if (payment) {
      setEmailData({
        to: payment.customerEmail || payment.thankYouRecipients?.[0]?.email || "",
        subject: `Payment Receipt - ${payment.paymentNumber || payment.id}`,
        message: `Dear ${payment.customerName || "Customer"},\n\nThank you for your payment. Please find the payment receipt attached.\n\nPayment Details:\n- Payment Number: ${payment.paymentNumber || payment.id}\n- Amount: ${formatCurrency(payment.amountReceived || 0, payment.currency)}\n- Payment Date: ${formatDate(payment.paymentDate)}\n\nBest regards,\nTaban Books`
      });
    }
  }, [payment]);

  // Initialize refund data when refund modal opens
  useEffect(() => {
    if (isRefundModalOpen && payment) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = months[today.getMonth()];
      const year = today.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;

      setRefundData({
        amount: (payment.amountReceived || 0).toString(),
        refundedOn: formattedDate,
        paymentMode: payment.paymentMode || "Cash",
        referenceNumber: "",
        fromAccount: payment.depositTo || (bankAccounts.length > 0 ? (bankAccounts[0].displayName || bankAccounts[0].accountName) : ""),
        fromAccountId: bankAccounts.find(a => (a.accountName === payment.depositTo || a.name === payment.depositTo || a.displayName === payment.depositTo))?._id || (bankAccounts.length > 0 ? (bankAccounts[0]._id || bankAccounts[0].id) : ""),
        description: ""
      });
    }
  }, [isRefundModalOpen, payment, bankAccounts]);

  const handleSendEmail = () => {
    // Navigate to the dedicated Send Email page for payment receipts
    navigate(`/sales/payments-received/${id}/send-email`, { state: { paymentData: payment } });
  };

  const handleEmailSend = () => {
    // Create mailto link
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.message);
    const mailtoLink = `mailto:${emailData.to}?subject=${subject}&body=${body}`;

    // Open default email client
    window.location.href = mailtoLink;

    // Close modal after a short delay
    setTimeout(() => {
      setIsEmailModalOpen(false);
      alert("Email client opened. Please send the email from your email application.");
    }, 100);
  };

  const handleDownloadPDF = async () => {
    setIsPdfDropdownOpen(false);
    if (!payment || !receiptPaperRef.current) return;

    try {
      const canvas = await html2canvas(receiptPaperRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
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

      const safePaymentNumber = String(payment.paymentNumber || payment.id || "payment-receipt").replace(/[^a-zA-Z0-9-_]/g, "-");
      pdf.save(`${safePaymentNumber}.pdf`);
    } catch (error) {
      console.error("Error downloading payment receipt PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  // handlePrint removed as requested

  const handleRefund = () => {
    setIsRefundModalOpen(true);
  };

  const handleRefundSave = async () => {
    // Validate required fields
    if (!refundData.amount || !refundData.refundedOn || !refundData.fromAccount) {
      alert("Please fill in all required fields: Amount, Refunded On, and From Account");
      return;
    }

    // Validate amount
    const refundAmount = parseFloat(refundData.amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      alert("Please enter a valid refund amount");
      return;
    }

    if (refundAmount > (payment?.amountReceived || 0)) {
      alert(`Refund amount cannot exceed the payment amount of ${payment?.amountReceived || 0}`);
      return;
    }

    try {

      // Create refund payload
      const refundPayload = {
        paymentId: payment?.id || payment?._id || id,
        amount: refundAmount,
        refundDate: refundData.refundedOn,
        paymentMethod: refundData.paymentMode || 'cash',
        referenceNumber: refundData.referenceNumber,
        fromAccount: refundData.fromAccountId || refundData.fromAccount,
        description: refundData.description
      };

      // Call API to create refund
      const response = await refundsAPI.create(refundPayload);

      if (response.success) {
        alert("Refund processed successfully!");
        setIsRefundModalOpen(false);

        // Reset refund form
        setRefundData({
          amount: "",
          refundedOn: "",
          paymentMode: "",
          referenceNumber: "",
          fromAccount: "",
          description: ""
        });

        // Refresh payment and refunds data
        const paymentData = await getPaymentById(id);
        if (paymentData) {
          setPayment(paymentData);
        }
        const refundsResponse = await refundsAPI.getByPaymentId(id);
        if (refundsResponse && refundsResponse.success) {
          setRefunds(refundsResponse.data);
        }
      } else {
        alert(`Failed to process refund: ${response.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      alert(`Error processing refund: ${error.message || 'Please try again'}`);
    }
  };

  const handleRefundCancel = () => {
    setIsRefundModalOpen(false);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        month: "prev",
        fullDate: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: "current",
        fullDate: new Date(year, month, i)
      });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: "next",
        fullDate: new Date(year, month + 1, i)
      });
    }
    return days;
  };

  const handleRefundDateSelect = (date) => {
    const formatted = formatDate(date);
    setRefundData(prev => ({
      ...prev,
      refundedOn: formatted
    }));
    setIsRefundDatePickerOpen(false);
    setRefundDateCalendar(date);
  };

  const navigateRefundMonth = (direction) => {
    const newDate = new Date(refundDateCalendar);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setRefundDateCalendar(newDate);
  };

  const persistPaymentMeta = async (attachments: any[], paymentComments: any[]) => {
    if (!id) return;
    try {
      await updatePayment(id, {
        attachments,
        comments: paymentComments
      } as any);
      setPayment(prev => prev ? ({ ...prev, attachments, comments: paymentComments } as any) : prev);
    } catch (error) {
      console.error("Error saving payment comments/attachments:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(String(event.target?.result || ""));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  // Attachments Handlers
  const handleFileUpload = async (files: File[]) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (paymentAttachments.length + validFiles.length > 5) {
      alert("Maximum 5 files allowed. Please remove some files first.");
      return;
    }

    try {
      const newAttachments: any[] = [];

      for (const file of validFiles) {
        const preview = await fileToDataUrl(file);
        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          preview,
          uploadedAt: new Date().toISOString(),
          uploadedBy: "You"
        });
      }

      const updated = [...paymentAttachments, ...newAttachments].slice(0, 5);
      setPaymentAttachments(updated);
      await persistPaymentMeta(updated, comments);
    } catch (error) {
      console.error("Error processing uploaded files:", error);
      alert("Failed to upload files. Please try again.");
    }
  };

  const handleFileClick = (attachment: any) => {
    if (attachment.type && attachment.type.startsWith('image/')) {
      setSelectedImage(attachment.preview || null);
      setShowImageViewer(true);
    } else {
      if (attachment.preview) {
        // For non-image files stored as base64, create a download link
        const a = document.createElement('a');
        a.href = attachment.preview;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string | number) => {
    const updated = paymentAttachments.filter(att => String(att.id) !== String(attachmentId));
    setPaymentAttachments(updated);
    await persistPaymentMeta(updated, comments);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Comments Handlers
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const comment = {
      id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: newComment,
      author: "You",
      timestamp: new Date().toISOString(),
      bold: commentBold,
      italic: commentItalic,
      underline: commentUnderline
    };

    const updated = [...comments, comment];
    setComments(updated);
    await persistPaymentMeta(paymentAttachments, updated);
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
  };

  // More Menu Handlers
  const handleVoid = async () => {
    if (!payment) return;

    if (window.confirm(`Are you sure you want to void payment ${payment.paymentNumber || payment.id}?`)) {
      try {
        const updatedPayment = {
          ...payment,
          status: "void"
        };
        await updatePayment(id, updatedPayment);
        setPayment(updatedPayment);
        setIsMoreMenuOpen(false);
        alert("Payment voided successfully");
      } catch (error) {
        console.error("Error voiding payment:", error);
        alert("Failed to void payment. Please try again.");
      }
    }
  };

  const handleDelete = async () => {
    if (!payment) return;

    if (window.confirm(`Are you sure you want to delete payment ${payment.paymentNumber || payment.id}? This action cannot be undone.`)) {
      try {
        await deletePayment(id);
        setIsMoreMenuOpen(false);
        navigate("/sales/payments-received");
      } catch (error) {
        console.error("Error deleting payment:", error);
        alert("Failed to delete payment. Please try again.");
      }
    }
  };

  if (!payment) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-10 text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto h-screen">
        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="relative mb-3" ref={allPaymentsDropdownRef}>
            <button
              onClick={() => setIsAllPaymentsDropdownOpen(!isAllPaymentsDropdownOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors w-full"
            >
              {isAllPaymentsDropdownOpen ? (
                <ChevronUp size={16} className="text-blue-600" />
              ) : (
                <ChevronDown size={16} className="text-blue-600" />
              )}
              <span className="text-sm font-semibold text-gray-900">All Received Payments</span>
            </button>

            {/* Filter Dropdown */}
            {isAllPaymentsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden">
                <div className="py-1">
                  {statusFilters.map((filter) => (
                    <div
                      key={filter}
                      onClick={() => handleFilterSelect(filter)}
                      className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{filter}</span>
                      <Star
                        size={16}
                        className="text-gray-400"
                        fill="none"
                        strokeWidth={1.5}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
              onClick={() => navigate("/sales/payments-received/new")}
            >
              <Plus size={16} />
            </button>
            <div className="relative" ref={moreMenuRef}>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                <MoreVertical size={18} />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px] overflow-hidden">
                  <div className="p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 transition-colors">
                    <Settings size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Preferences</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="divide-y divide-gray-200">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/sales/payments-received/${p.id}`)}
                className={`p-4 cursor-pointer transition-colors ${p.id === id ? "bg-blue-50 border-l-4 border-blue-600" : "hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {p.id === id ? (
                      <CheckSquare size={16} className="text-gray-600" fill="#6b7280" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{p.customerName || "Unknown"}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{p.paymentNumber || p.id}</span>
                      <span>•</span>
                      <span>{formatDate(p.paymentDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-semibold ${p.status === "paid"
                        ? "text-green-700"
                        : p.status === "void"
                          ? "text-red-700"
                          : "text-yellow-700"
                        }`}>
                        {(p.status || "DRAFT").toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{p.paymentMode || ""}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mt-2">{formatCurrency(p.amountReceived || 0, p.currency || (payment?.currency))}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">No payments found</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Top Header with Number and Icons */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10 print:hidden">
          <div className="flex items-center justify-between mb-3">
            {/* Payment Number */}
            <div className="text-2xl font-bold text-gray-900">
              {payment.paymentNumber || payment.id || "1"}
            </div>
            {/* Top Right Icons */}
            <div className="flex items-center gap-2">
              <button
                className={`relative p-2 rounded-md transition-colors ${showAttachmentsModal
                  ? "bg-gray-200 text-gray-900"
                  : "hover:bg-gray-100 text-gray-600"
                  }`}
                title="Attachments"
                onClick={() => {
                  setShowAttachmentsModal(true);
                  setShowCommentsSidebar(false);
                }}
              >
                <Paperclip size={18} />
                {paymentAttachments.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {paymentAttachments.length}
                  </span>
                )}
              </button>
              <button
                className={`relative p-2 rounded-md transition-colors ${showCommentsSidebar
                  ? "bg-gray-200 text-gray-900"
                  : "hover:bg-gray-100 text-gray-600"
                  }`}
                title="Comments"
                onClick={() => {
                  setShowCommentsSidebar(true);
                  setShowAttachmentsModal(false);
                }}
              >
                <MessageCircle size={18} />
                {comments.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-gray-700 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {comments.length}
                  </span>
                )}
              </button>
              <button
                className="p-2 hover:bg-red-50 rounded-md text-red-600 transition-colors"
                onClick={() => navigate("/sales/payments-received")}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-0 border-t border-gray-200 pt-3">
            <button
              className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
              onClick={() => navigate(`/sales/payments-received/${id}/edit`)}
            >
              <Edit size={16} />
              Edit
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
              onClick={() => {
                try {
                  console.log('Send Email clicked, navigating to send-email page for', id);
                  navigate(`/sales/payments-received/${id}/send-email`, { state: { paymentData: payment } });
                  // fallback in case SPA navigation fails in some environments
                  setTimeout(() => {
                    if (!window.location.pathname.includes(`/payments-received/${id}/send-email`)) {
                      window.location.href = `/sales/payments-received/${id}/send-email`;
                    }
                  }, 200);
                } catch (e) {
                  console.error('Navigation to send-email failed, falling back to full load', e);
                  window.location.href = `/sales/payments-received/${id}/send-email`;
                }
              }}
            >
              <Mail size={16} />
              Send Email
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <div className="relative" ref={pdfDropdownRef}>
              <button
                className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
                onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
              >
                <FileText size={16} />
                PDF Download
                <ChevronDown size={14} />
              </button>
              {isPdfDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 transition-colors"
                    onClick={handleDownloadPDF}
                  >
                    <FileText size={16} />
                    Download PDF
                  </div>
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              className="flex items-center gap-2 py-2 px-4 bg-transparent border-none text-sm font-medium text-gray-700 cursor-pointer transition-colors hover:bg-gray-50 rounded-md"
              onClick={handleRefund}
            >
              <RotateCcw size={16} />
              Refund
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <div className="relative" ref={moreMenuRef}>
              <button
                className="flex items-center justify-center py-2 px-4 bg-transparent border-none cursor-pointer text-gray-700 transition-colors hover:bg-gray-50 rounded-md"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                <MoreVertical size={18} />
              </button>
              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden">
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                    onClick={handleVoid}
                  >
                    Void
                  </div>
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                    onClick={handleDelete}
                  >
                    Delete
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* A4 Paper Container - Main Receipt */}
        <div
          ref={receiptPaperRef}
          className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg p-[20mm] relative mb-12 mt-8 print:shadow-none print:w-full print:m-0 print:p-0"
        >
          {/* Paid Badge - Green Ribbon */}
          <div className="absolute top-0 left-0 overflow-hidden w-32 h-32">
            <div className="absolute top-[20px] left-[-40px] w-[170px] bg-[#00c853] text-white text-center font-bold py-2 transform -rotate-45 shadow-md uppercase tracking-wider text-sm">
              Paid
            </div>
          </div>

          {/* Header: Logo & Address */}
          <div className="flex flex-col items-start mb-12 ml-2">
            {logoPreview && (
              <img src={logoPreview} alt="Company Logo" className="h-24 object-contain mb-4" />
            )}
            {/* Organization Data */}
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide mb-2">{organizationData.name}</h2>
            <div className="text-sm text-gray-500 text-left leading-relaxed">
              <p>{organizationData.street1}</p>
              {organizationData.street2 && <p>{organizationData.street2}</p>}
              <p>{organizationData.city} {organizationData.zipCode}</p>
              <p>{organizationData.stateProvince}</p>
              <p>{organizationData.country}</p>
              <p className="mt-1 font-medium">{organizationData.email}</p>
            </div>
          </div>

          {/* Receipt Title */}
          <div className="text-center mb-10">
            <h1 className="text-xl font-bold text-gray-800 uppercase tracking-widest border-b-2 border-gray-200 inline-block pb-2">
              PAYMENT RECEIPT
            </h1>
          </div>

          {/* Details Grid & Amount Box */}
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-4 flex-1 max-w-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-500">Payment Date</span>
                <span className="text-sm font-bold text-gray-900">{formatDate(payment.paymentDate)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-500">Reference Number</span>
                <span className="text-sm font-bold text-gray-900">{payment.referenceNumber || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-500">Payment Mode</span>
                <span className="text-sm font-bold text-gray-900">{payment.paymentMode || "Cash"}</span>
              </div>
            </div>

            <div className="ml-12">
              <div className="bg-[#7cb342] text-white p-6 min-w-[220px] text-center shadow-sm">
                <div className="text-sm font-medium opacity-90 mb-1">Amount Received</div>
                <div className="text-2xl font-bold">
                  {(payment.currency || symbol || baseCurrency?.code || "USD").substring(0, 3)} {parseFloat(payment.amountReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Received From */}
          <div className="mb-12">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Received From</h3>
            <div className="text-base font-bold text-blue-600">
              {payment.customerName}
            </div>
          </div>

          {/* Payment For Table */}
          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-900 mb-4">Payment for</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.allocations && payment.allocations.length > 0 ? (
                    payment.allocations.map((alloc, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
                            onClick={() => navigate(`/sales/invoices/${alloc.invoice?._id || alloc.invoice?.id || alloc.invoice}`)}
                          >
                            {alloc.invoice?.invoiceNumber || alloc.invoice?.id || alloc.invoice || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{formatDate(alloc.invoice?.date || payment.paymentDate)}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          {(payment.currency || "USD").substring(0, 3)} {parseFloat(alloc.invoice?.total || alloc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          {(payment.currency || "USD").substring(0, 3)} {parseFloat(alloc.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : payment.invoiceNumber ? (
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
                          onClick={() => navigate(`/sales/invoices/${payment.invoiceNumber}`)}
                        >
                          {payment.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{formatDate(payment.invoiceDate || payment.paymentDate)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {(payment.currency || "USD").substring(0, 3)} {parseFloat(payment.invoiceAmount || payment.amountReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {(payment.currency || "USD").substring(0, 3)} {parseFloat(payment.amountReceived || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-center text-gray-500">No invoices linked</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-400">
            PDF Template: 'Elite Template'
          </div>

          {/* Refund History Section - Displayed inside the paper after table if refunds exist */}
          {refunds.length > 0 && (
            <div className="mt-12 border-t-2 border-gray-100 pt-8">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Refund History</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Refund Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Refund#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((refund, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{formatDate(refund.refundDate)}</td>
                        <td className="px-4 py-3 text-gray-900">{refund.refundNumber}</td>
                        <td className="px-4 py-3 text-gray-500 italic">{refund.description || "Refund for payment"}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-bold">
                          {(payment.currency || symbol || baseCurrency?.code || "USD").substring(0, 3)} {parseFloat(refund.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* More Information / Journal Section - Separated Below */}
        <div className="max-w-[210mm] mx-auto px-4 mb-16 print:hidden">
          <h3 className="text-lg font-medium text-gray-900 mb-4 px-2">More Information</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Information Tabs included in content directly for simplicity based on image */}
            <div className="p-6">
              <div className="mb-8">
                <span className="text-gray-500 text-sm mr-2">Deposit To</span>
                <span className="text-gray-900 text-sm font-medium">: {payment.depositTo || "Petty Cash"}</span>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1">Journal</h4>
                  <div className="flex items-center text-xs">
                    <span className="text-gray-500 mr-2">Amount is displayed in your base currency</span>
                    <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">{(payment.currency || "USD").substring(0, 3)}</span>
                  </div>
                </div>

                <div className="text-base font-bold text-gray-900 mb-4">
                  Customer Payment - 1
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-500 uppercase text-xs py-2">ACCOUNT</th>
                        <th className="text-right font-semibold text-gray-500 uppercase text-xs py-2">DEBIT</th>
                        <th className="text-right font-semibold text-gray-500 uppercase text-xs py-2">CREDIT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 text-blue-600 font-medium">{payment.depositTo || "Petty Cash"}</td>
                        <td className="py-3 text-right font-bold text-gray-900">{formatJournalAmount(payment.amountReceived || 0)}</td>
                        <td className="py-3 text-right text-gray-900">0.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-blue-600 font-medium">Accounts Receivable</td>
                        <td className="py-3 text-right text-gray-900">0.00</td>
                        <td className="py-3 text-right font-bold text-gray-900">{formatJournalAmount(payment.amountReceived || 0)}</td>
                      </tr>
                      <tr className="border-t border-gray-300">
                        <td className="py-3 pt-4 font-bold text-gray-900">Total</td>
                        <td className="py-3 pt-4 text-right font-bold text-gray-900">{formatJournalAmount(payment.amountReceived || 0)}</td>
                        <td className="py-3 pt-4 text-right font-bold text-gray-900">{formatJournalAmount(payment.amountReceived || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {refunds.length > 0 && (
                  <div className="mt-8 space-y-8">
                    {refunds.map((refund, index) => (
                      <div key={refund._id || refund.id || index}>
                        <div className="text-base font-bold text-gray-900 mb-4">
                          Payment Refund - {index + 1}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left font-semibold text-gray-500 uppercase text-xs py-2">ACCOUNT</th>
                                <th className="text-right font-semibold text-gray-500 uppercase text-xs py-2">DEBIT</th>
                                <th className="text-right font-semibold text-gray-500 uppercase text-xs py-2">CREDIT</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              <tr>
                                <td className="py-3 text-blue-600 font-medium">Accounts Receivable</td>
                                <td className="py-3 text-right font-bold text-gray-900">{formatJournalAmount(refund.amount || 0)}</td>
                                <td className="py-3 text-right text-gray-900">0.00</td>
                              </tr>
                              <tr>
                                <td className="py-3 text-blue-600 font-medium">{getRefundFromAccountName(refund)}</td>
                                <td className="py-3 text-right text-gray-900">0.00</td>
                                <td className="py-3 text-right font-bold text-gray-900">{formatJournalAmount(refund.amount || 0)}</td>
                              </tr>
                              <tr className="border-t border-gray-300">
                                <td className="py-3 pt-4 font-bold text-gray-900">Total</td>
                                <td className="py-3 pt-4 text-right font-bold text-gray-900">{formatJournalAmount(refund.amount || 0)}</td>
                                <td className="py-3 pt-4 text-right font-bold text-gray-900">{formatJournalAmount(refund.amount || 0)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEmailModalOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4" ref={emailModalRef} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Send Payment Receipt via Email</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                onClick={() => setIsEmailModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  placeholder="Email message"
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={() => setIsEmailModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleEmailSend}
                disabled={!emailData.to}
              >
                <Send size={16} />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && payment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={(e) => {
          if (e.target === e.currentTarget) handleRefundCancel();
        }}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" ref={refundModalRef} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Refund</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                onClick={handleRefundCancel}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer Name</div>
                  <div className="text-base font-semibold text-gray-900">{payment.customerName || "-"}</div>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">{(payment.currency || symbol || baseCurrency?.code || "USD").substring(0, 3)}</div>
                  <input
                    type="number"
                    value={refundData.amount}
                    onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={payment.amountReceived || 0}
                    className="w-full pl-16 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Balance : {formatCurrency(payment.amountReceived || 0)}
                </div>
              </div>

              {/* Refunded On */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Refunded On<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative" ref={refundDatePickerRef}>
                  <input
                    type="text"
                    value={refundData.refundedOn}
                    readOnly
                    onClick={() => setIsRefundDatePickerOpen(!isRefundDatePickerOpen)}
                    placeholder="Select date"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10 cursor-pointer"
                  />
                  <Calendar
                    size={18}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setIsRefundDatePickerOpen(!isRefundDatePickerOpen)}
                  />
                  {isRefundDatePickerOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 w-72">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => navigateRefundMonth("prev")} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                            <ChevronLeft size={16} />
                          </button>
                          <span className="font-semibold text-gray-900">{months[refundDateCalendar.getMonth()]} {refundDateCalendar.getFullYear()}</span>
                          <button onClick={() => navigateRefundMonth("next")} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className={`text-xs font-semibold text-center py-2 ${day === "Sun" || day === "Fri" ? "text-gray-400" : "text-gray-600"
                              }`}>
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(refundDateCalendar).map((day, idx) => (
                            <button
                              key={idx}
                              className={`text-sm py-2 rounded hover:bg-gray-100 ${day.month !== "current" ? "text-gray-300" : "text-gray-900"
                                }`}
                              onClick={() => handleRefundDateSelect(day.fullDate)}
                            >
                              {day.date}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode</label>
                <div className="relative" ref={paymentModeDropdownRef}>
                  <input
                    type="text"
                    value={refundData.paymentMode}
                    readOnly
                    onClick={() => setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen)}
                    placeholder="Select payment mode"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10 cursor-pointer"
                  />
                  <ChevronDownIcon
                    size={18}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen)}
                  />
                  {isPaymentModeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {paymentModeOptions.map((mode) => (
                        <div
                          key={mode}
                          className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                          onClick={() => {
                            setRefundData({ ...refundData, paymentMode: mode });
                            setIsPaymentModeDropdownOpen(false);
                          }}
                        >
                          {mode}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reference#</label>
                <input
                  type="text"
                  value={refundData.referenceNumber}
                  onChange={(e) => setRefundData({ ...refundData, referenceNumber: e.target.value })}
                  placeholder="Enter reference number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* From Account */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From Account<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative" ref={fromAccountDropdownRef}>
                  <input
                    type="text"
                    value={refundData.fromAccount}
                    readOnly
                    onClick={() => setIsFromAccountDropdownOpen(!isFromAccountDropdownOpen)}
                    placeholder="Select account"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10 cursor-pointer"
                  />
                  <ChevronDownIcon
                    size={18}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                    onClick={() => setIsFromAccountDropdownOpen(!isFromAccountDropdownOpen)}
                  />
                  {isFromAccountDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {bankAccounts.length > 0 ? bankAccounts.map((account) => {
                        const accountDisplay = account.displayName || account.accountName;
                        return (
                          <div
                            key={account._id || account.id}
                            className="p-3 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                            onClick={() => {
                              setRefundData({
                                ...refundData,
                                fromAccount: accountDisplay,
                                fromAccountId: account._id || account.id
                              });
                              setIsFromAccountDropdownOpen(false);
                            }}
                          >
                            {accountDisplay}
                          </div>
                        );
                      }) : (
                        <div className="p-4 text-center text-sm text-gray-500 italic">No accounts found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={refundData.description}
                  onChange={(e) => setRefundData({ ...refundData, description: e.target.value })}
                  placeholder="Enter description"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                className="px-6 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                onClick={handleRefundCancel}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                onClick={handleRefundSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttachmentsModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Attachments ({paymentAttachments.length})</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                onClick={() => setShowAttachmentsModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {paymentAttachments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No Files Attached</p>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => attachmentsFileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileUp size={24} className="text-gray-400" />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <span>Upload your</span>
                        <span className="text-blue-600 font-medium">Files</span>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    You can upload a maximum of 5 files, 10MB each.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentAttachments.map((attachment) => {
                    const isImage = attachment.type && attachment.type.startsWith('image/');
                    return (
                      <div
                        key={attachment.id}
                        className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleFileClick(attachment)}
                      >
                        {isImage && attachment.preview ? (
                          <img
                            src={attachment.preview}
                            alt={attachment.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <FileText size={20} className="text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 font-medium truncate">
                            {attachment.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(attachment.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {paymentAttachments.length < 5 && (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => attachmentsFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileUp size={20} className="text-gray-400" />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <span>Upload your</span>
                          <span className="text-blue-600 font-medium">Files</span>
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={attachmentsFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center"
          onClick={() => {
            setShowImageViewer(false);
            setSelectedImage(null);
          }}
        >
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 text-gray-900"
              onClick={() => {
                setShowImageViewer(false);
                setSelectedImage(null);
              }}
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Comments Sidebar */}
      {showCommentsSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div
            className="bg-white w-full max-w-md h-full shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
              <button
                className="p-1 border border-blue-600 rounded text-red-600 hover:bg-red-50"
                onClick={() => setShowCommentsSidebar(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Comment Input */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-1 mb-2">
                <button
                  className={`p-1.5 rounded ${commentBold ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  onClick={() => setCommentBold(!commentBold)}
                >
                  <Bold size={14} />
                </button>
                <button
                  className={`p-1.5 rounded ${commentItalic ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  onClick={() => setCommentItalic(!commentItalic)}
                >
                  <Italic size={14} />
                </button>
                <button
                  className={`p-1.5 rounded ${commentUnderline ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  onClick={() => setCommentUnderline(!commentUnderline)}
                >
                  <Underline size={14} />
                </button>
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                style={{
                  fontWeight: commentBold ? 'bold' : 'normal',
                  fontStyle: commentItalic ? 'italic' : 'normal',
                  textDecoration: commentUnderline ? 'underline' : 'none'
                }}
              />
              <button
                className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                onClick={handleAddComment}
              >
                Add Comment
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">All Comments</h3>
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No comments yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {(comment.author || "U").charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{comment.author || "User"}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(comment.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div
                        className="text-sm text-gray-700 ml-10"
                        style={{
                          fontWeight: comment.bold ? 'bold' : 'normal',
                          fontStyle: comment.italic ? 'italic' : 'normal',
                          textDecoration: comment.underline ? 'underline' : 'none'
                        }}
                      >
                        {comment.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

