/**
 * Project Model
 * Projects
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

export interface IProject extends Document {
  organization: mongoose.Types.ObjectId;
  projectNumber: string;
  name: string;
  customer?: mongoose.Types.ObjectId;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  budget: number;
  currency: string;
  billable: boolean;
  billingRate: number;
  assignedTo: mongoose.Types.ObjectId[];
  tags: string[];
  hoursBudgetType: "total-project-hours" | "hours-per-task" | "hours-per-staff" | "";
  totalBudgetHours: string;
  tasks: Array<{
    taskName?: string;
    description?: string;
    billable: boolean;
    budgetHours: string;
  }>;
  comments?: Array<{
    id: string;
    text: string;
    content?: string;
    authorName?: string;
    authorInitial?: string;
    createdAt: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }>;
  userBudgetHours: Array<{
    user: mongoose.Types.ObjectId;
    budgetHours: string;
  }>;
}

const projectCommentSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    authorName: {
      type: String,
      default: "You",
    },
    authorInitial: {
      type: String,
      default: "Y",
    },
    createdAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
    bold: {
      type: Boolean,
      default: false,
    },
    italic: {
      type: Boolean,
      default: false,
    },
    underline: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    projectNumber: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },
    description: String,
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    budget: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    billable: {
      type: Boolean,
      default: true,
    },
    billingRate: {
      type: Number,
      default: 0,
    },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    tags: [String],
    // Budget hours fields
    hoursBudgetType: {
      type: String,
      enum: ["total-project-hours", "hours-per-task", "hours-per-staff", ""],
      default: "",
    },
    totalBudgetHours: {
      type: String, // Stored as "HH:MM" format
      default: "",
    },
    tasks: [
      {
        taskName: String,
        description: String,
        billable: {
          type: Boolean,
          default: true,
        },
        budgetHours: String, // Stored as "HH:MM" format
      },
    ],
    comments: {
      type: [projectCommentSchema],
      default: [],
    },
    userBudgetHours: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        budgetHours: String, // Stored as "HH:MM" format
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ organization: 1, projectNumber: 1 });
projectSchema.index({ organization: 1, customer: 1 });
projectSchema.index({ organization: 1, status: 1 });
projectSchema.index({ organization: 1, updatedAt: -1 });
registerDashboardHomeInvalidationHooks(projectSchema);

const Project = mongoose.model<IProject>("Project", projectSchema);

export default Project;

