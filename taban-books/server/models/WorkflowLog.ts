/**
 * Workflow Log Model
 * Tracks workflow rule executions
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IWorkflowLog extends Document {
  organization: mongoose.Types.ObjectId;
  workflowRule: mongoose.Types.ObjectId;
  entityType: string; // "Invoice", "Bill", "Quote", etc.
  entityId: mongoose.Types.ObjectId;
  status: "success" | "failed" | "pending";
  executedAt: Date;
  actionsExecuted: Array<{
    actionType: string; // "send_email", "webhook", "custom_function", etc.
    status: "success" | "failed";
    message?: string;
    executedAt: Date;
  }>;
  error?: string;
  metadata?: Record<string, any>;
}

const workflowLogSchema = new Schema<IWorkflowLog>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    workflowRule: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowRule",
      required: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
    actionsExecuted: [{
      actionType: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["success", "failed"],
        required: true,
      },
      message: String,
      executedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    error: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

workflowLogSchema.index({ organization: 1, executedAt: -1 });
workflowLogSchema.index({ workflowRule: 1 });
workflowLogSchema.index({ entityType: 1, entityId: 1 });

const WorkflowLog = mongoose.model<IWorkflowLog>("WorkflowLog", workflowLogSchema);

export default WorkflowLog;
