import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getBills, getPaymentsMade, getVendorCredits, getExpenses, getPurchaseOrders, getRecurringBills, getRecurringExpenses, getJournals, getProjects, getPurchaseReceipts } from "../shared/purchasesModel";
// Note: getVendors and updateVendor from purchasesModel.js are no longer used - using vendorsAPI instead
import { getCustomers } from "../../sales/salesModel";
import { vendorsAPI, profileAPI, chartOfAccountsAPI, billsAPI, expensesAPI, purchaseOrdersAPI, vendorCreditsAPI, paymentsMadeAPI, recurringBillsAPI, recurringExpensesAPI, projectsAPI, receiptsAPI, accountantAPI, invoicesAPI, customersAPI, paymentsReceivedAPI, quotesAPI, creditNotesAPI, salesReceiptsAPI } from "../../../services/api";
import BulkUpdateModal from "../shared/BulkUpdateModal";
import { getAllDocuments } from "../../../utils/documentStorage";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  X, Edit, Paperclip, ChevronDown, Plus, MoreVertical,
  Settings, User, Mail, Phone, MapPin, Globe,
  DollarSign, TrendingUp, Calendar, UserPlus,
  ChevronUp, ChevronRight, Sparkles, Bold, Italic, Underline,
  Filter, ArrowUpDown, Search, ChevronLeft, Link2, Printer, FileText, FileSpreadsheet, Monitor, Check, Upload, Trash2, Folder, CreditCard, LayoutGrid, Cloud, Grid3x3, HardDrive, Box, Square, Star
} from "lucide-react";

// Custom styles for purchases theme
const purchasesTheme = {
  primary: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)',
  primaryHover: 'linear-gradient(90deg, #0D4A52 0%, #0A3A42 100%)',
  secondary: '#156372',
  secondaryHover: '#0D4A52',
  danger: '#0D4A52',
  dangerHover: '#0D4A52',
  success: '#059669',
  successHover: '#047857'
};

// Currency list
const currencies = [
  { code: "AED", name: "UAE Dirham" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CNY", name: "Yuan Renminbi" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Pound Sterling" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "USD", name: "United States Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "KRW", name: "South Korean Won" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" }
];

