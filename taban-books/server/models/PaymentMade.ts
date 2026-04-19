/**
 * Payment Made Model
 * Vendor Payments
 */

import mongoose, { Document, Schema } from "mongoose";

interface IPaymentAllocation {
  bill: mongoose.Types.ObjectId;
  amount: number;
}

export interface IPaymentMade extends Document {
  organization: mongoose.Types.ObjectId;
  paymentNumber: string;
  vendor: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  currency?: string;
  paymentMethod: 'cash' | 'check' | 'card' | 'bank_remittance' | 'bank_transfer' | 'other';
  paymentReference?: string;
  bankAccount?: mongoose.Types.ObjectId;
  paidThrough?: mongoose.Types.ObjectId; // For migration/legacy
  journalEntryId?: mongoose.Types.ObjectId;
  allocations: IPaymentAllocation[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentAllocationSchema = new Schema<IPaymentAllocation>({
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bill",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const paymentMadeSchema = new Schema<IPaymentMade>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    paymentNumber: {
      type: String,
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "check", "card", "bank_remittance", "bank_transfer", "other"],
      required: true,
    },
    paymentReference: String,
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    paidThrough: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    allocations: [paymentAllocationSchema],
    notes: String,
  },
  {
    timestamps: true,
  }
);

paymentMadeSchema.index({ organization: 1, paymentNumber: 1 });
paymentMadeSchema.index({ organization: 1, vendor: 1 });
paymentMadeSchema.index({ organization: 1, date: 1 });
paymentMadeSchema.index({ organization: 1, createdAt: -1 });

const PaymentMade = mongoose.model<IPaymentMade>("PaymentMade", paymentMadeSchema);

export default PaymentMade;
