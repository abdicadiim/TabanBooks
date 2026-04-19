/**
 * Reminder Model
 * Automated reminder configuration
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IReminder extends Document {
  organization: mongoose.Types.ObjectId;
  /**
   * Optional stable key used by the UI to identify built-in reminders
   * (e.g. "payment-expected-invoices").
   */
  key?: string;
  name: string;
  type: "invoice_overdue" | "payment_due" | "bill_due" | "custom";
  entityType: string; // "Invoice", "Bill", etc.
  conditions: {
    daysBefore?: number;
    daysAfter?: number;
    basedOn?: "dueDate" | "expectedPaymentDate";
    status?: string[];
  };
  recipients: {
    customer: boolean;
    vendor: boolean;
    internalUsers: mongoose.Types.ObjectId[];
    customEmails: string[];
  };
  email?: {
    from?: string;
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
  };
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    key: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["invoice_overdue", "payment_due", "bill_due", "custom"],
      required: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    conditions: {
      daysBefore: Number,
      daysAfter: Number,
      basedOn: {
        type: String,
        enum: ["dueDate", "expectedPaymentDate"],
      },
      status: [String],
    },
    recipients: {
      customer: { type: Boolean, default: false },
      vendor: { type: Boolean, default: false },
      internalUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
      customEmails: [String],
    },
    email: {
      from: { type: String, trim: true },
      cc: [{ type: String, trim: true }],
      bcc: [{ type: String, trim: true }],
      subject: { type: String },
      body: { type: String },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRun: Date,
    nextRun: Date,
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ organization: 1, isActive: 1 });
reminderSchema.index({ nextRun: 1 });
reminderSchema.index({ organization: 1, key: 1 }, { unique: true, sparse: true });

const Reminder = mongoose.model<IReminder>("Reminder", reminderSchema);

export default Reminder;
