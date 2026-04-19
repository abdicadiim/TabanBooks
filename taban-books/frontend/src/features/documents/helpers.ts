import type { DocumentItem, DocumentSortKey, FolderItem } from "./types";

export const FOLDER_STORAGE_KEY = "documents.customFolders";

const BANK_FOLDER_NAME = "Bank Statements";
const INBOX_ALIASES = new Set(["", "root", "Files", "Inbox"]);

export function createFolderId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `folder-${slug || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDocumentFolderName(document: DocumentItem) {
  const raw = String(document.folder || "").trim();
  if (INBOX_ALIASES.has(raw)) return "Inbox";
  return raw;
}

export function isInboxDocument(document: DocumentItem) {
  return getDocumentFolderName(document) === "Inbox";
}

export function isBankStatementDocument(document: DocumentItem) {
  return getDocumentFolderName(document) === BANK_FOLDER_NAME;
}

export function formatFileSize(size?: number | string) {
  if (typeof size === "string" && size.trim()) {
    return size;
  }

  const numericSize = typeof size === "number" ? size : 0;
  if (!numericSize) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let value = numericSize;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getDocumentStatus(document: DocumentItem) {
  if (document.pending_sync) {
    return "Pending Sync";
  }
  return String(document.status || "Processed");
}

export function getDocumentKind(document: DocumentItem) {
  const extension = String(document.type || document.name.split(".").pop() || "")
    .toLowerCase()
    .trim();

  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "Image";
  if (extension === "pdf") return "PDF";
  if (["csv", "xls", "xlsx"].includes(extension)) return "Sheet";
  if (["doc", "docx", "txt", "rtf"].includes(extension)) return "Doc";
  return "Other";
}

export function isImageDocument(document: DocumentItem) {
  return getDocumentKind(document) === "Image";
}

function parseGbDate(value?: string) {
  if (!value) return 0;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const [, day, month, year] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export function getDocumentTimestamp(document: DocumentItem) {
  const directValue = document.createdAt || document.updatedAt || document.uploadedOnFormatted;
  if (directValue) {
    const parsed = Date.parse(directValue);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return parseGbDate(document.uploadedOn);
}

export function filterDocuments(
  documents: DocumentItem[],
  filters: {
    searchQuery: string;
    statusFilter: string;
    typeFilter: string;
  },
) {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  return documents.filter((document) => {
    if (filters.statusFilter !== "All" && getDocumentStatus(document) !== filters.statusFilter) {
      return false;
    }

    if (filters.typeFilter !== "All" && getDocumentKind(document) !== filters.typeFilter) {
      return false;
    }

    if (!normalizedQuery) return true;

    const haystack = [
      document.name,
      document.uploadedBy,
      document.associatedTo,
      getDocumentFolderName(document),
      getDocumentStatus(document),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function sortDocuments(documents: DocumentItem[], sortBy: DocumentSortKey) {
  return [...documents].sort((left, right) => {
    if (sortBy === "uploadedOn") {
      return getDocumentTimestamp(right) - getDocumentTimestamp(left);
    }

    if (sortBy === "folder") {
      return getDocumentFolderName(left).localeCompare(getDocumentFolderName(right));
    }

    if (sortBy === "uploadedBy") {
      return String(left.uploadedBy || "").localeCompare(String(right.uploadedBy || ""));
    }

    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

export function loadStoredFolders(): FolderItem[] {
  try {
    const raw = localStorage.getItem(FOLDER_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item.name === "string")
          .map((item) => ({
            id: String(item.id || createFolderId(String(item.name))),
            name: String(item.name),
            permission: String(item.permission || "all"),
          }))
      : [];
  } catch (error) {
    console.error("Failed to load document folders from storage:", error);
    return [];
  }
}

export function saveStoredFolders(folders: FolderItem[]) {
  localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
}

export function mergeFolders(existingFolders: FolderItem[], documents: DocumentItem[]) {
  const existingNames = new Set(existingFolders.map((folder) => folder.name));
  const derivedFolders = documents
    .map(getDocumentFolderName)
    .filter((name) => name !== "Inbox" && name !== BANK_FOLDER_NAME);

  const missingFolders = Array.from(new Set(derivedFolders))
    .filter((name) => !existingNames.has(name))
    .map((name) => ({
      id: createFolderId(name),
      name,
      permission: "all",
    }));

  if (!missingFolders.length) {
    return existingFolders;
  }

  return [...existingFolders, ...missingFolders];
}

export function getViewTitle(activeView: string, folders: FolderItem[]) {
  if (activeView === "all") return "All Documents";
  if (activeView === "inbox") return "Files";
  if (activeView === "bank") return "Bank Statements";
  return folders.find((folder) => folder.id === activeView)?.name || "Documents";
}

export function getDestinationFolderName(activeView: string, folders: FolderItem[]) {
  if (activeView === "bank") return BANK_FOLDER_NAME;
  if (activeView === "all" || activeView === "inbox") return "Inbox";
  return folders.find((folder) => folder.id === activeView)?.name || "Inbox";
}

export function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}
