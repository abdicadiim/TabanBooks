/**
 * Credit Note Model
 * Sales Credit Notes
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

interface ICreditAllocation {
  invoice: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
}

interface ICreditNoteAttachedFile {
  id: string;
  name: string;
  size?: number;
  type?: string;
  mimeType?: string;
  preview?: string;
  url?: string;
  documentId?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
}

interface ICreditNoteComment {
  id: string;
  text: string;
  author?: string;
  timestamp?: Date;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ICreditNoteItem {
  item?: mongoose.Types.ObjectId;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  discount?: number;
  taxId?: mongoose.Types.ObjectId;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  hsnOrSac?: string;
}

export interface ICreditNote extends Document {
  organization: mongoose.Types.ObjectId;
  creditNoteNumber: string;
  customer: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  date: Date;
  referenceNumber?: string;
  items: ICreditNoteItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  currency?: string;
  status?: 'draft' | 'open' | 'void' | 'closed';
  reason?: string;
  notes?: string;
  terms?: string;
  templateId?: string;
  gstTreatment?: string;
  taxTreatment?: string;
  isReverseChargeApplied?: boolean;
  gstNo?: string;
  cfdiUsage?: string;
  cfdiReferenceType?: string;
  placeOfSupply?: string;
  isInclusiveTax?: boolean;
  balance?: number;
  allocations?: ICreditAllocation[];
  attachedFiles?: ICreditNoteAttachedFile[];
  comments?: ICreditNoteComment[];
  journalEntryId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const creditNoteItemSchema = new Schema<ICreditNoteItem>({
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
  unit: String,
  discount: {
    type: Number,
    default: 0,
  },
  taxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tax",
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
  hsnOrSac: String,
});

const creditAllocationSchema = new Schema<ICreditAllocation>({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const creditNoteAttachedFileSchema = new Schema<ICreditNoteAttachedFile>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, default: "" },
  mimeType: { type: String, default: "" },
  preview: { type: String, default: "" },
  url: { type: String, default: "" },
  documentId: { type: String, default: "" },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: "" },
}, { _id: false });

const creditNoteCommentSchema = new Schema<ICreditNoteComment>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  author: { type: String, default: "User" },
  timestamp: { type: Date, default: Date.now },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false },
}, { _id: false });

const creditNoteSchema = new Schema<ICreditNote>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    creditNoteNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    referenceNumber: String,
    items: [creditNoteItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
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
      enum: ["draft", "open", "void", "closed"],
      default: "draft",
    },
    reason: String,
    notes: String,
    terms: String,
    templateId: String,
    gstTreatment: String,
    taxTreatment: String,
    isReverseChargeApplied: {
      type: Boolean,
      default: false,
    },
    gstNo: String,
    cfdiUsage: String,
    cfdiReferenceType: String,
    placeOfSupply: String,
    isInclusiveTax: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0,
    },
    allocations: [creditAllocationSchema],
    attachedFiles: {
      type: [creditNoteAttachedFileSchema],
      default: []
    },
    comments: {
      type: [creditNoteCommentSchema],
      default: []
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
  },
  {
    timestamps: true,
  }
);

creditNoteSchema.index({ organization: 1, creditNoteNumber: 1 }, { unique: true });
creditNoteSchema.index({ organization: 1, customer: 1 });
creditNoteSchema.index({ organization: 1, invoice: 1 });
creditNoteSchema.index({ organization: 1, status: 1 });
creditNoteSchema.index({ organization: 1, updatedAt: -1 });
registerDashboardHomeInvalidationHooks(creditNoteSchema);

const CreditNote = mongoose.model<ICreditNote>("CreditNote", creditNoteSchema);

export default CreditNote;
