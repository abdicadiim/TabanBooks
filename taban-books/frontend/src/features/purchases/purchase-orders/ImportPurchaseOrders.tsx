// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, ChevronDown, Download as DownloadIcon, HelpCircle, Info, Search, X } from "lucide-react";
import { parseImportFile } from "../../sales/utils/importFileParser";
import { purchaseOrdersAPI, vendorsAPI } from "../../../services/api";

const MAP_FIELDS = [
  "Purchase Order#",
  "Date",
  "Vendor Name",
  "Reference#",
  "Expected Delivery Date",
  "Amount",
  "Status",
  "Notes",
  "Terms",
];

const REQUIRED_FIELDS = ["Date", "Vendor Name", "Amount"];

const FIELD_ALIASES: Record<string, string[]> = {
  "Purchase Order#": ["PO Number", "PurchaseOrderNumber", "Order Number"],
  Date: ["Order Date", "PO Date"],
  "Vendor Name": ["Vendor", "VendorName"],
  "Reference#": ["Reference", "Reference Number"],
  "Expected Delivery Date": ["Delivery Date", "ExpectedDate"],
  Amount: ["Total", "PO Amount"],
  Status: ["PO Status"],
  Notes: ["Description", "Memo"],
  Terms: ["Terms & Conditions", "TermsAndConditions"],
};

