/**
 * Workflow Rule Model
 * Automation rules configuration
 */

import mongoose, { Document, Schema } from "mongoose";

type WorkflowType = "event_based" | "date_based";

interface IWorkflowCriterion {
  field: string;
  operator: string;
  value: any;
  joinWith?: "AND" | "OR";
}

interface IWorkflowActionRef {
  actionId?: mongoose.Types.ObjectId;
  type?: string;
  name?: string;
  config?: any;
}

export interface IWorkflowRule extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  module: string; // "Invoice", "Bill", "Quote", etc.
  description?: string;
  workflowType: WorkflowType;
  actionType?: string;
  executeWhen?: string;
  recordEditType?: string;
  selectedFields?: string[];
  criteria: IWorkflowCriterion[];
  criteriaPattern?: string;
  immediateActions: IWorkflowActionRef[];
  timeBasedActions: Array<{
    executionTime: {
      offsetDays?: number;
      relation?: "before" | "after" | "on";
      dateField?: string;
      time?: string;
      frequency?: string;
    };
    actions: IWorkflowActionRef[];
  }>;
  trigger: {
    event: string; // "on_create", "on_update", "on_delete", etc.
    conditions?: Array<{
      field: string;
      operator: string; // "equals", "contains", "greater_than", etc.
      value: any;
    }>;
  };
  actions: Array<{
    type: string; // "send_email", "update_field", "webhook", "custom_function"
    config: any;
  }>;
  isActive: boolean;
  executionOrder: number;
}

const workflowRuleSchema = new Schema<IWorkflowRule>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    description: String,
    workflowType: {
      type: String,
      enum: ["event_based", "date_based"],
      default: "event_based",
    },
    actionType: {
      type: String,
    },
    executeWhen: {
      type: String,
    },
    recordEditType: {
      type: String,
    },
    selectedFields: {
      type: [String],
      default: [],
    },
    criteria: [
      {
        field: String,
        operator: String,
        value: Schema.Types.Mixed,
        joinWith: {
          type: String,
          enum: ["AND", "OR"],
        },
      },
    ],
    criteriaPattern: {
      type: String,
      default: "",
    },
    immediateActions: [
      {
        actionId: {
          type: Schema.Types.ObjectId,
          ref: "WorkflowAction",
        },
        type: String,
        name: String,
        config: Schema.Types.Mixed,
      },
    ],
    timeBasedActions: [
      {
        executionTime: {
          offsetDays: Number,
          relation: {
            type: String,
            enum: ["before", "after", "on"],
          },
          dateField: String,
          time: String,
          frequency: String,
        },
        actions: [
          {
            actionId: {
              type: Schema.Types.ObjectId,
              ref: "WorkflowAction",
            },
            type: String,
            name: String,
            config: Schema.Types.Mixed,
          },
        ],
      },
    ],
    trigger: {
      event: {
        type: String,
        required: true,
      },
      conditions: [{
        field: String,
        operator: String,
        value: Schema.Types.Mixed,
      }],
    },
    actions: [{
      type: {
        type: String,
        required: true,
      },
      config: Schema.Types.Mixed,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    executionOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

workflowRuleSchema.index({ organization: 1, module: 1 });
workflowRuleSchema.index({ organization: 1, isActive: 1 });

const WorkflowRule = mongoose.model<IWorkflowRule>("WorkflowRule", workflowRuleSchema);

export default WorkflowRule;
