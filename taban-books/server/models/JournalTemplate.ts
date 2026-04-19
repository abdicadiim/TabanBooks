/**
 * Journal Template Model
 * Templates for recurring journal entries
 */

import mongoose, { Document, Schema } from "mongoose";

interface IJournalTemplateLine {
  account: string;
  accountName?: string;
  description?: string;
  contact?: string;
  type?: "debit" | "credit";
  tax?: string;
  debit?: number;
  credit?: number;
  project?: mongoose.Types.ObjectId;
}

export interface IJournalTemplate extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  referenceNumber?: string;
  notes: string;
  reportingMethod?: "accrual-and-cash" | "accrual-only" | "cash-only";
  projectName?: string;
  currency?: string;
  enterAmount?: boolean;
  description?: string;
  lines: IJournalTemplateLine[];
  isActive?: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const journalTemplateLineSchema = new Schema<IJournalTemplateLine>({
  account: {
    type: String,
    required: true,
  },
  accountName: String,
  description: String,
  contact: String,
  type: {
    type: String,
    enum: ["debit", "credit"],
  },
  tax: String,
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
});

const journalTemplateSchema = new Schema<IJournalTemplate>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      required: [true, "Notes are required"],
      trim: true,
    },
    reportingMethod: {
      type: String,
      enum: ["accrual-and-cash", "accrual-only", "cash-only"],
      default: "accrual-and-cash",
    },
    projectName: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    enterAmount: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    lines: {
      type: [journalTemplateLineSchema],
      required: true,
      validate: {
        validator: function (lines: IJournalTemplateLine[]) {
          const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
          const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
          return Math.abs(totalDebit - totalCredit) < 0.01; // Allow small rounding differences
        },
        message: "Total debits must equal total credits",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

journalTemplateSchema.index({ organization: 1, name: 1 });
journalTemplateSchema.index({ organization: 1, isActive: 1 });

const JournalTemplate = mongoose.model<IJournalTemplate>("JournalTemplate", journalTemplateSchema);

export default JournalTemplate;
