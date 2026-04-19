/**
 * Vendor Credit Model
 * Vendor Credits
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

interface IVendorCreditItem {
  item?: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface IVendorCredit extends Document {
  organization: mongoose.Types.ObjectId;
  vendorCreditNumber: string;
  orderNumber?: string;
  vendor: mongoose.Types.ObjectId;
  vendorName?: string;
  bill?: mongoose.Types.ObjectId;
  date: Date;
  items: IVendorCreditItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  adjustment?: number;
  total: number;
  balance?: number;
  currency?: string;
  status?: 'draft' | 'open' | 'applied' | 'closed' | 'refunded' | 'cancelled';
  reason?: string;
  subject?: string;
  notes?: string;
  comments?: Array<{
    id?: string;
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
  accountsPayable?: string;
  taxPreference?: 'Tax Inclusive' | 'Tax Exclusive';
  taxLevel?: 'At Transaction Level' | 'At Item Level';
  createdAt?: Date;
  updatedAt?: Date;
}

const vendorCreditItemSchema = new Schema<IVendorCreditItem>({
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
});

const vendorCreditSchema = new Schema<IVendorCredit>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    vendorCreditNumber: {
      type: String,
      required: true,
    },
    orderNumber: {
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
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: [vendorCreditItemSchema],
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
    adjustment: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["draft", "open", "applied", "closed", "refunded", "cancelled"],
      default: "draft",
    },
    reason: String,
    subject: String,
    notes: String,
    comments: [{
      id: String,
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
    accountsPayable: String,
    taxPreference: {
      type: String,
      enum: ["Tax Inclusive", "Tax Exclusive"],
      default: "Tax Inclusive",
    },
    taxLevel: {
      type: String,
      enum: ["At Transaction Level", "At Item Level"],
      default: "At Transaction Level",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to initialize balance from total if not set
vendorCreditSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('total')) {
    if (this.balance === undefined || this.balance === null || (this.isNew && this.balance === 0)) {
      this.balance = this.total;
    }
  }
  next();
});

vendorCreditSchema.index({ organization: 1, vendorCreditNumber: 1 });
vendorCreditSchema.index({ organization: 1, vendor: 1 });
vendorCreditSchema.index({ organization: 1, bill: 1 });
vendorCreditSchema.index({ organization: 1, status: 1 });
vendorCreditSchema.index({ organization: 1, updatedAt: -1 });
registerDashboardHomeInvalidationHooks(vendorCreditSchema);

const VendorCredit = mongoose.model<IVendorCredit>("VendorCredit", vendorCreditSchema);

export default VendorCredit;
