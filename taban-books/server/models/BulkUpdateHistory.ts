import mongoose, { Document, Schema } from "mongoose";

export interface IBulkUpdateTransactionRef {
  type: "bill" | "purchase_order" | "expense" | "vendor_credit" | "credit_note";
  transactionId: string;
  displayNumber?: string;
  date?: Date;
  amount?: number;
  contactName?: string;
  status?: string;
}

export interface IBulkUpdateHistory extends Document {
  organization: mongoose.Types.ObjectId;
  fromAccountId?: string;
  fromAccountName: string;
  toAccountId?: string;
  toAccountName: string;
  filters: {
    contact?: string;
    dateFrom?: Date;
    dateTo?: Date;
    amountFrom?: number;
    amountTo?: number;
    includeInactiveAccounts?: boolean;
  };
  updatedCount: number;
  status: "ongoing" | "completed" | "failed";
  description?: string;
  transactions: IBulkUpdateTransactionRef[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const bulkUpdateTransactionRefSchema = new Schema<IBulkUpdateTransactionRef>(
  {
    type: {
      type: String,
      enum: ["bill", "purchase_order", "expense", "vendor_credit", "credit_note"],
      required: true,
    },
    transactionId: { type: String, required: true },
    displayNumber: String,
    date: Date,
    amount: Number,
    contactName: String,
    status: String,
  },
  { _id: false }
);

const bulkUpdateHistorySchema = new Schema<IBulkUpdateHistory>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    fromAccountId: String,
    fromAccountName: { type: String, required: true },
    toAccountId: String,
    toAccountName: { type: String, required: true },
    filters: {
      contact: String,
      dateFrom: Date,
      dateTo: Date,
      amountFrom: Number,
      amountTo: Number,
      includeInactiveAccounts: { type: Boolean, default: false },
    },
    updatedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ongoing", "completed", "failed"],
      default: "ongoing",
    },
    description: String,
    transactions: {
      type: [bulkUpdateTransactionRefSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

bulkUpdateHistorySchema.index({ organization: 1, createdAt: -1 });
bulkUpdateHistorySchema.index({ organization: 1, status: 1 });

const BulkUpdateHistory = mongoose.model<IBulkUpdateHistory>(
  "BulkUpdateHistory",
  bulkUpdateHistorySchema
);

export default BulkUpdateHistory;
