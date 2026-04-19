/**
 * Item Model
 * Products / Services
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IItem extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  type: 'Goods' | 'Service';
  sku?: string;
  unit?: string;
  description?: string;
  salesDescription?: string;
  purchaseDescription?: string;
  sellingPrice?: number;
  costPrice?: number;
  currency?: string;
  salesAccount?: string;
  purchaseAccount?: string;
  inventoryAccount?: string;
  sellable?: boolean;
  purchasable?: boolean;
  trackInventory?: boolean;
  valuationMethod?: 'FIFO' | 'LIFO' | 'Average';
  stockQuantity?: number;
  openingStock?: number;
  openingStockRate?: number;
  reorderLevel?: number;
  reorderPoint?: number; // Added as alias for frontend compatibility
  taxInfo?: {
    taxId?: string;
    taxName?: string;
    taxRate?: number;
  };
  tags?: string[];
  images?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const itemSchema = new Schema<IItem>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Goods", "Service"],
      required: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "pcs",
    },
    description: {
      type: String,
    },
    salesDescription: {
      type: String,
      trim: true,
    },
    purchaseDescription: {
      type: String,
      trim: true,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    salesAccount: {
      type: String,
      default: "Sales",
    },
    purchaseAccount: {
      type: String,
      default: "Cost of Goods Sold",
    },
    inventoryAccount: {
      type: String,
      default: "Inventory",
    },
    sellable: {
      type: Boolean,
      default: true,
    },
    purchasable: {
      type: Boolean,
      default: true,
    },
    trackInventory: {
      type: Boolean,
      default: false,
    },
    valuationMethod: {
      type: String,
      enum: ["FIFO", "LIFO", "Average"],
      default: "FIFO",
    },
    stockQuantity: {
      type: Number,
      default: 0,
    },
    openingStock: {
      type: Number,
      default: 0,
    },
    openingStockRate: {
      type: Number,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 0,
    },
    reorderPoint: {
      type: Number,
      default: 0,
    },
    taxInfo: {
      taxId: String,
      taxName: String,
      taxRate: {
        type: Number,
        default: 0,
      },
    },
    tags: [String],
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
itemSchema.index({ organization: 1, name: 1 });
itemSchema.index({ organization: 1, sku: 1 });
itemSchema.index({ organization: 1, type: 1 });
itemSchema.index({ organization: 1, isActive: 1 });

const Item = mongoose.model<IItem>("Item", itemSchema);

export default Item;
