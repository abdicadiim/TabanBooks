/**
 * Bill Model
 * Purchase Bills
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

interface IBillItem {
  item?: mongoose.Types.ObjectId;
  account?: mongoose.Types.ObjectId | string;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface IBill extends Document {
  organization: mongoose.Types.ObjectId;
  billNumber: string;
  orderNumber?: string;
  referenceNumber?: string;
  vendor: mongoose.Types.ObjectId;
  vendorName?: string;
  date: Date;
  dueDate: Date;
  items: IBillItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  currency?: string;
  status?: 'draft' | 'open' | 'paid' | 'partially paid' | 'overdue' | 'void' | 'cancelled';
  paymentTerms?: string;
  accountsPayable?: string;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  warehouseLocationId?: mongoose.Types.ObjectId;
  warehouseLocationName?: string;
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
  paidAmount?: number;
  vendorCreditsApplied?: number;
  balance?: number;
  isRecurring?: boolean;
  fromPurchaseOrder?: boolean;
  purchaseOrderId?: mongoose.Types.ObjectId;
  journalEntryCreated?: boolean;
  journalEntryId?: mongoose.Types.ObjectId;
  recurringSchedule?: {
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    nextDate?: Date;
    endDate?: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const billItemSchema = new Schema<IBillItem>({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  account: {
    type: mongoose.Schema.Types.Mixed, // Can be ID or name
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
});

const billSchema = new Schema<IBill>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderNumber: {
      type: String,
      default: "",
    },
    referenceNumber: {
      type: String,
      default: "",
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
    dueDate: {
      type: Date,
      required: true,
    },
    items: [billItemSchema],
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
      enum: ["draft", "open", "paid", "partially paid", "overdue", "void", "cancelled"],
      default: "open",
    },
    paymentTerms: String,
    accountsPayable: String,
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    locationName: String,
    warehouseLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    warehouseLocationName: String,
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
    paidAmount: {
      type: Number,
      default: 0,
    },
    vendorCreditsApplied: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    fromPurchaseOrder: {
      type: Boolean,
      default: false,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    journalEntryCreated: {
      type: Boolean,
      default: false,
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    recurringSchedule: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
      },
      nextDate: Date,
      endDate: Date,
    },
  },
  {
    timestamps: true,
  }
);

billSchema.index({ organization: 1, billNumber: 1 });
billSchema.index({ organization: 1, vendor: 1 });
billSchema.index({ organization: 1, date: 1 });
billSchema.index({ organization: 1, status: 1 });
billSchema.index({ organization: 1, createdAt: -1 });
billSchema.index({ organization: 1, updatedAt: -1 });
billSchema.index({ organization: 1, dueDate: 1 });
billSchema.index({ organization: 1, balance: 1 });

// Pre-save hook to initialize balance from total if not set
billSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('total')) {
    if (this.balance === undefined || this.balance === null || (this.isNew && this.balance === 0)) {
      this.balance = this.total;
    }
  }
  next();
});
registerDashboardHomeInvalidationHooks(billSchema);

const Bill = mongoose.model<IBill>("Bill", billSchema);

export default Bill;
