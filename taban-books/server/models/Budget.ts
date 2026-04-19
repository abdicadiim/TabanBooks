/**
 * Budget Model
 * Budgets
 */

import mongoose, { Document, Schema } from "mongoose";

interface IBudgetLine {
  account: string;
  accountName?: string;
  accountType?: "income" | "expense" | "asset" | "liability" | "equity";
  amount: number;
  period?: "monthly" | "quarterly" | "half-yearly" | "yearly";
  periods?: Array<{
    period?: string;
    amount?: number;
    actualAmount?: number;
  }>;
}

export interface IBudget extends Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  fiscalYear: number;
  fiscalYearLabel?: string;
  budgetPeriod?: "Monthly" | "Quarterly" | "Half-yearly" | "Yearly";
  includeAssetLiabilityEquity?: boolean;
  selectedIncomeAccounts?: string[];
  selectedExpenseAccounts?: string[];
  selectedAssetAccounts?: string[];
  selectedLiabilityAccounts?: string[];
  selectedEquityAccounts?: string[];
  createForReportingTag?: boolean;
  reportingTagName?: string;
  reportingTagOption?: string;
  startDate: Date;
  endDate: Date;
  lines: IBudgetLine[];
  currency?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const budgetLineSchema = new Schema<IBudgetLine>({
  account: {
    type: String,
    required: true,
  },
  accountName: String,
  accountType: {
    type: String,
    enum: ["income", "expense", "asset", "liability", "equity"],
  },
  amount: {
    type: Number,
    required: true,
  },
  period: {
    type: String,
    enum: ["monthly", "quarterly", "half-yearly", "yearly"],
    default: "monthly",
  },
  periods: [
    {
      period: String, // e.g., "2025-01"
      amount: Number,
      actualAmount: Number,
    },
  ],
});

const budgetSchema = new Schema<IBudget>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Budget name is required"],
      trim: true,
    },
    fiscalYear: {
      type: Number,
      required: true,
    },
    fiscalYearLabel: {
      type: String,
      trim: true,
    },
    budgetPeriod: {
      type: String,
      enum: ["Monthly", "Quarterly", "Half-yearly", "Yearly"],
      default: "Monthly",
    },
    includeAssetLiabilityEquity: {
      type: Boolean,
      default: false,
    },
    selectedIncomeAccounts: {
      type: [String],
      default: [],
    },
    selectedExpenseAccounts: {
      type: [String],
      default: [],
    },
    selectedAssetAccounts: {
      type: [String],
      default: [],
    },
    selectedLiabilityAccounts: {
      type: [String],
      default: [],
    },
    selectedEquityAccounts: {
      type: [String],
      default: [],
    },
    createForReportingTag: {
      type: Boolean,
      default: false,
    },
    reportingTagName: {
      type: String,
      trim: true,
    },
    reportingTagOption: {
      type: String,
      trim: true,
      default: "All",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    lines: [budgetLineSchema],
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
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

budgetSchema.index({ organization: 1, name: 1 });
budgetSchema.index({ organization: 1, fiscalYear: 1 });
budgetSchema.index({ organization: 1, isActive: 1 });

const Budget = mongoose.model<IBudget>("Budget", budgetSchema);

export default Budget;
