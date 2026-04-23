import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Info, Settings, ExternalLink, Search, ChevronUp, ChevronDown, Settings2, X, Loader2 } from "lucide-react";
import { getToken, API_BASE_URL } from "../../../../../services/auth";
import toast from "react-hot-toast";

export default function GeneralSettingsPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationSettings, setOrganizationSettings] = useState<any>({});
  const defaultAddressFormat = '${ORGANIZATION.STREET_ADDRESS_1}\n${ORGANIZATION.STREET_ADDRESS_2}\n${ORGANIZATION.CITY} ${ORGANIZATION.STATE}\n${ORGANIZATION.POSTAL_CODE}\n${ORGANIZATION.COUNTRY}\n${ORGANIZATION.PHONE}\n${ORGANIZATION.EMAIL}\n${ORGANIZATION.WEBSITE}';
  const defaultModules = {
    quotes: true,
    salesOrders: false,
    salesReceipts: true,
    purchaseOrders: false,
    timeTracking: true,
    retainerInvoices: false,
    recurringInvoice: true,
    recurringExpense: true,
    recurringBills: true,
    recurringJournals: false,
    creditNote: true,
    paymentLinks: false,
    tasks: false,
    fixedAsset: false,
  };

  const asBoolean = (value: any): boolean =>
    value === true || value === "true" || value === 1 || value === "1";

  const toModuleEntries = (value: any): Array<[string, boolean]> => {
    if (value instanceof Map) {
      return Array.from(value.entries()).map(([key, moduleValue]) => [String(key), asBoolean(moduleValue)]);
    }

    if (Array.isArray(value)) {
      return value.map(([key, moduleValue]) => [String(key), asBoolean(moduleValue)] as [string, boolean]);
    }

    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, moduleValue]) => [key, asBoolean(moduleValue)] as [string, boolean]);
    }

    return [];
  };

  const normalizeModules = (value: any): Record<string, boolean> => ({
    ...defaultModules,
    ...Object.fromEntries(toModuleEntries(value)),
  });

  const friendlyModuleNames: Record<string, string> = {
    quotes: "Quotes",
    salesOrders: "Sales Orders",
    salesReceipts: "Sales Receipts",
    purchaseOrders: "Purchase Orders",
    timeTracking: "Time Tracking",
    retainerInvoices: "Retainer Invoices",
    recurringInvoice: "Recurring Invoices",
    recurringExpense: "Recurring Expenses",
    recurringBills: "Recurring Bills",
    recurringJournals: "Recurring Journals",
    creditNote: "Credit Notes",
    paymentLinks: "Payment Links",
    tasks: "Tasks",
    fixedAsset: "Fixed Assets",
  };

  // Module selection states
  const [modules, setModules] = useState<Record<string, boolean>>(() => normalizeModules(null));

  // Taban Books Inventory Add-on
  const [enableInventory, setEnableInventory] = useState(false);
  const [enablePANValidation, setEnablePANValidation] = useState(false);

  // Work week
  const [workWeek, setWorkWeek] = useState("Sunday");

  // PDF Attachment
  const [attachPDFInvoice, setAttachPDFInvoice] = useState(true);
  const [attachPaymentReceipt, setAttachPaymentReceipt] = useState(false);
  const [encryptPDF, setEncryptPDF] = useState(false);

  // Discounts
  const [discountType, setDiscountType] = useState("transaction");
  const [discountBeforeTax, setDiscountBeforeTax] = useState("Discount Before Tax");

  // Additional charges
  const [adjustments, setAdjustments] = useState(true);
  const [shippingCharges, setShippingCharges] = useState(true);
  const [enableTaxAutomation, setEnableTaxAutomation] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState("Apply Default Tax Rate");

  // Tax inclusive/exclusive
  const [taxInclusive, setTaxInclusive] = useState("inclusive");

  // Round Off Tax
  const [roundOffTax, setRoundOffTax] = useState("line-item");

  // Rounding off in Sales Transactions
  const [roundingOff, setRoundingOff] = useState("incremental");
  const [roundingIncrement, setRoundingIncrement] = useState("0.05");

  // Salesperson field
  const [addSalespersonField, setAddSalespersonField] = useState(true);

  // Billable Bills and Expenses
  const [billableAccount, setBillableAccount] = useState("");
  const [billableAccountDropdownOpen, setBillableAccountDropdownOpen] = useState(false);
  const [billableAccountSearch, setBillableAccountSearch] = useState("");
  const billableAccountRef = useRef<HTMLDivElement>(null);
  const billableAccountDropdownRef = useRef<HTMLDivElement>(null);
  const [defaultMarkup, setDefaultMarkup] = useState("3");

  // Document copy labels
  const [documentCopies, setDocumentCopies] = useState(2);
  const [copyLabels, setCopyLabels] = useState<Record<string, string>>({
    original: "ORIGINAL",
    duplicate: "DUPLICATE",
    triplicate: "TRIPLICATE",
    quadruplicate: "QUADRUPLICATE",
    quintuplicate: "QUINTUPLICATE"
  });

  // Default print preferences
  const [printPreferences, setPrintPreferences] = useState("choose-while-printing");
  const [printPreferencesDropdownOpen, setPrintPreferencesDropdownOpen] = useState(false);
  const [printPreferencesSearch, setPrintPreferencesSearch] = useState("");
  const printPreferencesRef = useRef<HTMLDivElement>(null);
  const printPreferencesDropdownRef = useRef<HTMLDivElement>(null);

  // Weekly Summary Report
  const [sendWeeklySummary, setSendWeeklySummary] = useState(false);

  // Payment Retention
  const [paymentRetention, setPaymentRetention] = useState(false);
  const [retainerAccount, setRetainerAccount] = useState("Employee Reimbursements");
  const [enableProfitMargin, setEnableProfitMargin] = useState(false);
  const initialSettingsSnapshotRef = useRef<string>("");
  const initialModulesSignatureRef = useRef<string>("");

  // Organization Address Format
  const [addressFormat, setAddressFormat] = useState(defaultAddressFormat);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const addressFormatTextareaRef = useRef<HTMLTextAreaElement>(null);

  const printPreferencesOptions = [
    { label: "One Copy", value: "one-copy" },
    { label: "Two Copies", value: "two-copies" },
    { label: "Three Copies", value: "three-copies" },
    { label: "Four Copies", value: "four-copies" },
    { label: "Five Copies", value: "five-copies" },
    { label: "I will choose while printing", value: "choose-while-printing" },
  ];

  const normalizePrintPreference = (value: any): string => {
    const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-");

    if (!normalized || normalized === "i-will-choose-while-printing") {
      return "choose-while-printing";
    }

    return printPreferencesOptions.some((option) => option.value === normalized)
      ? normalized
      : "choose-while-printing";
  };

  const getPrintPreferenceLabel = (value: any): string => {
    const normalizedValue = normalizePrintPreference(value);
    return printPreferencesOptions.find((option) => option.value === normalizedValue)?.label || "I will choose while printing";
  };

  const syncInitialSnapshot = (settings: any) => {
    const normalizedModules = normalizeModules(settings?.modules);
    initialModulesSignatureRef.current = Object.entries(normalizedModules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value ? 1 : 0}`)
      .join("|");

    initialSettingsSnapshotRef.current = JSON.stringify({
      modules: normalizedModules,
      workWeek: settings?.workWeek ?? "Sunday",
      enableInventory: settings?.enableInventory ?? false,
      enablePANValidation: settings?.enablePANValidation ?? false,
      pdfSettings: {
        attachPDFInvoice: settings?.pdfSettings?.attachPDFInvoice ?? true,
        attachPaymentReceipt: settings?.pdfSettings?.attachPaymentReceipt ?? false,
        encryptPDF: settings?.pdfSettings?.encryptPDF ?? false,
      },
      discountSettings: {
        discountType: settings?.discountSettings?.discountType ?? "transaction",
        discountBeforeTax: settings?.discountSettings?.discountBeforeTax ?? "Discount Before Tax",
      },
      chargeSettings: {
        adjustments: settings?.chargeSettings?.adjustments ?? true,
        shippingCharges: settings?.chargeSettings?.shippingCharges ?? true,
        enableTaxAutomation: settings?.chargeSettings?.enableTaxAutomation ?? false,
        defaultTaxRate: settings?.chargeSettings?.defaultTaxRate ?? "Apply Default Tax Rate",
      },
      taxSettings: {
        taxInclusive: settings?.taxSettings?.taxInclusive ?? "inclusive",
        roundOffTax: settings?.taxSettings?.roundOffTax ?? "line-item",
      },
      roundingSettings: {
        roundingOff: settings?.roundingSettings?.roundingOff ?? "incremental",
        roundingIncrement: settings?.roundingSettings?.roundingIncrement ?? "0.05",
      },
      salesSettings: {
        addSalespersonField: settings?.salesSettings?.addSalespersonField ?? true,
        enableProfitMargin: settings?.salesSettings?.enableProfitMargin ?? false,
      },
      billingSettings: {
        billableAccount: settings?.billingSettings?.billableAccount ?? "",
        defaultMarkup: settings?.billingSettings?.defaultMarkup ?? "3",
        retainerAccount: settings?.billingSettings?.retainerAccount ?? "Employee Reimbursements",
      },
      documentSettings: {
        documentCopies: settings?.documentSettings?.documentCopies ?? 2,
        copyLabels: {
          original: "ORIGINAL",
          duplicate: "DUPLICATE",
          triplicate: "TRIPLICATE",
          quadruplicate: "QUADRUPLICATE",
          quintuplicate: "QUINTUPLICATE",
          ...(settings?.documentSettings?.copyLabels || {}),
        },
      },
      printSettings: {
        printPreferences: normalizePrintPreference(settings?.printSettings?.printPreferences),
      },
      reportSettings: {
        sendWeeklySummary: settings?.reportSettings?.sendWeeklySummary ?? false,
      },
      retentionSettings: {
        paymentRetention: settings?.retentionSettings?.paymentRetention ?? false,
      },
      pdfFormatSettings: {
        addressFormat: settings?.pdfFormatSettings?.addressFormat || defaultAddressFormat,
      },
    });
  };

  const syncSettingsState = (settings: any) => {
    const s = settings || {};

    setOrganizationSettings(s);
    setModules(normalizeModules(s.modules));
    setEnableInventory(s.enableInventory ?? false);
    setEnablePANValidation(s.enablePANValidation ?? false);
    setWorkWeek(s.workWeek ?? "Sunday");

    const pdfSettings = s.pdfSettings || {};
    setAttachPDFInvoice(pdfSettings.attachPDFInvoice ?? true);
    setAttachPaymentReceipt(pdfSettings.attachPaymentReceipt ?? false);
    setEncryptPDF(pdfSettings.encryptPDF ?? false);

    const discountSettings = s.discountSettings || {};
    setDiscountType(discountSettings.discountType ?? "transaction");
    setDiscountBeforeTax(discountSettings.discountBeforeTax ?? "Discount Before Tax");

    const chargeSettings = s.chargeSettings || {};
    setAdjustments(chargeSettings.adjustments ?? true);
    setShippingCharges(chargeSettings.shippingCharges ?? true);
    setEnableTaxAutomation(chargeSettings.enableTaxAutomation ?? false);
    setDefaultTaxRate(chargeSettings.defaultTaxRate ?? "Apply Default Tax Rate");

    const taxSettings = s.taxSettings || {};
    setTaxInclusive(taxSettings.taxInclusive ?? "inclusive");
    setRoundOffTax(taxSettings.roundOffTax ?? "line-item");

    const roundingSettings = s.roundingSettings || {};
    setRoundingOff(roundingSettings.roundingOff ?? "incremental");
    setRoundingIncrement(roundingSettings.roundingIncrement ?? "0.05");

    const salesSettings = s.salesSettings || {};
    setAddSalespersonField(salesSettings.addSalespersonField ?? true);
    setEnableProfitMargin(salesSettings.enableProfitMargin ?? false);

    const billingSettings = s.billingSettings || {};
    setBillableAccount(billingSettings.billableAccount ?? "");
    setDefaultMarkup(billingSettings.defaultMarkup ?? "3");
    setRetainerAccount(billingSettings.retainerAccount ?? "Employee Reimbursements");

    const documentSettings = s.documentSettings || {};
    setDocumentCopies(documentSettings.documentCopies ?? 2);
    setCopyLabels({
      original: "ORIGINAL",
      duplicate: "DUPLICATE",
      triplicate: "TRIPLICATE",
      quadruplicate: "QUADRUPLICATE",
      quintuplicate: "QUINTUPLICATE",
      ...(documentSettings.copyLabels || {}),
    });

    const printSettings = s.printSettings || {};
    setPrintPreferences(normalizePrintPreference(printSettings.printPreferences));

    const reportSettings = s.reportSettings || {};
    setSendWeeklySummary(reportSettings.sendWeeklySummary ?? false);

    const retentionSettings = s.retentionSettings || {};
    setPaymentRetention(retentionSettings.paymentRetention ?? false);

    const pdfFormatSettings = s.pdfFormatSettings || {};
    setAddressFormat(pdfFormatSettings.addressFormat || defaultAddressFormat);

    syncInitialSnapshot(s);
  };

  const buildGeneralSettingsPayload = () => ({
    settings: {
      modules,
      workWeek,
      enableInventory,
      enablePANValidation,
      pdfSettings: { attachPDFInvoice, attachPaymentReceipt, encryptPDF },
      discountSettings: { discountType, discountBeforeTax },
      chargeSettings: { adjustments, shippingCharges, enableTaxAutomation, defaultTaxRate },
      taxSettings: { taxInclusive, roundOffTax },
      roundingSettings: { roundingOff, roundingIncrement },
      salesSettings: {
        addSalespersonField,
        enableProfitMargin,
      },
      billingSettings: {
        billableAccount,
        defaultMarkup,
        retainerAccount,
      },
      documentSettings: { documentCopies, copyLabels },
      printSettings: { printPreferences: normalizePrintPreference(printPreferences) },
      reportSettings: { sendWeeklySummary },
      retentionSettings: { paymentRetention },
      pdfFormatSettings: { addressFormat },
    },
  });

  const currentModulesSignature = Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value ? 1 : 0}`)
    .join("|");

  const currentSettingsSnapshot = JSON.stringify(buildGeneralSettingsPayload().settings);
  const hasUnsavedChanges =
    !initialSettingsSnapshotRef.current ||
    currentSettingsSnapshot !== initialSettingsSnapshotRef.current ||
    currentModulesSignature !== initialModulesSignatureRef.current;

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = getToken();
        if (!token) {
          toast.error("Please sign in again to load organization settings.");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/settings/general`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.settings) {
            syncSettingsState(data.data.settings);
          } else {
            toast.error(data.message || "Failed to load general settings");
          }
        }
      } catch (error) {
        console.error('Error loading general settings:', error);
        toast.error("An error occurred while loading settings");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        toast.error("Please sign in again to save settings.");
        return;
      }

      if (!hasUnsavedChanges) {
        toast("No changes to save");
        return;
      }

      const payload = buildGeneralSettingsPayload();

      const response = await fetch(`${API_BASE_URL}/settings/general`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        const savedSettings = data?.data?.settings || payload.settings;
        toast.success("Settings saved successfully");
        syncSettingsState(savedSettings);
        syncInitialSnapshot(savedSettings);
        // Dispatch event for sidebar and bootstrap cache updates.
        window.dispatchEvent(new CustomEvent("generalSettingsUpdated", { detail: savedSettings }));
      } else {
        const rawText = await response.text().catch(() => "");
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }
        console.error("General settings save failed", {
          status: response.status,
          statusText: response.statusText,
          responseBody: data || rawText,
          payload,
        });
        toast.error(data?.message || rawText || `Failed to save settings (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  // Sample organization data for preview
  const organizationData: Record<string, string> = {
    STREET_ADDRESS_1: "taleex",
    STREET_ADDRESS_2: "taleex",
    CITY: "mogadishu",
    STATE: "Nairobi",
    POSTAL_CODE: "22223",
    COUNTRY: "Kenya",
    PHONE: "",
    EMAIL: "jirdehusseinkhalif@gmail.com",
    WEBSITE: ""
  };

  // Function to replace placeholders with actual values
  const getPreviewText = () => {
    let preview = addressFormat;
    Object.keys(organizationData).forEach(key => {
      const placeholder = `\${ORGANIZATION.${key}}`;
      preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), organizationData[key] || '');
    });
    return preview;
  };

  const handleModuleChange = (module: string) => {
    setModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  // Account options for Billable Bills
  const accountOptions = [
    "Discount",
    "General Income",
    "Interest Income",
    "Late Fee Income",
    "Other Charges",
    "Sales",
    "Shipping Charge"
  ];

  const filteredAccountOptions = useMemo(() => {
    if (!billableAccountSearch) return accountOptions;
    const s = billableAccountSearch.trim().toLowerCase();
    return s ? accountOptions.filter((o) => o.toLowerCase().includes(s)) : accountOptions;
  }, [billableAccountSearch]);

  const filteredPrintPreferencesOptions = useMemo(() => {
    const s = printPreferencesSearch.trim().toLowerCase();
    return s
      ? printPreferencesOptions.filter((o) => o.label.toLowerCase().includes(s))
      : printPreferencesOptions;
  }, [printPreferencesSearch]);

  // Click away handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (billableAccountRef.current && !billableAccountRef.current.contains(target) &&
        billableAccountDropdownRef.current && !billableAccountDropdownRef.current.contains(target)) {
        setBillableAccountDropdownOpen(false);
        setBillableAccountSearch("");
      }
      if (printPreferencesRef.current && !printPreferencesRef.current.contains(target) &&
        printPreferencesDropdownRef.current && !printPreferencesDropdownRef.current.contains(target)) {
        setPrintPreferencesDropdownOpen(false);
        setPrintPreferencesSearch("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Position calculation for dropdowns
  const [billableAccountPosition, setBillableAccountPosition] = useState({ top: 0, left: 0, width: 0 });
  const [printPreferencesPosition, setPrintPreferencesPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (billableAccountDropdownOpen && billableAccountRef.current) {
      const rect = billableAccountRef.current.getBoundingClientRect();
      setBillableAccountPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [billableAccountDropdownOpen]);

  useEffect(() => {
    if (printPreferencesDropdownOpen && printPreferencesRef.current) {
      const rect = printPreferencesRef.current.getBoundingClientRect();
      setPrintPreferencesPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, [printPreferencesDropdownOpen]);

  useEffect(() => {
    if (loading) return;
    if (location.hash !== "#organization-address-format") return;

    const el = document.getElementById("organization-address-format");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, location.hash]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#005766]" />
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <div className="p-6 max-w-4xl flex-1">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">General</h1>

        <div className="space-y-8 pb-10">
        {/* Select Modules */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Select the modules you would like to enable.
          </h3>
          <div className="flex flex-col gap-4">
            {Object.entries(modules).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleModuleChange(key)}
                  className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  {friendlyModuleNames[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {(key === "timeTracking") && (
                  <Info size={14} className="text-gray-400" />
                )}
                {(key === "recurringInvoice" || key === "recurringJournals") && (
                  <Settings2 size={14} className="text-[#005766]" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Default account for receiving Retainer Payments */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default account for receiving Retainer Payments
          </label>
          <select
            value={retainerAccount}
            onChange={(e) => setRetainerAccount(e.target.value)}
            className="w-[300px] h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005766]"
          >
            <option>Employee Reimbursements</option>
            <option>Customer Deposits</option>
          </select>
        </div>

        {/* Zoho Inventory Add-on */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Zoho Inventory Add-on</h3>
            <Info size={14} className="text-gray-400" />
            <a href="#" className="text-sm text-[#005766] hover:underline">Learn More</a>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={enableInventory}
              onChange={(e) => setEnableInventory(e.target.checked)}
              className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Enable Zoho Inventory modules in Zoho Books.</span>
          </label>
          {enableInventory && (
            <div className="ml-6">
              <p className="text-sm text-gray-600 mb-2">
                Enabling Zoho Inventory Add-on will allow you to use the following modules of Zoho Inventory within Zoho Books:
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                {["Composite Items", "Packages", "Picklists", "Shipments", "Purchase Receive", "Sales Returns", "Transfer Orders"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Work Week */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set the first day of your work week:
          </label>
          <select
            value={workWeek}
            onChange={(e) => setWorkWeek(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005766]"
          >
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        {/* PDF Attachment */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">PDF Attachment</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachPDFInvoice}
                onChange={(e) => setAttachPDFInvoice(e.target.checked)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Attach PDF file with the link while emailing the invoice & quote?</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachPaymentReceipt}
                onChange={(e) => setAttachPaymentReceipt(e.target.checked)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Attach payment receipt PDF to the online Payment Thank-You email notification.</span>
              <Info size={14} className="text-gray-400" />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={encryptPDF}
                onChange={(e) => setEncryptPDF(e.target.checked)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">I would like to encrypt the PDF files that I send.</span>
            </label>
            {encryptPDF && (
              <p className="text-xs text-gray-600 ml-6">
                This will ensure that the PDF files cannot be edited or converted into another file format.
              </p>
            )}
          </div>
        </div>

        {/* Discounts */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Do you give discounts?</h3>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value="none"
                checked={discountType === "none"}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300"
              />
              <span className="text-sm text-gray-700">I don't give discounts</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value="line-item"
                checked={discountType === "line-item"}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300"
              />
              <span className="text-sm text-gray-700">At Line Item Level</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value="transaction"
                checked={discountType === "transaction"}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300"
              />
              <span className="text-sm text-gray-700">At Transaction Level</span>
            </label>
          </div>
          {discountType !== "none" && (
            <select
              value={discountBeforeTax}
              onChange={(e) => setDiscountBeforeTax(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005766]"
            >
              <option>Discount Before Tax</option>
              <option>Discount After Tax</option>
            </select>
          )}
        </div>



        {/* Rounding off in Sales Transactions */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Rounding off in Sales Transactions
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roundingOff"
                value="no-rounding"
                checked={roundingOff === "no-rounding"}
                onChange={(e) => setRoundingOff(e.target.value)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300"
              />
              <span className="text-sm text-gray-700">No Rounding</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roundingOff"
                value="whole-number"
                checked={roundingOff === "whole-number"}
                onChange={(e) => setRoundingOff(e.target.value)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300"
              />
              <span className="text-sm text-gray-700">Round off the total to the nearest whole number</span>
              <Info size={14} className="text-gray-400" />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roundingOff"
                value="incremental"
                checked={roundingOff === "incremental"}
                onChange={(e) => setRoundingOff(e.target.value)}
                className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300"
              />
              <span className="text-sm text-gray-700">Round off the total to the nearest incremental value</span>
            </label>
            {roundingOff === "incremental" && (
              <div className="ml-6 mt-2">
                <p className="text-sm text-gray-700">
                  The current rounding increment is set to: <span className="font-semibold">{roundingIncrement}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = prompt("Enter rounding increment:", roundingIncrement);
                    if (newValue !== null) {
                      setRoundingIncrement(newValue);
                    }
                  }}
                  className="mt-1 flex items-center gap-1 text-sm text-[#005766] hover:text-[#004652]"
                >
                  <Settings2 size={14} />
                  Configure
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Salesperson Field */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addSalespersonField}
              onChange={(e) => setAddSalespersonField(e.target.checked)}
              className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">I want to add a field for salesperson</span>
          </label>
        </div>

        {/* Profit Margin */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Profit Margin</h3>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableProfitMargin}
              onChange={(e) => setEnableProfitMargin(e.target.checked)}
              className="mt-1 h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-700">Enable Profit Margin estimation at line item and transaction level.</span>
              <p className="text-xs text-gray-500 mt-1">
                Once enabled, a profit margin estimate will be shown for each line item in the items table, as well as for the overall transaction <a href="#" className="text-[#005766] hover:underline">Learn More.</a>
              </p>
            </div>
          </label>
        </div>

        {/* Billable Bills and Expenses */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Billable Bills and Expenses
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Account for tracking billable bills and expenses while invoicing
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select an account
              </label>
              <div className="relative" ref={billableAccountRef}>
                <button
                  type="button"
                  onClick={() => setBillableAccountDropdownOpen(!billableAccountDropdownOpen)}
                  className="w-full h-10 px-3 rounded-lg border border-[#005766]/30 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#005766]"
                >
                  <span className={billableAccount ? "text-gray-900" : "text-gray-400"}>
                    {billableAccount || "Select an account"}
                  </span>
                  {billableAccountDropdownOpen ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>
                {billableAccountDropdownOpen && createPortal(
                  <div
                    ref={billableAccountDropdownRef}
                    className="fixed overflow-hidden rounded-xl border-2 border-[#005766]/30 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                    style={{
                      top: `${billableAccountPosition.top}px`,
                      left: `${billableAccountPosition.left}px`,
                      width: `${billableAccountPosition.width}px`,
                      zIndex: 99999,
                      maxHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-[#005766]/10 px-3 py-3 flex-shrink-0">
                      <Search size={16} className="text-gray-400" />
                      <input
                        autoFocus
                        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                        placeholder="Search"
                        value={billableAccountSearch}
                        onChange={(e) => setBillableAccountSearch(e.target.value)}
                      />
                    </div>
                    <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                      {filteredAccountOptions.map((opt) => {
                        const isSelected = opt === billableAccount;
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`w-full px-4 py-2.5 text-left text-sm font-medium transition
                              ${isSelected ? "bg-[#005766] text-white" : "text-gray-900 hover:bg-gray-50"}
                            `}
                            onClick={() => {
                              setBillableAccount(opt);
                              setBillableAccountDropdownOpen(false);
                              setBillableAccountSearch("");
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                      {filteredAccountOptions.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Default Markup Percentage
                </label>
                <Info size={14} className="text-gray-400" />
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={defaultMarkup}
                  onChange={(e) => setDefaultMarkup(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005766]"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Copy Labels */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Document copy label</h3>
            <Info size={14} className="text-gray-400" />
          </div>
          <div className="space-y-4">
            {/* Header Row */}
            <div className="grid grid-cols-6 gap-2">
              <div></div>
              <div className="text-xs font-semibold text-gray-700 text-center">ORIGINAL</div>
              <div className="text-xs font-semibold text-gray-700 text-center">DUPLICATE</div>
              <div className="text-xs font-semibold text-gray-700 text-center">TRIPLICATE</div>
              <div className="text-xs font-semibold text-gray-700 text-center">QUADRUPLICATE</div>
              <div className="text-xs font-semibold text-gray-700 text-center">QUINTUPLICATE</div>
            </div>

            {/* Two Copies Row */}
            <div className="grid grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-700 underline decoration-dotted">Two Copies</div>
              <input
                type="text"
                value={copyLabels.original}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, original: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.duplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, duplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <div></div>
              <div></div>
              <div></div>
            </div>

            {/* Three Copies Row */}
            <div className="grid grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-700 underline decoration-dotted">Three Copies</div>
              <input
                type="text"
                value={copyLabels.original}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, original: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.duplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, duplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.triplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, triplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <div></div>
              <div></div>
            </div>

            {/* Four/Five Copies Row */}
            <div className="grid grid-cols-6 gap-2 items-center">
              <div className="text-sm text-gray-700 underline decoration-dotted">Four/Five Copies</div>
              <input
                type="text"
                value={copyLabels.original}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, original: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.duplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, duplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.triplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, triplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.quadruplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, quadruplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
              <input
                type="text"
                value={copyLabels.quintuplicate}
                onChange={(e) => setCopyLabels((prev) => ({ ...prev, quintuplicate: e.target.value.toUpperCase() }))}
                className="h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 font-medium uppercase"
              />
            </div>
          </div>
        </div>

        {/* Default Print Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default print preferences
          </label>
          <div className="relative" ref={printPreferencesRef}>
            <button
              type="button"
              onClick={() => setPrintPreferencesDropdownOpen(!printPreferencesDropdownOpen)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#005766]"
            >
              <span className="text-gray-900">
                {getPrintPreferenceLabel(printPreferences)}
              </span>
              {printPreferencesDropdownOpen ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>
            {printPreferencesDropdownOpen && createPortal(
              <div
                ref={printPreferencesDropdownRef}
                className="fixed overflow-hidden rounded-xl border-2 border-[#005766]/30 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                style={{
                  top: `${printPreferencesPosition.top}px`,
                  left: `${printPreferencesPosition.left}px`,
                  width: `${printPreferencesPosition.width}px`,
                  zIndex: 99999,
                  maxHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-[#005766]/10 px-3 py-3 flex-shrink-0">
                  <Search size={16} className="text-gray-400" />
                  <input
                    autoFocus
                    className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
                    placeholder="Search"
                    value={printPreferencesSearch}
                    onChange={(e) => setPrintPreferencesSearch(e.target.value)}
                  />
                </div>
                <div className="overflow-auto flex-1" style={{ maxHeight: '280px' }}>
                  {filteredPrintPreferencesOptions.map((opt) => {
                    const optValue = opt.value;
                    const isSelected = optValue === printPreferences;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition flex items-center justify-between
                          ${isSelected ? "bg-gray-100 text-gray-900" : "text-gray-900 hover:bg-gray-50"}
                        `}
                        onClick={() => {
                          setPrintPreferences(optValue);
                          setPrintPreferencesDropdownOpen(false);
                          setPrintPreferencesSearch("");
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-[#005766]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  {filteredPrintPreferencesOptions.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* Weekly Summary Report */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWeeklySummary}
              onChange={(e) => setSendWeeklySummary(e.target.checked)}
              className="h-4 w-4 text-[#005766] focus:ring-[#005766] border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Send Weekly Summary report</span>
          </label>
          {sendWeeklySummary && (
            <div className="ml-6 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>
                  All users with Admin access will receive a summary of all the business transactions for each week.{" "}
                  <a href="#" className="text-[#005766] hover:underline">View Sample</a>
                </li>
                <li>If you've enabled Slack integration, weekly summary report will be pushed into your preferred Slack channel.</li>
              </ul>
            </div>
          )}
        </div>



        {/* Organization Address Format */}
        <div id="organization-address-format" className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Organization Address Format (Displayed in PDF only)
            </h3>
            <Info size={14} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insert Placeholders
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005766]"
                onChange={(e) => {
                  if (e.target.value) {
                    const textarea = addressFormatTextareaRef.current;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newValue = addressFormat.substring(0, start) + e.target.value + addressFormat.substring(end);
                      setAddressFormat(newValue);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + e.target.value.length, start + e.target.value.length);
                      }, 0);
                    } else {
                      setAddressFormat(addressFormat + '\n' + e.target.value);
                    }
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Select placeholder</option>
                <option value={'${ORGANIZATION.STREET_ADDRESS_1}'}>{'${ORGANIZATION.STREET_ADDRESS_1}'}</option>
                <option value={'${ORGANIZATION.STREET_ADDRESS_2}'}>{'${ORGANIZATION.STREET_ADDRESS_2}'}</option>
                <option value={'${ORGANIZATION.CITY}'}>{'${ORGANIZATION.CITY}'}</option>
                <option value={'${ORGANIZATION.STATE}'}>{'${ORGANIZATION.STATE}'}</option>
                <option value={'${ORGANIZATION.POSTAL_CODE}'}>{'${ORGANIZATION.POSTAL_CODE}'}</option>
                <option value={'${ORGANIZATION.COUNTRY}'}>{'${ORGANIZATION.COUNTRY}'}</option>
                <option value={'${ORGANIZATION.PHONE}'}>{'${ORGANIZATION.PHONE}'}</option>
                <option value={'${ORGANIZATION.EMAIL}'}>{'${ORGANIZATION.EMAIL}'}</option>
                <option value={'${ORGANIZATION.WEBSITE}'}>{'${ORGANIZATION.WEBSITE}'}</option>
              </select>
            </div>
            <div>
              <textarea
                ref={addressFormatTextareaRef}
                value={addressFormat}
                onChange={(e) => setAddressFormat(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#005766] font-mono text-sm"
              />
            </div>
            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 text-sm font-medium text-[#005766] bg-[#005766]/10 rounded-lg hover:bg-[#005766]/20"
            >
              Preview
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreviewModal && createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={() => setShowPreviewModal(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} className="text-gray-500" />
              </button>

              {/* Preview Content */}
              <div className="p-6">
                <div className="whitespace-pre-line text-sm text-gray-900 font-normal">
                  {getPreviewText()}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
        </div>
      </div>

      {/* Sticky Save Button Footer */}
      <div className="sticky bottom-0 bg-gray-50/90 backdrop-blur-md border-t border-gray-200 py-4 px-6 flex justify-start z-10">
        <div className="max-w-4xl w-full flex justify-start">
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-8 py-2.5 text-sm font-semibold text-white bg-[#005766] rounded-xl hover:bg-[#004652] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#005766]/20"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
