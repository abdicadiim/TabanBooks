export type DocumentItem = {
  id: string;
  name: string;
  type?: string;
  folder?: string;
  associatedTo?: string;
  uploadedBy?: string;
  uploadedOn?: string;
  uploadedTime?: string;
  uploadedOnFormatted?: string;
  previewUrl?: string;
  size?: number | string;
  status?: string;
  module?: string;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  [key: string]: unknown;
};

export type FolderItem = {
  id: string;
  name: string;
  permission: string;
};

export type DocumentSortKey = "name" | "uploadedOn" | "uploadedBy" | "folder";
