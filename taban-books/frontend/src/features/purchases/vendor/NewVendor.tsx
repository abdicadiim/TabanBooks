import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { vendorsAPI, currenciesAPI, taxesAPI, accountsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";

import {
  ChevronDown,
  X,
  Info,
  Phone,
  Mail,
  Upload as UploadIcon,
  Copy,
  File,
  Trash2,
  Globe,
  Plus,
  MoreVertical,
  Settings,
  Search,
} from "lucide-react";
import PaymentTermsDropdown from "./PaymentTermsDropdown";
import ConfigurePaymentTermsModal from "./ConfigurePaymentTermsModal";



// Help Tooltip Component
function HelpTooltip({ text, children }: { text: React.ReactNode, children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 10 // 10px spacing from the icon
      });
    }
  }, [show]);

  return (
    <div
      ref={targetRef}
      className="inline-block relative leading-none"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div
          className="fixed z-[999999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(0, -50%)'
          }}
        >
          <div className="bg-[#1e2235] text-white text-[13px] leading-relaxed py-2 px-4 rounded-md shadow-xl max-w-[280px] relative font-normal">
            {text}
            {/* Arrow */}
            <div className="absolute top-1/2 right-full -translate-y-1/2 border-[6px] border-transparent border-r-[#1e2235]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function NewVendor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const { code: baseCurrencyCode } = useCurrency();

  const [formData, setFormData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    workPhone: "",
    mobile: "",
    vendorLanguage: "English",
    taxRate: "",
    enableTDS: false,
    companyId: "",
    currency: "",
    accountsPayable: "",
    openingBalance: "",
    paymentTerms: "Due on Receipt",
    enablePortal: false,
    locationCode: "",
    // Billing Address

    billingAttention: "",
    billingCountry: "",
    billingStreet1: "",
    billingStreet2: "",
    billingCity: "",
    billingState: "",
    billingZipCode: "",
    billingPhone: "",
    billingFax: "",
    // Shipping Address
    shippingAttention: "",
    shippingCountry: "",
    shippingStreet1: "",
    shippingStreet2: "",
    shippingCity: "",
    shippingState: "",
    shippingZipCode: "",
    shippingPhone: "",
    shippingFax: "",
    remarks: "",
    // Additional details
    websiteUrl: "",
    department: "",
    designation: "",
    xSocial: "",
    skypeName: "",
    facebook: "",
  });
  const [activeTab, setActiveTab] = useState("Other Details");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [contactPersons, setContactPersons] = useState([
    { id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skypeName: "", designation: "", department: "" }
  ]);
  const [showAdditionalColumns, setShowAdditionalColumns] = useState(false);
  const fileInputRef = useRef(null);
  const uploadDropdownRef = useRef(null);
  const [showConfigureTerms, setShowConfigureTerms] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [availableTaxes, setAvailableTaxes] = useState([]);
  const [accountsPayableOptions, setAccountsPayableOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await currenciesAPI.getAll();
        if (response.success && response.data) {
          setCurrencies(response.data);
          // Set default currency if none selected
          if (!formData.currency && response.data.length > 0) {
            const baseCurrency = response.data.find(curr => curr.isBaseCurrency);
            const defaultCurrency = baseCurrency || response.data[0];
            setFormData(prev => ({
              ...prev,
              currency: `${defaultCurrency.code} - ${defaultCurrency.name}`
            }));
          }
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
      } finally {
        setLoadingCurrencies(false);
      }
    };

    loadCurrencies();
  }, []);

  useEffect(() => {
    const loadTaxRatesAndAccounts = async () => {
      try {
        const [taxesResponse, accountsResponse] = await Promise.all([
          taxesAPI.getAll({ status: "active" }).catch(() => taxesAPI.getAll()),
          accountsAPI.getAll({ limit: 1000 }),
        ]);

        const rawTaxes = taxesResponse?.data || taxesResponse?.taxes || [];
        setAvailableTaxes(Array.isArray(rawTaxes) ? rawTaxes : []);

        const rawAccounts = accountsResponse?.data?.accounts || accountsResponse?.data || accountsResponse?.accounts || [];
        const apAccounts = (Array.isArray(rawAccounts) ? rawAccounts : [])
          .filter((acc: any) => {
            const accountType = String(acc?.accountType || acc?.type || "").toLowerCase();
            const accountName = String(acc?.accountName || acc?.name || acc?.displayName || "").toLowerCase();
            return accountType.includes("accounts payable") || accountName === "accounts payable";
          })
          .map((acc: any) => acc?.accountName || acc?.displayName || acc?.name)
          .filter(Boolean);

        setAccountsPayableOptions([...new Set(apAccounts)]);
      } catch (error) {
        console.error("Error loading taxes/accounts payable:", error);
      }
    };

    loadTaxRatesAndAccounts();
  }, []);

  useEffect(() => {
    const loadVendorData = async () => {
      if (isEdit && id) {
        try {
          const response = await vendorsAPI.getById(id);
          if (response.success && response.data) {
            const vendorData = response.data;
            setFormData(prev => ({
              ...prev,
              displayName: vendorData.displayName || vendorData.name,
              companyName: vendorData.companyName,
              firstName: vendorData.firstName,
              lastName: vendorData.lastName,
              email: vendorData.email,
              workPhone: vendorData.workPhone,
              mobile: vendorData.mobile,
              websiteUrl: vendorData.websiteUrl,
              currency: vendorData.currency,
              paymentTerms: vendorData.paymentTerms,
              openingBalance: vendorData.openingBalance,
              taxRate: vendorData.taxRate,
              enableTDS: vendorData.enableTDS || false,
              companyId: vendorData.companyId,
              accountsPayable: vendorData.accountsPayable,
              locationCode: vendorData.locationCode,
              vendorLanguage: vendorData.vendorLanguage,
              enablePortal: vendorData.enablePortal,
              billingAttention: vendorData.billingAddress?.attention,
              billingCountry: vendorData.billingAddress?.country,
              billingStreet1: vendorData.billingAddress?.street1,
              billingStreet2: vendorData.billingAddress?.street2,
              billingCity: vendorData.billingAddress?.city,
              billingState: vendorData.billingAddress?.state,
              billingZipCode: vendorData.billingAddress?.zipCode,
              billingPhone: vendorData.billingAddress?.phone,
              billingFax: vendorData.billingAddress?.fax,
              shippingAttention: vendorData.shippingAddress?.attention,
              shippingCountry: vendorData.shippingAddress?.country,
              shippingStreet1: vendorData.shippingAddress?.street1,
              shippingStreet2: vendorData.shippingAddress?.street2,
              shippingCity: vendorData.shippingAddress?.city,
              shippingState: vendorData.shippingAddress?.state,
              shippingZipCode: vendorData.shippingAddress?.zipCode,
              shippingPhone: vendorData.shippingAddress?.phone,
              shippingFax: vendorData.shippingAddress?.fax,
              remarks: vendorData.remarks,
              notes: vendorData.notes,
            }));
            if (vendorData.contactPersons && vendorData.contactPersons.length > 0) {
              setContactPersons(vendorData.contactPersons);
            }
            if (vendorData.documents && vendorData.documents.length > 0) {
              setDocuments(vendorData.documents);
            }
          }
        } catch (error) {
          console.error('Error loading vendor:', error);
        }
      } else if (location.state && location.state.clonedData) {
        // Handle cloning
        const cloned = location.state.clonedData;
        setFormData(prev => ({
          ...prev,
          ...cloned.formData,
          displayName: cloned.name,
          firstName: cloned.firstName || "",
          lastName: cloned.lastName || "",
        }));
        if (cloned.formData && cloned.formData.contactPersons) {
          setContactPersons(cloned.formData.contactPersons);
        }
      }
    };

    loadVendorData();
  }, [id, isEdit, location.state]);

  // Close upload dropdown when clicking outside
  useEffect(() => {

    const handleClickOutside = (event) => {
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target)) {
        setUploadDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      documents.forEach(doc => {
        if (doc.preview) {
          URL.revokeObjectURL(doc.preview);
        }
      });
    };
  }, [documents]);

  const handleFileUpload = (files) => {
    const fileArray = Array.from(files);
    const maxFiles = 10;
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes

    // Check if adding these files would exceed the limit
    if (documents.length + fileArray.length > maxFiles) {
      alert(`You can upload a maximum of ${maxFiles} files.`);
      return;
    }

    // Filter and validate files
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds the maximum size of 10MB.`);
        return false;
      }
      return true;
    });

    // Convert files to base64 and add to documents
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(prev => [...prev, {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          base64: reader.result, // Store as base64 for persistence
          preview: URL.createObjectURL(file), // For display
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDocument = (id) => {
    setDocuments(prev => {
      const doc = prev.find(d => d.id === id);
      if (doc && doc.preview) {
        URL.revokeObjectURL(doc.preview);
      }
      return prev.filter(d => d.id !== id);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const copyBillingToShipping = () => {
    setFormData((prev) => ({
      ...prev,
      shippingAttention: prev.billingAttention,
      shippingCountry: prev.billingCountry,
      shippingStreet1: prev.billingStreet1,
      shippingStreet2: prev.billingStreet2,
      shippingCity: prev.billingCity,
      shippingState: prev.billingState,
      shippingZipCode: prev.billingZipCode,
      shippingPhone: prev.billingPhone,
      shippingFax: prev.billingFax,
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedData = { ...formData, [name]: type === "checkbox" ? checked : value };

    // Auto-generate display name options when firstName, lastName, or companyName changes
    if (name === "firstName" || name === "lastName" || name === "companyName") {
      const options = generateDisplayNameOptions(updatedData);
      // If displayName is empty or matches a previous option, set it to the first option
      if (!updatedData.displayName || options.includes(updatedData.displayName)) {
        updatedData.displayName = options[0] || "";
      }
    }

    setFormData(updatedData);
  };

  const generateDisplayNameOptions = (data) => {
    const { firstName, lastName, companyName } = data;
    const options = [];

    if (companyName) {
      options.push(companyName);
    }

    if (firstName && lastName) {
      options.push(`${firstName} ${lastName}`);
      options.push(`${lastName}, ${firstName}`);
    } else if (firstName) {
      options.push(firstName);
    } else if (lastName) {
      options.push(lastName);
    }

    if (companyName && firstName && lastName) {
      options.push(`${companyName} (${firstName} ${lastName})`);
    }

    return options.length > 0 ? options : [""];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    // Create vendorData object matching API structure
    // Ensure displayName and name are never empty
    const displayName = formData.displayName || formData.companyName || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Vendor';
    const vendorData = {
      displayName: displayName,
      name: displayName,
      vendorType: (formData.companyName && formData.companyName.trim()) ? 'business' : 'individual',
      salutation: formData.salutation || '',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      companyName: formData.companyName || '',
      email: formData.email || '',
      workPhone: formData.workPhone || '',
      mobile: formData.mobile || '',
      websiteUrl: formData.websiteUrl || '',
      xHandle: formData.xSocial || '',
      skypeName: formData.skypeName || '',
      facebook: formData.facebook || '',
      vendorLanguage: formData.vendorLanguage || 'english',
      taxRate: formData.taxRate || '',
      enableTDS: !!formData.enableTDS,
      companyId: formData.companyId || '',
      locationCode: formData.locationCode || '',
      currency: formData.currency?.split("-")[0]?.trim() || baseCurrencyCode || 'USD',
      paymentTerms: formData.paymentTerms || 'net_30',
      department: formData.department || '',
      designation: formData.designation || '',
      accountsPayable: formData.accountsPayable || '',
      openingBalance: formData.openingBalance || '0.00',
      enablePortal: formData.enablePortal || false,
      remarks: formData.remarks || '',
      notes: formData.notes || '',
      billingAddress: {
        attention: formData.billingAttention || '',
        country: formData.billingCountry || '',
        street1: formData.billingStreet1 || '',
        street2: formData.billingStreet2 || '',
        city: formData.billingCity || '',
        state: formData.billingState || '',
        zipCode: formData.billingZipCode || '',
        phone: formData.billingPhone || '',
        fax: formData.billingFax || ''
      },
      shippingAddress: {
        attention: formData.shippingAttention || '',
        country: formData.shippingCountry || '',
        street1: formData.shippingStreet1 || '',
        street2: formData.shippingStreet2 || '',
        city: formData.shippingCity || '',
        state: formData.shippingState || '',
        zipCode: formData.shippingZipCode || '',
        phone: formData.shippingPhone || '',
        fax: formData.shippingFax || ''
      },
      contactPersons: contactPersons.filter(cp => cp.firstName && cp.lastName).map(cp => ({
        salutation: cp.salutation || '',
        firstName: cp.firstName,
        lastName: cp.lastName,
        email: cp.email || '',
        workPhone: cp.workPhone || '',
        mobile: cp.mobile || '',
        designation: cp.designation || '',
        department: cp.department || '',
        skypeName: cp.skypeName || '',
        isPrimary: cp.isPrimary || false
      })),
      documents: documents.map(doc => ({
        name: doc.name,
        url: doc.base64 || doc.url || '',
        uploadedAt: doc.uploadedAt || new Date()
      }))
    };

    try {
      setIsSaving(true);
      console.log('Saving vendor data:', vendorData);
      let response;
      if (isEdit) {
        // Update existing vendor via API
        console.log('Updating vendor with ID:', id);
        response = await vendorsAPI.update(id, vendorData);
      } else {
        // Create new vendor via API
        console.log('Creating new vendor');
        response = await vendorsAPI.create(vendorData);
      }

      console.log('Save response:', response);

      if (response && response.success) {
        // Get the vendor ID from the response
        const newVendorId = response.data?._id || response.data?.id || response._id || response.id;

        // Dispatch custom event to notify Vendor component
        window.dispatchEvent(new Event("vendorSaved"));

        // If we have a valid vendor ID, navigate to the detail page
        if (newVendorId && /^[0-9a-fA-F]{24}$/.test(String(newVendorId))) {
          console.log('Navigating to vendor detail page with ID:', newVendorId);
          navigate(`/purchases/vendors/${newVendorId}`);
          return; // Exit early to prevent default navigation
        } else {
          console.warn('Vendor created but ID is invalid:', newVendorId);
          // If ID is invalid, just go to vendor list
          navigate("/purchases/vendors");
          return;
        }
      } else {
        const errorMsg = response?.message || 'Failed to save vendor';
        const detailedError = response?.error ? `: ${response.error}` : '';
        throw new Error(errorMsg + detailedError);
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Failed to save vendor: ' + (error.message || 'Unknown error. Please check console.'));
      return; // Don't navigate if save failed
    } finally {
      setIsSaving(false);
    }

    // Check if we need to return to a specific page (e.g., from New Bill page)
    const searchParams = new URLSearchParams(location.search);
    const returnTo = searchParams.get("returnTo");

    if (returnTo) {
      // Navigate back to the return page with the vendor name
      navigate(`${returnTo}?vendorName=${encodeURIComponent(vendorData.name)}`);
    } else if (isEdit && id) {
      // If editing, navigate to the detail page
      navigate(`/purchases/vendors/${id}`);
    } else {
      // For new vendors, navigation is already handled above (to detail page or list)
      // This is a fallback in case the ID wasn't available
      navigate("/purchases/vendors");
    }
  };


  const handleCancel = () => {
    navigate("/purchases/vendors");
  };

  const styles = {
    container: {
      width: "100%",
      backgroundColor: "#ffffff",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "16px 24px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#ffffff",
    },
    title: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#111827",
      margin: 0,
    },
    close: {
      color: "#6b7280",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
    },
    body: {
      padding: "0",
      flex: 1,
      width: "100%",
      margin: "0",
    },
    section: {
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    formGroup: {
      marginBottom: "16px",
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      gap: "24px",
      alignItems: "flex-start",
    },
    formRow: {
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      gap: "24px",
      alignItems: "flex-start",
      marginBottom: "20px",
    },
    formRowLabel: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      paddingTop: "8px",
    },
    formRowInput: {
      flex: 1,
    },
    label: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    labelWithInfo: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    infoIcon: {
      color: "#6b7280",
      cursor: "help",
      width: "16px",
      height: "16px",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    select: {
      width: "100%",
      padding: "8px 32px 8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 12px center",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px",
      gridColumn: "1 / -1",
    },
    row2: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "16px",
    },
    phoneRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
    },
    phoneInput: {
      position: "relative",
    },
    phoneIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
      width: "16px",
      height: "16px",
    },
    phoneInputField: {
      width: "100%",
      padding: "8px 12px 8px 36px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    emailInput: {
      position: "relative",
      width: "100%",
    },
    emailIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
      width: "16px",
      height: "16px",
      pointerEvents: "none",
    },
    tabs: {
      display: "flex",
      gap: "8px",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "24px",
    },
    tab: {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#6b7280",
      background: "none",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
    },
    tabActive: {
      color: "#156372",
      borderBottomColor: "#156372",
    },
    helperText: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "4px",
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
    uploadButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
      fontSize: "14px",
    },
    uploadDropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      marginTop: "4px",
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      zIndex: 1000,
      minWidth: "200px",
    },
    uploadDropdownItem: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "100%",
      padding: "8px 12px",
      border: "none",
      backgroundColor: "transparent",
      color: "#374151",
      cursor: "pointer",
      fontSize: "14px",
      textAlign: "left",
    },
    documentsList: {
      marginTop: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    documentItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "6px 10px",
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      backgroundColor: "#f9fafb",
    },
    removeDocumentBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px",
      border: "none",
      backgroundColor: "transparent",
      color: "#156372",
      cursor: "pointer",
      borderRadius: "4px",
    },
    link: {
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
    },
    linkButton: {
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      background: "none",
      border: "none",
      padding: 0,
      textAlign: "left",
    },
    moreDetailsSection: {
      marginTop: "16px",
      paddingTop: "16px",
      width: "100%",
    },
    moreDetailsDivider: {
      height: "1px",
      backgroundColor: "#e5e7eb",
      marginBottom: "24px",
    },
    iconInput: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: "12px",
      color: "#6b7280",
      pointerEvents: "none",
    },
    inputWithIcon: {
      width: "100%",
      maxWidth: "400px",
      padding: "8px 12px 8px 36px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    xIcon: {
      position: "absolute",
      left: "12px",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
      fontSize: "12px",
      fontWeight: "600",
      pointerEvents: "none",
    },
    skypeIcon: {
      position: "absolute",
      left: "12px",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    },
    facebookIcon: {
      position: "absolute",
      left: "12px",
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "12px",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
      marginTop: "16px",
    },
    cancelBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
    },
    saveBtn: {
      padding: "8px 16px",
      fontSize: "14px",
      backgroundColor: "#156372",
      color: "#ffffff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
    },
    addressContainer: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
    },
    addressSection: {
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      padding: "16px",
    },
    addressTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    copyLink: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      color: "#156372",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      background: "none",
      border: "none",
      padding: 0,
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "60px",
      fontFamily: "inherit",
    },
    noteSection: {
      marginTop: "24px",
      padding: "16px",
      backgroundColor: "#fef3c7",
      borderRadius: "6px",
      borderLeft: "4px solid #f59e0b",
    },
    noteTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#92400e",
      marginBottom: "8px",
    },
    noteList: {
      margin: 0,
      paddingLeft: "20px",
      color: "#78350f",
      fontSize: "13px",
    },
    noteItem: {
      marginBottom: "4px",
    },
    remarksLabel: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "8px",
    },
    remarksLabelSubtext: {
      color: "#6b7280",
      fontWeight: "400",
    },
    remarksTextarea: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "120px",
      fontFamily: "inherit",
    },
    contactPersonsTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "16px",
    },
    contactPersonsHeader: {
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    },
    contactPersonsHeaderCell: {
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      textTransform: "uppercase",
    },
    contactPersonsRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    contactPersonsCell: {
      padding: "8px 12px",
    },
    contactPersonsInput: {
      width: "100%",
      padding: "6px 8px",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    contactPersonsActions: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    contactPersonsActionBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
    },
    contactPersonsDeleteBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#156372",
    },
    addContactPersonBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      color: "#156372",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    },
    emptyState: {
      padding: "48px 24px",
      textAlign: "center",
      color: "#6b7280",
      fontSize: "14px",
    },
    emptyStateText: {
      marginBottom: "8px",
    },
    emptyStateLink: {
      color: "#156372",
      textDecoration: "none",
      cursor: "pointer",
    },
    rightSidebar: {
      width: "350px",
      minWidth: "350px",
      backgroundColor: "#ffffff",
      borderLeft: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
    documentsHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#f9fafb",
    },
    documentsTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#111827",
    },
    documentsTableContainer: {
      flex: 1,
      overflowY: "auto",
      padding: "16px",
    },
    documentsTable: {
      width: "100%",
      borderCollapse: "collapse",
    },
    documentsTableHeader: {
      padding: "8px 12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      textTransform: "uppercase",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
    },
    documentsTableRow: {
      borderBottom: "1px solid #e5e7eb",
    },
    documentsTableCell: {
      padding: "12px",
      fontSize: "13px",
    },
    documentsTableActionBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#156372",
      borderRadius: "4px",
    },
  };

  return (
    <div style={{ ...styles.container, backgroundColor: "#f9fafb" }}>
      <div style={{ ...styles.body, display: "flex", gap: "0", backgroundColor: "#f9fafb" }}>
        {/* Left Column - Form */}
        <div style={{ flex: 1, minWidth: 0, padding: "24px" }}>
          <h2 style={{ ...styles.title, marginBottom: "24px" }}>{isEdit ? "Edit Vendor" : "New Vendor"}</h2>

          <form onSubmit={handleSubmit} className="p-0">
            {/* Primary Contact through Vendor Language Section */}
            <div className="border-b border-gray-900/10 pb-12">
              {/* Primary Contact Section */}
              <div className="mb-10">
                <h2 className="text-base/7 font-semibold text-gray-900">
                  Primary Contact
                </h2>
                <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 items-center">
                  <div className="sm:col-span-1">
                    <label className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Primary Contact <HelpTooltip text="The primary contact will receive all emails related to transactions. You can add multiple contact persons below or from this customer's details page."><Info size={14} className="text-gray-400" /></HelpTooltip>
                    </label>
                  </div>
                  <div className="sm:col-span-1">
                    <div className="grid grid-cols-1">
                      <select
                        id="salutation"
                        name="salutation"
                        value={formData.salutation}
                        onChange={handleChange}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                        <option>Salutation</option>
                        <option>Mr.</option>
                        <option>Mrs.</option>
                        <option>Ms.</option>
                        <option>Dr.</option>
                        <option>Prof.</option>
                      </select>
                      <ChevronDown
                        aria-hidden="true"
                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div className="mb-10">
                <label htmlFor="companyName" className="block text-sm/6 font-medium text-gray-900">Company Name</label>
                <div className="mt-2">
                  <input
                    id="companyName"
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Company Name"
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div className="mb-10">
                <label htmlFor="displayName" className="flex items-center gap-1 text-sm/6 font-medium text-red-600">
                  Display Name <span className="text-red-500">*</span> <HelpTooltip text="This name will be displayed on all the transactions you create for this Vendor."><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="mt-2 grid grid-cols-1 relative">
                  <select
                    id="displayName"
                    name="displayName"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                    {generateDisplayNameOptions(formData).map((option, index) => (
                      <option key={index} value={option}>
                        {option || "Select or type to add"}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                </div>
              </div>

              {/* Email Address */}
              <div className="mb-10">
                <label htmlFor="email" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                  Email address <HelpTooltip text={<span><span className="font-bold text-blue-300">Privacy Info:</span> This data will be stored without encryption and will be visible only to your organisation users who have the required permission.</span>}><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="mt-2 relative">
                  <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    className="block w-full rounded-md bg-white pl-10 pr-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="mb-10">
                <label className="flex items-center gap-1 text-sm/6 font-medium text-gray-900 mb-2">
                  Phone <HelpTooltip text={<span><span className="font-bold text-blue-300">Privacy Info:</span> This data will be stored without encryption and will be visible only to your organisation users who have the required permission.</span>}><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
                  <div className="sm:col-span-3 flex">
                    <div className="grid grid-cols-1 relative flex-shrink-0">
                      <select className="col-start-1 row-start-1 appearance-none rounded-l-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border-r-0">
                        <option>+252</option>
                        <option>+1</option>
                        <option>+44</option>
                        <option>+33</option>
                      </select>
                      <ChevronDown size={16} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                    </div>
                    <input
                      type="tel"
                      name="workPhone"
                      value={formData.workPhone}
                      onChange={handleChange}
                      placeholder="Work Phone"
                      className="block w-full rounded-r-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mobileCheckbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label htmlFor="mobileCheckbox" className="text-sm/6 text-gray-900 cursor-pointer">Mobile</label>
                  </div>
                  <div className="sm:col-span-3 flex">
                    <div className="grid grid-cols-1 relative flex-shrink-0">
                      <select className="col-start-1 row-start-1 appearance-none rounded-l-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 border-r-0">
                        <option>+252</option>
                        <option>+1</option>
                        <option>+44</option>
                        <option>+33</option>
                      </select>
                      <ChevronDown size={16} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                    </div>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="Mobile"
                      className="block w-full rounded-r-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>

              {/* Vendor Language */}
              <div className="mb-10">
                <label htmlFor="vendorLanguage" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                  Vendor Language <HelpTooltip text="The selected language will be used for the vendor portal and all email communications."><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="mt-2 grid grid-cols-1">
                  <select
                    id="vendorLanguage"
                    name="vendorLanguage"
                    value={formData.vendorLanguage}
                    onChange={handleChange}
                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                </div>
              </div>
            </div>



            {/* Tabs */}
            <div style={styles.tabs}>
              {["Other Details", "Address", "Contact Persons", "Custom Fields", "Reporting Tags", "Remarks"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  style={{
                    ...styles.tab,
                    ...(activeTab === tab ? styles.tabActive : {}),
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}

            {/* Other Details Tab Content */}
            {activeTab === "Other Details" && (
              <div className="border-b border-gray-900/10 pb-12">
              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                  {/* Tax Rate */}
                  <div className="sm:col-span-3">
                    <label htmlFor="taxRate" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Tax Rate
                      <HelpTooltip text="To associate more than one tax, you need to create a tax group in Settings.">
                        <Info size={14} className="text-gray-400" />
                      </HelpTooltip>
                    </label>
                    <div className="mt-2">
                      <select
                        id="taxRate"
                        name="taxRate"
                        value={formData.taxRate}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                        <option value="">Select a Tax</option>
                        {availableTaxes.map((tax: any) => (
                          <option key={tax?._id || tax?.id} value={tax?._id || tax?.id}>
                            {tax?.name} ({Number(tax?.rate || 0)}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">To associate more than one tax, create a tax group in Settings.</p>
                  </div>

                  {/* TDS */}
                  <div className="sm:col-span-3">
                    <label className="text-sm/6 font-medium text-gray-900">TDS</label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        id="enableTDS"
                        type="checkbox"
                        name="enableTDS"
                        checked={formData.enableTDS}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <label htmlFor="enableTDS" className="text-sm/6 text-gray-700">
                        Enable TDS for this Vendor
                      </label>
                    </div>
                  </div>

                  {/* Company ID */}
                  <div className="sm:col-span-3">
                    <label htmlFor="companyId" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Company ID <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="mt-2">
                      <input
                        id="companyId"
                        type="text"
                        name="companyId"
                        value={formData.companyId}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>

                  {/* Accounts Payable */}
                  <div className="sm:col-span-3">
                    <label htmlFor="accountsPayable" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Accounts Payable <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="mt-2 grid grid-cols-1">
                      <select
                        id="accountsPayable"
                        name="accountsPayable"
                        value={formData.accountsPayable}
                        onChange={handleChange}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                        <option value="">Select an account</option>
                        {accountsPayableOptions.map((accountName) => (
                          <option key={accountName} value={accountName}>
                            {accountName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                    </div>
                  </div>

                  {/* Location Code */}
                  <div className="sm:col-span-3">
                    <label htmlFor="locationCode" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Location Code <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="mt-2">
                      <input
                        id="locationCode"
                        type="text"
                        name="locationCode"
                        value={formData.locationCode}
                        onChange={handleChange}
                        placeholder="Location Code"
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="sm:col-span-3">
                    <label htmlFor="currency" className="block text-sm/6 font-medium text-gray-900">Currency</label>
                    <div className="mt-2 grid grid-cols-1">
                      <select
                        id="currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        disabled={loadingCurrencies}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 border border-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 disabled:opacity-50"
                      >
                        {loadingCurrencies ? (
                          <option>Loading currencies...</option>
                        ) : (
                          currencies.map((currency) => (
                            <option key={currency._id} value={`${currency.code} - ${currency.name}`}>
                              {currency.code} - {currency.name}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                    </div>
                  </div>

                  {/* Opening Balance */}
                  <div className="sm:col-span-3">
                    <label htmlFor="openingBalance" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Opening Balance <Info size={14} className="text-gray-400" /></label>
                    <div className="mt-2 flex">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-900">
                        {formData.currency?.split("-")[0]?.trim() || baseCurrencyCode || "USD"}
                      </span>
                      <input
                        id="openingBalance"
                        type="text"
                        name="openingBalance"
                        value={formData.openingBalance}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="block w-full rounded-r-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="sm:col-span-3">
                    <label className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Payment Terms <Info size={14} className="text-gray-400" /></label>
                    <div className="mt-2">
                      <PaymentTermsDropdown
                        value={formData.paymentTerms}
                        onChange={(val) => setFormData({ ...formData, paymentTerms: val })}
                        onConfigure={() => setShowConfigureTerms(true)}
                      />
                    </div>
                  </div>

                  {/* Enable Portal */}
                  <div className="sm:col-span-6">
                    <div className="flex items-start gap-3">
                      <input
                        id="enablePortal"
                        type="checkbox"
                        name="enablePortal"
                        checked={formData.enablePortal}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mt-0.5"
                      />
                      <div>
                        <label htmlFor="enablePortal" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                          Enable Portal? <HelpTooltip text="Give your vendors access to portal to view transactions and payments."><Info size={14} className="text-gray-400" /></HelpTooltip>
                        </label>
                        <p className="mt-1 text-sm/6 text-gray-600">Allow portal access for this vendor</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-900">Documents <Info size={14} className="text-gray-400" /></label>
                      {documents.length > 0 && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#156372] text-white rounded-md text-xs font-medium"
                        >
                          <File size={12} />
                          {documents.length}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-0" ref={uploadDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-gray-300 rounded-l-md rounded-r-none text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UploadIcon size={14} />
                        Upload File
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setUploadDropdownOpen(!uploadDropdownOpen)}
                          className="inline-flex items-center justify-center px-1.5 py-1.5 bg-white border border-dashed border-gray-300 border-l-0 rounded-r-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ChevronDown size={14} className={`transition-transform ${uploadDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {uploadDropdownOpen && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[220px]">
                            <button
                              type="button"
                              onClick={() => {
                                fileInputRef.current?.click();
                                setUploadDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-gray-700 text-left hover:bg-[#0D4A52] hover:text-white flex items-center gap-2 transition-colors"
                            >
                              Attach From Desktop
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Handle attach from documents
                                setUploadDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-gray-700 text-left hover:bg-[#0D4A52] hover:text-white flex items-center gap-2 transition-colors"
                            >
                              Attach From Documents
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Handle attach from cloud
                                setUploadDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-gray-700 text-left hover:bg-[#0D4A52] hover:text-white flex items-center gap-2 transition-colors"
                            >
                              Attach From Cloud
                            </button>
                            <div className="border-t border-gray-200 px-3 py-2 flex items-center justify-center gap-2">
                              {/* Google Drive */}
                              <button
                                type="button"
                                onClick={() => {
                                  // Handle Google Drive
                                  setUploadDropdownOpen(false);
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity"
                                title="Google Drive"
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                  <path fill="#4285F4" d="M7.71 12.5L12 4.5l4.29 8h-8.58z" />
                                  <path fill="#34A853" d="M12 4.5L7.71 12.5H2.5L12 4.5z" />
                                  <path fill="#FBBC04" d="M12 4.5l4.29 8L21.5 12.5 12 4.5z" />
                                  <path fill="#EA4335" d="M7.71 12.5L12 19.5l4.29-7H7.71z" />
                                </svg>
                              </button>
                              {/* Box */}
                              <button
                                type="button"
                                onClick={() => {
                                  // Handle Box
                                  setUploadDropdownOpen(false);
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity"
                                title="Box"
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0061D5">
                                  <path d="M12 0L2 5v14l10 5 10-5V5L12 0zm0 2.18l8 4v8.64l-8 4-8-4V6.18l8-4z" />
                                </svg>
                              </button>
                              {/* Dropbox */}
                              <button
                                type="button"
                                onClick={() => {
                                  // Handle Dropbox
                                  setUploadDropdownOpen(false);
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity"
                                title="Dropbox"
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0061FF">
                                  <path d="M6 2L12 6l6-4-6-4-6 4zm12 4l6 4-6 4-6-4 6-4zM6 10l6 4 6-4-6-4-6 4zm12 4l6 4-6 4-6-4 6-4zM6 18l6 4 6-4-6-4-6 4z" />
                                </svg>
                              </button>
                              {/* OneDrive */}
                              <button
                                type="button"
                                onClick={() => {
                                  // Handle OneDrive
                                  setUploadDropdownOpen(false);
                                }}
                                className="w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity"
                                title="OneDrive"
                              >
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0078D4">
                                  <path d="M12.5 2C8.5 2 5.2 4.5 4.1 8.1c-2.5.3-4.5 2.4-4.5 5 0 2.8 2.2 5 5 5h14.9c2.8 0 5-2.2 5-5 0-2.8-2.2-5-5-5-.3-3.4-3.1-6-6.4-6z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(e.target.files);
                        }
                        e.target.value = ""; // Reset input
                      }}
                    />
                    <p className="mt-1 text-xs text-gray-500">You can upload a maximum of 10 files, 10MB each</p>

                    {/* Display uploaded files */}
                    {documents.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors">
                            <File size={14} className="text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-700 truncate">
                                {doc.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(doc.size)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add more details */}
                <div className="sm:col-span-6 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="text-sm text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    Add more details
                  </button>
                </div>

                {showMoreDetails && (
                  <div className="mt-10 border-t border-gray-200 pt-10">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                      {/* Website URL */}
                      <div className="sm:col-span-3">
                        <label htmlFor="websiteUrl" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Website URL <Info size={14} className="text-gray-400" /></label>
                        <div className="mt-2 relative">
                          <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            id="websiteUrl"
                            type="url"
                            name="websiteUrl"
                            value={formData.websiteUrl}
                            onChange={handleChange}
                            placeholder="ex: www.zylker.com"
                            className="block w-full rounded-md bg-white pl-10 pr-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Department */}
                      <div className="sm:col-span-3">
                        <label htmlFor="department" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Department <Info size={14} className="text-gray-400" /></label>
                        <div className="mt-2">
                          <input
                            id="department"
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="Department"
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Designation */}
                      <div className="sm:col-span-3">
                        <label htmlFor="designation" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Designation <Info size={14} className="text-gray-400" /></label>
                        <div className="mt-2">
                          <input
                            id="designation"
                            type="text"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            placeholder="Designation"
                            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* X (Twitter) */}
                      <div className="sm:col-span-3">
                        <label htmlFor="xSocial" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">X <Info size={14} className="text-gray-400" /></label>
                        <div className="mt-2 relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none font-semibold">X</div>
                          <input
                            id="xSocial"
                            type="url"
                            name="xSocial"
                            value={formData.xSocial}
                            onChange={handleChange}
                            placeholder="https://x.com/"
                            className="block w-full rounded-md bg-white pl-10 pr-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Skype Name/Number */}
                      <div className="sm:col-span-3">
                        <label htmlFor="skypeName" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Skype Name/Number <Info size={14} className="text-gray-400" /></label>
                        <div className="mt-2 relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#00AFF0">
                              <path d="M12.015 0C5.398 0 .006 5.388.006 12.002c0 5.098 3.158 9.478 7.618 11.239-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.015 24.009c6.624 0 11.99-5.388 11.99-12.002C24.005 5.388 18.641.001 12.015.001z" />
                            </svg>
                          </div>
                          <input
                            id="skypeName"
                            type="text"
                            name="skypeName"
                            value={formData.skypeName}
                            onChange={handleChange}
                            placeholder="Skype Name/Number"
                            className="block w-full rounded-md bg-white pl-10 pr-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          />
                        </div>
                      </div>

                      {/* Facebook */}
                      <div className="sm:col-span-3">
                        <label htmlFor="facebook" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">Facebook <Info size={14} className="text-gray-400" /></label>
                        <div className="mt-2 relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </div>
                          <input
                            id="facebook"
                            type="url"
                            name="facebook"
                            value={formData.facebook}
                            onChange={handleChange}
                            placeholder="http://www.facebook.com/"
                            className="block w-full rounded-md bg-white pl-10 pr-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          />
                        </div>
                      </div>
                    </div>
                  </div>



                )}
              </div>
            )}

            {/* Address Tab Content */}
            {activeTab === "Address" && (
              <>
                <div style={styles.addressContainer}>
                  {/* Billing Address */}
                  <div style={styles.addressSection}>
                    <div style={styles.addressTitle}>
                      <span>Billing Address</span>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Attention <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="billingAttention"
                        value={formData.billingAttention}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Country/Region <Info size={14} className="text-gray-400" /></label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          name="billingCountry"
                          value={formData.billingCountry}
                          onChange={handleChange}
                          placeholder="Select or type to add"
                          style={styles.input}
                        />
                        <ChevronDown
                          size={16}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Address <Info size={14} className="text-gray-400" /></label>
                      <div style={{ marginBottom: "8px" }}>
                        <textarea
                          name="billingStreet1"
                          value={formData.billingStreet1}
                          onChange={handleChange}
                          placeholder="Street 1"
                          style={styles.textarea}
                        />
                      </div>
                      <textarea
                        name="billingStreet2"
                        value={formData.billingStreet2}
                        onChange={handleChange}
                        placeholder="Street 2"
                        style={styles.textarea}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>City <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="billingCity"
                        value={formData.billingCity}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State <Info size={14} className="text-gray-400" /></label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          name="billingState"
                          value={formData.billingState}
                          onChange={handleChange}
                          placeholder="Select or type to add"
                          style={styles.input}
                        />
                        <ChevronDown
                          size={16}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>ZIP Code <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="billingZipCode"
                        value={formData.billingZipCode}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="tel"
                        name="billingPhone"
                        value={formData.billingPhone}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fax Number <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="billingFax"
                        value={formData.billingFax}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div style={styles.addressSection}>
                    <div style={styles.addressTitle}>
                      <span>Shipping Address</span>
                      <button
                        type="button"
                        onClick={copyBillingToShipping}
                        style={styles.copyLink}
                      >
                        <Copy size={14} />
                        Copy billing address
                      </button>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Attention <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="shippingAttention"
                        value={formData.shippingAttention}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Country/Region <Info size={14} className="text-gray-400" /></label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          name="shippingCountry"
                          value={formData.shippingCountry}
                          onChange={handleChange}
                          placeholder="Select or type to add"
                          style={styles.input}
                        />
                        <ChevronDown
                          size={16}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Address <Info size={14} className="text-gray-400" /></label>
                      <div style={{ marginBottom: "8px" }}>
                        <textarea
                          name="shippingStreet1"
                          value={formData.shippingStreet1}
                          onChange={handleChange}
                          placeholder="Street 1"
                          style={styles.textarea}
                        />
                      </div>
                      <textarea
                        name="shippingStreet2"
                        value={formData.shippingStreet2}
                        onChange={handleChange}
                        placeholder="Street 2"
                        style={styles.textarea}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>City <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="shippingCity"
                        value={formData.shippingCity}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State <Info size={14} className="text-gray-400" /></label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          name="shippingState"
                          value={formData.shippingState}
                          onChange={handleChange}
                          placeholder="Select or type to add"
                          style={styles.input}
                        />
                        <ChevronDown
                          size={16}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>ZIP Code <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="shippingZipCode"
                        value={formData.shippingZipCode}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="tel"
                        name="shippingPhone"
                        value={formData.shippingPhone}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fax Number <Info size={14} className="text-gray-400" /></label>
                      <input
                        type="text"
                        name="shippingFax"
                        value={formData.shippingFax}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Note Section */}
                <div style={styles.noteSection}>
                  <div style={styles.noteTitle}>Note:</div>
                  <ul style={styles.noteList}>
                    <li style={styles.noteItem}>
                      Add and manage additional addresses from this Customers and Vendors details section.
                    </li>
                    <li style={styles.noteItem}>
                      You can customise how customers' addresses are displayed in transaction PDFs. To do this, go to Settings &gt; Preferences &gt; Customers and Vendors, and navigate to the Address Format sections.
                    </li>
                  </ul>
                </div>
              </>
            )
            }

            {/* Contact Persons Tab Content */}
            {
              activeTab === "Contact Persons" && (
                <>
                  <table style={styles.contactPersonsTable}>
                    <thead style={styles.contactPersonsHeader}>
                      <tr>
                        <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">SALUTATION <Info size={12} className="text-gray-400" /></div></th>
                        <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">FIRST NAME <Info size={12} className="text-gray-400" /></div></th>
                        <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">LAST NAME <Info size={12} className="text-gray-400" /></div></th>
                        <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">EMAIL ADDRESS <Info size={12} className="text-gray-400" /></div></th>
                        <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">WORK PHONE <Info size={12} className="text-gray-400" /></div></th>
                        <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">MOBILE <Info size={12} className="text-gray-400" /></div></th>
                        {showAdditionalColumns && (
                          <>
                            <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">SKYPE NAME/NUMBER <Info size={12} className="text-gray-400" /></div></th>
                            <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">DESIGNATION <Info size={12} className="text-gray-400" /></div></th>
                            <th style={styles.contactPersonsHeaderCell}><div className="flex items-center gap-1">DEPARTMENT <Info size={12} className="text-gray-400" /></div></th>
                          </>
                        )}
                        <th style={styles.contactPersonsHeaderCell}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactPersons.map((person, index) => (
                        <tr key={person.id} style={styles.contactPersonsRow}>
                          <td style={styles.contactPersonsCell}>
                            <select
                              value={person.salutation}
                              onChange={(e) => {
                                const updated = [...contactPersons];
                                updated[index].salutation = e.target.value;
                                setContactPersons(updated);
                              }}
                              style={styles.contactPersonsInput}
                            >
                              <option value="">Select</option>
                              <option>Mr.</option>
                              <option>Mrs.</option>
                              <option>Ms.</option>
                              <option>Dr.</option>
                            </select>
                          </td>
                          <td style={styles.contactPersonsCell}>
                            <input
                              type="text"
                              value={person.firstName}
                              onChange={(e) => {
                                const updated = [...contactPersons];
                                updated[index].firstName = e.target.value;
                                setContactPersons(updated);
                              }}
                              placeholder="First Name"
                              style={styles.contactPersonsInput}
                            />
                          </td>
                          <td style={styles.contactPersonsCell}>
                            <input
                              type="text"
                              value={person.lastName}
                              onChange={(e) => {
                                const updated = [...contactPersons];
                                updated[index].lastName = e.target.value;
                                setContactPersons(updated);
                              }}
                              placeholder="Last Name"
                              style={styles.contactPersonsInput}
                            />
                          </td>
                          <td style={styles.contactPersonsCell}>
                            <input
                              type="email"
                              value={person.email}
                              onChange={(e) => {
                                const updated = [...contactPersons];
                                updated[index].email = e.target.value;
                                setContactPersons(updated);
                              }}
                              placeholder="Email Address"
                              style={styles.contactPersonsInput}
                            />
                          </td>
                          <td style={styles.contactPersonsCell}>
                            <input
                              type="tel"
                              value={person.workPhone}
                              onChange={(e) => {
                                const updated = [...contactPersons];
                                updated[index].workPhone = e.target.value;
                                setContactPersons(updated);
                              }}
                              placeholder="Work Phone"
                              style={styles.contactPersonsInput}
                            />
                          </td>
                          <td style={styles.contactPersonsCell}>
                            <input
                              type="tel"
                              value={person.mobile}
                              onChange={(e) => {
                                const updated = [...contactPersons];
                                updated[index].mobile = e.target.value;
                                setContactPersons(updated);
                              }}
                              placeholder="Mobile"
                              style={styles.contactPersonsInput}
                            />
                          </td>
                          {showAdditionalColumns && (
                            <>
                              <td style={styles.contactPersonsCell}>
                                <input
                                  type="text"
                                  value={person.skypeName || ""}
                                  onChange={(e) => {
                                    const updated = [...contactPersons];
                                    updated[index].skypeName = e.target.value;
                                    setContactPersons(updated);
                                  }}
                                  placeholder="Skype Name/Number"
                                  style={styles.contactPersonsInput}
                                />
                              </td>
                              <td style={styles.contactPersonsCell}>
                                <input
                                  type="text"
                                  value={person.designation || ""}
                                  onChange={(e) => {
                                    const updated = [...contactPersons];
                                    updated[index].designation = e.target.value;
                                    setContactPersons(updated);
                                  }}
                                  placeholder="Designation"
                                  style={styles.contactPersonsInput}
                                />
                              </td>
                              <td style={styles.contactPersonsCell}>
                                <input
                                  type="text"
                                  value={person.department || ""}
                                  onChange={(e) => {
                                    const updated = [...contactPersons];
                                    updated[index].department = e.target.value;
                                    setContactPersons(updated);
                                  }}
                                  placeholder="Department"
                                  style={styles.contactPersonsInput}
                                />
                              </td>
                            </>
                          )}
                          <td style={styles.contactPersonsCell}>
                            <div style={styles.contactPersonsActions}>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAdditionalColumns(!showAdditionalColumns);
                                }}
                                style={styles.contactPersonsActionBtn}
                                title="More options"
                              >
                                <MoreVertical size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (contactPersons.length > 1) {
                                    setContactPersons(contactPersons.filter((_, i) => i !== index));
                                  }
                                }}
                                style={styles.contactPersonsDeleteBtn}
                                title="Delete"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => {
                      setContactPersons([
                        ...contactPersons,
                        { id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skypeName: "", designation: "", department: "" }
                      ]);
                    }}
                    style={styles.addContactPersonBtn}
                  >
                    <Plus size={16} />
                    Add Contact Person
                  </button>
                </>
              )
            }

            {/* Custom Fields Tab Content */}
            {
              activeTab === "Custom Fields" && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyStateText}>
                    Start adding custom fields for your Customers and Vendors by going to{" "}
                    <span style={{ fontWeight: "600" }}>Settings</span> ➡{" "}
                    <span style={{ fontWeight: "600" }}>Preferences</span> ➡{" "}
                    <span style={{ fontWeight: "600" }}>Customers and Vendors</span>. You can also refine the address format of your Customers and Vendors from there.
                  </div>
                </div>
              )
            }

            {/* Reporting Tags Tab Content */}
            {
              activeTab === "Reporting Tags" && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyStateText}>
                    You've not created any Reporting Tags.
                  </div>
                  <div style={styles.emptyStateText}>
                    Start creating reporting tags by going to{" "}
                    <span style={{ fontWeight: "600" }}>More Settings</span> ➡{" "}
                    <span style={{ fontWeight: "600" }}>Reporting Tags</span>.
                  </div>
                </div>
              )
            }

            {/* Remarks Tab Content */}
            {
              activeTab === "Remarks" && (
                <div className="border-b border-gray-900/10 pb-12">
                  <div className="mt-10">
                    <label htmlFor="remarks" className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Remarks <span className="text-gray-500 font-normal">(For Internal Use)</span> <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="remarks"
                        name="remarks"
                        rows={4}
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder="Enter remarks..."
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      />
                    </div>
                  </div>
                </div>
              )
            }


            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-start gap-x-6">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="cursor-pointer transition-all bg-white text-gray-700 px-6 py-2 rounded-lg border-gray-300 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="cursor-pointer transition-all bg-[#156372] text-white px-6 py-2 rounded-lg border-red-600 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-sm font-semibold"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form >
        </div >
        {/* Right Column - Documents Table */}
        {
          documents.length > 0 && (
            <div style={styles.rightSidebar}>
              <div style={styles.documentsHeader}>
                <Search size={16} style={{ color: "#6b7280" }} />
                <span style={styles.documentsTitle}>Documents</span>
              </div>
              <div style={styles.documentsTableContainer}>
                <table style={styles.documentsTable}>
                  <thead>
                    <tr>
                      <th style={styles.documentsTableHeader}>File Name</th>
                      <th style={styles.documentsTableHeader}>Size</th>
                      <th style={styles.documentsTableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} style={styles.documentsTableRow}>
                        <td style={styles.documentsTableCell}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <File size={14} style={{ color: "#6b7280" }} />
                            <span style={{ fontSize: "13px", color: "#374151" }}>{doc.name}</span>
                          </div>
                        </td>
                        <td style={styles.documentsTableCell}>
                          <span style={{ fontSize: "13px", color: "#6b7280" }}>{formatFileSize(doc.size)}</span>
                        </td>
                        <td style={styles.documentsTableCell}>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            style={styles.documentsTableActionBtn}
                            title="Remove file"
                            onMouseEnter={(e) => (e.target.style.backgroundColor = "#fee2e2")}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </div >
      <ConfigurePaymentTermsModal
        isOpen={showConfigureTerms}
        onClose={() => setShowConfigureTerms(false)}
      />
    </div >
  );
}