const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
const normalizeFieldText = (value: any) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const parseAmount = (value: any): number => {
  const parsed = Number.parseFloat(String(value || "").replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatDateForApi = (value: any): string => {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split(/[-/]/);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(raw)) {
    const [d, m, y] = raw.split(/[-/.]/);
    const fullYear = y.length === 2 ? `20${y}` : y;
    return `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
};

const normalizeStatus = (value: any): string => {
  const normalized = normalizeText(value);
  if (!normalized) return "DRAFT";
  if (["draft", "issued", "received", "cancelled", "closed"].includes(normalized)) return normalized.toUpperCase();
  return "DRAFT";
};

const findVendorByName = (vendors: any[], name: string) => {
  const target = normalizeText(name);
  if (!target) return null;
  return vendors.find((vendor: any) => normalizeText(vendor?.displayName || vendor?.name) === target) || null;
};

const buildSequenceGenerator = (startNumber: string) => {
  const match = String(startNumber || "").match(/^(.*?)(\d+)$/);
  if (!match) {
    let counter = 1;
    return () => `PO-${String(counter++).padStart(5, "0")}`;
  }
  const prefix = match[1];
  let current = Number(match[2]);
  const width = match[2].length;
  return () => {
    const next = `${prefix}${String(current).padStart(width, "0")}`;
    current += 1;
    return next;
  };
};

export default function ImportPurchaseOrders() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [autoGenerateOrderNumbers, setAutoGenerateOrderNumbers] = useState(false);
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);

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
    const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeFieldText(header) }));
    const mappings: Record<string, string> = {};
    MAP_FIELDS.forEach((field) => {
      const direct = normalizedHeaders.find((entry) => entry.normalized === normalizeFieldText(field));
      if (direct) {
        mappings[field] = direct.original;
        return;
      }
      for (const alias of FIELD_ALIASES[field] || []) {
        const matched = normalizedHeaders.find((entry) => entry.normalized === normalizeFieldText(alias));
        if (matched) {
          mappings[field] = matched.original;
          return;
        }
      }
    });
    return mappings;
  };

  const getRowValue = (row: Record<string, any>, field: string) => {
    const mappedHeader = fieldMappings[field];
    if (mappedHeader && row[mappedHeader] != null) return String(row[mappedHeader]).trim();
    for (const candidate of [field, ...(FIELD_ALIASES[field] || [])]) {
      const key = Object.keys(row || {}).find((rowKey) => normalizeFieldText(rowKey) === normalizeFieldText(candidate));
      if (key && row[key] != null) return String(row[key]).trim();
    }
    return "";
  };

  const previewSkippedRecords = useMemo(
    () =>
      parsedRows.reduce((acc: { rowNumber: number; reason: string }[], row, index) => {
        const rowNumber = index + 2;
        const poNumber = getRowValue(row, "Purchase Order#");
        const vendorName = getRowValue(row, "Vendor Name");
        const dateRaw = getRowValue(row, "Date");
        const amountRaw = getRowValue(row, "Amount");

        if ((!poNumber && !autoGenerateOrderNumbers) || !vendorName || !dateRaw || !amountRaw) {
          acc.push({ rowNumber, reason: "Missing required value(s)" });
          return acc;
        }
        if (!Number.isFinite(parseAmount(amountRaw))) {
          acc.push({ rowNumber, reason: "Invalid amount" });
          return acc;
        }
        return acc;
      }, []),
    [parsedRows, fieldMappings, autoGenerateOrderNumbers]
  );

  const missingRequired = useMemo(() => REQUIRED_FIELDS.filter((field) => !fieldMappings[field]), [fieldMappings]);
  const unmappedFields = useMemo(() => MAP_FIELDS.filter((field) => !fieldMappings[field]), [fieldMappings]);
  const readyToImportCount = Math.max(parsedRows.length - previewSkippedRecords.length, 0);
  const isPreviewReady = missingRequired.length === 0 && readyToImportCount > 0;
  const filteredEncodings = encodings.filter((encoding) => encoding.toLowerCase().includes(encodingSearch.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target as Node)) {
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetParsedData = () => {
    setImportedFileHeaders([]);
    setParsedRows([]);
    setFieldMappings({});
    setShowReadyDetails(false);
    setShowSkippedDetails(false);
    setShowUnmappedDetails(false);
    setCurrentStep(1);
  };

  const validateAndSetFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return alert("File size exceeds 25 MB limit.");
    const ext = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (![".csv", ".tsv", ".xls", ".xlsx"].includes(ext)) return alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
    setSelectedFile(file);
    resetParsedData();
  };

  const handleNext = async () => {
    if (!selectedFile) return;
    if (currentStep === 1) {
      try {
        const { headers, rows } = await parseImportFile(selectedFile);
        const safeHeaders = Array.isArray(headers) ? headers.filter(Boolean) : [];
        setImportedFileHeaders(safeHeaders);
        setParsedRows(Array.isArray(rows) ? rows : []);
        setFieldMappings((previous) => ({ ...buildAutoMappings(safeHeaders), ...previous }));
        setCurrentStep(2);
      } catch (error: any) {
        alert(error?.message || "Unable to parse file. Please verify file format and try again.");
      }
      return;
    }
    if (currentStep === 2) setCurrentStep(3);
  };

  const handleImport = async () => {
    if (!selectedFile) return alert("Please select a file to import.");
    if (missingRequired.length > 0) return alert(`Please map required fields: ${missingRequired.join(", ")}`);

    setIsImporting(true);
    try {
      const rows = parsedRows.length ? parsedRows : (await parseImportFile(selectedFile)).rows || [];
      const vendorsResponse = await vendorsAPI.getAll({ limit: 1000 }).catch(() => []);
      const vendors = Array.isArray(vendorsResponse)
        ? vendorsResponse
        : (vendorsResponse?.data || vendorsResponse?.vendors || []);

      const nextNumberResponse = await purchaseOrdersAPI.getNextNumber().catch(() => ({ data: { number: "PO-00001" } }));
      const nextNumber = String(nextNumberResponse?.data?.number || nextNumberResponse?.number || "PO-00001");
      const getNextOrderNumber = buildSequenceGenerator(nextNumber);

      let createdCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const rowErrors: string[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowNumber = index + 2;
        try {
          const vendorName = getRowValue(row, "Vendor Name");
          const amountRaw = getRowValue(row, "Amount");
          const dateRaw = getRowValue(row, "Date");
          const rawPoNumber = getRowValue(row, "Purchase Order#");
          if ((!rawPoNumber && !autoGenerateOrderNumbers) || !vendorName || !amountRaw || !dateRaw) {
            skippedCount += 1;
            continue;
          }

          const amount = parseAmount(amountRaw);
          if (!Number.isFinite(amount) || amount < 0) {
            skippedCount += 1;
            continue;
          }

          const vendor = findVendorByName(vendors, vendorName);
          if (!vendor) {
            failedCount += 1;
            rowErrors.push(`Row ${rowNumber}: Vendor "${vendorName}" not found`);
            continue;
          }

          const poNumber = autoGenerateOrderNumbers ? getNextOrderNumber() : rawPoNumber;
          const orderDate = formatDateForApi(dateRaw);
          const deliveryDate = formatDateForApi(getRowValue(row, "Expected Delivery Date") || orderDate);

          const payload: any = {
            date: orderDate,
            purchase_order_number: poNumber,
            reference_number: getRowValue(row, "Reference#"),
            vendor_name: vendor?.displayName || vendor?.name || vendorName,
            vendor_id: vendor?._id || vendor?.id,
            status: normalizeStatus(getRowValue(row, "Status")),
            delivery_date: deliveryDate,
            total: amount,
            sub_total: amount,
            notes: getRowValue(row, "Notes"),
            terms: getRowValue(row, "Terms"),
            items: [
              {
                name: "Imported Item",
                description: getRowValue(row, "Notes") || "Imported purchase order",
                quantity: 1,
                rate: amount,
                amount,
              },
            ],
          };

          const response = await purchaseOrdersAPI.create(payload);
          const success = response?.code === 0 || response?.success || response?.data;
          if (success) createdCount += 1;
          else {
            failedCount += 1;
            rowErrors.push(`Row ${rowNumber}: ${response?.message || "Create failed"}`);
          }
        } catch (error: any) {
          failedCount += 1;
          rowErrors.push(`Row ${rowNumber}: ${error?.message || "Create failed"}`);
        }
      }

      window.dispatchEvent(new Event("purchaseOrdersUpdated"));
      window.dispatchEvent(new Event("storage"));

      const errorSummary = rowErrors.length ? `\n\nErrors:\n${rowErrors.slice(0, 8).join("\n")}${rowErrors.length > 8 ? "\n..." : ""}` : "";
      alert(`Import complete.\nCreated: ${createdCount}\nSkipped: ${skippedCount}\nFailed: ${failedCount}${errorSummary}`);
      navigate("/purchases/purchase-orders");
    } catch (error: any) {
      console.error("Purchase order import failed:", error);
      alert(error?.message || "Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 m-0">{currentStep === 1 ? "Purchase Orders - Select File" : currentStep === 2 ? "Map Fields" : "Preview"}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${currentStep > 1 ? "bg-emerald-500 text-white" : "bg-[#156372] text-white"}`}>{currentStep > 1 ? <Check size={12} /> : "1"}</span><span className="text-sm">Configure</span></div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${currentStep > 2 ? "bg-emerald-500 text-white" : currentStep === 2 ? "bg-[#156372] text-white" : "bg-gray-200 text-gray-600"}`}>{currentStep > 2 ? <Check size={12} /> : "2"}</span><span className="text-sm">Map Fields</span></div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${currentStep === 3 ? "bg-[#3b82f6] text-white" : "bg-gray-200 text-gray-600"}`}>3</span><span className="text-sm">Preview</span></div>
          </div>
        </div>
        <button onClick={() => navigate("/purchases/purchase-orders")} className="p-2 bg-transparent border-none cursor-pointer"><X size={20} className="text-red-600" /></button>
      </div>

      <div className={`p-8 overflow-y-auto flex-1 ${currentStep === 1 ? "max-w-2xl" : "max-w-5xl"} mx-auto w-full`}>
        {currentStep === 1 && (
          <>
            <div className="mb-8">
              <div onDrop={(event) => { event.preventDefault(); setIsDragging(false); validateAndSetFile(event.dataTransfer.files?.[0] || null); }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${isDragging ? "border-[#156372] bg-teal-50" : "border-gray-200 bg-gray-50"}`}>
                <DownloadIcon size={48} className="text-gray-500 mx-auto mb-4" />
                <div className="text-base font-medium text-gray-900 mb-2">Drag and drop file to import</div>
                <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer inline-flex items-center gap-1.5 mt-4" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}>Choose File</button>
                {selectedFile && <div className="mt-4 p-3 bg-teal-50 rounded-md text-sm text-gray-900">Selected: {selectedFile.name}</div>}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xls,.xlsx" onChange={(event) => validateAndSetFile(event.target.files?.[0] || null)} className="hidden" />
            </div>
            <div className="mb-6">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={autoGenerateOrderNumbers} onChange={(event) => setAutoGenerateOrderNumbers(event.target.checked)} />
                Auto-generate Purchase Order numbers
              </label>
            </div>
            <div className="mb-8">
              <label className="flex items-center gap-1.5 mb-3 text-sm font-medium text-gray-900">Character Encoding<HelpCircle size={16} className="text-gray-500" /></label>
              <div ref={encodingDropdownRef} className="relative max-w-[300px]">
                <div onClick={() => { setIsEncodingDropdownOpen(!isEncodingDropdownOpen); if (!isEncodingDropdownOpen) setEncodingSearch(""); }} className="w-full px-3 py-2 text-sm border rounded-md bg-white cursor-pointer flex items-center justify-between"><span>{characterEncoding}</span><ChevronDown size={14} className={`text-gray-500 ${isEncodingDropdownOpen ? "rotate-180" : ""}`} /></div>
                {isEncodingDropdownOpen && <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-hidden flex flex-col z-50"><div className="p-2.5 border-b border-gray-200"><div className="relative"><Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search encoding" value={encodingSearch} onChange={(event) => setEncodingSearch(event.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white" /></div></div><div className="overflow-y-auto max-h-[220px]">{filteredEncodings.map((encoding) => <button key={encoding} type="button" className={`w-full text-left px-3 py-2 text-sm border-none cursor-pointer ${characterEncoding === encoding ? "bg-blue-50 text-blue-700" : "bg-white text-gray-700"} hover:bg-gray-50`} onClick={() => { setCharacterEncoding(encoding); setIsEncodingDropdownOpen(false); setEncodingSearch(""); }}>{encoding}</button>)}</div></div>}
              </div>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-sm text-gray-700">Your Selected File : {selectedFile?.name || "-"}</div>
            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-3 rounded-md flex items-start gap-2"><Info size={16} className="mt-0.5 shrink-0" /><span>The best match to each field has been auto-selected. Review and adjust before importing.</span></div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-800">Purchase Order Details</div>
              <div className="divide-y divide-gray-100">
                {MAP_FIELDS.map((field) => (
                  <div key={field} className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] items-center gap-3 px-4 py-3">
                    <label className="text-sm text-gray-700">{field}{REQUIRED_FIELDS.includes(field) && <span className="text-red-600"> *</span>}</label>
                    <div className="flex items-center gap-2">
                      <select value={fieldMappings[field] || ""} onChange={(event) => setFieldMappings((prev) => ({ ...prev, [field]: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
                      </select>
                      {fieldMappings[field] && <button type="button" className="h-8 w-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" onClick={() => setFieldMappings((prev) => { const next = { ...prev }; delete next[field]; return next; })}><X size={14} className="mx-auto" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            {isPreviewReady ? <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-3 rounded-md flex items-start gap-2"><Info size={16} className="mt-0.5 shrink-0" /><span>All purchase orders in your file are ready to be imported.</span></div> : <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-md flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>Review required field mappings and data issues before importing.</span></div>}
            <div className="border border-gray-200 rounded-md overflow-hidden"><button type="button" onClick={() => setShowReadyDetails((open) => !open)} className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 flex items-center justify-between border-none"><span className="text-sm text-gray-800">Purchase orders ready to import - <strong>{readyToImportCount}</strong></span><span className="text-sm text-blue-600">{showReadyDetails ? "Hide Details" : "View Details"}</span></button>{showReadyDetails && <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">{readyToImportCount > 0 ? "These rows have required values and valid amount format." : "No rows are currently ready for import."}</div>}</div>
            <div className="border border-gray-200 rounded-md overflow-hidden"><button type="button" onClick={() => setShowSkippedDetails((open) => !open)} className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 flex items-center justify-between border-none"><span className="text-sm text-gray-800">No. of Records skipped - <strong>{previewSkippedRecords.length}</strong></span><span className="text-sm text-blue-600">{showSkippedDetails ? "Hide Details" : "View Details"}</span></button>{showSkippedDetails && <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">{previewSkippedRecords.length === 0 ? "No records will be skipped by validation." : <ul className="list-disc pl-5 space-y-1">{previewSkippedRecords.slice(0, 30).map((entry) => <li key={`${entry.rowNumber}-${entry.reason}`}>Row {entry.rowNumber}: {entry.reason}</li>)}</ul>}</div>}</div>
            <div className="border border-gray-200 rounded-md overflow-hidden"><button type="button" onClick={() => setShowUnmappedDetails((open) => !open)} className={`w-full px-4 py-3 text-left bg-white hover:bg-gray-50 flex items-center justify-between border-none ${unmappedFields.length > 0 ? "text-amber-700" : ""}`}><span className="text-sm">Unmapped Fields - <strong>{unmappedFields.length}</strong></span><span className="text-sm text-blue-600">{showUnmappedDetails ? "Hide Details" : "View Details"}</span></button>{showUnmappedDetails && <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">{unmappedFields.length === 0 ? "All fields are mapped." : <ul className="list-disc pl-5 space-y-1">{unmappedFields.map((field) => <li key={field}>{field}</li>)}</ul>}</div>}</div>
          </div>
        )}
      </div>

      <div className="px-8 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
        <div>{currentStep > 1 && <button type="button" onClick={() => setCurrentStep((step) => Math.max(1, step - 1))} className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50">Previous</button>}</div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/purchases/purchase-orders")} className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          {currentStep < 3 ? <button type="button" onClick={handleNext} disabled={!selectedFile} className={`px-4 py-2 text-sm rounded-md text-white border-none ${selectedFile ? "bg-[#156372] hover:bg-[#0f4f5b]" : "bg-gray-300 cursor-not-allowed"}`}>Next</button> : <button type="button" onClick={handleImport} disabled={isImporting || !isPreviewReady} className={`px-4 py-2 text-sm rounded-md text-white border-none ${isImporting || !isPreviewReady ? "bg-gray-300 cursor-not-allowed" : "bg-[#156372] hover:bg-[#0f4f5b]"}`}>{isImporting ? "Importing..." : "Import"}</button>}
        </div>
      </div>
    </div>
  );
}
