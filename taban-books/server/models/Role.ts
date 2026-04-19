/**
 * Role Model
 * Custom roles with granular permissions
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  name: string;
  description?: string;
  isAccountantRole: boolean;
  organization: mongoose.Types.ObjectId;
  contacts: any;
  items: any;
  banking: any;
  sales: any;
  purchases: any;
  accountant: any;
  timesheets: any;
  locations: any;
  vatFiling: any;
  documents: any;
  settings: any;
  dashboard: any;
  reports: {
    fullReportsAccess?: boolean;
    reportGroups?: any;
  };
  isActive: boolean;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isAccountantRole: {
      type: Boolean,
      default: false,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    // Contacts permissions
    contacts: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Items permissions
    items: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Banking permissions
    banking: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Sales permissions
    sales: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Purchases permissions
    purchases: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Accountant permissions
    accountant: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Timesheets permissions
    timesheets: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Locations permissions
    locations: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // VAT Filing permissions
    vatFiling: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Documents permissions
    documents: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Settings permissions
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Dashboard permissions
    dashboard: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Reports permissions
    reports: {
      fullReportsAccess: Boolean,
      // Report groups permissions - using Mixed type for flexibility
      reportGroups: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
roleSchema.index({ organization: 1, name: 1 });
roleSchema.index({ organization: 1, isActive: 1 });

const Role = mongoose.model<IRole>("Role", roleSchema);

export default Role;

