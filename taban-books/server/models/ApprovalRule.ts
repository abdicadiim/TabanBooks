/**
 * Approval Rule Model
 * Multi-criteria and multi-step approval configurations
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IApprovalRule extends Document {
    organization: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    module: string; // "Quote", "Invoice", etc.
    criteria: Array<{
        field: string;
        comparator: string;
        value: string;
        isRelative?: boolean;
        relativeDays?: string;
        relativeType?: string;
        relativeBase?: string;
        operator?: 'AND' | 'OR';
    }>;
    criteriaPattern?: string;
    approvalMode: 'configure' | 'auto-approve' | 'auto-reject';
    approverSteps: Array<{
        type: 'manual' | 'lookup';
        value: string;
    }>;
    isActive: boolean;
    priority: number;
}

const approvalRuleSchema = new Schema<IApprovalRule>(
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
            required: true, // "Quote", "Invoice", etc.
        },
        description: String,
        criteria: [{
            field: String,
            comparator: String,
            value: String,
            isRelative: Boolean,
            relativeDays: String,
            relativeType: String,
            relativeBase: String,
            operator: {
                type: String,
                enum: ['AND', 'OR'],
                default: 'AND'
            }
        }],
        criteriaPattern: String,
        approvalMode: {
            type: String,
            enum: ['configure', 'auto-approve', 'auto-reject'],
            default: 'configure'
        },
        approverSteps: [{
            type: {
                type: String,
                enum: ['manual', 'lookup'],
                required: true
            },
            value: String
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
        priority: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true,
    }
);

approvalRuleSchema.index({ organization: 1, module: 1 });
approvalRuleSchema.index({ organization: 1, isActive: 1 });

const ApprovalRule = mongoose.model<IApprovalRule>("ApprovalRule", approvalRuleSchema);

export default ApprovalRule;
