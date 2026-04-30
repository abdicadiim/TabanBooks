/**
 * Journal Entry Model
 * Manual Journal Entries
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

interface IJournalLine {
  lineId?: string;
  account: string;
  accountName?: string;
  customerId?: string;
  customerName?: string;
  contact?: string;
  description?: string;
  type?: string;
  taxId?: string;
  taxName?: string;
  tax?: any;
  amount?: number;
  debitOrCredit?: "debit" | "credit";
  debit?: number;
  credit?: number;
  project?: any;
  projectName?: string;
  reportingTags?: string;
  tags?: any[];
  locationId?: string;
}

export interface IJournalEntry extends Document {
  organization: mongoose.Types.ObjectId;
  entryNumber: string;
  date: Date;
  lines: IJournalLine[];
  amount?: number;
  notes?: string;
  description?: string;
  reference?: string;
  reportingMethod?: "accrual-and-cash" | "accrual-only" | "cash-only";
  currency?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'cancelled';
  createdBy?: mongoose.Types.ObjectId;
  postedBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  sourceId?: mongoose.Types.ObjectId;
  sourceType?: 'invoice' | 'bill' | 'expense' | 'payment_received' | 'payment_made' | 'credit_note' | 'vendor_credit' | 'inventory_adjustment' | 'manual_journal' | 'sales_receipt' | 'refund';
  createdAt?: Date;
  updatedAt?: Date;
}

const journalLineSchema = new Schema<IJournalLine>({
  lineId: String,
  account: {
    type: String,
    required: true,
  },
  accountName: String,
  customerId: String,
  customerName: String,
  contact: String,
  description: String,
  type: String,
  taxId: String,
  taxName: String,
  tax: Schema.Types.Mixed,
  amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  debitOrCredit: {
    type: String,
    enum: ["debit", "credit"],
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
  },
  project: {
    type: Schema.Types.Mixed,
  },
  projectName: String,
  reportingTags: String,
  tags: [Schema.Types.Mixed],
  locationId: String,
});

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    entryNumber: {
      type: String,
      required: true,
      // unique: true, // REMOVED: Uniqueness handled by compound index with organization
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lines: {
      type: [journalLineSchema],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: String,
    description: String,
    reference: String,
    reportingMethod: {
      type: String,
      enum: ["accrual-and-cash", "accrual-only", "cash-only"],
      default: "accrual-and-cash",
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "posted", "cancelled"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    postedAt: Date,
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    sourceType: {
      type: String,
      enum: ["invoice", "bill", "expense", "payment_received", "payment_made", "credit_note", "vendor_credit", "inventory_adjustment", "manual_journal", "sales_receipt", "refund"],
    },
  },
  {
    timestamps: true,
  }
);

journalEntrySchema.index({ organization: 1, entryNumber: 1 });
journalEntrySchema.index({ organization: 1, date: 1 });
journalEntrySchema.index({ organization: 1, status: 1 });
journalEntrySchema.index({ organization: 1, status: 1, date: 1 });
journalEntrySchema.index({ organization: 1, createdAt: -1 });
journalEntrySchema.index({ organization: 1, updatedAt: -1 });
journalEntrySchema.index({ organization: 1, sourceType: 1, sourceId: 1 });
registerDashboardHomeInvalidationHooks(journalEntrySchema);

const JournalEntry = (mongoose.models.JournalEntry as mongoose.Model<IJournalEntry>) || mongoose.model<IJournalEntry>("JournalEntry", journalEntrySchema);

export default JournalEntry;
