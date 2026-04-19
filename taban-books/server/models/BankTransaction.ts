/**
 * Bank Transaction Model
 * Bank Transactions - Based on Taban Books API spec
 */

import mongoose, { Document, Schema } from "mongoose";

export interface ILineItem {
  lineId?: string;
  accountId?: mongoose.Types.ObjectId;
  accountName?: string;
  description?: string;
  taxAmount?: number;
  taxId?: mongoose.Types.ObjectId;
  taxName?: string;
  taxType?: string;
  taxPercentage?: number;
  itemTotal?: number;
  itemTotalInclusiveOfTax?: number;
  itemOrder?: number;
  tags?: Array<{ tagId: mongoose.Types.ObjectId; tagOptionId?: mongoose.Types.ObjectId }>;
}

export interface IBankTransaction extends Document {
  organization: mongoose.Types.ObjectId;
  transactionId?: string; // Unique transaction ID
  fromAccountId?: mongoose.Types.ObjectId;
  fromAccountName?: string;
  toAccountId?: mongoose.Types.ObjectId;
  toAccountName?: string;
  accountId?: mongoose.Types.ObjectId; // Bank account
  accountName?: string;
  accountType?: string;
  transactionType: 'deposit' | 'refund' | 'transfer_fund' | 'card_payment' | 
                   'sales_without_invoices' | 'expense_refund' | 'owner_contribution' | 
                   'interest_income' | 'other_income' | 'owner_drawings' | 'sales_return' |
                   'expense' | 'withdrawal';
  date: Date;
  debitOrCredit: 'debit' | 'credit';
  amount: number;
  currencyId?: mongoose.Types.ObjectId;
  currencyCode?: string;
  currencySymbol?: string;
  pricePrecision?: number;
  exchangeRate?: number;
  description?: string;
  referenceNumber?: string;
  paymentMode?: string;
  status: 'uncategorized' | 'manually_added' | 'matched' | 'excluded' | 'categorized';
  source?: string; // manually_added, imported, feed, etc.
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  vendorId?: mongoose.Types.ObjectId;
  vendorName?: string;
  payee?: string;
  isPaidViaPrintCheck?: boolean;
  offsetAccountName?: string;
  isOffsetAccountMatched?: boolean;
  isRuleExist?: boolean;
  ruleDetails?: string[];
  importedTransactionId?: mongoose.Types.ObjectId;
  bankCharges?: number;
  taxId?: mongoose.Types.ObjectId;
  taxName?: string;
  taxPercentage?: number;
  taxAmount?: number;
  isInclusiveTax?: boolean;
  subTotal?: number;
  total?: number;
  bcyTotal?: number; // Total in base currency
  documents?: Array<{ documentId: mongoose.Types.ObjectId; fileName: string }>;
  tags?: Array<{ tagId: mongoose.Types.ObjectId; tagOptionId?: mongoose.Types.ObjectId }>;
  fromAccountTags?: Array<{ tagId: mongoose.Types.ObjectId; tagOptionId?: mongoose.Types.ObjectId }>;
  toAccountTags?: Array<{ tagId: mongoose.Types.ObjectId; tagOptionId?: mongoose.Types.ObjectId }>;
  lineItems?: ILineItem[];
  customFields?: Array<{ customFieldId?: mongoose.Types.ObjectId; index: number; label: string; value: string }>;
  userId?: mongoose.Types.ObjectId;
  taxAuthorityId?: mongoose.Types.ObjectId;
  taxAuthorityName?: string;
  taxExemptionId?: mongoose.Types.ObjectId;
  taxExemptionCode?: string;
  vatTreatment?: string;
  taxTreatment?: string;
  productType?: string;
  acquisitionVatId?: mongoose.Types.ObjectId;
  reverseChargeVatId?: mongoose.Types.ObjectId;
  isUpdateCustomer?: boolean;
  transactionNumber?: string;
  isBestMatch?: boolean;
  matchingTransactions?: Array<{ transactionId: string; transactionType: string }>;
  isReconciled?: boolean;
  reconciliationId?: mongoose.Types.ObjectId;
  reconciledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const lineItemSchema = new Schema<ILineItem>({
  lineId: String,
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "ChartOfAccount" },
  accountName: String,
  description: String,
  taxAmount: Number,
  taxId: { type: mongoose.Schema.Types.ObjectId, ref: "Tax" },
  taxName: String,
  taxType: String,
  taxPercentage: Number,
  itemTotal: Number,
  itemTotalInclusiveOfTax: Number,
  itemOrder: Number,
  tags: [{
    tagId: { type: mongoose.Schema.Types.ObjectId, ref: "Tag" },
    tagOptionId: { type: mongoose.Schema.Types.ObjectId },
  }],
});

