/**
 * Bank Account Model
 * Bank Accounts - Based on Taban Books API spec
 */

import mongoose, { Document, Schema } from "mongoose";
import { registerDashboardHomeInvalidationHooks } from "../utils/dashboardSync.js";

export interface IBankAccount extends Document {
  organization: mongoose.Types.ObjectId;
  accountName: string;
  accountCode?: string;
  accountNumber?: string;
  bankName?: string;
  routingNumber?: string;
  accountType: 'bank' | 'credit_card';
  currencyId?: mongoose.Types.ObjectId;
  currencyCode?: string;
  currencySymbol?: string;
  pricePrecision?: number;
  balance?: number;
  bankBalance?: number;
  bcyBalance?: number; // Balance in Base Currency
  description?: string;
  isActive: boolean;
  isPrimaryAccount?: boolean;
  isPaypalAccount?: boolean;
  paypalType?: 'standard' | 'adaptive';
  paypalEmailAddress?: string;
  uncategorizedTransactions?: number;
  totalUnprintedChecks?: number;
  isFeedsSubscribed?: boolean;
  isFeedsActive?: boolean;
  refreshStatusCode?: string;
  feedsLastRefreshDate?: Date;
  serviceId?: string;
  isSystemAccount?: boolean;
  isShowWarningForFeedsRefresh?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const bankAccountSchema = new Schema<IBankAccount>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    accountName: {
      type: String,
      required: [true, "Bank account name is required"],
      trim: true,
    },
    accountCode: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    routingNumber: {
      type: String,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ["bank", "credit_card"],
      required: true,
    },
    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
    },
    currencyCode: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    currencySymbol: {
      type: String,
      default: "$",
    },
    pricePrecision: {
      type: Number,
      default: 2,
    },
    balance: {
      type: Number,
      default: 0,
    },
    bankBalance: {
      type: Number,
      default: 0,
    },
    bcyBalance: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrimaryAccount: {
      type: Boolean,
      default: false,
    },
    isPaypalAccount: {
      type: Boolean,
      default: false,
    },
    paypalType: {
      type: String,
      enum: ["standard", "adaptive"],
    },
    paypalEmailAddress: {
      type: String,
      trim: true,
    },
    uncategorizedTransactions: {
      type: Number,
      default: 0,
    },
    totalUnprintedChecks: {
      type: Number,
      default: 0,
    },
    isFeedsSubscribed: {
      type: Boolean,
      default: false,
    },
    isFeedsActive: {
      type: Boolean,
      default: false,
    },
    refreshStatusCode: {
      type: String,
    },
    feedsLastRefreshDate: {
      type: Date,
    },
    serviceId: {
      type: String,
    },
    isSystemAccount: {
      type: Boolean,
      default: false,
    },
    isShowWarningForFeedsRefresh: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

bankAccountSchema.index({ organization: 1, accountName: 1 });
bankAccountSchema.index({ organization: 1, isActive: 1 });
bankAccountSchema.index({ organization: 1, accountType: 1 });
bankAccountSchema.index({ organization: 1, accountCode: 1 });
bankAccountSchema.index({ organization: 1, updatedAt: -1 });
registerDashboardHomeInvalidationHooks(bankAccountSchema);

const BankAccount = mongoose.model<IBankAccount>("BankAccount", bankAccountSchema);

export default BankAccount;
