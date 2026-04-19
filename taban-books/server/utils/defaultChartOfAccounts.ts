import mongoose from "mongoose";

import ChartOfAccount from "../models/ChartOfAccount.js";

type DefaultChartAccount = {
  accountName: string;
  accountType:
    | "other_current_asset"
    | "cash"
    | "accounts_receivable"
    | "fixed_asset"
    | "other_current_liability"
    | "accounts_payable"
    | "other_liability"
    | "equity"
    | "income"
    | "expense"
    | "cost_of_goods_sold"
    | "other_expense"
    | "stock";
};

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultChartAccount[] = [
  { accountName: "Prepaid Expenses", accountType: "other_current_asset" },
  { accountName: "Advance Tax", accountType: "other_current_asset" },
  { accountName: "Employee Advance", accountType: "other_current_asset" },
  { accountName: "Undeposited Funds", accountType: "cash" },
  { accountName: "Petty Cash", accountType: "cash" },
  { accountName: "Accounts Receivable", accountType: "accounts_receivable" },
  { accountName: "Furniture and Equipment", accountType: "fixed_asset" },
  { accountName: "Inventory Asset", accountType: "stock" },
  { accountName: "Tax Payable", accountType: "other_current_liability" },
  { accountName: "Unearned Revenue", accountType: "other_current_liability" },
  { accountName: "Opening Balance Adjustments", accountType: "other_current_liability" },
  { accountName: "Employee Reimbursements", accountType: "other_current_liability" },
  { accountName: "Accounts Payable", accountType: "accounts_payable" },
  { accountName: "Dimension Adjustments", accountType: "other_liability" },
  { accountName: "Retained Earnings", accountType: "equity" },
  { accountName: "Owner's Equity", accountType: "equity" },
  { accountName: "Opening Balance Offset", accountType: "equity" },
  { accountName: "Drawings", accountType: "equity" },
  { accountName: "Other Charges", accountType: "income" },
  { accountName: "Sales", accountType: "income" },
  { accountName: "General Income", accountType: "income" },
  { accountName: "Interest Income", accountType: "income" },
  { accountName: "Late Fee Income", accountType: "income" },
  { accountName: "Discount", accountType: "income" },
  { accountName: "Shipping Charge", accountType: "income" },
  { accountName: "Lodging", accountType: "expense" },
  { accountName: "Purchase Discounts", accountType: "expense" },
  { accountName: "Office Supplies", accountType: "expense" },
  { accountName: "Advertising And Marketing", accountType: "expense" },
  { accountName: "Bank Fees and Charges", accountType: "expense" },
  { accountName: "Credit Card Charges", accountType: "expense" },
  { accountName: "Travel Expense", accountType: "expense" },
  { accountName: "Telephone Expense", accountType: "expense" },
  { accountName: "Automobile Expense", accountType: "expense" },
  { accountName: "IT and Internet Expenses", accountType: "expense" },
  { accountName: "Rent Expense", accountType: "expense" },
  { accountName: "Janitorial Expense", accountType: "expense" },
  { accountName: "Postage", accountType: "expense" },
  { accountName: "Bad Debt", accountType: "expense" },
  { accountName: "Printing and Stationery", accountType: "expense" },
  { accountName: "Salaries and Employee Wages", accountType: "expense" },
  { accountName: "Uncategorized", accountType: "expense" },
  { accountName: "Meals and Entertainment", accountType: "expense" },
  { accountName: "Depreciation Expense", accountType: "expense" },
  { accountName: "Consultant Expense", accountType: "expense" },
  { accountName: "Repairs and Maintenance", accountType: "expense" },
  { accountName: "Other Expenses", accountType: "expense" },
  { accountName: "Cost of Goods Sold", accountType: "cost_of_goods_sold" },
  { accountName: "Exchange Gain or Loss", accountType: "other_expense" },
];

const normalizeCurrency = (value?: string | null): string =>
  String(value || "USD").trim().toUpperCase() || "USD";

export const ensureDefaultChartOfAccounts = async ({
  organizationId,
  currency,
}: {
  organizationId: string | mongoose.Types.ObjectId;
  currency?: string | null;
}): Promise<{ createdCount: number; totalTemplateCount: number }> => {
  const organizationObjectId =
    typeof organizationId === "string"
      ? new mongoose.Types.ObjectId(organizationId)
      : organizationId;

  if (DEFAULT_CHART_OF_ACCOUNTS.length === 0) {
    return { createdCount: 0, totalTemplateCount: 0 };
  }

  const normalizedCurrency = normalizeCurrency(currency);

  const result = await ChartOfAccount.bulkWrite(
    DEFAULT_CHART_OF_ACCOUNTS.map((account) => ({
      updateOne: {
        filter: {
          organization: organizationObjectId,
          accountName: account.accountName,
        },
        update: {
          $setOnInsert: {
            organization: organizationObjectId,
            accountName: account.accountName,
            accountCode: "",
            accountType: account.accountType,
            description: `Default account: ${account.accountName}`,
            isActive: true,
            isSystemAccount: true,
            balance: 0,
            currency: normalizedCurrency,
            showInWatchlist: false,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return {
    createdCount: result.upsertedCount || 0,
    totalTemplateCount: DEFAULT_CHART_OF_ACCOUNTS.length,
  };
};
