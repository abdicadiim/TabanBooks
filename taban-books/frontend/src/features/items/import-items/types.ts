import type { LucideIcon } from "lucide-react";

export type ImportStep = "configure" | "mapFields" | "preview";
export type DuplicateHandling = "skip" | "overwrite" | "add";
export type DocumentCategory = "allDocuments" | "files" | "bankStatements";
export type CloudProviderId = "taban" | "gdrive" | "dropbox" | "box" | "onedrive" | "evernote";
export type FieldMappings = Record<string, string>;
export type CsvRow = Record<string, string>;

export interface Document {
  id: string;
  name: string;
  folder?: string;
  module?: string;
  associatedTo?: string;
  size?: number | string;
  type?: string;
  uploadedBy?: string;
  uploadedOn?: string;
  [key: string]: unknown;
}

export interface AccountRecord {
  _id?: string;
  id?: string;
  accountName?: string;
  name?: string;
}

export interface ExistingItemRecord {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
}

export interface CloudProviderConfig {
  id: CloudProviderId;
  name: string;
  icon: LucideIcon;
  authUrl: string;
  actionLabel: string;
  description: string;
  iconClassName?: string;
}

export interface DocumentCategoryConfig {
  id: DocumentCategory;
  label: string;
  icon: LucideIcon;
}

export interface ImportFieldConfig {
  field: string;
  required: boolean;
  variations: string[];
}

export interface PreviewData {
  readyToImport: number;
  skippedRecords: number;
  unmappedFields: number;
}

export interface PreviewSkippedRecord {
  row: CsvRow;
  reason: string;
}

export interface PreviewDetails {
  ready: CsvRow[];
  skipped: PreviewSkippedRecord[];
  unmapped: string[];
}
