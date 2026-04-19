import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getAllDocuments } from "../../utils/documentStorage";
import { accountantAPI, itemsAPI } from "../../services/api";
import { parseImportFile } from "../sales/utils/importFileParser";
import { CLOUD_PROVIDERS, ENCODING_OPTIONS, IMPORT_FIELDS } from "./import-items/constants";
import { ImportItemsConfigureStep } from "./import-items/ImportItemsConfigureStep";
import { ImportItemsHeader } from "./import-items/ImportItemsHeader";
import { ImportItemsMapFieldsStep } from "./import-items/ImportItemsMapFieldsStep";
import { ImportItemsModals } from "./import-items/ImportItemsModals";
import { ImportItemsPreviewStep } from "./import-items/ImportItemsPreviewStep";
import { ImportItemsStepper } from "./import-items/ImportItemsStepper";
import { ImportItemsProvider } from "./import-items/context";
import type {
  AccountRecord,
  CloudProviderId,
  CsvRow,
  Document,
  DocumentCategory,
  DuplicateHandling,
  ExistingItemRecord,
  FieldMappings,
  ImportStep,
  PreviewDetails,
  PreviewData,
} from "./import-items/types";
import {
  buildAutoMappingsFromHeaders,
  downloadSampleFile,
  extractApiArray,
  getMappedValue,
  normalizeLookupValue,
  validateImportFile,
} from "./import-items/utils";

