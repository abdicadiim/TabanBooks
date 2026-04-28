import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Edit,
  Mail,
  Share2,
  FileText,
  RefreshCw,
  MoreHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Menu,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Square,
  Plus,
  Upload,
  FileUp,
  HelpCircle,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  FolderPlus,
  RotateCw,
  Settings,
  Lock,
  Send
} from "lucide-react";
import { getQuoteById, getQuotes, updateQuote, deleteQuotes, getCustomers, getSalespersons, getProjects, getInvoices, saveInvoice, saveQuote } from "../../salesModel";
import { currenciesAPI, documentsAPI, senderEmailsAPI, settingsAPI, transactionNumberSeriesAPI, pdfTemplatesAPI } from "../../../../services/api";
import { toast } from "react-hot-toast";
import { resolvePrimarySender } from "../../../../utils/emailSenderDisplay";
import QuoteCommentsPanel from "./QuoteCommentsPanel";
import { buildSubscriptionDraftFromQuote, buildSubscriptionEditDraft } from "../../subscriptions/subscriptionDraftUtils";
import { COLOR_THEMES } from "../../../settings/pdfTemplates/constants";

const QuoteDetail = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preloadedQuote = (location.state as any)?.preloadedQuote || null;
  const preloadedQuotes = (location.state as any)?.preloadedQuotes || null;
  const [quote, setQuote] = useState<any>(preloadedQuote);
  const [allQuotes, setAllQuotes] = useState<any[]>(preloadedQuotes || []);
  const [loading, setLoading] = useState<boolean>(!preloadedQuote);
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [linkedInvoices, setLinkedInvoices] = useState<any[]>([]);
  const [linkedInvoicesLoading, setLinkedInvoicesLoading] = useState<boolean>(false);
  const linkedInvoicesLoadedForQuoteRef = useRef<string>("");
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const [showMailDropdown, setShowMailDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);
  const [showSidebarMoreDropdown, setShowSidebarMoreDropdown] = useState(false);
  const [showPdfView, setShowPdfView] = useState(true);
  const [isCloningQuote, setIsCloningQuote] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All Quotes");
  const [activeTab, setActiveTab] = useState<"details" | "invoices" | "activity" | "retainerInvoices">("details");
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isMarkAsSentModalOpen, setIsMarkAsSentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState("");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [allowEditingAcceptedQuotes, setAllowEditingAcceptedQuotes] = useState(false);
  const [quoteAttachments, setQuoteAttachments] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [activePdfTemplate, setActivePdfTemplate] = useState<any>(null);
  const [activeTheme, setActiveTheme] = useState<any>(COLOR_THEMES[0]);

  useEffect(() => {
    const loadQuoteSettings = async () => {
      try {
        const response = await settingsAPI.getQuotesSettings();
        if (response?.success && response.data) {
          setAllowEditingAcceptedQuotes(Boolean((response.data as any).allowEditingAcceptedQuotes));
        }
      } catch (error) {
        console.error("Error loading quote settings:", error);
      }
    };

    loadQuoteSettings();

    const fetchPdfTemplates = async () => {
      try {
        const response = await pdfTemplatesAPI.get();
        if (response?.success && Array.isArray(response.data?.templates)) {
          const quotesTemplates = response.data.templates.filter((t: any) => t.moduleType === "quotes");
          const defaultTemplate = quotesTemplates.find((t: any) => t.isDefault) || quotesTemplates[0];
          if (defaultTemplate) {
            setActivePdfTemplate(defaultTemplate);
            const theme = COLOR_THEMES.find((t) => t.id === defaultTemplate.config?.general?.colorTheme) || COLOR_THEMES[0];
            setActiveTheme(theme);
          }
        }
      } catch (error) {
        console.error("Error fetching PDF templates:", error);
      }
    };
    fetchPdfTemplates();

    const fetchBaseCurrency = async () => {
      try {
        const response = await currenciesAPI.getBaseCurrency();
        if (response && response.success && response.data) {
          setBaseCurrency(response.data.code || "USD");
        }
      } catch (error) {
        console.error("Error fetching base currency:", error);
      }
    };
    fetchBaseCurrency();
  }, []);

  useEffect(() => {
    if (!statusSuccessMessage) return;
    const timer = setTimeout(() => setStatusSuccessMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [statusSuccessMessage]);

  // Keep scrolling inside this view's own panels, not the browser window.
  useLayoutEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverflowY = document.documentElement.style.overflowY;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverflowY = document.body.style.overflowY;
    const prevBodyHeight = document.body.style.height;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overflowY = "hidden";
    document.documentElement.style.height = "100vh";
    document.body.style.overflow = "hidden";
    document.body.style.overflowY = "hidden";
    document.body.style.height = "100vh";
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overflowY = prevHtmlOverflowY;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overflowY = prevBodyOverflowY;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

  // Bulk Update Modal States
  const [bulkUpdateField, setBulkUpdateField] = useState("");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [isBulkFieldDropdownOpen, setIsBulkFieldDropdownOpen] = useState(false);
  const [bulkFieldSearch, setBulkFieldSearch] = useState("");

  // Email Modal States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailDetails, setShowEmailDetails] = useState(false); // Toggle for simple/detailed view
  const [emailData, setEmailData] = useState({
    from: "",
    sendTo: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachQuotePDF, setAttachQuotePDF] = useState(true);
  const [fontSize, setFontSize] = useState("16");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const emailModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customize Dropdown States
  const [isQuoteDocumentHovered, setIsQuoteDocumentHovered] = useState(false);
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);
  const [isOrganizationAddressModalOpen, setIsOrganizationAddressModalOpen] = useState(false);
  const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [organizationData, setOrganizationData] = useState({
    street1: "",
    street2: "",
    city: "",
    zipCode: "",
    stateProvince: "",
    phone: "",
    faxNumber: "",
    websiteUrl: "",
    industry: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [termsData, setTermsData] = useState({
    notes: "Looking forward for your business.",
    termsAndConditions: "",
    useNotesForAllQuotes: false,
    useTermsForAllQuotes: false
  });
  const customizeDropdownRef = useRef<HTMLDivElement>(null);
  const organizationAddressFileInputRef = useRef<HTMLInputElement>(null);

  // Attachments Modal States
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);

  // Comments Sidebar States
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentBold, setCommentBold] = useState(false);
  const [commentItalic, setCommentItalic] = useState(false);
  const [commentUnderline, setCommentUnderline] = useState(false);

  // Custom Fields Modal States
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [customFields, setCustomFields] = useState([
    { id: 1, name: "Sales person", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true },
    { id: 2, name: "Description", dataType: "Text Box (Single Line)", mandatory: false, showInPDF: true, status: "Active", isLocked: true }
  ]);

  // Share Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState("Public");
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const [linkExpirationDate, setLinkExpirationDate] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);
  const shareModalRef = useRef<HTMLDivElement>(null);
  const visibilityDropdownRef = useRef<HTMLDivElement>(null);

  // Data for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Organization profile data
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const organizationName = String(organizationProfile?.organizationName || organizationProfile?.name || "Organization").trim() || "Organization";
  const organizationNameHtml = organizationName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Owner email data
  const [ownerEmail, setOwnerEmail] = useState<any>(null);

  // Fetch organization profile data
  const fetchOrganizationProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found');
        // Set fallback data from localStorage if available
        const fallbackProfile = localStorage.getItem('organization_profile');
        if (fallbackProfile) {
          setOrganizationProfile(JSON.parse(fallbackProfile));
        }
        return;
      }

      const response = await fetch('/api/settings/organization/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          // Store in localStorage as fallback
          localStorage.setItem('organization_profile', JSON.stringify(sanitizeProfileForCache(data.data)));
        }
      } else {
        console.error('Failed to fetch organization profile:', response.status, response.statusText);
        // Try fallback
        const fallbackProfile = localStorage.getItem('organization_profile');
        if (fallbackProfile) {
          setOrganizationProfile(JSON.parse(fallbackProfile));
        }
      }
    } catch (error) {
      console.error('Error fetching organization profile:', error);
      // Set fallback data from localStorage if available
      const fallbackProfile = localStorage.getItem('organization_profile');
      if (fallbackProfile) {
        setOrganizationProfile(JSON.parse(fallbackProfile));
      }
    }
  };

  // Fetch owner email data
  const fetchOwnerEmail = async () => {
    try {
      const primarySenderRes = await senderEmailsAPI.getPrimary();
      const fallbackName = String(organizationProfile?.name || "Taban Enterprise").trim() || "Taban Enterprise";
      const fallbackEmail = String(organizationProfile?.email || "").trim();
      setOwnerEmail(resolvePrimarySender(primarySenderRes, fallbackName, fallbackEmail) as any);
    } catch (error) {
      console.error('Error fetching owner email:', error);
    }
  };

  useEffect(() => {
    const senderName = ownerEmail?.name || organizationProfile?.name || "Team";
    const senderEmail = ownerEmail?.email || organizationProfile?.email || "";
    setEmailData((prev) => ({
      ...prev,
      from: senderEmail ? `${senderName} <${senderEmail}>` : senderName,
    }));
  }, [ownerEmail, organizationProfile?.name, organizationProfile?.email]);

  // Update organization profile data
  const updateOrganizationProfile = async (profileData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/settings/organization/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOrganizationProfile(data.data);
          // Update localStorage
          localStorage.setItem('organization_profile', JSON.stringify(sanitizeProfileForCache(data.data)));
        }
      }
    } catch (error) {
      console.error('Error updating organization profile:', error);
    }
  };

  const getCurrentUserDisplayName = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser?.name || parsedUser?.fullName || parsedUser?.username || parsedUser?.email || "You";
      }
    } catch (error) {
      console.error("Error reading user profile for comment author:", error);
    }
    return "You";
  };

  const isImageFileAttachment = (attachment: any) => {
    const mimeType = String(attachment?.type || attachment?.mimeType || "").toLowerCase();
    if (mimeType.startsWith("image/")) return true;
    const name = String(attachment?.name || "").toLowerCase();
    return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some(ext => name.endsWith(ext));
  };

  const normalizeAttachmentFromQuote = (attachment: any, index: number) => {
    const attachmentId = attachment?.documentId || attachment?._id || attachment?.id || `attachment-${Date.now()}-${index}`;
    const fileUrl = attachment?.url || attachment?.preview || "";
    const mimeType = attachment?.type || attachment?.mimeType || "";
    return {
      id: attachmentId,
      documentId: attachment?.documentId || attachment?._id || attachment?.id,
      name: attachment?.name || "Attachment",
      size: Number(attachment?.size || 0),
      type: mimeType,
      mimeType,
      url: fileUrl,
      preview: isImageFileAttachment({ ...attachment, type: mimeType }) ? fileUrl : null,
      uploadedAt: attachment?.uploadedAt || attachment?.createdAt || new Date().toISOString()
    };
  };

  const normalizeCommentFromQuote = (comment: any, index: number) => ({
    id: comment?._id || comment?.id || `comment-${Date.now()}-${index}`,
    text: String(comment?.text || ""),
    author: comment?.author || "User",
    timestamp: comment?.timestamp || comment?.createdAt || new Date().toISOString(),
    bold: Boolean(comment?.bold),
    italic: Boolean(comment?.italic),
    underline: Boolean(comment?.underline)
  });

  const normalizeActivityLogFromQuote = (entry: any, index: number) => ({
    id: entry?._id || entry?.id || `activity-${Date.now()}-${index}`,
    action: String(entry?.action || "Updated quote"),
    description: String(entry?.description || ""),
    actor: String(entry?.actor || "User"),
    timestamp: entry?.timestamp || entry?.createdAt || new Date().toISOString(),
    level: String(entry?.level || "info")
  });

  const appendActivityLog = async (action: string, description: string, level = "info") => {
    const entry = {
      id: `activity-${Date.now()}-${Math.random()}`,
      action,
      description,
      actor: getCurrentUserDisplayName(),
      timestamp: new Date().toISOString(),
      level
    };

    let nextLogs: any[] = [];
    setActivityLogs((prev: any[]) => {
      nextLogs = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 200);
      return nextLogs;
    });

    if (quoteId) {
      localStorage.setItem(`quote_activity_logs_${quoteId}`, JSON.stringify(nextLogs));
    }
  };

  useLayoutEffect(() => {
    if (preloadedQuote) {
      setQuote(preloadedQuote);
    }
    if (preloadedQuotes && Array.isArray(preloadedQuotes)) {
      setAllQuotes(preloadedQuotes);
    }
  }, [preloadedQuote, preloadedQuotes, quoteId]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(!preloadedQuote);

      // These can load independently of the main quote payload.
      fetchOrganizationProfile();
      fetchOwnerEmail();

      const [quotesResult, dropdownsResult, quoteResult] = await Promise.allSettled([
        getQuotes(),
        Promise.all([getCustomers(), getSalespersons(), getProjects()]),
        quoteId ? getQuoteById(quoteId) : Promise.resolve(null)
      ]);

      if (cancelled) return;

      if (quotesResult.status === "fulfilled") {
        const loadedQuotes = quotesResult.value || [];
        setAllQuotes(loadedQuotes);

        if (!quoteId) {
          // no-op
        } else if (!quoteResult || quoteResult.status !== "fulfilled" || !quoteResult.value) {
          const fallback = loadedQuotes.find((q: any) =>
            String(q?.id || q?._id || q?.quoteId || q?.quoteNumber || "") === String(quoteId)
          );
          if (fallback) {
            setQuote(fallback);
          }
        }
      } else {
        console.error("Error loading quotes:", quotesResult.reason);
        setAllQuotes([]);
      }

      if (dropdownsResult.status === "fulfilled") {
        const [loadedCustomers, loadedSalespersons, loadedProjects] = dropdownsResult.value;
        setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
        setSalespersons(Array.isArray(loadedSalespersons) ? loadedSalespersons : []);
        setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
      } else {
        console.error("Error loading dropdown data:", dropdownsResult.reason);
        setCustomers([]);
        setSalespersons([]);
        setProjects([]);
      }

      if (quoteResult.status === "fulfilled") {
        const quoteData = quoteResult.value as any;
        if (quoteData) {
          setQuote(quoteData);
          const dbAttachments = Array.isArray(quoteData.attachedFiles)
            ? quoteData.attachedFiles.map((attachment: any, index: number) => normalizeAttachmentFromQuote(attachment, index))
            : [];
          const dbComments = Array.isArray(quoteData.comments)
            ? quoteData.comments.map((comment: any, index: number) => normalizeCommentFromQuote(comment, index))
            : [];
          const dbActivityLogs = Array.isArray(quoteData.activityLogs)
            ? quoteData.activityLogs.map((entry: any, index: number) => normalizeActivityLogFromQuote(entry, index))
            : [];

          if (dbAttachments.length > 0) {
            setQuoteAttachments(dbAttachments);
          } else {
            const storedAttachments = localStorage.getItem(`quote_attachments_${quoteId}`);
            if (storedAttachments) {
              try {
                const parsed = JSON.parse(storedAttachments);
                setQuoteAttachments(Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                console.error("Error loading attachments:", e);
                setQuoteAttachments([]);
              }
            } else {
              setQuoteAttachments([]);
            }
          }

          if (dbComments.length > 0) {
            setComments(dbComments);
          } else {
            const storedComments = localStorage.getItem(`quote_comments_${quoteId}`);
            if (storedComments) {
              try {
                const parsed = JSON.parse(storedComments);
                setComments(Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                console.error("Error loading comments:", e);
                setComments([]);
              }
            } else {
              setComments([]);
            }
          }

          let resolvedActivityLogs = [];
          if (dbActivityLogs.length > 0) {
            resolvedActivityLogs = dbActivityLogs;
          } else {
            const storedActivityLogs = localStorage.getItem(`quote_activity_logs_${quoteId}`);
            if (storedActivityLogs) {
              try {
                const parsed = JSON.parse(storedActivityLogs);
                resolvedActivityLogs = Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.error("Error loading activity logs:", e);
                resolvedActivityLogs = [];
              }
            }
          }

          // Seed activity once so the tab is never empty for existing transactions.
          if (resolvedActivityLogs.length === 0) {
            const seedEntry = {
              id: `activity-seed-${quoteData.id || quoteData._id || quoteId}`,
              action: "Quote Created",
              description: `Quote ${quoteData.quoteNumber || quoteData.id || quoteId} was created.`,
              actor: (quoteData as any).createdBy || "System",
              timestamp: quoteData.createdAt || quoteData.quoteDate || new Date().toISOString(),
              level: "info"
            };
            resolvedActivityLogs = [seedEntry];
            localStorage.setItem(`quote_activity_logs_${quoteId}`, JSON.stringify(resolvedActivityLogs));
            try {
              if (quoteId) {
                await updateQuote(quoteId, { activityLogs: resolvedActivityLogs } as any);
              }
            } catch (error) {
              console.error("Error seeding activity logs:", error);
            }
          }

          setActivityLogs(resolvedActivityLogs);
        }
      } else {
        console.error("Error loading quote data:", quoteResult.reason);
      }

      setLoading(false);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  useEffect(() => {
    let cancelled = false;

    const loadLinkedInvoices = async () => {
      const quoteIdValue = String(quoteId || "");
      const shouldLoad =
        activeTab === "invoices" &&
        Boolean(quoteIdValue) &&
        Boolean(quote) &&
        (linkedInvoicesLoadedForQuoteRef.current !== quoteIdValue ||
          (!linkedInvoicesLoading && Array.isArray(linkedInvoices) && linkedInvoices.length === 0));
      if (!shouldLoad) return;

      linkedInvoicesLoadedForQuoteRef.current = quoteIdValue;
      setLinkedInvoicesLoading(true);
      try {
        const quoteNumber = String((quote as any)?.quoteNumber || (quote as any)?.id || quoteId || "").trim();
        const quoteInvoiceId = String((quote as any)?.convertedToInvoiceId || (quote as any)?.invoiceId || "").trim();
        const quoteInvoiceNumber = String((quote as any)?.convertedToInvoiceNumber || (quote as any)?.invoiceNumber || "").trim();
        const invoices = await getInvoices({ limit: 1000 });
        if (cancelled) return;

        const matches = (Array.isArray(invoices) ? invoices : [])
          .map((inv: any) => ({ ...inv, id: inv?._id || inv?.id }))
          .filter((inv: any) => {
            const invId = String(inv?.id || inv?._id || "").trim();
            if (quoteInvoiceId && invId && invId === quoteInvoiceId) return true;

            const refCandidates = [
              inv?.convertedFromQuote,
              inv?.convertedFromQuoteId,
              inv?.sourceQuoteId,
              inv?.quoteId,
              inv?.createdFromQuote,
              inv?.convertedFrom,
              inv?.quote?._id,
              inv?.quote?.id,
              inv?.quote,
            ]
              .filter(Boolean)
              .map((value: any) => String(value));
            if (quoteIdValue && refCandidates.some((value: string) => value === quoteIdValue)) return true;

            const invoiceQuoteNumber = String(
              inv?.sourceQuoteNumber ||
              inv?.quoteNumber ||
              inv?.convertedQuoteNumber ||
              inv?.referenceNumber ||
              inv?.orderNumber ||
              ""
            ).trim();
            if (quoteInvoiceNumber && invoiceQuoteNumber && invoiceQuoteNumber === quoteInvoiceNumber) return true;
            if (quoteNumber && invoiceQuoteNumber && invoiceQuoteNumber === quoteNumber) return true;

            return false;
          })
          .sort((a: any, b: any) => {
            const aTime = new Date(a?.invoiceDate || a?.date || a?.createdAt || 0).getTime();
            const bTime = new Date(b?.invoiceDate || b?.date || b?.createdAt || 0).getTime();
            return bTime - aTime;
          });

        setLinkedInvoices(matches);
      } catch (error) {
        console.error("Error loading linked invoices:", error);
        setLinkedInvoices([]);
      } finally {
        if (!cancelled) setLinkedInvoicesLoading(false);
      }
    };

    loadLinkedInvoices();
    return () => {
      cancelled = true;
    };
  }, [quoteId, quote, activeTab]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isBulkActionsOpen && !(target as Element).closest('.quote-detail-bulk-actions-wrapper')) {
        setIsBulkActionsOpen(false);
      }
      if (isBulkFieldDropdownOpen && !(target as Element).closest('.bulk-update-field-dropdown-wrapper')) {
        setIsBulkFieldDropdownOpen(false);
      }
      if (showMailDropdown && !(target as Element).closest('.quote-detail-dropdown-wrapper')) {
        setShowMailDropdown(false);
      }
      if (showPdfDropdown && !(target as Element).closest('.quote-detail-dropdown-wrapper')) {
        setShowPdfDropdown(false);
      }
      if (showMoreDropdown && !(target as Element).closest('.quote-detail-dropdown-wrapper')) {
        setShowMoreDropdown(false);
      }
      if (showConvertDropdown && !(target as Element).closest('.quote-detail-dropdown-wrapper')) {
        setShowConvertDropdown(false);
      }
      if (showSidebarMoreDropdown && !(target as Element).closest('.quote-detail-sidebar-more-wrapper')) {
        setShowSidebarMoreDropdown(false);
      }
      if (isVisibilityDropdownOpen && visibilityDropdownRef.current && !(visibilityDropdownRef.current as any).contains(target)) {
        setIsVisibilityDropdownOpen(false);
      }
      if (isCustomizeDropdownOpen && customizeDropdownRef.current && !(customizeDropdownRef.current as any).contains(target)) {
        setIsCustomizeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBulkActionsOpen, isBulkFieldDropdownOpen, showMailDropdown, showPdfDropdown, showMoreDropdown, showConvertDropdown, showSidebarMoreDropdown, isVisibilityDropdownOpen, isCustomizeDropdownOpen]);

  // Filter options
  const filterOptions = [
    "All Quotes",
    "Draft",
    "Pending Approval",
    "Approved",
    "Sent",
    "Customer Viewed",
    "Accepted",
    "Invoiced",
    "Declined",
    "Expired"
  ];

  // Get filtered quotes for sidebar
  const getFilteredQuotes = () => {
    const quotes = Array.isArray(allQuotes) ? allQuotes : [];
    if (selectedFilter === "All Quotes") {
      return quotes;
    }
    return quotes.filter(q =>
      (q.status || "draft").toLowerCase() === selectedFilter.toLowerCase().replace(/\s+/g, '_')
    );
  };

  // Handle quote selection
  const handleSelectQuote = (id: string) => {
    setSelectedQuotes(prev => {
      if (prev.includes(id)) {
        return prev.filter(qId => qId !== id);
      }
      return [...prev, id];
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    const filteredQuotes = getFilteredQuotes();
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map(q => q.id));
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedQuotes([]);
    setIsBulkActionsOpen(false);
  };

  // Bulk Actions Handlers
  const handleBulkUpdate = () => {
    setIsBulkUpdateModalOpen(true);
    setIsBulkActionsOpen(false);
  };

  const handleExportPDF = async () => {
    setIsBulkActionsOpen(false);
    const selectedQuoteData = allQuotes.filter((q: any) => selectedQuotes.includes(q.id));

    if (selectedQuoteData.length === 0) {
      toast.error("Please select at least one quote to export.");
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < selectedQuoteData.length; i++) {
        const quote = selectedQuoteData[i];

        // Create a temporary div with quote content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generateQuoteHTMLForQuote(quote);
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '210mm'; // A4 width
        document.body.appendChild(tempDiv);

        // Wait for content to render
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        // Convert to canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          width: 794, // A4 width in pixels at 96 DPI
          windowWidth: 794
        });

        // Remove temporary div
        document.body.removeChild(tempDiv);

        // Add new page for each quote except the first one
        if (i > 0) {
          pdf.addPage();
        }

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.97);
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      }

      // Download PDF
      pdf.save(`Quotes-Export-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      // Fallback to HTML download if PDF generation fails
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotes Export</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #333; }
            .quote-export { page-break-after: always; margin-bottom: 40px; }
            .quote-export:last-child { page-break-after: auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
            .quote-title { font-size: 24px; color: #111; margin: 20px 0; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 10px; }
            .status-draft { background: #fef3c7; color: #92400e; }
            .status-sent { background: #dbeafe; color: #1e40af; }
            .status-accepted { background: #d1fae5; color: #065f46; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { padding: 10px; background: #f9fafb; border-radius: 6px; }
            .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .info-value { font-size: 14px; color: #111; font-weight: 500; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f3f4f6; font-weight: 600; color: #374151; }
            .total-row { font-weight: bold; background: #f9fafb; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          ${selectedQuoteData.map((q: any) => `
            <div class="quote-export">
              <div class="header">
                <h1>${organizationNameHtml}</h1>
                <p>Quote Document</p>
              </div>
              <h2 class="quote-title">
                ${q.quoteNumber || q.id}
                <span class="status-badge status-${(q.status || 'draft').toLowerCase()}">${(q.status || 'Draft').toUpperCase()}</span>
              </h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Customer</div>
                  <div class="info-value">${q.customerName || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Quote Date</div>
                  <div class="info-value">${formatDate(q.quoteDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Expiry Date</div>
                  <div class="info-value">${formatDate(q.expiryDate)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Salesperson</div>
                  <div class="info-value">${q.salesperson || 'N/A'}</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${q.items && q.items.length > 0 ? q.items.map((item: any) => `
                    <tr>
                      <td>${item.name || item.item?.name || 'N/A'}</td>
                      <td>${item.quantity || 0}</td>
                      <td>${formatCurrency(item.unitPrice || item.rate || item.price, q.currency)}</td>
                      <td>${formatCurrency(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price)), q.currency)}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="4">No items</td></tr>'}
                  <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td>${formatCurrency(q.total, q.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `).join('')}
          <div class="footer">
            Generated by ${organizationNameHtml} on ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
  };

  const handleBulkPrint = () => {
    setIsBulkActionsOpen(false);
    handleExportPDF();
  };

  const handleBulkMarkAsSent = () => {
    setIsMarkAsSentModalOpen(true);
    setIsBulkActionsOpen(false);
  };

  const handleConfirmMarkAsSent = async () => {
    try {
      await Promise.all(selectedQuotes.map(id => updateQuote(id, { status: 'sent' })));
      // Reload quotes
      try {
        const quotes = await getQuotes();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      if (quoteId) {
        try {
          const quoteData = await getQuoteById(quoteId);
          if (quoteData) {
            setQuote(quoteData);
          }
        } catch (error) {
          console.error("Error reloading quote data:", error);
        }
      }
      toast.success(`${selectedQuotes.length} quote(s) marked as sent.`);
      await appendActivityLog(
        "Bulk Mark As Sent",
        `${selectedQuotes.length} quote(s) were marked as sent.`,
        "success"
      );
    } catch (error) {
      console.error("Error marking quotes as sent:", error);
      toast.error("Failed to mark selected quotes as sent.");
    }
    setSelectedQuotes([]);
    setIsMarkAsSentModalOpen(false);
  };

  const handleBulkDelete = () => {
    setIsDeleteModalOpen(true);
    setIsBulkActionsOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteQuotes(selectedQuotes);
      toast.success(`${selectedQuotes.length} quote(s) deleted.`);
      // Reload quotes
      try {
        const quotes = await getQuotes();
        setAllQuotes(quotes);

        // If current quote was deleted, navigate to first available quote or quotes list
        if (quoteId && selectedQuotes.includes(quoteId)) {
          const remainingQuotes = quotes.filter(q => !selectedQuotes.includes(q.id));
          if (remainingQuotes.length > 0) {
            navigate(`/sales/quotes/${remainingQuotes[0].id}`);
          } else {
            navigate('/sales/quotes');
          }
        }
      } catch (error) {
        console.error("Error reloading quotes:", error);
        // If current quote was deleted, navigate to quotes list on error
        if (quoteId && selectedQuotes.includes(quoteId)) {
          navigate('/sales/quotes');
        }
      }

      if (quoteId && !selectedQuotes.includes(quoteId as string)) {
        await appendActivityLog(
          "Bulk Delete",
          `${selectedQuotes.length} quote(s) were deleted.`,
          "warning"
        );
      }
    } catch (error) {
      console.error("Error deleting quotes:", error);
      toast.error("Failed to delete selected quotes.");
    }

    setSelectedQuotes([]);
    setIsDeleteModalOpen(false);
  };

  // Bulk Update Submit
  const handleBulkUpdateSubmit = async () => {
    if (!bulkUpdateField || !bulkUpdateValue) return;

    try {
      await Promise.all(selectedQuotes.map(id => {
        const updateData: Record<string, any> = {};
        updateData[bulkUpdateField] = bulkUpdateValue;
        return updateQuote(id, updateData);
      }));

      // Reload quotes
      try {
        const quotes = await getQuotes();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      if (quoteId) {
        try {
          const quoteData = await getQuoteById(quoteId);
          if (quoteData) {
            setQuote(quoteData);
          }
        } catch (error) {
          console.error("Error reloading quote data:", error);
        }
      }
      toast.success("Bulk update completed.");
      await appendActivityLog(
        "Bulk Update",
        `Updated ${selectedQuotes.length} quote(s): ${bulkUpdateField}.`,
        "success"
      );
    } catch (error) {
      console.error("Error bulk updating quotes:", error);
      toast.error("Failed to bulk update selected quotes.");
    }

    setSelectedQuotes([]);
    setIsBulkUpdateModalOpen(false);
    setBulkUpdateField("");
    setBulkUpdateValue("");
  };

  // Bulk update field options
  const bulkUpdateFields = [
    { value: "paymentTerms", label: "Payment Terms" },
    { value: "billingAddress", label: "Billing Address" },
    { value: "shippingAddress", label: "Shipping Address" },
    { value: "billingAndShippingAddress", label: "Billing and Shipping Address" },
    { value: "pdfTemplate", label: "PDF Template" },
    { value: "referenceNumber", label: "Reference#" },
    { value: "quoteDate", label: "Quote Date" },
    { value: "expiryDate", label: "Expiry Date" },
    { value: "customerNotes", label: "Customer Notes" },
    { value: "termsAndConditions", label: "Terms & Conditions" }
  ];

  const filteredBulkFields = bulkUpdateFields.filter(field =>
    field.label.toLowerCase().includes(bulkFieldSearch.toLowerCase())
  );

  // Navigate to quote with the data we already have so the detail view renders immediately.
  const handleQuoteClick = (quoteOrId: any) => {
    const nextQuoteId = String(quoteOrId?.id || quoteOrId?._id || quoteOrId || "").trim();
    if (!nextQuoteId) return;

    const nextQuote =
      typeof quoteOrId === "object" && quoteOrId
        ? quoteOrId
        : allQuotes.find((row: any) => String(row?.id || row?._id || row?.quoteId || "") === nextQuoteId) || null;

    navigate(`/sales/quotes/${nextQuoteId}`, {
      state: {
        preloadedQuote: nextQuote,
        preloadedQuotes: allQuotes,
      },
    });
  };

  // Create new quote
  const handleCreateNewQuote = () => {
    navigate("/sales/quotes/new");
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: any, currency = baseCurrency) => {
    // Extract only the currency symbol (first 3-4 characters before any space or dash)
    const currencySymbol = currency ? currency.split(' - ')[0].split(' ')[0] : baseCurrency;
    return `${currencySymbol}${parseFloat(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}`;
  };

  const toNumber = (value: any) => {
    const parsed = parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const getInvoiceDateValue = (invoice: any) =>
    invoice?.invoiceDate || invoice?.date || invoice?.createdAt || "";

  const getInvoiceDueDateValue = (invoice: any) =>
    invoice?.dueDate || invoice?.expectedPaymentDate || "";

  const getInvoiceBalanceDueValue = (invoice: any) => {
    const total = toNumber(invoice?.total ?? invoice?.amount ?? 0);
    const balanceDue = toNumber(invoice?.balanceDue ?? invoice?.balance ?? 0);
    if (balanceDue > 0) return balanceDue;
    const paid = toNumber(invoice?.amountPaid ?? invoice?.paidAmount ?? 0);
    if (paid > 0) return Math.max(0, total - paid);
    return balanceDue;
  };

  const getInvoiceStatusMeta = (invoice: any) => {
    const rawStatus = String(invoice?.status || "").toLowerCase();
    const dueRaw = getInvoiceDueDateValue(invoice);
    const dueDate = dueRaw ? new Date(dueRaw) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate) dueDate.setHours(0, 0, 0, 0);

    const balanceDue = getInvoiceBalanceDueValue(invoice);
    if (rawStatus === "draft") return { label: "DRAFT", className: "text-yellow-700" };
    if (balanceDue <= 0 && rawStatus) return { label: "PAID", className: "text-emerald-700" };
    if (dueDate && isSameDay(dueDate, today) && balanceDue > 0) return { label: "DUE TODAY", className: "text-[#2F80FF]" };
    if (dueDate && dueDate.getTime() < today.getTime() && balanceDue > 0) return { label: "OVERDUE", className: "text-red-600" };

    if (rawStatus === "sent" || rawStatus === "open" || rawStatus === "unpaid") return { label: "UNPAID", className: "text-[#2F80FF]" };
    if (rawStatus) return { label: rawStatus.toUpperCase(), className: "text-gray-700" };
    return { label: "UNPAID", className: "text-[#2F80FF]" };
  };

  const renderLinkedInvoicesTable = (opts?: any) => {
    const compact = Boolean(opts?.compact);
    const visibleLinkedInvoices = linkedInvoices.filter((invoice: any) => {
      const status = String(invoice?.status || "").toLowerCase().replace(/[\s-]+/g, "_").trim();
      return status === "paid" || status === "partially_paid";
    });

    if (linkedInvoicesLoading || visibleLinkedInvoices.length === 0) return null;

    return (
      <div id="quote-linked-invoices" className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700">
              {visibleLinkedInvoices.length}
            </span>
          </div>
          {!compact && (
            <button
              type="button"
              className="text-sm font-medium text-[#0D4A52] hover:underline"
              onClick={handleConvertToInvoice}
            >
              Convert to Invoice
            </button>
          )}
        </div>

        {visibleLinkedInvoices.length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-600">No linked invoices found for this quote.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f8fafc]">
                <tr className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="text-left py-2.5 px-4 min-w-[130px]">Date</th>
                  <th className="text-left py-2.5 px-4 min-w-[150px]">Invoice#</th>
                  <th className="text-left py-2.5 px-4 min-w-[130px]">Status</th>
                  <th className="text-left py-2.5 px-4 min-w-[130px]">Due Date</th>
                  <th className="text-right py-2.5 px-4 min-w-[130px]">Amount</th>
                  <th className="text-right py-2.5 px-4 min-w-[140px]">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleLinkedInvoices.map((invoice) => {
                  const statusMeta = getInvoiceStatusMeta(invoice);
                  const invoiceId = String(invoice?.id || invoice?._id || "").trim();
                  const invoiceNumber = String(invoice?.invoiceNumber || invoice?.number || invoiceId || "-").trim();
                  const invoiceDate = formatDate(getInvoiceDateValue(invoice));
                  const dueDate = formatDate(getInvoiceDueDateValue(invoice));
                  const amount = toNumber(invoice?.total ?? invoice?.amount ?? 0);
                  const balanceDue = getInvoiceBalanceDueValue(invoice);
                  return (
                    <tr key={invoiceId || invoiceNumber} className="text-sm">
                      <td className="py-3 px-4 text-gray-800">{invoiceDate}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          className="text-[#0D4A52] hover:underline"
                          onClick={() => invoiceId && navigate(`/sales/invoices/${invoiceId}`)}
                        >
                          {invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${statusMeta.className}`}>{statusMeta.label}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">{dueDate}</td>
                      <td className="py-3 px-4 text-right text-gray-800">{formatCurrency(amount, quote?.currency || baseCurrency)}</td>
                      <td className="py-3 px-4 text-right text-gray-800">{formatCurrency(balanceDue, quote?.currency || baseCurrency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };


  const convertNumberToWords = (amount: number) => {
    const words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    const convert = (n: number): string => {
      if (n < 20) return words[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + words[n % 10] : "");
      if (n < 1000) return words[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
      if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
      return n.toString();
    };

    if (amount === 0) return "Zero";
    const integerPart = Math.floor(amount);
    const fractionalPart = Math.round((amount - integerPart) * 100);
    
    let res = convert(integerPart);
    if (fractionalPart > 0) {
      res += " and " + convert(fractionalPart) + " Cents";
    }
    return res + " Only";
  };

  function getQuoteTotalsMeta(quoteData: any) {
    const items = Array.isArray(quoteData?.items) ? quoteData.items : [];
    const computedSubTotal = items.reduce((sum: number, item: any) => {
      const quantity = toNumber(item?.quantity ?? 0);
      const rate = toNumber(item?.unitPrice ?? item?.rate ?? item?.price ?? 0);
      const amount = toNumber(item?.amount ?? item?.total);
      const lineTotal = amount || (quantity * rate);
      return sum + lineTotal;
    }, 0);
    const subTotal = toNumber(quoteData?.subTotal ?? quoteData?.subtotal ?? computedSubTotal);

    const shippingCharges = toNumber(
      quoteData?.shippingCharges ??
      quoteData?.shipping ??
      quoteData?.shippingCharge ??
      0
    );
    const shippingTaxAmount = toNumber(quoteData?.shippingTaxAmount ?? quoteData?.shippingTax ?? 0);
    const taxAmountFromQuote = toNumber(quoteData?.totalTax ?? quoteData?.taxAmount ?? quoteData?.tax ?? 0);
    const itemsTaxAmount = items.reduce((sum: number, item: any) => sum + toNumber(item?.taxAmount ?? 0), 0);
    const taxAmount = taxAmountFromQuote || (itemsTaxAmount + shippingTaxAmount);
    const discount = toNumber(quoteData?.discount ?? quoteData?.discountAmount ?? 0);
    const adjustment = toNumber(quoteData?.adjustment ?? 0);
    const roundOff = toNumber(quoteData?.roundOff ?? 0);
    const taxExclusive = quoteData?.taxExclusive || "Tax Exclusive";
    const isTaxInclusive = taxExclusive === "Tax Inclusive";

    const discountBase = Math.max(0, isTaxInclusive ? (subTotal - taxAmount) : subTotal);
    const discountRate = discount > 0 && discountBase > 0 ? (discount / discountBase) * 100 : 0;
    const discountLabel = discount > 0
      ? `Discount(${discountRate.toFixed(2)}%)`
      : "Discount";

    const explicitTaxName = String(quoteData?.taxName || "").trim();
    let taxLabel = explicitTaxName;
    if (!taxLabel) {
      const rates = Array.from(new Set((quoteData?.items || [])
        .map((item: any) => toNumber(item?.taxRate))
        .filter((rate: number) => rate > 0))) as number[];
      if (rates.length === 1) {
        const rateValue = rates[0];
        const rateText = Number.isInteger(rateValue) ? rateValue.toFixed(0) : rateValue.toFixed(2);
        taxLabel = `Tax (${rateText}%)`;
      } else {
        taxLabel = isTaxInclusive ? "Tax (Included)" : "Tax";
      }
    }

    const shippingTaxSource =
      quoteData?.shippingChargeTax ??
      quoteData?.shippingTaxId ??
      quoteData?.shippingTax;
    const shippingTaxName =
      shippingTaxSource && typeof shippingTaxSource === "object"
        ? String((shippingTaxSource as any).name || (shippingTaxSource as any).taxName || "")
        : String(quoteData?.shippingTaxName || "");
    const shippingTaxRate =
      shippingTaxSource && typeof shippingTaxSource === "object"
        ? parseFloat((shippingTaxSource as any).rate || 0) || 0
        : parseFloat(quoteData?.shippingTaxRate || 0) || 0;
    const shippingTaxLabel =
      shippingTaxName ||
      (shippingTaxRate > 0 ? `Shipping Tax (${Number.isInteger(shippingTaxRate) ? shippingTaxRate.toFixed(0) : shippingTaxRate.toFixed(2)}%)` : "Shipping Tax");

    const computedTotal = isTaxInclusive
      ? (subTotal - discount + shippingCharges + adjustment + roundOff)
      : (subTotal + taxAmount - discount + shippingCharges + adjustment + roundOff);

    return {
      subTotal,
      taxAmount,
      discount,
      shippingCharges,
      shippingTaxAmount,
      shippingTaxLabel,
      adjustment,
      roundOff,
      taxExclusive,
      discountBase,
      discountLabel,
      taxLabel,
      total: toNumber(quoteData?.total ?? computedTotal),
      totalInWords: convertNumberToWords(toNumber(quoteData?.total ?? computedTotal))
    };
  }

  const getStatusBadge = (status: any) => {
    const statusMap = {
      draft: { label: "Draft", className: "text-yellow-800" },
      approved: { label: "Approved", className: "text-emerald-700" },
      pending_approval: { label: "Pending Approval", className: "text-violet-700" },
      sent: { label: "Sent", className: "text-blue-800" },
      open: { label: "Open", className: "text-[#0D4A52]" },
      accepted: { label: "Accepted", className: "text-[#0D4A52]" },
      declined: { label: "Declined", className: "text-red-800" },
      rejected: { label: "Declined", className: "text-red-800" },
      expired: { label: "Expired", className: "text-gray-800" },
      converted: { label: "Invoiced", className: "text-[#0D4A52]" },
      invoiced: { label: "Invoiced", className: "text-[#0D4A52]" }
    };
    const statusInfo = (statusMap as any)[status?.toLowerCase()] || statusMap.draft;
    return <span className={`text-xs font-medium ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const handleEdit = () => {
    const normalizedQuoteStatus = String(quote?.status || "").trim().toLowerCase();
    const isAcceptedQuote = normalizedQuoteStatus === "accepted";

    if (isAcceptedQuote && !allowEditingAcceptedQuotes) {
      toast.error("Editing accepted quotes is disabled in quote settings.");
      return;
    }

    if (quote && typeof window !== "undefined" && quoteId) {
      try {
        localStorage.setItem(`quote_edit_${quoteId}`, JSON.stringify(quote));
      } catch {
        // best effort only
      }
    }
    navigate(`/sales/quotes/${quoteId}/edit`, {
      state: { preloadedQuote: quote, preloadedQuotes: allQuotes },
    });
  };

  function handleConvertToInvoice() {
    if (!quote) return;

    try {
      const totalsMeta = getQuoteTotalsMeta(quote);
      const shippingTaxSource =
        (quote as any).shippingChargeTax ??
        (quote as any).shippingTaxId ??
        (quote as any).shippingTax;
      const shippingTaxValue =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? (
            (shippingTaxSource as any)._id ||
            (shippingTaxSource as any).id ||
            (shippingTaxSource as any).taxId ||
            (shippingTaxSource as any).name ||
            (shippingTaxSource as any).taxName ||
            (shippingTaxSource as any).rate ||
            ""
          )
          : (shippingTaxSource ?? "");
      const shippingTaxId =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? String((shippingTaxSource as any)._id || (shippingTaxSource as any).id || (shippingTaxSource as any).taxId || "")
          : String((quote as any).shippingTaxId || "");
      const shippingTaxName =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? String((shippingTaxSource as any).name || (shippingTaxSource as any).taxName || "")
          : String((quote as any).shippingTaxName || "");
      const shippingTaxRate =
        shippingTaxSource && typeof shippingTaxSource === "object"
          ? parseFloat((shippingTaxSource as any).rate || 0) || 0
          : parseFloat((quote as any).shippingTaxRate || 0) || 0;

      // Map quote items to invoice items format
      const invoiceItems = (quote.items || []).map((item: any, index: number) => {
        const quantity = parseFloat(item.quantity) || 1;
        const baseRate = parseFloat(item.catalogRate || item.unitPrice || item.rate || item.price) || 0;
        const rawLineAmount = parseFloat(item.total || item.amount) || 0;
        const effectiveRate =
          rawLineAmount > 0 && quantity > 0
            ? rawLineAmount / quantity
            : baseRate;
        const rate = Number.isFinite(effectiveRate) ? effectiveRate : baseRate;
        const lineAmount = rawLineAmount > 0 ? rawLineAmount : (quantity * rate);
        const rawTaxSource = item.tax;
        const rawTaxValue =
          item.taxId ??
          (rawTaxSource && typeof rawTaxSource === "object"
            ? (
              (rawTaxSource as any)._id ||
              (rawTaxSource as any).id ||
              (rawTaxSource as any).taxId ||
              (rawTaxSource as any).name ||
              (rawTaxSource as any).taxName ||
              (rawTaxSource as any).rate ||
              (typeof (rawTaxSource as any).toString === "function" ? (rawTaxSource as any).toString() : "")
            )
            : rawTaxSource) ??
          item.taxName ??
          item.taxLabel ??
          item.taxRate ??
          item.salesTaxRate ??
          "";
        const normalizedRawTaxValue = String(rawTaxValue || "").trim() === "[object Object]" ? "" : rawTaxValue;
        const rawTaxRate = parseFloat(
          item.taxRate ??
          (rawTaxSource && typeof rawTaxSource === "object" ? (rawTaxSource as any).rate : rawTaxSource) ??
          item.salesTaxRate ??
          0
        ) || 0;
        const explicitTaxAmount = parseFloat(item.taxAmount || 0) || 0;
        const derivedTaxRate = rawTaxRate > 0
          ? rawTaxRate
          : (lineAmount > 0 && explicitTaxAmount > 0 ? (explicitTaxAmount / lineAmount) * 100 : 0);
        const taxIdValue = item.taxId || (
          rawTaxSource && typeof rawTaxSource === "object"
            ? String((rawTaxSource as any)._id || (rawTaxSource as any).id || (rawTaxSource as any).taxId || "")
            : ""
        );

        return {
          id: index + 1,
          itemId: item.item?._id || item.itemId || item.item || null, // Include the product ID for stock tracking
          itemEntityType: item.itemEntityType || item.entityType || item.item?.entityType || "item",
          itemType: item.itemType || "line",
          itemDetails: item.name || item.item?.name || '',
          name: item.name || item.item?.name || '',
          quantity,
          rate,
          price: rate,
          catalogRate: parseFloat(item.catalogRate || item.unitPrice || item.rate || item.price) || rate,
          tax: taxIdValue || normalizedRawTaxValue || (derivedTaxRate > 0 ? derivedTaxRate : ''),
          taxId: taxIdValue,
          taxRate: derivedTaxRate,
          taxAmount: explicitTaxAmount,
          amount: lineAmount,
          description: item.description || item.name || item.item?.name || ''
        };
      });

      const inferredDiscountType =
        quote.discountType ||
        ((toNumber(quote.discountAmount) > 0 && toNumber(quote.discount) <= 0) ? "amount" : "percent");
      const sourceDiscountType = String(inferredDiscountType || "percent").toLowerCase() === "amount" ? "amount" : "percent";
      const rawDiscount = toNumber(quote.discount ?? quote.discountAmount);
      const discountBase = Math.max(0, toNumber(totalsMeta.discountBase ?? totalsMeta.subTotal));
      const taxAmount = toNumber(totalsMeta.taxAmount);
      const shippingCharges = toNumber(
        quote.shippingCharges ??
        (quote as any).shipping ??
        (quote as any).shippingCharge ??
        totalsMeta.shippingCharges
      );
      const adjustment = toNumber(quote.adjustment);
      const roundOff = toNumber(quote.roundOff);
      const quoteTotal = toNumber(quote.total ?? quote.amount);
      const isTaxInclusive = String(quote.taxExclusive || "Tax Exclusive").toLowerCase().includes("inclusive");

      const totalAssumingPercent =
        discountBase +
        (isTaxInclusive ? 0 : taxAmount) -
        ((discountBase * rawDiscount) / 100) +
        shippingCharges +
        adjustment +
        roundOff;
      const totalAssumingAmount =
        discountBase +
        (isTaxInclusive ? 0 : taxAmount) -
        rawDiscount +
        shippingCharges +
        adjustment +
        roundOff;
      const looksLikeAmount =
        sourceDiscountType === "percent" &&
        rawDiscount > 0 &&
        discountBase > 0 &&
        (
          rawDiscount > 100 ||
          (Math.abs(quoteTotal - totalAssumingAmount) + 0.01 < Math.abs(quoteTotal - totalAssumingPercent))
        );

      const normalizedDiscount = sourceDiscountType === "percent" && looksLikeAmount
        ? (rawDiscount / discountBase) * 100
        : rawDiscount;

      // Format dates
      const today = new Date();
      const invoiceDate = today.toISOString().split('T')[0];
      const dueDate = quote.expiryDate ? new Date(quote.expiryDate).toISOString().split('T')[0] :
        new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Prepare quote data to pass to new invoice page
      const quoteData = {
        customerName: quote.customerName || '',
        customerId: quote.customerId || null,
        customerEmail: quote.customerEmail || (quote as any).email || '',
        orderNumber: quote.referenceNumber || '',
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        salesperson: quote.salesperson || '',
        salespersonId: quote.salespersonId || '',
        subject: quote.subject || `Invoice from Quote ${quote.quoteNumber || quote.id}`,
        items: invoiceItems,
        selectedPriceList: (quote as any).priceListName || (quote as any).selectedPriceList || "",
        subTotal: toNumber(totalsMeta.subTotal),
        tax: taxAmount,
        taxAmount: taxAmount,
        totalTax: taxAmount,
        discount: normalizedDiscount,
        discountType: sourceDiscountType,
        discountAccount: quote.discountAccount || "General Income",
        shippingCharges: shippingCharges,
        shippingChargeTax: String(shippingTaxValue || ""),
        shippingTaxId: shippingTaxId,
        shippingTaxName: shippingTaxName,
        shippingTaxRate: shippingTaxRate,
        shippingTaxAmount: toNumber(totalsMeta.shippingTaxAmount),
        adjustment: adjustment,
        roundOff: roundOff,
        total: toNumber(totalsMeta.total),
        currency: quote.currency || 'KES',
        customerNotes: quote.customerNotes || '',
        termsAndConditions: quote.termsAndConditions || '',
        taxExclusive: quote.taxExclusive || 'Tax Exclusive',
        convertedFromQuote: quoteId,
        quoteNumber: quote.quoteNumber || quote.id
      };

      // Mark quote as invoiced on convert (keeps list/detail in sync)
      const nextStatus = "invoiced";
      try {
        if (quoteId) {
          updateQuote(quoteId, { status: nextStatus });
        }
      } catch (error) {
        console.warn("Failed to update quote status after convert:", error);
      }
      setQuote((prev: any) => (prev ? { ...prev, status: nextStatus } : prev));
      setAllQuotes((prev: any[]) =>
        Array.isArray(prev)
          ? prev.map((row: any) => (String(row?._id || row?.id) === String(quoteId) ? { ...row, status: nextStatus } : row))
          : prev
      );

      // Navigate to new invoice page with quote data
      navigate('/sales/invoices/new', { state: { quoteData } });
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
      toast.error("Failed to convert quote to invoice. Please try again.");
    }
  };

  const handleConvertToDraft = async () => {
    setShowConvertDropdown(false);
    if (!quoteId) return;
    try {
      await updateQuote(quoteId, { status: "draft" });
      await appendActivityLog("Status Updated", "Quote status changed to draft.", "info");
      const updatedQuote = await getQuoteById(quoteId);
      if (updatedQuote) {
        setQuote(updatedQuote);
      }
      try {
        const quotes = await getQuotes();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      toast.success("Quote converted to draft.");
    } catch (error) {
      console.error("Error converting quote to draft:", error);
      toast.error("Failed to convert quote to draft. Please try again.");
    }
  };

  const handleClose = () => {
    navigate("/sales/quotes");
  };

  // Mail handlers
  const handleSendEmail = () => {
    setShowMailDropdown(false);
    if (!quote) return;
    navigate(`/sales/quotes/${quoteId}/email`);
  };

  const handleViewQuoteInNewPage = () => {
    setShowPdfDropdown(false);
    if (!quote) return;
    const totalsMeta = getQuoteTotalsMeta(quote);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.quoteNumber || quote.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 40px; 
            color: #333;
            line-height: 1.6;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            margin-bottom: 40px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
          }
          .company-info h1 { 
            color: #2563eb; 
            font-size: 28px; 
            margin-bottom: 5px;
          }
          .company-info p { 
            color: #666; 
            font-size: 12px;
          }
          .quote-info { text-align: right; }
          .quote-info h2 { 
            font-size: 24px; 
            color: #111;
            margin-bottom: 10px;
          }
          .quote-info .status { 
            display: inline-block;
            font-size: 12px; 
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 10px;
          }
          .quote-info p { font-size: 14px; color: #666; }
          .section { margin-bottom: 30px; }
          .section-title { 
            font-size: 16px; 
            font-weight: 600; 
            color: #111;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
          }
          .info-item { padding: 10px; background: #f9fafb; border-radius: 6px; }
          .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 500; }
          .info-value { font-size: 14px; color: #111; font-weight: 500; margin-top: 4px; }
          .customer-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .customer-name { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 5px; }
          .customer-address { font-size: 14px; color: #666; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          th, td { 
            padding: 12px 15px; 
            text-align: left; 
            border-bottom: 1px solid #e5e7eb; 
          }
          th { 
            background: #f3f4f6; 
            font-weight: 600; 
            color: #374151; 
            font-size: 12px;
            text-transform: uppercase;
          }
          td { font-size: 14px; color: #374151; }
          .totals { 
            margin-left: auto; 
            width: 350px; 
            margin-top: 20px;
          }
          .totals-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            font-size: 14px;
          }
          .totals-subrow {
            font-size: 12px;
            color: #6b7280;
            margin-top: -4px;
            margin-bottom: 8px;
          }
          .totals-row.total { 
            background: #f3f4f6;
            font-weight: 700;
            font-size: 16px;
            margin-top: 12px;
            padding: 12px 14px;
          }
          .notes { 
            background: #f9fafb; 
            padding: 15px; 
            border-radius: 6px;
            font-size: 14px;
            color: #666;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #9ca3af; 
            font-size: 12px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${organizationNameHtml}</h1>
            <p>Professional Accounting Solutions</p>
          </div>
          <div class="quote-info">
            <h2>QUOTE</h2>
            <div class="status">${(quote.status || 'Draft').toUpperCase()}</div>
            <p><strong>${quote.quoteNumber || quote.id}</strong></p>
          </div>
        </div>

        <div class="section">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Quote Date</div>
              <div class="info-value">${formatDate(quote.quoteDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Expiry Date</div>
              <div class="info-value">${formatDate(quote.expiryDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Reference</div>
              <div class="info-value">${quote.referenceNumber || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Salesperson</div>
              <div class="info-value">${quote.salesperson || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bill To</div>
          <div class="customer-box">
            <div class="customer-name">${quote.customerName || 'N/A'}</div>
            <div class="customer-address">${quote.billingAddress || 'No address provided'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Items</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Item</th>
                <th style="width: 80px;">Qty</th>
                <th style="width: 120px;">Price</th>
                <th style="width: 120px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items && quote.items.length > 0 ? quote.items.map((item: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <strong>${item.name || item.item?.name || 'N/A'}</strong>
                    ${item.description ? `<br><span style="color: #666; font-size: 12px;">${item.description}</span>` : ''}
                  </td>
                  <td>${item.quantity || 0}</td>
                  <td>${formatCurrency(item.unitPrice || item.rate || item.price, quote.currency)}</td>
                  <td>${formatCurrency(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price)), quote.currency)}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align: center; color: #666;">No items</td></tr>'}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Sub Total</span>
              <span>${formatCurrency(totalsMeta.subTotal, quote.currency)}</span>
            </div>
            <div class="totals-subrow">(${totalsMeta.taxExclusive})</div>
            ${totalsMeta.discount > 0 ? `
            <div class="totals-row">
              <span>${totalsMeta.discountLabel}</span>
              <span>(-) ${formatCurrency(totalsMeta.discount, quote.currency)}</span>
            </div>
            <div class="totals-subrow">
              (Applied on ${formatCurrency(totalsMeta.discountBase, quote.currency)})
            </div>
            ` : ''}
            <div class="totals-row">
              <span>${totalsMeta.taxLabel}</span>
              <span>${formatCurrency(totalsMeta.taxAmount, quote.currency)}</span>
            </div>
            <div class="totals-row">
              <span>Shipping charge</span>
              <span>${formatCurrency(totalsMeta.shippingCharges, quote.currency)}</span>
            </div>
            <div class="totals-row">
              <span>${totalsMeta.shippingTaxLabel}</span>
              <span>${formatCurrency(totalsMeta.shippingTaxAmount, quote.currency)}</span>
            </div>
            <div class="totals-row">
              <span>Adjustment</span>
              <span>${formatCurrency(totalsMeta.adjustment, quote.currency)}</span>
            </div>
            <div class="totals-row">
              <span>Round Off</span>
              <span>${formatCurrency(totalsMeta.roundOff, quote.currency)}</span>
            </div>
            <div class="totals-row total">
              <span>Total</span>
              <span>${formatCurrency(totalsMeta.total, quote.currency)}</span>
            </div>
          </div>
        </div>

        ${quote.customerNotes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <div class="notes">${quote.customerNotes}</div>
        </div>
        ` : ''}

        ${quote.termsAndConditions ? `
        <div class="section">
          <div class="section-title">Terms & Conditions</div>
          <div class="notes">${quote.termsAndConditions}</div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated by ${organizationNameHtml} on ${new Date().toLocaleDateString()}</p>
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleSendReminder = () => {
    setShowMailDropdown(false);
    const orgName = organizationProfile?.name || "Your Company";
    const subject = encodeURIComponent(`Reminder: Quote ${quote.quoteNumber || quote.id} from ${orgName}`);
    const body = encodeURIComponent(`Dear ${quote.customerName || 'Customer'},\n\nThis is a friendly reminder about quote ${quote.quoteNumber || quote.id} that was sent to you.\n\nQuote Details:\n- Quote Number: ${quote.quoteNumber || quote.id}\n- Amount: ${formatCurrency(quote.total, quote.currency)}\n- Valid Until: ${formatDate(quote.expiryDate)}\n\nPlease review and let us know your decision.\n\nBest regards,\n${orgName}`);
    const mailtoLink = `mailto:${quote.customerEmail || ''}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleViewEmailHistory = () => {
    setShowMailDropdown(false);
    toast("Email history feature coming soon.");
  };

  // Share handler
  const handleShare = () => {
    if (!quote) return;

    // Calculate default expiration date (90 days from quote expiry date or 90 days from today)
    let defaultExpiryDate;
    if (quote.expiryDate) {
      defaultExpiryDate = new Date(quote.expiryDate);
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    } else {
      defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 90);
    }

    // Format as DD/MM/YYYY
    const day = String(defaultExpiryDate.getDate()).padStart(2, '0');
    const month = String(defaultExpiryDate.getMonth() + 1).padStart(2, '0');
    const year = defaultExpiryDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setLinkExpirationDate(formattedDate);
    setGeneratedLink("");
    setIsLinkGenerated(false);
    setShowShareModal(true);
  };

  const handleGenerateLink = () => {
    if (!linkExpirationDate) {
      toast.error("Please select an expiration date.");
      return;
    }

    // Generate a secure link similar to the example
    const baseUrl = "https://zohosecurepay.com/books/tabanenterprises/secure";
    const quoteId = quote.id || quote.quoteNumber || Date.now();
    // Generate a long secure token (128 characters like in the example)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Format: CEstimateID=quoteId-token (matching the example format)
    const secureLink = `${baseUrl}?CEstimateID=${quoteId}-${token}`;
    setGeneratedLink(secureLink);
    setIsLinkGenerated(true);
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => {
        toast.success("Link copied to clipboard.");
      }).catch(() => {
        toast.error("Unable to copy link. Please copy manually.");
      });
    }
  };

  const handleDisableAllActiveLinks = () => {
    if (window.confirm("Are you sure you want to disable all active links for this quote?")) {
      setGeneratedLink("");
      setIsLinkGenerated(false);
      toast.success("All active links have been disabled.");
    }
  };

  // Generate HTML content for quote (shared for print and download)
  const generateQuoteHTML = () => {
    return generateQuoteHTMLForQuote(quote);
  };

  // Generate HTML content for a specific quote (used for bulk export)
  function generateQuoteHTMLForQuote(quoteData: any) {
    if (!quoteData) return '';

    const itemsHTML = quoteData.items && quoteData.items.length > 0 ? quoteData.items.map((item: any, index: number) => {
      const rate = parseFloat(item.unitPrice || item.rate || item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amount = parseFloat(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const qty = parseFloat(item.quantity || 0).toFixed(2);
      const unit = item.item?.unit || item.unit || 'pcs';
      const itemName = item.name || item.item?.name || 'N/A';
      const rowBg = index % 2 === 0 ? '#ffffff' : '#fafafa';
      return `
        <tr style="background:${rowBg};">
          <td>${index + 1}</td>
          <td>
            <div><strong style="font-weight: 500;">${itemName}</strong></div>
            ${item.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${item.description}</div>` : ''}
          </td>
          <td>
            <div>${qty}</div>
            <div class="qty-unit">${unit}</div>
          </td>
          <td>${rate}</td>
          <td>${amount}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="5" style="padding: 24px; text-align: center; color: #666; font-size: 14px;">No items added</td></tr>';

    const quoteDate = quoteData.quoteDate || quoteData.date || new Date().toISOString();
    const customerName = quoteData.customerName || (typeof quoteData.customer === 'object' ? (quoteData.customer?.displayName || quoteData.customer?.name) : quoteData.customer) || 'N/A';
    const notes = quoteData.customerNotes || 'Looking forward for your business.';
    const totalsMeta = getQuoteTotalsMeta(quoteData);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quoteData.quoteNumber || quoteData.id}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 42px 36px 22px 36px;
            color: #111827;
            line-height: 1.35;
            background: #fff;
          }
          .quote-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 14px; }
          .company-name { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
          .company-address { font-size: 11px; color: #4b5563; line-height: 1.45; }
          .quote-title h1 { font-size: 40px; font-weight: 500; color: #111827; letter-spacing: 1.2px; line-height: 1; }
          .quote-number { font-size: 16px; color: #111827; font-weight: 700; margin-top: 6px; text-align: right; }
          .bill-date { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .bill-to-label { font-size: 15px; color: #111827; margin-bottom: 4px; font-weight: 600; }
          .bill-to-name { font-size: 15px; color: #2563eb; font-weight: 600; line-height: 1.2; }
          .bill-date-right { display: flex; align-items: center; gap: 22px; }
          .bill-date-colon { font-size: 16px; color: #6b7280; line-height: 1; }
          .quote-date { font-size: 13px; color: #111827; min-width: 120px; text-align: right; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          .items-table th { padding: 9px 12px; text-align: left; color: white; font-size: 11px; font-weight: 600; background-color: #3f3f46; }
          .items-table th:first-child { width: 44px; text-align: center; }
          .items-table th:nth-child(3), .items-table th:nth-child(4), .items-table th:nth-child(5) { width: 100px; text-align: right; }
          .items-table td { border-bottom: 1px solid #d1d5db; padding: 9px 12px; font-size: 11px; vertical-align: top; }
          .items-table td:first-child { text-align: center; }
          .items-table td:nth-child(3), .items-table td:nth-child(4), .items-table td:nth-child(5) { text-align: right; }
          .qty-unit { font-size: 10px; color: #6b7280; margin-top: 2px; }
          .totals { width: 320px; margin-left: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fcfcfd; padding: 10px 12px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; color: #4b5563; }
          .total-row.subtotal { font-size: 15px; color: #111827; font-weight: 600; }
          .total-subrow { font-size: 10px; color: #6b7280; margin-top: -2px; margin-bottom: 6px; }
          .total-row.final { padding: 10px 12px; font-size: 17px; font-weight: 700; background: #f3f4f6; border-radius: 6px; margin-top: 8px; color: #111827; }
          .total-value { color: #111827; font-weight: 500; }
          .notes { margin-top: 18px; margin-bottom: 12px; border-top: 1px dashed #d1d5db; padding-top: 10px; }
          .notes-label { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 6px; letter-spacing: 0.2px; }
          .notes-content { font-size: 11px; color: #4b5563; white-space: pre-line; line-height: 1.5; }
          .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 14px; text-align: center; }
          .footer-text { font-size: 10px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="quote-header">
          <div class="quote-title">
            <div class="company-name">${organizationProfile?.name || ''}</div>
            <div class="company-address">
              ${organizationProfile?.address?.street1 || ''}<br/>
              ${organizationProfile?.address?.street2 || ''}<br/>
              ${organizationProfile?.address?.city ? `${organizationProfile.address.city}${organizationProfile.address.zipCode ? ` ${organizationProfile.address.zipCode}` : ''}${organizationProfile.address.state ? `, ${organizationProfile.address.state}` : ''}` : ''}<br/>
              ${organizationProfile?.address?.country || ''}<br/>
              ${ownerEmail?.email || organizationProfile?.email || ''}
            </div>
          </div>
          <div class="quote-title">
            <h1>QUOTE</h1>
            <div class="quote-number"># ${quoteData.quoteNumber || quoteData.id}</div>
          </div>
        </div>

        <div class="bill-date">
          <div>
            <div class="bill-to-label">Bill To</div>
            <div class="bill-to-name">${customerName}</div>
          </div>
          <div class="bill-date-right">
            <div class="bill-date-colon">:</div>
            <div class="quote-date">${new Date(quoteDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item & Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row subtotal">
            <span class="total-label">Sub Total</span>
            <span class="total-value">${Number(totalsMeta.subTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${totalsMeta.discount > 0 ? `
          <div class="total-row">
            <span class="total-label">${totalsMeta.discountLabel}</span>
            <span class="total-value">(-) ${formatCurrency(totalsMeta.discount || 0, quoteData.currency)}</span>
          </div>
          <div class="total-subrow">
            (Applied on ${formatCurrency(totalsMeta.discountBase, quoteData.currency)})
          </div>
          ` : ''}
          <div class="total-row">
            <span class="total-label">${totalsMeta.taxLabel}</span>
            <span class="total-value">${formatCurrency(totalsMeta.taxAmount || 0, quoteData.currency)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Shipping charge</span>
            <span class="total-value">${formatCurrency(totalsMeta.shippingCharges, quoteData.currency)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">${totalsMeta.shippingTaxLabel}</span>
            <span class="total-value">${formatCurrency(totalsMeta.shippingTaxAmount, quoteData.currency)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Adjustment</span>
            <span class="total-value">${formatCurrency(totalsMeta.adjustment, quoteData.currency)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Round Off</span>
            <span class="total-value">${formatCurrency(totalsMeta.roundOff, quoteData.currency)}</span>
          </div>
          <div class="total-row final">
            <span>Total</span>
            <span>${formatCurrency(totalsMeta.total, quoteData.currency)}</span>
          </div>
        </div>

        <div class="notes">
          <div class="notes-label">Notes</div>
          <div class="notes-content">${notes}</div>
        </div>
      </body>
      </html>
    `;
  }

  // PDF/Print handlers
  const handlePrintQuote = () => {
    setShowPdfDropdown(false);
    if (!quote) return;

    // Use window.print() directly to show browser print dialog as overlay
    // Print styles will hide UI elements and show only the document
    window.print();
  };

  const handleDownloadPDF = async () => {
    setShowPdfDropdown(false);
    if (!quote) return;

    try {
      const sourceElement = document.querySelector('[data-print-content]') as HTMLElement | null;
      if (!sourceElement) {
        throw new Error("Quote preview element not found.");
      }

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-100000px";
      wrapper.style.top = "0";
      wrapper.style.width = "794px"; // A4 width at 96dpi
      wrapper.style.background = "#ffffff";
      wrapper.style.padding = "0";
      wrapper.style.margin = "0";
      wrapper.style.overflow = "visible";

      const cloned = sourceElement.cloneNode(true) as HTMLElement;
      cloned.style.width = "794px";
      cloned.style.maxWidth = "794px";
      cloned.style.margin = "0";
      cloned.style.boxShadow = "none";
      cloned.style.background = "#ffffff";
      wrapper.appendChild(cloned);
      document.body.appendChild(wrapper);

      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(wrapper, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        allowTaint: true,
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
      });
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      pdf.save(`Quote-${quote.quoteNumber || quote.id}.pdf`);
      toast.success("Quote PDF downloaded.");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to download quote PDF.");
    }
  };

  // More Options handlers
  const handleDuplicateQuote = async () => {
    setShowMoreDropdown(false);
    if (!quote) return;
    if (isCloningQuote) return;

    setIsCloningQuote(true);
    const originalQuote = quote;
    const originalAllQuotes = Array.isArray(allQuotes) ? [...allQuotes] : [];
    try {
      const sourceQuoteNumber = String(quote.quoteNumber || "").trim();
      const prefixMatch = sourceQuoteNumber.match(/^([^\d]*\D-?)/);
      const quotePrefix = (prefixMatch?.[1] || "QT-").trim();
      const quotePool = Array.isArray(allQuotes) && allQuotes.length > 0
        ? allQuotes
        : Array.isArray(preloadedQuotes)
          ? preloadedQuotes
          : [];
      const prefixedNumbers = quotePool
        .map((q: any) => String(q.quoteNumber || "").trim())
        .filter((number: string) => number.startsWith(quotePrefix));
      const maxSuffix = prefixedNumbers.reduce((max: number, number: string) => {
        const suffix = parseInt(number.replace(quotePrefix, ""), 10);
        return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
      }, 0);
      const nextQuoteNumber = `${quotePrefix}${String(maxSuffix + 1).padStart(6, "0")}`;

      const sourceCustomerId = quote.customerId || (typeof quote.customer === "object" ? quote.customer?._id : quote.customer);
      if (!sourceCustomerId) {
        toast.error("Cannot clone quote without a customer.");
        return;
      }

      const copyReference = (() => {
        const base = String(quote.referenceNumber || quote.quoteNumber || "").trim();
        if (!base) return "CLONE";
        if (/clone/i.test(base)) return base;
        if (/copy/i.test(base)) return base.replace(/copy/gi, "CLONE");
        return `${base}-CLONE`;
      })();

      const clonedItems = Array.isArray(quote.items) ? quote.items.map((item: any) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice ?? item.rate ?? item.price ?? 0);
        const lineSubtotal = toNumber(item.total ?? item.amount ?? (quantity * unitPrice));
        return {
          itemId: item.item?._id || item.itemId || item.item || null,
          item: item.item?._id || item.itemId || item.item || null,
          name: item.name || item.item?.name || item.itemDetails || "Item",
          itemDetails: item.itemDetails || item.name || item.item?.name || "Item",
          description: item.description || item.itemDetails || "",
          quantity,
          rate: unitPrice,
          unitPrice,
          tax: item.tax || "",
          taxRate: toNumber(item.taxRate),
          taxAmount: toNumber(item.taxAmount),
          amount: lineSubtotal,
          total: lineSubtotal
        };
      }) : [];

      const clonedPayload = {
        quoteNumber: nextQuoteNumber,
        referenceNumber: copyReference,
        customer: sourceCustomerId,
        customerId: sourceCustomerId,
        quoteDate: quote.quoteDate || quote.date || new Date().toISOString(),
        expiryDate: quote.expiryDate,
        salesperson: quote.salespersonId || quote.salesperson || "",
        salespersonId: quote.salespersonId || "",
        projectName: quote.projectName || quote.project?.name || "",
        subject: quote.subject || "",
        taxExclusive: quote.taxExclusive || "Tax Exclusive",
        items: clonedItems,
        subtotal: toNumber(quote.subTotal ?? quote.subtotal),
        tax: toNumber(quote.taxAmount ?? quote.tax),
        taxAmount: toNumber(quote.taxAmount ?? quote.tax),
        discount: toNumber(quote.discount),
        discountType: quote.discountType || "percent",
        discountAmount: toNumber(quote.discount),
        discountAccount: quote.discountAccount || "General Income",
        shippingCharges: toNumber(quote.shippingCharges),
        adjustment: toNumber(quote.adjustment),
        roundOff: toNumber(quote.roundOff),
        total: toNumber(quote.total),
        currency: quote.currency || baseCurrency,
        customerNotes: quote.customerNotes || quote.notes || "",
        termsAndConditions: quote.termsAndConditions || quote.terms || "",
        attachedFiles: Array.isArray(quote.attachedFiles)
          ? quote.attachedFiles.map((file: any) => ({
            id: file.id || file.documentId || file._id,
            name: file.name,
            size: toNumber(file.size),
            url: file.url,
            mimeType: file.mimeType || file.type || "",
            documentId: file.documentId || file.id || file._id,
            uploadedAt: file.uploadedAt || file.createdAt || new Date().toISOString()
          }))
          : [],
        comments: Array.isArray(quote.comments)
          ? quote.comments
            .filter((comment: any) => comment && String(comment.text || "").trim())
            .map((comment: any) => ({
              text: String(comment.text || "").trim(),
              author: comment.author || "User",
              bold: Boolean(comment.bold),
              italic: Boolean(comment.italic),
              underline: Boolean(comment.underline),
              timestamp: comment.timestamp || comment.createdAt || new Date().toISOString()
            }))
          : [],
        status: "draft"
      };

      const tempQuoteId = `clone-${Date.now()}`;
      const optimisticQuote: any = {
        ...quote,
        ...clonedPayload,
        id: tempQuoteId,
        _id: tempQuoteId,
        quoteNumber: nextQuoteNumber,
        status: "draft",
      };

      setQuote(optimisticQuote);
      setAllQuotes((prev: any[]) => {
        const base = Array.isArray(prev) && prev.length > 0 ? prev : originalAllQuotes;
        return [optimisticQuote, ...base.filter((row: any) => String(row?._id || row?.id) !== String(quoteId))];
      });

      const saveToastId = toast.loading(`Cloning quote as ${nextQuoteNumber}...`);
      const duplicatedQuote: any = await saveQuote(clonedPayload);
      const duplicatedQuoteId = duplicatedQuote?._id || duplicatedQuote?.id;
      if (!duplicatedQuoteId) {
        throw new Error("Cloned quote was saved but no ID was returned.");
      }

      void appendActivityLog(
        "Clone Quote",
        `Quote was duplicated as ${nextQuoteNumber}.`,
        "success"
      );
      toast.success(`Quote duplicated as ${nextQuoteNumber}`, { id: saveToastId });
      setQuote(duplicatedQuote);
      setAllQuotes((prev: any[]) =>
        Array.isArray(prev)
          ? prev.map((row: any) => (String(row?._id || row?.id) === tempQuoteId ? duplicatedQuote : row))
          : prev
      );
      navigate(`/sales/quotes/${duplicatedQuoteId}`, {
        state: {
          preloadedQuote: duplicatedQuote,
          preloadedQuotes: Array.isArray(allQuotes) ? [duplicatedQuote, ...allQuotes] : [duplicatedQuote],
        },
      });
    } catch (error) {
      console.error("Error duplicating quote:", error);
      setQuote(originalQuote);
      setAllQuotes(originalAllQuotes);
      toast.error("Failed to duplicate quote. Please try again.");
    } finally {
      setIsCloningQuote(false);
    }
  };

  const handleDeleteQuote = () => {
    setShowMoreDropdown(false);
    if (!quote) return;

    if (quoteId) {
      setSelectedQuotes([String(quoteId)]);
    }
    setIsDeleteModalOpen(true);
  };

  const handleCopyQuoteLink = () => {
    setShowMoreDropdown(false);
    const quoteUrl = window.location.href;
    navigator.clipboard.writeText(quoteUrl).then(() => {
      toast.success("Quote link copied to clipboard.");
    }).catch(() => {
      toast.error("Unable to copy link. Please copy manually.");
    });
  };

  const handleCreateProject = () => {
    setShowMoreDropdown(false);
    // Navigate to create project page with quote reference
    navigate("/time-tracking/projects/new", {
      state: {
        quoteId: quoteId,
        customerName: quote.customerName || (typeof quote.customer === 'object' ? (quote.customer?.displayName || quote.customer?.name) : quote.customer) || "-",
        customerId: quote?.customerId || null
      }
    });
  };

  const handleMarkAsAccepted = async () => {
    setShowMoreDropdown(false);
    if (!quote) return;

    try {
      if (quoteId) {
        const updatedQuote = await updateQuote(quoteId, {
          status: 'accepted',
          acceptedDate: new Date().toISOString(),
        });
        setQuote((prev: any) => ({ ...(prev || {}), ...(updatedQuote || {}), status: "accepted" }));
        setAllQuotes((prev: any[]) =>
          Array.isArray(prev)
            ? prev.map((row: any) => (String(row?._id || row?.id) === String(quoteId) ? { ...row, ...(updatedQuote || {}), status: "accepted" } : row))
            : prev
        );
        void appendActivityLog("Status Updated", "Quote status changed to accepted.", "success");
      }
      toast.success("Quote marked as accepted.");
      setStatusSuccessMessage("Quote status has been changed to accepted.");
    } catch (error) {
      console.error("Error marking quote as accepted:", error);
      toast.error("Failed to mark quote as accepted. Please try again.");
    }
  };

  const handleMarkAsDeclined = async () => {
    setShowMoreDropdown(false);
    if (!quote) return;

    try {
      if (quoteId) {
        const updatedQuote = await updateQuote(quoteId, {
          status: 'declined',
          declinedDate: new Date().toISOString(),
        });
        setQuote((prev: any) => ({ ...(prev || {}), ...(updatedQuote || {}), status: "declined" }));
        setAllQuotes((prev: any[]) =>
          Array.isArray(prev)
            ? prev.map((row: any) => (String(row?._id || row?.id) === String(quoteId) ? { ...row, ...(updatedQuote || {}), status: "declined" } : row))
            : prev
        );
        void appendActivityLog("Status Updated", "Quote status changed to declined.", "warning");
      }
      toast.success("Quote marked as declined.");
    } catch (error) {
      console.error("Error marking quote as declined:", error);
      toast.error("Failed to mark quote as declined. Please try again.");
    }
  };

  const resolveSubscriptionNumberForQuote = async (sourceQuote: any) => {
    const locationName = String(sourceQuote?.selectedLocation || sourceQuote?.location || "Head Office").trim() || "Head Office";
    const cachedNumber = transactionNumberSeriesAPI.getCachedNextNumber({ module: "Subscriptions", locationName });
    if (cachedNumber) return cachedNumber;

    try {
      const response: any = await transactionNumberSeriesAPI.getNextNumber({ module: "Subscriptions", locationName, reserve: false });
      const nextNumber = String(response?.data?.nextNumber || response?.data?.next_number || response?.nextNumber || "").trim();
      if (nextNumber) return nextNumber;
    } catch (error) {
      console.error("Failed to generate subscription number from quote:", error);
    }

    return "";
  };

  const handleCreateSubscription = async () => {
    if (!quote) {
      toast.error("Quote is still loading. Please try again in a moment.");
      return;
    }

    const subscriptionNumber = await resolveSubscriptionNumberForQuote(quote);
    const draft = buildSubscriptionEditDraft(buildSubscriptionDraftFromQuote({ ...quote, subscriptionNumber }));
    navigate("/sales/subscriptions/new", {
      state: {
        draft,
        sourceQuote: quote,
      },
    });
  };

  const handleMarkCurrentAsSent = async () => {
    if (!quoteId) return;
    try {
      await updateQuote(quoteId, { status: "sent" });
      await appendActivityLog("Status Updated", "Quote status changed to sent.", "success");
      const updatedQuote = await getQuoteById(quoteId);
      if (updatedQuote) {
        setQuote(updatedQuote);
      }
      try {
        const quotes = await getQuotes();
        setAllQuotes(quotes);
      } catch (error) {
        console.error("Error reloading quotes:", error);
      }
      toast.success("Quote marked as sent.");
    } catch (error) {
      console.error("Error marking quote as sent:", error);
      toast.error("Failed to mark quote as sent. Please try again.");
    }
  };

  const handleSubmitForApproval = async () => {
    if (!quote) return;

    try {
      if (quoteId) {
        const updatedQuote = await updateQuote(quoteId, {
          status: "pending_approval",
          approvalLevel: 1,
        });
        setQuote((prev: any) => ({ ...(prev || {}), ...(updatedQuote || {}), status: "pending_approval", approvalLevel: 1 }));
        setAllQuotes((prev: any[]) =>
          Array.isArray(prev)
            ? prev.map((row: any) => (String(row?._id || row?.id) === String(quoteId) ? { ...row, ...(updatedQuote || {}), status: "pending_approval", approvalLevel: 1 } : row))
            : prev
        );
        void appendActivityLog("Status Updated", "Quote submitted for approval.", "info");
      }
      toast.success("Quote submitted for approval.");
    } catch (error) {
      console.error("Error submitting quote for approval:", error);
      toast.error("Failed to submit quote for approval. Please try again.");
    }
  };

  // Attachments Handlers
  const handleFileUpload = async (files: any) => {
    if (!quoteId || !quote) {
      toast.error("Please save the quote first, then upload files.");
      return;
    }

    const validFiles = Array.from(files as ArrayLike<File>).filter((file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (quoteAttachments.length + validFiles.length > 5) {
      toast.error("Maximum 5 files allowed. Please remove some files first.");
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const uploadedAttachments = (await Promise.allSettled(
        validFiles.map(async (file, index) => {
          const uploadResponse = await documentsAPI.upload(file, {
            name: file.name,
            type: "quote",
            module: "sales",
            relatedToType: "quote",
            relatedToId: quote.id || quote._id || quoteId,
            description: `Quote attachment for ${quote.quoteNumber || quote.id || quoteId}`
          });

          const uploadedDocument = uploadResponse?.data || {};
          const fileUrl = uploadedDocument.url || "";
          return normalizeAttachmentFromQuote({
            id: uploadedDocument._id || uploadedDocument.id || Date.now() + Math.random(),
            documentId: uploadedDocument._id || uploadedDocument.id,
            name: uploadedDocument.name || file.name,
            size: uploadedDocument.fileSize || file.size,
            type: uploadedDocument.mimeType || file.type,
            mimeType: uploadedDocument.mimeType || file.type,
            url: fileUrl,
            preview: (uploadedDocument.mimeType || file.type || "").startsWith("image/") ? fileUrl : null,
            uploadedAt: uploadedDocument.createdAt || new Date().toISOString()
          }, index);
        })
      )).reduce((items: any[], result: PromiseSettledResult<any>) => {
        if (result.status === "fulfilled" && result.value) {
          items.push(result.value);
        }
        return items;
      }, []);

      if (uploadedAttachments.length === 0) {
        throw new Error("No attachments were uploaded.");
      }

      const updatedAttachments = [...quoteAttachments, ...uploadedAttachments];
      setQuoteAttachments(updatedAttachments);
      localStorage.setItem(`quote_attachments_${quoteId}`, JSON.stringify(updatedAttachments));

      const attachedFilesPayload = updatedAttachments
        .filter((attachment) => attachment.url)
        .map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          size: Number(attachment.size || 0),
          mimeType: attachment.type || attachment.mimeType || "",
          documentId: attachment.documentId || "",
          uploadedAt: attachment.uploadedAt || new Date().toISOString()
        }));

      void updateQuote(quoteId, { attachedFiles: attachedFilesPayload })
        .then((updatedQuote) => {
          if (updatedQuote) {
            setQuote(updatedQuote);
          }
        })
        .catch((error) => {
          console.error("Error persisting quote attachments:", error);
        });

      void appendActivityLog(
        "Attachment Added",
        `${uploadedAttachments.length} attachment(s) uploaded.`,
        "success"
      );
      if (uploadedAttachments.length < validFiles.length) {
        toast.success(`${uploadedAttachments.length} attachment(s) uploaded. ${validFiles.length - uploadedAttachments.length} file(s) failed.`);
      } else {
        toast.success(`${uploadedAttachments.length} attachment(s) uploaded.`);
      }
    } catch (error) {
      console.error("Error uploading quote attachment:", error);
      toast.error("Failed to upload attachment. Please try again.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleFileClick = (attachment: any) => {
    const isImage = isImageFileAttachment(attachment);
    if (isImage) {
      setSelectedImage(attachment.preview || attachment.url || (attachment.file ? URL.createObjectURL(attachment.file) : null));
      setShowImageViewer(true);
    } else {
      if (attachment.url) {
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
      } else if (attachment.file) {
        const url = URL.createObjectURL(attachment.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!quoteId) return;

    const updatedAttachments = quoteAttachments.filter((att: any) => att.id !== attachmentId);
    setQuoteAttachments(updatedAttachments);
    localStorage.setItem(`quote_attachments_${quoteId}`, JSON.stringify(updatedAttachments));

    try {
      const attachedFilesPayload = updatedAttachments
        .filter((attachment) => attachment.url)
        .map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          size: Number(attachment.size || 0),
          mimeType: attachment.type || attachment.mimeType || "",
          documentId: attachment.documentId || "",
          uploadedAt: attachment.uploadedAt || new Date().toISOString()
        }));

      void updateQuote(quoteId, { attachedFiles: attachedFilesPayload })
        .then((updatedQuote) => {
          if (updatedQuote) {
            setQuote(updatedQuote);
          }
        })
        .catch((error) => {
          console.error("Error persisting quote attachments:", error);
        });

      void appendActivityLog("Attachment Removed", "An attachment was removed.", "warning");
      toast.success("Attachment removed.");
    } catch (error) {
      console.error("Error removing quote attachment:", error);
      toast.error("Failed to remove attachment from database. Please refresh and try again.");
    }
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
    if (!quoteId) {
      toast.error("Please save the quote first, then add comments.");
      return;
    }

    const comment = {
      id: `${Date.now()}-${Math.random()}`,
      text: newComment.trim(),
      author: getCurrentUserDisplayName(),
      timestamp: new Date().toISOString(),
      bold: commentBold,
      italic: commentItalic,
      underline: commentUnderline
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    setNewComment("");
    setCommentBold(false);
    setCommentItalic(false);
    setCommentUnderline(false);
    localStorage.setItem(`quote_comments_${quoteId}`, JSON.stringify(updatedComments));

    setIsSavingComment(true);
    try {
      const commentsPayload = updatedComments.map((entry) => ({
        id: entry.id,
        text: entry.text,
        content: entry.text,
        author: entry.author || "User",
        timestamp: entry.timestamp,
        bold: Boolean(entry.bold),
        italic: Boolean(entry.italic),
        underline: Boolean(entry.underline)
      }));
      const updatedQuote = await updateQuote(quoteId, { comments: commentsPayload });
      setQuote(updatedQuote);
      const normalizedComments = Array.isArray(updatedQuote?.comments)
        ? (updatedQuote.comments as any[]).map((entry, index) => normalizeCommentFromQuote(entry, index))
        : updatedComments;
      setComments(normalizedComments);
      localStorage.setItem(`quote_comments_${quoteId}`, JSON.stringify(normalizedComments));
      await appendActivityLog("Comment Added", "A new comment was added.", "info");
      toast.success("Comment added.");
    } catch (error) {
      console.error("Error saving quote comment:", error);
      toast.error("Failed to save comment. Please try again.");
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleQuotePreferences = () => {
    setShowMoreDropdown(false);
    toast("Quote Preferences feature coming soon.");
  };

  const handleManageCustomFields = () => {
    setShowMoreDropdown(false);
    navigate("/settings/quotes/customfields");
  };

  // Sidebar More handlers
  const handleImportQuotes = () => {
    setShowSidebarMoreDropdown(false);
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
              // Import quotes logic
              const existingQuotes = await getQuotes();
              const importedQuotes = importedData.map((q, index) => ({
                ...q,
                id: `quote-${Date.now()}-${index}`,
                createdAt: new Date().toISOString()
              }));
              const allQuotes = [...existingQuotes, ...importedQuotes];
              localStorage.setItem('taban_books_quotes', JSON.stringify(allQuotes));
              // Reload quotes
              try {
                const quotes = await getQuotes();
                setAllQuotes(quotes);
                toast.success(`Successfully imported ${importedQuotes.length} quote(s).`);
                await appendActivityLog(
                  "Import Quotes",
                  `Imported ${importedQuotes.length} quote(s).`,
                  "success"
                );
              } catch (error) {
                console.error("Error reloading quotes after import:", error);
                setAllQuotes(allQuotes); // Fallback to local data
                toast.success(`Successfully imported ${importedQuotes.length} quote(s).`);
                await appendActivityLog(
                  "Import Quotes",
                  `Imported ${importedQuotes.length} quote(s).`,
                  "success"
                );
              }
            } else {
              toast.error("Invalid file format. Please upload a valid JSON file.");
            }
          } catch (error) {
            toast.error("Error importing quotes. Please check the file format.");
            console.error('Import error:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportQuotes = async () => {
    setShowSidebarMoreDropdown(false);
    try {
      const quotes = await getQuotes();
      const dataStr = JSON.stringify(quotes, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotes-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Quotes exported successfully.");
      await appendActivityLog("Export Quotes", "Quotes were exported as JSON.", "info");
    } catch (error) {
      console.error("Error exporting quotes:", error);
      toast.error("Failed to export quotes. Please try again.");
    }
  };

  const getInitial = (name: any) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  if (!quote && loading) {
    return (
      <div className="w-full h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-[#156372] border-t-transparent animate-spin" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Loading quote...</p>
              <p className="text-sm text-gray-500">Fetching the latest quote data.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2>Quote Not Found</h2>
        <p>The quote you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate("/sales/quotes")}
          className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
          onMouseEnter={(e: any) => e.target.style.opacity = "0.9"}
          onMouseLeave={(e: any) => e.target.style.opacity = "1"}
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  const quoteTotalsMeta = getQuoteTotalsMeta(quote);
  const filteredQuotesList = getFilteredQuotes();
  const quoteStatus = String(quote?.status || "").trim().toLowerCase();
  const isInvoicedStatus = quoteStatus === "invoiced" || quoteStatus === "converted";
  const isApprovedStatus = quoteStatus === "approved";
  const isExpiredStatus = quoteStatus === "expired";
  const isDraftStatus = quoteStatus === "draft";
  const isSentStatus = quoteStatus === "sent";
  const isAcceptedStatus = quoteStatus === "accepted";
  const isDeclinedStatus = quoteStatus === "declined" || quoteStatus === "rejected";
  const canEditAcceptedQuote = !isAcceptedStatus || allowEditingAcceptedQuotes;
  const isSimplifiedActionStatus = isInvoicedStatus;
  const statusRibbonConfig = (() => {
    if (isSentStatus) {
      return { label: "SENT", color: "#2F80FF" };
    }
    if (quoteStatus === "pending_approval") {
      return { label: "PENDING APPROVAL", color: "#8B5CF6" };
    }
    if (isApprovedStatus) {
      return { label: "APPROVED", color: "#4CB8D9" };
    }
    if (isAcceptedStatus) {
      return { label: "ACCEPTED", color: "#10B981" };
    }
    if (isDeclinedStatus) {
      return { label: "DECLINED", color: "#F59E0B" };
    }
    if (isInvoicedStatus) {
      return { label: "INVOICED", color: "#0D4A52" };
    }
    if (isExpiredStatus) {
      return { label: "EXPIRED", color: "#EF4444" };
    }
    return { label: "DRAFT", color: "#6B7280" };
  })();
  const hasPlanItems = (quote?.items || []).some((item: any) => {
    const entityType = String(item?.itemEntityType || item?.entityType || item?.item?.entityType || "").toLowerCase();
    const itemId = String(item?.itemId || item?.item?.id || item?.item?._id || item?.item || "").toLowerCase();
    return entityType === "plan" || itemId.startsWith("plan:");
  });

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          /* Hide all UI elements except the document */
          body > *:not(.print-content),
          .print-content ~ *,
          header,
          nav,
          aside,
          button:not(.print-content button),
          .sidebar,
          [class*="sidebar"],
          [class*="header"],
          [class*="Header"],
          [class*="action"],
          [class*="Action"],
          [class*="dropdown"],
          [class*="Dropdown"],
          [class*="menu"],
          [class*="Menu"] {
            display: none !important;
          }
          
          /* Show only the print content */
          .print-content {
            display: block !important;
            position: relative !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 210mm !important;
            min-height: 297mm !important;
            page-break-inside: avoid;
          }
          
          /* Ensure document is visible */
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Hide hover elements */
          .print-content:hover * {
            display: none !important;
          }
          
          /* Show customize button content but hide the button itself */
          .print-content button {
            display: none !important;
          }
        }
      `}</style>
      <div className="w-full h-[calc(100vh-4rem)] min-h-0 flex bg-white overflow-hidden">
        {/* Left Sidebar - Quote List */}
        <div className="w-[320px] lg:w-[320px] md:w-[270px] border-r border-gray-200 bg-white flex flex-col h-full min-h-0 overflow-hidden hidden md:flex">
          {/* Header with Filter or Bulk Actions */}
          {selectedQuotes.length > 0 ? (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={selectedQuotes.length === filteredQuotesList.length && filteredQuotesList.length > 0}
                  onChange={handleSelectAll}
                />
                <div className="relative">
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)}
                  >
                    <span>Bulk Actions</span>
                    <ChevronDown size={14} />
                  </button>

                  {isBulkActionsOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={handleBulkUpdate}
                      >
                        Bulk Update
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={handleExportPDF}
                      >
                        Export as PDF
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={handleBulkMarkAsSent}
                      >
                        Mark As Sent
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50"
                        onClick={handleBulkDelete}
                      >
                        Delete
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold text-white" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                  <span>{selectedQuotes.length}</span>
                  <span>Selected</span>
                </div>
                <button className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer" onClick={handleClearSelection}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 h-[74px] border-b border-gray-200">
              <div className="relative flex-1">
                <div
                  className="inline-flex items-center gap-1 text-[18px] font-semibold text-gray-900 cursor-pointer"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                >
                  <span>{selectedFilter}</span>
                  {isFilterDropdownOpen ? <ChevronUp size={16} className="text-[#156372]" /> : <ChevronDown size={16} className="text-[#156372]" />}
                </div>

                {isFilterDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    {filterOptions.map(option => (
                      <div
                        key={option}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${selectedFilter === option ? 'bg-[#e6f3f1] text-[#0D4A52]' : 'text-gray-700'}`}
                        onClick={() => {
                          setSelectedFilter(option);
                          setIsFilterDropdownOpen(false);
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <div className="relative">
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer border border-gray-200"
                    onClick={() => {
                      setShowSidebarMoreDropdown(!showSidebarMoreDropdown);
                      setIsFilterDropdownOpen(false);
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showSidebarMoreDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                      <div
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={handleImportQuotes}
                      >
                        <Download size={16} />
                        <span>Import Quotes</span>
                      </div>
                      <div
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={handleExportQuotes}
                      >
                        <FileUp size={16} />
                        <span>Export</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quotes List */}
          <div className="flex-1 overflow-y-auto">
            {filteredQuotesList.map(q => (
              <div
                key={q.id}
                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${q.id === quoteId ? 'bg-slate-100' : ''
                  } ${selectedQuotes.includes(q.id) ? 'bg-gray-100' : ''}`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={selectedQuotes.includes(q.id)}
                  onChange={() => handleSelectQuote(q.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  className="flex-1 min-w-0"
                  onClick={() => handleQuoteClick(q)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">{q.customerName || "Unknown Customer"}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(q.total, q.currency)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <span>{q.quoteNumber || q.id}</span>
                    <span>•</span>
                    <span>{formatDate(q.quoteDate)}</span>
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${(q.status || 'draft').toLowerCase() === 'draft' ? 'text-slate-600' :
                      (q.status || 'draft').toLowerCase() === 'sent' ? 'text-blue-800' :
                        (q.status || 'draft').toLowerCase() === 'open' ? 'text-[#0D4A52]' :
                          (q.status || 'draft').toLowerCase() === 'accepted' ? 'text-[#0D4A52]' :
                            ['declined', 'rejected'].includes((q.status || 'draft').toLowerCase()) ? 'text-red-800' :
                              (q.status || 'draft').toLowerCase() === 'expired' ? 'text-gray-800' :
                                'text-slate-600'
                      }`}>
                      {(q.status || "DRAFT").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredQuotesList.length === 0 && (
              <div className="flex items-center justify-center py-12 text-center text-gray-500">
                <p>No quotes found</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setShowMobileSidebar(false)} />
            <div className="fixed top-0 left-0 w-80 h-full bg-white shadow-xl z-50 md:hidden overflow-hidden">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Quotes</h2>
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                    onClick={() => setShowMobileSidebar(false)}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Mobile Filter */}
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <div
                      className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50"
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    >
                      <span className="text-sm text-gray-700">{selectedFilter}</span>
                      {isFilterDropdownOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>

                    {isFilterDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        {filterOptions.map(option => (
                          <div
                            key={option}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${selectedFilter === option ? 'bg-[#e6f3f1] text-[#0D4A52]' : 'text-gray-700'}`}
                            onClick={() => {
                              setSelectedFilter(option);
                              setIsFilterDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Quotes List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredQuotesList.map(q => (
                    <div
                      key={q.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${q.id === quoteId ? 'bg-slate-100' : ''
                        } ${selectedQuotes.includes(q.id) ? 'bg-gray-100' : ''}`}
                      onClick={() => {
                        handleQuoteClick(q);
                        setShowMobileSidebar(false);
                      }}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={selectedQuotes.includes(q.id)}
                        onChange={() => handleSelectQuote(q.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{q.customerName || "Unknown Customer"}</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(q.total, q.currency)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <span>{q.quoteNumber || q.id}</span>
                          <span>•</span>
                          <span>{formatDate(q.quoteDate)}</span>
                        </div>
                        <div>
                          <span className={`text-xs font-medium ${(q.status || 'draft').toLowerCase() === 'draft' ? 'text-slate-600' :
                            (q.status || 'draft').toLowerCase() === 'sent' ? 'text-blue-800' :
                              (q.status || 'draft').toLowerCase() === 'open' ? 'text-[#0D4A52]' :
                                (q.status || 'draft').toLowerCase() === 'accepted' ? 'text-[#0D4A52]' :
                                  ['declined', 'rejected'].includes((q.status || 'draft').toLowerCase()) ? 'text-red-800' :
                                    (q.status || 'draft').toLowerCase() === 'expired' ? 'text-gray-800' :
                                      'text-slate-600'
                            }`}>
                            {(q.status || "DRAFT").toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredQuotesList.length === 0 && (
                    <div className="flex items-center justify-center py-12 text-center text-gray-500">
                      <p>No quotes found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`flex items-center justify-between px-4 h-[74px] border-b border-gray-200 bg-white ${selectedQuotes.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <div className="text-sm text-gray-600 truncate">
                  Location: <span className="text-[#3b5ba9]">{quote.selectedLocation || quote.location || "Head Office"}</span>
                </div>
                <h1 className="text-lg md:text-[24px] leading-tight font-semibold text-gray-900 truncate">{quote.quoteNumber || quote.id}</h1>
              </div>
              {selectedQuotes.length > 0 && (
                <div className="text-sm text-gray-600 hidden md:block">
                  Selected positions: {selectedQuotes.map((quoteId, index) => {
                    const position = filteredQuotesList.findIndex(q => q.id === quoteId) + 1;
                    return position;
                  }).join(', ')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                onClick={() => {
                  setShowAttachmentsModal(true);
                  setShowCommentsSidebar(false);
                }}
                title="Attachments"
              >
                <span className="inline-flex items-center gap-1">
                  <Paperclip size={18} />
                  {quoteAttachments.length > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded border border-gray-300 bg-white text-[11px] font-semibold text-gray-700 leading-none">
                      {quoteAttachments.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                onClick={() => {
                  setShowCommentsSidebar(true);
                  setShowAttachmentsModal(false);
                }}
                title="Comments"
              >
                <MessageSquare size={18} />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer" onClick={handleClose}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 md:p-3 border-b border-gray-200 bg-[#f8fafc]">
            {canEditAcceptedQuote && !isSimplifiedActionStatus && (
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                onClick={handleEdit}
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
            )}

            <div className="relative quote-detail-dropdown-wrapper">
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                onClick={() => {
                  setShowMailDropdown(!showMailDropdown);
                  setShowPdfDropdown(false);
                  setShowMoreDropdown(false);
                  setShowConvertDropdown(false);
                }}
              >
                <Mail size={16} />
                <span>Mails</span>
                <ChevronDown size={14} />
              </button>
              {showMailDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px]">
                  <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleSendEmail}>
                    Send Quote Email
                  </div>
                </div>
              )}
            </div>

            <button className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]" onClick={handleShare}>
              <Share2 size={16} />
              <span>Share</span>
            </button>

            <button
              className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
              onClick={handleDownloadPDF}
            >
              <FileText size={16} />
              <span>{String(quote?.status || "draft").toLowerCase() === "draft" ? "PDF/Print" : "Download PDF"}</span>
              <ChevronDown size={14} />
            </button>

            {isDraftStatus && (
              <>
                <button
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                  onClick={handleSubmitForApproval}
                >
                  <RefreshCw size={16} />
                  <span>Submit for Approval</span>
                </button>
                {!hasPlanItems && (
                  <button
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                    onClick={handleConvertToInvoice}
                  >
                    <FileText size={16} />
                    <span>Convert to Invoice</span>
                  </button>
                )}
              </>
            )}

            {isInvoicedStatus && (
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                onClick={handleConvertToInvoice}
              >
                <FileText size={16} />
                <span>Convert to Invoice</span>
              </button>
            )}

            {!isSimplifiedActionStatus && hasPlanItems && (
              <button
                className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                onClick={handleCreateSubscription}
              >
                <span>Create a Subscription</span>
              </button>
            )}

            {isApprovedStatus && (
              <div className="relative quote-detail-dropdown-wrapper">
                {hasPlanItems ? (
                  <button
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                    onClick={handleCreateSubscription}
                  >
                    <span>Create a Subscription</span>
                  </button>
                ) : (
                  <>
                    <button
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-transparent text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:text-[#156372]"
                      onClick={() => {
                        setShowConvertDropdown(!showConvertDropdown);
                        setShowMailDropdown(false);
                        setShowPdfDropdown(false);
                        setShowMoreDropdown(false);
                      }}
                    >
                      <span>Convert</span>
                      <ChevronDown size={14} />
                    </button>
                    {showConvertDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[210px] p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowConvertDropdown(false);
                            handleConvertToInvoice();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-white bg-[#0D4A52] shadow-sm"
                        >
                          <FileText size={14} />
                          Convert to Invoice
                        </button>
                        <button
                          type="button"
                          onClick={handleConvertToDraft}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-50 mt-1"
                        >
                          <FileText size={14} />
                          Convert to Draft
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="relative quote-detail-dropdown-wrapper">
              <button
                className="p-1.5 bg-transparent text-gray-700 rounded-md cursor-pointer"
                onClick={() => {
                  setShowMoreDropdown(!showMoreDropdown);
                  setShowMailDropdown(false);
                  setShowPdfDropdown(false);
                  setShowConvertDropdown(false);
                }}
              >
                <MoreHorizontal size={16} />
              </button>
              {showMoreDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px] overflow-hidden">
                  {!isSimplifiedActionStatus && !isApprovedStatus && (
                    <>
                      <div
                        className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                          isExpiredStatus ? "text-gray-700 cursor-pointer" : "text-gray-700 cursor-pointer"
                        }`}
                        onClick={handleMarkAsAccepted}
                      >
                        <CheckCircle size={14} />
                        Mark as Accepted
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleMarkAsDeclined}>
                        <XCircle size={14} />
                        Mark as Declined
                      </div>
                      <div className="h-px bg-gray-100" />
                    </>
                  )}
                  {isApprovedStatus && (
                    <>
                      <div
                        className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowMoreDropdown(false);
                          handleMarkCurrentAsSent();
                        }}
                      >
                        <Mail size={14} />
                        Mark As Sent
                      </div>
                      <div className="h-px bg-gray-100" />
                    </>
                  )}
                  <div
                    className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                      isCloningQuote ? "text-gray-400 cursor-not-allowed" : "text-gray-700 cursor-pointer"
                    }`}
                    onClick={handleDuplicateQuote}
                  >
                    <Copy size={14} className={`${isCloningQuote ? "animate-spin" : ""}`} />
                    {isCloningQuote ? "Cloning..." : "Clone"}
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-50" onClick={handleDeleteQuote}>
                    <Trash2 size={14} />
                    Delete
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50" onClick={handleQuotePreferences}>
                    <Settings size={14} />
                    Quote Preferences
                  </div>
                </div>
              )}
            </div>
          </div>

          {String(quote?.status || "").toLowerCase() === "approved" && (
            <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
              <div className="mb-3 text-sm text-gray-700 flex items-center flex-wrap gap-2">
                <span>Approved by:</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-[#156372] to-[#0D4A52] text-white text-xs font-semibold">A</span>
                <span className="font-medium text-gray-900">{String((quote as any)?.approvedByName || (quote as any)?.approvedBy || "Admin")}</span>
                <span className="text-gray-400">•</span>
                <button type="button" className="text-[#0D4A52] hover:underline">View Approval Details</button>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 mb-4">
                <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
                <span className="text-sm text-gray-600">This quote has been approved. You can now email it to your customer or simply mark it as sent.</span>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3F46] text-white rounded-md text-sm font-semibold"
                  onClick={handleSendEmail}
                >
                  Send Quote
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium"
                  onClick={handleMarkCurrentAsSent}
                >
                  Mark As Sent
                </button>
              </div>
            </div>
          )}

          {isAcceptedStatus && (
            <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
                <span className="text-sm text-gray-600">Create an invoice for this quote to confirm the sale and bill your customer.</span>
                {hasPlanItems ? (
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3F46] text-white rounded-md text-sm font-semibold"
                    onClick={handleCreateSubscription}
                  >
                    Create Subscription
                  </button>
                ) : (
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3F46] text-white rounded-md text-sm font-semibold"
                    onClick={handleConvertToInvoice}
                  >
                    Convert to Invoice
                  </button>
                )}
                <button
                  type="button"
                  className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium"
                  onClick={handleCreateProject}
                >
                  Create Project
                </button>
              </div>
            </div>
          )}

          {isSentStatus && (
            <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
                <span className="text-sm text-gray-600">Create an invoice for this quote to confirm the sale and bill your customer.</span>
                {hasPlanItems ? (
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3F46] text-white rounded-md text-sm font-semibold"
                    onClick={handleCreateSubscription}
                  >
                    Create Subscription
                  </button>
                ) : (
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3F46] text-white rounded-md text-sm font-semibold"
                    onClick={handleConvertToInvoice}
                  >
                    Convert to Invoice
                  </button>
                )}
                <button
                  type="button"
                  className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium"
                  onClick={handleCreateProject}
                >
                  Create Project
                </button>
              </div>
            </div>
          )}

          {isInvoicedStatus && (
            <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
                <span className="text-sm text-gray-600">This quote has been invoiced. You can review the invoice details or create a project.</span>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3B41] text-white rounded-md text-sm font-semibold"
                  onClick={handleConvertToInvoice}
                >
                  Convert to Invoice
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium"
                  onClick={handleCreateProject}
                >
                  Create Project
                </button>
              </div>
            </div>
          )}

          {String(quote?.status || "draft").toLowerCase() === "draft" && (
            <div className="px-4 md:px-6 pt-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">WHAT'S NEXT?</span>
                <span className="text-sm text-gray-600">Go ahead and email this quote to your customer or simply mark it as sent.</span>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-[#0D4A52] hover:bg-[#0B3F46] text-white rounded-md text-sm font-semibold"
                  onClick={handleSendEmail}
                >
                  Send Quote
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-sm font-medium"
                  onClick={handleMarkCurrentAsSent}
                >
                  Mark As Sent
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-6 border-b border-gray-200 bg-white">
            <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${activeTab === "details"
                  ? "text-[#0D4A52] border-[#0D4A52]"
                  : "text-gray-600 border-transparent hover:text-[#0D4A52]"
                  }`}
                onClick={() => setActiveTab("details")}
              >
                Quote Details
              </button>
              {isInvoicedStatus && (
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${activeTab === "invoices"
                    ? "text-[#0D4A52] border-[#0D4A52]"
                    : "text-gray-600 border-transparent hover:text-[#0D4A52]"
                    }`}
                  onClick={() => setActiveTab("invoices")}
                >
                  Invoices
                </button>
              )}
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap ${activeTab === "activity"
                  ? "text-[#0D4A52] border-[#0D4A52]"
                  : "text-gray-600 border-transparent hover:text-[#0D4A52]"
                  }`}
                onClick={() => setActiveTab("activity")}
              >
                Activity Logs
              </button>
            </div>
            <div className="flex items-center gap-1 mt-2 md:mt-0">
              {/* View toggle removed: always showing PDF template */}
            </div>
          </div>
          {/* Quote Details Content */}
          {activeTab === "details" && (
            <div className="flex-1 p-2 md:p-3 bg-gray-50 overflow-y-auto">
              {showPdfView ? (
                /* PDF View - Document Style */
                (() => {
                  const config = activePdfTemplate?.config || {};
                  const hf = config.headerFooter || {};
                  const labels = hf.labels || {};
                  const txFields = config.transactionDetails?.fields || {};
                  const totalLabels = config.total?.labels || {};
                  const table = config.table || {};
                  
                   const total = config.total || {};
                  
                  const labelFor = (obj: any, key: string, fallback: string) => (typeof obj?.[key] === "string" ? obj[key] : obj?.[key]?.label || fallback);
                  const isVisible = (obj: any, key: string, fallback = true) => {
                    if (!obj || obj[key] === undefined) return fallback;
                    if (typeof obj[key] === "boolean") return obj[key];
                    if (typeof obj[key]?.visible === "boolean") return obj[key].visible;
                    return fallback;
                  };

                  const fmt = (val: number) => {
                    const s = Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const symbol = quote.currency || "SOS";
                    return total.currencyPosition === "after" ? `${s} ${symbol}` : `${symbol} ${s}`;
                  };

                  return (
                    <div
                      className="w-full max-w-[920px] mx-auto border border-[#d1d5db] shadow-sm overflow-hidden print-content"
                      data-print-content
                      style={{ 
                        width: "210mm", 
                        maxWidth: "210mm", 
                        minHeight: "297mm", 
                        position: "relative",
                        backgroundColor: config.general?.backgroundColor || "#ffffff",
                        color: config.general?.fontColor || "#000000",
                        fontFamily: config.general?.fontFamily || "Helvetica, Arial, sans-serif",
                        fontSize: `${config.general?.fontSize || 9}pt`,
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      {/* Header Bar */}
                      {(hf.headerBgColor || hf.bgImage) && (
                        <div style={{ backgroundColor: hf.headerBgColor || "transparent", height: "40px", flexShrink: 0, width: "100%", position: "relative" }}>
                          {hf.bgImage && <img src={hf.bgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                      )}

                      <div style={{ 
                        padding: `${(hf.headerBgColor || hf.bgImage) ? "0.2in" : (config.general?.margins?.top || 0.7) + "in"} ${config.general?.margins?.right || 0.4}in ${(hf.footerBgColor || hf.footerBgImage || hf.showPageNumber !== false) ? "0.2in" : (config.general?.margins?.bottom || 0.7) + "in"} ${config.general?.margins?.left || 0.55}in`,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column"
                      }}>
                        {/* Status Ribbon (Internal Preview Only) */}
                        <div style={{
                          position: "absolute",
                          top: "0",
                          left: "0",
                          width: "200px",
                          height: "200px",
                          overflow: "hidden",
                          zIndex: 10,
                          pointerEvents: "none"
                        }}>
                          <div style={{
                            position: "absolute",
                            top: "40px",
                            left: "-60px",
                            width: "200px",
                            height: "30px",
                            backgroundColor: statusRibbonConfig.color,
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            transform: "rotate(-45deg)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                          }}>
                            {statusRibbonConfig.label}
                          </div>
                        </div>

                  const fmt = (val: number) => {
                    const s = Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const symbol = quote.currency || "SOS";
                    return total.currencyPosition === "after" ? `${s} ${symbol}` : `${symbol} ${s}`;
                  };

                  return (
                    <div
                      className="w-full max-w-[920px] mx-auto border border-[#d1d5db] shadow-sm overflow-hidden print-content"
                      data-print-content
                      style={{ 
                        width: "210mm", 
                        maxWidth: "210mm", 
                        minHeight: "297mm", 
                        position: "relative",
                        backgroundColor: config.general?.backgroundColor || "#ffffff",
                        color: config.general?.fontColor || "#000000",
                        fontFamily: config.general?.fontFamily || "Helvetica, Arial, sans-serif",
                        fontSize: `${config.general?.fontSize || 9}pt`,
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      {/* Header Bar */}
                      {(hf.headerBgColor || hf.bgImage) && (
                        <div style={{ backgroundColor: hf.headerBgColor || "transparent", height: "40px", flexShrink: 0, width: "100%", position: "relative" }}>
                          {hf.bgImage && <img src={hf.bgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                      )}

                      <div style={{ 
                        padding: `${(hf.headerBgColor || hf.bgImage) ? "0.2in" : (config.general?.margins?.top || 0.7) + "in"} ${config.general?.margins?.right || 0.4}in ${(hf.footerBgColor || hf.footerBgImage || hf.showPageNumber !== false) ? "0.2in" : (config.general?.margins?.bottom || 0.7) + "in"} ${config.general?.margins?.left || 0.55}in`,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column"
                      }}>
                        {/* Status Ribbon (Internal Preview Only) */}
                        <div style={{
                          position: "absolute",
                          top: "0",
                          left: "0",
                          width: "200px",
                          height: "200px",
                          overflow: "hidden",
                          zIndex: 10,
                          pointerEvents: "none"
                        }}>
                          <div style={{
                            position: "absolute",
                            top: "40px",
                            left: "-60px",
                            width: "200px",
                            height: "30px",
                            backgroundColor: statusRibbonConfig.color,
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            transform: "rotate(-45deg)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                          }}>
                            {statusRibbonConfig.label}
                          </div>
                        </div>

                        {/* Header with Company Info */}
                        {(() => {
                          const details = config.transactionDetails || {};
                          return (
                            <div className="flex items-start justify-between mb-6 pb-5" style={{ position: "relative", borderBottom: `1px solid ${activeTheme.accent}33` }}>
                              <div style={{ maxWidth: "46%" }}>
                                {isVisible(details, "showOrgLogo") && (details.orgLogo || organizationProfile?.logo) && (
                                  <div className="mb-4 h-12 w-32 overflow-hidden flex items-center justify-center bg-gray-50 rounded border border-gray-100">
                                    <img src={details.orgLogo || organizationProfile?.logo} alt="Org Logo" className="max-h-full max-w-full object-contain" />
                                  </div>
                                )}
                                {isVisible(details, "showOrgName") && (
                                  <div style={{ 
                                    fontSize: `${details.orgNameFontSize || 16}pt`, 
                                    fontWeight: "700", 
                                    color: details.orgNameColor || config.general?.labelColor || activeTheme.accent, 
                                    marginBottom: "3px" 
                                  }}>
                                    {organizationProfile?.name || "Organization Name"}
                                  </div>
                                )}
                                {isVisible(details, "showOrgAddress") && (
                                  <div style={{ fontSize: "11px", color: config.general?.labelColor || "#4b5563", lineHeight: "1.45" }}>
                                    {organizationProfile?.address?.street1 && <>{organizationProfile.address.street1}<br /></>}
                                    {organizationProfile?.address?.street2 && <>{organizationProfile.address.street2}<br /></>}
                                    {(organizationProfile?.address?.city || organizationProfile?.address?.zipCode || organizationProfile?.address?.state) && (
                                      <>
                                        {organizationProfile.address.city || ""}
                                        {organizationProfile.address.zipCode ? ` ${organizationProfile.address.zipCode}` : ""}
                                        {organizationProfile.address.state ? `, ${organizationProfile.address.state}` : ""}
                                        <br />
                                      </>
                                    )}
                                    {organizationProfile?.address?.country && (
                                      <>
                                        {organizationProfile.address.country}
                                        <br />
                                      </>
                                    )}
                                    {ownerEmail?.email || organizationProfile?.email || ""}
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: "right", marginTop: "2px" }}>
                                {isVisible(hf, "showDocumentTitle") && (
                                  <div style={{ 
                                    fontSize: `${hf.titleFontSize || 32}pt`, 
                                    lineHeight: "1.1", 
                                    fontWeight: "300", 
                                    textTransform: "uppercase", 
                                    letterSpacing: "1px",
                                    color: hf.titleFontColor || "#111827" 
                                  }}>
                                    {isVisible(labels, "docTitle") ? labelFor(labels, "docTitle", "Quote") : "Quote"}
                                  </div>
                                )}
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>
                                  {labelFor(labels, "numberField", "#")} {quote.quoteNumber || "17"}
                                </div>
                                {(hf.phoneLabel || hf.faxLabel) && (
                                  <div style={{ fontSize: "11px", color: config.general?.labelColor || "#6b7280", marginTop: "8px" }}>
                                    {hf.phoneLabel && <div>{hf.phoneLabel}: {organizationProfile?.phone || "000-000-0000"}</div>}
                                    {hf.faxLabel && <div>{hf.faxLabel}: {organizationProfile?.fax || "000-000-0000"}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Bill To and Info Grid Row */}
                        {(() => {
                          const details = config.transactionDetails || {};
                          return (
                            <div style={{ marginBottom: "32px" }}>
                              <div className="flex justify-between items-baseline" style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "8px", marginBottom: "12px" }}>
                                <div style={{ fontSize: "14px", color: "#111827", fontWeight: "600" }}>
                                  {labelFor(labels, "billToField", "Bill To")}
                                </div>
                                <div className="flex items-center gap-4">
                                  <span style={{ color: "#d1d5db" }}>:</span>
                                  <div style={{ fontSize: "13px", color: "#111827", fontWeight: "400" }}>
                                    {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div style={{ 
                                    fontSize: `${details.custNameFontSize || 14}pt`, 
                                    color: details.custNameColor || "#2563eb", 
                                    fontWeight: "600", 
                                    lineHeight: "1.2",
                                    marginBottom: "4px"
                                  }}>{quote.customerName || "N/A"}</div>
                                  <div style={{ fontSize: "11px", color: "#4b5563", maxWidth: "400px", lineHeight: "1.5" }}>{quote.billingAddress || ""}</div>
                                </div>
                                <div className="text-right">
                                  {isVisible(labels, "expiryDate") && quote.expiryDate && (
                                    <div className="flex items-center justify-end gap-2 text-[12px] text-gray-500">
                                      <span>Expiry Date:</span>
                                      <span className="font-medium text-gray-900">{new Date(quote.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                    </div>
                                  )}
                                  {isVisible(labels, "referenceField") && quote.referenceNumber && (
                                    <div className="flex items-center justify-end gap-2 text-[12px] text-gray-500 mt-1">
                                      <span>Reference#:</span>
                                      <span className="font-medium text-gray-900">{quote.referenceNumber}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      {/* Items Table */}
                      <div className="mb-6">
                        <table style={{ 
                          width: "100%", 
                          borderCollapse: "collapse",
                          border: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                        }}>
                          <thead>
                            <tr style={{ 
                              backgroundColor: table.showHeaderBg !== false ? (table.headerBgColor || activeTheme.headerBg || "#3c3d3a") : "transparent",
                              borderBottom: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                            }}>
                              {isVisible(table.labels, "lineNumber") && (
                                <th style={{ 
                                  padding: "9px 12px", 
                                  textAlign: "center", 
                                  color: table.headerFontColor || activeTheme.headerText || "white", 
                                  fontSize: `${table.headerFontSize || 11}pt`, 
                                  fontWeight: "600", 
                                  width: `${table.labels?.lineNumber?.width || 5}%`,
                                  borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                }}>{labelFor(table.labels, "lineNumber", "#")}</th>
                              )}
                              {isVisible(table.labels, "item") && (
                                <th style={{ 
                                  padding: "9px 12px", 
                                  textAlign: "left", 
                                  color: table.headerFontColor || activeTheme.headerText || "white", 
                                  fontSize: `${table.headerFontSize || 11}pt`, 
                                  fontWeight: "600",
                                  width: `${table.labels?.item?.width || 30}%`,
                                  borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                }}>
                                  {labelFor(table.labels, "item", "Item")}
                                </th>
                              )}
                              {isVisible(table.labels, "quantity") && (
                                <th style={{ 
                                  padding: "9px 12px", 
                                  textAlign: "right", 
                                  color: table.headerFontColor || activeTheme.headerText || "white", 
                                  fontSize: `${table.headerFontSize || 11}pt`, 
                                  fontWeight: "600", 
                                  width: `${table.labels?.quantity?.width || 11}%`,
                                  borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                }}>
                                  {labelFor(table.labels, "quantity", "Qty")}
                                </th>
                              )}
                              {isVisible(table.labels, "rate") && (
                                <th style={{ 
                                  padding: "9px 12px", 
                                  textAlign: "right", 
                                  color: table.headerFontColor || activeTheme.headerText || "white", 
                                  fontSize: `${table.headerFontSize || 11}pt`, 
                                  fontWeight: "600", 
                                  width: `${table.labels?.rate?.width || 11}%`,
                                  borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                }}>
                                  {labelFor(table.labels, "rate", "Rate")}
                                </th>
                              )}
                              {isVisible(table.labels, "taxPercent") && (
                                <th style={{ 
                                  padding: "9px 12px", 
                                  textAlign: "right", 
                                  color: table.headerFontColor || activeTheme.headerText || "white", 
                                  fontSize: `${table.headerFontSize || 11}pt`, 
                                  fontWeight: "600", 
                                  width: `${table.labels?.taxPercent?.width || 11}%`,
                                  borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                }}>
                                  {labelFor(table.labels, "taxPercent", "VAT %")}
                                </th>
                              )}
                              {isVisible(table.labels, "amount") && (
                                <th style={{ 
                                  padding: "9px 12px", 
                                  textAlign: "right", 
                                  color: table.headerFontColor || activeTheme.headerText || "white", 
                                  fontSize: `${table.headerFontSize || 11}pt`, 
                                  fontWeight: "600", 
                                  width: `${table.labels?.amount?.width || 15}%`
                                }}>
                                  {labelFor(table.labels, "amount", "Amount")}
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {quote.items && quote.items.length > 0 ? (
                              quote.items.map((item: any, index: number) => (
                                <tr key={item.id || index} style={{ 
                                  borderBottom: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : `1px solid #d1d5db`, 
                                  backgroundColor: table.showRowBg !== false ? (index % 2 === 0 ? "transparent" : (table.rowBgColor || `${activeTheme.accent}0a`)) : "transparent"
                                }}>
                                  {isVisible(table.labels, "lineNumber") && (
                                    <td style={{ 
                                      padding: "9px 12px", 
                                      fontSize: `${table.rowFontSize || 11}pt`, 
                                      color: table.rowFontColor || config.general?.fontColor || "#111827", 
                                      textAlign: "center", 
                                      verticalAlign: "top",
                                      borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                    }}>{index + 1}</td>
                                  )}
                                  {isVisible(table.labels, "item") && (
                                    <td style={{ 
                                      padding: "9px 12px", 
                                      fontSize: `${table.rowFontSize || 11}pt`, 
                                      color: table.rowFontColor || config.general?.fontColor || "#111827", 
                                      verticalAlign: "top",
                                      borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                    }}>
                                      <div>
                                        <strong style={{ fontWeight: "600", color: table.rowFontColor || config.general?.fontColor || "#111827" }}>{item.name || item.item?.name || "N/A"}</strong>
                                        {isVisible(table.labels, "description") && item.description && (
                                          <div style={{ 
                                            fontSize: `${table.descFontSize || 10}pt`, 
                                            color: table.descFontColor || config.general?.labelColor || "#6b7280", 
                                            marginTop: "2px" 
                                          }}>
                                            {item.description}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  {isVisible(table.labels, "quantity") && (
                                    <td style={{ 
                                      padding: "9px 12px", 
                                      fontSize: `${table.rowFontSize || 11}pt`, 
                                      color: table.rowFontColor || config.general?.fontColor || "#111827", 
                                      textAlign: "right", 
                                      verticalAlign: "top",
                                      borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                    }}>
                                      <div>{Number(item.quantity || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                      {table.showUnit !== false && (
                                        <div style={{ fontSize: "10px", color: config.general?.labelColor || "#6b7280", marginTop: "2px" }}>{item.item?.unit || item.unit || "pcs"}</div>
                                      )}
                                    </td>
                                  )}
                                  {isVisible(table.labels, "rate") && (
                                    <td style={{ 
                                      padding: "9px 12px", 
                                      fontSize: `${table.rowFontSize || 11}pt`, 
                                      color: table.rowFontColor || config.general?.fontColor || "#111827", 
                                      textAlign: "right", 
                                      verticalAlign: "top",
                                      borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                    }}>
                                      {Number(item.unitPrice || item.rate || item.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  )}
                                  {isVisible(table.labels, "taxPercent") && (
                                    <td style={{ 
                                      padding: "9px 12px", 
                                      fontSize: `${table.rowFontSize || 11}pt`, 
                                      color: table.rowFontColor || config.general?.fontColor || "#111827", 
                                      textAlign: "right", 
                                      verticalAlign: "top",
                                      borderRight: table.showBorder !== false ? `1px solid ${table.borderColor || "#adadad"}` : "none"
                                    }}>
                                      {item.tax?.rate || 0}%
                                    </td>
                                  )}
                                  {isVisible(table.labels, "amount") && (
                                    <td style={{ 
                                      padding: "9px 12px", 
                                      fontSize: `${table.rowFontSize || 11}pt`, 
                                      color: table.rowFontColor || config.general?.fontColor || "#111827", 
                                      textAlign: "right", 
                                      verticalAlign: "top" 
                                    }}>
                                      {Number(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price || 0))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  )}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: config.general?.labelColor || "#666", fontSize: "14px" }}>
                                  No items added
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals Section */}
                      {total.showSection !== false && (
                        <div className="flex justify-end mb-7">
                          <div style={{ 
                            width: "360px", 
                            backgroundColor: total.showBg !== false ? (total.bgColor || "#ffffff") : "transparent",
                            padding: "20px", 
                            borderRadius: "12px",
                            fontSize: `${total.fontSize || 11}pt`,
                            color: total.fontColor || "#374151",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                          }}>
                            {isVisible(total.labels, "subTotal") && (
                              <div className="flex justify-between py-2 items-center">
                                <span className="font-semibold text-gray-900">{labelFor(total.labels, "subTotal", "Sub Total")}</span>
                                <span className="font-medium">{fmt(quoteTotalsMeta.subTotal || 0)}</span>
                              </div>
                            )}
                            
                            {total.showTaxDetails !== false && (
                              <div className="flex justify-between py-1.5 items-center text-sm text-gray-500">
                                <span>{quoteTotalsMeta.taxLabel || "Tax (Included)"}</span>
                                <span>{fmt(quoteTotalsMeta.taxAmount || 0)}</span>
                              </div>
                            )}

                            {isVisible(total.labels, "shipping") && (
                              <div className="flex justify-between py-1.5 items-center text-sm text-gray-500">
                                <span>{labelFor(total.labels, "shipping", "Shipping charge")}</span>
                                <span>{fmt(quote.shippingCharges || 0)}</span>
                              </div>
                            )}

                            {isVisible(total.labels, "shippingTax") && (
                              <div className="flex justify-between py-1.5 items-center text-sm text-gray-500">
                                <span>{labelFor(total.labels, "shippingTax", "Shipping Tax")}</span>
                                <span>{fmt(quoteTotalsMeta.shippingTaxAmount || 0)}</span>
                              </div>
                            )}

                            {isVisible(total.labels, "adjustment") && (
                              <div className="flex justify-between py-1.5 items-center text-sm text-gray-500">
                                <span>{labelFor(total.labels, "adjustment", "Adjustment")}</span>
                                <span>{fmt(quoteTotalsMeta.adjustment || 0)}</span>
                              </div>
                            )}

                            {isVisible(total.labels, "roundOff") && (
                              <div className="flex justify-between py-1.5 items-center text-sm text-gray-500">
                                <span>{labelFor(total.labels, "roundOff", "Round Off")}</span>
                                <span>{fmt(quoteTotalsMeta.roundOff || 0)}</span>
                              </div>
                            )}

                            {total.showQuantity && (
                              <div className="flex justify-between py-1.5 items-center text-sm text-gray-500 border-t border-gray-100 mt-2 pt-2">
                                <span>Total Quantity</span>
                                <span>{quote.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            {isVisible(total.labels, "total") && (
                              <div className="flex justify-between items-center py-3 px-4 mt-4 font-bold rounded-lg" style={{ 
                                backgroundColor: total.showBalanceBg !== false ? (total.balanceBgColor || "#f9fafb") : "#f9fafb",
                                fontSize: `${(total.fontSize || 12) + 2}pt`,
                                color: total.fontColor || "#111827" 
                              }}>
                                <span>{labelFor(total.labels, "total", "Total")}</span>
                                <span>{fmt(quoteTotalsMeta.total || 0)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {total.showAmountInWords && (
                        <div className="mb-8" style={{ fontSize: "11px", color: "#6b7280" }}>
                          <span className="font-semibold" style={{ color: "#374151" }}>Total In Words: </span>
                          {quoteTotalsMeta.totalInWords || "N/A"}
                        </div>
                      )}

                      {/* Notes Section */}
                      <div style={{ marginBottom: "28px", borderTop: `1px dashed ${activeTheme.accent}33`, paddingTop: "10px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: config.general?.labelColor || activeTheme.accent, marginBottom: "6px", letterSpacing: "0.2px" }}>
                          Notes
                        </div>
                        <div style={{ fontSize: "11px", color: config.general?.fontColor || "#4b5563", lineHeight: "1.5" }}>
                          {quote.customerNotes || "Looking forward for your business."}
                        </div>
                      </div>

                      {/* Footer Bar */}
                      {(hf.footerBgColor || hf.footerBgImage || hf.showPageNumber !== false) && (
                        <div style={{ backgroundColor: hf.footerBgColor || "transparent", height: "40px", flexShrink: 0, width: "100%", position: "relative", marginTop: "auto" }}>
                          {hf.footerBgImage && <img src={hf.footerBgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                          {hf.showPageNumber !== false && (
                            <div style={{ 
                              position: "absolute", 
                              bottom: "10px", 
                              right: hf.pageNumberPosition === "Right" ? "20px" : "auto",
                              left: hf.pageNumberPosition === "Left" ? "20px" : "auto",
                              color: (hf.footerBgColor || hf.footerBgImage) ? "white" : (hf.footerFontColor || "#6C718A"), 
                              fontSize: "10pt" 
                            }}>
                              1
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
                /* Regular Detail View */
                <div>
                  {/* Quote Header Info */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
                      {quote.quoteNumber || quote.id}
                      {getStatusBadge(quote.status)}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Total : <span className="text-lg font-semibold text-gray-900">{formatCurrency(quote.total, quote.currency)}</span>
                    </p>
                  </div>

                  {/* Quote Information Grid */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quote Number</span>
                        <span className="text-sm text-gray-900">{quote.quoteNumber || quote.id}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quote Date</span>
                        <span className="text-sm text-gray-900">{formatDate(quote.quoteDate)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Creation Date</span>
                        <span className="text-sm text-gray-900">{formatDate(quote.createdAt)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Salesperson</span>
                        <span className="flex items-center gap-2 text-sm text-gray-900">
                          {quote.salesperson ? (
                            <>
                              <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: "#f97316" }}>
                                {getInitial(quote.salesperson)}
                              </span>
                              {quote.salesperson}
                            </>
                          ) : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expiry Date</span>
                        <span className="text-sm text-gray-900">{formatDate(quote.expiryDate)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reference Number</span>
                        <span className="text-sm text-gray-900">{quote.referenceNumber || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Project</span>
                        <span className="text-sm text-gray-900 project-link">{quote.projectName || "-"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">PDF Template</span>
                        <span className="text-sm text-gray-900 template">
                          Standard Template
                          <span className="mr-2 text-gray-500">âš™</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subject</span>
                        <span className="text-sm text-gray-900">{quote.subject || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details Section */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Customer Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</span>
                          <span className="text-sm text-gray-900">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-semibold mr-2" style={{ backgroundColor: "#2563eb" }}>
                              {getInitial(quote.customerName)}
                            </span>
                            {quote.customerName || "-"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Billing Address</span>
                          <span className="text-sm text-gray-900">{quote.billingAddress || "-"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shipping Address</span>
                          <span className="text-sm text-gray-900">{quote.shippingAddress || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Items
                      <span className="ml-2 text-gray-700 text-xs font-medium">{quote.items?.length || 0}</span>
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th>S.NO</th>
                            <th>ITEM</th>
                            <th>QTY</th>
                            <th>PRICE</th>
                            <th>AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quote.items && quote.items.length > 0 ? (
                            quote.items.map((item: any, index: number) => (
                              <tr key={item.id || index}>
                                <td className="py-3 px-4 text-gray-900 text-center">{index + 1}</td>
                                <td className="py-3 px-4 text-gray-900">
                                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-md mr-3 flex-shrink-0">
                                    {item.image ? (
                                      <img src={item.image} alt={item.name} className="item-image" />
                                    ) : (
                                      <div className="text-gray-400">
                                        <Square size={24} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-gray-900">{item.name || item.item?.name}</span>
                                    <span className="text-xs text-gray-600">{item.description}</span>
                                    {item.item?.sku && <span className="text-xs text-gray-500">SKU: {item.item.sku}</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-gray-900">
                                  {item.quantity}
                                  {item.item?.unit && <span className="text-xs text-gray-500 ml-1">{item.item.unit}</span>}
                                </td>
                                <td className="py-3 px-4 text-gray-900 text-right">{formatCurrency(item.unitPrice || item.rate || item.price, quote.currency)}</td>
                                <td className="py-3 px-4 text-gray-900 text-right font-medium">{formatCurrency(item.total || item.amount || (item.quantity * (item.unitPrice || item.rate || item.price)), quote.currency)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-8 px-4 text-center text-sm text-gray-500">No items added</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="flex flex-col items-end gap-2 mt-4">
                      <div className="flex items-center justify-between w-64 py-2">
                        <span className="text-sm text-gray-600">Sub Total</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(quoteTotalsMeta.subTotal, quote.currency)}</span>
                      </div>
                      <div className="w-64 text-xs text-gray-500 -mt-2 mb-1">
                        ({quoteTotalsMeta.taxExclusive})
                      </div>
                      {quoteTotalsMeta.discount > 0 && (
                        <>
                          <div className="flex items-center justify-between w-64 py-2">
                            <span className="text-sm text-gray-600">{quoteTotalsMeta.discountLabel}</span>
                            <span className="text-sm font-medium text-gray-900">(-) {formatCurrency(quoteTotalsMeta.discount, quote.currency)}</span>
                          </div>
                          <div className="w-64 text-xs text-gray-500 -mt-2 mb-1">
                            (Applied on {formatCurrency(quoteTotalsMeta.discountBase, quote.currency)})
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between w-64 py-2">
                        <span className="text-sm text-gray-600">{quoteTotalsMeta.taxLabel}</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(quoteTotalsMeta.taxAmount, quote.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between w-64 py-2">
                        <span className="text-sm text-gray-600">Shipping charge</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(quoteTotalsMeta.shippingCharges, quote.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between w-64 py-2">
                        <span className="text-sm text-gray-600">{quoteTotalsMeta.shippingTaxLabel}</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(quoteTotalsMeta.shippingTaxAmount, quote.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between w-64 py-2">
                        <span className="text-sm text-gray-600">Adjustment</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(quoteTotalsMeta.adjustment, quote.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between w-64 py-2">
                        <span className="text-sm text-gray-600">Round Off</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(quoteTotalsMeta.roundOff, quote.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between w-64 py-2 px-3 bg-gray-100 total-row">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="text-sm font-medium text-gray-900 text-lg font-bold">{formatCurrency(quoteTotalsMeta.total, quote.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {quote.customerNotes || "Looking forward for your business."}
                    </p>
                  </div>

                  {/* Email Recipients Section */}
                  {quote.customerEmail && (
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Email Recipients</h3>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: "#ef4444" }}>
                          {quote.customerEmail.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-700">{quote.customerEmail}</span>
                      </div>
                    </div>
                  )}

                  {/* Terms and Conditions Section */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Terms and Conditions</h3>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {quote.termsAndConditions ? (
                        <p>{quote.termsAndConditions}</p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No Terms and Conditions</p>
                      )}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50">
                      <ChevronLeft size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50">
              <div className="w-full">
                {renderLinkedInvoicesTable()}
              </div>
            </div>
          )}

          {activeTab === "retainerInvoices" && (
            <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50">
              <div className="w-full max-w-4xl mx-auto bg-white shadow-lg border border-gray-200 rounded-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Retainer Invoices</h3>
                <p className="text-sm text-gray-600">No retainer invoices found for this quote.</p>
              </div>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === "activity" && (
            <div className="flex-1 overflow-y-auto p-6">
              {activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <Clock size={48} />
                  <p>No activity logs yet</p>
                </div>
              ) : (
                <div className="w-full max-w-4xl mx-auto bg-white border border-gray-200 rounded-md overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                    Activity Logs
                  </div>
                  <div className="divide-y divide-gray-100">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-gray-900">{log.action}</div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{log.description}</div>
                        <div className="text-xs text-gray-500 mt-1">By {log.actor}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Bulk Update Modal */}
        {isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setIsBulkUpdateModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Bulk Update Quotes</h2>
                <button className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer" onClick={() => setIsBulkUpdateModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Choose a field from the dropdown and update with new information.
                </p>

                <div className="flex flex-col gap-4 mb-6">
                  <div className="relative">
                    <button
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm cursor-pointer hover:bg-gray-50"
                      onClick={() => setIsBulkFieldDropdownOpen(!isBulkFieldDropdownOpen)}
                    >
                      <span>{bulkUpdateField ? bulkUpdateFields.find(f => f.value === bulkUpdateField)?.label : "Select a field"}</span>
                      <ChevronDown size={16} />
                    </button>
                    {isBulkFieldDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search"
                            className="flex-1 outline-none text-sm"
                            value={bulkFieldSearch}
                            onChange={(e) => setBulkFieldSearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredBulkFields.map(field => (
                            <div
                              key={field.value}
                              className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${bulkUpdateField === field.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                              onClick={() => {
                                setBulkUpdateField(field.value);
                                setBulkUpdateValue("");
                                setIsBulkFieldDropdownOpen(false);
                                setBulkFieldSearch("");
                              }}
                            >
                              {field.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    {bulkUpdateField === "quoteDate" || bulkUpdateField === "expiryDate" ? (
                      <input
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={bulkUpdateValue}
                        onChange={(e) => setBulkUpdateValue(e.target.value)}
                      />
                    ) : bulkUpdateField === "paymentTerms" ? (
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={bulkUpdateValue}
                        onChange={(e) => setBulkUpdateValue(e.target.value)}
                      >
                        <option value="">Select Payment Terms</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 45">Net 45</option>
                        <option value="Net 60">Net 60</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Due on Due Date">Due on Due Date</option>
                      </select>
                    ) : bulkUpdateField === "pdfTemplate" ? (
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={bulkUpdateValue}
                        onChange={(e) => setBulkUpdateValue(e.target.value)}
                      >
                        <option value="">Select Template</option>
                        <option value="Standard Template">Standard Template</option>
                        <option value="Professional Template">Professional Template</option>
                        <option value="Modern Template">Modern Template</option>
                      </select>
                    ) : bulkUpdateField === "customerNotes" || bulkUpdateField === "termsAndConditions" ||
                      bulkUpdateField === "billingAddress" || bulkUpdateField === "shippingAddress" ||
                      bulkUpdateField === "billingAndShippingAddress" ? (
                      <textarea
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={bulkUpdateValue}
                        onChange={(e) => setBulkUpdateValue(e.target.value)}
                        placeholder=""
                        rows={3}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={bulkUpdateValue}
                        onChange={(e) => setBulkUpdateValue(e.target.value)}
                        placeholder=""
                      />
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  <strong>Note:</strong> All the selected quotes will be updated with the new information and you cannot undo this action.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  style={{ background: (!bulkUpdateField || !bulkUpdateValue) ? "#9ca3af" : "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: any) => { if (bulkUpdateField && bulkUpdateValue) e.target.style.opacity = "0.9" }}
                  onMouseLeave={(e: any) => { if (bulkUpdateField && bulkUpdateValue) e.target.style.opacity = "1" }}
                  onClick={handleBulkUpdateSubmit}
                  disabled={!bulkUpdateField || !bulkUpdateValue}
                >
                  Update
                </button>
                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50" onClick={() => {
                  setIsBulkUpdateModalOpen(false);
                  setBulkUpdateField("");
                  setBulkUpdateValue("");
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mark As Sent Confirmation Modal */}
        {isMarkAsSentModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsMarkAsSentModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center shadow-lg">
                    <Send size={32} className="text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 text-center">Mark Quotes as Sent</h3>
                <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
                  Are you sure you want to mark the selected quote(s) as sent? This will change their status to "Sent".
                </p>
                <p className="text-xs sm:text-sm text-gray-500 text-center mb-6">
                  The Quote(s) that are marked as sent will be displayed in the respective contacts' Customer Portal (if enabled).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMarkAsSentModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="w-full sm:w-auto px-6 py-2.5 text-white rounded-md text-sm font-medium cursor-pointer hover:opacity-90 transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: any) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e: any) => e.target.style.opacity = "1"}
                  onClick={handleConfirmMarkAsSent}
                >
                  Mark as Sent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[2100] flex items-start justify-center bg-black/40 pt-16" onClick={() => setIsDeleteModalOpen(false)}>
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[12px] font-bold">
                  !
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800 flex-1">
                  Delete {selectedQuotes.length} quote{selectedQuotes.length === 1 ? "" : "s"}?
                </h3>
                <button
                  type="button"
                  className="h-7 w-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setIsDeleteModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-3 text-[13px] text-slate-600">
                You cannot retrieve this quote once it has been deleted.
              </div>
              <div className="flex items-center justify-start gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-md bg-[#156372] text-white text-[12px] hover:bg-[#0D4A52]"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-md border border-slate-300 text-[12px] text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && quote && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEmailModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
              ref={emailModalRef}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Email To {quote.customerName || "Customer"}
                </h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                  onClick={() => setShowEmailModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* From Field */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    From
                    <HelpCircle size={14} className="text-gray-500 cursor-help" />
                  </label>
                  <input
                    type="text"
                    value={emailData.from}
                    onChange={(e) => setEmailData({ ...emailData, from: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Send To Field */}
                <div className="mb-5">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Send To</label>
                      <input
                        type="text"
                        value={emailData.sendTo}
                        onChange={(e) => setEmailData({ ...emailData, sendTo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="flex gap-2 pb-2">
                      <button
                        className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                        onClick={() => setShowCc(!showCc)}
                      >
                        Cc
                      </button>
                      <button
                        className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                        onClick={() => setShowBcc(!showBcc)}
                      >
                        Bcc
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cc Field */}
                {showCc && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cc</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={emailData.cc}
                        onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        onClick={() => {
                          setEmailData({ ...emailData, cc: "" });
                          setShowCc(false);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Bcc Field */}
                {showBcc && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bcc</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={emailData.bcc}
                        onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        onClick={() => {
                          setEmailData({ ...emailData, bcc: "" });
                          setShowBcc(false);
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Subject Field */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Rich Text Editor Toolbar */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md mb-2 flex-wrap">
                  <button
                    type="button"
                    className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isBold ? 'bg-gray-200' : ''}`}
                    onClick={() => setIsBold(!isBold)}
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    type="button"
                    className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isItalic ? 'bg-gray-200' : ''}`}
                    onClick={() => setIsItalic(!isItalic)}
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    type="button"
                    className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isUnderline ? 'bg-gray-200' : ''}`}
                    onClick={() => setIsUnderline(!isUnderline)}
                  >
                    <Underline size={16} />
                  </button>
                  <button
                    type="button"
                    className={`p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer ${isStrikethrough ? 'bg-gray-200' : ''}`}
                    onClick={() => setIsStrikethrough(!isStrikethrough)}
                  >
                    <Strikethrough size={16} />
                  </button>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded bg-white text-xs cursor-pointer"
                  >
                    <option value="12">12 px</option>
                    <option value="14">14 px</option>
                    <option value="16">16 px</option>
                    <option value="18">18 px</option>
                    <option value="20">20 px</option>
                    <option value="24">24 px</option>
                  </select>
                  <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                    <AlignLeft size={16} />
                  </button>
                  <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                    <AlignCenter size={16} />
                  </button>
                  <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                    <AlignRight size={16} />
                  </button>
                  <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                    <AlignJustify size={16} />
                  </button>
                  <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                    <LinkIcon size={16} />
                  </button>
                  <button type="button" className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer">
                    <ImageIcon size={16} />
                  </button>
                </div>

                {/* Email Body Editor */}
                <div
                  contentEditable
                  className="min-h-[400px] p-4 border border-gray-300 rounded-md text-sm outline-none bg-white overflow-y-auto"
                  style={{
                    fontWeight: isBold ? "bold" : "normal",
                    fontStyle: isItalic ? "italic" : "normal",
                    textDecoration: isUnderline ? "underline" : isStrikethrough ? "line-through" : "none",
                    fontSize: `${fontSize}px`,
                  }}
                  onInput={(e: any) => setEmailData({ ...emailData, body: e.target.textContent })}
                  suppressContentEditableWarning={true}
                >
                  {/* Logo */}
                  <div style={{ marginBottom: "16px", display: "flex", alignItems: "center" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      backgroundColor: "#2563eb",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontWeight: "bold",
                      fontSize: "14px",
                      marginRight: "8px"
                    }}>
                      {organizationProfile?.logo ? (
                        <img
                          src={organizationProfile.logo}
                          alt="Company Logo"
                          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "4px" }}
                        />
                      ) : (
                        organizationProfile?.name?.substring(0, 2).toUpperCase() || "TB"
                      )}
                    </div>
                  </div>

                  {/* Quote Banner */}
                  <div style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "16px",
                    borderRadius: "6px",
                    textAlign: "center",
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "16px"
                  }}>
                    Quote #{quote.quoteNumber || quote.id}
                  </div>

                  {/* Email Content */}
                  <div style={{ marginBottom: "16px" }}>
                    <p>Dear {quote.customerName || "Customer"},</p>
                    <p style={{ marginTop: "12px" }}>
                      Thank you for contacting us. Your quote can be viewed, printed and downloaded as PDF from the link below.
                    </p>
                  </div>

                  {/* Quote Summary Box */}
                  <div style={{
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: "6px",
                    padding: "16px",
                    marginBottom: "16px",
                    textAlign: "center"
                  }}>
                    <div style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "8px"
                    }}>
                      QUOTE AMOUNT
                    </div>
                    <div style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#dc2626",
                      marginBottom: "8px"
                    }}>
                      {formatCurrency(quote.total, quote.currency)}
                    </div>
                    <div style={{
                      borderTop: "1px solid #fed7aa",
                      paddingTop: "12px",
                      marginTop: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      color: "#111827"
                    }}>
                      <div style={{ marginBottom: "4px" }}>
                        Quote No <strong>{quote.quoteNumber || quote.id}</strong>
                      </div>
                      <div>
                        Quote Date <strong>{formatDate(quote.quoteDate || quote.date)}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", marginTop: "12px" }}>
                      <button style={{
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}>
                        VIEW QUOTE
                      </button>
                    </div>
                  </div>

                  {/* Signature */}
                  <div style={{ marginTop: "24px" }}>
                    <p>Regards,</p>
                    <p style={{ fontWeight: "600" }}>{ownerEmail?.name || organizationProfile?.name || "Team"}</p>
                    {(ownerEmail?.email || organizationProfile?.email) && (
                      <p style={{ margin: "2px 0 0 0", color: "#9ca3af", fontSize: "12px" }}>
                        {ownerEmail?.email || organizationProfile?.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="mt-5 pt-5 border-t border-gray-200">
                  {/* Attach Quote PDF Checkbox */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachQuotePDF}
                        onChange={(e) => setAttachQuotePDF(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Attach Quote PDF</span>
                    </label>
                    {attachQuotePDF && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
                        <FileText size={16} className="text-gray-500" />
                        <span className="flex-1 text-sm text-gray-900">{quote.quoteNumber || quote.id}</span>
                      </div>
                    )}
                  </div>

                  {/* Other Attachments */}
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md mb-2 bg-gray-50">
                      <FileText size={16} className="text-gray-500" />
                      <span className="flex-1 text-sm text-gray-900">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachments(attachments.filter((_, i) => i !== index));
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                    onClick={() => (fileInputRef.current as any)?.click()}
                  >
                    <Paperclip size={16} />
                    Attachments
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const files = Array.from(e.target.files || []);
                      const newAttachments = files.map(file => ({
                        name: file.name,
                        type: file.type,
                        file: file,
                      }));
                      setAttachments([...attachments, ...newAttachments] as any);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowEmailModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                  onClick={() => {
                    if (!emailData.sendTo) {
                      toast.error("Please enter a recipient email address.");
                      return;
                    }
                    toast.success("Email sent successfully.");
                    setShowEmailModal(false);
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Quote Link Modal */}
        {showShareModal && quote && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) {
                setShowShareModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
              ref={shareModalRef}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Share Quote Link
                </h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                  onClick={() => setShowShareModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Visibility Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility:
                  </label>
                  <div className="relative" ref={visibilityDropdownRef}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white text-red-600 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setIsVisibilityDropdownOpen(!isVisibilityDropdownOpen)}
                    >
                      <span className="font-medium">{shareVisibility}</span>
                      <ChevronDown size={16} className="text-red-600" />
                    </button>
                    {isVisibilityDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <div
                          className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setShareVisibility("Public");
                            setIsVisibilityDropdownOpen(false);
                          }}
                        >
                          Public
                        </div>
                        <div
                          className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setShareVisibility("Private");
                            setIsVisibilityDropdownOpen(false);
                          }}
                        >
                          Private
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-sm text-gray-600 mb-6">
                  Select an expiration date and generate the link to share it with your customer. Remember that anyone who has access to this link can view, print or download it.
                </p>

                {/* Link Expiration Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-red-600 mb-2">
                    Link Expiration Date<span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={linkExpirationDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkExpirationDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <HelpCircle size={14} className="text-gray-500" />
                    <span>By default, the link is set to expire 90 days from the quote expiry date.</span>
                  </div>
                </div>

                {/* Generated Link Display */}
                {isLinkGenerated && generatedLink && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generated Link:
                    </label>
                    <textarea
                      readOnly
                      value={generatedLink}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <div>
                  {isLinkGenerated && (
                    <button
                      className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                      onClick={handleCopyLink}
                    >
                      Copy Link
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!isLinkGenerated ? (
                    <button
                      className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                      style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                      onClick={handleGenerateLink}
                    >
                      Generate Link
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                      onClick={handleDisableAllActiveLinks}
                    >
                      Disable All Active Links
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => setShowShareModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attachments Modal */}
        {showAttachmentsModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) {
                setShowAttachmentsModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Attachments</h2>
                <button
                  className="w-8 h-8 flex items-center justify-center bg-[#0D4A52] rounded text-white hover:bg-[#0B3F46] cursor-pointer"
                  onClick={() => setShowAttachmentsModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {quoteAttachments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-900 mb-6 text-lg">No Files Attached</p>
                    <div
                      className={`border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => (attachmentsFileInputRef.current as any)?.click()}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 flex items-center justify-center">
                          <Upload size={32} className="text-blue-600" />
                        </div>
                        <div className="flex items-center gap-2 text-base text-gray-900">
                          <span>Upload your</span>
                          <span className="font-medium">Files</span>
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                            <ChevronDown size={12} className="text-gray-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-6">
                      You can upload a maximum of 5 files, 10MB each
                    </p>
                    {isUploadingAttachment && (
                      <p className="text-sm text-blue-600 mt-2">Uploading attachment...</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quoteAttachments.map((attachment: any) => {
                      const isImage = isImageFileAttachment(attachment);
                      const previewSource = attachment.preview || attachment.url;
                      return (
                        <div
                          key={attachment.id}
                          className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleFileClick(attachment)}
                        >
                          {isImage && previewSource ? (
                            <img
                              src={previewSource}
                              alt={attachment.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <FileText size={20} className="text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {attachment.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <button
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                    {quoteAttachments.length < 5 && (
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                          }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => (attachmentsFileInputRef.current as any)?.click()}
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
                          {isUploadingAttachment && (
                            <span className="text-xs text-blue-600">Uploading...</span>
                          )}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                    e.target.value = '';
                  }}
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
            <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
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
                src={selectedImage || undefined}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {showCommentsSidebar && (
          <QuoteCommentsPanel
            open={showCommentsSidebar}
            onClose={() => setShowCommentsSidebar(false)}
            quoteId={String(quoteId || quote?.id || quote?._id || "")}
            comments={comments}
            onCommentsChange={(nextComments: any) => {
              setComments(nextComments);
              setQuote((prev: any) => (prev ? { ...prev, comments: nextComments } : prev));
            }}
            updateQuote={updateQuote}
          />
        )}

        {/* Comments Sidebar */}
        {false && showCommentsSidebar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div
              className="bg-white w-full max-w-md h-full shadow-xl flex flex-col"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Comments</h2>
                <button
                  className="w-8 h-8 flex items-center justify-center bg-[#0D4A52] rounded text-white hover:bg-[#0B3F46] cursor-pointer"
                  onClick={() => setShowCommentsSidebar(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Comment Input */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex gap-2 mb-3">
                  <button
                    className={`p-2 rounded transition-colors ${commentBold ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    onClick={() => setCommentBold(!commentBold)}
                    title="Bold"
                  >
                    <Bold size={16} className="text-gray-700" />
                  </button>
                  <button
                    className={`p-2 rounded transition-colors ${commentItalic ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    onClick={() => setCommentItalic(!commentItalic)}
                    title="Italic"
                  >
                    <Italic size={16} className="text-gray-700" />
                  </button>
                  <button
                    className={`p-2 rounded transition-colors ${commentUnderline ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    onClick={() => setCommentUnderline(!commentUnderline)}
                    title="Underline"
                  >
                    <Underline size={16} className="text-gray-700" />
                  </button>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
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
                  className={`mt-3 w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${newComment.trim()
                    ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  onClick={() => handleAddComment()}
                  disabled={!newComment.trim() || isSavingComment}
                >
                  {isSavingComment ? "Saving..." : "Add Comment"}
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">ALL COMMENTS</h3>
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No comments yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment: any) => (
                        <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                              {comment.author.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{comment.author}</div>
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
          </div>
        )}

        {/* Manage Custom Fields Modal */}
        {showCustomFieldsModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) {
                setShowCustomFieldsModal(false);
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Manage Custom Fields</h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 cursor-pointer"
                  onClick={() => setShowCustomFieldsModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                    style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">FIELD NAME</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DATA TYPE</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MANDATORY</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SHOW IN ALL PDFS</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customFields.map((field: any) => (
                        <tr key={field.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            <div className="flex items-center gap-2">
                              {field.isLocked && <Lock size={14} className="text-gray-400" />}
                              <span>{field.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{field.dataType}</td>
                          <td className="px-4 py-3 text-gray-700">{field.mandatory ? "Yes" : "No"}</td>
                          <td className="px-4 py-3 text-gray-700">{field.showInPDF ? "Yes" : "No"}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-[#e6f3f1] text-[#0D4A52] rounded text-xs font-medium">
                              {field.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowCustomFieldsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organization Address Modal */}
        {isOrganizationAddressModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
                <button
                  className="p-2 text-white rounded transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                  onClick={() => setIsOrganizationAddressModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Logo Upload Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Logo</h3>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview || undefined}
                          alt="Logo Preview"
                          className="w-20 h-20 object-cover rounded border border-gray-300"
                        />
                        <button
                          className="absolute -top-2 -right-2 p-1 text-white rounded-full transition-colors"
                          style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                          onClick={() => {
                            setLogoPreview("");
                            setLogoFile(null);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                        <Upload size={24} className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        ref={organizationAddressFileInputRef}
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "0.9"}
                        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.opacity = "1"}
                        onClick={() => (organizationAddressFileInputRef.current as any)?.click()}
                      >
                        Upload Logo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Address Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={organizationData.street1}
                      onChange={(e) => setOrganizationData({ ...organizationData, street1: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="taleex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={organizationData.street2}
                      onChange={(e) => setOrganizationData({ ...organizationData, street2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="taleex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={organizationData.city}
                      onChange={(e) => setOrganizationData({ ...organizationData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="mogadishu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      value={organizationData.zipCode}
                      onChange={(e) => setOrganizationData({ ...organizationData, zipCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="22223"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                    <input
                      type="text"
                      value={organizationData.stateProvince}
                      onChange={(e) => setOrganizationData({ ...organizationData, stateProvince: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nairobi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={organizationData.phone}
                      onChange={(e) => setOrganizationData({ ...organizationData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fax Number</label>
                    <input
                      type="text"
                      value={organizationData.faxNumber}
                      onChange={(e) => setOrganizationData({ ...organizationData, faxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={organizationData.websiteUrl}
                      onChange={(e) => setOrganizationData({ ...organizationData, websiteUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: any) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e: any) => e.target.style.opacity = "1"}
                  onClick={() => {
                    void updateOrganizationProfile(organizationData);
                    toast.success("Organization address updated.");
                    setIsOrganizationAddressModalOpen(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOrganizationAddressModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Terms & Conditions Modal */}
        {isTermsAndConditionsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Update Terms & Conditions</h2>
                <button
                  className="p-2 text-white rounded transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: any) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e: any) => e.target.style.opacity = "1"}
                  onClick={() => setIsTermsAndConditionsModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Notes Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                  <textarea
                    value={termsData.notes}
                    onChange={(e) => setTermsData({ ...termsData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
                    placeholder="Enter notes..."
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsData.useNotesForAllQuotes}
                      onChange={(e) => setTermsData({ ...termsData, useNotesForAllQuotes: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Use this in future for all quotes of all customers.</span>
                  </label>
                </div>

                {/* Terms & Conditions Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                  <textarea
                    value={termsData.termsAndConditions}
                    onChange={(e) => setTermsData({ ...termsData, termsAndConditions: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[200px]"
                    placeholder="Enter terms and conditions..."
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsData.useTermsForAllQuotes}
                      onChange={(e) => setTermsData({ ...termsData, useTermsForAllQuotes: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Use this in future for all quotes of all customers.</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-colors"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e: any) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e: any) => e.target.style.opacity = "1"}
                  onClick={() => {
                    toast.success("Terms and conditions updated.");
                    setIsTermsAndConditionsModalOpen(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsTermsAndConditionsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default QuoteDetail;





// Helper functions moved out of component or converted to function declarations for hoisting
function sanitizeProfileForCache(profile: any) {
  if (!profile || typeof profile !== "object") return {};
  const rawLogo = String(profile.logo || profile.logoUrl || "").trim();
  const nextLogo = rawLogo.startsWith("data:") ? "" : rawLogo;
  return {
    ...profile,
    logo: nextLogo,
    logoUrl: nextLogo,
  };
}
