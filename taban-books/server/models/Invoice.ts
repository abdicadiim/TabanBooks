/**
 * Invoice Model
 * Sales Invoices
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

interface IInvoiceItem {
  item?: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface IInvoice extends Document {
  organization: mongoose.Types.ObjectId;
  invoiceNumber: string;
  orderNumber?: string;
  customer: mongoose.Types.ObjectId;
  date: Date;
  dueDate: Date;
  expectedPaymentDate?: Date;
  items: IInvoiceItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  shippingCharges?: number;
  shippingChargeTax?: string;
  adjustment?: number;
  total: number;
  currency?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'partially paid' | 'overdue' | 'void';
  paymentTerms?: string;
  notes?: string;
  terms?: string;
  paidAmount?: number;
  creditsApplied?: number;
  balance?: number;
  accountsReceivable?: string;
  convertedFromQuote?: mongoose.Types.ObjectId;
  journalEntryCreated?: boolean;
  journalEntryId?: mongoose.Types.ObjectId;
  voidJournalEntryId?: mongoose.Types.ObjectId;
  isRecurringInvoice?: boolean;
  recurringProfileId?: mongoose.Types.ObjectId;
  recurringInvoiceId?: mongoose.Types.ObjectId;
  comments?: any[];
  attachments?: any[];
  remindersStopped?: boolean;
  remindersStoppedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
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

const invoiceCommentSchema = new Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  author: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  bold: Boolean,
  italic: Boolean,
  underline: Boolean,
});

const invoiceAttachmentSchema = new Schema({
  id: { type: mongoose.Schema.Types.Mixed, required: true }, // Can be Number or String
  name: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true },
  preview: String,
});

const invoiceSchema = new Schema<IInvoice>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      default: "",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
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
    expectedPaymentDate: {
      type: Date,
    },
    items: [invoiceItemSchema],
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
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "partially paid", "overdue", "void"],
      default: "draft",
    },
    paymentTerms: String,
    notes: String,
    terms: String,
    paidAmount: {
      type: Number,
      default: 0,
    },
    creditsApplied: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    accountsReceivable: String,
    convertedFromQuote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
    },
    journalEntryCreated: {
      type: Boolean,
      default: false,
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    voidJournalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    isRecurringInvoice: {
      type: Boolean,
      default: false,
    },
    recurringProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringInvoice",
    },
    recurringInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringInvoice",
    },
    comments: [invoiceCommentSchema],
    attachments: [invoiceAttachmentSchema],
    remindersStopped: {
      type: Boolean,
      default: false,
    },
    remindersStoppedAt: Date,
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ organization: 1, invoiceNumber: 1 });
invoiceSchema.index({ organization: 1, customer: 1 });
invoiceSchema.index({ organization: 1, date: 1 });
invoiceSchema.index({ organization: 1, status: 1 });
invoiceSchema.index({ organization: 1, createdAt: -1 });
invoiceSchema.index({ organization: 1, updatedAt: -1 });
invoiceSchema.index({ organization: 1, dueDate: 1 });
invoiceSchema.index({ organization: 1, expectedPaymentDate: 1 });
invoiceSchema.index({ organization: 1, balance: 1 });
registerDashboardHomeInvalidationHooks(invoiceSchema);

const Invoice = (mongoose.models.Invoice as mongoose.Model<IInvoice>) || mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;
