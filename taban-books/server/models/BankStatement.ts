/**
 * Bank Statement Model
 * Imported bank/credit card statements
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IBankStatement extends Document {
  organization: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  source: string; // csv, manual, feed, etc.
  transactions: mongoose.Types.ObjectId[]; // References to BankTransaction
  createdAt?: Date;
  updatedAt?: Date;
}

const bankStatementSchema = new Schema<IBankStatement>(
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
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    source: {
      type: String,
      required: true,
      default: "manual",
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BankTransaction",
      },
    ],
  },
  {
    timestamps: true,
  }
);

bankStatementSchema.index({ organization: 1, accountId: 1 });
bankStatementSchema.index({ organization: 1, fromDate: 1, toDate: 1 });

const BankStatement = mongoose.model<IBankStatement>("BankStatement", bankStatementSchema);

export default BankStatement;
