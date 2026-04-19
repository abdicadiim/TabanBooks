import { createContext, useContext } from "react";
import type { MutableRefObject, ReactNode } from "react";
import type {
  CloudProviderConfig,
  CloudProviderId,
  CsvRow,
  Document,
  DocumentCategory,
  DuplicateHandling,
  FieldMappings,
  ImportStep,
  PreviewData,
  PreviewDetails,
} from "./types";

export interface ImportItemsContextValue {
  currentStep: ImportStep;
  configure: {
    selectedFile: File | null;
    duplicateHandling: DuplicateHandling;
    characterEncoding: string;
    isEncodingDropdownOpen: boolean;
    encodingSearch: string;
    isFileSourceDropdownOpen: boolean;
    filteredEncodingOptions: string[];
    fileInputRef: MutableRefObject<HTMLInputElement | null>;
    encodingDropdownRef: MutableRefObject<HTMLDivElement | null>;
    fileSourceDropdownRef: MutableRefObject<HTMLDivElement | null>;
    dropAreaRef: MutableRefObject<HTMLDivElement | null>;
    setDuplicateHandling: (value: DuplicateHandling) => void;
    toggleEncodingDropdown: () => void;
    setEncodingSearch: (value: string) => void;
    selectEncoding: (value: string) => void;
    toggleFileSourceDropdown: () => void;
    handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleAttachFromDesktop: () => void;
    handleAttachFromCloud: () => void;
    handleAttachFromDocuments: () => void;
    handleDragOver: (event: React.DragEvent) => void;
    handleDragLeave: (event: React.DragEvent) => void;
    handleDrop: (event: React.DragEvent) => void;
  };
  mapping: {
    selectedFile: File | null;
    fieldMappings: FieldMappings;
    importedFileHeaders: string[];
    saveSelections: boolean;
    updateFieldMapping: (field: string, value: string) => void;
    setSaveSelections: (value: boolean) => void;
  };
  preview: {
    previewData: PreviewData;
    previewDetails: PreviewDetails;
    showReadyDetails: boolean;
    showSkippedDetails: boolean;
    showUnmappedDetails: boolean;
    isImporting: boolean;
    toggleReadyDetails: () => void;
    toggleSkippedDetails: () => void;
    toggleUnmappedDetails: () => void;
    getValue: (row: CsvRow, fieldName: string) => string;
    handleImport: () => Promise<void>;
  };
  modals: {
    isCloudPickerOpen: boolean;
    selectedCloudProvider: CloudProviderId;
    selectedCloudProviderConfig: CloudProviderConfig;
    closeCloudPicker: () => void;
    selectCloudProvider: (providerId: CloudProviderId) => void;
    attachCloudSelection: () => void;
    isDocumentsModalOpen: boolean;
    selectedDocumentCategory: DocumentCategory;
    documentSearch: string;
    filteredDocuments: Document[];
    selectedDocuments: string[];
    closeDocumentsModal: () => void;
    setDocumentSearch: (value: string) => void;
    selectDocumentCategory: (category: DocumentCategory) => void;
    toggleDocumentSelection: (documentId: string) => void;
    attachSelectedDocuments: () => void;
    goToDocuments: () => void;
  };
  actions: {
    close: () => void;
    cancel: () => void;
    next: () => void;
    previous: () => void;
    downloadSampleFile: (format: "csv" | "xls") => void;
  };
}

const ImportItemsContext = createContext<ImportItemsContextValue | null>(null);

export function ImportItemsProvider({
  value,
  children,
}: {
  value: ImportItemsContextValue;
  children: ReactNode;
}) {
  return <ImportItemsContext.Provider value={value}>{children}</ImportItemsContext.Provider>;
}

export const useImportItemsContext = () => {
  const context = useContext(ImportItemsContext);

  if (!context) {
    throw new Error("useImportItemsContext must be used within ImportItemsProvider");
  }

  return context;
};
