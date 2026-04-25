import { createContext, createElement, useContext } from "react";
import type { MutableRefObject, ReactNode, RefObject, SyntheticEvent } from "react";
import type { Item } from "../../items/itemsModel";
import type {
  AccountCategories,
  AdjustmentFormData,
  CalendarDay,
  DeleteReasonModalState,
  ItemRow,
  LocationItem,
} from "./types";

export interface NewAdjustmentFormContextValue {
  formData: AdjustmentFormData;
  errors: Record<string, boolean>;
  isEditMode: boolean;
  isValueMode: boolean;
  loading: boolean;
  submittingStatus: string | null;
  updateField: (field: keyof AdjustmentFormData, value: string) => void;
  dates: {
    open: boolean;
    currentMonth: Date;
    selectedDate: Date;
    days: CalendarDay[];
    ref: RefObject<HTMLDivElement | null>;
    toggle: () => void;
    navigateMonth: (direction: "prev" | "next") => void;
    selectDate: (date: Date) => void;
  };
  accounts: {
    open: boolean;
    search: string;
    categories: AccountCategories;
    ref: RefObject<HTMLDivElement | null>;
    toggle: () => void;
    setSearch: (value: string) => void;
    select: (account: string) => void;
  };
  locations: {
    open: boolean;
    search: string;
    items: LocationItem[];
    ref: RefObject<HTMLDivElement | null>;
    toggle: () => void;
    setSearch: (value: string) => void;
    select: (location: string) => void;
  };
  reasons: {
    open: boolean;
    search: string;
    filtered: string[];
    dropdownRef: RefObject<HTMLDivElement | null>;
    values: string[];
    defaults: string[];
    manageModalOpen: boolean;
    addModalOpen: boolean;
    newReasonName: string;
    deleteModal: DeleteReasonModalState;
    toggleDropdown: () => void;
    setSearch: (value: string) => void;
    select: (reason: string) => void;
    openManageModal: () => void;
    closeManageModal: () => void;
    openAddModal: () => void;
    closeAddModal: () => void;
    setNewReasonName: (value: string) => void;
    addReason: () => Promise<void>;
    selectFromManage: (reason: string) => void;
    requestDelete: (reason: string) => void;
    closeDeleteModal: () => void;
    deleteSelectedReason: () => Promise<void>;
  };
  itemsTable: {
    rows: ItemRow[];
    items: Item[];
    itemDropdownOpen: Record<string, boolean>;
    itemSearch: Record<string, string>;
    rowMenuOpen: Record<string, boolean>;
    itemRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
    rowMenuRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
    bulkActionsRef: RefObject<HTMLDivElement | null>;
    bulkActionsDropdownOpen: boolean;
    bulkAddModalOpen: boolean;
    bulkSearch: string;
    bulkSelectedItems: Item[];
    bulkUpdateModalOpen: boolean;
    bulkUpdateField: string;
    bulkUpdateValue: string;
    reportingTagsModalOpen: boolean;
    documentsModalOpen: boolean;
    toggleBulkActions: () => void;
    hideAdditionalInfo: () => void;
    filteredItems: (index: number | string) => Item[];
    handleRowFieldChange: (index: number, field: keyof ItemRow, value: string) => void;
    handleItemSearchChange: (index: number, value: string) => void;
    openItemDropdown: (index: number | string) => void;
    selectItem: (index: number, item: Item) => Promise<void>;
    clearSelectedItem: (index: number) => void;
    editCostPrice: (index: number) => void;
    removeRow: (index: number) => void;
    addNewRow: () => void;
    toggleRowMenu: (index: number) => void;
    setRowMenuVisibility: (index: number, open: boolean) => void;
    openBulkAdd: () => void;
    cancelBulkAdd: () => void;
    setBulkSearch: (value: string) => void;
    toggleBulkSelectedItem: (item: Item) => void;
    removeBulkSelectedItem: (itemId: string | number | undefined) => void;
    addBulkSelectedItems: () => void;
    openBulkUpdate: () => void;
    closeBulkUpdate: () => void;
    setBulkUpdateField: (value: string) => void;
    setBulkUpdateValue: (value: string) => void;
    applyBulkUpdate: () => void;
    closeReportingTagsModal: () => void;
    closeDocumentsModal: () => void;
    getStockOnHand: (item: Item) => number | null;
    getItemUnitCost: (item: Item) => number;
    getItemInventoryValue: (item: Item) => number;
  };
  actions: {
    cancel: () => void;
    convertToAdjusted: (event: SyntheticEvent) => void;
  };
}

const NewAdjustmentFormContext = createContext<NewAdjustmentFormContextValue | null>(null);

export function NewAdjustmentFormProvider({
  value,
  children,
}: {
  value: NewAdjustmentFormContextValue;
  children: ReactNode;
}) {
  return createElement(NewAdjustmentFormContext.Provider, { value }, children);
}

export const useNewAdjustmentFormContext = () => {
  const context = useContext(NewAdjustmentFormContext);

  if (!context) {
    throw new Error("useNewAdjustmentFormContext must be used within NewAdjustmentFormProvider");
  }

  return context;
};
