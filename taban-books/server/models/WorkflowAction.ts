/**
 * Workflow Action Model
 * Stores reusable automation actions (email alerts, webhooks, etc.)
 */

import mongoose, { Document, Schema } from "mongoose";

export type WorkflowActionType =
  | "email_alert"
  | "in_app_notification"
  | "field_update"
  | "webhook"
  | "custom_function";

export interface IWorkflowAction extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  module: string;
  type: WorkflowActionType;
  config: Record<string, any>;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const workflowActionSchema = new Schema<IWorkflowAction>(
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
    type: {
      type: String,
      enum: ["email_alert", "in_app_notification", "field_update", "webhook", "custom_function"],
      required: true,
      index: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

workflowActionSchema.index({ organization: 1, module: 1, type: 1 });
workflowActionSchema.index({ organization: 1, name: 1 });

const WorkflowAction = mongoose.model<IWorkflowAction>("WorkflowAction", workflowActionSchema);

export default WorkflowAction;
