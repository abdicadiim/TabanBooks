import type { Item } from "../../items/itemsModel";

export interface ItemRow {
  id: number | string;
  itemDetails: string;
  selectedItem: Item | null;
  description: string;
  stockQuantity: string;
  quantityAvailable: string;
  newQuantityOnHand: string;
  quantityAdjusted: string;
  costPrice: string;
  [key: string]: unknown;
}

export interface AdjustmentFormData {
  mode: string;
  reference: string;
  date: string;
  account: string;
  reason: string;
  description: string;
}

export interface CalendarDay {
  date: number;
  month: "prev" | "current" | "next";
  fullDate: Date;
}

export interface CustomReason {
  _id?: string;
  name: string;
  [key: string]: unknown;
}

export interface DeleteReasonModalState {
  open: boolean;
  reason: string;
}

export type AccountCategories = Record<string, string[]>;
