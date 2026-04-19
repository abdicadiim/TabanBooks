export type MaybeAsyncVoid = void | Promise<void>;

export interface Attachment {
  _id?: string;
  id: string | number;
  name: string;
  size: string;
  type: string;
  preview?: string;
  file?: File | string;
}

export interface Comment {
  _id?: string;
  id: string | number;
  author: string;
  timestamp: string;
  text: string;
}

export interface ItemReference {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
  inventoryAccount?: string;
  unit?: string;
}

export interface Item {
  item?: ItemReference;
  selectedItem?: ItemReference;
  itemDetails?: string;
  itemName?: string;
  itemSku?: string;
  quantityAdjusted: string | number;
  quantityAvailable?: string | number;
  quantityOnHand?: string | number;
  newQuantityOnHand?: string | number;
  newQuantity?: string | number;
  cost?: string | number;
  costPrice?: string | number;
  rate?: string | number;
  unit?: string;
}

export interface JournalLine {
  accountName?: string;
  account?: string;
  debit?: string | number;
  credit?: string | number;
  description?: string;
}

export interface Adjustment {
  _id?: string;
  id?: string;
  comments?: Comment[];
  attachments?: Array<Attachment | string>;
  items?: Item[];
  itemRows?: Item[];
  inventoryAccount?: unknown;
  account?: unknown;
  adjustmentAccount?: unknown;
  journalEntry?: {
    lines: JournalLine[];
  };
  date?: string;
  adjustmentNumber?: string;
  referenceNumber?: string;
  reason?: unknown;
  type?: string;
  status?: string;
  createdBy?: unknown;
  description?: string;
  notes?: string;
  createdAt?: string;
  createdTime?: string;
  lastModifiedTime?: string;
  updatedAt?: string;
}
