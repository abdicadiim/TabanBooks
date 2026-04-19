/**
 * ReminderLog Model
 * Tracks reminder deliveries to avoid duplicate sends.
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IReminderLog extends Document {
  organization: mongoose.Types.ObjectId;
  reminder: mongoose.Types.ObjectId;
  entityType: string; // "Invoice" | "Bill" | etc
  entityId: mongoose.Types.ObjectId;
  scheduledFor: Date; // start of day (local server time)
  attempts: number;
  lastAttemptAt?: Date;
  success: boolean;
  sentAt?: Date;
  to: string[];
  error?: string;
}

const reminderLogSchema = new Schema<IReminderLog>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    reminder: {
      type: Schema.Types.ObjectId,
      ref: "Reminder",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: Date,
    success: {
      type: Boolean,
      default: false,
      index: true,
    },
    sentAt: Date,
    to: {
      type: [String],
      default: [],
    },
    error: String,
  },
  {
    timestamps: true,
  }
);

reminderLogSchema.index(
  { reminder: 1, entityType: 1, entityId: 1, scheduledFor: 1 },
  { unique: true }
);

const ReminderLog = mongoose.model<IReminderLog>("ReminderLog", reminderLogSchema);

export default ReminderLog;

