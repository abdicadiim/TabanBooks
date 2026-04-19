/**
 * Reporting Tags Model
 * For categorizing and tagging transactions, reports, and other business entities
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IReportingTag extends Document {
  organization: mongoose.Types.ObjectId;
  name: string; // Tag name (e.g., "Marketing", "Operations", "Q1 2024")
  color?: string; // Hex color code for UI display
  description?: string; // Optional description
  appliesTo: string[]; // What modules/entities this tag can be applied to
  moduleLevel?: Record<string, "transaction" | "lineItem">;
  isMandatory?: boolean;
  options?: string[];
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const reportingTagSchema = new Schema<IReportingTag>(
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
      maxlength: 50,
    },
    color: {
      type: String,
      match: /^#[0-9A-F]{6}$/i, // Hex color validation
      default: "#3B82F6", // Default blue color
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    appliesTo: [{
      type: String,
      enum: [
        // Module-level keys (used by frontend settings UI)
        "sales", "purchases", "journals", "inventoryAdjustments",
        "customers", "vendors", "items", "banking",

        // Entity-level keys (legacy/optional)
        "Invoice", "Quote", "CreditNote", "SalesReceipt",
        "PaymentReceived", "Bill", "PurchaseOrder", "VendorCredit", "PaymentMade",
        "Expense", "JournalEntry", "Customer", "Vendor",
        "Project", "Item", "Account"
      ],
      required: true,
    }],
    moduleLevel: {
      type: Map,
      of: {
        type: String,
        enum: ["transaction", "lineItem"],
      },
      default: {},
    },
    isMandatory: {
      type: Boolean,
      default: false,
    },
    options: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    isActive: {
      type: Boolean,
      default: true,
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

// Indexes for better performance
reportingTagSchema.index({ organization: 1, isActive: 1 });
reportingTagSchema.index({ organization: 1, name: 1 }, { unique: true });
reportingTagSchema.index({ organization: 1, appliesTo: 1 });

// Ensure tag names are unique within an organization
reportingTagSchema.pre("save", async function (next) {
  try {
    if (this.isModified("name")) {
      const existingTag = await (this.constructor as any).findOne({
        organization: this.organization,
        name: this.name,
        _id: { $ne: this._id },
      });
      
      if (existingTag) {
        const error = new Error("Tag name already exists in this organization");
        return next(error);
      }
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

const ReportingTag = mongoose.model<IReportingTag>(
  "ReportingTag",
  reportingTagSchema
);

export default ReportingTag;
