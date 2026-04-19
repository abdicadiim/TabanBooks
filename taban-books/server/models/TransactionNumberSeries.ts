/**
 * Transaction Number Series Model
 * Document numbering configuration for invoices, quotes, bills, etc.
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ITransactionNumberSeries extends Document {
  organization: mongoose.Types.ObjectId;
  seriesName?: string; // Name for the series group
  module: string; // "Invoice", "Quote", "Bill", "Credit Note", etc.
  prefix: string; // "INV", "QT-", "BILL", etc.
  startingNumber: string; // "000001", "1", etc. (stored as string to preserve leading zeros)
  currentNumber: number; // Current number in the series
  restartNumbering: "none" | "yearly" | "monthly"; // When to restart numbering
  isDefault: boolean; // Default series for this module
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const transactionNumberSeriesSchema = new Schema<ITransactionNumberSeries>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    seriesName: {
      type: String,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    prefix: {
      type: String,
      default: "",
      trim: true,
    },
    startingNumber: {
      type: String,
      required: true,
      trim: true,
    },
    currentNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    restartNumbering: {
      type: String,
      enum: ["none", "yearly", "monthly"],
      default: "none",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionNumberSeriesSchema.index({ organization: 1, module: 1 });
transactionNumberSeriesSchema.index({ organization: 1, isDefault: 1 });
transactionNumberSeriesSchema.index({ organization: 1, isActive: 1 });

// Ensure only one default series per module per organization
transactionNumberSeriesSchema.pre("save", async function (next) {
  try {
    if (this.isDefault && this.isModified("isDefault")) {
      await (this.constructor as any).updateMany(
        {
          organization: this.organization,
          module: this.module,
          _id: { $ne: this._id },
        },
        { $set: { isDefault: false } }
      );
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

const TransactionNumberSeries = mongoose.model<ITransactionNumberSeries>(
  "TransactionNumberSeries",
  transactionNumberSeriesSchema
);

export default TransactionNumberSeries;