export default function ImportItems() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>("skip");
  const [characterEncoding, setCharacterEncoding] = useState(ENCODING_OPTIONS[0]);
  const [isEncodingDropdownOpen, setIsEncodingDropdownOpen] = useState(false);
  const [encodingSearch, setEncodingSearch] = useState("");
  const [isFileSourceDropdownOpen, setIsFileSourceDropdownOpen] = useState(false);
  const [isCloudPickerOpen, setIsCloudPickerOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<DocumentCategory>("allDocuments");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<CloudProviderId>("taban");
  const [currentStep, setCurrentStep] = useState<ImportStep>("configure");
  const [fieldMappings, setFieldMappings] = useState<FieldMappings>({});
  const [previewData, setPreviewData] = useState<PreviewData>({
    readyToImport: 0,
    skippedRecords: 0,
    unmappedFields: 0,
  });
  const [previewDetails, setPreviewDetails] = useState<PreviewDetails>({ ready: [], skipped: [], unmapped: [] });
  const [showReadyDetails, setShowReadyDetails] = useState(false);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [showUnmappedDetails, setShowUnmappedDetails] = useState(false);
  const [saveSelections, setSaveSelections] = useState(false);
  const [importedFileHeaders, setImportedFileHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [dbAccounts, setDbAccounts] = useState<AccountRecord[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const encodingDropdownRef = useRef<HTMLDivElement>(null);
  const fileSourceDropdownRef = useRef<HTMLDivElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await accountantAPI.getAccounts({ limit: 1000 });
        setDbAccounts(extractApiArray<AccountRecord>(response));
      } catch (error) {
        console.error("Failed to fetch accounts", error);
      }
    };

    void fetchAccounts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (encodingDropdownRef.current && !encodingDropdownRef.current.contains(target)) {
        setIsEncodingDropdownOpen(false);
      }
      if (fileSourceDropdownRef.current && !fileSourceDropdownRef.current.contains(target)) {
        setIsFileSourceDropdownOpen(false);
      }
    };

    if (isEncodingDropdownOpen || isFileSourceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEncodingDropdownOpen, isFileSourceDropdownOpen]);

  useEffect(() => {
    const refreshDocuments = () => {
      setDocuments(getAllDocuments());
    };

    ["documentAdded", "documentDeleted", "documentUpdated"].forEach((eventName) => {
      window.addEventListener(eventName, refreshDocuments);
    });

    return () => {
      ["documentAdded", "documentDeleted", "documentUpdated"].forEach((eventName) => {
        window.removeEventListener(eventName, refreshDocuments);
      });
    };
  }, []);

  const resetPreview = () => {
    setPreviewData({
      readyToImport: 0,
      skippedRecords: 0,
      unmappedFields: 0,
    });
    setPreviewDetails({ ready: [], skipped: [], unmapped: [] });
    setShowReadyDetails(false);
    setShowSkippedDetails(false);
    setShowUnmappedDetails(false);
  };

  const handleImportFile = async (file: File, inputElement?: HTMLInputElement | null) => {
    const validationError = validateImportFile(file);

    if (validationError) {
      toast.error(validationError);
      if (inputElement) {
        inputElement.value = "";
      }
      setSelectedFile(null);
      return;
    }

    try {
      const { headers, rows } = await parseImportFile(file);
      setSelectedFile(file);
      setImportedFileHeaders(headers);
      setCsvRows(rows as CsvRow[]);
      setFieldMappings(buildAutoMappingsFromHeaders(headers));
      resetPreview();
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file. Please check the file format.");
      if (inputElement) {
        inputElement.value = "";
      }
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = event.currentTarget;
    const file = inputElement.files?.[0];

    if (file) {
      void handleImportFile(file, inputElement);
    }
  };

  const handleAttachFromDesktop = () => {
    setIsFileSourceDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleAttachFromCloud = () => {
    setIsFileSourceDropdownOpen(false);
    setIsCloudPickerOpen(true);
  };

  const handleAttachFromDocuments = () => {
    setIsFileSourceDropdownOpen(false);
    setIsDocumentsModalOpen(true);
    setSelectedDocuments([]);
    setSelectedDocumentCategory("allDocuments");
    setDocumentSearch("");
    setDocuments(getAllDocuments());
  };

  const filteredDocuments = documents.filter((doc) => {
    if (selectedDocumentCategory === "files" && !(doc.folder === "Files" || doc.module === "Documents")) {
      return false;
    }

    if (selectedDocumentCategory === "bankStatements") {
      const lowerName = doc.name.toLowerCase();
      const isBankStatement =
        doc.folder === "Bank Statements" || lowerName.includes("bank") || lowerName.includes("statement");
      if (!isBankStatement) {
        return false;
      }
    }

    if (documentSearch) {
      const searchValue = documentSearch.toLowerCase();
      const matchesName = doc.name.toLowerCase().includes(searchValue);
      const matchesAssociation = doc.associatedTo?.toLowerCase().includes(searchValue);
      if (!matchesName && !matchesAssociation) {
        return false;
      }
    }

    return true;
  });

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dropAreaRef.current?.classList.add("drag-over");
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dropAreaRef.current?.classList.remove("drag-over");
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dropAreaRef.current?.classList.remove("drag-over");

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      void handleImportFile(files[0]);
    }
  };

  const handleClose = () => {
    navigate("/items");
  };

  const handleCancel = () => {
    navigate("/items");
  };

  const getValue = (row: CsvRow, fieldName: string) => getMappedValue(row, fieldName, fieldMappings, importedFileHeaders);

  const calculatePreviewData = async () => {
    const buildPreview = (existingItems: ExistingItemRecord[] = []) => {
      const ready: CsvRow[] = [];
      const skipped: PreviewDetails["skipped"] = [];
      const normalizedExistingNames = new Set(
        existingItems.map((item) => normalizeLookupValue(item.name)).filter(Boolean),
      );
      const normalizedExistingSkus = new Set(
        existingItems.map((item) => normalizeLookupValue(item.sku)).filter(Boolean),
      );

      csvRows.forEach((row) => {
        const nameValue = getValue(row, "Item Name");
        if (!nameValue) {
          skipped.push({ row, reason: "Missing Item Name" });
          return;
        }

        const skuValue = getValue(row, "SKU");
        const hasDuplicate =
          normalizedExistingNames.has(normalizeLookupValue(nameValue)) ||
          (skuValue ? normalizedExistingSkus.has(normalizeLookupValue(skuValue)) : false);

        if (hasDuplicate && duplicateHandling === "skip") {
          skipped.push({ row, reason: "Duplicate Item (Skipped)" });
          return;
        }

        ready.push(row);
      });

      const missingMappings = IMPORT_FIELDS
        .filter(({ field }) => !fieldMappings[field])
        .map(({ field }) => field);

      setPreviewData({
        readyToImport: ready.length,
        skippedRecords: skipped.length,
        unmappedFields: missingMappings.length,
      });

      setPreviewDetails({
        ready,
        skipped,
        unmapped: missingMappings,
      });
    };

    try {
      const existingItemsResponse = await itemsAPI.getAll();
      buildPreview(extractApiArray<ExistingItemRecord>(existingItemsResponse));
    } catch (error) {
      console.error("Failed to fetch server items for preview", error);
      buildPreview();
    }
  };

  const handleNext = () => {
    if (!selectedFile) {
      toast.error("Please select a file to continue.");
      return;
    }

    if (currentStep === "configure") {
      setCurrentStep("mapFields");
      return;
    }

    if (currentStep === "mapFields") {
      void calculatePreviewData();
      setCurrentStep("preview");
    }
  };

  const handlePrevious = () => {
    if (currentStep === "mapFields") {
      setCurrentStep("configure");
    } else if (currentStep === "preview") {
      setCurrentStep("mapFields");
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("No file selected");
      return;
    }

    setIsImporting(true);
    const loadingToast = toast.loading(`Importing ${csvRows.length} items...`);

    let importedCount = 0;
    let skippedCount = 0;

    try {
      const existingItemsResponse = await itemsAPI.getAll();
      const serverItems = extractApiArray<ExistingItemRecord>(existingItemsResponse);
      const accountLookup = new Map<string, string>();

      dbAccounts.forEach((account) => {
        const accountId = account._id || account.id;
        if (!accountId) {
          return;
        }

        [account.accountName, account.name].forEach((candidate) => {
          const normalizedCandidate = normalizeLookupValue(candidate);
          if (normalizedCandidate && !accountLookup.has(normalizedCandidate)) {
            accountLookup.set(normalizedCandidate, accountId);
          }
        });
      });

      const parseNum = (value: unknown) => {
        if (value === undefined || value === null || value === "") {
          return 0;
        }

        const cleaned = String(value).replace(/[^\d.-]/g, "");
        const parsed = parseFloat(cleaned);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      for (const row of csvRows) {
        try {
          const nameValue = getValue(row, "Item Name") || getValue(row, "name");
          if (!nameValue) {
            skippedCount += 1;
            continue;
          }

          const resolveAccount = (fieldName: string, defaultName: string) => {
            const accountName = getValue(row, fieldName) || defaultName;
            return accountLookup.get(normalizeLookupValue(accountName)) || accountName;
          };

          const salesAccount = resolveAccount("Sales Account", "Sales");
          const purchaseAccount = resolveAccount("Purchase Account", "Cost of Goods Sold");
          const inventoryAccount = resolveAccount("Inventory Account", "Inventory");

          const skuValue = getValue(row, "SKU") || "";
          const existingServerItem = serverItems.find(
            (serverItem) =>
              (serverItem.name && normalizeLookupValue(serverItem.name) === normalizeLookupValue(nameValue)) ||
              (serverItem.sku && skuValue && normalizeLookupValue(serverItem.sku) === normalizeLookupValue(skuValue)),
          );

          const trackInventory = getValue(row, "Track Inventory")
            ? getValue(row, "Track Inventory").toLowerCase() !== "false"
            : true;
          const productType = getValue(row, "Product Type") || (trackInventory ? "Goods" : "Service");
          const finalType = productType.toLowerCase() === "service" ? "Service" : "Goods";

          const itemData = {
            name: nameValue,
            sku: skuValue,
            type: finalType,
            description: getValue(row, "Description") || "",
            salesDescription: getValue(row, "Description") || "",
            purchaseDescription: getValue(row, "Purchase Description") || "",
            unit: getValue(row, "Unit") || "pcs",
            sellingPrice: parseNum(
              getValue(row, "Selling Price") ||
                getValue(row, "Rate") ||
                getValue(row, "Sales Rate") ||
                getValue(row, "Price"),
            ),
            costPrice: parseNum(
              getValue(row, "Purchase Price") ||
                getValue(row, "Cost") ||
                getValue(row, "Purchase Rate") ||
                getValue(row, "Cost Price"),
            ),
            salesAccount,
            purchaseAccount,
            inventoryAccount,
            active: getValue(row, "Status").toLowerCase() !== "inactive",
            sellable: getValue(row, "Sellable") ? getValue(row, "Sellable").toLowerCase() !== "false" : true,
            purchasable: getValue(row, "Purchasable") ? getValue(row, "Purchasable").toLowerCase() !== "false" : true,
            trackInventory,
            reorderPoint: parseNum(getValue(row, "Reorder Point")),
            openingStock: parseNum(getValue(row, "Opening Stock")),
            openingStockValue: parseNum(getValue(row, "Opening Stock Value")),
          };

          if (existingServerItem) {
            if (duplicateHandling === "skip") {
              skippedCount += 1;
              continue;
            }

            if (duplicateHandling === "overwrite") {
              await itemsAPI.update(existingServerItem._id || existingServerItem.id, itemData);
              importedCount += 1;
              continue;
            }
          }

          await itemsAPI.create(itemData);
          importedCount += 1;
        } catch (error: any) {
          console.error("Error importing item row:", error);
          skippedCount += 1;
          const errorMessage = error.response?.data?.message || error.message || "Unknown error";
          toast.error(`Row failed: ${errorMessage}`, { duration: 3000 });
        }
      }

      toast.dismiss(loadingToast);

      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} item(s)`);
      } else if (skippedCount > 0) {
        toast.error("No items were imported. All records were skipped or failed.");
      }

      if (skippedCount > 0 && importedCount > 0) {
        toast(`${skippedCount} record(s) skipped`, { icon: "i" });
      }

      navigate("/items");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Bulk import failed:", error);
      toast.error("Failed to complete import process");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredEncodingOptions = ENCODING_OPTIONS.filter((option) =>
    option.toLowerCase().includes(encodingSearch.toLowerCase()),
  );
  const selectedCloudProviderConfig =
    CLOUD_PROVIDERS.find((provider) => provider.id === selectedCloudProvider) || CLOUD_PROVIDERS[0];

  const contextValue = {
    currentStep,
    configure: {
      selectedFile,
      duplicateHandling,
      characterEncoding,
      isEncodingDropdownOpen,
      encodingSearch,
      isFileSourceDropdownOpen,
      filteredEncodingOptions,
      fileInputRef,
      encodingDropdownRef,
      fileSourceDropdownRef,
      dropAreaRef,
      setDuplicateHandling: (value: DuplicateHandling) => setDuplicateHandling(value),
      toggleEncodingDropdown: () => setIsEncodingDropdownOpen((previous) => !previous),
      setEncodingSearch,
      selectEncoding: (value: string) => {
        setCharacterEncoding(value);
        setIsEncodingDropdownOpen(false);
        setEncodingSearch("");
      },
      toggleFileSourceDropdown: () => setIsFileSourceDropdownOpen((previous) => !previous),
      handleFileSelect,
      handleAttachFromDesktop,
      handleAttachFromCloud,
      handleAttachFromDocuments,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    },
    mapping: {
      selectedFile,
      fieldMappings,
      importedFileHeaders,
      saveSelections,
      updateFieldMapping: (field: string, value: string) =>
        setFieldMappings((currentMappings) => ({ ...currentMappings, [field]: value })),
      setSaveSelections: (value: boolean) => setSaveSelections(value),
    },
    preview: {
      previewData,
      previewDetails,
      showReadyDetails,
      showSkippedDetails,
      showUnmappedDetails,
      isImporting,
      toggleReadyDetails: () => setShowReadyDetails((previous) => !previous),
      toggleSkippedDetails: () => setShowSkippedDetails((previous) => !previous),
      toggleUnmappedDetails: () => setShowUnmappedDetails((previous) => !previous),
      getValue,
      handleImport,
    },
    modals: {
      isCloudPickerOpen,
      selectedCloudProvider,
      selectedCloudProviderConfig,
      closeCloudPicker: () => setIsCloudPickerOpen(false),
      selectCloudProvider: (providerId: CloudProviderId) => setSelectedCloudProvider(providerId),
      attachCloudSelection: () => {
        toast("Cloud file attachment isn't implemented yet.", { icon: "i" });
        setIsCloudPickerOpen(false);
      },
      isDocumentsModalOpen,
      selectedDocumentCategory,
      documentSearch,
      filteredDocuments,
      selectedDocuments,
      closeDocumentsModal: () => setIsDocumentsModalOpen(false),
      setDocumentSearch: (value: string) => setDocumentSearch(value),
      selectDocumentCategory: (category: DocumentCategory) => setSelectedDocumentCategory(category),
      toggleDocumentSelection: (documentId: string) => {
        setSelectedDocuments((current) =>
          current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId],
        );
      },
      attachSelectedDocuments: () => {
        if (selectedDocuments.length === 0) {
          toast.error("Please select at least one document to attach.");
          return;
        }

        const selectedDocs = documents.filter((doc) => selectedDocuments.includes(doc.id));
        if (selectedDocs.length > 0) {
          toast(`Selected ${selectedDocs.length} document(s). File attachment from documents will be implemented.`, {
            icon: "i",
          });
          setIsDocumentsModalOpen(false);
          setSelectedDocuments([]);
        }
      },
      goToDocuments: () => {
        setIsDocumentsModalOpen(false);
        navigate("/documents");
      },
    },
    actions: {
      close: handleClose,
      cancel: handleCancel,
      next: handleNext,
      previous: handlePrevious,
      downloadSampleFile,
    },
  } satisfies Parameters<typeof ImportItemsProvider>[0]["value"];

  return (
    <ImportItemsProvider value={contextValue}>
      <div className="w-full min-h-screen bg-gray-50">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          <ImportItemsHeader />
          <ImportItemsStepper />

          {currentStep === "configure" && <ImportItemsConfigureStep />}
          {currentStep === "mapFields" && <ImportItemsMapFieldsStep />}
          {currentStep === "preview" && <ImportItemsPreviewStep />}

          <ImportItemsModals />
        </div>
      </div>
    </ImportItemsProvider>
  );
}
