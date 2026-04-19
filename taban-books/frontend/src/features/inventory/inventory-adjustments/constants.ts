import type {
  InventoryAdjustmentColumn,
  InventoryAdjustmentSearchForm,
} from "./types";

export const INVENTORY_VIEW_MODE_STORAGE_KEY = "taban_inventory_view_mode";
export const INVENTORY_COLUMNS_STORAGE_KEY = "taban_inventory_columns_v1";
export const MIN_COLUMN_WIDTH = 80;

export const ACCENT_COLOR = "#156372";
export const ACCENT_GRADIENT = "linear-gradient(90deg, #156372 0%, #0D4A52 100%)";

export const DEFAULT_COLUMNS: InventoryAdjustmentColumn[] = [
  { key: "date", label: "DATE", visible: true, width: 140 },
  { key: "reason", label: "REASON", visible: true, width: 170 },
  { key: "description", label: "DESCRIPTION", visible: true, width: 140 },
  { key: "status", label: "STATUS", visible: true, width: 140 },
  { key: "referenceNumber", label: "REFERENCE NUMB...", visible: true, width: 140 },
  { key: "type", label: "TYPE", visible: true, width: 120 },
  { key: "createdBy", label: "CREATED BY", visible: true, width: 140 },
  { key: "createdTime", label: "CREATED TIME", visible: true, width: 160 },
  { key: "lastModifiedBy", label: "LAST MODIFIED BY", visible: true, width: 160 },
  { key: "lastModifiedTime", label: "LAST MODIFIED TI...", visible: true, width: 160 },
  { key: "location", label: "LOCATION", visible: true, width: 150 },
];

export const INITIAL_SEARCH_FORM: InventoryAdjustmentSearchForm = {
  itemName: "",
  referenceNumber: "",
  reason: "",
  itemDescription: "",
  adjustmentType: "All",
  dateFrom: "",
  dateTo: "",
};

export const SEARCH_FILTER_OPTIONS = ["All", "By Quantity", "By Value"] as const;
export const SEARCH_REASON_OPTIONS = ["Damaged", "Lost", "Found", "Other"] as const;
export const SEARCH_ADJUSTMENT_TYPE_OPTIONS = ["All", "Increase", "Decrease"] as const;
export const CALENDAR_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
