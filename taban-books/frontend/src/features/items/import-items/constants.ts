import {
  Box,
  Building2,
  Cloud,
  FileText,
  Folder,
  HardDrive,
  LayoutGrid,
  Square,
} from "lucide-react";
import type { CloudProviderConfig, DocumentCategoryConfig, ImportFieldConfig } from "./types";

export const VALID_FILE_EXTENSIONS = [".csv", ".tsv", ".xls", ".xlsx"];
export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const PRIMARY_BUTTON_STYLE = { background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" };

export const ENCODING_OPTIONS = [
  "UTF-8 (Unicode)",
  "UTF-16 (Unicode)",
  "ISO-8859-1",
  "ISO-8859-2",
  "ISO-8859-9 (Turkish)",
  "GB2312 (Simplified Chinese)",
  "Big5 (Traditional Chinese)",
  "Shift_JIS (Japanese)",
  "Windows-1252",
  "ASCII",
];

export const IMPORT_FIELDS: ImportFieldConfig[] = [
  { field: "Item Name", required: true, variations: ["name", "item name", "product name", "item"] },
  { field: "SKU", required: false, variations: ["sku", "product code", "item code", "code"] },
  { field: "Product Type", required: false, variations: ["product type", "item type", "type"] },
  { field: "Description", required: false, variations: ["description", "sales description", "desc", "details"] },
  { field: "Purchase Description", required: false, variations: ["purchase description", "purchasing description"] },
  { field: "Unit", required: false, variations: ["unit", "unit of measure", "uom"] },
  {
    field: "Selling Price",
    required: false,
    variations: ["selling price", "sales rate", "rate", "price", "sale price", "selling"],
  },
  {
    field: "Purchase Price",
    required: false,
    variations: ["purchase price", "purchase rate", "cost", "cost price", "purchase"],
  },
  { field: "Sales Account", required: false, variations: ["sales account", "income account", "revenue account"] },
  { field: "Purchase Account", required: false, variations: ["purchase account", "expense account", "cost account"] },
  { field: "Inventory Account", required: false, variations: ["inventory account", "stock account"] },
  { field: "Reorder Point", required: false, variations: ["reorder point", "re-order point"] },
  { field: "Opening Stock", required: false, variations: ["opening stock", "opening quantity", "stock on hand"] },
  { field: "Opening Stock Value", required: false, variations: ["opening stock value", "opening value"] },
  { field: "Track Inventory", required: false, variations: ["track inventory", "inventory tracked"] },
  { field: "Status", required: false, variations: ["status", "active", "state"] },
];

export const SAMPLE_HEADERS = [
  "Item Name",
  "Description",
  "SKU",
  "Rate",
  "Tax1 Name",
  "Tax1 Percentage",
  "Tax1 Type",
  "Product Type",
  "Status",
  "CF.custom_field",
];

export const SAMPLE_ROWS = [
  [
    "HP USB 2.0 Docking Station",
    "4 USB 2.0, 1 DVI External Monitor Port, 1 RJ-45",
    "UDB02",
    "GBP 600.00",
    "Standard Rate",
    "20",
    "ItemAmount",
    "goods",
    "Active",
    "1000",
  ],
  [
    "Standard Plan",
    "This is a 12 months plan, 150GB space, 1500GB transfer, 1000 email accounts, 25 MYSQL databases, unlimited email forwards.",
    "STANDARD12",
    "GBP 7.00",
    "Standard Rate",
    "20",
    "ItemAmount",
    "service",
    "Active",
    "6000",
  ],
  [
    "Deluxe Plan",
    "This is a 12 months plan, 300GB space, 3000GB transfer, 2000 email accounts, 50 MYSQL databases, unlimited email forwards.",
    "DELUX12",
    "GBP 14.00",
    "Standard Rate",
    "20",
    "ItemAmount",
    "service",
    "Active",
    "200",
  ],
  [
    "Premium Plan",
    "This is a 12 month plan, 500GB space, 5000 GB transfer, 70 MYSQL databases, unlimited email forwards.",
    "PREMIUM12",
    "GBP 17.00",
    "Standard Rate",
    "20",
    "ItemAmount",
    "service",
    "Active",
    "100",
  ],
];

export const DOCUMENT_CATEGORIES: DocumentCategoryConfig[] = [
  { id: "files", label: "Files", icon: Folder },
  { id: "bankStatements", label: "Bank Statements", icon: Building2 },
  { id: "allDocuments", label: "All Documents", icon: FileText },
];

export const CLOUD_PROVIDER_TERMS =
  "By clicking on this button you agree to the provider's terms of use and privacy policy.";

export const CLOUD_PROVIDERS: CloudProviderConfig[] = [
  {
    id: "taban",
    name: "Taban Books Drive",
    icon: LayoutGrid,
    authUrl:
      "https://drive.tabanbooks.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=TabanBooks",
    actionLabel: "Set up your team",
    description: "Taban Books Drive is an online file sync, storage and content collaboration platform.",
    iconClassName: "text-green-600",
  },
  {
    id: "gdrive",
    name: "Google Drive",
    icon: HardDrive,
    authUrl: "https://accounts.google.com/v3/signin/",
    actionLabel: "Authenticate Google",
    description: CLOUD_PROVIDER_TERMS,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: Box,
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    actionLabel: "Authenticate Dropbox",
    description: CLOUD_PROVIDER_TERMS,
    iconClassName: "text-blue-500",
  },
  {
    id: "box",
    name: "Box",
    icon: Square,
    authUrl: "https://account.box.com/api/oauth2/authorize",
    actionLabel: "Authenticate Box",
    description: CLOUD_PROVIDER_TERMS,
    iconClassName: "text-blue-600",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    icon: Cloud,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    actionLabel: "Authenticate OneDrive",
    description: CLOUD_PROVIDER_TERMS,
    iconClassName: "text-blue-500",
  },
  {
    id: "evernote",
    name: "Evernote",
    icon: FileText,
    authUrl: "https://www.evernote.com/Login.action",
    actionLabel: "Authenticate Evernote",
    description: CLOUD_PROVIDER_TERMS,
    iconClassName: "text-green-600",
  },
];
