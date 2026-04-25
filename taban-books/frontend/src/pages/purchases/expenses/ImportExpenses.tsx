// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Download as DownloadIcon,
  HelpCircle,
  Search,
  AlertTriangle,
  Info,
  Check,
  ChevronDown,
} from "lucide-react";
import { parseImportFile } from "../../sales/utils/importFileParser";
import {
  expensesAPI,
  vendorsAPI,
  customersAPI,
  chartOfAccountsAPI,
  bankAccountsAPI,
} from "../../../services/api";

const EXPENSE_MAP_SECTIONS = [
  {
    title: "Expense Details",
    fields: [
      "Expense Date",
      "Expense Account",
      "Amount",
      "Paid Through",
      "Vendor Name",
      "Customer Name",
      "Reference#",
      "Description",
      "Currency Code",
      "Is Billable",
      "Status",
    ],
  },
];

const REQUIRED_FIELDS = ["Expense Date", "Expense Account", "Amount", "Paid Through"];
const ALL_EXPENSE_MAP_FIELDS = EXPENSE_MAP_SECTIONS.flatMap((section) => section.fields);

const FIELD_ALIASES: Record<string, string[]> = {
  "Expense Date": ["Date", "ExpenseDate", "Expense_Date"],
  "Expense Account": ["Account", "Expense Category", "Category", "Account Name"],
  Amount: ["Total", "Expense Amount", "Amount Spent"],
  "Paid Through": ["PaidThrough", "Paid Through Account", "Paid Through Account Name", "Payment Account"],
  "Vendor Name": ["Vendor", "VendorName", "Vendor Name"],
  "Customer Name": ["Customer", "CustomerName", "Customer Name"],
  "Reference#": ["Reference", "Reference Number", "Reference #", "Ref#", "Ref No"],
  Description: ["Notes", "Memo", "Expense Notes"],
  "Currency Code": ["Currency", "CurrencyCode", "Currency Code"],
  "Is Billable": ["Billable", "Billable?", "Is Billable"],
  Status: ["Expense Status", "Bill Status"],
};

const SUPPORTED_STATUSES = new Set(["unbilled", "invoiced", "reimbursed", "non-billable", "billable"]);
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

const normalizeFieldText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
const normalizeMatchKey = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toResponseArray = (response: any) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.accounts)) return response.data.accounts;
  if (Array.isArray(response?.data?.contacts)) return response.data.contacts;
  if (Array.isArray(response?.vendors)) return response.vendors;
  if (Array.isArray(response?.customers)) return response.customers;
  if (Array.isArray(response?.contacts)) return response.contacts;
  if (Array.isArray(response?.accounts)) return response.accounts;
  return [];
};

const toBoolean = (value: any): boolean | undefined => {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  if (["true", "yes", "1", "y", "billable"].includes(normalized)) return true;
  if (["false", "no", "0", "n", "non-billable", "nonbillable"].includes(normalized)) return false;
  return undefined;
};

const parseAmount = (value: any): number => {
  const cleaned = String(value || "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatDateForApi = (rawValue: any): string => {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split(/[-/]/);
    const month = Number.parseInt(m, 10);
    const day = Number.parseInt(d, 10);
    if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return "";
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(raw)) {
    const [first, second, third] = raw.split(/[-/.]/);
    const year = third.length === 2 ? `20${third}` : third;
    const firstNum = Number.parseInt(first, 10);
    const secondNum = Number.parseInt(second, 10);
    if (!Number.isFinite(firstNum) || !Number.isFinite(secondNum)) return "";

    // Handle both DD/MM/YYYY and MM/DD/YYYY formats.
    let dayNum = firstNum;
    let monthNum = secondNum;
    if (firstNum <= 12 && secondNum > 12) {
      dayNum = secondNum;
      monthNum = firstNum;
    }

    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return "";
    const day = String(dayNum).padStart(2, "0");
    const month = String(monthNum).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    // Excel serial date support.
    const serial = Number.parseFloat(raw);
    if (Number.isFinite(serial) && serial > 0) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(serial));
      return excelEpoch.toISOString().slice(0, 10);
    }
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeStatus = (value: any): string | undefined => {
  const normalized = normalizeText(value).replace(/\s+/g, "-");
  if (!normalized) return undefined;
  if (SUPPORTED_STATUSES.has(normalized)) return normalized;
  if (normalized === "nonbillable") return "non-billable";
  return undefined;
};

