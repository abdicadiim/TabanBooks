/**
 * Custom Report Model
 * Stores user-created report definitions.
 */

import mongoose, { Document, Schema } from "mongoose";

export type CustomReportVisibility = "only_me" | "selected" | "everyone";
export type ReportPermissionLevel = "view_only" | "view_export" | "view_export_schedule";

interface ISharedUser {
  userId: mongoose.Types.ObjectId;
  permission: ReportPermissionLevel;
  skipModuleAccess?: boolean;
}

interface ISharedRole {
  roleId?: mongoose.Types.ObjectId;
  roleName?: string;
  permission: ReportPermissionLevel;
}

export interface ICustomReport extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  exportName?: string;
  description?: string;
  modules?: any;
  general?: {
    dateRange?: string;
    startDate?: Date;
    endDate?: Date;
    reportBasis?: "accrual" | "cash";
    groupBy?: string;
    reportBy?: string;
    filters?: any[];
  };
  columns?: string[];
  layout?: {
    tableDensity?: string;
    tableDesign?: string;
    paperSize?: string;
    orientation?: string;
    fontFamily?: string;
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    showOrganizationName?: boolean;
    showReportBasis?: boolean;
    showPageNumber?: boolean;
    showGeneratedDate?: boolean;
    showGeneratedTime?: boolean;
  };
  visibility?: CustomReportVisibility;
  sharedUsers?: ISharedUser[];
  sharedRoles?: ISharedRole[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isArchived?: boolean;
  lastRunAt?: Date;
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

const customReportSchema = new Schema<ICustomReport>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    exportName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    modules: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    general: {
      type: Schema.Types.Mixed,
      default: {},
    },
    columns: {
      type: [String],
      default: [],
    },
    layout: {
      type: Schema.Types.Mixed,
      default: {},
    },
    visibility: {
      type: String,
      enum: ["only_me", "selected", "everyone"],
      default: "only_me",
    },
    sharedUsers: {
      type: [sharedUserSchema],
      default: [],
    },
    sharedRoles: {
      type: [sharedRoleSchema],
      default: [],
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
    isArchived: {
      type: Boolean,
      default: false,
    },
    lastRunAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

customReportSchema.index({ organization: 1, name: 1 });
customReportSchema.index({ organization: 1, createdBy: 1 });
customReportSchema.index({ organization: 1, visibility: 1 });
customReportSchema.index({ organization: 1, isArchived: 1 });

const CustomReport =
  (mongoose.models.CustomReport as mongoose.Model<ICustomReport>) ||
  mongoose.model<ICustomReport>("CustomReport", customReportSchema);

export default CustomReport;
