/**
 * Bank Rule Model
 * Bank Rules for automatic transaction categorization
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ICriterion {
  criteriaId?: string;
  field: string; // amount, payee, description, reference_number, etc.
  comparator: string; // equals, contains, greater_than, less_than, etc.
  value: string;
}

export interface IBankRule extends Document {
  organization: mongoose.Types.ObjectId;
  ruleName: string;
  ruleOrder?: number;
  targetAccountId: mongoose.Types.ObjectId; // Account on which rule applies
  applyTo: 'deposits' | 'withdrawals' | 'refunds' | 'charges';
  criteriaType: 'and' | 'or';
  criterion: ICriterion[];
  recordAs: 'expense' | 'deposit' | 'refund' | 'transfer_fund' | 'card_payment' | 
            'sales_without_invoices' | 'expense_refund' | 'interest_income' | 
            'other_income' | 'owner_drawings';
  accountId?: mongoose.Types.ObjectId; // Account involved in the rule
  accountName?: string;
  taxId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  referenceNumber?: 'manual' | 'from_statement';
  paymentMode?: string;
  vatTreatment?: string;
  taxTreatment?: string;
  isReverseChargeApplied?: boolean;
  productType?: string;
  taxAuthorityId?: mongoose.Types.ObjectId;
  taxAuthorityName?: string;
  taxExemptionId?: mongoose.Types.ObjectId;
  taxExemptionCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const criterionSchema = new Schema<ICriterion>({
  criteriaId: String,
  field: {
    type: String,
    required: true,
  },
  comparator: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});

const bankRuleSchema = new Schema<IBankRule>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    ruleName: {
      type: String,
      required: [true, "Rule name is required"],
      trim: true,
    },
    ruleOrder: {
      type: Number,
      default: 0,
    },
    targetAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },
    applyTo: {
      type: String,
      enum: ["deposits", "withdrawals", "refunds", "charges"],
      required: true,
    },
    criteriaType: {
      type: String,
      enum: ["and", "or"],
      required: true,
    },
    criterion: {
      type: [criterionSchema],
      required: true,
    },
    recordAs: {
      type: String,
      enum: [
        "expense",
        "deposit",
        "refund",
        "transfer_fund",
        "card_payment",
        "sales_without_invoices",
        "expense_refund",
        "interest_income",
        "other_income",
        "owner_drawings",
      ],
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
    },
    accountName: String,
    taxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tax",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: String,
    referenceNumber: {
      type: String,
      enum: ["manual", "from_statement"],
    },
    paymentMode: String,
    vatTreatment: String,
    taxTreatment: String,
    isReverseChargeApplied: Boolean,
    productType: String,
    taxAuthorityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    taxAuthorityName: String,
    taxExemptionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    taxExemptionCode: String,
  },
  {
    timestamps: true,
  }
);

bankRuleSchema.index({ organization: 1, targetAccountId: 1 });
bankRuleSchema.index({ organization: 1, ruleOrder: 1 });

const BankRule = mongoose.model<IBankRule>("BankRule", bankRuleSchema);

export default BankRule;
