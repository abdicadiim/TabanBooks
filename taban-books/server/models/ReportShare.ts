/**
 * Report Share Model
 * Stores share settings for system and custom reports.
 */

import mongoose, { Document, Schema } from "mongoose";

export type ReportSharePermission = "view_only" | "view_export" | "view_export_schedule";

interface ISharedUser {
  userId: mongoose.Types.ObjectId;
  permission: ReportSharePermission;
  skipModuleAccess?: boolean;
}

interface ISharedRole {
  roleId?: mongoose.Types.ObjectId;
  roleName?: string;
  permission: ReportSharePermission;
}

export interface IReportShare extends Document {
  organization: mongoose.Types.ObjectId;
  reportKey: string;
  reportName: string;
  reportType: "system" | "custom";
  customReportId?: mongoose.Types.ObjectId;
  sharedUsers: ISharedUser[];
  sharedRoles: ISharedRole[];
  updatedBy?: mongoose.Types.ObjectId;
}

const sharedUserSchema = new Schema<ISharedUser>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permission: {
      type: String,
      enum: ["view_only", "view_export", "view_export_schedule"],
      default: "view_only",
    },
    skipModuleAccess: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const sharedRoleSchema = new Schema<ISharedRole>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
    roleName: {
      type: String,
      trim: true,
    },
    permission: {
      type: String,
      enum: ["view_only", "view_export", "view_export_schedule"],
      default: "view_only",
    },
  },
  { _id: false }
);

const reportShareSchema = new Schema<IReportShare>(
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
      required: true,
      default: "system",
    },
    customReportId: {
      type: Schema.Types.ObjectId,
      ref: "CustomReport",
    },
    sharedUsers: {
      type: [sharedUserSchema],
      default: [],
    },
    sharedRoles: {
      type: [sharedRoleSchema],
      default: [],
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

reportShareSchema.index({ organization: 1, reportKey: 1 }, { unique: true });
reportShareSchema.index({ organization: 1, reportType: 1 });

const ReportShare =
  (mongoose.models.ReportShare as mongoose.Model<IReportShare>) ||
  mongoose.model<IReportShare>("ReportShare", reportShareSchema);

export default ReportShare;

