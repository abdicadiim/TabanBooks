// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  X,
  HelpCircle,
  Download as DownloadIcon,
  Search,
  ChevronDown,
  AlertTriangle,
  Info,
  Check
} from "lucide-react";
import { parseImportFile } from "../../sales/utils/importFileParser";
import { vendorsAPI } from "../../../services/api";

export default function ImportVendors() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const importType = searchParams.get("type"); // "vendors" or "contacts"

  const [showSelectionModal, setShowSelectionModal] = useState(!importType);
  const [selectedType, setSelectedType] = useState(importType || "vendors");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [parsedRowsCount, setParsedRowsCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState("skip");
  const [characterEncoding, setCharacterEncoding] = useState("UTF-8 (Unicode)");
  const [isDragging, setIsDragging] = useState(false);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const fileInputRef = useRef(null);
  const encodingDropdownRef = useRef(null);

  const encodings = [
    "UTF-8 (Unicode)",
    "UTF-16 (Unicode)",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-9 (Turkish)",
    "GB2312 (Simplified Chinese)",
    "Big5 (Traditional Chinese)",
  ];

  const vendorMapSections = [
    {
      title: "Vendor Details",
      fields: [
        "Display Name",
        "Company Name",
        "Salutation",
        "First Name",
        "Last Name",
        "EmailID",
        "Phone",
        "MobilePhone",
        "Currency Code",
        "Payment Terms",
        "Website",
        "Facebook",
        "Twitter",
        "Notes",
        "Owner Name",
        "Is Tracked For MOSS",
        "Taxable",
        "CustomField Value1",
        "CustomField Value2",
        "CustomField Value3",
        "CustomField Value4",
        "CustomField Value5",
        "CustomField Value6",
        "CustomField Value7",
        "CustomField Value8",
        "CustomField Value9",
        "CustomField Value10",
      ],
    },
    {
      title: "Billing Address",
      fields: [
        "Billing Attention",
        "Billing Address",
        "Billing Street2",
        "Billing City",
        "Billing State",
        "Billing Country",
        "Billing Code",
        "Billing Phone",
        "Billing Fax",
      ],
    },
    {
      title: "Shipping Address",
      fields: [
        "Shipping Attention",
        "Shipping Address",
        "Shipping Street2",
        "Shipping City",
        "Shipping State",
        "Shipping Country",
        "Shipping Code",
        "Shipping Phone",
        "Shipping Fax",
      ],
    },
    {
      title: "Tax Details",
      fields: ["Tax Name", "Tax Percentage", "Tax Type"],
    },
    {
      title: "Item Details",
      fields: ["Price List"],
    },
  ];

  const allVendorMapFields = vendorMapSections.flatMap((section) => section.fields);

  const normalizeFieldText = (value: string) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const fieldAliases: Record<string, string[]> = {
    EmailID: ["Email ID", "Email", "E-mail", "Email Address"],
    MobilePhone: ["Mobile Phone", "Mobile", "Cell Phone"],
    Phone: ["Work Phone", "Phone Number", "Telephone"],
    "Currency Code": ["Currency", "CurrencyCode", "Currency Code"],
    "Billing Code": ["Billing Zip", "Billing Zip Code", "Billing Postal Code"],
    "Shipping Code": ["Shipping Zip", "Shipping Zip Code", "Shipping Postal Code"],
    Taxable: ["Taxable", "Is Taxable"],
    "Is Tracked For MOSS": ["Track For MOSS", "Tracked For MOSS", "Is Tracked For MOSS"],
  };

  const buildAutoMappings = (headers: string[]) => {
    const normalizedHeaders = headers.map((header) => ({
      original: header,
      normalized: normalizeFieldText(header),
    }));

    const nextMappings: Record<string, string> = {};

    allVendorMapFields.forEach((field) => {
      const normalizedField = normalizeFieldText(field);
      const directMatch = normalizedHeaders.find((entry) => entry.normalized === normalizedField);
      if (directMatch) {
        nextMappings[field] = directMatch.original;
        return;
      }

      const aliases = fieldAliases[field] || [];
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

  const normalizeText = (value: any) => String(value || "").trim().toLowerCase();

  const getResponseArray = (response: any) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data?.vendors)) return response.data.vendors;
    return [];
  };

  const getRowValue = (row: Record<string, any>, field: string) => {
    const mappedHeader = fieldMappings[field];
    if (mappedHeader && row[mappedHeader] != null) {
      return String(row[mappedHeader]).trim();
    }

    const candidateNames = [field, ...(fieldAliases[field] || [])];
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

  const getVendorId = (vendor: any) => vendor?._id || vendor?.id || null;

  const findDuplicateVendor = (existingVendors: any[], draftVendor: any) => {
    const draftDisplayName = normalizeText(draftVendor?.displayName || draftVendor?.name);
    const draftEmail = normalizeText(draftVendor?.email);
    const draftCompany = normalizeText(draftVendor?.companyName);

    if (!draftDisplayName && !draftEmail && !draftCompany) return null;

    return existingVendors.find((existing) => {
      const existingDisplayName = normalizeText(existing?.displayName || existing?.name);
      const existingEmail = normalizeText(existing?.email);
      const existingCompany = normalizeText(existing?.companyName);

      if (draftDisplayName && existingDisplayName && draftDisplayName === existingDisplayName) return true;
      if (draftEmail && existingEmail && draftEmail === existingEmail) return true;
      if (draftCompany && existingCompany && draftCompany === existingCompany) return true;
      return false;
    }) || null;
  };

  // Close encoding dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(event.target)) {
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

  const handleSelectionContinue = () => {
    setShowSelectionModal(false);
    setSearchParams({ type: selectedType });
  };

  const handleSelectionCancel = () => {
    navigate("/purchases/vendors");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (25 MB)
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25 MB limit.");
        return;
      }
      // Validate file type
      const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
        return;
      }
      setSelectedFile(file);
      setImportedFileHeaders([]);
      setFieldMappings({});
      setParsedRowsCount(0);
      setShowReadyDetails(false);
      setShowSkippedDetails(false);
      setShowUnmappedDetails(false);
      setCurrentStep(1);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert("File size exceeds 25 MB limit.");
        return;
      }
      const validExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        alert("Invalid file format. Please select a CSV, TSV, or XLS file.");
        return;
      }
      setSelectedFile(file);
      setImportedFileHeaders([]);
      setFieldMappings({});
      setParsedRowsCount(0);
      setShowReadyDetails(false);
      setShowSkippedDetails(false);
      setShowUnmappedDetails(false);
      setCurrentStep(1);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleNext = async () => {
    if (!selectedFile) return;

    if (currentStep === 1) {
      try {
        const { headers, rows } = await parseImportFile(selectedFile as File);
        const safeHeaders = Array.isArray(headers) ? headers.filter(Boolean) : [];
        setImportedFileHeaders(safeHeaders);
        setParsedRowsCount(Array.isArray(rows) ? rows.length : 0);
        setFieldMappings((prev) => ({
          ...buildAutoMappings(safeHeaders),
          ...prev,
        }));
      } catch (error) {
        console.error("Failed to parse import file headers:", error);
      }
      setCurrentStep(2);
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
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("Please select a file to import.");
      return;
    }

    if (selectedType !== "vendors") {
      alert("Import for vendor contact persons is not available yet.");
      return;
    }

    const toBoolean = (value: string) => {
      const normalized = normalizeText(value);
      return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y";
    };

    const buildVendorPayload = (row: Record<string, any>) => {
      const firstName = getRowValue(row, "First Name");
      const lastName = getRowValue(row, "Last Name");
      const companyName = getRowValue(row, "Company Name");
      const displayName =
        getRowValue(row, "Display Name") ||
        `${firstName} ${lastName}`.trim() ||
        companyName ||
        "Imported Vendor";

      const customFields: Record<string, any> = {
        customFieldValue1: getRowValue(row, "CustomField Value1"),
        customFieldValue2: getRowValue(row, "CustomField Value2"),
        customFieldValue3: getRowValue(row, "CustomField Value3"),
        customFieldValue4: getRowValue(row, "CustomField Value4"),
        customFieldValue5: getRowValue(row, "CustomField Value5"),
        customFieldValue6: getRowValue(row, "CustomField Value6"),
        customFieldValue7: getRowValue(row, "CustomField Value7"),
        customFieldValue8: getRowValue(row, "CustomField Value8"),
        customFieldValue9: getRowValue(row, "CustomField Value9"),
        customFieldValue10: getRowValue(row, "CustomField Value10"),
        isTrackedForMoss: toBoolean(getRowValue(row, "Is Tracked For MOSS")),
        taxable: toBoolean(getRowValue(row, "Taxable")),
        taxName: getRowValue(row, "Tax Name"),
        taxType: getRowValue(row, "Tax Type"),
      };

      Object.keys(customFields).forEach((key) => {
        const value = customFields[key];
        if (value === "" || value === null || value === undefined) {
          delete customFields[key];
        }
      });

      const taxPercentage = getRowValue(row, "Tax Percentage");

      return {
        vendorType: companyName ? "business" : "individual",
        salutation: getRowValue(row, "Salutation"),
        firstName,
        lastName,
        displayName,
        name: displayName,
        companyName,
        email: getRowValue(row, "EmailID"),
        workPhone: getRowValue(row, "Phone"),
        mobile: getRowValue(row, "MobilePhone"),
        websiteUrl: getRowValue(row, "Website"),
        facebook: getRowValue(row, "Facebook"),
        xHandle: getRowValue(row, "Twitter"),
        currency: getRowValue(row, "Currency Code") || "USD",
        paymentTerms: getRowValue(row, "Payment Terms"),
        vendorOwner: getRowValue(row, "Owner Name"),
        taxRate: taxPercentage,
        notes: getRowValue(row, "Notes"),
        status: "active",
        billingAddress: {
          attention: getRowValue(row, "Billing Attention"),
          street1: getRowValue(row, "Billing Address"),
          street2: getRowValue(row, "Billing Street2"),
          city: getRowValue(row, "Billing City"),
          state: getRowValue(row, "Billing State"),
          country: getRowValue(row, "Billing Country"),
          zipCode: getRowValue(row, "Billing Code"),
          phone: getRowValue(row, "Billing Phone"),
          fax: getRowValue(row, "Billing Fax"),
        },
        shippingAddress: {
          attention: getRowValue(row, "Shipping Attention"),
          street1: getRowValue(row, "Shipping Address"),
          street2: getRowValue(row, "Shipping Street2"),
          city: getRowValue(row, "Shipping City"),
          state: getRowValue(row, "Shipping State"),
          country: getRowValue(row, "Shipping Country"),
          zipCode: getRowValue(row, "Shipping Code"),
          phone: getRowValue(row, "Shipping Phone"),
          fax: getRowValue(row, "Shipping Fax"),
        },
        customFields,
      };
    };

    setIsImporting(true);
    try {
      const { rows } = await parseImportFile(selectedFile as File);
      const fileRows = Array.isArray(rows) ? rows : [];

      if (!fileRows.length) {
        alert("No rows found in the selected file.");
        return;
      }

      const existingResponse = await vendorsAPI.getAll({ limit: 1000 });
      const existingVendors = getResponseArray(existingResponse);

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const row of fileRows) {
        try {
          const vendorPayload = buildVendorPayload(row);
          const duplicateVendor = findDuplicateVendor(existingVendors, vendorPayload);

          if (duplicateVendor && duplicateHandling === "skip") {
            skippedCount += 1;
            continue;
          }

          if (duplicateVendor && duplicateHandling === "overwrite") {
            const duplicateId = getVendorId(duplicateVendor);
            if (!duplicateId) {
              skippedCount += 1;
              continue;
            }
            const updatedResponse = await vendorsAPI.update(duplicateId, vendorPayload);
            const updatedVendor = updatedResponse?.data?.data || updatedResponse?.data || vendorPayload;
            Object.assign(duplicateVendor, updatedVendor);
            updatedCount += 1;
            continue;
          }

          const createdResponse = await vendorsAPI.create(vendorPayload);
          const createdVendor = createdResponse?.data?.data || createdResponse?.data || vendorPayload;
          existingVendors.push(createdVendor);
          createdCount += 1;
        } catch (rowError) {
          failedCount += 1;
          console.error("Vendor import row failed:", rowError);
        }
      }

      window.dispatchEvent(new CustomEvent("vendorsUpdated"));
      window.dispatchEvent(new Event("storage"));

      alert(
        `Import complete.\nCreated: ${createdCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}\nFailed: ${failedCount}`
      );
      navigate("/purchases/vendors");
    } catch (error) {
      console.error("Vendor import failed:", error);
      alert("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleFile = (type: 'csv' | 'xls') => {
    const headers = [
      "Display Name", "Company Name", "Salutation", "First Name", "Last Name",
      "Email ID", "Phone", "Mobile Phone", "Payment Terms", "Currency Code", "Notes",
      "Website", "Billing Address Street", "Billing Address City", "Billing Address State",
      "Billing Address Country", "Billing Address Zip Code", "Billing Phone", "Billing Fax",
      "Shipping Address Street", "Shipping Address City", "Shipping Address State",
      "Shipping Address Country", "Shipping Address Zip Code", "Shipping Phone", "Shipping Fax"
    ];

    const sampleDataRow = [
      "Flasher Inc", "Flasher Inc", "Mr.", "Ethan", "Samuel",
      "ethan.sam@zylker.org", "", "", "30", "USD", "Also a prospect for our Site Builders",
      "www.zylker.org", "12 Austin Terrace", "Toronto", "Ontario", "Canada", "M5R 1X1",
      "", "", "12 Austin Terrace", "Toronto", "Ontario", "Canada", "M5R 1X1", "", ""
    ];

    const data = [headers, sampleDataRow];

    let content = "";
    let mimeType = "";

    if (type === 'csv') {
      content = data.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      // For XLS/Excel, we generate a Tab-Separated Values file which Excel handles well
      content = data.map(row => row.join("\t")).join("\n");
      mimeType = "application/vnd.ms-excel;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.href = url;
    link.download = `vendor_import_sample.${type === 'csv' ? 'csv' : 'xls'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTitle = () => {
    return selectedType === "vendors" ? "Vendors - Select File" : "Vendor Contact Persons - Select File";
  };

  const filteredEncodings = encodings.filter(encoding =>
    encoding.toLowerCase().includes(encodingSearch.toLowerCase())
  );

  // Show selection modal first
  if (showSelectionModal) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "500px",
          margin: "20px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
              margin: 0
            }}>
              Import Vendors
            </h2>
            <button
              onClick={handleSelectionCancel}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                color: "#6b7280"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: "24px" }}>
            <p style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "24px",
              lineHeight: "1.6"
            }}>
              You can import contacts into Taban Books from a .CSV or .TSV or .XLS file.
            </p>

            {/* Radio Options */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                cursor: "pointer",
                borderRadius: "6px",
                marginBottom: "12px",
                backgroundColor: selectedType === "vendors" ? "#eff6ff" : "transparent",
                border: selectedType === "vendors" ? "1px solid #156372" : "1px solid transparent"
              }}>
                <input
                  type="radio"
                  name="importType"
                  value="vendors"
                  checked={selectedType === "vendors"}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "#156372"
                  }}
                />
                <span style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827"
                }}>
                  Vendors
                </span>
              </label>

              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                cursor: "pointer",
                borderRadius: "6px",
                backgroundColor: selectedType === "contacts" ? "#eff6ff" : "transparent",
                border: selectedType === "contacts" ? "1px solid #156372" : "1px solid transparent"
              }}>
                <input
                  type="radio"
                  name="importType"
                  value="contacts"
                  checked={selectedType === "contacts"}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "#156372"
                  }}
                />
                <span style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827"
                }}>
                  Vendor's Contact Persons
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb"
          }}>
            <button
              onClick={handleSelectionCancel}
              style={{
                padding: "8px 16px",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                color: "#6b7280"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
                e.target.style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.target.style.borderColor = "#e5e7eb";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSelectionContinue}
              style={{
                padding: "8px 20px",
                backgroundColor: "#0D4A52",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                color: "white"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0D4A52"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0D4A52"}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const requiredFields = ["Display Name"];
  const missingRequired = requiredFields.filter((field) => !fieldMappings[field]);
  const unmappedFields = allVendorMapFields.filter((field) => !fieldMappings[field]);
  const skippedRecordsCount = 0;
  const readyToImportCount = Math.max(parsedRowsCount - skippedRecordsCount, 0);
  const isPreviewReady = missingRequired.length === 0 && readyToImportCount > 0;
  const stepTitle = currentStep === 1 ? getTitle() : currentStep === 2 ? "Map Fields" : "Preview";

  // Main import configuration page
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 m-0">
            {stepTitle}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${currentStep > 1 ? "bg-emerald-500 text-white" : "bg-[#156372] text-white"}`}>
                {currentStep > 1 ? <Check size={12} /> : "1"}
              </span>
              <span className="text-sm text-gray-900">Configure</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${currentStep > 2 ? "bg-emerald-500 text-white" : currentStep === 2 ? "bg-[#156372] text-white" : "bg-gray-200 text-gray-600"}`}>
                {currentStep > 2 ? <Check size={12} /> : "2"}
              </span>
              <span className="text-sm text-gray-900">Map Fields</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${currentStep === 3 ? "bg-[#3b82f6] text-white" : "bg-gray-200 text-gray-600"}`}>
                3
              </span>
              <span className="text-sm text-gray-900">Preview</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/purchases/vendors")}
          className="p-2 bg-transparent border-none cursor-pointer flex items-center justify-center"
        >
          <X size={20} className="text-red-600" strokeWidth={2} />
        </button>
      </div>

      {/* Content */}
      <div className={`p-8 overflow-y-auto flex-1 ${currentStep === 2 || currentStep === 3 ? "max-w-5xl" : "max-w-2xl"} mx-auto w-full`}>
        {currentStep === 1 && (
          <>
        {/* File Upload Section */}
        <div className="mb-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${isDragging ? "border-[#156372] bg-teal-50" : "border-gray-200 bg-gray-50"
              }`}
          >
            <DownloadIcon size={48} className="text-gray-500 mx-auto mb-4" />
            <div className="text-base font-medium text-gray-900 mb-2">
              Drag and drop file to import
            </div>
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
                  setImportedFileHeaders([]);
                  setFieldMappings({});
                  setParsedRowsCount(0);
                  setShowReadyDetails(false);
                  setShowSkippedDetails(false);
                  setShowUnmappedDetails(false);
                  setCurrentStep(1);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <X size={16} />
              </button>
            )}
            <div className="mt-3 text-xs text-gray-500">
              Maximum File Size: 25 MB - File Format: CSV or TSV or XLS
            </div>
            {selectedFile && (
              <div className="mt-4 p-3 bg-teal-50 rounded-md text-sm text-gray-900">
                Selected: {selectedFile.name}
              </div>
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

        {/* Sample File Link */}
        <div className="mb-8 text-sm text-gray-900">
          Download a{" "}
          <button
            className="text-teal-700 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
            onClick={(e) => {
              e.preventDefault();
              downloadSampleFile('csv');
            }}
          >
            sample csv file
          </button>{" "}
          or{" "}
          <button
            className="text-teal-700 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
            onClick={(e) => {
              e.preventDefault();
              downloadSampleFile('xls');
            }}
          >
            sample xls file
          </button>{" "}
          and compare it to your import file to ensure you have the file perfect for the import.
        </div>

        {/* Duplicate Handling - Only for Vendors */}
        {selectedType === "vendors" && (
          <div className="mb-8">
            <label className="flex items-center gap-1.5 mb-3 text-sm font-medium text-gray-900">
              Duplicate Handling: <span className="text-red-600">*</span>
              <HelpCircle size={16} className="text-gray-500" />
            </label>
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="skip"
                  checked={duplicateHandling === "skip"}
                  onChange={(e) => setDuplicateHandling(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Skip Duplicates
                  </div>
                  <div className="text-xs text-gray-500">
                    Retains the vendors in Taban Books and does not import the duplicates in the import file.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="overwrite"
                  checked={duplicateHandling === "overwrite"}
                  onChange={(e) => setDuplicateHandling(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Overwrite vendors
                  </div>
                  <div className="text-xs text-gray-500">
                    Imports the duplicates in the import file and overwrites the existing vendors in Taban Books.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="add"
                  checked={duplicateHandling === "add"}
                  onChange={(e) => setDuplicateHandling(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Add duplicates as new vendors
                  </div>
                  <div className="text-xs text-gray-500">
                    Imports the duplicates in the import file and adds them as new vendors in Taban Books.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Character Encoding */}
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
                if (!isEncodingDropdownOpen) {
                  setEncodingSearch("");
                }
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-white cursor-pointer flex items-center justify-between"
              style={{
                borderColor: isEncodingDropdownOpen ? "#156372" : "#e5e7eb",
                borderWidth: isEncodingDropdownOpen ? "2px" : "1px",
                boxShadow: isEncodingDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none"
              }}
            >
              <span>{characterEncoding}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{
                  transform: isEncodingDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease"
                }}
              >
                <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {isEncodingDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[300px] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ zIndex: 2000 }}
              >
                {/* Search Bar */}
                <div className="p-2.5 border-b border-gray-200 bg-gray-50">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
                      style={{ pointerEvents: "none" }}
                    />
                    <input
                      type="text"
                      placeholder="Q Search"
                      value={encodingSearch}
                      onChange={(e) => setEncodingSearch(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white"
                      onFocus={(e) => e.target.style.borderColor = "#156372"}
                      onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="overflow-y-auto max-h-[240px] bg-white">
                  {filteredEncodings.map((encoding) => (
                    <div
                      key={encoding}
                      onClick={() => {
                        setCharacterEncoding(encoding);
                        setIsEncodingDropdownOpen(false);
                        setEncodingSearch("");
                      }}
                      className="px-3.5 py-2.5 cursor-pointer text-sm transition-all flex items-center justify-between"
                      style={{
                        backgroundColor: characterEncoding === encoding ? "#156372" : "transparent",
                        color: characterEncoding === encoding ? "white" : "#111827",
                        borderLeft: characterEncoding === encoding ? "3px solid #0D4A52" : "3px solid transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (characterEncoding !== encoding) {
                          e.currentTarget.style.backgroundColor = "#f3f4f6";
                          e.currentTarget.style.borderLeftColor = "#e5e7eb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (characterEncoding !== encoding) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.borderLeftColor = "transparent";
                        }
                      }}
                    >
                      <span>{encoding}</span>
                      {characterEncoding === encoding && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.5 4.5l-7 7-3.5-3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Tips */}
        <div className="mb-8 p-4 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900">Page Tips</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>
              {selectedType === "vendors" ? (
                <>You can download the <button onClick={() => downloadSampleFile('xls')} className="text-teal-700 underline bg-transparent border-none p-0 cursor-pointer">sample xls file</button> to get detailed information about the data fields used while importing.</>
              ) : (
                <>You can download the <button onClick={() => downloadSampleFile('xls')} className="text-teal-700 underline bg-transparent border-none p-0 cursor-pointer">sample xls file</button> to get detailed information about the data fields used while importing.</>
              )}
            </li>
            <li>
              If you have files in other formats, you can convert it to an accepted file format using any online/offline converter.
            </li>
            <li>
              You can configure your import settings and save them for future too!
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={handleNext}
            disabled={!selectedFile}
            className={`px-5 py-2.5 text-sm font-medium text-white border-none rounded-md ${selectedFile ? "bg-[#156372] cursor-pointer hover:bg-[#0D4A52]" : "bg-gray-400 cursor-not-allowed"
              }`}
          >
            Next &gt;
          </button>
          <button
            onClick={() => navigate("/purchases/vendors")}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="mb-4 text-sm text-gray-700">
              Your Selected File: <span className="font-semibold">{selectedFile?.name}</span>
            </div>

            <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              The best match to each field on the selected file has been auto-selected.
            </div>

            <div className="mb-6 rounded-md border border-gray-200 bg-white p-4">
              <div className="mb-1 text-base font-medium text-gray-900">Default Data Formats</div>
              <div className="text-sm text-gray-600">Decimal Format: 1234567.89</div>
            </div>

            {vendorMapSections.map((section) => (
              <div key={section.title} className="mb-6 rounded-md border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-base font-semibold text-gray-900">{section.title}</h2>
                <div className="mb-2 grid grid-cols-[260px,1fr] gap-4 border-b border-gray-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <div>TABAN BOOKS FIELD</div>
                  <div>IMPORTED FILE HEADERS</div>
                </div>
                <div className="space-y-3">
                  {section.fields.map((field) => (
                    <div key={field} className="grid grid-cols-[260px,1fr] items-center gap-4">
                      <div className="text-sm text-gray-700">
                        {field}
                        {field === "Display Name" && <span className="ml-1 text-red-600">*</span>}
                      </div>
                      <select
                        value={fieldMappings[field] || ""}
                        onChange={(e) => setFieldMappings((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#156372] focus:outline-none"
                      >
                        <option value="">Select</option>
                        {importedFileHeaders.map((header) => (
                          <option key={`${field}-${header}`} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mb-6 rounded-md border border-gray-200 bg-white p-4">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={saveSelections}
                  onChange={(e) => setSaveSelections(e.target.checked)}
                />
                Save these selections for use during future imports.
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <button
                onClick={handlePrevious}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              >
                &lt; Previous
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer hover:bg-[#0D4A52]"
                >
                  Next &gt;
                </button>
                <button
                  onClick={() => navigate("/purchases/vendors")}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div className="flex items-center gap-2">
                <Info size={14} />
                <span>
                  {isPreviewReady
                    ? "All Vendors in your file are ready to be imported"
                    : "Some vendor records need attention before import"}
                </span>
              </div>
            </div>

            <div className="mb-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-gray-900">
                  Vendors that are ready to be imported - <span className="font-semibold">{readyToImportCount}</span>
                </span>
                <button
                  onClick={() => setShowReadyDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[#3b82f6] hover:text-[#2563eb]"
                >
                  {showReadyDetails ? "Hide Details" : "View Details"}
                  <ChevronDown size={14} className={showReadyDetails ? "rotate-180" : ""} />
                </button>
              </div>
              {showReadyDetails && (
                <div className="pb-3 text-sm text-gray-600">
                  {readyToImportCount > 0
                    ? "All records from your selected file are ready to be imported."
                    : "No records are ready to be imported."}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 py-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>No. of Records skipped - <span className="font-semibold">{skippedRecordsCount}</span></span>
                </div>
                <button
                  onClick={() => setShowSkippedDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[#3b82f6] hover:text-[#2563eb]"
                >
                  {showSkippedDetails ? "Hide Details" : "View Details"}
                  <ChevronDown size={14} className={showSkippedDetails ? "rotate-180" : ""} />
                </button>
              </div>
              {showSkippedDetails && (
                <div className="pb-3 text-sm text-gray-600">
                  No records were skipped during this import setup.
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 py-3 text-sm">
                <div className="flex items-center gap-2 text-gray-900">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>Unmapped Fields - <span className="font-semibold">{unmappedFields.length}</span></span>
                </div>
                <button
                  onClick={() => setShowUnmappedDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[#3b82f6] hover:text-[#2563eb]"
                >
                  {showUnmappedDetails ? "Hide Details" : "View Details"}
                  <ChevronDown size={14} className={showUnmappedDetails ? "rotate-180" : ""} />
                </button>
              </div>
              {showUnmappedDetails && (
                <div className="pb-4 text-sm text-gray-700">
                  <p className="mb-3">
                    The following fields in your import file have not been mapped to any Taban Books field.
                    The data in these fields will be ignored during the import.
                  </p>
                  {unmappedFields.length > 0 ? (
                    <ul className="mb-4 list-disc space-y-1 pl-5 text-gray-800">
                      {unmappedFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-4">No unmapped fields.</p>
                  )}

                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="mt-0.5" />
                      <span>
                        Click the Previous button if you want to map these fields, or click Import to continue.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {missingRequired.length > 0 && (
              <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Required mapping missing: {missingRequired.join(", ")}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevious}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                >
                  &lt; Previous
                </button>
                <button
                  onClick={handleImport}
                  className={`px-5 py-2.5 text-sm font-medium text-white border-none rounded-md ${
                    isImporting ? "bg-[#0D4A52] cursor-not-allowed opacity-70" : "bg-[#156372] cursor-pointer hover:bg-[#0D4A52]"
                  }`}
                  disabled={!selectedFile || isImporting}
                >
                  {isImporting ? "Importing..." : "Import"}
                </button>
              </div>
              <button
                onClick={() => navigate("/purchases/vendors")}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