const bankTransactionSchema = new Schema<IBankTransaction>(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    fromAccountName: String,
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    toAccountName: String,
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },
    accountName: String,
    accountType: String,
    transactionType: {
      type: String,
      enum: [
        "deposit",
        "refund",
        "transfer_fund",
        "card_payment",
        "sales_without_invoices",
        "expense_refund",
        "owner_contribution",
        "interest_income",
        "other_income",
        "owner_drawings",
        "sales_return",
        "expense",
        "withdrawal",
      ],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    debitOrCredit: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    amount: {
      type: Number,
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
    exchangeRate: {
      type: Number,
      default: 1,
    },
    description: String,
    referenceNumber: String,
    paymentMode: String,
    status: {
      type: String,
      enum: ["uncategorized", "manually_added", "matched", "excluded", "categorized"],
      default: "uncategorized",
    },
    source: {
      type: String,
      default: "manually_added",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: String,
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    vendorName: String,
    payee: String,
    isPaidViaPrintCheck: Boolean,
    offsetAccountName: String,
    isOffsetAccountMatched: Boolean,
    isRuleExist: Boolean,
    ruleDetails: [String],
    importedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    bankCharges: {
      type: Number,
      default: 0,
    },
    taxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tax",
    },
    taxName: String,
    taxPercentage: Number,
    taxAmount: Number,
    isInclusiveTax: {
      type: Boolean,
      default: false,
    },
    subTotal: Number,
    total: Number,
    bcyTotal: Number,
    documents: [{
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
      fileName: String,
    }],
    tags: [{
      tagId: { type: mongoose.Schema.Types.ObjectId, ref: "Tag" },
      tagOptionId: { type: mongoose.Schema.Types.ObjectId },
    }],
    fromAccountTags: [{
      tagId: { type: mongoose.Schema.Types.ObjectId, ref: "Tag" },
      tagOptionId: { type: mongoose.Schema.Types.ObjectId },
    }],
    toAccountTags: [{
      tagId: { type: mongoose.Schema.Types.ObjectId, ref: "Tag" },
      tagOptionId: { type: mongoose.Schema.Types.ObjectId },
    }],
    lineItems: [lineItemSchema],
    customFields: [{
      customFieldId: { type: mongoose.Schema.Types.ObjectId },
      index: Number,
      label: String,
      value: String,
    }],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    taxAuthorityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    taxAuthorityName: String,
    taxExemptionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    taxExemptionCode: String,
    vatTreatment: String,
    taxTreatment: String,
    productType: String,
    acquisitionVatId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    reverseChargeVatId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isUpdateCustomer: Boolean,
    transactionNumber: String,
    isBestMatch: Boolean,
    matchingTransactions: [{
      transactionId: String,
      transactionType: String,
    }],
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciliationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankReconciliation",
    },
    reconciledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bankTransactionSchema.index({ organization: 1, accountId: 1 });
bankTransactionSchema.index({ organization: 1, date: 1 });
bankTransactionSchema.index({ organization: 1, status: 1 });
bankTransactionSchema.index({ organization: 1, transactionType: 1 });
bankTransactionSchema.index({ organization: 1, referenceNumber: 1 });
bankTransactionSchema.index({ organization: 1, accountId: 1, isReconciled: 1 });

const BankTransaction = mongoose.model<IBankTransaction>("BankTransaction", bankTransactionSchema);

export default BankTransaction;


