/**
 * Sales Receipt Model
 * Sales Receipts (immediate payment)
 */

import mongoose, { Document, Schema } from "mongoose";

interface ISalesReceiptItem {
  item?: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'percent' | 'amount';
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

interface ISalesReceiptAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  preview?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
}

interface ISalesReceiptComment {
  id: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  author?: string;
  timestamp?: Date;
}

export interface ISalesReceipt extends Document {
  organization: mongoose.Types.ObjectId;
  receiptNumber: string;
  customer?: mongoose.Types.ObjectId;
  date: Date;
  items: ISalesReceiptItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  discountType?: 'percent' | 'amount';
  shippingCharges?: number;
  shippingChargeTax?: string;
  adjustment?: number;
  total: number;
  status?: 'draft' | 'completed' | 'paid' | 'void';
  currency?: string;
  paymentMethod?: 'cash' | 'check' | 'card' | 'bank_remittance' | 'bank_transfer' | 'other';
  paymentReference?: string;
  depositToAccount?: mongoose.Types.ObjectId;
  emailed?: boolean;
  createdBy?: mongoose.Types.ObjectId;
  notes?: string;
  attachments?: ISalesReceiptAttachment[];
  comments?: ISalesReceiptComment[];
  createdAt?: Date;
  updatedAt?: Date;
}

const salesReceiptItemSchema = new Schema<ISalesReceiptItem>({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  name: String,
  description: String,
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  discountType: {
    type: String,
    enum: ["percent", "amount"],
    default: "percent",
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const salesReceiptAttachmentSchema = new Schema<ISalesReceiptAttachment>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, default: "" },
  size: { type: Number, default: 0 },
  preview: { type: String, default: "" },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: "" },
}, { _id: false });

const salesReceiptCommentSchema = new Schema<ISalesReceiptComment>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false },
  author: { type: String, default: "User" },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const salesReceiptSchema = new Schema<ISalesReceipt>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: [salesReceiptItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["percent", "amount"],
      default: "percent",
    },
    shippingCharges: {
      type: Number,
      default: 0,
    },
    shippingChargeTax: {
      type: String,
      default: "",
      trim: true,
    },
    adjustment: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "completed", "paid", "void"],
      default: "paid",
      lowercase: true,
      trim: true,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "check", "card", "bank_remittance", "bank_transfer", "other"],
    },
    paymentReference: String,
    depositToAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
    },
    emailed: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
    attachments: {
      type: [salesReceiptAttachmentSchema],
      default: []
    },
    comments: {
      type: [salesReceiptCommentSchema],
      default: []
    },
  },
  {
    timestamps: true,
  }
);

salesReceiptSchema.index({ organization: 1, receiptNumber: 1 });
salesReceiptSchema.index({ organization: 1, customer: 1 });
salesReceiptSchema.index({ organization: 1, date: 1 });
salesReceiptSchema.index({ organization: 1, createdAt: -1 });

const SalesReceipt = mongoose.model<ISalesReceipt>("SalesReceipt", salesReceiptSchema);

export default SalesReceipt;
