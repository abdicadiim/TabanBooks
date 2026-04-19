/**
 * Chart of Account Model
 * Chart of Accounts
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";
import { CHART_OF_ACCOUNT_TYPES } from "../utils/chartOfAccounts.js";

export interface IChartOfAccount extends Document {
  organization: mongoose.Types.ObjectId;
  accountCode?: string;
  accountName: string;
  name?: string; // Alias for accountName for compatibility
  accountType:
  | 'asset' | 'other_asset' | 'other_current_asset' | 'intangible_asset' | 'right_to_use_asset' | 'financial_asset' | 'contingent_asset' | 'contract_asset' | 'cash' | 'bank' | 'fixed_asset' | 'accounts_receivable' | 'stock' | 'payment_clearing_account' | 'input_tax' | 'non_current_asset' | 'deferred_tax_asset'
  | 'liability' | 'other_current_liability' | 'contract_liability' | 'refund_liability' | 'credit_card' | 'long_term_liability' | 'loans_and_borrowing' | 'lease_liability' | 'employee_benefit_liability' | 'contingent_liability' | 'financial_liability' | 'other_liability' | 'accounts_payable' | 'non_current_liability' | 'overseas_tax_payable' | 'output_tax' | 'deferred_tax_liability'
  | 'equity'
  | 'income' | 'finance_income' | 'other_comprehensive_income' | 'other_income'
  | 'expense' | 'manufacturing_expense' | 'impairment_expense' | 'depreciation_expense' | 'employee_benefit_expense' | 'lease_expense' | 'finance_expense' | 'tax_expense' | 'cost_of_goods_sold' | 'other_expense';
  parentAccount?: mongoose.Types.ObjectId;
  description?: string;
  isActive?: boolean;
  isSystemAccount?: boolean;
  showInWatchlist?: boolean;
  balance?: number;
  currency?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const chartOfAccountSchema = new Schema<IChartOfAccount>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountCode: {
      type: String,
      trim: true,
      default: "",
    },
    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
    },
    accountType: {
      type: String,
      enum: CHART_OF_ACCOUNT_TYPES,
      required: true,
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemAccount: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    showInWatchlist: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

chartOfAccountSchema.index({ organization: 1, accountCode: 1 });
chartOfAccountSchema.index({ organization: 1, accountName: 1 }, { unique: true });
chartOfAccountSchema.index({ organization: 1, accountType: 1 });
chartOfAccountSchema.index({ organization: 1, isActive: 1 });
chartOfAccountSchema.index({ organization: 1, showInWatchlist: 1 });
chartOfAccountSchema.index({ organization: 1, updatedAt: -1 });
registerDashboardHomeInvalidationHooks(chartOfAccountSchema);

// Virtual field for 'name' to provide backward compatibility
chartOfAccountSchema.virtual('name').get(function () {
  return (this as any).accountName;
});

const ChartOfAccount = (mongoose.models.ChartOfAccount as mongoose.Model<IChartOfAccount>) || mongoose.model<IChartOfAccount>("ChartOfAccount", chartOfAccountSchema);

export default ChartOfAccount;
