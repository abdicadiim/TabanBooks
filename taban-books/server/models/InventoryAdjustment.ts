/**
 * Inventory Adjustment Model
 * Inventory Adjustments
 */

import mongoose, { Document, Schema } from "mongoose";

interface IAdjustmentItem {
  item: mongoose.Types.ObjectId;
  quantityOnHand: number;
  quantityAdjusted: number;
  newQuantity: number;
  reason?: string;
  cost?: number;
}

export interface IInventoryAdjustment extends Document {
  organization: mongoose.Types.ObjectId;
  adjustmentNumber: string;
  referenceNumber?: string;
  date: Date;
  type: 'increase' | 'decrease' | 'set' | 'Quantity' | 'Value';
  items: IAdjustmentItem[];
  reason?: string;
  notes?: string;
  reference?: string;
  status?: string;
  account?: string;
  comments?: Array<{
    author?: string;
    timestamp?: Date;
    text?: string;
  }>;
  attachments?: Array<{
    name?: string;
    size?: string;
    type?: string;
    preview?: string;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: mongoose.Types.ObjectId | any;
  lastModifiedBy?: mongoose.Types.ObjectId | any;
}

const adjustmentItemSchema = new Schema<IAdjustmentItem>({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  quantityOnHand: {
    type: Number,
    required: true,
  },
  quantityAdjusted: {
    type: Number,
    required: true,
  },
  newQuantity: {
    type: Number,
    required: true,
  },
  reason: String,
  cost: {
    type: Number,
    default: 0,
  },
});

const attachmentSchema = new Schema({
  name: { type: String },
  size: { type: String },
  type: { type: String },
  preview: { type: String }
}, { _id: false });

const inventoryAdjustmentSchema = new Schema<IInventoryAdjustment>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    adjustmentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    referenceNumber: String,
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ["increase", "decrease", "set", "Quantity", "Value"],
      required: true,
    },
    items: [adjustmentItemSchema],
    reason: String,
    notes: String,
    reference: String,
    status: {
      type: String,
      default: "DRAFT",
    },
    account: String,
    comments: [{
      author: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      text: String
    }],
    attachments: [attachmentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
  }
);

inventoryAdjustmentSchema.index({ organization: 1, adjustmentNumber: 1 });
inventoryAdjustmentSchema.index({ organization: 1, date: 1 });

const InventoryAdjustment = mongoose.model<IInventoryAdjustment>("InventoryAdjustment", inventoryAdjustmentSchema);

export default InventoryAdjustment;
