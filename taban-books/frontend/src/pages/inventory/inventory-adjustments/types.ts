export interface InventoryAdjustmentColumn {
  key: string;
  label: string;
  visible: boolean;
  width: number;
}

export interface InventoryAdjustmentSearchForm {
  itemName: string;
  referenceNumber: string;
  reason: string;
  itemDescription: string;
  adjustmentType: string;
  dateFrom: string;
  dateTo: string;
}

export interface InventoryAdjustmentRow extends Record<string, any> {
  id: string;
  date?: string;
  rawDate?: string;
  reason?: string;
  description?: string;
  status?: string;
  referenceNumber?: string;
  adjustmentNumber?: string;
  type?: string;
  createdBy?: string;
  createdTime?: string;
  rawCreatedAt?: string;
  lastModifiedBy?: string;
  lastModifiedTime?: string;
  rawUpdatedAt?: string;
  location?: string;
  itemName?: string;
}

export interface InventoryAdjustmentsProps {
  rows: InventoryAdjustmentRow[];
  onRowClick?: (row: InventoryAdjustmentRow) => void;
  onCreateNew?: () => void;
  selectedItems?: string[];
  onSelectAll?: (checked: boolean) => void;
  onSelectItem?: (id: string, checked: boolean) => void;
  onSort?: (field: string) => void;
  sortBy?: string;
  sortOrder?: string;
  isLoading?: boolean;
  currentTypeFilter?: string;
}

export type InventoryAdjustmentsViewMode = "table" | "list";
export type CalendarMonthDirection = "prev" | "next";
export type CalendarMonthType = "prev" | "current" | "next";

export interface CalendarDay {
  date: number;
  month: CalendarMonthType;
  fullDate: Date;
}

export interface ColumnResizeState {
  col: string;
  startX: number;
  startWidth: number;
}
