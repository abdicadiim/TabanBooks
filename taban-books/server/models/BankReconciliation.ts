/**
 * Bank Reconciliation Model
 * Stores reconciliation periods and linked bank transactions.
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IBankReconciliation extends Document {
  organization: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  closingBalance: number;
  clearedAmount: number;
  difference: number;
  status: "reconciled" | "undone";
  reconciledTransactions: mongoose.Types.ObjectId[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  reconciledAt?: Date;
  undoneAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const bankReconciliationSchema = new Schema<IBankReconciliation>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    closingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    clearedAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    difference: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["reconciled", "undone"],
      default: "reconciled",
    },
    reconciledTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BankTransaction",
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reconciledAt: {
      type: Date,
      default: Date.now,
    },
    undoneAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bankReconciliationSchema.index({ organization: 1, accountId: 1, endDate: -1 });
bankReconciliationSchema.index({ organization: 1, accountId: 1, status: 1 });

const BankReconciliation = mongoose.model<IBankReconciliation>(
  "BankReconciliation",
  bankReconciliationSchema
);

export default BankReconciliation;

