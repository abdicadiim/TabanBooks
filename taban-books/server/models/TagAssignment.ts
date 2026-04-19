/**
 * Tag Assignment Model
 * Links reporting tags to various entities (invoices, customers, etc.)
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ITagAssignment extends Document {
  organization: mongoose.Types.ObjectId;
  tag: mongoose.Types.ObjectId; // Reference to ReportingTag
  entityType: string; // "Invoice", "Customer", "Expense", etc.
  entityId: mongoose.Types.ObjectId; // ID of the tagged entity
  assignedBy?: mongoose.Types.ObjectId; // User who assigned the tag
  createdAt?: Date;
}

const tagAssignmentSchema = new Schema<ITagAssignment>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    tag: {
      type: Schema.Types.ObjectId,
      ref: "ReportingTag",
      required: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        "Invoice", "Quote", "CreditNote", "SalesReceipt",
        "Bill", "PurchaseOrder", "VendorCredit", "PaymentMade",
        "Expense", "JournalEntry", "Customer", "Vendor",
        "Project", "Item", "Account"
      ],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
tagAssignmentSchema.index({ organization: 1, entityType: 1, entityId: 1 });
tagAssignmentSchema.index({ organization: 1, tag: 1 });
tagAssignmentSchema.index({ organization: 1, entityType: 1, tag: 1 });

// Ensure unique tag assignment per entity
tagAssignmentSchema.index(
  { organization: 1, tag: 1, entityType: 1, entityId: 1 },
  { unique: true }
);

const TagAssignment = mongoose.model<ITagAssignment>(
  "TagAssignment",
  tagAssignmentSchema
);

export default TagAssignment;