// Type definitions
interface Vendor {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  companyName?: string;
  openingBalance?: number | string;
  contactPersons?: any[];
  billingAddress?: {
    attention?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    fax?: string;
  };
  shippingAddress?: {
    attention?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    fax?: string;
  };
  billingAttention?: string;
  billingCountry?: string;
  billingStreet1?: string;
  billingStreet2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingPhone?: string;
  billingFax?: string;
  shippingAttention?: string;
  shippingCountry?: string;
  shippingStreet1?: string;
  shippingStreet2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingPhone?: string;
  shippingFax?: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  currency?: string;
  enablePortal?: boolean;
  website?: string;
  profileImage?: string | any;
  linkedCustomerId?: string | null;
  linkedCustomerName?: string | null;
  customFields?: Record<string, any>;
  comments?: Array<{
    id?: string | number;
    text?: string;
    author?: string;
    date?: string | Date;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
  documents?: Array<{
    id?: string | number;
    name?: string;
    url?: string;
    size?: number | string;
    type?: string;
    uploadedAt?: string | Date;
  }>;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  details: string;
  detailsLink?: string;
  amount: number;
  payments: number;
  balance: number;
}

interface Customer {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  companyName?: string;
  email?: string;
  [key: string]: any;
}

interface CustomView {
  id: string;
  name: string;
  [key: string]: any;
}

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { code: baseCurrencyCode } = useCurrency();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationProfile, setOrganizationProfile] = useState<any>(null);
  const [paidThroughAccounts, setPaidThroughAccounts] = useState<any[]>([]);

  // Note: We allow both MongoDB ObjectIds and legacy timestamp IDs
  // The backend will handle both formats
  const [vendors, setVendors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedTransactionType, setSelectedTransactionType] = useState<any>(null);
  const [isTransactionNavDropdownOpen, setIsTransactionNavDropdownOpen] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [isInvoiceViewDropdownOpen, setIsInvoiceViewDropdownOpen] = useState(false);
  const invoiceViewDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState({
    address: true,
    otherDetails: true,
    contactPersons: true,
    recordInfo: false
  });
  const [expandedTransactions, setExpandedTransactions] = useState({
    bills: true,
    paymentsMade: true,
    purchaseOrders: false,
    recurringBills: false,
    expenses: false,
    recurringExpenses: false,
    projects: false,
    journals: false,
    vendorCredits: false,
    purchaseReceipts: false
  });
  const [billSearchTerm, setBillSearchTerm] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("all");
  const [billCurrentPage, setBillCurrentPage] = useState(1);
  const billsPerPage = 10;
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Sidebar selection state
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [isBulkActionsDropdownOpen, setIsBulkActionsDropdownOpen] = useState(false);
  const bulkActionsDropdownRef = useRef<HTMLDivElement>(null);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [selectedSidebarView, setSelectedSidebarView] = useState("All Vendors");
  const [isSidebarViewDropdownOpen, setIsSidebarViewDropdownOpen] = useState(false);
  const sidebarViewDropdownRef = useRef<HTMLDivElement>(null);

  // Additional state variables
  const [paymentsMade, setPaymentsMade] = useState<any[]>([]);
  const [vendorCredits, setVendorCredits] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [recurringBills, setRecurringBills] = useState<any[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState<any[]>([]);
  const [mails, setMails] = useState<any[]>([]);
  const [isMailsTypeDropdownOpen, setIsMailsTypeDropdownOpen] = useState(false);
  const [selectedMailsType, setSelectedMailsType] = useState("System Mails");
  const mailsTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newContactPerson, setNewContactPerson] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    skype: "",
    designation: "",
    department: "",
    enablePortalAccess: true
  });

  // Print Vendor Statements Modal state
  const [isPrintStatementsModalOpen, setIsPrintStatementsModalOpen] = useState(false);
  const [printStatementStartDate, setPrintStatementStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [printStatementEndDate, setPrintStatementEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date;
  });
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [startDateCalendarMonth, setStartDateCalendarMonth] = useState(new Date());
  const [endDateCalendarMonth, setEndDateCalendarMonth] = useState(new Date());
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  // Merge Vendors Modal state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetVendor, setMergeTargetVendor] = useState<any>(null);
  const [isMergeVendorDropdownOpen, setIsMergeVendorDropdownOpen] = useState(false);
  const [mergeVendorSearch, setMergeVendorSearch] = useState("");
  const mergeVendorDropdownRef = useRef<HTMLDivElement>(null);

  // Associate Templates Modal state
  const [isAssociateTemplatesModalOpen, setIsAssociateTemplatesModalOpen] = useState(false);
  const [pdfTemplates, setPdfTemplates] = useState({
    vendorStatement: "Standard Template",
    purchaseOrders: "Standard Template",
    bills: "Standard Template",
    vendorCredits: "Standard Template",
    paymentThankYou: "Elite Template"
  });
  const [emailNotifications, setEmailNotifications] = useState({
    purchaseOrders: "Default",
    bills: "Default",
    vendorCredits: "Default",
    paymentThankYou: "Default"
  });
  const [openTemplateDropdown, setOpenTemplateDropdown] = useState(null);
  const [templateSearches, setTemplateSearches] = useState({});

  const pdfTemplateOptions = ["Standard Template", "Elite Template", "Classic Template", "Modern Template"];
  const emailTemplateOptions = ["Default", "Professional", "Friendly", "Formal"];

  // Payments state - already declared above

  // Mails state - already declared above
  const [isLinkEmailDropdownOpen, setIsLinkEmailDropdownOpen] = useState(false);
  const linkEmailDropdownRef = useRef<HTMLDivElement>(null);

  // Statement state
  const [statementPeriod, setStatementPeriod] = useState("this-month");
  const [statementFilter, setStatementFilter] = useState("all");
  const [isStatementPeriodDropdownOpen, setIsStatementPeriodDropdownOpen] = useState(false);
  const [isStatementFilterDropdownOpen, setIsStatementFilterDropdownOpen] = useState(false);
  // const statementPeriodDropdownRef = useRef(null);
  // const statementFilterDropdownRef = useRef(null);
  const [statementTransactions, setStatementTransactions] = useState<Transaction[]>([]);
  // Other transaction states already declared above

  // New Transaction dropdown state
  const [isNewTransactionDropdownOpen, setIsNewTransactionDropdownOpen] = useState(false);
  const newTransactionDropdownRef = useRef<HTMLDivElement>(null);
  const transactionNavDropdownRef = useRef<HTMLDivElement>(null);
  const transactionSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Additional missing state variables
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [linkedCustomerSales, setLinkedCustomerSales] = useState<any[]>([]);
  const [linkedCustomerPayments, setLinkedCustomerPayments] = useState<any[]>([]);
  const [linkedCustomerQuotes, setLinkedCustomerQuotes] = useState<any[]>([]);
  const [linkedCustomerCreditNotes, setLinkedCustomerCreditNotes] = useState<any[]>([]);
  const [linkedCustomerSalesReceipts, setLinkedCustomerSalesReceipts] = useState<any[]>([]);
  const [isLinkedCustomerSalesLoading, setIsLinkedCustomerSalesLoading] = useState(false);
  const [linkedCustomerSalesSections, setLinkedCustomerSalesSections] = useState({
    invoices: false,
    customerPayments: false,
    quotes: false,
    creditNotes: false,
    salesReceipts: false
  });
  const [isSavingLinkedCustomer, setIsSavingLinkedCustomer] = useState(false);
  const [contactDropdownRefs, setContactDropdownRefs] = useState<{ [key: string]: React.RefObject<HTMLDivElement> }>({});
  const [openContactDropdown, setOpenContactDropdown] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<"billing" | "shipping">("billing");
  const [addressFormData, setAddressFormData] = useState({
    attention: "",
    country: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    faxNumber: ""
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const statementPeriodDropdownRef = useRef<HTMLDivElement>(null);
  const statementFilterDropdownRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customizeDropdownRef = useRef<HTMLDivElement>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);

  // Attachments dropdown state
  const [isAttachmentsDropdownOpen, setIsAttachmentsDropdownOpen] = useState(false);
  const attachmentsDropdownRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vendorTransactionsCacheRef = useRef<Record<string, {
    bills: any[];
    paymentsMade: any[];
    vendorCredits: any[];
    expenses: any[];
    purchaseOrders: any[];
    recurringBills: any[];
    recurringExpenses: any[];
    journals: any[];
    projects: any[];
    purchaseReceipts: any[];
  }>>({});

  // Upload dropdown state
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("taban");
  const [selectedInbox, setSelectedInbox] = useState("files");
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [cloudSearchQuery, setCloudSearchQuery] = useState("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState([]);

  const vendorFieldOptions = [
    {
      value: "currency",
      label: "Currency",
      type: "select",
      options: currencies.map((currency) => ({
        value: currency.code,
        label: `${currency.code} - ${currency.name}`,
      })),
    },
    {
      value: "paymentTerms",
      label: "Payment Terms",
      type: "select",
      options: [
        "Due on Receipt",
        "Net 15",
        "Net 30",
        "Net 45",
        "Net 60",
        "Due end of the month",
        "Due end of next month",
      ],
    },
    {
      value: "vendorLanguage",
      label: "Vendor Language",
      type: "select",
      options: ["English", "Spanish", "French", "German"],
    },
    {
      value: "accountsPayable",
      label: "Account Payable",
      type: "select",
      options: paidThroughAccounts.length > 0
        ? paidThroughAccounts.map((account: any) => ({
            value: account._id || account.id || account.accountName || account.name,
            label: account.accountName || account.name || "Account",
          }))
        : [
            { value: "Accounts Payable", label: "Accounts Payable" },
            { value: "Trade Payables", label: "Trade Payables" },
            { value: "Creditors", label: "Creditors" },
          ],
    },
    {
      value: "openingBalance",
      label: "Opening Balance",
      type: "number",
      step: "0.01",
      placeholder: "0.00",
    },
    {
      value: "openingBalanceDate",
      label: "Opening Balance Date",
      type: "date",
    },
  ];

  const handleBulkUpdateSubmit = async (field: string, value: any, selectedOption?: any) => {
    let normalizedValue = value;

    if (selectedOption?.type === "number") {
      const parsedNumber = Number(value);
      if (Number.isNaN(parsedNumber)) {
        toast.error("Please enter a valid number.");
        return;
      }
      normalizedValue = parsedNumber;
    }

    try {
      await vendorsAPI.bulkUpdate(selectedVendors, { [field]: normalizedValue });
      toast.success(`Updated ${selectedVendors.length} vendor(s).`);
      setIsBulkActionsDropdownOpen(false);
      setSelectedVendors([]);
      await loadVendors();
      window.dispatchEvent(new Event("vendorSaved"));
    } catch (error: any) {
      toast.error(error?.message || "Failed to bulk update vendors.");
    }
  };

  const loadVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      const vendorsList = Array.isArray(response)
        ? response
        : (response?.data && Array.isArray(response.data)
          ? response.data
          : (response?.data?.data && Array.isArray(response.data.data) ? response.data.data : []));

      setVendors(
        (vendorsList || []).map((vend: any) => ({
          ...vend,
          id: String(vend?._id || vend?.id || ""),
          _id: vend?._id || vend?.id || "",
          name:
            vend?.displayName ||
            vend?.name ||
            vend?.companyName ||
            `${vend?.firstName || ""} ${vend?.lastName || ""}`.trim() ||
            "Vendor",
        }))
      );
    } catch (error) {
    }
  };

  // Action header bar state
  const [showActionHeader, setShowActionHeader] = useState(false);

  // More dropdown state
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const [areRemindersStopped, setAreRemindersStopped] = useState(false);

  // Clone modal state
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneContactType, setCloneContactType] = useState("vendor");
  const [isCloningVendor, setIsCloningVendor] = useState(false);

  // Associate Templates Modal state
  // const [isAssociateTemplatesModalOpen, setIsAssociateTemplatesModalOpen] = useState(false);

  // Configure Vendor Portal Modal state
  const [isConfigurePortalModalOpen, setIsConfigurePortalModalOpen] = useState(false);
  const [portalAccessContacts, setPortalAccessContacts] = useState([]);

  // Default Currency hover and edit state
  const [isCurrencyHovered, setIsCurrencyHovered] = useState(false);
  const [isCurrencyEditing, setIsCurrencyEditing] = useState(false);
  const [currencyValue, setCurrencyValue] = useState("");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);

  // Vendor Language hover and edit state
  const [isLanguageHovered, setIsLanguageHovered] = useState(false);
  const [isLanguageEditing, setIsLanguageEditing] = useState(false);
  const [languageValue, setLanguageValue] = useState("");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef(null);

  // Portal Status hover state
  const [isPortalStatusHovered, setIsPortalStatusHovered] = useState(false);

  // Link to Customer Modal state
  const [isLinkToCustomerModalOpen, setIsLinkToCustomerModalOpen] = useState(false);

  // Merge Vendors Modal state
  // const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  // const [mergeTargetVendor, setMergeTargetVendor] = useState(null);
  // const [isMergeVendorDropdownOpen, setIsMergeVendorDropdownOpen] = useState(false);
  // const [mergeVendorSearch, setMergeVendorSearch] = useState("");
  // const mergeVendorDropdownRef = useRef(null);

  // Customize Dropdown States
  const [isStatementDocumentHovered, setIsStatementDocumentHovered] = useState(false);
  // const [isCustomizeDropdownOpen, setIsCustomizeDropdownOpen] = useState(false);
  const [isChooseTemplateModalOpen, setIsChooseTemplateModalOpen] = useState(false);
  const [isOrganizationAddressModalOpen, setIsOrganizationAddressModalOpen] = useState(false);
  const [isTermsAndConditionsModalOpen, setIsTermsAndConditionsModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Template");
  const [organizationData, setOrganizationData] = useState({
    street1: "taleex",
    street2: "",
    city: "mogadishu",
    zipCode: "22223",
    stateProvince: "Nairobi",
    phone: "",
    faxNumber: "",
    websiteUrl: "",
    industry: ""
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [termsData, setTermsData] = useState({
    notes: "Looking forward for your business.",
    termsAndConditions: "",
    useNotesForAllStatements: false,
    useTermsForAllStatements: false
  });
  // const customizeDropdownRef = useRef(null);
  const organizationAddressFileInputRef = useRef(null);

  // Contact Person Edit/Delete state
  // const [openContactDropdown, setOpenContactDropdown] = useState(null);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [editContactData, setEditContactData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    workPhone: "",
    mobile: "",
    skypeName: "",
    designation: "",
    department: ""
  });
  // const contactDropdownRefs = useRef({});

  // Edit Opening Balance Modal state
  const [isEditOpeningBalanceModalOpen, setIsEditOpeningBalanceModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");

  // Address Modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  // const [addressType, setAddressType] = useState("billing"); // "billing" or "shipping"
  // const [addressFormData, setAddressFormData] = useState({
  //   attention: "",
  //   country: "",
  //   addressLine1: "",
  //   addressLine2: "",
  //   city: "",
  //   state: "",
  //   zipCode: "",
  //   phone: "",
  //   faxNumber: "",
  // });

  // Profile Image state
  // const [profileImage, setProfileImage] = useState(null);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const profileImageInputRef = useRef(null);

  // Add Contact Person modal state
  const [isAddContactPersonModalOpen, setIsAddContactPersonModalOpen] = useState(false);
  // const [newContactPerson, setNewContactPerson] = useState({
  //   salutation: "Mr",
  //   firstName: "",
  //   lastName: "",
  //   email: "",
  //   workPhone: "",
  //   mobile: "",
  //   skype: "",
  //   designation: "",
  //   department: "",
  //   enablePortalAccess: true
  // });

  const normalizeCollection = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.bills)) return payload.data.bills;
    if (Array.isArray(payload?.data?.payments)) return payload.data.payments;
    if (Array.isArray(payload?.data?.vendorCredits)) return payload.data.vendorCredits;
    if (Array.isArray(payload?.data?.expenses)) return payload.data.expenses;
    if (Array.isArray(payload?.data?.purchaseOrders)) return payload.data.purchaseOrders;
    if (Array.isArray(payload?.data?.recurringBills)) return payload.data.recurringBills;
    if (Array.isArray(payload?.data?.recurringExpenses)) return payload.data.recurringExpenses;
    return [];
  };

  const toCandidateStrings = (value: any): string[] => {
    if (!value) return [];
    if (typeof value === "string" || typeof value === "number") {
      return [String(value).trim()].filter(Boolean);
    }
    if (typeof value === "object") {
      const candidates = [
        value._id,
        value.id,
        value.vendorId,
        value.value,
        value.name,
        value.displayName,
        value.companyName,
        value.label
      ];
      return candidates.map((item) => String(item || "").trim()).filter(Boolean);
    }
    return [];
  };

  // Helper function to check if transaction belongs to vendor
  const matchesVendor = (transaction: any, vendorId: string, vendorName: string, displayName: string, companyName: string) => {
    const targetIds = [vendorId, id].map((v) => String(v || "").trim()).filter(Boolean);
    const targetNames = [vendorName, displayName, companyName]
      .map((v) => String(v || "").toLowerCase().trim())
      .filter(Boolean);

    const vendorIdCandidates = [
      ...toCandidateStrings(transaction?.vendor),
      ...toCandidateStrings(transaction?.vendor_id),
      ...toCandidateStrings(transaction?.vendorId),
      ...toCandidateStrings(transaction?.vendorID),
      ...toCandidateStrings(transaction?.vendorRef),
      ...toCandidateStrings(transaction?.party),
      ...toCandidateStrings(transaction?.partyId),
      ...toCandidateStrings(transaction?.contact),
      ...toCandidateStrings(transaction?.contactId),
    ];

    if (vendorIdCandidates.some((candidate) => targetIds.includes(candidate))) {
      return true;
    }

    const vendorNameCandidates = [
      ...toCandidateStrings(transaction?.vendorName),
      ...toCandidateStrings(transaction?.vendor_name),
      ...toCandidateStrings(transaction?.vendorDisplayName),
      ...toCandidateStrings(transaction?.payeeName),
      ...toCandidateStrings(transaction?.partyName),
      ...toCandidateStrings(transaction?.contactName),
      ...toCandidateStrings(transaction?.name),
      ...toCandidateStrings(transaction?.vendor),
    ]
      .map((v) => v.toLowerCase().trim())
      .filter(Boolean);

    if (vendorNameCandidates.some((candidate) =>
      targetNames.some((target) => candidate === target || candidate.includes(target) || target.includes(candidate))
    )) {
      return true;
    }

    return false;
  };

  // Load all transactions for this vendor from API
  useEffect(() => {
    if (!vendor) {
      setBills([]);
      setPaymentsMade([]);
      setVendorCredits([]);
      setExpenses([]);
      setPurchaseOrders([]);
      setRecurringBills([]);
      setRecurringExpenses([]);
      setJournals([]);
      setProjects([]);
      setPurchaseReceipts([]);
      setIsTransactionsLoading(false);
      return;
    }

    const vendorId = vendor?._id || vendor?.id || '';
    const vendorName = vendor?.name || "";
    const displayName = vendor?.displayName || "";
    const companyName = vendor?.companyName || "";
    const cacheKey = String(vendorId);
    const cachedTransactions = vendorTransactionsCacheRef.current[cacheKey];

    if (cachedTransactions) {
      setIsTransactionsLoading(false);
      setBills(cachedTransactions.bills);
      setPaymentsMade(cachedTransactions.paymentsMade);
      setVendorCredits(cachedTransactions.vendorCredits);
      setExpenses(cachedTransactions.expenses);
      setPurchaseOrders(cachedTransactions.purchaseOrders);
      setRecurringBills(cachedTransactions.recurringBills);
      setRecurringExpenses(cachedTransactions.recurringExpenses);
      setJournals(cachedTransactions.journals);
      setProjects(cachedTransactions.projects);
      setPurchaseReceipts(cachedTransactions.purchaseReceipts);
      return;
    }

    const loadVendorTransactions = async () => {
      setIsTransactionsLoading(true);
      try {
        const nextTransactions = {
          bills: [] as any[],
          paymentsMade: [] as any[],
          vendorCredits: [] as any[],
          expenses: [] as any[],
          purchaseOrders: [] as any[],
          recurringBills: [] as any[],
          recurringExpenses: [] as any[],
          journals: [] as any[],
          projects: [] as any[],
          purchaseReceipts: [] as any[],
        };

        // Load Bills
        try {
          const billsResponse = await billsAPI.getAll();
          const allBills = normalizeCollection(billsResponse);
          const vendorBills = allBills.filter((bill: any) =>
            matchesVendor(bill, vendorId, vendorName, displayName, companyName)
          );
          setBills(vendorBills);
          nextTransactions.bills = vendorBills;
        } catch (error) {
          setBills([]);
        }

        // Load Payments Made
        try {
          const paymentsResponse = await paymentsMadeAPI.getAll();
          const allPayments = normalizeCollection(paymentsResponse);
          const vendorPayments = allPayments.filter((payment: any) =>
            matchesVendor(payment, vendorId, vendorName, displayName, companyName)
          );
          setPaymentsMade(vendorPayments);
          nextTransactions.paymentsMade = vendorPayments;
        } catch (error) {
          setPaymentsMade([]);
        }

        // Load Vendor Credits
        try {
          const vendorCreditsResponse = await vendorCreditsAPI.getAll();
          const allVendorCredits = normalizeCollection(vendorCreditsResponse);
          const vendorCreditsFiltered = allVendorCredits.filter((vc: any) =>
            matchesVendor(vc, vendorId, vendorName, displayName, companyName)
          );
          setVendorCredits(vendorCreditsFiltered);
          nextTransactions.vendorCredits = vendorCreditsFiltered;
        } catch (error) {
          setVendorCredits([]);
        }

        // Load Expenses
        try {
          const expensesResponse = await expensesAPI.getAll({ limit: 1000 });
          const allExpenses = normalizeCollection(expensesResponse);
          const vendorExpenses = allExpenses.filter((expense: any) =>
            matchesVendor(expense, vendorId, vendorName, displayName, companyName)
          );
          setExpenses(vendorExpenses);
          nextTransactions.expenses = vendorExpenses;
        } catch (error) {
          setExpenses([]);
        }

        // Load Purchase Orders
        try {
          const purchaseOrdersResponse = await purchaseOrdersAPI.getAll();
          const allPurchaseOrders = normalizeCollection(purchaseOrdersResponse);
          const vendorPurchaseOrders = allPurchaseOrders.filter((po: any) =>
            matchesVendor(po, vendorId, vendorName, displayName, companyName)
          );
          setPurchaseOrders(vendorPurchaseOrders);
          nextTransactions.purchaseOrders = vendorPurchaseOrders;
        } catch (error) {
          setPurchaseOrders([]);
        }

        // Load Recurring Bills
        try {
          const recurringBillsResponse = await recurringBillsAPI.getAll();
          const allRecurringBills = normalizeCollection(recurringBillsResponse);
          const vendorRecurringBills = allRecurringBills.filter((rb: any) =>
            matchesVendor(rb, vendorId, vendorName, displayName, companyName)
          );
          setRecurringBills(vendorRecurringBills);
          nextTransactions.recurringBills = vendorRecurringBills;
        } catch (error) {
          setRecurringBills([]);
        }

        // Load Recurring Expenses
        try {
          const recurringExpensesResponse = await recurringExpensesAPI.getAll();
          const allRecurringExpenses = normalizeCollection(recurringExpensesResponse);
          const vendorRecurringExpenses = allRecurringExpenses.filter((re: any) =>
            matchesVendor(re, vendorId, vendorName, displayName, companyName)
          );
          setRecurringExpenses(vendorRecurringExpenses);
          nextTransactions.recurringExpenses = vendorRecurringExpenses;
        } catch (error) {
          setRecurringExpenses([]);
        }

        // Load Projects
        try {
          const projectsResponse = await projectsAPI.getAll();
          const allProjects = normalizeCollection(projectsResponse);
          const vendorProjects = allProjects.filter((p: any) =>
            matchesVendor(p, vendorId, vendorName, displayName, companyName)
          );
          setProjects(vendorProjects);
          nextTransactions.projects = vendorProjects;
        } catch (error) {
          setProjects([]);
        }

        // Load Purchase Receipts
        try {
          const receiptsResponse = await receiptsAPI.getAll();
          const allReceipts = normalizeCollection(receiptsResponse);
          const vendorReceipts = allReceipts.filter((r: any) =>
            matchesVendor(r, vendorId, vendorName, displayName, companyName)
          );
          setPurchaseReceipts(vendorReceipts);
          nextTransactions.purchaseReceipts = vendorReceipts;
        } catch (error) {
          setPurchaseReceipts([]);
        }

        // Load Journal Entries
        try {
          const journalsResponse = await accountantAPI.getJournals();
          const allJournals = normalizeCollection(journalsResponse);
          const vendorJournals = allJournals.filter((j: any) =>
            matchesVendor(j, vendorId, vendorName, displayName, companyName)
          );
          setJournals(vendorJournals);
          nextTransactions.journals = vendorJournals;
        } catch (error) {
          setJournals([]);
        }

        vendorTransactionsCacheRef.current[cacheKey] = nextTransactions;
      } catch (error) {
      } finally {
        setIsTransactionsLoading(false);
      }
    };

    loadVendorTransactions();
  }, [id, vendor]);


  // Build statement transactions from bills, payments made, and vendor credits
  useEffect(() => {
    if (!vendor) {
      setStatementTransactions([]);
      return;
    }

    const transactions = [];

    // Add opening balance
    transactions.push({
      id: "opening",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      type: "Opening Balance",
      details: "***Opening Balance***",
      amount: parseFloat(vendor?.openingBalance?.toString() || '0'),
      payments: 0,
      balance: parseFloat(vendor?.openingBalance?.toString() || '0')
    });

    // Add payments made
    paymentsMade.forEach((payment: any) => {
      transactions.push({
        id: `payment-${payment.id}`,
        date: payment.paymentDate || payment.date || new Date().toISOString(),
        type: "Payment Made",
        details: `${payment.paymentNumber || payment.id}\n${baseCurrencyCode || "USD"}${parseFloat(payment.amountPaid || payment.amount || 0).toLocaleString()} in excess payments`,
        detailsLink: payment.paymentNumber || payment.id,
        amount: 0,
        payments: parseFloat(payment.amountPaid || payment.amount || 0),
        balance: 0
      });
    });

    // Add vendor credits
    vendorCredits.forEach((vc: any) => {
      transactions.push({
        id: `vc-${vc.id}`,
        date: vc.date || vc.creditNoteDate || new Date().toISOString(),
        type: "Vendor Credit",
        details: vc.creditNoteNumber || vc.id,
        detailsLink: vc.creditNoteNumber || vc.id,
        amount: -(parseFloat(vc.total || vc.amount || 0)),
        payments: 0,
        balance: 0
      });
    });

    // Add bills
    bills.forEach((bill: any) => {
      transactions.push({
        id: `bill-${bill.id}`,
        date: bill.date || bill.billDate || new Date().toISOString(),
        type: "Bill",
        details: bill.billNumber || bill.id,
        detailsLink: bill.billNumber || bill.id,
        amount: parseFloat(bill.total || bill.amount || 0),
        payments: 0,
        balance: 0
      });
    });

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    transactions.forEach((t: any) => {
      runningBalance = runningBalance + t.amount - t.payments;
      t.balance = runningBalance;
    });

    setStatementTransactions(transactions);
  }, [vendor, bills, paymentsMade, vendorCredits]);

  useEffect(() => {
    if (isDocumentsModalOpen) {
      const documents = getAllDocuments();
      setAvailableDocuments(documents);
    }
  }, [isDocumentsModalOpen]);

  useEffect(() => {
    let isCancelled = false;

    const loadVendor = async () => {
      if (!id) {
        if (!isCancelled) {
          setIsLoading(false);
        }
        return;
      }

      // Let the backend handle all ID formats (ObjectId, timestamp IDs, etc.)
      // The backend has robust lookup logic to find vendors regardless of ID format
      const vendorId = String(id).trim();

      try {
        const response = await vendorsAPI.getById(vendorId);
        if (isCancelled) return;

        // Match customer's pattern exactly: check response.success && response.data
        if (response && response.success && response.data) {
          const vendorData = response.data;
          // Map nested address structure to flat structure for display
          // Ensure we have an id field - handle both ObjectId and string formats
          const vendorIdFromData = vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : null);

          const mappedVendor = {
            ...vendorData,
            id: vendorIdFromData || String(vendorId), // Ensure ID is always a string
            _id: vendorData._id || vendorIdFromData, // Keep _id for MongoDB compatibility
            billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
            billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
            billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
            billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
            billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
            billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
            billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
            billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
            billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
            shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingStreet1 || '',
            shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
            shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
            shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
            shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
            shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
            shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
            shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
            shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
          };
          setVendor(mappedVendor);
          const serverComments = vendorData.comments || vendorData.customFields?.vendorComments || [];
          const serverDocuments = vendorData.documents || vendorData.customFields?.vendorDocuments || [];
          setComments(normalizeCommentList(serverComments));
          setAttachments(normalizeAttachmentList(serverDocuments));
          if (mappedVendor.profileImage) {
            setProfileImage(mappedVendor.profileImage);
          }

          // Only use real mails returned by backend; no mock/sample rows.
          const rawMails =
            (Array.isArray(vendorData?.mails) ? vendorData.mails : null) ||
            (Array.isArray(vendorData?.mailLogs) ? vendorData.mailLogs : null) ||
            (Array.isArray(vendorData?.emails) ? vendorData.emails : null) ||
            [];
          const normalizedMails = rawMails.map((mail: any, index: number) => {
            const to = String(mail?.to || mail?.recipient || mail?.email || "").trim();
            return {
              id: String(mail?._id || mail?.id || index),
              to,
              subject: String(mail?.subject || mail?.title || "Email"),
              description: String(mail?.description || mail?.bodyPreview || mail?.message || ""),
              date: mail?.date || mail?.createdAt || "",
              type: String(mail?.type || "mail"),
              initial: (to.charAt(0) || "M").toUpperCase()
            };
          });
          setMails(normalizedMails);
          setIsLoading(false);
        } else {
          if (isCancelled) return;
          setIsLoading(false);
          alert('Vendor data is invalid: Missing required fields');
          navigate("/purchases/vendors");
        }
      } catch (error) {
        if (isCancelled) return;
        toast.error('Failed to load vendor: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setIsLoading(false);
      }
    };

    // Reset detail state immediately when switching vendor so old data does not linger
    setIsLoading(true);
    setVendor(null);
    setComments([]);
    setMails([]);
    setAttachments([]);
    setBills([]);
    setPaymentsMade([]);
    setVendorCredits([]);
    setExpenses([]);
    setPurchaseOrders([]);
    setRecurringBills([]);
    setRecurringExpenses([]);
    setJournals([]);
    setProjects([]);
    setPurchaseReceipts([]);
    setStatementTransactions([]);
    setSelectedTransactionType(null);
    setBillCurrentPage(1);
    setBillSearchTerm("");
    setBillStatusFilter("all");
    setIsTransactionNavDropdownOpen(false);

    loadVendor();

    return () => {
      isCancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    // Load sidebar list/profile once instead of every vendor switch.
    loadVendors();
    const fetchOrganizationProfile = async () => {
      try {
        const resp = await profileAPI.getOrganizationProfile();
        if (resp && resp.success && resp.data) {
          setOrganizationProfile(resp.data);
          localStorage.setItem('organization_profile', JSON.stringify(resp.data));
        } else {
          const fallback = localStorage.getItem('organization_profile');
          if (fallback) setOrganizationProfile(JSON.parse(fallback));
        }
      } catch (error) {
        const fallback = localStorage.getItem('organization_profile');
        if (fallback) setOrganizationProfile(JSON.parse(fallback));
      }
    };
    fetchOrganizationProfile();
  }, []);

  useEffect(() => {
    const handleVendorRefresh = () => {
      loadVendors();
    };

    window.addEventListener("vendorSaved", handleVendorRefresh);
    window.addEventListener("focus", handleVendorRefresh);
    window.addEventListener("storage", handleVendorRefresh);

    return () => {
      window.removeEventListener("vendorSaved", handleVendorRefresh);
      window.removeEventListener("focus", handleVendorRefresh);
      window.removeEventListener("storage", handleVendorRefresh);
    };
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await chartOfAccountsAPI.getAccounts({ limit: 1000 });
        const accounts = Array.isArray(response?.data)
          ? response.data
          : (Array.isArray(response) ? response : []);
        setPaidThroughAccounts(accounts);
      } catch (error) {
        setPaidThroughAccounts([]);
      }
    };

    loadAccounts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarViewDropdownRef.current && !sidebarViewDropdownRef.current.contains(event.target as Node)) {
        setIsSidebarViewDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sidebarViewOptions = [
    "All Vendors",
    "Active Vendors",
    "CRM Vendors",
    "Duplicate Vendors",
    "Inactive Vendors",
    "Vendor Portal Enabled",
    "Vendor Portal Disabled",
  ];

  const getSidebarFilteredVendors = () => {
    if (selectedSidebarView === "All Vendors") {
      return vendors;
    }

    if (selectedSidebarView === "Active Vendors") {
      return vendors.filter((v: any) => String(v?.status || "active").toLowerCase() !== "inactive");
    }

    if (selectedSidebarView === "Inactive Vendors") {
      return vendors.filter((v: any) => String(v?.status || "").toLowerCase() === "inactive");
    }

    if (selectedSidebarView === "CRM Vendors") {
      return vendors.filter((v: any) => v?.crmSync === true || v?.formData?.crmSync === true);
    }

    if (selectedSidebarView === "Vendor Portal Enabled") {
      return vendors.filter((v: any) => v?.enablePortal === true || v?.formData?.enablePortal === true);
    }

    if (selectedSidebarView === "Vendor Portal Disabled") {
      return vendors.filter((v: any) => v?.enablePortal !== true && v?.formData?.enablePortal !== true);
    }

    if (selectedSidebarView === "Duplicate Vendors") {
      const nameMap = new Map<string, string>();
      const emailMap = new Map<string, string>();
      const duplicates = new Set<string>();

      vendors.forEach((v: any) => {
        const vendorId = String(v?._id || v?.id || "");
        const name = String(v?.displayName || v?.name || v?.companyName || "").trim().toLowerCase();
        const email = String(v?.email || "").trim().toLowerCase();

        if (name) {
          if (nameMap.has(name)) {
            duplicates.add(String(nameMap.get(name)));
            duplicates.add(vendorId);
          } else {
            nameMap.set(name, vendorId);
          }
        }

        if (email) {
          if (emailMap.has(email)) {
            duplicates.add(String(emailMap.get(email)));
            duplicates.add(vendorId);
          } else {
            emailMap.set(email, vendorId);
          }
        }
      });

      return vendors.filter((v: any) => duplicates.has(String(v?._id || v?.id || "")));
    }

    return vendors;
  };

  const sidebarVendors = getSidebarFilteredVendors();
  const sidebarVendorRows = sidebarVendors.length > 0
    ? sidebarVendors
    : (vendor
      ? [{
          ...vendor,
          id: String(vendor?._id || vendor?.id || id || ""),
          _id: vendor?._id || vendor?.id || id || "",
          name:
            vendor?.displayName ||
            vendor?.name ||
            vendor?.companyName ||
            `${(vendor as any)?.firstName || ""} ${(vendor as any)?.lastName || ""}`.trim() ||
            "Vendor",
        }]
      : []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers((data || []).map((c: any) => ({
          ...c,
          id: String(c._id || c.id),
          _id: c._id || c.id,
          name: c.displayName || c.name || c.companyName || `${c.firstName || ""} ${c.lastName || ""}`.trim()
        })));
      } catch (error) {
      }
    };
    fetchCustomers();
  }, [id, navigate]);

  useEffect(() => {
    const linkedCustomerId = String(vendor?.linkedCustomerId || "").trim();
    if (!linkedCustomerId) {
      setLinkedCustomerSales([]);
      setLinkedCustomerPayments([]);
      setLinkedCustomerQuotes([]);
      setLinkedCustomerCreditNotes([]);
      setLinkedCustomerSalesReceipts([]);
      return;
    }

    let isActive = true;
    const loadLinkedCustomerSales = async () => {
      setIsLinkedCustomerSalesLoading(true);
      try {
        const linkedCustomerName = String(vendor?.linkedCustomerName || "").toLowerCase().trim();
        const matchesLinkedCustomer = (row: any) => {
          const rowCustomerId = String(row.customerId || row.customer?._id || row.customer || "").trim();
          if (rowCustomerId && rowCustomerId === linkedCustomerId) return true;

          const rowCustomerName = String(
            row.customerName || row.customer_name || row.customer?.name || ""
          ).toLowerCase().trim();
          return Boolean(
            linkedCustomerName &&
            rowCustomerName &&
            (rowCustomerName === linkedCustomerName ||
              rowCustomerName.includes(linkedCustomerName) ||
              linkedCustomerName.includes(rowCustomerName))
          );
        };

        const [invoiceByCustomerResponse, allInvoicesResponse, paymentsResponse, quotesResponse, creditNotesResponse, salesReceiptsResponse] = await Promise.all([
          invoicesAPI.getByCustomer(linkedCustomerId).catch(() => null),
          invoicesAPI.getAll().catch(() => ({ data: [] })),
          paymentsReceivedAPI.getByInvoice(linkedCustomerId).catch(() => ({ data: [] })),
          quotesAPI.getAll({ customerId: linkedCustomerId }).catch(() => ({ data: [] })),
          creditNotesAPI.getByCustomer(linkedCustomerId).catch(() => ({ data: [] })),
          salesReceiptsAPI.getAll({ customerId: linkedCustomerId }).catch(() => ({ data: [] }))
        ]);

        let sales = Array.isArray(invoiceByCustomerResponse?.data) ? invoiceByCustomerResponse.data : (Array.isArray(invoiceByCustomerResponse) ? invoiceByCustomerResponse : []);
        if (sales.length === 0) {
          const allInvoices = Array.isArray(allInvoicesResponse?.data)
            ? allInvoicesResponse.data
            : (Array.isArray(allInvoicesResponse) ? allInvoicesResponse : []);
          sales = allInvoices.filter(matchesLinkedCustomer);
        }

        const payments = (Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : (Array.isArray(paymentsResponse) ? paymentsResponse : [])).filter(matchesLinkedCustomer);
        const quotes = (Array.isArray(quotesResponse?.data) ? quotesResponse.data : (Array.isArray(quotesResponse) ? quotesResponse : [])).filter(matchesLinkedCustomer);
        const creditNotes = (Array.isArray(creditNotesResponse?.data) ? creditNotesResponse.data : (Array.isArray(creditNotesResponse) ? creditNotesResponse : [])).filter(matchesLinkedCustomer);
        const salesReceipts = (Array.isArray(salesReceiptsResponse?.data) ? salesReceiptsResponse.data : (Array.isArray(salesReceiptsResponse) ? salesReceiptsResponse : [])).filter(matchesLinkedCustomer);

        if (isActive) {
          setLinkedCustomerSales(sales);
          setLinkedCustomerPayments(payments);
          setLinkedCustomerQuotes(quotes);
          setLinkedCustomerCreditNotes(creditNotes);
          setLinkedCustomerSalesReceipts(salesReceipts);
        }
      } catch (error) {
        if (isActive) {
          setLinkedCustomerSales([]);
          setLinkedCustomerPayments([]);
          setLinkedCustomerQuotes([]);
          setLinkedCustomerCreditNotes([]);
          setLinkedCustomerSalesReceipts([]);
        }
      } finally {
        if (isActive) setIsLinkedCustomerSalesLoading(false);
      }
    };

    loadLinkedCustomerSales();
    return () => {
      isActive = false;
    };
  }, [vendor?.linkedCustomerId, vendor?.linkedCustomerName]);

  useEffect(() => {
    if (activeTab === "sales" && !vendor?.linkedCustomerId) {
      setActiveTab("overview");
    }
  }, [activeTab, vendor?.linkedCustomerId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (invoiceViewDropdownRef.current && !invoiceViewDropdownRef.current.contains(target)) {
        setIsInvoiceViewDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusDropdownOpen(false);
      }
      if (linkEmailDropdownRef.current && !linkEmailDropdownRef.current.contains(target)) {
        setIsLinkEmailDropdownOpen(false);
      }
      if (statementPeriodDropdownRef?.current && !statementPeriodDropdownRef.current.contains(target)) {
        setIsStatementPeriodDropdownOpen(false);
      }
      if (statementFilterDropdownRef?.current && !statementFilterDropdownRef.current.contains(target)) {
        setIsStatementFilterDropdownOpen(false);
      }
      if (bulkActionsDropdownRef.current && !bulkActionsDropdownRef.current.contains(target)) {
        setIsBulkActionsDropdownOpen(false);
      }
      if (startDatePickerRef.current && !startDatePickerRef.current.contains(target)) {
        setIsStartDatePickerOpen(false);
      }
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(target)) {
        setIsEndDatePickerOpen(false);
      }
      if (mergeVendorDropdownRef.current && !mergeVendorDropdownRef.current.contains(target)) {
        setIsMergeVendorDropdownOpen(false);
      }
      // Close contact person dropdowns
      const contactRefs = contactDropdownRefs as any;
      const clickedInsideContactDropdown = Object.values(contactRefs).some((ref: any) =>
        ref?.current && ref.current.contains(target)
      );
      if (!clickedInsideContactDropdown) {
        setOpenContactDropdown(null);
      }
      if (newTransactionDropdownRef.current && !newTransactionDropdownRef.current.contains(target)) {
        setIsNewTransactionDropdownOpen(false);
      }
      if (mailsTypeDropdownRef.current && !mailsTypeDropdownRef.current.contains(target)) {
        setIsMailsTypeDropdownOpen(false);
      }
      if (transactionNavDropdownRef.current && !transactionNavDropdownRef.current.contains(target)) {
        setIsTransactionNavDropdownOpen(false);
      }
      if (attachmentsDropdownRef.current && !attachmentsDropdownRef.current.contains(target)) {
        setIsAttachmentsDropdownOpen(false);
      }
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(target)) {
        setIsUploadDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(target)) {
        setIsMoreDropdownOpen(false);
      }
      if (customerDropdownRef?.current && !customerDropdownRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (isCustomizeDropdownOpen && customizeDropdownRef?.current && !customizeDropdownRef.current.contains(target)) {
        setIsCustomizeDropdownOpen(false);
      }
    };

    if (isInvoiceViewDropdownOpen || isStatusDropdownOpen || isLinkEmailDropdownOpen || isStatementPeriodDropdownOpen || isStatementFilterDropdownOpen || isBulkActionsDropdownOpen || isStartDatePickerOpen || isEndDatePickerOpen || isMergeVendorDropdownOpen || isNewTransactionDropdownOpen || isTransactionNavDropdownOpen || isMailsTypeDropdownOpen || isAttachmentsDropdownOpen || isUploadDropdownOpen || isMoreDropdownOpen || isCustomizeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isInvoiceViewDropdownOpen, isStatusDropdownOpen, isLinkEmailDropdownOpen, isStatementPeriodDropdownOpen, isStatementFilterDropdownOpen, isBulkActionsDropdownOpen, isStartDatePickerOpen, isEndDatePickerOpen, isMergeVendorDropdownOpen, isNewTransactionDropdownOpen, isTransactionNavDropdownOpen, isMailsTypeDropdownOpen, isAttachmentsDropdownOpen, isUploadDropdownOpen, isMoreDropdownOpen, openContactDropdown, isCustomizeDropdownOpen, isCustomerDropdownOpen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleTransactionSection = (section: keyof typeof expandedTransactions) => {
    setExpandedTransactions(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleLinkedCustomerSalesSection = (section: keyof typeof linkedCustomerSalesSections) => {
    setLinkedCustomerSalesSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const transactionNavOptions: Array<{ key: keyof typeof expandedTransactions; label: string }> = [
    { key: "bills", label: "Bills" },
    { key: "paymentsMade", label: "Bill Payments" },
    { key: "expenses", label: "Expenses" },
    { key: "recurringBills", label: "Recurring Bills" },
    { key: "recurringExpenses", label: "Recurring Expenses" },
    { key: "purchaseOrders", label: "Purchase Orders" },
    { key: "vendorCredits", label: "Vendor Credits" },
    { key: "journals", label: "Journals" }
  ];

  const handleTransactionNavSelect = (sectionKey: keyof typeof expandedTransactions, label: string) => {
    setSelectedTransactionType(label);
    setExpandedTransactions(prev => ({ ...prev, [sectionKey]: true }));
    setIsTransactionNavDropdownOpen(false);
    window.requestAnimationFrame(() => {
      transactionSectionRefs.current[sectionKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Vendor selection handlers
  const handleVendorCheckboxChange = (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedVendors([]);
  };

  // Profile Image Upload Handler
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setProfileImage(base64String as string | null);
        if (vendor && id) {
          const updatedVendor = {
            ...vendor,
            profileImage: base64String
          };
          try {
            await vendorsAPI.update(id, updatedVendor);
            // Reload vendor to get updated data from API
            const response = await vendorsAPI.getById(id);
            if (response && response.success && response.data) {
              const vendorData = response.data;
              const mappedVendor = {
                ...vendorData,
                id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
                billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
                billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
                billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
                billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
                billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
                billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
                billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
                billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
                billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
                shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingStreet1 || '',
                shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
                shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
                shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
                shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
                shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
                shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
                shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
                shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
              };
              setVendor(mappedVendor);
            }
            toast.success('Profile image updated successfully');
          } catch (error) {
            toast.error('Failed to update profile image: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Address Modal Save Handler
  const handleAddressSave = async () => {
    if (vendor && id) {
      const updatedVendor = { ...vendor };
      if (addressType === "billing") {
        updatedVendor.billingAddress = {
          attention: addressFormData.attention || '',
          country: addressFormData.country || '',
          street1: addressFormData.addressLine1 || '',
          street2: addressFormData.addressLine2 || '',
          city: addressFormData.city || '',
          state: addressFormData.state || '',
          zipCode: addressFormData.zipCode || '',
          phone: addressFormData.phone || '',
          fax: addressFormData.faxNumber || ''
        };
        // Also keep flat fields for backward compatibility
        updatedVendor.billingAttention = addressFormData.attention;
        updatedVendor.billingCountry = addressFormData.country;
        updatedVendor.billingStreet1 = addressFormData.addressLine1;
        updatedVendor.billingStreet2 = addressFormData.addressLine2;
        updatedVendor.billingCity = addressFormData.city;
        updatedVendor.billingState = addressFormData.state;
        updatedVendor.billingZipCode = addressFormData.zipCode;
        updatedVendor.billingPhone = addressFormData.phone;
        updatedVendor.billingFax = addressFormData.faxNumber;
      } else {
        updatedVendor.shippingAddress = {
          attention: addressFormData.attention || '',
          country: addressFormData.country || '',
          street1: addressFormData.addressLine1 || '',
          street2: addressFormData.addressLine2 || '',
          city: addressFormData.city || '',
          state: addressFormData.state || '',
          zipCode: addressFormData.zipCode || '',
          phone: addressFormData.phone || '',
          fax: addressFormData.faxNumber || ''
        };
        // Also keep flat fields for backward compatibility
        updatedVendor.shippingAttention = addressFormData.attention;
        updatedVendor.shippingCountry = addressFormData.country;
        updatedVendor.shippingStreet1 = addressFormData.addressLine1;
        updatedVendor.shippingStreet2 = addressFormData.addressLine2;
        updatedVendor.shippingCity = addressFormData.city;
        updatedVendor.shippingState = addressFormData.state;
        updatedVendor.shippingZipCode = addressFormData.zipCode;
        updatedVendor.shippingPhone = addressFormData.phone;
        updatedVendor.shippingFax = addressFormData.faxNumber;
      }

      try {
        await vendorsAPI.update(id, updatedVendor);
        // Reload vendor to get updated data from API
        const response = await vendorsAPI.getById(id);
        if (response && response.data) {
          const mappedVendor = {
            ...response.data,
            billingStreet1: response.data.billingAddress?.street1 || response.data.billingStreet1 || '',
            billingStreet2: response.data.billingAddress?.street2 || response.data.billingStreet2 || '',
            billingCity: response.data.billingAddress?.city || response.data.billingCity || '',
            billingState: response.data.billingAddress?.state || response.data.billingState || '',
            billingZipCode: response.data.billingAddress?.zipCode || response.data.billingZipCode || '',
            billingPhone: response.data.billingAddress?.phone || response.data.billingPhone || '',
            billingFax: response.data.billingAddress?.fax || response.data.billingFax || '',
            billingAttention: response.data.billingAddress?.attention || response.data.billingAttention || '',
            billingCountry: response.data.billingAddress?.country || response.data.billingCountry || '',
            shippingStreet1: response.data.shippingAddress?.street1 || response.data.shippingStreet1 || '',
            shippingStreet2: response.data.shippingAddress?.street2 || response.data.shippingStreet2 || '',
            shippingCity: response.data.shippingAddress?.city || response.data.shippingCity || '',
            shippingState: response.data.shippingAddress?.state || response.data.shippingState || '',
            shippingZipCode: response.data.shippingAddress?.zipCode || response.data.shippingZipCode || '',
            shippingPhone: response.data.shippingAddress?.phone || response.data.shippingPhone || '',
            shippingFax: response.data.shippingAddress?.fax || response.data.shippingFax || '',
            shippingAttention: response.data.shippingAddress?.attention || response.data.shippingAttention || '',
            shippingCountry: response.data.shippingAddress?.country || response.data.shippingCountry || ''
          };
          setVendor(mappedVendor);
        }
        setShowAddressModal(false);
        toast.success(`${addressType === "billing" ? "Billing" : "Shipping"} address saved successfully`);
      } catch (error) {
        toast.error('Failed to update address: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const getStatementDates = (period: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
    } else if (period === 'yesterday') {
      start = new Date(now.setDate(now.getDate() - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (period === 'previous-week') {
      const dayVal = now.getDay();
      const diffVal = now.getDate() - dayVal - 6;
      start = new Date(now.setDate(diffVal));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'previous-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'this-quarter') {
      const quarter = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarter, 1);
      end = new Date(now.getFullYear(), quarter + 3, 0);
    } else if (period === 'previous-quarter') {
      const prevQuarter = Math.floor(now.getMonth() / 3) * 3 - 3;
      start = new Date(now.getFullYear(), prevQuarter, 1);
      end = new Date(now.getFullYear(), prevQuarter + 3, 0);
    } else if (period === 'this-year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (period === 'previous-year') {
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
    }

    return { start, end };
  };

  const handleSendEmail = () => {
    const { start, end } = getStatementDates(statementPeriod);
    navigate(`/purchases/vendors/${id}/send-email-statement`, {
      state: {
        type: "vendor",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        filterBy: statementFilter
      }
    });
  };

  // Opening Balance Save Handler
  const handleOpeningBalanceSave = async () => {
    if (vendor && id) {
      const val = parseFloat(openingBalance) || 0;
      const updatedVendor = {
        ...vendor,
        openingBalance: val,
        payables: val
      };
      try {
        await vendorsAPI.update(id, updatedVendor);
        // Reload vendor to get updated data from API
        const response = await vendorsAPI.getById(id);
        if (response && response.success && response.data) {
          const vendorData = response.data;
          const mappedVendor = {
            ...vendorData,
            id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
            billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
            billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
            billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
            billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
            billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
            billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
            billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
            billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
            billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
            shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingAddress?.street1 || '',
            shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
            shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
            shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
            shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
            shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
            shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
            shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
            shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
          };
          setVendor(mappedVendor);
        }
        setIsEditOpeningBalanceModalOpen(false);
        toast.success('Opening balance saved successfully');
      } catch (error) {
        toast.error('Failed to update opening balance: ' + (error.message || 'Unknown error'));
      }
    }
  };

  // Contact Person Save Handler
  const handleContactPersonSave = async () => {
    if (vendor && id) {
      const contactPerson = {
        id: Date.now(),
        salutation: newContactPerson.salutation,
        firstName: newContactPerson.firstName,
        lastName: newContactPerson.lastName,
        email: newContactPerson.email,
        workPhone: newContactPerson.workPhone,
        mobile: newContactPerson.mobile,
        skype: newContactPerson.skype,
        designation: newContactPerson.designation,
        department: newContactPerson.department,
        hasPortalAccess: newContactPerson.enablePortalAccess,
        enablePortal: newContactPerson.enablePortalAccess
      };

      const updatedContactPersons = [...(vendor.contactPersons || []), contactPerson];

      const updatedVendor = {
        ...vendor,
        contactPersons: updatedContactPersons
      };

      try {
        await vendorsAPI.update(id, updatedVendor);
        // Reload vendor to get updated data from API
        const response = await vendorsAPI.getById(id);
        if (response && response.success && response.data) {
          const vendorData = response.data;
          const mappedVendor = {
            ...vendorData,
            id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
            billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
            billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
            billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
            billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
            billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
            billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
            billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
            billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
            billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
            shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingStreet1 || '',
            shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
            shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
            shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
            shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
            shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
            shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
            shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
            shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
          };
          setVendor(mappedVendor);
        }
        setIsAddContactPersonModalOpen(false);
        setNewContactPerson({
          salutation: "Mr",
          firstName: "",
          lastName: "",
          email: "",
          workPhone: "",
          mobile: "",
          skype: "",
          designation: "",
          department: "",
          enablePortalAccess: true
        });
        toast.success('Contact person added successfully');
      } catch (error) {
        toast.error('Failed to add contact person: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleSelectAllCustomers = () => {
    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(vendors.map(v => v.id));
    }
  };

  const handlePrintvendorStatements = () => {
    setIsBulkActionsDropdownOpen(false);
    setIsPrintStatementsModalOpen(true);
  };

  const handlePrintStatementsSubmit = () => {
    setIsPrintStatementsModalOpen(false);

    // Create A4 statement with organization profile data
    const statementData = {
      vendor: vendor,
      organizationProfile: organizationProfile,
      transactions: statementTransactions,
      startDate: printStatementStartDate,
      endDate: printStatementEndDate,
      statementPeriod: statementPeriod
    };

    // Generate and print A4 statement
    generateA4Statement(statementData);
  };

  const handleMergeCustomers = () => {
    setIsBulkActionsDropdownOpen(false);
    setMergeTargetVendor(null);
    setMergeVendorSearch("");
    setIsMergeModalOpen(true);
  };

  const handleMergeSubmit = async () => {
    if (!mergeTargetVendor) {
      alert("Please select a vendor to merge with.");
      return;
    }

    const currentVendorId = String(vendor?.id || vendor?._id || "").trim();
    const targetVendorId = String(mergeTargetVendor?.id || mergeTargetVendor?._id || "").trim();

    if (!targetVendorId) {
      alert("Unable to determine target vendor.");
      return;
    }

    const sourceVendorIds = selectedVendors.length > 0
      ? selectedVendors.filter((sourceId) => String(sourceId) !== targetVendorId)
      : (currentVendorId && currentVendorId !== targetVendorId ? [currentVendorId] : []);

    if (sourceVendorIds.length === 0) {
      alert("Please select different vendors to merge.");
      return;
    }

    try {
      await vendorsAPI.merge(targetVendorId, sourceVendorIds);
      setIsMergeModalOpen(false);
      setMergeTargetVendor(null);
      setMergeVendorSearch("");
      setSelectedVendors([]);
      toast.success(`Vendors merged successfully into ${mergeTargetVendor.name}`);
      navigate(`/purchases/vendors/${targetVendorId}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to merge vendors");
    }
  };

  // Get vendors available for merge (exclude selected vendors)
  const getMergeableVendors = () => {
    const currentVendorId = String(vendor?.id || vendor?._id || "");
    return vendors.filter(v => {
      const candidateId = String(v.id || v._id || "");
      if (!candidateId) return false;
      if (selectedVendors.includes(candidateId)) return false;
      if (candidateId === currentVendorId) return false;
      return true;
    });
  };

  const filteredMergeVendors = getMergeableVendors().filter(v =>
    v.name.toLowerCase().includes(mergeVendorSearch.toLowerCase()) ||
    (v.email && v.email.toLowerCase().includes(mergeVendorSearch.toLowerCase()))
  );

  const handleAssociateTemplates = () => {
    setIsBulkActionsDropdownOpen(false);
    setIsAssociateTemplatesModalOpen(true);
  };

  const handleAssociateTemplatesSave = () => {
    // TODO: Implement actual save functionality
    setIsAssociateTemplatesModalOpen(false);
    alert("Templates associated successfully!");
  };

  const handleTemplateSelect = (category, field, value) => {
    if (category === "pdf") {
      setPdfTemplates(prev => ({ ...prev, [field]: value }));
    } else {
      setEmailNotifications(prev => ({ ...prev, [field]: value }));
    }
    setOpenTemplateDropdown(null);
    setTemplateSearches({});
  };

  const getFilteredTemplateOptions = (options, field) => {
    const search = templateSearches[field] || "";
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const parseFileSize = (sizeStr) => {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    const match = sizeStr.match(/^([\d.]+)\s*(KB|MB|GB|B)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'KB') return value * 1024;
    if (unit === 'MB') return value * 1024 * 1024;
    if (unit === 'GB') return value * 1024 * 1024 * 1024;
    return value;
  };

  const getVendorIdentifier = () =>
    String(vendor?._id || vendor?.id || id || "").trim();

  const normalizeCommentList = (rawComments: any[] = []) =>
    Array.isArray(rawComments)
      ? rawComments.map((comment: any, index: number) => ({
        id: comment?.id || comment?._id || `${Date.now()}-comment-${index}`,
        text: String(comment?.text || "").trim(),
        date: comment?.date || comment?.createdAt || new Date().toISOString(),
        author: comment?.author || "You",
        bold: Boolean(comment?.bold),
        italic: Boolean(comment?.italic),
        underline: Boolean(comment?.underline),
      })).filter((comment: any) => comment.text.length > 0)
      : [];

  const normalizeAttachmentList = (rawDocuments: any[] = []) =>
    Array.isArray(rawDocuments)
      ? rawDocuments.map((doc: any, index: number) => ({
        id: doc?.id || doc?._id || `${Date.now()}-doc-${index}`,
        name: doc?.name || `Attachment ${index + 1}`,
        size: typeof doc?.size === "number" ? doc.size : parseFileSize(doc?.size),
        type: doc?.type || "",
        url: doc?.url || doc?.fileUrl || doc?.base64 || "",
        uploadedAt: doc?.uploadedAt || doc?.createdAt || new Date().toISOString(),
      }))
      : [];

  const buildCommentsPayload = (commentList: any[] = []) =>
    commentList.map((comment: any, index: number) => ({
      id: comment?.id || `${Date.now()}-comment-${index}`,
      text: String(comment?.text || "").trim(),
      date: comment?.date || new Date().toISOString(),
      author: comment?.author || "You",
      bold: Boolean(comment?.bold),
      italic: Boolean(comment?.italic),
      underline: Boolean(comment?.underline),
    })).filter((comment: any) => comment.text.length > 0);

  const buildDocumentsPayload = (attachmentList: any[] = []) =>
    attachmentList.map((attachment: any, index: number) => ({
      id: attachment?.id || `${Date.now()}-attachment-${index}`,
      name: attachment?.name || `Attachment ${index + 1}`,
      url: String(attachment?.url || attachment?.fileUrl || "").trim(),
      size: typeof attachment?.size === "number" ? attachment.size : parseFileSize(attachment?.size),
      type: attachment?.type || "",
      uploadedAt: attachment?.uploadedAt || new Date().toISOString(),
    })).filter((attachment: any) => attachment.url.length > 0);

  const getAttachmentSizeLabel = (attachment: any) =>
    formatFileSize(typeof attachment?.size === "number" ? attachment.size : parseFileSize(attachment?.size));

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });

  const persistVendorMeta = async (nextComments: any[], nextAttachments: any[]) => {
    const vendorId = getVendorIdentifier();
    if (!vendorId) {
      throw new Error("Vendor ID not found.");
    }

    const commentsPayload = buildCommentsPayload(nextComments);
    const documentsPayload = buildDocumentsPayload(nextAttachments);
    const mergedCustomFields = {
      ...((vendor as any)?.customFields || {}),
      vendorComments: commentsPayload,
      vendorDocuments: documentsPayload,
    };

    await vendorsAPI.update(vendorId, {
      comments: commentsPayload,
      documents: documentsPayload,
      customFields: mergedCustomFields,
    });

    setVendor((prev: any) => prev ? ({
      ...prev,
      comments: commentsPayload,
      documents: documentsPayload,
      customFields: mergedCustomFields,
    }) : prev);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const previousAttachments = attachments;
    try {
      const uploadedAttachments = await Promise.all(
        files.map(async (file, index) => ({
          id: `${Date.now()}-${index}`,
          name: file.name.length > 30 ? `${file.name.substring(0, 27)}...` : file.name,
          size: file.size,
          type: file.type || "",
          url: await readFileAsDataUrl(file),
          uploadedAt: new Date().toISOString(),
        }))
      );

      const nextAttachments = [...attachments, ...uploadedAttachments];
      setAttachments(nextAttachments);
      await persistVendorMeta(comments, nextAttachments);
      toast.success(`${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? "s" : ""} uploaded.`);
    } catch (error: any) {
      setAttachments(previousAttachments);
      toast.error(error?.message || "Failed to upload attachment.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAttachment = async (attachmentId: string | number) => {
    const previousAttachments = attachments;
    const nextAttachments = attachments.filter((attachment: any) => attachment.id !== attachmentId);
    setAttachments(nextAttachments);

    try {
      await persistVendorMeta(comments, nextAttachments);
    } catch (error: any) {
      setAttachments(previousAttachments);
      toast.error(error?.message || "Failed to remove attachment.");
    }
  };

  const normalizeCurrencyCode = (value: any) =>
    String(value || baseCurrencyCode || "USD").split(" - ")[0].trim();

  const buildAddressForClone = (sourceAddress: any, fallback: any) => ({
    attention: sourceAddress?.attention || fallback?.attention || "",
    country: sourceAddress?.country || fallback?.country || "",
    street1: sourceAddress?.street1 || fallback?.street1 || "",
    street2: sourceAddress?.street2 || fallback?.street2 || "",
    city: sourceAddress?.city || fallback?.city || "",
    state: sourceAddress?.state || fallback?.state || "",
    zipCode: sourceAddress?.zipCode || fallback?.zipCode || "",
    phone: sourceAddress?.phone || fallback?.phone || "",
    fax: sourceAddress?.fax || fallback?.fax || "",
  });

  const createVendorClone = async () => {
    if (!vendor || isCloningVendor) return;

    const sourceVendor: any = vendor || {};
    const sourceFormData: any = sourceVendor.formData || {};
    const sourceName =
      sourceVendor.displayName
      || sourceVendor.name
      || sourceVendor.companyName
      || `${sourceVendor.firstName || ""} ${sourceVendor.lastName || ""}`.trim()
      || "Vendor";
    const clonedDisplayName = `${sourceName} (Copy)`;

    const clonePayload: any = {
      displayName: clonedDisplayName,
      name: clonedDisplayName,
      vendorType:
        sourceVendor.vendorType
        || sourceFormData.vendorType
        || ((sourceVendor.companyName || sourceFormData.companyName) ? "business" : "individual"),
      salutation: sourceVendor.salutation || sourceFormData.salutation || "",
      firstName: sourceVendor.firstName || sourceFormData.firstName || "",
      lastName: sourceVendor.lastName || sourceFormData.lastName || "",
      companyName: sourceVendor.companyName || sourceFormData.companyName || "",
      email: sourceVendor.email || sourceFormData.email || "",
      workPhone: sourceVendor.workPhone || sourceFormData.workPhone || "",
      mobile: sourceVendor.mobile || sourceFormData.mobile || "",
      websiteUrl: sourceVendor.websiteUrl || sourceVendor.website || sourceFormData.websiteUrl || sourceFormData.website || "",
      xHandle: sourceVendor.xHandle || sourceFormData.xHandle || sourceFormData.xSocial || "",
      skypeName: sourceVendor.skypeName || sourceFormData.skypeName || "",
      facebook: sourceVendor.facebook || sourceFormData.facebook || "",
      vendorLanguage:
        sourceVendor.vendorLanguage
        || sourceVendor.portalLanguage
        || sourceFormData.vendorLanguage
        || sourceFormData.portalLanguage
        || "english",
      taxRate: sourceVendor.taxRate || sourceFormData.taxRate || "",
      enableTDS: Boolean(sourceVendor.enableTDS ?? sourceFormData.enableTDS),
      companyId: sourceVendor.companyId || sourceFormData.companyId || "",
      locationCode: sourceVendor.locationCode || sourceFormData.locationCode || "",
      currency: normalizeCurrencyCode(sourceVendor.currency || sourceFormData.currency),
      paymentTerms: sourceVendor.paymentTerms || sourceFormData.paymentTerms || "Due on Receipt",
      department: sourceVendor.department || sourceFormData.department || "",
      designation: sourceVendor.designation || sourceFormData.designation || "",
      accountsPayable:
        sourceVendor.accountsPayable
        || sourceVendor.accountPayable
        || sourceFormData.accountsPayable
        || sourceFormData.accountPayable
        || "",
      openingBalance: sourceVendor.openingBalance ?? sourceFormData.openingBalance ?? "0.00",
      enablePortal: Boolean(sourceVendor.enablePortal ?? sourceFormData.enablePortal),
      remarks: sourceVendor.remarks || sourceFormData.remarks || "",
      notes: sourceVendor.notes || sourceFormData.notes || "",
      linkedCustomerId: null,
      linkedCustomerName: null,
      billingAddress: buildAddressForClone(sourceVendor.billingAddress, {
        attention: sourceVendor.billingAttention || sourceFormData.billingAttention,
        country: sourceVendor.billingCountry || sourceFormData.billingCountry,
        street1: sourceVendor.billingStreet1 || sourceFormData.billingStreet1,
        street2: sourceVendor.billingStreet2 || sourceFormData.billingStreet2,
        city: sourceVendor.billingCity || sourceFormData.billingCity,
        state: sourceVendor.billingState || sourceFormData.billingState,
        zipCode: sourceVendor.billingZipCode || sourceFormData.billingZipCode,
        phone: sourceVendor.billingPhone || sourceFormData.billingPhone,
        fax: sourceVendor.billingFax || sourceFormData.billingFax,
      }),
      shippingAddress: buildAddressForClone(sourceVendor.shippingAddress, {
        attention: sourceVendor.shippingAttention || sourceFormData.shippingAttention,
        country: sourceVendor.shippingCountry || sourceFormData.shippingCountry,
        street1: sourceVendor.shippingStreet1 || sourceFormData.shippingStreet1,
        street2: sourceVendor.shippingStreet2 || sourceFormData.shippingStreet2,
        city: sourceVendor.shippingCity || sourceFormData.shippingCity,
        state: sourceVendor.shippingState || sourceFormData.shippingState,
        zipCode: sourceVendor.shippingZipCode || sourceFormData.shippingZipCode,
        phone: sourceVendor.shippingPhone || sourceFormData.shippingPhone,
        fax: sourceVendor.shippingFax || sourceFormData.shippingFax,
      }),
      contactPersons: Array.isArray(sourceVendor.contactPersons)
        ? sourceVendor.contactPersons
          .filter((cp: any) => (cp?.firstName || "").trim() || (cp?.lastName || "").trim())
          .map((cp: any) => ({
            salutation: cp?.salutation || "",
            firstName: cp?.firstName || "",
            lastName: cp?.lastName || "",
            email: cp?.email || "",
            workPhone: cp?.workPhone || "",
            mobile: cp?.mobile || "",
            designation: cp?.designation || "",
            department: cp?.department || "",
            skypeName: cp?.skypeName || "",
            isPrimary: Boolean(cp?.isPrimary),
          }))
        : [],
      documents: Array.isArray(sourceVendor.documents)
        ? sourceVendor.documents.map((doc: any) => ({
          name: doc?.name || "Document",
          url: doc?.url || doc?.fileUrl || doc?.base64 || "",
          uploadedAt: doc?.uploadedAt || new Date(),
        }))
        : [],
    };

    try {
      setIsCloningVendor(true);
      const cloneResponse = await vendorsAPI.create(clonePayload);

      const clonedVendorId =
        cloneResponse?.data?._id
        || cloneResponse?.data?.id
        || cloneResponse?._id
        || cloneResponse?.id;

      window.dispatchEvent(new Event("vendorSaved"));

      if (clonedVendorId) {
        toast.success("Vendor cloned successfully");
        navigate(`/purchases/vendors/${clonedVendorId}`);
        return;
      }

      toast.success("Vendor cloned successfully, but it could not be opened automatically.");
      navigate("/purchases/vendors");
    } catch (error: any) {
      toast.error(error?.message || "Failed to clone vendor.");
    } finally {
      setIsCloningVendor(false);
    }
  };

  const handleClone = () => {
    setIsMoreDropdownOpen(false);
    setCloneContactType("vendor");
    void createVendorClone();
  };

  // const handleAssociateTemplates = () => {
  //   setIsMoreDropdownOpen(false);
  //   setIsAssociateTemplatesModalOpen(true);
  // };

  const handleConfigurePortal = () => {
    setIsMoreDropdownOpen(false);
    // Initialize portal access contacts from vendor contact persons
    const contacts = vendor.contactPersons?.map(contact => ({
      id: contact.id || Date.now() + Math.random(),
      name: `${contact.salutation ? `${contact.salutation}. ` : ''}${contact.firstName} ${contact.lastName}`,
      email: contact.email || '',
      hasAccess: contact.hasPortalAccess || false
    })) || [];
    // If no contact persons, add vendor as a contact
    if (contacts.length === 0 && vendor.name) {
      contacts.push({
        id: 'vendor-main',
        name: vendor.name,
        email: vendor.email || '',
        hasAccess: vendor.enablePortal || false
      });
    }
    setPortalAccessContacts(contacts);
    setIsConfigurePortalModalOpen(true);
  };

  const handleMergeVendors = () => {
    setIsMoreDropdownOpen(false);
    setMergeTargetVendor(null);
    setMergeVendorSearch("");
    setIsMergeVendorDropdownOpen(false);
    setIsMergeModalOpen(true);
  };

  const handleLinkToCustomer = () => {
    setIsMoreDropdownOpen(false);
    const currentLinkedCustomerId = String(vendor?.linkedCustomerId || "").trim();
    const preselectedCustomer = customers.find((c: any) => String(c.id || c._id) === currentLinkedCustomerId) || null;
    setSelectedCustomer(preselectedCustomer);
    setCustomerSearch("");
    setIsLinkToCustomerModalOpen(true);
  };

  const handleUnlinkCustomer = async () => {
    setIsMoreDropdownOpen(false);
    if (!vendor) return;

    const vendorId = String(vendor._id || vendor.id || "").trim();
    const linkedCustomerId = String(vendor.linkedCustomerId || "").trim();
    const vendorName = vendor.name || vendor.displayName || vendor.companyName || "Vendor";

    if (!vendorId || !linkedCustomerId) {
      toast.error("No linked customer found for this vendor.");
      return;
    }

    try {
      setIsSavingLinkedCustomer(true);

      await vendorsAPI.update(vendorId, {
        linkedCustomerId: null,
        linkedCustomerName: null
      });

      await customersAPI.update(linkedCustomerId, {
        linkedVendorId: null,
        linkedVendorName: null
      });

      setVendor((prev: any) => prev ? ({
        ...prev,
        linkedCustomerId: null,
        linkedCustomerName: null
      }) : prev);

      toast.success(`Vendor "${vendorName}" unlinked from customer`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to unlink customer");
    } finally {
      setIsSavingLinkedCustomer(false);
    }
  };

  const handleCloneSubmit = async () => {
    setIsCloneModalOpen(false);
    await createVendorClone();
  };

  const isVendorActive = (v: any) =>
    String(v?.status || "").toLowerCase() === "active" || v?.isActive === true;

  const setVendorActiveStatus = async (makeActive: boolean) => {
    const targetVendorId = String(vendor?.id || vendor?._id || id || "").trim();
    if (!targetVendorId) {
      toast.error("Vendor ID not found. Please refresh and try again.");
      return;
    }

    const status = makeActive ? "active" : "inactive";
    const previousVendor = vendor;
    const previousVendors = vendors;

    setVendor((prev: any) => prev ? ({ ...prev, status, isActive: makeActive, isInactive: !makeActive }) : prev);
    setVendors((prev: any[]) => prev.map((v: any) => {
      const rowId = String(v?.id || v?._id || "");
      if (!rowId) return v;
      return rowId === targetVendorId
        ? ({ ...v, status, isActive: makeActive, isInactive: !makeActive })
        : v;
    }));

    try {
      await vendorsAPI.update(targetVendorId, { status });
      toast.success(`Vendor marked as ${status} successfully`);
    } catch (error: any) {
      setVendor(previousVendor as any);
      setVendors(previousVendors as any[]);
      toast.error(error?.message || "Failed to update vendor status");
    }
  };

  const formatDateForDisplay = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calendar helper functions
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const renderCalendar = (calendarMonth, selectedDate, onSelectDate, onPrevMonth, onNextMonth) => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(calendarMonth);
    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    const isSelected = (date) => {
      return selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
    };

    const isToday = (date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
    };

    return (
      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer" onClick={onPrevMonth}>Â«</button>
          <span className="text-sm font-semibold text-gray-900">{months[month]} {year}</span>
          <button className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer" onClick={onNextMonth}>Â»</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-xs font-medium text-gray-600 text-center py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayObj, index) => (
            <button
              key={index}
              className={`w-8 h-8 text-xs rounded cursor-pointer transition-colors ${!dayObj.isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'
                } ${isSelected(dayObj.date) ? 'bg-[#156372] text-white hover:bg-[#0D4A52]' : ''
                } ${isToday(dayObj.date) && !isSelected(dayObj.date) ? 'bg-blue-100 text-teal-800 font-semibold' : ''
                }`}
              onClick={() => onSelectDate(dayObj.date)}
            >
              {dayObj.day}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Filter and paginate bills
  const getFilteredBills = () => {
    let filtered = bills;

    // Apply search filter
    if (billSearchTerm) {
      const searchLower = billSearchTerm.toLowerCase();
      filtered = filtered.filter(bill =>
        (bill.billNumber || "").toLowerCase().includes(searchLower) ||
        (bill.orderNumber || "").toLowerCase().includes(searchLower) ||
        (bill.id || "").toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (billStatusFilter !== "all") {
      filtered = filtered.filter(bill =>
        (bill.status || "draft").toLowerCase() === billStatusFilter.toLowerCase()
      );
    }

    return filtered;
  };

  const filteredBills = getFilteredBills();
  const totalPages = Math.ceil(filteredBills.length / billsPerPage);
  const startIndex = (billCurrentPage - 1) * billsPerPage;
  const endIndex = startIndex + billsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, endIndex);
  const getBillDetailId = (bill: any) => bill?._id || bill?.id || bill?.billId || bill?.bill_id || "";
  const openBillDetail = (bill: any) => {
    const billId = getBillDetailId(bill);
    if (!billId) return;
    navigate(`/purchases/bills/${billId}`);
  };
  const purchasesTabLabel = "Transactions";
  const goToPurchasesText = "Go to transactions";

  const formatCurrency = (amount, currency?: string) => {
    const resolvedCode = String(currency || baseCurrencyCode || "USD").split(" - ")[0].trim();
    return `${resolvedCode}${parseFloat(amount || 0).toFixed(2)}`;
  };

  const handleAddComment = async () => {
    const trimmedComment = commentText.trim();
    if (!trimmedComment) return;

    const previousComments = comments;
    const newComment = {
      id: Date.now(),
      text: trimmedComment,
      date: new Date().toISOString(),
      author: "You",
      bold: false,
      italic: false,
      underline: false,
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    setCommentText("");

    try {
      await persistVendorMeta(nextComments, attachments);
    } catch (error: any) {
      setComments(previousComments);
      setCommentText(trimmedComment);
      toast.error(error?.message || "Failed to save comment.");
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    const previousComments = comments;
    const nextComments = comments.filter((comment: any) => comment.id !== commentId);
    setComments(nextComments);

    try {
      await persistVendorMeta(nextComments, attachments);
    } catch (error: any) {
      setComments(previousComments);
      toast.error(error?.message || "Failed to delete comment.");
    }
  };

  const applyFormatting = (format) => {
    // Simple text formatting implementation
    const textarea = document.getElementById("comment-textarea");
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = commentText.substring(start, end);
      let formattedText = "";

      if (format === "bold") {
        formattedText = `**${selectedText}**`;
      } else if (format === "italic") {
        formattedText = `*${selectedText}*`;
      } else if (format === "underline") {
        formattedText = `__${selectedText}__`;
      }

      const newText = commentText.substring(0, start) + formattedText + commentText.substring(end);
      setCommentText(newText);

      // Reset cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }, 0);
    }
  };

  const generateA4Statement = (data) => {
    const { vendor, organizationProfile, transactions, startDate, endDate, statementPeriod } = data;

    // Create A4-sized content
    const statementContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Vendor Statement - ${vendor.displayName || vendor.name}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #156372;
            padding-bottom: 20px;
          }
          .logo {
            width: 120px;
            height: 60px;
            object-fit: contain;
          }
          .company-info {
            text-align: right;
            font-size: 11px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #156372;
            margin-bottom: 5px;
          }
          .address {
            margin-bottom: 3px;
          }
          .statement-title {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            color: #156372;
          }
          .vendor-info {
            margin-bottom: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
          }
          .period-info {
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
          }
          .transactions-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .transactions-table th {
            background: #156372;
            color: white;
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
          }
          .transactions-table td {
            padding: 8px 10px;
            border: 1px solid #ddd;
          }
          .transactions-table .amount {
            text-align: right;
          }
          .balance-row {
            font-weight: bold;
            background: #f0f0f0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${organizationProfile?.logo ? `<img src="${organizationProfile.logo}" alt="Logo" class="logo">` : ''}
          </div>
          <div class="company-info">
            <div class="company-name">${organizationProfile?.name || 'Company Name'}</div>
            ${organizationProfile?.address ? `
              <div class="address">${organizationProfile.address.street1 || ''}</div>
              ${organizationProfile.address.street2 ? `<div class="address">${organizationProfile.address.street2}</div>` : ''}
              ${organizationProfile.address.city ? `<div class="address">${organizationProfile.address.city}, ${organizationProfile.address.state || ''} ${organizationProfile.address.zipCode || ''}</div>` : ''}
              ${organizationProfile.address.country ? `<div class="address">${organizationProfile.address.country}</div>` : ''}
            ` : ''}
            ${organizationProfile?.email ? `<div class="address">Email: ${organizationProfile.email}</div>` : ''}
            ${organizationProfile?.phone ? `<div class="address">Phone: ${organizationProfile.phone}</div>` : ''}
          </div>
        </div>
        
        <div class="statement-title">VENDOR STATEMENT</div>
        
        <div class="vendor-info">
          <strong>Vendor:</strong> ${vendor.displayName || vendor.name || 'N/A'}<br>
          ${vendor.companyName ? `<strong>Company:</strong> ${vendor.companyName}<br>` : ''}
          ${vendor.email ? `<strong>Email:</strong> ${vendor.email}<br>` : ''}
          ${vendor.workPhone || vendor.mobile ? `<strong>Phone:</strong> ${vendor.workPhone || vendor.mobile}<br>` : ''}
          ${vendor.billingStreet1 ? `<strong>Address:</strong> ${vendor.billingStreet1}${vendor.billingStreet2 ? ', ' + vendor.billingStreet2 : ''}, ${vendor.billingCity || ''} ${vendor.billingState || ''} ${vendor.billingZipCode || ''}` : ''}
        </div>
        
        <div class="period-info">
          Statement Period: ${statementPeriod === 'this-month' ? 'This Month' : statementPeriod === 'last-month' ? 'Last Month' : statementPeriod === 'this-quarter' ? 'This Quarter' : statementPeriod === 'this-year' ? 'This Year' : 'Custom'}<br>
          ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}
        </div>
        
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th class="amount">Debit</th>
              <th class="amount">Credit</th>
              <th class="amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(transaction => `
              <tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.type}</td>
                <td>${transaction.description || transaction.number || ''}</td>
                <td class="amount">${transaction.debit ? transaction.debit.toFixed(2) : ''}</td>
                <td class="amount">${transaction.credit ? transaction.credit.toFixed(2) : ''}</td>
                <td class="amount">${transaction.balance.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          This is a computer-generated statement. No signature required.<br>
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </body>
      </html>`;

    // Create a new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(statementContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: purchasesTheme.secondary }}></div>
          <div className="text-lg text-gray-600">Loading vendor...</div>
        </div>
      </div>
    );
  }

  // Show error state if vendor is not available after loading
  if (!vendor) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="text-red-600 text-lg font-semibold">Vendor not found</div>
          <button
            onClick={() => navigate("/purchases/vendors")}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 font-medium"
            style={{ background: purchasesTheme.secondary }}
          >
            Go to Vendor List
          </button>
        </div>
      </div>
    );
  }

  // Ensure vendor has required fields
  if (!vendor.id && !vendor._id && !vendor.displayName && !vendor.name) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="text-yellow-600 text-lg font-semibold">Invalid vendor data</div>
          <button
            onClick={() => navigate("/purchases/vendors")}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 font-medium"
            style={{ background: purchasesTheme.secondary }}
          >
            Go to Vendor List
          </button>
        </div>
      </div>
    );
  }

  const primaryContact = vendor.contactPersons?.[0] || null;
  const displayName = vendor.displayName || vendor.name || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.companyName || 'Vendor';

  return (
    <div className="w-full h-screen flex bg-white overflow-hidden">
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Vendors"
        fieldOptions={vendorFieldOptions}
        onUpdate={handleBulkUpdateSubmit}
        entityName="vendors"
      />

      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-screen overflow-hidden">
        {selectedVendors.length > 0 ? (
          <>
            {/* Bulk Selection Header */}
            <div className="mx-3 mt-3 mb-2 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedVendors.length === vendors.length}
                  onChange={handleSelectAllCustomers}
                  className="w-4 h-4 cursor-pointer shrink-0"
                />
                <div className="h-6 w-px bg-gray-200 shrink-0" />
                <div className="relative" ref={bulkActionsDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                    onClick={() => setIsBulkActionsDropdownOpen(!isBulkActionsDropdownOpen)}
                  >
                    Bulk Actions
                    <ChevronDown size={14} />
                  </button>
                  {isBulkActionsDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
                      <div
                        className="px-4 py-2 text-sm text-teal-700 font-medium cursor-pointer hover:bg-teal-50"
                        onClick={() => {
                          setIsBulkActionsDropdownOpen(false);
                          setShowBulkUpdateModal(true);
                        }}
                      >
                        Bulk Update
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={handlePrintvendorStatements}
                      >
                        Print Vendor Statements
                      </div>
                      <div className="h-px bg-gray-200 my-1"></div>
                      <div className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Mark as Active
                      </div>
                      <div className="px-4 py-2 text-sm text-teal-700 font-medium cursor-pointer hover:bg-teal-50">
                        Mark as Inactive
                      </div>
                      <div
                        className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setIsMoreDropdownOpen(false);
                          handleMergeVendors();
                        }}
                      >
                        Merge
                      </div>
                      <div className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50">
                        Delete
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-6 w-px bg-gray-200 shrink-0" />
                <span className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-[#eaf2ff] text-sm font-semibold text-[#4b88f5]">
                  {selectedVendors.length}
                </span>
                <span className="text-sm text-gray-700 whitespace-nowrap">Selected</span>
                <button
                  className="p-1 text-red-500 hover:text-red-600 cursor-pointer"
                  onClick={handleClearSelection}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Normal Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
              <div className="relative" ref={sidebarViewDropdownRef}>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[15px] font-semibold cursor-pointer ${isSidebarViewDropdownOpen ? "bg-[#f3f4ff]" : "bg-transparent"} text-gray-900`}
                  onClick={() => setIsSidebarViewDropdownOpen((prev) => !prev)}
                >
                  <span>{selectedSidebarView}</span>
                  <ChevronDown
                    size={15}
                    className={`text-[#2563eb] transition-transform ${isSidebarViewDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isSidebarViewDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                    <div className="py-2">
                      {sidebarViewOptions.map((view) => (
                        <button
                          key={view}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedSidebarView(view);
                            setIsSidebarViewDropdownOpen(false);
                          }}
                        >
                          <span
                            className={selectedSidebarView === view ? "rounded-xl border-2 border-[#3b82f6] px-3 py-1 text-[#374151]" : ""}
                          >
                            {view}
                          </span>
                          <Star size={15} className="text-gray-300" />
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 px-4 py-3 text-[15px] text-gray-500">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 cursor-pointer hover:text-[#2563eb]"
                        onClick={() => setIsSidebarViewDropdownOpen(false)}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#2563eb] text-white text-[12px] leading-none">+</span>
                        <span>New Custom View</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md text-white cursor-pointer shadow-sm"
                  style={{ background: purchasesTheme.primary }}
                  onClick={() => navigate("/purchases/vendors/new")}
                >
                  <Plus size={16} />
                </button>
                <button className="w-8 h-8 inline-flex items-center justify-center border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 rounded-md cursor-pointer shadow-sm">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </>
        )}
        <div className="flex-1 overflow-y-auto">
          {sidebarVendorRows.map((vend) => (
            <div
              key={vend.id}
              className={`flex items-center gap-3 py-3 pr-3 pl-5 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${vend.id === id ? "border-l-4" : ""}`}
              style={vend.id === id ? { background: '#f0fdfa', borderLeftColor: purchasesTheme.secondary } : selectedVendors.includes(vend.id) ? { background: '#ccfbf1' } : {}}
              onClick={() => navigate(`/purchases/vendors/${vend.id}`)}
            >
              <input
                type="checkbox"
                checked={selectedVendors.includes(vend.id)}
                onChange={(e) => handleVendorCheckboxChange(vend.id, e)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{vend.name}</div>
                <div className="text-xs text-gray-600">
                  {formatCurrency(vend.payables, vend.currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Hidden when vendors are selected */}
        {selectedVendors.length === 0 && (
          <div className="px-6 pt-6 pb-2 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-gray-900">{displayName}</h1>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/purchases/vendors/${id}/edit`)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-all active:scale-95"
                >
                  Edit
                </button>

                <div className="relative" ref={attachmentsDropdownRef}>
                  <button
                    className="flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-md text-gray-600 cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsAttachmentsDropdownOpen(!isAttachmentsDropdownOpen)}
                  >
                    <Paperclip size={16} />
                    {attachments.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-teal-700 text-white text-[10px] leading-4 text-center font-semibold">
                        {attachments.length > 99 ? "99+" : attachments.length}
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileUpload}
                  />
                  {isAttachmentsDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-900">Attachments</span>
                        <button
                          className="text-xs text-teal-700 font-medium hover:underline"
                          onClick={handleUploadClick}
                        >
                          Upload Files
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {attachments.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-gray-500">No attachments yet.</div>
                        ) : (
                          attachments.map((file: any) => (
                            <div key={file.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-gray-400 shrink-0" />
                                <button
                                  type="button"
                                  className="text-xs text-gray-700 truncate hover:underline text-left"
                                  onClick={() => {
                                    const fileUrl = String(file?.url || "").trim();
                                    if (fileUrl) {
                                      window.open(fileUrl, "_blank", "noopener,noreferrer");
                                    }
                                  }}
                                >
                                  {file.name}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-gray-400">{getAttachmentSizeLabel(file)}</span>
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-red-600"
                                  onClick={() => { void handleRemoveAttachment(file.id); }}
                                  title="Remove attachment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={newTransactionDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-4 py-1.5 text-white rounded-md text-[13px] font-bold shadow-sm hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => setIsNewTransactionDropdownOpen(!isNewTransactionDropdownOpen)}
                  >
                    New Transaction
                    <ChevronDown size={14} />
                  </button>
                  {isNewTransactionDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">PURCHASES</div>
                      {[
                        { label: 'Bill', path: '/purchases/bills/new' },
                        { label: 'Payment Made', path: '/purchases/payments-made/new' },
                        { label: 'Purchase Order', path: '/purchases/purchase-orders/new' },
                        { label: 'Recurring Bill', path: '/PURCHASES/recurring-Bills/new' },
                        { label: 'Expense', path: '/purchases/expenses/new' },
                        { label: 'Recurring Expense', path: '/purchases/recurring-expenses/new' },
                        { label: 'Journal', path: '/accountant/manual-journals/new' },
                        { label: 'Vendor Credit', path: '/purchases/vendor-credits/new' },
                        { label: 'PURCHASES Receipt', path: '/PURCHASES/PURCHASES-receipts/new' },
                        { label: 'Project', path: '/projects/new' }
                      ].map(item => (
                        <div
                          key={item.label}
                          className="px-4 py-2 text-[13px] text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setIsNewTransactionDropdownOpen(false);
                            navigate(item.path, { state: { vendorId: vendor?.id, vendorName: vendor?.name } });
                          }}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={moreDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-all active:scale-95"
                    onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  >
                    More
                    <ChevronDown size={14} />
                  </button>
                  {isMoreDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={handleConfigurePortal}
                      >
                        Configure Vendor Portal
                      </button>
                      <button
                        className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
                          areRemindersStopped
                            ? "text-gray-700 hover:bg-gray-50"
                            : "text-blue-600 font-medium hover:bg-blue-50"
                        }`}
                        onClick={() => {
                          setIsMoreDropdownOpen(false);
                          setAreRemindersStopped(!areRemindersStopped);
                        }}
                      >
                        {areRemindersStopped ? "Enable All Reminders" : "Stop All Reminders"}
                      </button>
                      {vendor?.linkedCustomerId ? (
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={handleUnlinkCustomer}
                        >
                          Unlink Customer
                        </button>
                      ) : (
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={handleLinkToCustomer}
                        >
                          Link to Customer
                        </button>
                      )}
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={handleClone}
                      >
                        Clone
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={handleMergeVendors}
                      >
                        Merge Vendors
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={async () => {
                          setIsMoreDropdownOpen(false);
                          const isCurrentlyActive = isVendorActive(vendor);
                          await setVendorActiveStatus(!isCurrentlyActive);
                        }}
                      >
                        {isVendorActive(vendor) ? "Mark as Inactive" : "Mark as Active"}
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                        onClick={() => {
                          setIsMoreDropdownOpen(false);
                          const shouldDelete = window.confirm("Are you sure you want to delete this vendor?");
                          if (shouldDelete) {
                            navigate("/purchases/vendors");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/purchases/vendors')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {[
                { label: "Overview", key: "overview" },
                { label: "Comments", key: "comments" },
                { label: purchasesTabLabel, key: "transactions" },
                ...(vendor?.linkedCustomerId ? [{ label: "Sales", key: "sales" }] : []),
                { label: "Mails", key: "mails" },
                { label: "Statement", key: "statement" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`px-4 py-2 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                    ? ""
                    : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  style={activeTab === tab.key ? { color: purchasesTheme.secondary, borderColor: purchasesTheme.secondary } : {}}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="flex-1 overflow-y-auto pl-6 pt-6 pb-6 pr-0" style={{ paddingRight: 0, marginRight: 0 }}>
            <div className="flex gap-6" style={{ marginRight: 0 }}>
              {/* Left Column */}
              <div className="w-80 flex-shrink-0">
                {/* Vendor Information Card */}
                <div className="mb-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-4">
                      {/* Left side - User Icon */}
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User size={24} className="text-gray-600" />
                      </div>

                      {/* Right side - Vendor Information */}
                      <div className="flex-1 min-w-0">
                        {/* Name with Settings Icon */}
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-base font-semibold text-gray-900">{displayName}</h2>
                          <Settings size={16} className="text-gray-600 flex-shrink-0" />
                        </div>

                        {/* Email Address */}
                        {vendor.email && (
                          <div className="text-sm text-gray-600 mb-1">
                            {vendor.email}
                          </div>
                        )}

                        {/* Portal Status */}
                        <div className="text-sm mb-1" style={{ color: vendor.enablePortal ? "#059669" : "#f97316" }}>
                          {vendor.enablePortal ? "Portal enabled" : "Portal not enabled"}
                        </div>

                        {/* Invite/View Portal Link */}
                        {vendor.enablePortal ? (
                          <a
                            href="#"
                            className="text-sm hover:underline"
                            style={{ color: purchasesTheme.secondary }}
                            onClick={(e) => {
                              e.preventDefault();
                              // Handle view portal action
                            }}
                          >
                            View Portal
                          </a>
                        ) : (
                          <a
                            href="#"
                            className="text-sm hover:underline"
                            style={{ color: purchasesTheme.secondary }}
                            onClick={(e) => {
                              e.preventDefault();
                              // Handle invite action
                            }}
                          >
                            Invite
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">ADDRESS</span>
                    <button
                      onClick={() => toggleSection("address")}
                      className="p-1 cursor-pointer"
                      style={{ color: "#60a5fa" }}
                    >
                      {expandedSections.address ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {expandedSections.address && (
                    <div className="p-4 space-y-4">
                      {/* Billing Address */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-sm font-semibold text-gray-900">Billing Address:</strong>
                          {(vendor.billingAddress?.street1 || vendor.billingStreet1 || vendor.billingAddress?.city || vendor.billingCity) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setAddressType("billing");
                                const billingAddr = vendor.billingAddress || {};
                                setAddressFormData({
                                  attention: billingAddr.attention ?? vendor.billingAttention ?? "",
                                  country: billingAddr.country ?? vendor.billingCountry ?? "",
                                  addressLine1: billingAddr.street1 ?? vendor.billingStreet1 ?? "",
                                  addressLine2: billingAddr.street2 ?? vendor.billingStreet2 ?? "",
                                  city: billingAddr.city ?? vendor.billingCity ?? "",
                                  state: billingAddr.state ?? vendor.billingState ?? "",
                                  zipCode: billingAddr.zipCode ?? vendor.billingZipCode ?? "",
                                  phone: billingAddr.phone ?? vendor.billingPhone ?? "",
                                  faxNumber: billingAddr.fax ?? vendor.billingFax ?? "",
                                });
                                setShowAddressModal(true);
                              }}
                              className="p-1 text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                        {(vendor.billingAddress?.street1 || vendor.billingStreet1 || vendor.billingAddress?.city || vendor.billingCity) ? (
                          <div className="text-sm text-gray-700 space-y-1">
                            {(vendor.billingAddress?.street1 || vendor.billingStreet1) && <div className="font-semibold">{vendor.billingAddress?.street1 || vendor.billingStreet1}</div>}
                            {(vendor.billingAddress?.street2 || vendor.billingStreet2) && <div>{vendor.billingAddress?.street2 || vendor.billingStreet2}</div>}
                            {(vendor.billingAddress?.city || vendor.billingCity) && <div>{vendor.billingAddress?.city || vendor.billingCity}</div>}
                            {(vendor.billingAddress?.state || vendor.billingState) && <div>{vendor.billingAddress?.state || vendor.billingState}</div>}
                            {(vendor.billingAddress?.zipCode || vendor.billingZipCode) && <div>{vendor.billingAddress?.zipCode || vendor.billingZipCode}</div>}
                            {(vendor.billingAddress?.country || vendor.billingCountry) && <div>{vendor.billingAddress?.country || vendor.billingCountry}</div>}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">No Billing Address</div>
                        )}
                      </div>

                      {/* Shipping Address */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-sm font-semibold text-gray-900">Shipping Address:</strong>
                          {(vendor.shippingAddress?.street1 || vendor.shippingStreet1 || vendor.shippingAddress?.city || vendor.shippingCity) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setAddressType("shipping");
                                const shippingAddr = vendor.shippingAddress || {};
                                setAddressFormData({
                                  attention: shippingAddr.attention ?? vendor.shippingAttention ?? "",
                                  country: shippingAddr.country ?? vendor.shippingCountry ?? "",
                                  addressLine1: shippingAddr.street1 ?? vendor.shippingStreet1 ?? "",
                                  addressLine2: shippingAddr.street2 ?? vendor.shippingStreet2 ?? "",
                                  city: shippingAddr.city ?? vendor.shippingCity ?? "",
                                  state: shippingAddr.state ?? vendor.shippingState ?? "",
                                  zipCode: shippingAddr.zipCode ?? vendor.shippingZipCode ?? "",
                                  phone: shippingAddr.phone ?? vendor.shippingPhone ?? "",
                                  faxNumber: shippingAddr.fax ?? vendor.shippingFax ?? "",
                                });
                                setShowAddressModal(true);
                              }}
                              className="p-1 text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                        {(vendor.shippingAddress?.street1 || vendor.shippingStreet1 || vendor.shippingAddress?.city || vendor.shippingCity) ? (
                          <div className="text-sm text-gray-700 space-y-1">
                            {(vendor.shippingAddress?.street1 || vendor.shippingStreet1) && <div className="font-semibold">{vendor.shippingAddress?.street1 || vendor.shippingStreet1}</div>}
                            {(vendor.shippingAddress?.street2 || vendor.shippingStreet2) && <div>{vendor.shippingAddress?.street2 || vendor.shippingStreet2}</div>}
                            {(vendor.shippingAddress?.city || vendor.shippingCity) && <div>{vendor.shippingAddress?.city || vendor.shippingCity}</div>}
                            {(vendor.shippingAddress?.state || vendor.shippingState) && <div>{vendor.shippingAddress?.state || vendor.shippingState}</div>}
                            {(vendor.shippingAddress?.zipCode || vendor.shippingZipCode) && <div>{vendor.shippingAddress?.zipCode || vendor.shippingZipCode}</div>}
                            {(vendor.shippingAddress?.country || vendor.shippingCountry) && <div>{vendor.shippingAddress?.country || vendor.shippingCountry}</div>}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">No Shipping Address</div>
                        )}
                      </div>

                      {/* Additional Addresses */}
                      {vendor.additionalAddresses && vendor.additionalAddresses.length > 0 && vendor.additionalAddresses.map((addr, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <strong className="text-sm font-semibold text-gray-900">Additional Address:</strong>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Handle delete additional address
                                  const updatedAddresses = vendor.additionalAddresses.filter((_, i) => i !== index);
                                  // Update vendor with new addresses array
                                }}
                                className="p-1 text-gray-600 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setAddressType("additional");
                                  setAddressFormData({
                                    attention: addr.attention || "",
                                    country: addr.country || "",
                                    addressLine1: addr.street1 || addr.addressLine1 || "",
                                    addressLine2: addr.street2 || addr.addressLine2 || "",
                                    city: addr.city || "",
                                    state: addr.state || "",
                                    zipCode: addr.zipCode || "",
                                    phone: addr.phone || "",
                                    faxNumber: addr.fax || "",
                                  });
                                  setShowAddressModal(true);
                                }}
                                className="p-1 text-gray-600 hover:text-gray-900 cursor-pointer"
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            {(addr.street1 || addr.addressLine1) && <div className="font-semibold">{addr.street1 || addr.addressLine1}</div>}
                            {(addr.street2 || addr.addressLine2) && <div>{addr.street2 || addr.addressLine2}</div>}
                            {addr.city && <div>{addr.city}</div>}
                            {addr.state && <div>{addr.state}</div>}
                            {addr.zipCode && <div>{addr.zipCode}</div>}
                            {addr.country && <div>{addr.country}</div>}
                          </div>
                        </div>
                      ))}

                      {/* Add Additional Address Link */}
                      <a
                        href="#"
                        className="text-sm text-teal-700 hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          setAddressType("additional");
                          setAddressFormData({
                            attention: "",
                            country: "",
                            addressLine1: "",
                            addressLine2: "",
                            city: "",
                            state: "",
                            zipCode: "",
                            phone: "",
                            faxNumber: "",
                          });
                          setShowAddressModal(true);
                        }}
                      >
                        Add additional address
                      </a>
                    </div>
                  )}
                </div>

                {/* Other Details Section */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">OTHER DETAILS</span>
                    <button
                      onClick={() => toggleSection("otherDetails")}
                      className="p-1 cursor-pointer"
                      style={{ color: "#60a5fa" }}
                    >
                      {expandedSections.otherDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {expandedSections.otherDetails && (
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Default Currency:</span>
                        {!isCurrencyEditing ? (
                          <div
                            className="relative flex items-center gap-2 cursor-pointer"
                            onMouseEnter={() => setIsCurrencyHovered(true)}
                            onMouseLeave={() => setIsCurrencyHovered(false)}
                            onClick={() => {
                              setIsCurrencyEditing(true);
                              setCurrencyValue(vendor.currency || baseCurrencyCode || "USD");
                            }}
                          >
                            <span className="text-sm font-semibold text-gray-900">{vendor.currency || baseCurrencyCode || "USD"}</span>
                            {isCurrencyHovered && (
                              <Edit size={14} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="relative" ref={currencyDropdownRef}>
                              <select
                                value={currencyValue}
                                onChange={(e) => setCurrencyValue(e.target.value)}
                                className="px-3 py-1.5 text-sm font-semibold text-gray-900 bg-white border border-[#156372] rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 appearance-none pr-8"
                                autoFocus
                              >
                                {currencies.map((currency) => (
                                  <option key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                            <button
                              onClick={async () => {
                                if (vendor && id) {
                                  const updatedVendor = {
                                    ...vendor,
                                    currency: currencyValue
                                  };
                                  try {
                                    await vendorsAPI.update(id, updatedVendor);
                                    setVendor(updatedVendor);
                                    toast.success('Currency updated successfully');
                                  } catch (error) {
                                    toast.error('Failed to update vendor: ' + (error.message || 'Unknown error'));
                                  }
                                }
                                setIsCurrencyEditing(false);
                              }}
                              className="p-1.5 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition-colors"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setIsCurrencyEditing(false);
                                setCurrencyValue(vendor.currency || baseCurrencyCode || "USD");
                              }}
                              className="p-1.5 bg-pink-200 text-red-600 rounded cursor-pointer hover:bg-pink-300 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Portal Status:</span>
                        <div
                          className="flex items-center gap-1"
                          onMouseEnter={() => setIsPortalStatusHovered(true)}
                          onMouseLeave={() => setIsPortalStatusHovered(false)}
                        >
                          <span className={`w-2 h-2 rounded-full ${vendor.enablePortal ? "bg-green-500" : "bg-[#156372]"}`}></span>
                          <span className={vendor.enablePortal ? "text-green-600" : "text-red-600"}>
                            {vendor.enablePortal ? "Enabled" : "Disabled"}
                          </span>
                          {isPortalStatusHovered && (
                            <button
                              onClick={() => {
                                handleConfigurePortal();
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer ml-1"
                            >
                              <Settings size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Vendor Language:</span>
                        {!isLanguageEditing ? (
                          <div
                            className="relative flex items-center gap-2 cursor-pointer"
                            onMouseEnter={() => setIsLanguageHovered(true)}
                            onMouseLeave={() => setIsLanguageHovered(false)}
                            onClick={() => {
                              setIsLanguageEditing(true);
                              setLanguageValue(vendor.vendorLanguage || vendor.portalLanguage || "english");
                            }}
                          >
                            <span className="text-sm font-semibold text-gray-900">
                              {(vendor.vendorLanguage || vendor.portalLanguage || "english").charAt(0).toUpperCase() + (vendor.vendorLanguage || vendor.portalLanguage || "english").slice(1)}
                            </span>
                            {isLanguageHovered && (
                              <Edit size={14} className="text-gray-500 cursor-pointer hover:text-gray-700" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="relative" ref={languageDropdownRef}>
                              <select
                                value={languageValue}
                                onChange={(e) => setLanguageValue(e.target.value)}
                                className="px-3 py-1.5 text-sm font-semibold text-gray-900 bg-white border border-[#156372] rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 appearance-none pr-8"
                                autoFocus
                              >
                                <option value="english">English</option>
                                <option value="spanish">Spanish</option>
                                <option value="french">French</option>
                                <option value="german">German</option>
                                <option value="italian">Italian</option>
                                <option value="portuguese">Portuguese</option>
                                <option value="chinese">Chinese</option>
                                <option value="japanese">Japanese</option>
                                <option value="korean">Korean</option>
                                <option value="arabic">Arabic</option>
                                <option value="hindi">Hindi</option>
                              </select>
                              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                            <button
                              onClick={async () => {
                                if (vendor && id) {
                                  const updatedVendor = {
                                    ...vendor,
                                    vendorLanguage: languageValue,
                                    portalLanguage: languageValue
                                  };
                                  try {
                                    await vendorsAPI.update(id, updatedVendor);
                                    setVendor(updatedVendor);
                                    toast.success('Language updated successfully');
                                  } catch (error) {
                                    toast.error('Failed to update vendor: ' + (error.message || 'Unknown error'));
                                  }
                                }
                                setIsLanguageEditing(false);
                              }}
                              className="p-1.5 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 transition-colors"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setIsLanguageEditing(false);
                                setLanguageValue(vendor.vendorLanguage || vendor.portalLanguage || "english");
                              }}
                              className="p-1.5 bg-pink-200 text-red-600 rounded cursor-pointer hover:bg-pink-300 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Persons Section */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CONTACT PERSONS</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 rounded cursor-pointer transition-all"
                        style={{ color: "#60a5fa" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "rgba(96, 165, 250, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                        onClick={() => setIsAddContactPersonModalOpen(true)}
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => toggleSection("contactPersons")}
                        className="p-1 cursor-pointer"
                        style={{ color: "#60a5fa" }}
                      >
                        {expandedSections.contactPersons ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  {expandedSections.contactPersons && (
                    <div className="p-4">
                      {vendor.contactPersons && vendor.contactPersons.length > 0 ? (
                        <div className="space-y-3">
                          {vendor.contactPersons.map((contact, index) => (
                            <div key={index} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 flex items-start justify-between group">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {contact.salutation && `${contact.salutation}. `}
                                  {contact.firstName} {contact.lastName}
                                </div>
                                {contact.email && (
                                  <div className="text-sm text-gray-600">{contact.email}</div>
                                )}
                                {contact.designation && (
                                  <div className="text-xs text-gray-500 mt-1">{contact.designation}</div>
                                )}
                              </div>
                              <div className="relative ml-2" ref={el => contactDropdownRefs.current[index] = el}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenContactDropdown(openContactDropdown === index ? null : index);
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Settings"
                                >
                                  <Settings size={16} />
                                </button>
                                {openContactDropdown === index && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                                    <button
                                      onClick={() => {
                                        setEditContactData({
                                          salutation: contact.salutation || "",
                                          firstName: contact.firstName || "",
                                          lastName: contact.lastName || "",
                                          email: contact.email || "",
                                          workPhone: contact.workPhone || "",
                                          mobile: contact.mobile || "",
                                          skypeName: contact.skypeName || "",
                                          designation: contact.designation || "",
                                          department: contact.department || ""
                                        });
                                        setEditingContactIndex(index);
                                        setIsEditContactModalOpen(true);
                                        setOpenContactDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-sm text-gray-700 text-left hover:bg-teal-50 hover:text-teal-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm("Are you sure you want to delete this contact person?")) {
                                          const updatedContactPersons = vendor.contactPersons.filter((_, i) => i !== index);
                                          const updatedVendor = {
                                            ...vendor,
                                            contactPersons: updatedContactPersons,
                                            formData: {
                                              ...vendor.formData,
                                              contactPersons: updatedContactPersons
                                            }
                                          };
                                          try {
                                            await vendorsAPI.update(id, updatedVendor);
                                            // Reload vendor to get updated data from API
                                            const response = await vendorsAPI.getById(id);
                                            if (response && response.success && response.data) {
                                              const vendorData = response.data;
                                              const mappedVendor = {
                                                ...vendorData,
                                                id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
                                                billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
                                                billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
                                                billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
                                                billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
                                                billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
                                                billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
                                                billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
                                                billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
                                                billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
                                                shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingStreet1 || '',
                                                shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
                                                shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
                                                shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
                                                shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
                                                shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
                                                shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
                                                shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
                                                shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
                                              };
                                              setVendor(mappedVendor);
                                            }
                                            setOpenContactDropdown(null);
                                            toast.success('Contact person deleted successfully');
                                          } catch (error) {
                                            toast.error('Failed to delete contact person: ' + (error.message || 'Unknown error'));
                                          }
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-sm text-red-600 text-left hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-4">No contact persons found.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Vendor Portal Section */}
                {!vendor.enablePortal && (
                  <div className="mb-6 bg-teal-50 rounded-lg border border-blue-200 p-4 flex gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-teal-700 flex-shrink-0">
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 mb-3">Vendor Portal allows your customers to keep track of all the transactions between them and your business. <a href="#" className="hover:underline transition-colors" style={{ color: "#156372" }} onMouseEnter={(e) => e.target.style.color = "#0D4A52"} onMouseLeave={(e) => e.target.style.color = "#156372"}>Learn More</a></p>
                      <button
                        className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                        onClick={async () => {
                          if (vendor && id) {
                            const updatedVendor = {
                              ...vendor,
                              enablePortal: true
                            };
                            try {
                              await vendorsAPI.update(id, updatedVendor);
                              // Reload vendor to get updated data from API
                              const response = await vendorsAPI.getById(id);
                              if (response && response.success && response.data) {
                                const vendorData = response.data;
                                const mappedVendor = {
                                  ...vendorData,
                                  id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
                                  billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
                                  billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
                                  billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
                                  billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
                                  billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
                                  billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
                                  billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
                                  billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
                                  billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
                                  shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingAddress?.street1 || '',
                                  shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
                                  shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
                                  shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
                                  shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
                                  shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
                                  shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
                                  shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
                                  shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
                                };
                                setVendor(mappedVendor);
                              }
                              toast.success('Vendor portal enabled successfully');
                            } catch (error) {
                              toast.error('Failed to enable portal: ' + (error.message || 'Unknown error'));
                            }
                          }
                        }}
                      >Enable Portal</button>
                    </div>
                  </div>
                )}

                {/* Record Info Section */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">RECORD INFO</span>
                    <button
                      onClick={() => toggleSection("recordInfo")}
                      className="p-1 cursor-pointer"
                      style={{ color: "#60a5fa" }}
                    >
                      {expandedSections.recordInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {expandedSections.recordInfo && (
                    <div className="p-4 space-y-3">
                      <div className="flex flex-col">
                        <span className="text-sm mb-1" style={{ color: "#94a3b8" }}>Vendor ID:</span>
                        <span className="text-sm font-medium text-gray-900">{vendor.id || vendor._id || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm mb-1" style={{ color: "#94a3b8" }}>Created On:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm mb-1" style={{ color: "#94a3b8" }}>Created By:</span>
                        <span className="text-sm font-medium text-gray-900">{(vendor.createdBy || "System").toUpperCase()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="flex-1 min-w-0">

                {/* Payment Terms */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment due period</span>
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {vendor.paymentTerms === "due-on-receipt" ? "Due on Receipt" : vendor.paymentTerms || "Due on Receipt"}
                    </div>
                  </div>
                </div>

                {/* Payables Section */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PAYABLES</span>
                  </div>
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">CURRENCY</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">OUTSTANDING PAYABLES</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">UNUSED CREDITS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">
                            {vendor.currency ? (
                              vendor.currency.includes("-") ? vendor.currency :
                                `${vendor.currency} - ${(currencies.find(c => c.code === vendor.currency)?.name) || vendor.currency}`
                            ) : `${baseCurrencyCode || "USD"} - Base Currency`}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(vendor.payables || 0, vendor.currency || baseCurrencyCode)}</td>
                          <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(vendor.unusedVendorCredits || 0, vendor.currency || baseCurrencyCode)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          // Get current opening balance from vendor
                          // Try to extract from openingBalance field, or calculate from payables if not available
                          let currentOpeningBalance = vendor.formData?.openingBalance || vendor.openingBalance;
                          if (!currentOpeningBalance && vendor.payables) {
                            // If payables is a string like "SOS77.00", extract the number
                            const payablesStr = vendor.payables.toString();
                            const payablesMatch = payablesStr.match(/[\d.]+/);
                            if (payablesMatch) {
                              const payablesValue = parseFloat(payablesMatch[0]);
                              // Reverse calculate: opening = payables - bills + payments + credits
                              const billsTotal = bills.reduce((sum, bill) => sum + parseFloat(bill.total || bill.amount || 0), 0);
                              const paymentsTotal = paymentsMade.reduce((sum, p) => sum + parseFloat(p.amountPaid || p.amount || 0), 0);
                              const creditsTotal = vendorCredits.reduce((sum, vc) => sum + parseFloat(vc.total || vc.amount || 0), 0);
                              currentOpeningBalance = (payablesValue - billsTotal + paymentsTotal + creditsTotal).toString();
                            }
                          }
                          setOpeningBalance((currentOpeningBalance || "0").toString());
                          setIsEditOpeningBalanceModalOpen(true);
                        }}
                        className="text-sm hover:underline transition-colors"
                        style={{ color: "#156372" }}
                        onMouseEnter={(e) => e.target.style.color = "#0D4A52"}
                        onMouseLeave={(e) => e.target.style.color = "#156372"}
                      >
                        Enter Opening Balance
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Expenses</span>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50">
                          Last 6 Months
                          <ChevronDown size={14} />
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50">
                          Accrual
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-4">
                      This chart is displayed in the organization's base currency.
                    </p>
                    <div className="h-48 bg-gray-50 rounded-md flex flex-col items-center justify-center mb-4">
                      <TrendingUp size={48} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No Expenses data available</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900 pt-4 border-t border-gray-200">
                      Total Expenses (Last 6 Months) - {formatCurrency(0, vendor.currency || baseCurrencyCode)}
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="mb-6 bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity Timeline</span>
                  </div>
                  <div className="p-4">
                    <div className="relative" style={{ paddingLeft: "20px" }}>
                      {/* Timeline vertical line */}
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-[#156372]"></div>

                      {/* Timeline entries */}
                      <div className="space-y-6">
                        {/* Sample activity entries - you can replace with actual data */}
                        {expenses.length > 0 && expenses.slice(0, 3).map((expense, index) => {
                          const expenseDate = new Date(expense.date || expense.createdAt || new Date());
                          const formattedDate = expenseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          const formattedTime = expenseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          return (
                            <div key={index} className="relative">
                              {/* Timeline circle */}
                              <div className="absolute left-[-18px] top-1 w-3 h-3 bg-[#156372] rounded-full border-2 border-white"></div>
                              <div className="text-xs font-semibold text-gray-900 mb-1">
                                {formattedDate}, {formattedTime}
                              </div>
                              <div className="text-xs text-gray-600 mb-1">Expense added</div>
                              <div className="text-xs text-gray-500">
                                Expense of amount {formatCurrency(expense.amount || 0, expense.currency || vendor.currency || baseCurrencyCode)} created by {expense.createdBy || "System"} - <a href="#" className="text-teal-700 hover:underline">View Details</a>
                              </div>
                            </div>
                          );
                        })}
                        {vendor.contactPersons && vendor.contactPersons.length > 0 && vendor.contactPersons.slice(0, 2).map((contact, index) => {
                          const contactDate = new Date(contact.createdAt || new Date());
                          const formattedDate = contactDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          const formattedTime = contactDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          return (
                            <div key={`contact-${index}`} className="relative">
                              <div className="absolute left-[-18px] top-1 w-3 h-3 bg-[#156372] rounded-full border-2 border-white"></div>
                              <div className="text-xs font-semibold text-gray-900 mb-1">
                                {formattedDate}, {formattedTime}
                              </div>
                              <div className="text-xs text-gray-600 mb-1">Contact person added</div>
                              <div className="text-xs text-gray-500">
                                Contact person {contact.firstName} {contact.lastName} has been created by {contact.createdBy || "System"}
                              </div>
                            </div>
                          );
                        })}
                        {expenses.length === 0 && (!vendor.contactPersons || vendor.contactPersons.length === 0) && (
                          <div className="text-xs text-gray-500 text-center py-4">No activities yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "comments" && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Comment Editor */}
            <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex gap-2 mb-4 pb-4 border-b border-gray-200">
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  onClick={() => applyFormatting("bold")}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  onClick={() => applyFormatting("italic")}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
                  onClick={() => applyFormatting("underline")}
                  title="Underline"
                >
                  <Underline size={16} />
                </button>
              </div>
              <textarea
                id="comment-textarea"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 resize-y mb-4"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows="6"
              />
              <button
                className="px-4 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                style={{ background: purchasesTheme.primary }}
                onClick={handleAddComment}
              >
                Add Comment
              </button>
            </div>

            {/* Comments List */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">ALL COMMENTS</h3>
              {comments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No comments yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-900 mb-3 whitespace-pre-wrap">
                        {comment.text}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <button
                          className="p-1 text-gray-500 hover:text-red-600 cursor-pointer"
                          onClick={() => handleDeleteComment(comment.id)}
                          title="Delete comment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="relative inline-block mb-4" ref={transactionNavDropdownRef}>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => setIsTransactionNavDropdownOpen((prev) => !prev)}
              >
                {selectedTransactionType ? selectedTransactionType : goToPurchasesText}
                <ChevronDown size={16} />
              </button>
              {isTransactionNavDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-40 py-1">
                  {transactionNavOptions.map((option) => (
                    <button
                      key={option.key}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                        selectedTransactionType === option.label ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => handleTransactionNavSelect(option.key, option.label)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isTransactionsLoading && (
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Loading transactions in the background...
              </div>
            )}

            {/* Bills Section */}
            <div ref={(el) => { transactionSectionRefs.current.bills = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.bills ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.bills ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("bills")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.bills ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Bills</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.bills && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <div className="relative" ref={statusDropdownRef}>
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                        >
                          Status: {billStatusFilter === "all" ? "All" : billStatusFilter.charAt(0).toUpperCase() + billStatusFilter.slice(1)}
                          <ChevronDown size={14} />
                        </button>
                        {isStatusDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                            {["all", "draft", "open", "sent", "paid", "overdue"].map((status) => (
                              <div
                                key={status}
                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${billStatusFilter === status ? "bg-teal-50 text-teal-700" : "text-gray-700"}`}
                                onClick={() => {
                                  setBillStatusFilter(status);
                                  setIsStatusDropdownOpen(false);
                                  setBillCurrentPage(1);
                                }}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/bills/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>

              {expandedTransactions.bills && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">
                            <button className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 text-inherit font-inherit">DATE <ArrowUpDown size={14} /></button>
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Bill#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">ORDER NUMBER</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BALANCE DUE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBills.length > 0 ? (
                          paginatedBills.map((bill) => (
                            <tr
                              key={getBillDetailId(bill) || bill.billNumber || `${bill.date || "bill"}-${bill.orderNumber || "row"}`}
                              onClick={() => openBillDetail(bill)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openBillDetail(bill);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 text-gray-900">
                                {bill.date || bill.invoiceDate
                                  ? new Date(bill.date || bill.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4 text-gray-900">
                                <button
                                  type="button"
                                  className="bg-transparent border-none p-0 text-teal-700 no-underline font-medium hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openBillDetail(bill);
                                  }}
                                >
                                  {bill.invoiceNumber || bill.id}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-gray-900">{bill.orderNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(bill.total || bill.amount || 0, bill.currency || vendor?.currency || baseCurrencyCode)}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(bill.balance || bill.total || bill.amount || 0, bill.currency || vendor?.currency || baseCurrencyCode)}</td>
                              <td className="py-3 px-4 text-gray-900">
                                <span
                                  className="px-2 py-1 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor:
                                      bill.status === "paid" ? "#d1fae5" :
                                        bill.status === "overdue" ? "#fee2e2" :
                                          bill.status === "sent" ? "#dbeafe" :
                                            bill.status === "open" ? "#fef3c7" :
                                              "transparent",
                                    color:
                                      bill.status === "paid" ? "#10b981" :
                                        bill.status === "overdue" ? "#156372" :
                                          bill.status === "sent" ? "#156372" :
                                            bill.status === "open" ? "#f59e0b" :
                                              "#9ca3af"
                                  }}
                                >
                                  {bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : "Draft"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Bills - <button
                                className="text-teal-700 no-underline font-medium hover:underline cursor-pointer"
                                onClick={() => navigate("/purchases/bills/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                              >Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {filteredBills.length > 0 && (
                      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-700">
                          Total Count: <span className="text-teal-700 cursor-pointer hover:underline">View</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setBillCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={billCurrentPage === 1}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-sm text-gray-700 px-2">
                            {startIndex + 1} - {Math.min(endIndex, filteredBills.length)} of {filteredBills.length}
                          </span>
                          <button
                            className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setBillCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={billCurrentPage === totalPages}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bill Payments Section */}
            <div ref={(el) => { transactionSectionRefs.current.paymentsMade = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.paymentsMade ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.paymentsMade ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("paymentsMade")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.paymentsMade ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Bill Payments</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.paymentsMade && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/payments-made/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.paymentsMade && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PAYMENT#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Bill#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">MODE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsMade.length > 0 ? (
                          paymentsMade.map((payment) => (
                            <tr
                              key={payment.id}
                              onClick={() => navigate(`/purchases/payments-made/${payment.id}`)}
                              className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 text-gray-900">
                                {payment.paymentDate || payment.date
                                  ? new Date(payment.paymentDate || payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4 text-gray-900">
                                <span className="text-teal-700 no-underline font-medium hover:underline">
                                  {payment.paymentNumber || payment.id}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-900">{payment.referenceNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{payment.invoiceNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{payment.paymentMode || payment.mode || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(payment.amountPaid || payment.amount || 0, payment.currency || vendor?.currency || baseCurrencyCode)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no payments made - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/payments-made/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>


            {/* Expenses Section */}
            <div ref={(el) => { transactionSectionRefs.current.expenses = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.expenses ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.expenses ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("expenses")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.expenses ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Expenses</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.expenses && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/expenses/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.expenses && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">EXPENSE#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">EXPENSE ACCOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">VENDOR NAME</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length > 0 ? (
                          expenses.map((expense) => (
                            <tr
                              key={expense.id}
                              onClick={() => navigate(`/purchases/expenses/${expense.id}`)}
                              className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 text-gray-900">
                                {expense.date ? new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                              </td>
                              <td className="py-3 px-4 text-teal-700 font-medium">{expense.expenseNumber || expense.id}</td>
                              <td className="py-3 px-4 text-gray-900">{expense.accountName || expense.expenseAccount || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{expense.vendorName || vendor?.name || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(expense.amount || 0, expense.currency || vendor?.currency || baseCurrencyCode)}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${expense.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {expense.status ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1) : "Draft"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Expenses - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/expenses/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Orders Section */}
            <div ref={(el) => { transactionSectionRefs.current.purchaseOrders = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.purchaseOrders ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.purchaseOrders ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("purchaseOrders")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.purchaseOrders ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Purchase Orders</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.purchaseOrders && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/purchase-orders/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.purchaseOrders && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PURCHASE ORDER#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE NUMBER</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">VENDOR NAME</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.length > 0 ? (
                          purchaseOrders.map((po) => (
                            <tr
                              key={po.id}
                              onClick={() => navigate(`/purchases/purchase-orders/${po.id}`)}
                              className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 text-gray-900">
                                {po.date ? new Date(po.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                              </td>
                              <td className="py-3 px-4 text-teal-700 font-medium">{po.purchaseOrderNumber || po.id}</td>
                              <td className="py-3 px-4 text-gray-900">{po.referenceNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{po.vendorName || vendor?.name || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(po.total || po.amount || 0, po.currency || vendor?.currency || baseCurrencyCode)}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${po.status === 'open' ? 'bg-blue-100 text-teal-800' : 'bg-gray-100 text-gray-700'}`}>
                                  {po.status ? po.status.charAt(0).toUpperCase() + po.status.slice(1) : "Draft"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Purchase Orders - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/purchase-orders/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Vendor Credits Section */}
            <div ref={(el) => { transactionSectionRefs.current.vendorCredits = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.vendorCredits ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.vendorCredits ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("vendorCredits")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.vendorCredits ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Vendor Credits</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.vendorCredits && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/vendor-credits/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.vendorCredits && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">VENDOR CREDIT#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Bill#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">BALANCE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorCredits.length > 0 ? (
                          vendorCredits.map((credit) => (
                            <tr key={credit.id} className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{new Date(credit.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td className="py-3 px-4 text-teal-700 font-medium">{credit.creditNumber}</td>
                              <td className="py-3 px-4 text-gray-900">{credit.billNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(credit.total || 0, credit.currency || vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(credit.balance || 0, credit.currency || vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">
                                  {credit.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Vendor Credits - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/vendor-credits/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            {/* Recurring Bills Section */}
            <div ref={(el) => { transactionSectionRefs.current.recurringBills = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.recurringBills ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.recurringBills ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("recurringBills")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.recurringBills ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Recurring Bills</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.recurringBills && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/recurring-bills/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.recurringBills && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROFILE NAME</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">FREQUENCY</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LAST Bill DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">NEXT Bill DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recurringBills.length > 0 ? (
                          recurringBills.map((bill) => (
                            <tr key={bill.id} className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{bill.profileName}</td>
                              <td className="py-3 px-4 text-gray-900">{bill.frequency}</td>
                              <td className="py-3 px-4 text-gray-900">{bill.lastBillDate || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{bill.nextBillDate || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(bill.amount || 0, bill.currency || vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">{bill.status || "Active"}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Recurring Bills - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/recurring-bills/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Recurring Expenses Section */}
            <div ref={(el) => { transactionSectionRefs.current.recurringExpenses = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.recurringExpenses ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.recurringExpenses ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("recurringExpenses")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.recurringExpenses ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Recurring Expenses</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.recurringExpenses && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/recurring-expenses/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.recurringExpenses && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROFILE NAME</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">FREQUENCY</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">LAST EXPENSE DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">NEXT EXPENSE DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recurringExpenses.length > 0 ? (
                          recurringExpenses.map((expense) => (
                            <tr key={expense.id} className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{expense.profileName}</td>
                              <td className="py-3 px-4 text-gray-900">{expense.frequency}</td>
                              <td className="py-3 px-4 text-gray-900">{expense.lastExpenseDate || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{expense.nextExpenseDate || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(expense.amount || 0, expense.currency || vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">{expense.status || "Active"}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Recurring Expenses - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/recurring-expenses/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Journals Section */}
            <div ref={(el) => { transactionSectionRefs.current.journals = el; }} className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.journals ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.journals ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("journals")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.journals ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Journals</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.journals && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/accountant/journals/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.journals && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">JOURNAL#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">REFERENCE#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">NOTES</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journals.length > 0 ? (
                          journals.map((journal) => (
                            <tr key={journal.id} className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{journal.date}</td>
                              <td className="py-3 px-4 text-teal-700 font-medium">{journal.journalNumber || journal.id}</td>
                              <td className="py-3 px-4 text-gray-900">{journal.referenceNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{journal.notes || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(journal.amount || 0, journal.currency || vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">{journal.status || "Published"}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Journals - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/accountant/journals/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Projects Section */}
            <div className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.projects ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.projects ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("projects")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.projects ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Projects</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.projects && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/projects/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.projects && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PROJECT NAME</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">ESTIMATED COST</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">ACTUAL COST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.length > 0 ? (
                          projects.map((project) => (
                            <tr key={project.id} className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{project.projectName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {(project.status || 'Active').toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(project.estimatedCost || 0, vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(project.actualCost || 0, vendor?.currency)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Projects - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/projects/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Receipts Section */}
            <div className={`mb-4 border border-gray-200 rounded-lg ${expandedTransactions.purchaseReceipts ? "bg-white" : "bg-gray-50"}`}>
              <div
                className={`flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer ${expandedTransactions.purchaseReceipts ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
                onClick={() => toggleTransactionSection("purchaseReceipts")}
              >
                <div className="flex items-center gap-2">
                  {expandedTransactions.purchaseReceipts ? (
                    <ChevronDown size={16} className="text-gray-600" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">Purchase Receipts</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {expandedTransactions.purchaseReceipts && (
                    <>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer">
                        <Filter size={16} />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                        Status: All
                        <ChevronDown size={14} />
                      </button>
                    </>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                    style={{ background: purchasesTheme.primary }}
                    onClick={() => navigate("/purchases/purchase-receipts/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}
                  >
                    <Plus size={16} />
                    New
                  </button>
                </div>
              </div>
              {expandedTransactions.purchaseReceipts && (
                <div className="p-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">DATE</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">RECEIPT#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">PURCHASE ORDER#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">AMOUNT</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseReceipts.length > 0 ? (
                          purchaseReceipts.map((receipt) => (
                            <tr key={receipt.id} className="border-b border-gray-200 transition-colors cursor-pointer hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">
                                {receipt.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                              </td>
                              <td className="py-3 px-4 text-teal-700 font-medium">{receipt.receiptNumber || receipt.id}</td>
                              <td className="py-3 px-4 text-gray-900">{receipt.purchaseOrderNumber || "-"}</td>
                              <td className="py-3 px-4 text-gray-900">{formatCurrency(receipt.total || receipt.amount || 0, receipt.currency || vendor?.currency)}</td>
                              <td className="py-3 px-4 text-gray-900">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 uppercase">{receipt.status || "Received"}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="py-8 px-4 text-center text-sm text-gray-500">
                              There are no Purchase Receipts - <button className="text-teal-700 no-underline font-medium hover:underline cursor-pointer" onClick={() => navigate("/purchases/purchase-receipts/new", { state: { vendorId: vendor?.id, vendorName: vendor?.name } })}>Add New</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {
          activeTab === "sales" && (
            <div className="flex-1 overflow-y-auto p-6">
              <button className="flex items-center gap-2 px-4 py-2 mb-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
                Go to purchases
                <ChevronDown size={16} />
              </button>

              {isLinkedCustomerSalesLoading ? (
                <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-sm text-gray-500 text-center">
                  Loading linked customer transactions...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100" onClick={() => toggleLinkedCustomerSalesSection("invoices")}>
                      {linkedCustomerSalesSections.invoices ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      Invoices
                    </button>
                    {linkedCustomerSalesSections.invoices && (
                      <div className="bg-white border-t border-gray-200 overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Invoice#</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Balance Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedCustomerSales.length > 0 ? linkedCustomerSales.map((invoice: any, index: number) => {
                              const invoiceId = String(invoice._id || invoice.id || "");
                              return (
                                <tr key={invoiceId || `invoice-${index}`} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => invoiceId && navigate(`/sales/invoices/${invoiceId}`)}>
                                  <td className="py-3 px-4 text-gray-900">{invoice.date || invoice.invoiceDate ? new Date(invoice.date || invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</td>
                                  <td className="py-3 px-4 text-teal-700 font-medium">{invoice.invoiceNumber || invoiceId || "-"}</td>
                                  <td className="py-3 px-4 text-gray-900">{formatCurrency(invoice.total || invoice.amount || 0, invoice.currency || baseCurrencyCode || vendor?.currency)}</td>
                                  <td className="py-3 px-4 text-gray-900">{formatCurrency(invoice.balance || invoice.balanceDue || invoice.total || invoice.amount || 0, invoice.currency || baseCurrencyCode || vendor?.currency)}</td>
                                </tr>
                              );
                            }) : <tr><td colSpan={4} className="py-6 px-4 text-center text-sm text-gray-500">No invoices found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100" onClick={() => toggleLinkedCustomerSalesSection("customerPayments")}>
                      {linkedCustomerSalesSections.customerPayments ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      Customer Payments
                    </button>
                    {linkedCustomerSalesSections.customerPayments && (
                      <div className="bg-white border-t border-gray-200 overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Payment#</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedCustomerPayments.length > 0 ? linkedCustomerPayments.map((payment: any, index: number) => {
                              const paymentId = String(payment._id || payment.id || "");
                              return (
                                <tr key={paymentId || `customer-payment-${index}`} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer">
                                  <td className="py-3 px-4 text-gray-900">{payment.paymentDate || payment.date ? new Date(payment.paymentDate || payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</td>
                                  <td className="py-3 px-4 text-teal-700 font-medium">{payment.paymentNumber || paymentId || "-"}</td>
                                  <td className="py-3 px-4 text-gray-900">{formatCurrency(payment.amountReceived || payment.amount || 0, payment.currency || baseCurrencyCode || vendor?.currency)}</td>
                                </tr>
                              );
                            }) : <tr><td colSpan={3} className="py-6 px-4 text-center text-sm text-gray-500">No customer payments found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100" onClick={() => toggleLinkedCustomerSalesSection("quotes")}>
                      {linkedCustomerSalesSections.quotes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      Quotes
                    </button>
                    {linkedCustomerSalesSections.quotes && (
                      <div className="bg-white border-t border-gray-200 overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Quote#</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedCustomerQuotes.length > 0 ? linkedCustomerQuotes.map((quote: any, index: number) => {
                              const quoteId = String(quote._id || quote.id || "");
                              return (
                                <tr key={quoteId || `quote-${index}`} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => quoteId && navigate(`/sales/quotes/${quoteId}`)}>
                                  <td className="py-3 px-4 text-gray-900">{quote.date || quote.quoteDate ? new Date(quote.date || quote.quoteDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</td>
                                  <td className="py-3 px-4 text-teal-700 font-medium">{quote.quoteNumber || quoteId || "-"}</td>
                                  <td className="py-3 px-4 text-gray-900">{formatCurrency(quote.total || quote.amount || 0, quote.currency || baseCurrencyCode || vendor?.currency)}</td>
                                </tr>
                              );
                            }) : <tr><td colSpan={3} className="py-6 px-4 text-center text-sm text-gray-500">No quotes found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100" onClick={() => toggleLinkedCustomerSalesSection("creditNotes")}>
                      {linkedCustomerSalesSections.creditNotes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      Credit Notes
                    </button>
                    {linkedCustomerSalesSections.creditNotes && (
                      <div className="bg-white border-t border-gray-200 overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Credit Note#</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedCustomerCreditNotes.length > 0 ? linkedCustomerCreditNotes.map((note: any, index: number) => {
                              const noteId = String(note._id || note.id || "");
                              return (
                                <tr key={noteId || `credit-note-${index}`} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => noteId && navigate(`/sales/credit-notes/${noteId}`)}>
                                  <td className="py-3 px-4 text-gray-900">{note.date || note.creditNoteDate ? new Date(note.date || note.creditNoteDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</td>
                                  <td className="py-3 px-4 text-teal-700 font-medium">{note.creditNoteNumber || noteId || "-"}</td>
                                  <td className="py-3 px-4 text-gray-900">{formatCurrency(note.total || note.amount || 0, note.currency || baseCurrencyCode || vendor?.currency)}</td>
                                </tr>
                              );
                            }) : <tr><td colSpan={3} className="py-6 px-4 text-center text-sm text-gray-500">No credit notes found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-900 font-medium cursor-pointer hover:bg-gray-100" onClick={() => toggleLinkedCustomerSalesSection("salesReceipts")}>
                      {linkedCustomerSalesSections.salesReceipts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      Sales Receipts
                    </button>
                    {linkedCustomerSalesSections.salesReceipts && (
                      <div className="bg-white border-t border-gray-200 overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Sales Receipt#</th>
                              <th className="py-3 px-4 text-left font-medium text-gray-600 text-xs uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linkedCustomerSalesReceipts.length > 0 ? linkedCustomerSalesReceipts.map((receipt: any, index: number) => {
                              const receiptId = String(receipt._id || receipt.id || "");
                              return (
                                <tr key={receiptId || `sales-receipt-${index}`} className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => receiptId && navigate(`/sales/sales-receipts/${receiptId}`)}>
                                  <td className="py-3 px-4 text-gray-900">{receipt.date || receipt.salesReceiptDate ? new Date(receipt.date || receipt.salesReceiptDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</td>
                                  <td className="py-3 px-4 text-teal-700 font-medium">{receipt.salesReceiptNumber || receiptId || "-"}</td>
                                  <td className="py-3 px-4 text-gray-900">{formatCurrency(receipt.total || receipt.amount || 0, receipt.currency || baseCurrencyCode || vendor?.currency)}</td>
                                </tr>
                              );
                            }) : <tr><td colSpan={3} className="py-6 px-4 text-center text-sm text-gray-500">No sales receipts found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        }

        {
          activeTab === "mails" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  {bills.length > 0 || paymentsMade.length > 0 || expenses.length > 0 || purchaseOrders.length > 0 || vendorCredits.length > 0 || recurringBills.length > 0 || recurringExpenses.length > 0 || journals.length > 0 || projects.length > 0 || purchaseReceipts.length > 0 ? (
                    <div className="relative" ref={mailsTypeDropdownRef}>
                      <button
                        className="flex items-center gap-1 text-lg font-semibold text-gray-900 cursor-pointer"
                        onClick={() => setIsMailsTypeDropdownOpen((prev) => !prev)}
                      >
                        {selectedMailsType}
                        <ChevronDown size={16} />
                      </button>
                      {isMailsTypeDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-40 py-1">
                          {["System Mails", "Snail Mail History"].map((option) => (
                            <button
                              key={option}
                              className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                                selectedMailsType === option ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                setSelectedMailsType(option);
                                setIsMailsTypeDropdownOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">System Mails</h3>
                  )}
                </div>

                <div className="space-y-4">
                  {mails.length > 0 ? (
                    mails.map((mail) => (
                      <div key={mail.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#156372] text-white font-semibold text-sm">
                          {mail.initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-600 mb-1">
                            To <span className="font-medium text-gray-900">{mail.to}</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{mail.subject}</span>
                            <span className="text-gray-400"> - </span>
                            <span className="text-gray-600">{mail.description}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {mail.date}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                      <Mail size={48} />
                      <p>No emails sent to this vendor yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {activeTab === "statement" && (
          <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
            {/* Statement Filters Toolbar */}
            <div className="max-w-full mx-auto mb-6 flex items-center justify-between bg-white px-6 py-3 border-b border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Period Picker */}
                <div className="relative" ref={statementPeriodDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                    onClick={() => setIsStatementPeriodDropdownOpen(!isStatementPeriodDropdownOpen)}
                  >
                    <Calendar size={14} className="text-gray-500" />
                    {(() => {
                      const options: { [key: string]: string } = {
                        "today": "Today",
                        "this-week": "This Week",
                        "this-month": "This Month",
                        "this-quarter": "This Quarter",
                        "this-year": "This Year",
                        "yesterday": "Yesterday",
                        "previous-week": "Previous Week",
                        "previous-month": "Previous Month",
                        "previous-quarter": "Previous Quarter",
                        "previous-year": "Previous Year",
                        "custom": "Custom"
                      };
                      return options[statementPeriod] || "This Month";
                    })()}
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>
                  {isStatementPeriodDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[180px] p-1 overflow-hidden">
                      {[
                        { id: "today", label: "Today" },
                        { id: "this-week", label: "This Week" },
                        { id: "this-month", label: "This Month" },
                        { id: "this-quarter", label: "This Quarter" },
                        { id: "this-year", label: "This Year" },
                        { id: "yesterday", label: "Yesterday" },
                        { id: "previous-week", label: "Previous Week" },
                        { id: "previous-month", label: "Previous Month" },
                        { id: "previous-quarter", label: "Previous Quarter" },
                        { id: "previous-year", label: "Previous Year" },
                        { id: "custom", label: "Custom" }
                      ].map((item) => (
                        <div
                          key={item.id}
                          className={`px-3 py-1.5 text-[13px] cursor-pointer transition-colors ${statementPeriod === item.id ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                          style={statementPeriod === item.id ? { background: purchasesTheme.secondary } : {}}
                          onClick={() => { setStatementPeriod(item.id); setIsStatementPeriodDropdownOpen(false); }}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                <div className="relative" ref={statementFilterDropdownRef}>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                    onClick={() => setIsStatementFilterDropdownOpen(!isStatementFilterDropdownOpen)}
                  >
                    Filter By: {statementFilter === "all" ? "All" : "Outstanding"}
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>
                  {isStatementFilterDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px] p-1 overflow-hidden">
                      {[
                        { id: "all", label: "All" },
                        { id: "outstanding", label: "Outstanding" }
                      ].map((item) => (
                        <div
                          key={item.id}
                          className={`px-3 py-1.5 text-[13px] cursor-pointer transition-colors ${statementFilter === item.id ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                          style={statementFilter === item.id ? { background: purchasesTheme.secondary } : {}}
                          onClick={() => { setStatementFilter(item.id); setIsStatementFilterDropdownOpen(false); }}
                        >
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-100 transition-all"
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                </button>
                <button className="p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-100 transition-all" title="Export as PDF">
                  <FileText size={16} />
                </button>
                <button className="p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-100 transition-all" title="Export as Excel">
                  <FileSpreadsheet size={16} />
                </button>
                <button
                  className="flex items-center gap-2 ml-2 px-4 py-2 text-white rounded-md text-[13px] font-bold shadow-sm hover:opacity-90 transition-all active:scale-95"
                  style={{ background: purchasesTheme.primary }}
                  onClick={handleSendEmail}
                >
                  <Mail size={16} />
                  Send Email
                </button>
              </div>
            </div>

            {/* Statement Document Container */}
            <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden min-h-[1056px] flex flex-col relative print:border-none print:shadow-none">

              {/* Top Summary Header (Matches User Design) */}
              <div className="p-12 pb-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-12">
                  <div className="text-left">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                      Vendor Statement For {displayName}
                    </h1>
                    <p className="text-sm font-medium text-gray-500">
                      {(() => {
                        const { start, end } = getStatementDates(statementPeriod);
                        return `From ${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} To ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden mb-2 ml-auto">
                      {organizationProfile?.logo ? (
                        <img src={organizationProfile.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <FileText size={32} className="text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-start gap-12">
                  <div className="max-w-xs">
                    <p className="text-[11px] font-extrabold text-[#0f4e5a] uppercase tracking-wider mb-2">To</p>
                    <p className="text-sm font-bold text-gray-900 mb-1">{displayName}</p>
                    <div className="text-xs text-gray-600 space-y-0.5 leading-relaxed">
                      {vendor.billingStreet1 && <p>{vendor.billingStreet1}</p>}
                      {vendor.billingStreet2 && <p>{vendor.billingStreet2}</p>}
                      {(vendor.billingCity || vendor.billingState) && <p>{[vendor.billingCity, vendor.billingState].filter(Boolean).join(', ')}</p>}
                      {vendor.billingCountry && <p>{vendor.billingCountry}</p>}
                    </div>
                  </div>

                  <div className="text-right max-w-xs ml-auto">
                    <p className="text-sm font-black text-[#0f4e5a] mb-1 uppercase tracking-tight">{organizationProfile?.name || 'TABAN ENTERPRISES'}</p>
                    <div className="text-[11px] text-gray-500 space-y-0.5 leading-relaxed">
                      <p>{organizationProfile?.address?.street1 || organizationProfile?.street1 || ''}</p>
                      <p>{[organizationProfile?.address?.city, organizationProfile?.address?.state].filter(Boolean).join(', ')} {organizationProfile?.address?.zipCode || organizationProfile?.zipCode || ''}</p>
                      <p>{organizationProfile?.address?.country || organizationProfile?.country || ''}</p>
                      <p className="font-semibold text-gray-600 mt-1">{organizationProfile?.email || ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Statement Section */}
              <div className="p-12 pt-8 flex-1">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-1 relative inline-block">
                      Statement of Accounts
                      <span className="absolute -bottom-2 left-0 w-full h-[3px] bg-gray-900 rounded-full"></span>
                    </h2>
                    <p className="text-xs font-bold text-gray-500 mt-4 uppercase tracking-[0.2em]">
                      {(() => {
                        const { start, end } = (() => {
                          const now = new Date();
                          let s = new Date();
                          let e = new Date();
                          const p = statementPeriod;
                          if (p === 'today') { s = new Date(now.setHours(0, 0, 0, 0)); e = new Date(now.setHours(23, 59, 59, 999)); }
                          else if (p === 'yesterday') { s = new Date(now.setDate(now.getDate() - 1)); s.setHours(0, 0, 0, 0); e = new Date(s); e.setHours(23, 59, 59, 999); }
                          else if (p === 'this-week') { const dy = now.getDay(); const df = now.getDate() - dy + (dy === 0 ? -6 : 1); s = new Date(now.setDate(df)); s.setHours(0, 0, 0, 0); e = new Date(); }
                          else if (p === 'previous-week') { const dyVal = now.getDay(); const dfVal = now.getDate() - dyVal - 6; s = new Date(now.setDate(dfVal)); s.setHours(0, 0, 0, 0); e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); }
                          else if (p === 'this-month') { s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
                          else if (p === 'previous-month') { s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); }
                          else if (p === 'this-quarter') { const q = Math.floor(now.getMonth() / 3) * 3; s = new Date(now.getFullYear(), q, 1); e = new Date(now.getFullYear(), q + 3, 0); }
                          else if (p === 'previous-quarter') { const pq = Math.floor(now.getMonth() / 3) * 3 - 3; s = new Date(now.getFullYear(), pq, 1); e = new Date(now.getFullYear(), pq + 3, 0); }
                          else if (p === 'this-year') { s = new Date(now.getFullYear(), 0, 1); e = new Date(now.getFullYear(), 11, 31); }
                          else if (p === 'previous-year') { s = new Date(now.getFullYear() - 1, 0, 1); e = new Date(now.getFullYear() - 1, 11, 31); }
                          return { start: s, end: e };
                        })();
                        return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} To ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                      })()}
                    </p>
                  </div>

                  {/* Account Summary Card */}
                  <div className="w-72 bg-white rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100/80 px-4 py-2 border-b border-gray-100">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account Summary</p>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {(() => {
                        const { start, end } = (() => {
                          const now = new Date();
                          let s = new Date();
                          let e = new Date();
                          const p = statementPeriod;
                          if (p === 'today') { s = new Date(now.setHours(0, 0, 0, 0)); e = new Date(now.setHours(23, 59, 59, 999)); }
                          else if (p === 'yesterday') { s = new Date(now.setDate(now.getDate() - 1)); s.setHours(0, 0, 0, 0); e = new Date(s); e.setHours(23, 59, 59, 999); }
                          else if (p === 'this-week') { const dy = now.getDay(); const df = now.getDate() - dy + (dy === 0 ? -6 : 1); s = new Date(now.setDate(df)); s.setHours(0, 0, 0, 0); e = new Date(); }
                          else if (p === 'previous-week') { const dyVal = now.getDay(); const dfVal = now.getDate() - dyVal - 6; s = new Date(now.setDate(dfVal)); s.setHours(0, 0, 0, 0); e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); }
                          else if (p === 'this-month') { s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
                          else if (p === 'previous-month') { s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); }
                          else if (p === 'this-quarter') { const q = Math.floor(now.getMonth() / 3) * 3; s = new Date(now.getFullYear(), q, 1); e = new Date(now.getFullYear(), q + 3, 0); }
                          else if (p === 'previous-quarter') { const pq = Math.floor(now.getMonth() / 3) * 3 - 3; s = new Date(now.getFullYear(), pq, 1); e = new Date(now.getFullYear(), pq + 3, 0); }
                          else if (p === 'this-year') { s = new Date(now.getFullYear(), 0, 1); e = new Date(now.getFullYear(), 11, 31); }
                          else if (p === 'previous-year') { s = new Date(now.getFullYear() - 1, 0, 1); e = new Date(now.getFullYear() - 1, 11, 31); }
                          return { start: s, end: e };
                        })();

                        const filtered = statementTransactions.filter(t => {
                          const dt = new Date(t.date);
                          const matchesFilter = (statementFilter === 'all') || (statementFilter === 'outstanding' && t.type === 'Bill' && t.balance > 0);
                          return dt >= start && dt <= end && matchesFilter;
                        });

                        const opening = statementTransactions.find(t => t.id === 'opening')?.amount || 0;
                        const billedAmount = filtered.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
                        const amountPaid = filtered.reduce((s, t) => s + (t.payments || 0), 0);
                        const balanceDue = filtered.length ? filtered[filtered.length - 1].balance : (statementTransactions.length ? statementTransactions[statementTransactions.length - 1].balance : 0);
                        const currency = vendor?.currency || baseCurrencyCode || "USD";

                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-500">Opening Balance</span>
                              <span className="text-sm font-bold text-gray-900 underline decoration-gray-200 decoration-2 underline-offset-4">{currency} {opening.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-500">Billed Amount</span>
                              <span className="text-sm font-bold text-gray-900 underline decoration-gray-200 decoration-2 underline-offset-4">{currency} {billedAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-500">Amount Paid</span>
                              <span className="text-sm font-bold text-gray-900 underline decoration-gray-200 decoration-2 underline-offset-4">{currency} {amountPaid.toFixed(2)}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                              <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Balance Due</span>
                              <span className="text-lg font-black text-gray-900 tracking-tight">{currency} {balanceDue.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Transaction Details Table */}
                <div className="mt-12 rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#1a1a1a] text-white">
                        <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Date</th>
                        <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Transactions</th>
                        <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Details</th>
                        <th className="text-right py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Amount</th>
                        <th className="text-right py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Payments</th>
                        <th className="text-right py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(() => {
                        const { start, end } = (() => {
                          const now = new Date();
                          let s = new Date();
                          let e = new Date();
                          const p = statementPeriod;
                          if (p === 'today') { s = new Date(now.setHours(0, 0, 0, 0)); e = new Date(now.setHours(23, 59, 59, 999)); }
                          else if (p === 'yesterday') { s = new Date(now.setDate(now.getDate() - 1)); s.setHours(0, 0, 0, 0); e = new Date(s); e.setHours(23, 59, 59, 999); }
                          else if (p === 'this-week') { const dy = now.getDay(); const df = now.getDate() - dy + (dy === 0 ? -6 : 1); s = new Date(now.setDate(df)); s.setHours(0, 0, 0, 0); e = new Date(); }
                          else if (p === 'previous-week') { const dyVal = now.getDay(); const dfVal = now.getDate() - dyVal - 6; s = new Date(now.setDate(dfVal)); s.setHours(0, 0, 0, 0); e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); }
                          else if (p === 'this-month') { s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
                          else if (p === 'previous-month') { s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); }
                          else if (p === 'this-quarter') { const q = Math.floor(now.getMonth() / 3) * 3; s = new Date(now.getFullYear(), q, 1); e = new Date(now.getFullYear(), q + 3, 0); }
                          else if (p === 'previous-quarter') { const pq = Math.floor(now.getMonth() / 3) * 3 - 3; s = new Date(now.getFullYear(), pq, 1); e = new Date(now.getFullYear(), pq + 3, 0); }
                          else if (p === 'this-year') { s = new Date(now.getFullYear(), 0, 1); e = new Date(now.getFullYear(), 11, 31); }
                          else if (p === 'previous-year') { s = new Date(now.getFullYear() - 1, 0, 1); e = new Date(now.getFullYear() - 1, 11, 31); }
                          return { start: s, end: e };
                        })();

                        const filtered = statementTransactions.filter(t => {
                          const dt = new Date(t.date);
                          const matchesFilter = (statementFilter === 'all') || (statementFilter === 'outstanding' && t.type === 'Bill' && t.balance > 0);
                          return dt >= start && dt <= end && matchesFilter;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-xs" colSpan={6}>
                                No transactions found
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((t, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-6 font-medium text-gray-500 whitespace-nowrap">
                              {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight ${t.type === 'Bill' ? 'bg-orange-50 text-orange-700' :
                                t.type === 'Payment Made' ? 'bg-teal-50 text-teal-800' :
                                  t.type === 'Vendor Credit' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'
                                }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-gray-600 font-semibold">{t.details || ''}</td>
                            <td className="py-4 px-6 text-right font-bold text-gray-900">{t.amount ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                            <td className="py-4 px-6 text-right font-bold text-teal-700">{t.payments ? t.payments.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                            <td className="py-4 px-6 text-right font-black text-gray-900 bg-gray-50/30">{t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Final Balance Due (Matches User Design) */}
                <div className="mt-8 flex justify-end">
                  <div className="flex items-center gap-12 pr-6">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Balance Due</span>
                    <span className="text-xl font-black text-gray-900">
                      {vendor?.currency || baseCurrencyCode || "USD"} {
                        (() => {
                          const lastT = statementTransactions[statementTransactions.length - 1];
                          return (lastT?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                        })()
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Statement Footer */}
              <div className="p-12 pt-0 mt-auto">
                <div className="pt-8 border-t border-gray-100 flex justify-between items-center opacity-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Generated by {organizationProfile?.name || 'TABAN ENTERPRISES'}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Vendor Statements Modal */}
        {isPrintStatementsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Print Vendor Statements</h2>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={() => setIsPrintStatementsModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  You can print your vendor's statements for the selected date range.
                </p>

                <div className="mb-4" ref={startDatePickerRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <div
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setIsStartDatePickerOpen(!isStartDatePickerOpen);
                      setIsEndDatePickerOpen(false);
                    }}
                  >
                    {formatDateForDisplay(printStatementStartDate)}
                  </div>
                  {isStartDatePickerOpen && renderCalendar(
                    startDateCalendarMonth,
                    printStatementStartDate,
                    (date) => {
                      setPrintStatementStartDate(date);
                      setIsStartDatePickerOpen(false);
                    },
                    () => setStartDateCalendarMonth(new Date(startDateCalendarMonth.getFullYear(), startDateCalendarMonth.getMonth() - 1, 1)),
                    () => setStartDateCalendarMonth(new Date(startDateCalendarMonth.getFullYear(), startDateCalendarMonth.getMonth() + 1, 1))
                  )}
                </div>

                <div className="mb-4" ref={endDatePickerRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <div
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setIsEndDatePickerOpen(!isEndDatePickerOpen);
                      setIsStartDatePickerOpen(false);
                    }}
                  >
                    {formatDateForDisplay(printStatementEndDate)}
                  </div>
                  {isEndDatePickerOpen && renderCalendar(
                    endDateCalendarMonth,
                    printStatementEndDate,
                    (date) => {
                      setPrintStatementEndDate(date);
                      setIsEndDatePickerOpen(false);
                    },
                    () => setEndDateCalendarMonth(new Date(endDateCalendarMonth.getFullYear(), endDateCalendarMonth.getMonth() - 1, 1)),
                    () => setEndDateCalendarMonth(new Date(endDateCalendarMonth.getFullYear(), endDateCalendarMonth.getMonth() + 1, 1))
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
                  onClick={handlePrintStatementsSubmit}
                >
                  Print Statements
                </button>
                <button
                  className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200"
                  onClick={() => setIsPrintStatementsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
        }

        {/* Merge Vendors Modal */}
        {
          isMergeModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto vendor-detail-merge-modal">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Merge Vendors</h2>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                    onClick={() => setIsMergeModalOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-6">
                    Select a vendor profile with whom you'd like to merge <strong>{selectedVendors.length === 1 ? vendors.find(v => v.id === selectedVendors[0])?.name : `${selectedVendors.length} vendors`}</strong>. Once merged, the transactions of <strong>{selectedVendors.length === 1 ? vendors.find(v => v.id === selectedVendors[0])?.name : "selected vendors"}</strong> will be transferred, and this vendor record will be marked as inactive.
                  </p>

                  <div className="relative mb-4" ref={mergeVendorDropdownRef}>
                    <div
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50"
                      onClick={() => setIsMergeVendorDropdownOpen(!isMergeVendorDropdownOpen)}
                    >
                      <span className={mergeTargetVendor ? "" : "placeholder"}>
                        {mergeTargetVendor ? mergeTargetVendor.name : "Select Vendor"}
                      </span>
                      <ChevronDown size={18} className={`text-gray-500 transition-transform ${isMergeVendorDropdownOpen ? "rotate-180" : ""}`} />
                    </div>

                    {isMergeVendorDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                          <Search size={16} />
                          <input
                            type="text"
                            placeholder="Search"
                            value={mergeVendorSearch}
                            onChange={(e) => setMergeVendorSearch(e.target.value)}
                            className="flex-1 border-none outline-none text-sm text-gray-700"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredMergeVendors.length > 0 ? (
                            filteredMergeVendors.map(vend => (
                              <div
                                key={vend.id}
                                className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => {
                                  setMergeTargetVendor(vend);
                                  setIsMergeVendorDropdownOpen(false);
                                  setMergeVendorSearch("");
                                }}
                              >
                                {vend.name}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              NO RESULTS FOUND
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                  <button
                    className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
                    onClick={handleMergeSubmit}
                  >
                    Continue
                  </button>
                  <button
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsMergeModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Associate Templates Modal */}
        {
          isAssociateTemplatesModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Associate Templates</h2>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                    onClick={() => setIsAssociateTemplatesModalOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-6">
                    Associate PDF and notification templates to this vendor.
                  </p>

                  {/* PDF Templates Section */}
                  <div className="mb-6 pb-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">PDF Templates</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                        style={{ background: purchasesTheme.primary }}>
                        <Plus size={16} />
                        New PDF Template
                      </button>
                    </div>

                    {/* Vendor Statement */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Vendor Statement</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "pdf-vendorStatement" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "pdf-vendorStatement" ? null : "pdf-vendorStatement")}
                        >
                          <span>{pdfTemplates.vendorStatement}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "pdf-vendorStatement" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "pdf-vendorStatement" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["pdf-vendorStatement"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "pdf-vendorStatement": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(pdfTemplateOptions, "pdf-vendorStatement").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${pdfTemplates.vendorStatement === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("pdf", "vendorStatement", opt)}
                              >
                                {opt}
                                {pdfTemplates.vendorStatement === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Purchase Orders */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Purchase Orders</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "pdf-purchaseOrders" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "pdf-purchaseOrders" ? null : "pdf-purchaseOrders")}
                        >
                          <span>{pdfTemplates.purchaseOrders}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "pdf-purchaseOrders" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "pdf-purchaseOrders" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["pdf-purchaseOrders"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "pdf-purchaseOrders": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(pdfTemplateOptions, "pdf-purchaseOrders").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${pdfTemplates.purchaseOrders === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("pdf", "purchaseOrders", opt)}
                              >
                                {opt}
                                {pdfTemplates.purchaseOrders === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bills */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Bills</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "pdf-Bills" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "pdf-Bills" ? null : "pdf-Bills")}
                        >
                          <span>{pdfTemplates.bills}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "pdf-Bills" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "pdf-Bills" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["pdf-Bills"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "pdf-Bills": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(pdfTemplateOptions, "pdf-Bills").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${pdfTemplates.bills === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("pdf", "bills", opt)}
                              >
                                {opt}
                                {pdfTemplates.bills === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vendor Credits */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Vendor Credits</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "pdf-vendorCredits" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "pdf-vendorCredits" ? null : "pdf-vendorCredits")}
                        >
                          <span>{pdfTemplates.vendorCredits}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "pdf-vendorCredits" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "pdf-vendorCredits" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["pdf-vendorCredits"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "pdf-vendorCredits": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(pdfTemplateOptions, "pdf-vendorCredits").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${pdfTemplates.vendorCredits === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("pdf", "vendorCredits", opt)}
                              >
                                {opt}
                                {pdfTemplates.vendorCredits === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Thank You */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Payment Thank You</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "pdf-paymentThankYou" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "pdf-paymentThankYou" ? null : "pdf-paymentThankYou")}
                        >
                          <span>{pdfTemplates.paymentThankYou}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "pdf-paymentThankYou" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "pdf-paymentThankYou" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["pdf-paymentThankYou"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "pdf-paymentThankYou": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(pdfTemplateOptions, "pdf-paymentThankYou").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${pdfTemplates.paymentThankYou === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("pdf", "paymentThankYou", opt)}
                              >
                                {opt}
                                {pdfTemplates.paymentThankYou === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email Notifications Section */}
                  <div className="mb-6 pb-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Email Notifications</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 text-white rounded-md text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                        style={{ background: purchasesTheme.primary }}>
                        <Plus size={16} />
                        New Email Template
                      </button>
                    </div>

                    {/* Email Purchase Orders */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Purchase Orders</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "email-purchaseOrders" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "email-purchaseOrders" ? null : "email-purchaseOrders")}
                        >
                          <span>{emailNotifications.purchaseOrders}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "email-purchaseOrders" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "email-purchaseOrders" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["email-purchaseOrders"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "email-purchaseOrders": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(emailTemplateOptions, "email-purchaseOrders").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${emailNotifications.purchaseOrders === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("email", "purchaseOrders", opt)}
                              >
                                {opt}
                                {emailNotifications.purchaseOrders === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Bills */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Bills</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "email-Bills" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "email-Bills" ? null : "email-Bills")}
                        >
                          <span>{emailNotifications.bills}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "email-Bills" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "email-Bills" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["email-Bills"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "email-Bills": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(emailTemplateOptions, "email-Bills").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${emailNotifications.bills === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("email", "bills", opt)}
                              >
                                {opt}
                                {emailNotifications.bills === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Vendor Credits */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Vendor Credits</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "email-vendorCredits" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "email-vendorCredits" ? null : "email-vendorCredits")}
                        >
                          <span>{emailNotifications.vendorCredits}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "email-vendorCredits" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "email-vendorCredits" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["email-vendorCredits"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "email-vendorCredits": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(emailTemplateOptions, "email-vendorCredits").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${emailNotifications.vendorCredits === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("email", "vendorCredits", opt)}
                              >
                                {opt}
                                {emailNotifications.vendorCredits === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Payment Thank-you */}
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium text-gray-700">Payment Thank-you</label>
                      <div className="relative flex-1 max-w-xs">
                        <div
                          className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${openTemplateDropdown === "email-paymentThankYou" ? "border-[#156372]" : ""}`}
                          onClick={() => setOpenTemplateDropdown(openTemplateDropdown === "email-paymentThankYou" ? null : "email-paymentThankYou")}
                        >
                          <span>{emailNotifications.paymentThankYou}</span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${openTemplateDropdown === "email-paymentThankYou" ? "rotate-180" : ""}`} />
                        </div>
                        {openTemplateDropdown === "email-paymentThankYou" && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                              <Search size={14} />
                              <input
                                type="text"
                                placeholder="Search"
                                value={templateSearches["email-paymentThankYou"] || ""}
                                onChange={(e) => setTemplateSearches(prev => ({ ...prev, "email-paymentThankYou": e.target.value }))}
                                autoFocus
                              />
                            </div>
                            {getFilteredTemplateOptions(emailTemplateOptions, "email-paymentThankYou").map(opt => (
                              <div
                                key={opt}
                                className={`vendor-detail-templates-dropdown-option ${emailNotifications.paymentThankYou === opt ? "selected" : ""}`}
                                onClick={() => handleTemplateSelect("email", "paymentThankYou", opt)}
                              >
                                {opt}
                                {emailNotifications.paymentThankYou === opt && <Check size={16} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
                    onClick={handleAssociateTemplatesSave}
                  >
                    Save
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200"
                    onClick={() => setIsAssociateTemplatesModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Modals */}
        {/* Clone Modal */}
        {
          isCloneModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto customer-detail-clone-modal">
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-6">
                    Select the contact type under which you want to create the new cloned contact.
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="cloneContactType"
                        value="customer"
                        checked={cloneContactType === "customer"}
                        onChange={(e) => setCloneContactType(e.target.value)}
                      />
                      <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center"></span>
                      <span className="text-sm font-medium text-gray-700">Customer</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="cloneContactType"
                        value="vendor"
                        checked={cloneContactType === "vendor"}
                        onChange={(e) => setCloneContactType(e.target.value)}
                      />
                      <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center"></span>
                      <span className="text-sm font-medium text-gray-700">Vendor</span>
                    </label>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
                    onClick={handleCloneSubmit}
                    disabled={isCloningVendor}
                  >
                    {isCloningVendor ? "Cloning..." : "Proceed"}
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200"
                    onClick={() => setIsCloneModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Edit Contact Person Modal */}
        {
          isEditContactModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Contact Person</h2>
                  <button
                    onClick={() => {
                      setIsEditContactModalOpen(false);
                      setEditingContactIndex(null);
                      setEditContactData({
                        salutation: "",
                        firstName: "",
                        lastName: "",
                        email: "",
                        workPhone: "",
                        mobile: "",
                        skypeName: "",
                        designation: "",
                        department: ""
                      });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column - Form Fields */}
                    <div className="space-y-4">
                      {/* Name Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={editContactData.salutation}
                            onChange={(e) => setEditContactData({ ...editContactData, salutation: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Salutation</option>
                            <option>Mr.</option>
                            <option>Mrs.</option>
                            <option>Ms.</option>
                            <option>Dr.</option>
                          </select>
                          <input
                            type="text"
                            placeholder="First Name"
                            value={editContactData.firstName}
                            onChange={(e) => setEditContactData({ ...editContactData, firstName: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={editContactData.lastName}
                            onChange={(e) => setEditContactData({ ...editContactData, lastName: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={editContactData.email}
                          onChange={(e) => setEditContactData({ ...editContactData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option>Work Phone</option>
                            </select>
                            <input
                              type="tel"
                              placeholder="Work Phone"
                              value={editContactData.workPhone}
                              onChange={(e) => setEditContactData({ ...editContactData, workPhone: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                              <option>Mobile</option>
                            </select>
                            <input
                              type="tel"
                              placeholder="Mobile"
                              value={editContactData.mobile}
                              onChange={(e) => setEditContactData({ ...editContactData, mobile: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Skype Name/Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Skype Name/Number</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <Globe size={16} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Skype Name/Number"
                            value={editContactData.skypeName}
                            onChange={(e) => setEditContactData({ ...editContactData, skypeName: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>

                      {/* Other Details */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Other Details</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Designation"
                            value={editContactData.designation}
                            onChange={(e) => setEditContactData({ ...editContactData, designation: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Department"
                            value={editContactData.department}
                            onChange={(e) => setEditContactData({ ...editContactData, department: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Profile Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload size={32} className="mx-auto text-teal-700 mb-2" />
                        <p className="text-sm text-gray-600 mb-1">Drag & Drop Profile Image</p>
                        <p className="text-xs text-gray-500 mb-2">Supported Files: jpg, jpeg, png, gif, bmp</p>
                        <p className="text-xs text-gray-500 mb-4">Maximum File Size: 5MB</p>
                        <button className="text-sm text-teal-700 underline">Upload File</button>
                      </div>
                    </div>
                  </div>

                  {/* Enable Vendor Portal Access */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="enablePortal"
                        className="mt-1"
                      />
                      <div>
                        <label htmlFor="enablePortal" className="block text-sm font-medium text-gray-700 mb-1">
                          Enable vendor portal access.
                        </label>
                        <p className="text-xs text-gray-500">
                          This vendor will be able to see all their transactions with your organization by logging in to the portal using their email address.{" "}
                          <a href="#" className="text-teal-700 underline">Learn More</a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsEditContactModalOpen(false);
                      setEditingContactIndex(null);
                      setEditContactData({
                        salutation: "",
                        firstName: "",
                        lastName: "",
                        email: "",
                        workPhone: "",
                        mobile: "",
                        skypeName: "",
                        designation: "",
                        department: ""
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (editingContactIndex !== null && vendor && id) {
                        const updatedContactPersons = [...vendor.contactPersons];
                        updatedContactPersons[editingContactIndex] = { ...editContactData };
                        const updatedVendor = {
                          ...vendor,
                          contactPersons: updatedContactPersons,
                          formData: {
                            ...vendor.formData,
                            contactPersons: updatedContactPersons
                          }
                        };
                        try {
                          await vendorsAPI.update(id, updatedVendor);
                          // Reload vendor to get updated data from API
                          const response = await vendorsAPI.getById(id);
                          if (response && response.success && response.data) {
                            const vendorData = response.data;
                            const mappedVendor = {
                              ...vendorData,
                              id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
                              billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
                              billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
                              billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
                              billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
                              billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
                              billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
                              billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
                              billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
                              billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
                              shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingAddress?.street1 || '',
                              shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
                              shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
                              shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
                              shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
                              shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
                              shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
                              shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
                              shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
                            };
                            setVendor(mappedVendor);
                          }
                          setIsEditContactModalOpen(false);
                          setEditingContactIndex(null);
                          setEditContactData({
                            salutation: "",
                            firstName: "",
                            lastName: "",
                            email: "",
                            workPhone: "",
                            mobile: "",
                            skypeName: "",
                            designation: "",
                            department: ""
                          });
                          toast.success('Contact person updated successfully');
                        } catch (error) {
                          toast.error('Failed to update contact person: ' + (error.message || 'Unknown error'));
                        }
                      }
                    }}
                    className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Configure Vendor Portal Modal */}
        {isConfigurePortalModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Configure Vendor Portal</h2>
                <button
                  onClick={() => setIsConfigurePortalModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Portal Access</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select which contacts should have access to the vendor portal. These contacts will be able to view their transactions, statements, and make payments online.
                  </p>
                </div>

                {/* Contacts List */}
                <div className="space-y-3 mb-6">
                  {portalAccessContacts.map((contact, index) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={contact.hasAccess}
                          onChange={(e) => {
                            const updatedContacts = [...portalAccessContacts];
                            updatedContacts[index] = { ...contact, hasAccess: e.target.checked };
                            setPortalAccessContacts(updatedContacts);
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-600">{contact.email}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${contact.hasAccess ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {contact.hasAccess ? 'Has Access' : 'No Access'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Portal Settings */}
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Portal Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
                      <span className="text-sm text-gray-700">Allow vendors to view their statements online</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
                      <span className="text-sm text-gray-700">Allow vendors to make online payments</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
                      <span className="text-sm text-gray-700">Enable two-factor authentication</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: purchasesTheme.primary }}
                  onClick={() => {
                    // Save portal settings
                    setIsConfigurePortalModalOpen(false);
                  }}
                >
                  Save Changes
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsConfigurePortalModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link to Customer Modal */}
        {isLinkToCustomerModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Link to Customer</h2>
                <button
                  onClick={() => setIsLinkToCustomerModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Select a customer to link with this vendor. This will help track transactions between the vendor and customer.
                </p>

                {/* Customer Search */}
                <div className="relative mb-4" ref={customerDropdownRef}>
                  <div
                    className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${isCustomerDropdownOpen ? "border-[#156372]" : ""}`}
                    onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  >
                    <span>{selectedCustomer ? selectedCustomer.name : "Select a customer"}</span>
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isCustomerDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                  {isCustomerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Search customers"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {customers.filter(customer =>
                        String(customer.name || customer.displayName || "").toLowerCase().includes(customerSearch.toLowerCase())
                      ).map(customer => (
                        <div
                          key={customer.id || customer._id}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${String(selectedCustomer?.id || selectedCustomer?._id || "") === String(customer.id || customer._id || "") ? "bg-teal-50" : ""}`}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsCustomerDropdownOpen(false);
                            setCustomerSearch("");
                          }}
                        >
                          {customer.name || customer.displayName || customer.companyName || "Unnamed customer"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: purchasesTheme.primary }}
                  onClick={async () => {
                    if (!selectedCustomer || !vendor) return;
                    const vendorId = String(vendor._id || vendor.id || "");
                    const customerId = String(selectedCustomer._id || selectedCustomer.id || "");
                    const vendorName = vendor.name || vendor.displayName || vendor.companyName || "Vendor";
                    const customerName = selectedCustomer.name || selectedCustomer.displayName || selectedCustomer.companyName || "Customer";
                    const previousLinkedCustomerId = String(vendor.linkedCustomerId || "").trim();

                    try {
                      setIsSavingLinkedCustomer(true);

                      await vendorsAPI.update(vendorId, {
                        linkedCustomerId: customerId,
                        linkedCustomerName: customerName
                      });

                      await customersAPI.update(customerId, {
                        linkedVendorId: vendorId,
                        linkedVendorName: vendorName
                      });

                      if (previousLinkedCustomerId && previousLinkedCustomerId !== customerId) {
                        try {
                          await customersAPI.update(previousLinkedCustomerId, {
                            linkedVendorId: null,
                            linkedVendorName: null
                          });
                        } catch (unlinkError) {
                        }
                      }

                      setVendor((prev: any) => prev ? ({
                        ...prev,
                        linkedCustomerId: customerId,
                        linkedCustomerName: customerName
                      }) : prev);
                      setIsLinkToCustomerModalOpen(false);
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                      toast.success(`Vendor "${vendorName}" linked to customer "${customerName}"`);
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to link vendor to customer");
                    } finally {
                      setIsSavingLinkedCustomer(false);
                    }
                  }}
                  disabled={!selectedCustomer || isSavingLinkedCustomer}
                >
                  {isSavingLinkedCustomer ? "Linking..." : "Link Customer"}
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsLinkToCustomerModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Vendors Modal */}
        {isMergeModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Merge Vendors</h2>
                <button
                  onClick={() => setIsMergeModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Select a vendor to merge with <strong>{vendor?.name}</strong>. The selected vendor's data will be merged into this vendor.
                </p>

                {/* Vendor Search */}
                <div className="relative mb-4" ref={mergeVendorDropdownRef}>
                  <div
                    className={`w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between ${isMergeVendorDropdownOpen ? "border-[#156372]" : ""}`}
                    onClick={() => setIsMergeVendorDropdownOpen(!isMergeVendorDropdownOpen)}
                  >
                    <span>{mergeTargetVendor ? mergeTargetVendor.name : "Select vendor to merge"}</span>
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isMergeVendorDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                  {isMergeVendorDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      <div className="flex items-center gap-2 p-3 border-b border-gray-200">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Search vendors"
                          value={mergeVendorSearch}
                          onChange={(e) => setMergeVendorSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {vendors.filter(v =>
                        v.id !== vendor?.id &&
                        v.name.toLowerCase().includes(mergeVendorSearch.toLowerCase())
                      ).map(v => (
                        <div
                          key={v.id}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${mergeTargetVendor?.id === v.id ? "bg-teal-50" : ""}`}
                          onClick={() => {
                            setMergeTargetVendor(v);
                            setIsMergeVendorDropdownOpen(false);
                            setMergeVendorSearch("");
                          }}
                        >
                          {v.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {mergeTargetVendor && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Merging vendors cannot be undone. All data from {mergeTargetVendor.name} will be merged into {vendor?.name}.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: purchasesTheme.primary }}
                  onClick={handleMergeSubmit}
                  disabled={!mergeTargetVendor}
                >
                  Merge Vendors
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMergeModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Opening Balance Modal */}
        {
          isEditOpeningBalanceModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Opening Balance</h2>
                  <button
                    onClick={() => {
                      setIsEditOpeningBalanceModalOpen(false);
                      setOpeningBalance("0");
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  {/* Opening Balance Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opening Balance</label>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-l-md text-sm text-gray-700">
                        {vendor?.currency?.split("-")[0]?.trim() || baseCurrencyCode || "USD"}
                      </span>
                      <input
                        type="number"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Outstanding Opening Balance Display */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Outstanding Opening Balance</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                      {formatCurrency(parseFloat(openingBalance) || 0, vendor?.currency || baseCurrencyCode)}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={async () => {
                      if (vendor && id) {
                        const balanceValue = parseFloat(openingBalance) || 0;
                        const currencyCode = vendor.currency?.split("-")[0]?.trim() || baseCurrencyCode || "USD";

                        // Calculate outstanding payables: opening balance + bills - payments - credits
                        const billsTotal = bills.reduce((sum, bill) => sum + parseFloat(bill.total || bill.amount || 0), 0);
                        const paymentsTotal = paymentsMade.reduce((sum, p) => sum + parseFloat(p.amountPaid || p.amount || 0), 0);
                        const creditsTotal = vendorCredits.reduce((sum, vc) => sum + parseFloat(vc.total || vc.amount || 0), 0);
                        const outstandingPayables = balanceValue + billsTotal - paymentsTotal - creditsTotal;

                        // Update vendor with new opening balance and calculated payables
                        const updatedVendor = {
                          ...vendor,
                          openingBalance: balanceValue.toString(),
                          payables: outstandingPayables, // Store as number for formatCurrency function
                          formData: {
                            ...vendor.formData,
                            openingBalance: balanceValue.toString()
                          }
                        };

                        try {
                          await vendorsAPI.update(id, updatedVendor);
                          // Reload vendor to get updated data from API
                          const response = await vendorsAPI.getById(id);
                          if (response && response.success && response.data) {
                            const vendorData = response.data;
                            const mappedVendor = {
                              ...vendorData,
                              id: vendorData._id ? String(vendorData._id) : (vendorData.id ? String(vendorData.id) : id),
                              billingStreet1: vendorData.billingAddress?.street1 || vendorData.billingStreet1 || '',
                              billingStreet2: vendorData.billingAddress?.street2 || vendorData.billingStreet2 || '',
                              billingCity: vendorData.billingAddress?.city || vendorData.billingCity || '',
                              billingState: vendorData.billingAddress?.state || vendorData.billingState || '',
                              billingZipCode: vendorData.billingAddress?.zipCode || vendorData.billingZipCode || '',
                              billingPhone: vendorData.billingAddress?.phone || vendorData.billingPhone || '',
                              billingFax: vendorData.billingAddress?.fax || vendorData.billingFax || '',
                              billingAttention: vendorData.billingAddress?.attention || vendorData.billingAttention || '',
                              billingCountry: vendorData.billingAddress?.country || vendorData.billingCountry || '',
                              shippingStreet1: vendorData.shippingAddress?.street1 || vendorData.shippingAddress?.street1 || '',
                              shippingStreet2: vendorData.shippingAddress?.street2 || vendorData.shippingStreet2 || '',
                              shippingCity: vendorData.shippingAddress?.city || vendorData.shippingCity || '',
                              shippingState: vendorData.shippingAddress?.state || vendorData.shippingState || '',
                              shippingZipCode: vendorData.shippingAddress?.zipCode || vendorData.shippingZipCode || '',
                              shippingPhone: vendorData.shippingAddress?.phone || vendorData.shippingPhone || '',
                              shippingFax: vendorData.shippingAddress?.fax || vendorData.shippingFax || '',
                              shippingAttention: vendorData.shippingAddress?.attention || vendorData.shippingAttention || '',
                              shippingCountry: vendorData.shippingAddress?.country || vendorData.shippingCountry || ''
                            };
                            setVendor(mappedVendor);
                          }
                          setIsEditOpeningBalanceModalOpen(false);
                          setOpeningBalance("0");
                          toast.success('Opening balance updated successfully');
                        } catch (error) {
                          toast.error('Failed to update opening balance: ' + (error.message || 'Unknown error'));
                        }
                      }
                    }}
                    className="px-4 py-2 bg-[#156372] text-white rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Documents Modal */}
        {isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={() => setIsDocumentsModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 m-0">Documents</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Files"
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                    {documentSearch && (
                      <button
                        onClick={() => setDocumentSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsDocumentsModalOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Navigation - INBOXES */}
                <div className="w-64 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full">
                  <div className="p-4 space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2">INBOXES</div>
                    {[
                      { id: 'all-documents', label: 'All Documents', icon: LayoutGrid },
                      { id: 'files', label: 'Inbox', icon: Folder },
                      { id: 'bank-statements', label: 'Bank Statements', icon: CreditCard },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = selectedInbox === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedInbox(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all ${isActive
                            ? 'bg-[#156372] text-white shadow-md shadow-blue-200'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                          <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {/* Search Header */}
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 group">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-700 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search for documents..."
                        value={documentSearch}
                        onChange={(e) => setDocumentSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-teal-500 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{selectedDocuments.length} Selected</div>
                  </div>

                  <div className="flex-1 overflow-auto bg-white">
                    {(() => {
                      let filteredDocs = [];
                      if (selectedInbox === "files") {
                        filteredDocs = availableDocuments.filter(doc =>
                          doc.folder === "Inbox" || doc.folder === "Files" || !doc.folder
                        );
                      } else if (selectedInbox === "bank-statements") {
                        filteredDocs = availableDocuments.filter(doc =>
                          doc.folder === "Bank Statements" || doc.module === "Banking"
                        );
                      } else if (selectedInbox === "all-documents") {
                        filteredDocs = availableDocuments;
                      }

                      // Filter by search term
                      if (documentSearch) {
                        filteredDocs = filteredDocs.filter(doc =>
                          doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
                          (doc.associatedTo && doc.associatedTo.toLowerCase().includes(documentSearch.toLowerCase()))
                        );
                      }

                      if (filteredDocs.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-4 h-full">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                              <Upload size={32} />
                            </div>
                            <div>
                              <p className="text-[14px] font-bold text-slate-600">No documents found</p>
                              <p className="text-[12px] text-slate-400 mt-1">Try changing your search or switching folders.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30">
                              <th className="px-6 py-3 w-12">
                                <input
                                  type="checkbox"
                                  checked={filteredDocs.length > 0 && filteredDocs.every(d => selectedDocuments.includes(d.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDocuments(filteredDocs.map(d => d.id));
                                    } else {
                                      setSelectedDocuments([]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                                />
                              </th>
                              <th className="px-6 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Document Name</th>
                              <th className="px-6 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Details / Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDocs.map((doc) => {
                              const isSelected = selectedDocuments.includes(doc.id);
                              return (
                                <tr
                                  key={doc.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                                    } else {
                                      setSelectedDocuments([...selectedDocuments, doc.id]);
                                    }
                                  }}
                                  className={`transition-all duration-200 cursor-pointer border-b border-slate-50 ${isSelected ? 'bg-teal-50/30' : 'hover:bg-slate-50/50'}`}
                                >
                                  <td className="px-6 py-4">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      readOnly
                                      className="w-4 h-4 rounded border-slate-300 accent-blue-600 pointer-events-none"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-[13px] font-bold text-slate-700">{doc.name}</span>
                                      {doc.associatedTo && <span className="text-[11px] text-slate-400 font-medium">Associated to: {doc.associatedTo}</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col text-right">
                                      <span className="text-[12px] font-bold text-slate-600">{doc.size || '52 KB'}</span>
                                      <span className="text-[11px] text-slate-400 font-medium">{doc.uploadedOn || '29 Dec 2025'}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/10">
                <button
                  onClick={() => {
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  className="px-6 py-2.5 text-[13px] font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedDocuments.length > 0) {
                      const selectedDocs = availableDocuments.filter((doc: any) =>
                        selectedDocuments.includes(doc.id)
                      );
                      const newAttachments = selectedDocs.map((doc: any, index: number) => ({
                        id: doc.id || `${Date.now()}-doc-${index}`,
                        name: doc.name.length > 30 ? `${doc.name.substring(0, 27)}...` : doc.name,
                        size: typeof doc.size === 'string' ? parseFileSize(doc.size) : (doc.size || 0),
                        type: doc.type || "",
                        url: String(doc.url || doc.fileUrl || doc.preview || doc.base64 || "").trim(),
                        uploadedAt: doc.uploadedAt || doc.createdAt || new Date().toISOString(),
                      })).filter((doc: any) => doc.url.length > 0);

                      if (newAttachments.length > 0) {
                        const nextAttachments = [...attachments, ...newAttachments];
                        setAttachments(nextAttachments);
                        try {
                          await persistVendorMeta(comments, nextAttachments);
                        } catch (error: any) {
                          toast.error(error?.message || "Failed to attach selected documents.");
                        }
                      } else {
                        toast.error("Selected documents do not have a valid file URL.");
                      }
                    }
                    setIsDocumentsModalOpen(false);
                    setSelectedDocuments([]);
                    setDocumentSearch("");
                  }}
                  disabled={selectedDocuments.length === 0}
                  className="px-8 py-2.5 bg-[#156372] hover:bg-[#156372] disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-extrabold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Attach {selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : ''} Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cloud Picker Modal */}
        {isCloudPickerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setIsCloudPickerOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Cloud Services Sidebar */}
                <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
                  <div className="p-2">
                    {[
                      { id: "taban", name: "Taban Books Drive", icon: Grid3x3 },
                      { id: "gdrive", name: "Google Drive", icon: HardDrive },
                      { id: "dropbox", name: "Dropbox", icon: Box },
                      { id: "box", name: "Box", icon: Square },
                      { id: "onedrive", name: "OneDrive", icon: Cloud },
                    ].map((provider) => {
                      const IconComponent = provider.icon;
                      const isSelected = selectedCloudProvider === provider.id;
                      return (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedCloudProvider(provider.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected
                            ? "bg-teal-50 text-teal-700 border-l-4 border-[#156372]"
                            : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          <IconComponent
                            size={24}
                            className={isSelected ? "text-teal-700" : "text-gray-500"}
                          />
                          <span>{provider.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Scroll indicator */}
                  <div className="mt-auto p-2 flex justify-center">
                    <div className="flex flex-col gap-1">
                      <ChevronUp size={16} className="text-gray-300" />
                      <ChevronDown size={16} className="text-gray-300" />
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                  {selectedCloudProvider === "gdrive" ? (
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Google Drive Authentication Content */}
                      {/* Google Drive Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32">
                          {/* Google Drive Triangle Logo */}
                          <svg viewBox="0 0 256 256" className="w-full h-full">
                            {/* Green triangle */}
                            <path
                              d="M128 32L32 128l96 96V32z"
                              fill="#0F9D58"
                            />
                            {/* Blue triangle */}
                            <path
                              d="M128 32l96 96-96 96V32z"
                              fill="#4285F4"
                            />
                            {/* Yellow triangle */}
                            <path
                              d="M32 128l96 96V128L32 32v96z"
                              fill="#F4B400"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books. The use and transfer of information received from Google APIs to Taban Books will adhere to{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            Google API Services User Data Policy
                          </a>
                          , including the{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            Limited Use Requirements
                          </a>
                          .
                        </p>
                      </div>

                      {/* Authenticate Google Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://accounts.google.com/v3/signin/accountchooser?access_type=offline&approval_prompt=force&client_id=932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fapps.tabanbooks.com%2Fauth%2Fgoogle&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=3a3b0106a0c2d908b369a75ad93185c0aa431c64497733bda2d375130c4da610d88104c252c552adc1dee9d6167ad6bb8d2258113b9dce48b47ca4a970314a1fa7b51df3a7716016ac37be9e7d4d9f21077f946b82dc039ae2f08b7be79117042545529cf82d67d58ef6426621f5b5f885af900571347968d419f6d1a5abe3e7e1a3a4d04a433a6b3c5173f68c0c5bea&dsh=S557386361%3A1766903862725658&o2v=1&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAP8z-36EGAbjuuLEd2uWDyjQgraM1HNpjnJVe4mUhXhPOQkoJHNKZG6WoCFPPrb5EDYGeFuyF3TI7jUSvDUIwBbk0PGoZLgn4Jt5TdOWWzFyQf6jLfEXhnKHaHRvCzRofERa0CbAnwAUviCEIRh6OE8GWAy3xDGHH6VltpKe7vSGjJfzwkDnAckJm1v9fghFiv7u6_xqfZlF8iB26QlWNE86HHYqzyIP3N9LKEh0NWNZAdiV__IdSu_RqOJPYoHDRNRRsyctIbVsj3CDhUyCADZvROzoeQI9VvIqJSiWLTxE7royBXKDDS96rJYovyIQ79hC_n_aNjoPVUD9jfp5cnJkn_rkGpzetwAYJTRSKhP8gM5YlFdK2Pfp2uT6ZHzVAOYmlyeCX4dc1IsyRtinTLx5WyAUPR_QcLPQzuQcRPvtjL23ZvKxoexvKp3t4zX_HTFKMrduT4G6ojAd7C-kurnZ1Wx6g%26flowName%3DGeneralOAuthFlow%26as%3DS557386361%253A1766903862725658%26client_id%3D932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fapps.tabanbooks.com",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Google
                      </button>
                    </div>
                  ) : selectedCloudProvider === "dropbox" ? (
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Dropbox Authentication Content */}
                      {/* Dropbox Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Dropbox Box Logo - Geometric box made of smaller boxes */}
                          <svg viewBox="0 0 128 128" className="w-full h-full">
                            <defs>
                              <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061FF" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            {/* Dropbox geometric box icon - composed of smaller boxes */}
                            <g fill="url(#dropboxGradient)">
                              {/* Top-left box */}
                              <rect x="8" y="8" width="48" height="48" rx="4" />
                              {/* Top-right box */}
                              <rect x="72" y="8" width="48" height="48" rx="4" />
                              {/* Bottom-left box */}
                              <rect x="8" y="72" width="48" height="48" rx="4" />
                              {/* Bottom-right box */}
                              <rect x="72" y="72" width="48" height="48" rx="4" />
                            </g>
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Dropbox Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=ovpkm9147d63ifh&redirect_uri=https://apps.tabanbooks.com/dropbox/auth/v2/saveToken&state=190d910cedbc107e58195259f79a434d05c66c88e1e6eaa0bc585c6a0fddb159871ede64adb4d5da61c107ca7cbb7bae891c80e9c69cf125faaaf622ab58f37c5b1d42b42c7f3add07d92465295564a6c5bd98228654cce8ff68da24941db6f0aab9a60398ac49e41b3ec211acfd5bcc&force_reapprove=true&token_access_type=offline",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Dropbox
                      </button>
                    </div>
                  ) : selectedCloudProvider === "onedrive" ? (
                    <div className="flex flex-col items-center max-w-lg">
                      {/* OneDrive Authentication Content */}
                      {/* OneDrive Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* OneDrive Logo - Blue cloud icon */}
                          <div className="relative">
                            <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate OneDrive Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=0ecabec7-1fac-433f-a968-9985926b51c3&state=e0b1053c9465a9cb98fea7eea99d3074930c6c5607a21200967caf2db861cf9df77442c92e8565087c2a339614e18415cbeb95d59c63605cee4415353b2c44da13c6b9f34bca1fcd3abdd630595133a5232ddb876567bedbe620001a59c9989df94c3823476d0eef4363b351e8886c5563f56bc9d39db9f3db7c37cd1ad827c5.%5E.US&redirect_uri=https%3A%2F%2Fapps.tabanbooks.com%2Ftpa%2Foffice365&response_type=code&prompt=select_account&scope=Files.Read%20User.Read%20offline_access&sso_reload=true",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate OneDrive
                      </button>
                    </div>
                  ) : selectedCloudProvider === "box" ? (
                    <div className="flex flex-col items-center max-w-lg">
                      {/* Box Authentication Content */}
                      {/* Box Logo */}
                      <div className="mb-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          {/* Box Logo - Square with gradient */}
                          <svg viewBox="0 0 128 128" className="w-full h-full">
                            <defs>
                              <linearGradient id="boxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0061D5" />
                                <stop offset="100%" stopColor="#0052CC" />
                              </linearGradient>
                            </defs>
                            <rect width="128" height="128" rx="8" fill="url(#boxGradient)" />
                          </svg>
                        </div>
                      </div>

                      {/* Terms and Conditions Text */}
                      <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                        <p>
                          By clicking on this button you agree to the provider's{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            terms of use
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-teal-700 underline hover:text-teal-800"
                            onClick={(e) => e.preventDefault()}
                          >
                            privacy policy
                          </a>{" "}
                          and understand that the rights to use this product do not come from Taban Books.
                        </p>
                      </div>

                      {/* Authenticate Box Button */}
                      <button
                        className="px-8 py-3 bg-[#156372] text-white rounded-md text-sm font-semibold hover:bg-[#0D4A52] transition-colors shadow-sm"
                        onClick={() => {
                          window.open(
                            "https://account.box.com/api/oauth2/authorize?response_type=code&client_id=f95f6ysfm8vg1q3g84m0xyyblwnj3tr5&redirect_uri=https%3A%2F%2Fapps.tabanbooks.com%2Fauth%2Fbox&state=37e352acfadd37786b1d388fb0f382baa59c9246f4dda329361910db55643700578352e4636bde8a0743bd3060e51af0ee338a34b2080bbd53a337f46b0995e28facbeff76d7efaf8db4493a0ef77be45364e38816d94499fba739987744dd1f6f5c08f84c0a11b00e075d91d7ea5c6d",
                            "_blank"
                          );
                        }}
                      >
                        Authenticate Box
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex-1 overflow-hidden flex flex-col">
                      {/* Taban Books Drive or Default Content */}
                      {/* Search bar inside picker */}
                      <div className="mb-4 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search in ${selectedCloudProvider === 'taban' ? 'Taban Books Drive' : 'Cloud'}...`}
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-teal-600 transition-all font-medium text-slate-700"
                          value={cloudSearchQuery}
                          onChange={(e) => setCloudSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* File list area */}
                      <div className="flex-1 overflow-auto border border-gray-200 rounded-md">
                        <div className="text-center text-gray-500 py-20">
                          <Cloud size={48} className="mx-auto mb-4 text-gray-300" />
                          <p className="text-sm">Connect to {selectedCloudProvider === 'taban' ? 'Taban Books Drive' : 'Cloud'} to browse files</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsCloudPickerOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle cloud file attachment
                    setIsCloudPickerOpen(false);
                  }}
                  disabled={selectedCloudFiles.length === 0}
                  className="px-6 py-2 bg-[#156372] text-white rounded-md text-sm font-medium hover:bg-[#0D4A52] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Attach Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>



      {
        isChooseTemplateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Choose Template</h2>
                <button
                  className="p-2 bg-[#156372] text-white rounded hover:bg-[#0D4A52] transition-colors"
                  onClick={() => setIsChooseTemplateModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder="Search templates..."
                    />
                  </div>
                </div>

                {/* Template Options */}
                <div className="space-y-3">
                  {[
                    "Standard Template",
                    "Professional Template",
                    "Modern Template",
                    "Classic Template",
                    "Minimal Template"
                  ]
                    .filter(template => template.toLowerCase().includes(templateSearch.toLowerCase()))
                    .map((template) => (
                      <div
                        key={template}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTemplate === template
                          ? "border-[#156372] bg-teal-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{template}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {template === "Standard Template" && "Clean and professional layout"}
                              {template === "Professional Template" && "Detailed business layout"}
                              {template === "Modern Template" && "Contemporary design"}
                              {template === "Classic Template" && "Traditional business style"}
                              {template === "Minimal Template" && "Simple and clean"}
                            </div>
                          </div>
                          {selectedTemplate === template && (
                            <div className="w-5 h-5 bg-[#156372] rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: purchasesTheme.primary }}
                  onClick={() => {
                    setIsChooseTemplateModalOpen(false);
                  }}
                >
                  Apply Template
                </button>
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  onClick={() => setIsChooseTemplateModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Organization Address Modal */}
      {
        isOrganizationAddressModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Organization Address</h2>
                <button
                  className="p-2 bg-[#156372] text-white rounded hover:bg-[#0D4A52] transition-colors"
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
                          src={logoPreview}
                          alt="Logo Preview"
                          className="w-20 h-20 object-cover rounded border border-gray-300"
                        />
                        <button
                          className="absolute -top-2 -right-2 p-1 bg-[#156372] text-white rounded-full hover:bg-[#0D4A52]"
                          onClick={() => {
                            setLogoPreview(null);
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
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                        style={{ background: purchasesTheme.primary }}
                        onClick={() => organizationAddressFileInputRef.current?.click()}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder="taleex"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={organizationData.street2}
                      onChange={(e) => setOrganizationData({ ...organizationData, street2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={organizationData.city}
                      onChange={(e) => setOrganizationData({ ...organizationData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder="mogadishu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      value={organizationData.zipCode}
                      onChange={(e) => setOrganizationData({ ...organizationData, zipCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder="22223"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                    <input
                      type="text"
                      value={organizationData.stateProvince}
                      onChange={(e) => setOrganizationData({ ...organizationData, stateProvince: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder="Nairobi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={organizationData.phone}
                      onChange={(e) => setOrganizationData({ ...organizationData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fax Number</label>
                    <input
                      type="text"
                      value={organizationData.faxNumber}
                      onChange={(e) => setOrganizationData({ ...organizationData, faxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={organizationData.websiteUrl}
                      onChange={(e) => setOrganizationData({ ...organizationData, websiteUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: purchasesTheme.primary }}
                  onClick={() => {
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
        )
      }

      {/* Terms & Conditions Modal */}
      {
        isTermsAndConditionsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Update Terms & Conditions</h2>
                <button
                  className="p-2 bg-[#156372] text-white rounded hover:bg-[#0D4A52] transition-colors"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y min-h-[100px]"
                    placeholder="Enter notes..."
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsData.useNotesForAllStatements}
                      onChange={(e) => setTermsData({ ...termsData, useNotesForAllStatements: e.target.checked })}
                      className="w-4 h-4 text-teal-700 border-gray-300 rounded focus:ring-teal-600"
                    />
                    <span className="text-sm text-gray-700">Use this in future for all statements of all vendors.</span>
                  </label>
                </div>

                {/* Terms & Conditions Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                  <textarea
                    value={termsData.termsAndConditions}
                    onChange={(e) => setTermsData({ ...termsData, termsAndConditions: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y min-h-[200px]"
                    placeholder="Enter terms and conditions..."
                  />
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsData.useTermsForAllStatements}
                      onChange={(e) => setTermsData({ ...termsData, useTermsForAllStatements: e.target.checked })}
                      className="w-4 h-4 text-teal-700 border-gray-300 rounded focus:ring-teal-600"
                    />
                    <span className="text-sm text-gray-700">Use this in future for all statements of all vendors.</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: purchasesTheme.primary }}
                  onClick={() => {
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
        )
      }

      {/* Address Modal */}
      {
        showAddressModal && typeof document !== 'undefined' && document.body && createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
            }}
            onClick={() => setShowAddressModal(false)}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                width: "100%",
                maxWidth: "500px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
              }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}>
                  {addressType === "billing" ? "Billing Address" : "Shipping Address"}
                </h2>
                <button
                  onClick={() => setShowAddressModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={20} style={{ color: "#6b7280" }} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Attention
                  </label>
                  <input
                    type="text"
                    value={addressFormData.attention}
                    onChange={(e) => setAddressFormData({ ...addressFormData, attention: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder=""
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Country/Region
                  </label>
                  <select
                    value={addressFormData.country}
                    onChange={(e) => setAddressFormData({ ...addressFormData, country: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="">Select or type to add</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="KE">Kenya</option>
                    <option value="SO">Somalia</option>
                  </select>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Address
                  </label>
                  <div style={{ marginBottom: "8px" }}>
                    <input
                      type="text"
                      value={addressFormData.addressLine1}
                      onChange={(e) => setAddressFormData({ ...addressFormData, addressLine1: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Address Line 1"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={addressFormData.addressLine2}
                      onChange={(e) => setAddressFormData({ ...addressFormData, addressLine2: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Address Line 2"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={addressFormData.city}
                    onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder=""
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    State
                  </label>
                  <select
                    value={addressFormData.state}
                    onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="">Select or type to add</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                  </select>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    value={addressFormData.zipCode}
                    onChange={(e) => setAddressFormData({ ...addressFormData, zipCode: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder=""
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    value={addressFormData.phone}
                    onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder=""
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Fax Number
                  </label>
                  <input
                    type="text"
                    value={addressFormData.faxNumber}
                    onChange={(e) => setAddressFormData({ ...addressFormData, faxNumber: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder=""
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "20px 24px",
                borderTop: "1px solid #e5e7eb",
              }}>
                <button
                  onClick={() => setShowAddressModal(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddressSave}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Contact Person Modal */}
      {
        isAddContactPersonModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add Contact Person</h2>
                <button
                  className="flex items-center justify-center w-7 h-7 border-2 rounded text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                  style={{ borderColor: "#156372" }}
                  onClick={() => {
                    setIsAddContactPersonModalOpen(false);
                    setNewContactPerson({
                      salutation: "Mr",
                      firstName: "",
                      lastName: "",
                      email: "",
                      workPhone: "",
                      mobile: "",
                      skype: "",
                      designation: "",
                      department: "",
                      enablePortalAccess: true
                    });
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Name Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                      <select
                        value={newContactPerson.salutation}
                        onChange={(e) => setNewContactPerson(prev => ({ ...prev, salutation: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372] appearance-none pr-8"
                      >
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Dr">Dr</option>
                        <option value="Prof">Prof</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={newContactPerson.firstName}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, firstName: e.target.value }))}
                      className="col-span-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={newContactPerson.lastName}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, lastName: e.target.value }))}
                      className="col-span-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newContactPerson.email}
                    onChange={(e) => setNewContactPerson(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                  />
                </div>

                {/* Phone Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="tel"
                      placeholder="Work Phone"
                      value={newContactPerson.workPhone}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, workPhone: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile"
                      value={newContactPerson.mobile}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, mobile: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Skype Name/Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skype Name/Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Skype Name/Number"
                      value={newContactPerson.skype}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, skype: e.target.value }))}
                      className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Other Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Other Details</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Designation"
                      value={newContactPerson.designation}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, designation: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                    <input
                      type="text"
                      placeholder="Department"
                      value={newContactPerson.department}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, department: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#156372] focus:border-[#156372]"
                    />
                  </div>
                </div>

                {/* Enable Portal Access */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="enablePortalAccess"
                      checked={newContactPerson.enablePortalAccess}
                      onChange={(e) => setNewContactPerson(prev => ({ ...prev, enablePortalAccess: e.target.checked }))}
                      className="mt-1 w-4 h-4 border-gray-300 rounded focus:ring-[#156372] cursor-pointer"
                      style={{ accentColor: "#156372" }}
                    />
                    <div className="flex-1">
                      <label htmlFor="enablePortalAccess" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                        Enable portal access
                      </label>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        This vendor will be able to see all their transactions with your organization by logging in to the portal using their email address.{" "}
                        <a href="#" className="hover:underline font-medium transition-colors" style={{ color: "#156372" }} onMouseEnter={(e) => e.target.style.color = "#0D4A52"} onMouseLeave={(e) => e.target.style.color = "#156372"}>Learn More</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-start gap-3 p-6 border-t border-gray-200">
                <button
                  className="px-6 py-2 text-white rounded-md text-sm font-medium cursor-pointer transition-all"
                  style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}
                  onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                  onClick={handleContactPersonSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
