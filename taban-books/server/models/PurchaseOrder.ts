/**
 * Purchase Order Model
 * Purchase Orders
 */

import mongoose, { Document, Schema } from "mongoose";

interface IPurchaseOrderItem {
  item?: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  account?: string;
}

export interface IPurchaseOrder extends Document {
  organization: mongoose.Types.ObjectId;
  purchaseOrderNumber: string;
  vendor: mongoose.Types.ObjectId;
  vendorName?: string;
  date: Date;
  expectedDate?: Date;
  items: IPurchaseOrderItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  currency?: string;
  status?: 'draft' | 'sent' | 'acknowledged' | 'received' | 'partially_received' | 'cancelled' | 'closed' | 'issued' | 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'CANCELLED' | 'CLOSED' | 'ISSUED';
  billedStatus?: 'YET TO BE BILLED' | 'BILLED';
  notes?: string;
  terms?: string;
  comments?: Array<{
    text?: string;
    author?: string;
    createdAt?: Date;
  }>;
  attachments?: Array<{
    id?: string;
    name?: string;
    url?: string;
    size?: number;
    type?: string;
    uploadedAt?: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
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
  account: {
    type: String,
  },
});

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    purchaseOrderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    vendorName: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDate: {
      type: Date,
    },
    items: [purchaseOrderItemSchema],
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
    total: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    status: {
      type: String,
      enum: [
        "draft", "sent", "acknowledged", "received", "partially_received", "cancelled", "closed", "issued",
        "DRAFT", "SENT", "ACKNOWLEDGED", "RECEIVED", "PARTIALLY_RECEIVED", "CANCELLED", "CLOSED", "ISSUED"
      ],
      default: "draft",
    },
    billedStatus: {
      type: String,
      enum: ["YET TO BE BILLED", "BILLED"],
      default: "YET TO BE BILLED",
    },
    notes: String,
    terms: String,
    comments: [{
      text: { type: String, trim: true },
      author: { type: String, trim: true },
      createdAt: { type: Date, default: Date.now },
    }],
    attachments: [{
      id: String,
      name: String,
      url: String,
      size: Number,
      type: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

purchaseOrderSchema.index({ organization: 1, purchaseOrderNumber: 1 });
purchaseOrderSchema.index({ organization: 1, vendor: 1 });
purchaseOrderSchema.index({ organization: 1, status: 1 });

const PurchaseOrder = mongoose.model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema);

export default PurchaseOrder;
