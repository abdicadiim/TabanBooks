/**
 * Transaction Lock Model
 * Lock transactions for specific periods
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ITransactionLock extends Document {
  organization: mongoose.Types.ObjectId;
  module: string;
  lockDate: Date;
  reason?: string;
  isActive?: boolean;
  lockedBy?: mongoose.Types.ObjectId;
  lockedAt?: Date;
  unlockedBy?: mongoose.Types.ObjectId;
  unlockedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const transactionLockSchema = new Schema<ITransactionLock>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    module: {
      type: String,
      required: true,
      enum: [
        "sales", "purchases", "banking", "expenses", "journal-entries", 
        "invoices", "bills", "payments", "receipts", "credit-notes", 
        "vendor-credits", "estimates", "sales-orders", "purchase-orders"
      ],
    },
    lockDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lockedAt: {
      type: Date,
      default: Date.now,
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    unlockedAt: Date,
  },
  {
    timestamps: true,
  }
);

transactionLockSchema.index({ organization: 1, module: 1 });
transactionLockSchema.index({ organization: 1, lockDate: 1 });
transactionLockSchema.index({ organization: 1, isActive: 1 });

const TransactionLock = mongoose.model<ITransactionLock>("TransactionLock", transactionLockSchema);

export default TransactionLock;
