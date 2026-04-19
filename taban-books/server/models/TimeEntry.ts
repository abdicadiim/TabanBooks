/**
 * Time Entry Model
 * Time Tracking Entries
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ITimeEntry extends Document {
  organization: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  minutes: number;
  description?: string;
  billable: boolean;
  billingRate: number;
  task?: string;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    minutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 59,
    },
    description: String,
    billable: {
      type: Boolean,
      default: true,
    },
    billingRate: {
      type: Number,
      default: 0,
    },
    task: String,
  },
  {
    timestamps: true,
  }
);

timeEntrySchema.index({ organization: 1, project: 1 });
timeEntrySchema.index({ organization: 1, user: 1 });
timeEntrySchema.index({ organization: 1, date: 1 });

const TimeEntry = mongoose.model<ITimeEntry>("TimeEntry", timeEntrySchema);

export default TimeEntry;

