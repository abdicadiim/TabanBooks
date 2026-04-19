/**
 * Workflow Schedule Model
 * Stores automation schedules for custom functions/actions
 */

import mongoose, { Document, Schema } from "mongoose";

export type WorkflowScheduleFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type WorkflowScheduleStatus = "active" | "inactive";

export interface IWorkflowSchedule extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  module: string;
  frequency: WorkflowScheduleFrequency;
  time: string; // HH:mm
  days: string[]; // Used for weekly schedules
  dayOfMonth?: number;
  monthOfYear?: number;
  startDate?: Date;
  endDate?: Date;
  status: WorkflowScheduleStatus;
  functionCode?: string;
  metadata?: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
}

const workflowScheduleSchema = new Schema<IWorkflowSchedule>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
      default: "daily",
    },
    time: {
      type: String,
      required: true,
      default: "09:00",
    },
    days: {
      type: [String],
      default: [],
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
    },
    monthOfYear: {
      type: Number,
      min: 1,
      max: 12,
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    functionCode: String,
    metadata: Schema.Types.Mixed,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

workflowScheduleSchema.index({ organization: 1, module: 1, status: 1 });
workflowScheduleSchema.index({ organization: 1, frequency: 1 });

const WorkflowSchedule = mongoose.model<IWorkflowSchedule>("WorkflowSchedule", workflowScheduleSchema);

export default WorkflowSchedule;
