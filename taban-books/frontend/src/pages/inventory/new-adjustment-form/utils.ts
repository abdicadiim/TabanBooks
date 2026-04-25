import type { Item } from "../../items/itemsModel";
import type { CalendarDay, ItemRow } from "./types";

export const DEFAULT_ADJUSTMENT_ACCOUNT = "Cost of Goods Sold";

export const DEFAULT_REASONS = [
  "Stock on fire",
  "Stolen goods",
  "Damaged goods",
  "Stock Written off",
  "Stocktaking results",
  "Inventory Revaluation",
];

export const createEmptyItemRow = (id: number | string = 1): ItemRow => ({
  id,
  itemDetails: "",
  selectedItem: null,
  description: "",
  stockQuantity: "0.00",
  quantityAvailable: "",
  newQuantityOnHand: "0.00",
  quantityAdjusted: "",
  costPrice: "60.00",
});

export const getTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
};

export const parseDateString = (dateString: string | undefined | null): Date => {
  if (!dateString) {
    return new Date();
  }

  try {
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }

    const parts = dateString.split(" ");
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames.indexOf(parts[1]);
      const year = parseInt(parts[2], 10);

      if (month !== -1 && !Number.isNaN(day) && !Number.isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    return new Date(dateString);
  } catch {
    return new Date();
  }
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) {
    return "";
  }

  const parsedDate = date instanceof Date ? date : parseDateString(date);
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}/${month}/${year}`;
};

export const toNumber = (value: unknown): number => {
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getItemStockQuantity = (item: Partial<Item> | null | undefined): number => {
  if (!item || !item.trackInventory) {
    return 0;
  }

  return toNumber(item.stockQuantity ?? item.stockOnHand ?? item.quantityOnHand ?? item.quantity ?? 0);
};

export const getItemUnitCost = (item: Partial<Item> | null | undefined): number =>
  toNumber(item?.costPrice ?? item?.purchaseRate ?? item?.openingStockRate ?? 0);

export const getItemInventoryValue = (item: Partial<Item> | null | undefined): number =>
  getItemStockQuantity(item) * getItemUnitCost(item);

export const getStockOnHand = (item: Item): number | null => {
  if (!item.trackInventory) {
    return null;
  }

  return toNumber(item.stockQuantity ?? item.stockOnHand ?? 0);
};

export const getDaysInMonth = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: CalendarDay[] = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let index = startingDayOfWeek - 1; index >= 0; index -= 1) {
    days.push({
      date: prevMonthLastDay - index,
      month: "prev",
      fullDate: new Date(year, month - 1, prevMonthLastDay - index),
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: day,
      month: "current",
      fullDate: new Date(year, month, day),
    });
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day += 1) {
    days.push({
      date: day,
      month: "next",
      fullDate: new Date(year, month + 1, day),
    });
  }

  return days;
};

export const mapAdjustmentItemToRow = (item: any, isValueAdjustment: boolean): ItemRow => {
  const stockQty = toNumber(item.quantityOnHand ?? 0);
  const unitCost = toNumber(item.cost ?? 0);
  const adjustedValue = toNumber(item.quantityAdjusted ?? 0);
  const changedValue = toNumber(item.newQuantity ?? 0);
  const currentValue = isValueAdjustment ? changedValue - adjustedValue : stockQty;

  return {
    id: item.item?._id || Date.now() + Math.random(),
    itemDetails: item.item?.name || "",
    selectedItem: item.item || null,
    description: item.item?.salesDescription || "",
    stockQuantity: stockQty.toFixed(2),
    quantityAvailable: isValueAdjustment ? currentValue.toFixed(2) : stockQty.toFixed(2),
    newQuantityOnHand: isValueAdjustment ? changedValue.toFixed(2) : toNumber(item.newQuantity ?? 0).toFixed(2),
    quantityAdjusted: isValueAdjustment ? adjustedValue.toFixed(2) : String(item.quantityAdjusted ?? ""),
    costPrice: unitCost.toFixed(2),
  };
};

export const mapClonedItemToRow = (item: any, isValueAdjustment: boolean): ItemRow => {
  const stockQty = toNumber(item.quantityOnHand ?? 0);
  const unitCost = toNumber(item.cost ?? 0);
  const adjustedValue = toNumber(item.quantityAdjusted ?? 0);
  const changedValue = toNumber(item.newQuantity ?? 0);
  const currentValue = isValueAdjustment ? changedValue - adjustedValue : stockQty;

  return {
    id: item.itemId || Date.now() + Math.random(),
    itemDetails: item.itemName || "",
    selectedItem: {
      _id: item.itemId,
      id: item.itemId,
      name: item.itemName || "",
      sku: item.itemSku || "",
      trackInventory: true,
    } as Item,
    description: item.description || "",
    stockQuantity: stockQty.toFixed(2),
    quantityAvailable: isValueAdjustment ? currentValue.toFixed(2) : stockQty.toFixed(2),
    newQuantityOnHand: isValueAdjustment ? changedValue.toFixed(2) : toNumber(item.newQuantity ?? 0).toFixed(2),
    quantityAdjusted: isValueAdjustment ? adjustedValue.toFixed(2) : String(item.quantityAdjusted ?? ""),
    costPrice: unitCost.toFixed(2),
  };
};

export const createRowFromItem = (item: Item, isValueMode: boolean): ItemRow => {
  const stockOnHand = getStockOnHand(item);
  const unitCost = getItemUnitCost(item);
  const currentValue = getItemInventoryValue(item);

  return {
    id: Date.now() + Math.random(),
    itemDetails: item.name || "",
    selectedItem: item,
    description: item.salesDescription || item.purchaseDescription || "",
    stockQuantity: stockOnHand !== null ? stockOnHand.toFixed(2) : "0.00",
    quantityAvailable: isValueMode
      ? currentValue.toFixed(2)
      : stockOnHand !== null
        ? stockOnHand.toFixed(2)
        : "0.00",
    newQuantityOnHand: isValueMode
      ? currentValue.toFixed(2)
      : stockOnHand !== null
        ? stockOnHand.toFixed(2)
        : "0.00",
    quantityAdjusted: "",
    costPrice: unitCost.toFixed(2),
  };
};

export const clearSelectedItemFromRow = (row: ItemRow): ItemRow => ({
  ...row,
  selectedItem: null,
  itemDetails: "",
  description: "",
  stockQuantity: "0.00",
  quantityAvailable: "0.00",
  newQuantityOnHand: "0.00",
  quantityAdjusted: "",
});
