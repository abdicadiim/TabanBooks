import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { vendorsAPI, currenciesAPI, taxesAPI, accountsAPI } from "../../../services/api";
import { useCurrency } from "../../../hooks/useCurrency";
import NewCurrencyModal from "../../settings/organization-settings/setup-configurations/currencies/NewCurrencyModal";

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
import { countryData, countryPhoneCodes } from "../../sales/Customers/NewCustomer/countriesData";

type CurrencyOption = {
  _id: string;
  code: string;
  name: string;
  isBaseCurrency?: boolean;
};

type TaxOption = {
  _id?: string;
  id?: string;
  name?: string;
  rate?: number | string;
};

type DocumentAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string | ArrayBuffer | null;
  preview: string;
  url?: string;
  uploadedAt?: Date;
};

type ContactPerson = {
  id: number;
  isPrimary?: boolean;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  mobile: string;
  skypeName: string;
  designation: string;
  department: string;
};

type VendorFormData = {
  salutation: string;
  firstName: string;
  lastName: string;
  companyName: string;
  displayName: string;
  email: string;
  workPhone: string;
  mobile: string;
  vendorLanguage: string;
  taxRate: string;
  enableTDS: boolean;
  companyId: string;
  currency: string;
  accountsPayable: string;
  openingBalance: string;
  paymentTerms: string;
  enablePortal: boolean;
  locationCode: string;
  billingAttention: string;
  billingCountry: string;
  billingStreet1: string;
  billingStreet2: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  billingPhone: string;
  billingFax: string;
  shippingAttention: string;
  shippingCountry: string;
  shippingStreet1: string;
  shippingStreet2: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingPhone: string;
  shippingFax: string;
  remarks: string;
  notes?: string;
  websiteUrl: string;
  department: string;
  designation: string;
  xSocial: string;
  skypeName: string;
  facebook: string;
};



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

  const [formData, setFormData] = useState<VendorFormData>({
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
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([
    { id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "", skypeName: "", designation: "", department: "" }
  ]);
  const [showAdditionalColumns, setShowAdditionalColumns] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showConfigureTerms, setShowConfigureTerms] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [availableTaxes, setAvailableTaxes] = useState<TaxOption[]>([]);
  const [accountsPayableOptions, setAccountsPayableOptions] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string }>({});
  const [isWorkPhoneCodeDropdownOpen, setIsWorkPhoneCodeDropdownOpen] = useState(false);
  const [isMobilePhoneCodeDropdownOpen, setIsMobilePhoneCodeDropdownOpen] = useState(false);
  const [phoneCodeSearch, setPhoneCodeSearch] = useState("");
  const [workPhoneCode, setWorkPhoneCode] = useState("+254");
  const [mobilePhoneCode, setMobilePhoneCode] = useState("+254");
  const workPhoneCodeDropdownRef = useRef<HTMLDivElement | null>(null);
  const mobilePhoneCodeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isVendorLanguageDropdownOpen, setIsVendorLanguageDropdownOpen] = useState(false);
  const [vendorLanguageSearch, setVendorLanguageSearch] = useState("");
  const vendorLanguageDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isTaxRateDropdownOpen, setIsTaxRateDropdownOpen] = useState(false);
  const [taxRateSearch, setTaxRateSearch] = useState("");
  const taxRateDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isAccountsPayableDropdownOpen, setIsAccountsPayableDropdownOpen] = useState(false);
  const [accountsPayableSearch, setAccountsPayableSearch] = useState("");
  const accountsPayableDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const currencyDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showNewCurrencyModal, setShowNewCurrencyModal] = useState(false);
  const [isOpeningBalanceLocationDropdownOpen, setIsOpeningBalanceLocationDropdownOpen] = useState(false);
  const openingBalanceLocationDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isBillingCountryDropdownOpen, setIsBillingCountryDropdownOpen] = useState(false);
  const [billingCountrySearch, setBillingCountrySearch] = useState("");
  const billingCountryDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isBillingStateDropdownOpen, setIsBillingStateDropdownOpen] = useState(false);
  const [billingStateSearch, setBillingStateSearch] = useState("");
  const billingStateDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isShippingCountryDropdownOpen, setIsShippingCountryDropdownOpen] = useState(false);
  const [shippingCountrySearch, setShippingCountrySearch] = useState("");
  const shippingCountryDropdownRef = useRef<HTMLDivElement | null>(null);
  const [isShippingStateDropdownOpen, setIsShippingStateDropdownOpen] = useState(false);
  const [shippingStateSearch, setShippingStateSearch] = useState("");
  const shippingStateDropdownRef = useRef<HTMLDivElement | null>(null);
  const countryOptions = useMemo(() => Object.keys(countryData), []);
  const billingStateOptions = useMemo(() => countryData[formData.billingCountry] || [], [formData.billingCountry]);
  const shippingStateOptions = useMemo(() => countryData[formData.shippingCountry] || [], [formData.shippingCountry]);
  const filteredBillingCountries = useMemo(() => {
    const term = String(billingCountrySearch || "").trim().toLowerCase();
    return term ? countryOptions.filter((country) => country.toLowerCase().includes(term)) : countryOptions;
  }, [billingCountrySearch, countryOptions]);
  const filteredShippingCountries = useMemo(() => {
    const term = String(shippingCountrySearch || "").trim().toLowerCase();
    return term ? countryOptions.filter((country) => country.toLowerCase().includes(term)) : countryOptions;
  }, [shippingCountrySearch, countryOptions]);
  const filteredBillingStates = useMemo(() => {
    const term = String(billingStateSearch || "").trim().toLowerCase();
    return term ? billingStateOptions.filter((state) => state.toLowerCase().includes(term)) : billingStateOptions;
  }, [billingStateSearch, billingStateOptions]);
  const filteredShippingStates = useMemo(() => {
    const term = String(shippingStateSearch || "").trim().toLowerCase();
    return term ? shippingStateOptions.filter((state) => state.toLowerCase().includes(term)) : shippingStateOptions;
  }, [shippingStateSearch, shippingStateOptions]);
  const vendorLanguageOptions = [
    "العربية (المصرية)",
    "العربية",
    "български",
    "Deutsch",
    "English",
    "español",
    "Filipino",
    "Français",
    "हिन्दी",
    "Italiano",
    "日本語",
    "한국어",
    "Português",
    "Русский",
  ];
  const filteredVendorLanguageOptions = useMemo(() => {
    const term = String(vendorLanguageSearch || "").trim().toLowerCase();
    if (!term) return vendorLanguageOptions;
    return vendorLanguageOptions.filter((lang) => String(lang).toLowerCase().includes(term));
  }, [vendorLanguageSearch]);
  const filteredPhoneCodes = useMemo(() => {
    const term = String(phoneCodeSearch || "").trim().toLowerCase();
    if (!term) return countryPhoneCodes;
    return countryPhoneCodes.filter((entry) =>
      String(entry.code || "").toLowerCase().includes(term) ||
      String(entry.name || "").toLowerCase().includes(term)
    );
  }, [phoneCodeSearch]);
  const filteredTaxRates = useMemo(() => {
    const term = String(taxRateSearch || "").trim().toLowerCase();
    if (!term) return availableTaxes;
    return availableTaxes.filter((tax) =>
      String(tax.name || "").toLowerCase().includes(term) ||
      String(tax.rate ?? "").toLowerCase().includes(term)
    );
  }, [availableTaxes, taxRateSearch]);
  const filteredAccountsPayableOptions = useMemo(() => {
    const term = String(accountsPayableSearch || "").trim().toLowerCase();
    if (!term) return accountsPayableOptions;
    return accountsPayableOptions.filter((account) => String(account || "").toLowerCase().includes(term));
  }, [accountsPayableOptions, accountsPayableSearch]);
  const filteredCurrencyOptions = useMemo(() => {
    const term = String(currencySearch || "").trim().toLowerCase();
    if (!term) return currencies;
    return currencies.filter((currency) =>
      String(currency.code || "").toLowerCase().includes(term) ||
      String(currency.name || "").toLowerCase().includes(term)
    );
  }, [currencies, currencySearch]);

  const fancySelectClass =
    "col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pl-3 pr-10 text-base text-gray-900 border border-gray-300 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:border-[#156372]/50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6";

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await currenciesAPI.getAll();
        if (response.success && response.data) {
          const nextCurrencies = Array.isArray(response.data) ? response.data : [];
          setCurrencies(nextCurrencies);
          // Set default currency if none selected
          if (!formData.currency && nextCurrencies.length > 0) {
            const baseCurrency = nextCurrencies.find((curr: CurrencyOption) => curr.isBaseCurrency);
            const defaultCurrency = baseCurrency || nextCurrencies[0];
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
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (taxRateDropdownRef.current && !taxRateDropdownRef.current.contains(target)) {
        setIsTaxRateDropdownOpen(false);
        setTaxRateSearch("");
      }
      if (accountsPayableDropdownRef.current && !accountsPayableDropdownRef.current.contains(target)) {
        setIsAccountsPayableDropdownOpen(false);
        setAccountsPayableSearch("");
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(target)) {
        setIsCurrencyDropdownOpen(false);
        setCurrencySearch("");
      }
      if (openingBalanceLocationDropdownRef.current && !openingBalanceLocationDropdownRef.current.contains(target)) {
        setIsOpeningBalanceLocationDropdownOpen(false);
      }
      if (billingCountryDropdownRef.current && !billingCountryDropdownRef.current.contains(target)) {
        setIsBillingCountryDropdownOpen(false);
        setBillingCountrySearch("");
      }
      if (billingStateDropdownRef.current && !billingStateDropdownRef.current.contains(target)) {
        setIsBillingStateDropdownOpen(false);
        setBillingStateSearch("");
      }
      if (shippingCountryDropdownRef.current && !shippingCountryDropdownRef.current.contains(target)) {
        setIsShippingCountryDropdownOpen(false);
        setShippingCountrySearch("");
      }
      if (shippingStateDropdownRef.current && !shippingStateDropdownRef.current.contains(target)) {
        setIsShippingStateDropdownOpen(false);
        setShippingStateSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
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
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedWork = workPhoneCodeDropdownRef.current?.contains(target);
      const clickedMobile = mobilePhoneCodeDropdownRef.current?.contains(target);
      if (!clickedWork) {
        setIsWorkPhoneCodeDropdownOpen(false);
      }
      if (!clickedMobile) {
        setIsMobilePhoneCodeDropdownOpen(false);
      }
      if (vendorLanguageDropdownRef.current && !vendorLanguageDropdownRef.current.contains(target)) {
        setIsVendorLanguageDropdownOpen(false);
        setVendorLanguageSearch("");
      }
      if (!clickedWork && !clickedMobile) {
        setPhoneCodeSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
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

    const handleClickOutside = (event: MouseEvent) => {
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target as Node)) {
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

  const handleFileUpload = (files: FileList | File[]) => {
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
    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments((prev: DocumentAttachment[]) => [...prev, {
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

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev: DocumentAttachment[]) => {
      const doc = prev.find((d) => d.id === id);
      if (doc && doc.preview) {
        URL.revokeObjectURL(doc.preview);
      }
      return prev.filter((d) => d.id !== id);
    });
  };

  const formatFileSize = (bytes: number) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isCheckbox = e.target instanceof HTMLInputElement && e.target.type === "checkbox";
    const updatedData = {
      ...formData,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    };

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

  const generateDisplayNameOptions = (data: Pick<VendorFormData, "firstName" | "lastName" | "companyName">) => {
    const { firstName, lastName, companyName } = data;
    const options: string[] = [];

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    // Create vendorData object matching API structure
    // Ensure displayName and name are never empty
    const displayName = formData.displayName || formData.companyName || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Vendor';
    if (!formData.displayName) {
      setFieldErrors({ displayName: "Enter the Display Name of your vendor." });
      return;
    }
    setFieldErrors({});
    const vendorData = {
      displayName: displayName,
      name: displayName,
      vendorType: (formData.companyName && formData.companyName.trim()) ? 'business' : 'individual',
      salutation: formData.salutation || '',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      companyName: formData.companyName || '',
      email: formData.email || '',
      workPhone: `${workPhoneCode} ${formData.workPhone || ''}`.trim(),
      mobile: `${mobilePhoneCode} ${formData.mobile || ''}`.trim(),
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
    } catch (error: unknown) {
      console.error('Error saving vendor:', error);
      alert('Failed to save vendor: ' + (error instanceof Error ? error.message : 'Unknown error. Please check console.'));
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

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedWork = workPhoneCodeDropdownRef.current?.contains(target);
      const clickedMobile = mobilePhoneCodeDropdownRef.current?.contains(target);
      if (!clickedWork) {
        setIsWorkPhoneCodeDropdownOpen(false);
      }
      if (!clickedMobile) {
        setIsMobilePhoneCodeDropdownOpen(false);
      }
      if (!clickedWork && !clickedMobile) {
        setPhoneCodeSearch("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);


  const handleCancel = () => {
    navigate("/purchases/vendors");
  };

  const styles: Record<string, React.CSSProperties> = {
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
    addressInput: {
      width: "100%",
      maxWidth: "50%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    dropdownSearchInput: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    addressTextarea: {
      width: "100%",
      maxWidth: "50%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "60px",
      fontFamily: "inherit",
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
      gap: "18px",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "24px",
    },
    tab: {
      padding: "10px 0 12px",
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
      gap: "16px",
    },
    addressSection: {
      border: "none",
      borderRadius: "0",
      padding: "0",
      minHeight: "100%",
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
      fontSize: "13px",
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
    <div className="min-h-screen bg-white">
      <div className="w-full px-6 py-5">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="border-b border-gray-200 bg-white px-0 pt-5 pb-6">
            <h2 className="text-[24px] font-medium tracking-tight text-gray-900">{isEdit ? "Edit Vendor" : "New Vendor"}</h2>
          </div>
            {/* Primary Contact through Vendor Language Section */}
            <div className="pt-6 pb-8">
              <div className="mb-6">
                <div className="grid grid-cols-1 gap-y-5 sm:flex sm:items-center sm:gap-3">
                  <div className="sm:w-[180px]">
                    <label className="flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Primary Contact <HelpTooltip text="The primary contact will receive all emails related to transactions. You can add multiple contact persons below or from this customer's details page."><Info size={14} className="text-gray-400" /></HelpTooltip>
                    </label>
                  </div>
                  <div className="sm:w-[230px] transition-all duration-200 ease-out focus-within:scale-[1.01]">
                    <div className="grid grid-cols-1">
                      <select
                        id="salutation"
                        name="salutation"
                        value={formData.salutation}
                        onChange={handleChange}
                        className={fancySelectClass}
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
                  <div className="sm:w-[230px] transition-all duration-200 ease-out focus-within:scale-[1.01]">
                    <div>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>
                  <div className="sm:w-[230px] transition-all duration-200 ease-out focus-within:scale-[1.01]">
                    <div>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Name */}
              <div className="mb-6 flex items-start gap-4">
                <label htmlFor="companyName" className="w-[180px] shrink-0 pt-1.5 text-sm/6 font-medium text-gray-900">Company Name</label>
                <div className="w-full max-w-[390px]">
                  <input
                    id="companyName"
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Company Name"
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div className="mb-6 flex items-start gap-4">
                <label htmlFor="displayName" className="w-[180px] shrink-0 pt-1.5 flex items-center gap-1 text-sm/6 font-medium text-red-600">
                  Display Name <span className="text-red-500">*</span> <HelpTooltip text="This name will be displayed on all the transactions you create for this Vendor."><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="w-full max-w-[390px]">
                  <div className="relative">
                    <input
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      placeholder="Select or type to add"
                      className={`w-full rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 transition-all duration-200 ease-out hover:shadow-sm focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6 ${fieldErrors.displayName ? "border border-red-400 focus:border-red-500" : "border border-gray-300 hover:border-[#156372]/40 focus:border-[#156372]"}`}
                    />
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:size-4" />
                  </div>
                  {fieldErrors.displayName && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                      <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                      {fieldErrors.displayName}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div className="mb-6 flex items-start gap-4">
                <label htmlFor="email" className="w-[180px] shrink-0 pt-1.5 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                  Email address <HelpTooltip text={<span><span className="font-bold text-blue-300">Privacy Info:</span> This data will be stored without encryption and will be visible only to your organisation users who have the required permission.</span>}><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="w-full max-w-[390px] relative transition-all duration-200 ease-out focus-within:scale-[1.01]">
                  <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    className="block w-full rounded-md bg-white pl-10 pr-3 py-1.5 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="mb-6 flex items-start gap-4">
                <label className="w-[180px] shrink-0 pt-1.5 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                  Phone <HelpTooltip text={<span><span className="font-bold text-blue-300">Privacy Info:</span> This data will be stored without encryption and will be visible only to your organisation users who have the required permission.</span>}><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="w-full max-w-[780px]">
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={workPhoneCodeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsWorkPhoneCodeDropdownOpen((prev) => !prev);
                          setIsMobilePhoneCodeDropdownOpen(false);
                          setPhoneCodeSearch("");
                        }}
                        className="flex h-[38px] w-[72px] items-center justify-between rounded-l-md rounded-r-none border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                      >
                        <span>{workPhoneCode}</span>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isWorkPhoneCodeDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isWorkPhoneCodeDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-2 w-[285px] overflow-hidden rounded-md border border-gray-300 bg-white shadow-xl">
                          <div className="border-b border-gray-200 p-2">
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={phoneCodeSearch}
                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full text-sm text-gray-700 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1">
                            {filteredPhoneCodes.map((entry, index) => (
                              <button
                                key={`${entry.code}-${entry.name}-${index}`}
                                type="button"
                                onClick={() => {
                                  setWorkPhoneCode(entry.code);
                                  setIsWorkPhoneCodeDropdownOpen(false);
                                  setPhoneCodeSearch("");
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                              >
                                <span className="w-12 shrink-0">{entry.code}</span>
                                <span>{entry.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="tel"
                      name="workPhone"
                      value={formData.workPhone}
                      onChange={handleChange}
                      placeholder="Work Phone"
                      className="h-[38px] w-[205px] rounded-l-none rounded-r-md border border-l-0 border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                    />
                    <div className="relative" ref={mobilePhoneCodeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobilePhoneCodeDropdownOpen((prev) => !prev);
                          setIsWorkPhoneCodeDropdownOpen(false);
                          setPhoneCodeSearch("");
                        }}
                        className="flex h-[38px] w-[72px] items-center justify-between rounded-l-md rounded-r-none border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                      >
                        <span>{mobilePhoneCode}</span>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isMobilePhoneCodeDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isMobilePhoneCodeDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-2 w-[285px] overflow-hidden rounded-md border border-gray-300 bg-white shadow-xl">
                          <div className="border-b border-gray-200 p-2">
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={phoneCodeSearch}
                                onChange={(e) => setPhoneCodeSearch(e.target.value)}
                                placeholder="Search"
                                className="w-full text-sm text-gray-700 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1">
                            {filteredPhoneCodes.map((entry, index) => (
                              <button
                                key={`${entry.code}-${entry.name}-${index}`}
                                type="button"
                                onClick={() => {
                                  setMobilePhoneCode(entry.code);
                                  setIsMobilePhoneCodeDropdownOpen(false);
                                  setPhoneCodeSearch("");
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#156372] hover:text-white"
                              >
                                <span className="w-12 shrink-0">{entry.code}</span>
                                <span>{entry.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="Mobile"
                      className="h-[38px] w-[205px] rounded-l-none rounded-r-md border border-l-0 border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>

              {/* Vendor Language */}
              <div className="mb-6 flex items-start gap-4">
                <label htmlFor="vendorLanguage" className="w-[180px] shrink-0 pt-1.5 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                  Vendor Language <HelpTooltip text="The selected language will be used for the vendor portal and all email communications."><Info size={14} className="text-gray-400" /></HelpTooltip>
                </label>
                <div className="w-full max-w-[390px] relative" ref={vendorLanguageDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVendorLanguageDropdownOpen((prev) => !prev);
                      setVendorLanguageSearch("");
                    }}
                    className="flex h-[38px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-sm focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                  >
                    <span>{formData.vendorLanguage || "English"}</span>
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isVendorLanguageDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isVendorLanguageDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-xl">
                      <div className="border-b border-gray-200 p-2">
                        <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5">
                          <Search size={14} className="text-gray-400" />
                          <input
                            type="text"
                            value={vendorLanguageSearch}
                            onChange={(e) => setVendorLanguageSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full text-sm text-gray-700 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto py-1">
                        {filteredVendorLanguageOptions.map((lang) => {
                          const isSelected = String(formData.vendorLanguage || "").toLowerCase() === String(lang).toLowerCase();
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, vendorLanguage: lang }));
                                setIsVendorLanguageDropdownOpen(false);
                                setVendorLanguageSearch("");
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${isSelected ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}
                            >
                              <span>{lang}</span>
                              {isSelected && <ChevronDown size={14} className="rotate-180 text-gray-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
            <div className="border-b border-gray-900/10 pb-10">
              <div className="mt-8 max-w-[720px] space-y-4">
                  {/* Location Code */}
                  <div className="mb-4 flex items-start gap-6">
                    <label htmlFor="locationCode" className="w-[160px] shrink-0 pt-2 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Location Code <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="flex-1 max-w-[360px]">
                      <input
                        id="locationCode"
                        type="text"
                        name="locationCode"
                        value={formData.locationCode}
                        onChange={handleChange}
                        placeholder="Location Code"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>

                  {/* Tax Rate */}
                  <div className="mb-4 flex items-start gap-6">
                    <label htmlFor="taxRate" className="w-[160px] shrink-0 pt-2 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Tax Rate
                      <HelpTooltip text="To associate more than one tax, you need to create a tax group in Settings.">
                        <Info size={14} className="text-gray-400" />
                      </HelpTooltip>
                    </label>
                    <div className="relative flex-1 max-w-[360px]" ref={taxRateDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTaxRateDropdownOpen((prev) => !prev);
                          setTaxRateSearch("");
                        }}
                        className="flex h-[40px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:border-[#156372]/50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                      >
                        <span className="truncate">
                          {(() => {
                            const selected = availableTaxes.find((tax) => String(tax._id || tax.id || "") === String(formData.taxRate || ""));
                            return selected ? `${selected.name || "Tax"} (${Number(selected.rate || 0)}%)` : "Select a Tax";
                          })()}
                        </span>
                        <ChevronDown size={16} className={`ml-3 shrink-0 text-gray-500 transition-transform ${isTaxRateDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isTaxRateDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-[360px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_18px_30px_-12px_rgba(15,23,42,0.22)]">
                          <div className="border-b border-gray-100 p-2">
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:border-[#156372] focus-within:shadow-[0_0_0_3px_rgba(21,99,114,0.12)]">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={taxRateSearch}
                                onChange={(e) => setTaxRateSearch(e.target.value)}
                                placeholder="Search taxes"
                                className="w-full border-0 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1">
                            {filteredTaxRates.length > 0 ? (
                              filteredTaxRates.map((tax) => {
                                const taxId = String(tax._id || tax.id || "");
                                const isSelected = String(formData.taxRate || "") === taxId;
                                return (
                                  <button
                                    key={taxId || `${tax.name}-${tax.rate}`}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, taxRate: taxId }));
                                      setIsTaxRateDropdownOpen(false);
                                      setTaxRateSearch("");
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-blue-50 text-[#156372]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
                                  >
                                    <span className="truncate">{tax.name || "Tax"} ({Number(tax.rate || 0)}%)</span>
                                    {isSelected && <ChevronDown size={14} className="rotate-180 text-[#156372]" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500">No taxes found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company ID */}
                  <div className="mb-4 flex items-start gap-6">
                    <label htmlFor="companyId" className="w-[160px] shrink-0 pt-2 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Company ID <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="flex-1 max-w-[360px]">
                      <input
                        id="companyId"
                        type="text"
                        name="companyId"
                        value={formData.companyId}
                        onChange={handleChange}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>

                  {/* Accounts Payable */}
                  <div className="mb-4 flex items-start gap-6">
                    <label htmlFor="accountsPayable" className="w-[160px] shrink-0 pt-2 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Accounts Payable <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="relative flex-1 max-w-[360px]" ref={accountsPayableDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountsPayableDropdownOpen((prev) => !prev);
                          setAccountsPayableSearch("");
                        }}
                        className="flex h-[40px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:border-[#156372]/50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                      >
                        <span className="truncate">
                          {formData.accountsPayable || "Select an account"}
                        </span>
                        <ChevronDown size={16} className={`ml-3 shrink-0 text-gray-500 transition-transform ${isAccountsPayableDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isAccountsPayableDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-[360px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_18px_30px_-12px_rgba(15,23,42,0.22)]">
                          <div className="border-b border-gray-100 p-2">
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:border-[#156372] focus-within:shadow-[0_0_0_3px_rgba(21,99,114,0.12)]">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={accountsPayableSearch}
                                onChange={(e) => setAccountsPayableSearch(e.target.value)}
                                placeholder="Search accounts"
                                className="w-full border-0 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, accountsPayable: "" }));
                                setIsAccountsPayableDropdownOpen(false);
                                setAccountsPayableSearch("");
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${!formData.accountsPayable ? "bg-blue-50 text-[#156372]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
                            >
                              <span className="truncate">Select an account</span>
                            </button>
                            {filteredAccountsPayableOptions.length > 0 ? (
                              filteredAccountsPayableOptions.map((accountName) => {
                                const isSelected = formData.accountsPayable === accountName;
                                return (
                                  <button
                                    key={accountName}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, accountsPayable: accountName }));
                                      setIsAccountsPayableDropdownOpen(false);
                                      setAccountsPayableSearch("");
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-blue-50 text-[#156372]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
                                  >
                                    <span className="truncate">{accountName}</span>
                                    {isSelected && <ChevronDown size={14} className="rotate-180 text-[#156372]" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500">No accounts found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opening Balance */}
                  <div className="my-4 w-full max-w-[720px]">
                    <div className="flex items-center gap-6">
                      <label htmlFor="openingBalance" className="w-[160px] shrink-0 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                        Opening Balance <Info size={14} className="text-gray-400" />
                      </label>
                      <div className="relative" ref={openingBalanceLocationDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsOpeningBalanceLocationDropdownOpen((prev) => !prev)}
                          className="flex h-[38px] w-[150px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:border-[#156372]/50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                        >
                          <span className="truncate">{formData.locationCode || "Head Office"}</span>
                          <ChevronDown size={14} className={`ml-3 shrink-0 text-gray-500 transition-transform ${isOpeningBalanceLocationDropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpeningBalanceLocationDropdownOpen && (
                          <div className="absolute z-50 mt-2 w-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_18px_30px_-12px_rgba(15,23,42,0.22)]">
                            {["Head Office", "Branch Office"].map((location) => {
                              const isSelected = (formData.locationCode || "Head Office") === location;
                              return (
                                <button
                                  key={location}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, locationCode: location }));
                                    setIsOpeningBalanceLocationDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-blue-50 text-[#156372]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
                                >
                                  <span className="truncate">{location}</span>
                                  {isSelected && <ChevronDown size={14} className="rotate-180 text-[#156372]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex h-[38px] min-w-[48px] items-center rounded-l-md border border-r-0 border-gray-300 bg-white px-3 text-sm text-gray-900">
                          KES
                        </span>
                        <input
                          id="openingBalance"
                          type="text"
                          name="openingBalance"
                          value={formData.openingBalance}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="block h-[38px] w-[140px] rounded-r-md bg-white px-3 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="mb-4 flex items-start gap-6">
                    <label htmlFor="currency" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">Currency</label>
                    <div className="relative flex-1 max-w-[360px]" ref={currencyDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCurrencyDropdownOpen((prev) => !prev);
                          setCurrencySearch("");
                        }}
                        disabled={loadingCurrencies}
                        className="flex h-[40px] w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 ease-out hover:border-[#156372]/50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none disabled:opacity-50"
                      >
                        <span className="truncate">
                          {(() => {
                            const selected = currencies.find((currency) => `${currency.code} - ${currency.name}` === formData.currency);
                            return selected ? `${selected.code} - ${selected.name}` : "Select a currency";
                          })()}
                        </span>
                        <ChevronDown size={16} className={`ml-3 shrink-0 text-gray-500 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isCurrencyDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-[360px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_18px_30px_-12px_rgba(15,23,42,0.22)]">
                          <div className="border-b border-gray-100 p-2">
                            <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:border-[#156372] focus-within:shadow-[0_0_0_3px_rgba(21,99,114,0.12)]">
                              <Search size={14} className="text-gray-400" />
                              <input
                                type="text"
                                value={currencySearch}
                                onChange={(e) => setCurrencySearch(e.target.value)}
                                placeholder="Search currencies"
                                className="w-full border-0 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto py-1">
                            {loadingCurrencies ? (
                              <div className="px-3 py-4 text-sm text-gray-500">Loading currencies...</div>
                            ) : filteredCurrencyOptions.length > 0 ? (
                              filteredCurrencyOptions.map((currency) => {
                                const value = `${currency.code} - ${currency.name}`;
                                const isSelected = formData.currency === value;
                                return (
                                  <button
                                    key={currency._id}
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, currency: value }));
                                      setIsCurrencyDropdownOpen(false);
                                      setCurrencySearch("");
                                    }}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isSelected ? "bg-blue-50 text-[#156372]" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
                                  >
                                    <span className="truncate">{value}</span>
                                    {isSelected && <ChevronDown size={14} className="rotate-180 text-[#156372]" />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500">No currencies found</div>
                            )}
                          </div>
                          <div className="border-t border-gray-100 p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                                setShowNewCurrencyModal(true);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#156372] transition-colors hover:bg-[#156372]/5"
                            >
                              <Plus size={16} />
                              Add new currency
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="mb-4 flex items-start gap-6">
                    <label className="w-[160px] shrink-0 pt-2 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Payment Terms <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="relative flex-1 max-w-[360px]">
                      <PaymentTermsDropdown
                        value={formData.paymentTerms}
                        onChange={(val) => setFormData({ ...formData, paymentTerms: val })}
                        onConfigure={() => setShowConfigureTerms(true)}
                      />
                    </div>
                  </div>

                  {/* Enable Portal */}
                  <div className="mb-4 flex items-start gap-6">
                    <label htmlFor="enablePortal" className="w-[160px] shrink-0 pt-0.5 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Enable Portal? <HelpTooltip text="Give your vendors access to portal to view transactions and payments."><Info size={14} className="text-gray-400" /></HelpTooltip>
                    </label>
                    <div className="flex items-start gap-3 pt-0.5">
                      <input
                        id="enablePortal"
                        type="checkbox"
                        name="enablePortal"
                        checked={formData.enablePortal}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mt-0.5"
                      />
                      <span className="text-sm/6 text-gray-600">Allow portal access for this vendor</span>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="mb-4 flex items-start gap-6">
                    <label className="w-[160px] shrink-0 pt-2 flex items-center gap-1 text-sm/6 font-medium text-gray-900">
                      Documents <Info size={14} className="text-gray-400" />
                    </label>
                    <div className="flex-1 max-w-[360px]" ref={uploadDropdownRef}>
                      <div className="flex items-center gap-0">
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

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails((prev) => !prev)}
                      className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {showMoreDetails ? "Hide more details" : "Add more details"}
                    </button>

                    {showMoreDetails && (
                      <div className="mt-4 -ml-44 space-y-4">
                        <div className="flex items-start gap-2">
                          <label htmlFor="websiteUrl" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">
                            Website URL <Info size={14} className="text-gray-400" />
                          </label>
                          <div className="flex-1 max-w-[360px]">
                            <div className="relative">
                              <Globe size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                id="websiteUrl"
                                type="url"
                                name="websiteUrl"
                                value={formData.websiteUrl}
                                onChange={handleChange}
                                placeholder="ex: www.zylker.com"
                                className="block h-[40px] w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <label htmlFor="department" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">
                            Department
                          </label>
                          <div className="flex-1 max-w-[360px]">
                            <input
                              id="department"
                              type="text"
                              name="department"
                              value={formData.department}
                              onChange={handleChange}
                              className="block h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <label htmlFor="designation" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">
                            Designation
                          </label>
                          <div className="flex-1 max-w-[360px]">
                            <input
                              id="designation"
                              type="text"
                              name="designation"
                              value={formData.designation}
                              onChange={handleChange}
                              className="block h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <label htmlFor="xSocial" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">
                            X
                          </label>
                          <div className="flex-1 max-w-[360px]">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                                X
                              </span>
                              <input
                                id="xSocial"
                                type="text"
                                name="xSocial"
                                value={formData.xSocial}
                                onChange={handleChange}
                                className="block h-[40px] w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                              />
                            </div>
                            <p className="mt-1 text-xs text-blue-500">https://x.com/</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <label htmlFor="skypeName" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">
                            Skype Name/Number
                          </label>
                          <div className="flex-1 max-w-[360px]">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#00aff0]">
                                S
                              </span>
                              <input
                                id="skypeName"
                                type="text"
                                name="skypeName"
                                value={formData.skypeName}
                                onChange={handleChange}
                                className="block h-[40px] w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <label htmlFor="facebook" className="w-[160px] shrink-0 pt-2 block text-sm/6 font-medium text-gray-900">
                            Facebook
                          </label>
                          <div className="flex-1 max-w-[360px]">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-xs font-semibold text-white">
                                f
                              </span>
                              <input
                                id="facebook"
                                type="text"
                                name="facebook"
                                value={formData.facebook}
                                onChange={handleChange}
                                className="block h-[40px] w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none"
                              />
                            </div>
                            <p className="mt-1 text-xs text-blue-500">http://www.facebook.com/</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Country/Region <Info size={14} className="text-gray-400" /></label>
                      <div ref={billingCountryDropdownRef} style={{ position: "relative", width: "100%" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsBillingCountryDropdownOpen((prev) => !prev);
                            setBillingCountrySearch("");
                          }}
                          style={{
                            ...styles.addressInput,
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <span>{formData.billingCountry || "Select or type to add"}</span>
                          <ChevronDown size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                        </button>
                        {isBillingCountryDropdownOpen && (
                          <div style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            backgroundColor: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 50,
                            maxHeight: "260px",
                            overflow: "auto",
                          }}>
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
                              <input
                                autoFocus
                                value={billingCountrySearch}
                                onChange={(e) => setBillingCountrySearch(e.target.value)}
                                placeholder="Search countries"
                                style={{ ...styles.dropdownSearchInput, width: "260px" }}
                              />
                            </div>
                            {filteredBillingCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, billingCountry: country }));
                                  setIsBillingCountryDropdownOpen(false);
                                  setBillingCountrySearch("");
                                }}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        )}
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
                          style={styles.addressTextarea}
                        />
                      </div>
                      <div style={{ gridColumn: "2 / 3", width: "100%" }}>
                        <textarea
                          name="billingStreet2"
                          value={formData.billingStreet2}
                          onChange={handleChange}
                          placeholder="Street 2"
                          style={styles.addressTextarea}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>City <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="text"
                          name="billingCity"
                          value={formData.billingCity}
                          onChange={handleChange}
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State <Info size={14} className="text-gray-400" /></label>
                      <div ref={billingStateDropdownRef} style={{ position: "relative", width: "100%" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsBillingStateDropdownOpen((prev) => !prev);
                            setBillingStateSearch("");
                          }}
                          style={{
                            ...styles.addressInput,
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <span>{formData.billingState || "Select or type to add"}</span>
                          <ChevronDown size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                        </button>
                        {isBillingStateDropdownOpen && (
                          <div style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            backgroundColor: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 50,
                            maxHeight: "260px",
                            overflow: "auto",
                          }}>
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
                              <input
                                autoFocus
                                value={billingStateSearch}
                                onChange={(e) => setBillingStateSearch(e.target.value)}
                                placeholder="Search states"
                                style={{ ...styles.dropdownSearchInput, width: "260px" }}
                              />
                            </div>
                            {filteredBillingStates.length > 0 ? filteredBillingStates.map((state) => (
                              <button
                                key={state}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, billingState: state }));
                                  setIsBillingStateDropdownOpen(false);
                                  setBillingStateSearch("");
                                }}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                {state}
                              </button>
                            )) : (
                              <div style={{ padding: "8px 12px", color: "#6b7280" }}>No states found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>ZIP Code <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="text"
                          name="billingZipCode"
                          value={formData.billingZipCode}
                          onChange={handleChange}
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="tel"
                          name="billingPhone"
                          value={formData.billingPhone}
                          onChange={handleChange}
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fax Number <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="text"
                          name="billingFax"
                          value={formData.billingFax}
                          onChange={handleChange}
                          style={styles.addressInput}
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
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Country/Region <Info size={14} className="text-gray-400" /></label>
                      <div ref={shippingCountryDropdownRef} style={{ position: "relative", width: "100%" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShippingCountryDropdownOpen((prev) => !prev);
                            setShippingCountrySearch("");
                          }}
                          style={{
                            ...styles.addressInput,
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <span>{formData.shippingCountry || "Select or type to add"}</span>
                          <ChevronDown size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                        </button>
                        {isShippingCountryDropdownOpen && (
                          <div style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            backgroundColor: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 50,
                            maxHeight: "260px",
                            overflow: "auto",
                          }}>
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
                              <input
                                autoFocus
                                value={shippingCountrySearch}
                                onChange={(e) => setShippingCountrySearch(e.target.value)}
                                placeholder="Search countries"
                                style={{ ...styles.dropdownSearchInput, width: "260px" }}
                              />
                            </div>
                            {filteredShippingCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, shippingCountry: country }));
                                  setIsShippingCountryDropdownOpen(false);
                                  setShippingCountrySearch("");
                                }}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        )}
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
                          style={styles.addressTextarea}
                        />
                      </div>
                      <div style={{ gridColumn: "2 / 3", width: "100%" }}>
                        <textarea
                          name="shippingStreet2"
                          value={formData.shippingStreet2}
                          onChange={handleChange}
                          placeholder="Street 2"
                          style={styles.addressTextarea}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>City <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="text"
                          name="shippingCity"
                          value={formData.shippingCity}
                          onChange={handleChange}
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State <Info size={14} className="text-gray-400" /></label>
                      <div ref={shippingStateDropdownRef} style={{ position: "relative", width: "100%" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShippingStateDropdownOpen((prev) => !prev);
                            setShippingStateSearch("");
                          }}
                          style={{
                            ...styles.addressInput,
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <span>{formData.shippingState || "Select or type to add"}</span>
                          <ChevronDown size={16} style={{ color: "#6b7280", flexShrink: 0 }} />
                        </button>
                        {isShippingStateDropdownOpen && (
                          <div style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            backgroundColor: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 50,
                            maxHeight: "260px",
                            overflow: "auto",
                          }}>
                            <div style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
                              <input
                                autoFocus
                                value={shippingStateSearch}
                                onChange={(e) => setShippingStateSearch(e.target.value)}
                                placeholder="Search states"
                                style={{ ...styles.dropdownSearchInput, width: "260px" }}
                              />
                            </div>
                            {filteredShippingStates.length > 0 ? filteredShippingStates.map((state) => (
                              <button
                                key={state}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, shippingState: state }));
                                  setIsShippingStateDropdownOpen(false);
                                  setShippingStateSearch("");
                                }}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "white",
                                  cursor: "pointer",
                                }}
                              >
                                {state}
                              </button>
                            )) : (
                              <div style={{ padding: "8px 12px", color: "#6b7280" }}>No states found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>ZIP Code <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="text"
                          name="shippingZipCode"
                          value={formData.shippingZipCode}
                          onChange={handleChange}
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="tel"
                          name="shippingPhone"
                          value={formData.shippingPhone}
                          onChange={handleChange}
                          style={styles.addressInput}
                        />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fax Number <Info size={14} className="text-gray-400" /></label>
                        <input
                          type="text"
                          name="shippingFax"
                          value={formData.shippingFax}
                          onChange={handleChange}
                          style={styles.addressInput}
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
            {activeTab === "Contact Persons" && (
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
            )}

            {/* Custom Fields Tab Content */}
            {activeTab === "Custom Fields" && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyStateText}>
                    Start adding custom fields for your Customers and Vendors by going to{" "}
                    <span style={{ fontWeight: "600" }}>Settings</span> ➡{" "}
                    <span style={{ fontWeight: "600" }}>Preferences</span> ➡{" "}
                    <span style={{ fontWeight: "600" }}>Customers and Vendors</span>. You can also refine the address format of your Customers and Vendors from there.
                  </div>
                </div>
            )}

            {/* Reporting Tags Tab Content */}
            {activeTab === "Reporting Tags" && (
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
            )}

            {/* Remarks Tab Content */}
            {activeTab === "Remarks" && (
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
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300 placeholder:text-gray-400 shadow-sm transition-all duration-200 ease-out hover:border-[#156372]/40 hover:shadow-md focus:border-[#156372] focus:shadow-[0_0_0_3px_rgba(21,99,114,0.12)] focus:outline-none sm:text-sm/6"
                      />
                    </div>
                  </div>
                </div>
            )}


            {/* Action Buttons */}
            <div className="sticky bottom-0 z-20 flex items-center gap-3 bg-transparent px-0 py-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-[#156372] px-5 py-2 text-sm font-medium text-white hover:bg-[#0d4a52]"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
        </form>
        {/* Right Column - Documents Table */}
        {documents.length > 0 && (
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
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#fee2e2";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
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
      </div>
      <ConfigurePaymentTermsModal
        isOpen={showConfigureTerms}
        onClose={() => setShowConfigureTerms(false)}
      />
      {showNewCurrencyModal && (
        <NewCurrencyModal
          onClose={() => setShowNewCurrencyModal(false)}
          onSave={async (currencyData) => {
            try {
              const response = await currenciesAPI.create({
                code: currencyData.code.split(" - ")[0],
                symbol: currencyData.symbol,
                name: currencyData.name,
                decimal_places: parseInt(currencyData.decimalPlaces, 10) || 2,
                format: currencyData.format,
                is_base_currency: currencyData.isBaseCurrency,
              });

              const createdCurrency = response?.data || response;
              const createdValue = `${createdCurrency.code || currencyData.code.split(" - ")[0]} - ${createdCurrency.name || currencyData.name}`;

              setCurrencies((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                next.push({
                  _id: createdCurrency._id || createdCurrency.id || crypto.randomUUID(),
                  code: createdCurrency.code || currencyData.code.split(" - ")[0],
                  name: createdCurrency.name || currencyData.name,
                  isBaseCurrency: Boolean(createdCurrency.isBaseCurrency || createdCurrency.is_base_currency),
                });
                return next;
              });

              setFormData((prev) => ({ ...prev, currency: createdValue }));
              setShowNewCurrencyModal(false);
            } catch (error) {
              console.error("Error saving currency:", error);
              alert("Error saving currency");
            }
          }}
        />
      )}
    </div>
  );
}



