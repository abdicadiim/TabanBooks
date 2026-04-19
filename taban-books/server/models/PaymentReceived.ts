/**
 * Payment Received Model
 * Customer Payments
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

interface IPaymentAllocation {
  invoice: mongoose.Types.ObjectId;
  amount: number;
}

interface IPaymentAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  preview?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
}

interface IPaymentComment {
  id: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  author?: string;
  timestamp?: Date;
}

export interface IPaymentReceived extends Document {
  organization: mongoose.Types.ObjectId;
  paymentNumber: string;
  customer: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  status?: 'draft' | 'paid' | 'partially paid' | 'void';
  currency?: string;
  paymentMethod: 'cash' | 'check' | 'card' | 'bank_remittance' | 'bank_transfer' | 'other';
  paymentReference?: string;
  bankAccount?: mongoose.Types.ObjectId;
  depositTo?: mongoose.Types.ObjectId; // For migration/legacy support
  journalEntryId?: mongoose.Types.ObjectId;
  allocations: IPaymentAllocation[];
  notes?: string;
  attachments?: IPaymentAttachment[];
  comments?: IPaymentComment[];
  emailed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentAllocationSchema = new Schema<IPaymentAllocation>({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const paymentAttachmentSchema = new Schema<IPaymentAttachment>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, default: "" },
  size: { type: Number, default: 0 },
  preview: { type: String, default: "" },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: "" },
}, { _id: false });

const paymentCommentSchema = new Schema<IPaymentComment>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  bold: { type: Boolean, default: false },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false },
  author: { type: String, default: "User" },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const paymentReceivedSchema = new Schema<IPaymentReceived>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'paid', 'partially paid', 'void'],
      default: 'paid'
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
    depositTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    allocations: [paymentAllocationSchema],
    notes: String,
    attachments: {
      type: [paymentAttachmentSchema],
      default: []
    },
    comments: {
      type: [paymentCommentSchema],
      default: []
    },
    emailed: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
  }
);

paymentReceivedSchema.index({ organization: 1, paymentNumber: 1 });
paymentReceivedSchema.index({ organization: 1, customer: 1 });
paymentReceivedSchema.index({ organization: 1, date: 1 });
paymentReceivedSchema.index({ organization: 1, createdAt: -1 });
paymentReceivedSchema.index({ organization: 1, updatedAt: -1 });
registerDashboardHomeInvalidationHooks(paymentReceivedSchema);

const PaymentReceived = mongoose.model<IPaymentReceived>("PaymentReceived", paymentReceivedSchema);

export default PaymentReceived;
