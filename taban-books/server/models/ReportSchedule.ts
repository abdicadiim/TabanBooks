/**
 * Report Schedule Model
 * Stores scheduled report delivery configurations.
 */

import mongoose, { Document, Schema } from "mongoose";

export type ScheduleFrequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type ScheduleFormat = "pdf" | "csv" | "xlsx";
export type ScheduleStatus = "active" | "inactive";

interface IScheduleRecipient {
  userId?: mongoose.Types.ObjectId;
  email: string;
}

export interface IReportSchedule extends Document {
  organization: mongoose.Types.ObjectId;
  reportKey: string;
  reportName: string;
  reportType: "system" | "custom";
  customReportId?: mongoose.Types.ObjectId;
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
  time: string; // HH:mm
  timezone: string;
  recipients: IScheduleRecipient[];
  format: ScheduleFormat;
  status: ScheduleStatus;
  nextRunAt?: Date;
  lastRunAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const recipientSchema = new Schema<IScheduleRecipient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  { _id: false }
);

const reportScheduleSchema = new Schema<IReportSchedule>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    reportKey: {
      type: String,
      required: true,
      trim: true,
    },
    reportName: {
      type: String,
      required: true,
      trim: true,
    },
    reportType: {
      type: String,
      enum: ["system", "custom"],
      default: "system",
      required: true,
    },
    customReportId: {
      type: Schema.Types.ObjectId,
      ref: "CustomReport",
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "yearly"],
      required: true,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
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
    time: {
      type: String,
      required: true,
      default: "09:00",
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },
    recipients: {
      type: [recipientSchema],
      default: [],
    },
    format: {
      type: String,
      enum: ["pdf", "csv", "xlsx"],
      default: "pdf",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    nextRunAt: {
      type: Date,
    },
    lastRunAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

reportScheduleSchema.index({ organization: 1, reportKey: 1 });
reportScheduleSchema.index({ organization: 1, status: 1 });
reportScheduleSchema.index({ organization: 1, nextRunAt: 1 });
reportScheduleSchema.index({ organization: 1, createdBy: 1 });

const ReportSchedule =
  (mongoose.models.ReportSchedule as mongoose.Model<IReportSchedule>) ||
  mongoose.model<IReportSchedule>("ReportSchedule", reportScheduleSchema);

export default ReportSchedule;