const getEntityId = (entity: any) => entity?._id || entity?.id || null;

const getAccountName = (account: any) =>
  account?.accountName || account?.account_name || account?.name || account?.displayName || "";

const getPersonName = (person: any) => person?.displayName || person?.name || person?.companyName || "";

export default function ImportExpenses() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isDragging, setIsDragging] = useState(false);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encodingDropdownRef = useRef<HTMLDivElement>(null);

  const encodings = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
  ];

  const buildAutoMappings = (headers: string[]) => {
    const normalizedHeaders = headers.map((header) => ({
      original: header,
      normalized: normalizeFieldText(header),
    }));

    const nextMappings: Record<string, string> = {};

    ALL_EXPENSE_MAP_FIELDS.forEach((field) => {
      const normalizedField = normalizeFieldText(field);
      const directMatch = normalizedHeaders.find((entry) => entry.normalized === normalizedField);
      if (directMatch) {
        nextMappings[field] = directMatch.original;
        return;
      }

      const aliases = FIELD_ALIASES[field] || [];
      for (const alias of aliases) {
        const normalizedAlias = normalizeFieldText(alias);
        const aliasMatch = normalizedHeaders.find((entry) => entry.normalized === normalizedAlias);
        if (aliasMatch) {
          nextMappings[field] = aliasMatch.original;
          return;
        }
      }
    });

    return nextMappings;
  };

  const getRowValue = (row: Record<string, any>, field: string) => {
    const mappedHeader = fieldMappings[field];
    if (mappedHeader && row[mappedHeader] != null) {
      return String(row[mappedHeader]).trim();
    }

    const candidateNames = [field, ...(FIELD_ALIASES[field] || [])];
    const rowKeys = Object.keys(row || {});

    for (const candidate of candidateNames) {
      const normalizedCandidate = normalizeFieldText(candidate);
      const matchedKey = rowKeys.find((key) => normalizeFieldText(key) === normalizedCandidate);
      if (matchedKey && row[matchedKey] != null) {
        return String(row[matchedKey]).trim();
      }
    }

    return "";
  };

  const findByName = (items: any[], value: string, getName: (item: any) => string) => {
    const normalized = normalizeText(value);
    const normalizedKey = normalizeMatchKey(value);
    if (!normalized) return null;

    return (
      items.find((item) => {
        const itemName = getName(item);
        const itemNameNormalized = normalizeText(itemName);
        const itemNameKey = normalizeMatchKey(itemName);
        return (itemNameNormalized && itemNameNormalized === normalized) || (itemNameKey && itemNameKey === normalizedKey);
      }) || null
    );
  };

  const previewSkippedRecords = useMemo(() => {
    return parsedRows.reduce((acc: { rowNumber: number; reason: string }[], row, index) => {
      const rowNumber = index + 2;
      const expenseDate = getRowValue(row, "Expense Date");
      const expenseAccount = getRowValue(row, "Expense Account");
      const amountRaw = getRowValue(row, "Amount");
      const paidThrough = getRowValue(row, "Paid Through");

      if (!expenseDate || !expenseAccount || !amountRaw || !paidThrough) {
        acc.push({ rowNumber, reason: "Missing required value(s)" });
        return acc;
      }

      if (!formatDateForApi(expenseDate)) {
        acc.push({ rowNumber, reason: "Invalid date format" });
        return acc;
      }

      if (!Number.isFinite(parseAmount(amountRaw))) {
        acc.push({ rowNumber, reason: "Invalid amount" });
        return acc;
      }

      return acc;
    }, []);
  }, [parsedRows, fieldMappings]);

  const missingRequired = useMemo(
    () => REQUIRED_FIELDS.filter((field) => !fieldMappings[field]),
    [fieldMappings]
  );
  const unmappedFields = useMemo(
    () => ALL_EXPENSE_MAP_FIELDS.filter((field) => !fieldMappings[field]),
    [fieldMappings]
  );
  const parsedRowsCount = parsedRows.length;
  const skippedRecordsCount = previewSkippedRecords.length;
  const readyToImportCount = Math.max(parsedRowsCount - skippedRecordsCount, 0);
  const isPreviewReady = missingRequired.length === 0 && readyToImportCount > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target as Node)) {
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      }
    };

    if (isEncodingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen]);

  const resetParsedData = () => {
    setImportedFileHeaders([]);
    setParsedRows([]);
    setFieldMappings({});
    setShowReadyDetails(false);
    setShowSkippedDetails(false);
    setShowUnmappedDetails(false);
    setCurrentStep(1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25 MB limit.");
      return;
    }

    const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
    const fileExtension = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
      return;
    }

    setSelectedFile(file);
    resetParsedData();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25 MB limit.");
      return;
    }

    const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
    const fileExtension = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
      return;
    }

    setSelectedFile(file);
    resetParsedData();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleNext = async () => {
    if (!selectedFile) return;

    if (currentStep === 1) {
      try {
        const { headers, rows } = await parseImportFile(selectedFile as File);
        const safeHeaders = Array.isArray(headers) ? headers.filter(Boolean) : [];
        const safeRows = Array.isArray(rows) ? rows : [];

        setImportedFileHeaders(safeHeaders);
        setParsedRows(safeRows);
        setFieldMappings((prev) => ({
          ...buildAutoMappings(safeHeaders),
          ...prev,
        }));
        setCurrentStep(2);
      } catch (error) {
        console.error("Failed to parse import file:", error);
        alert("Unable to parse file. Please verify the format and try again.");
      }
      return;
    }

    if (currentStep === 2) {
      setShowReadyDetails(false);
      setShowSkippedDetails(false);
      setShowUnmappedDetails(false);
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("Please select a file to import.");
      return;
    }

    if (missingRequired.length > 0) {
      alert(`Please map required fields: ${missingRequired.join(", ")}`);
      return;
    }

    setIsImporting(true);
    try {
      const rowsToImport = parsedRows.length ? parsedRows : (await parseImportFile(selectedFile)).rows || [];
      if (!rowsToImport.length) {
        alert("No rows found in the selected file.");
        return;
      }

      const [vendorsResponse, customersResponse, accountsResponse, bankAccountsResponse] = await Promise.all([
        vendorsAPI.getAll({ limit: 1000 }).catch(() => []),
        customersAPI.getAll({ limit: 1000 }).catch(() => []),
        chartOfAccountsAPI.getAccounts({ limit: 1000 }).catch(() => []),
        bankAccountsAPI.getAll({ limit: 1000 }).catch(() => []),
      ]);

      const vendors = toResponseArray(vendorsResponse);
      const customers = toResponseArray(customersResponse);
      const chartAccounts = toResponseArray(accountsResponse);
      const bankAccounts = toResponseArray(bankAccountsResponse);

      const paidThroughCandidates = [...bankAccounts, ...chartAccounts];

      let createdCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      const rowErrors: string[] = [];

      for (let index = 0; index < rowsToImport.length; index += 1) {
        const row = rowsToImport[index];
        const rowNumber = index + 2;

        try {
          const expenseDateRaw = getRowValue(row, "Expense Date");
          const expenseAccountName = getRowValue(row, "Expense Account");
          const amountRaw = getRowValue(row, "Amount");
          const paidThroughName = getRowValue(row, "Paid Through");

          if (!expenseDateRaw || !expenseAccountName || !amountRaw || !paidThroughName) {
            skippedCount += 1;
            continue;
          }

          const parsedDate = formatDateForApi(expenseDateRaw);
          const amount = parseAmount(amountRaw);
          if (!parsedDate || !Number.isFinite(amount)) {
            skippedCount += 1;
            continue;
          }

          const expenseAccount = findByName(chartAccounts, expenseAccountName, getAccountName);
          const paidThroughAccount = findByName(paidThroughCandidates, paidThroughName, getAccountName);
          const vendorName = getRowValue(row, "Vendor Name");
          const customerName = getRowValue(row, "Customer Name");
          const vendor = findByName(vendors, vendorName, getPersonName);
          const customer = findByName(customers, customerName, getPersonName);
          const isBillable = toBoolean(getRowValue(row, "Is Billable"));
          const explicitStatus = normalizeStatus(getRowValue(row, "Status"));
          const currencyCode = String(getRowValue(row, "Currency Code") || "")
            .trim()
            .toUpperCase();

          const payload: any = {
            date: parsedDate,
            amount,
            total: amount,
            sub_total: amount,
            account_name: expenseAccountName,
            paid_through_account_name: paidThroughName,
            reference_number: getRowValue(row, "Reference#"),
            description: getRowValue(row, "Description"),
          };

          const accountId = getEntityId(expenseAccount);
          const paidThroughId = getEntityId(paidThroughAccount);
          if (accountId) payload.account_id = accountId;
          if (paidThroughId) payload.paid_through_account_id = paidThroughId;
          if (expenseAccount) payload.account_name = getAccountName(expenseAccount) || expenseAccountName;
          if (paidThroughAccount) payload.paid_through_account_name = getAccountName(paidThroughAccount) || paidThroughName;

          const vendorId = getEntityId(vendor);
          const customerId = getEntityId(customer);
          if (vendorId) payload.vendor_id = vendorId;
          if (customerId) payload.customer_id = customerId;
          if (!vendorId && vendorName) payload.vendor_name = vendorName;
          if (!customerId && customerName) payload.customer_name = customerName;

          if (isBillable !== undefined) payload.is_billable = isBillable;
          if (explicitStatus) {
            payload.status = explicitStatus;
          } else if (isBillable === true && (customerId || customerName)) {
            payload.status = "unbilled";
          } else if (isBillable === false) {
            payload.status = "non-billable";
          }

          if (CURRENCY_CODE_REGEX.test(currencyCode)) {
            payload.currency_code = currencyCode;
          }

          const response = await expensesAPI.create(payload);
          const success = response?.code === 0 || response?.success || !!response?.expense || !!response?.data;
          if (success) {
            createdCount += 1;
          } else {
            failedCount += 1;
            rowErrors.push(`Row ${rowNumber}: ${response?.message || "Create failed"}`);
          }
        } catch (rowError: any) {
          failedCount += 1;
          rowErrors.push(`Row ${rowNumber}: ${rowError?.message || "Create failed"}`);
          console.error(`Expense import row ${rowNumber} failed:`, rowError);
        }
      }

      window.dispatchEvent(new Event("expensesUpdated"));
      window.dispatchEvent(new Event("storage"));

      const errorSummary =
        rowErrors.length > 0 ? `\n\nErrors:\n${rowErrors.slice(0, 8).join("\n")}${rowErrors.length > 8 ? "\n..." : ""}` : "";
      alert(
        `Import complete.\nCreated: ${createdCount}\nSkipped: ${skippedCount}\nFailed: ${failedCount}${errorSummary}`
      );

      if (createdCount > 0) {
        navigate("/purchases/expenses");
      }
    } catch (error: any) {
      console.error("Expense import failed:", error);
      alert(error?.message || "Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleFile = (type: "csv" | "xls") => {
    const headers = [
      "Expense Date",
      "Expense Account",
      "Amount",
      "Paid Through",
      "Vendor Name",
      "Customer Name",
      "Reference#",
      "Description",
      "Currency Code",
      "Is Billable",
      "Status",
    ];

    const sampleDataRow = [
      "2026-02-20",
      "Office Supplies",
      "125.00",
      "Cash",
      "Sample Vendor",
      "Sample Customer",
      "EXP-0001",
      "Printer paper and pens",
      "USD",
      "Yes",
      "unbilled",
    ];

    const data = [headers, sampleDataRow];

    let content = "";
    let mimeType = "";

    if (type === "csv") {
      content = data
        .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      content = data.map((row) => row.join("\t")).join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.download = `expense_import_sample.${type === "csv" ? "csv" : "xls"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEncodings = encodings.filter((encoding) =>
    encoding.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  const stepTitle = currentStep === 1 ? "Expenses - Select File" : currentStep === 2 ? "Map Fields" : "Preview";

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 m-0">{stepTitle}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  currentStep > 1 ? "bg-emerald-500 text-white" : "bg-[#156372] text-white"
                }`}
              >
                {currentStep > 1 ? <Check size={12} /> : "1"}
              </span>
              <span className="text-sm text-gray-900">Configure</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  currentStep > 2
                    ? "bg-emerald-500 text-white"
                    : currentStep === 2
                    ? "bg-[#156372] text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {currentStep > 2 ? <Check size={12} /> : "2"}
              </span>
              <span className="text-sm text-gray-900">Map Fields</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  currentStep === 3 ? "bg-[#3b82f6] text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                3
              </span>
              <span className="text-sm text-gray-900">Preview</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/purchases/expenses")}
          className="p-2 bg-transparent border-none cursor-pointer flex items-center justify-center"
        >
          <X size={20} className="text-red-600" strokeWidth={2} />
        </button>
      </div>

      <div className={`p-8 overflow-y-auto flex-1 ${currentStep === 1 ? "max-w-2xl" : "max-w-5xl"} mx-auto w-full`}>
        {currentStep === 1 && (
          <>
            <div className="mb-8">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                  isDragging ? "border-[#156372] bg-teal-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <DownloadIcon size={48} className="text-gray-500 mx-auto mb-4" />
                <div className="text-base font-medium text-gray-900 mb-2">Drag and drop file to import</div>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer inline-flex items-center gap-1.5 mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose File
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    className="px-2 py-2 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer inline-flex items-center gap-1.5 mt-4 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      resetParsedData();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
                <div className="mt-3 text-xs text-gray-500">Maximum File Size: 25 MB - File Format: CSV or TSV or XLS</div>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-teal-50 rounded-md text-sm text-gray-900">Selected: {selectedFile.name}</div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="mb-8 text-sm text-gray-900">
              Download a{" "}
              <button
                className="text-teal-700 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  downloadSampleFile("csv");
                }}
              >
                sample csv file
              </button>{" "}
              or{" "}
              <button
                className="text-teal-700 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  downloadSampleFile("xls");
                }}
              >
                sample xls file
              </button>{" "}
              and compare it to your import file to ensure your file is ready for import.
            </div>

            <div className="mb-8">
              <label className="flex items-center gap-1.5 mb-3 text-sm font-medium text-gray-900">
                Character Encoding
                <HelpCircle size={16} className="text-gray-500" />
              </label>
              <div
                ref={encodingDropdownRef}
                className="relative max-w-[300px]"
                style={{ zIndex: isEncodingDropdownOpen ? 2000 : "auto" }}
              >
                <div
                  onClick={() => {
                    setIsEncodingDropdownOpen(!isEncodingDropdownOpen);
                    if (!isEncodingDropdownOpen) setEncodingSearch("");
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-white cursor-pointer flex items-center justify-between"
                  style={{
                    borderColor: isEncodingDropdownOpen ? "#156372" : "#e5e7eb",
                    borderWidth: isEncodingDropdownOpen ? "2px" : "1px",
                    boxShadow: isEncodingDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
                  }}
                >
                  <span>{characterEncoding}</span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-500 transition-transform ${isEncodingDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {isEncodingDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                    style={{ zIndex: 2000 }}
                  >
                    <div className="p-2.5 border-b border-gray-200 bg-gray-50">
                      <div className="relative">
                        <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search encoding"
                          value={encodingSearch}
                          onChange={(e) => setEncodingSearch(e.target.value)}
                          autoFocus
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[220px]">
                      {filteredEncodings.map((encoding) => (
                        <button
                          key={encoding}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm border-none cursor-pointer ${
                            characterEncoding === encoding ? "bg-blue-50 text-blue-700" : "bg-white text-gray-700"
                          } hover:bg-gray-50`}
                          onClick={() => {
                            setCharacterEncoding(encoding);
                            setIsEncodingDropdownOpen(false);
                            setEncodingSearch("");
                          }}
                        >
                          {encoding}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-sm text-gray-700">Your Selected File : {selectedFile?.name || "-"}</div>

            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-3 rounded-md flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>The best match to each field has been auto-selected. Review and adjust before importing.</span>
            </div>

            {EXPENSE_MAP_SECTIONS.map((section) => (
              <div key={section.title} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-800">
                  {section.title}
                </div>
                <div className="divide-y divide-gray-100">
                  {section.fields.map((field) => (
                    <div key={field} className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] items-center gap-3 px-4 py-3">
                      <label className="text-sm text-gray-700">
                        {field}
                        {REQUIRED_FIELDS.includes(field) && <span className="text-red-600"> *</span>}
                      </label>

                      <div className="flex items-center gap-2">
                        <select
                          value={fieldMappings[field] || ""}
                          onChange={(event) =>
                            setFieldMappings((prev) => ({
                              ...prev,
                              [field]: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
                        >
                          <option value="">Select</option>
                          {importedFileHeaders.map((header) => (
                            <option key={`${field}-${header}`} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        {fieldMappings[field] && (
                          <button
                            type="button"
                            className="h-8 w-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            onClick={() =>
                              setFieldMappings((prev) => {
                                const next = { ...prev };
                                delete next[field];
                                return next;
                              })
                            }
                            title="Clear mapping"
                          >
                            <X size={14} className="mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            {isPreviewReady ? (
              <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-3 rounded-md flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>All expenses in your file are ready to be imported.</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-md flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>Review required field mappings and data issues before importing.</span>
              </div>
            )}

            <div className="border border-gray-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReadyDetails((open) => !open)}
                className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 flex items-center justify-between border-none"
              >
                <span className="text-sm text-gray-800">
                  Expenses that are ready to be imported - <strong>{readyToImportCount}</strong>
                </span>
                <span className="text-sm text-blue-600">{showReadyDetails ? "Hide Details" : "View Details"}</span>
              </button>
              {showReadyDetails && (
                <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
                  {readyToImportCount > 0
                    ? "These rows have required values and valid amount/date format."
                    : "No rows are currently ready for import."}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSkippedDetails((open) => !open)}
                className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 flex items-center justify-between border-none"
              >
                <span className="text-sm text-gray-800">
                  No. of Records skipped - <strong>{skippedRecordsCount}</strong>
                </span>
                <span className="text-sm text-blue-600">{showSkippedDetails ? "Hide Details" : "View Details"}</span>
              </button>
              {showSkippedDetails && (
                <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
                  {previewSkippedRecords.length === 0 ? (
                    <span>No records will be skipped by validation.</span>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      {previewSkippedRecords.slice(0, 30).map((entry) => (
                        <li key={`${entry.rowNumber}-${entry.reason}`}>Row {entry.rowNumber}: {entry.reason}</li>
                      ))}
                      {previewSkippedRecords.length > 30 && <li>More rows skipped... ({previewSkippedRecords.length - 30} more)</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowUnmappedDetails((open) => !open)}
                className={`w-full px-4 py-3 text-left bg-white hover:bg-gray-50 flex items-center justify-between border-none ${
                  unmappedFields.length > 0 ? "text-amber-700" : ""
                }`}
              >
                <span className="text-sm">
                  Unmapped Fields - <strong>{unmappedFields.length}</strong>
                </span>
                <span className="text-sm text-blue-600">{showUnmappedDetails ? "Hide Details" : "View Details"}</span>
              </button>
              {showUnmappedDetails && (
                <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
                  {unmappedFields.length === 0 ? (
                    <span>All fields are mapped.</span>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      {unmappedFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-3 rounded-md flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>Click Previous to adjust mappings, or click Import to write these expenses to the database.</span>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={saveSelections}
                onChange={(e) => setSaveSelections(e.target.checked)}
              />
              Save these selections for use during future imports.
            </label>
          </div>
        )}
      </div>

      <div className="px-8 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/purchases/expenses")}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedFile}
              className={`px-4 py-2 text-sm rounded-md text-white border-none ${
                selectedFile ? "bg-[#156372] hover:bg-[#0f4f5b]" : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || !isPreviewReady}
              className={`px-4 py-2 text-sm rounded-md text-white border-none ${
                isImporting || !isPreviewReady
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#156372] hover:bg-[#0f4f5b]"
              }`}
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
