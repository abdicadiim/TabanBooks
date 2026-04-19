/**
 * Banking Controller
 * Handles Bank Accounts, Transactions, Rules and Reconciliations.
 */

import { Request, Response } from "express";
import BankAccount from "../models/BankAccount.js";
import BankTransaction from "../models/BankTransaction.js";
import BankRule from "../models/BankRule.js";
import BankStatement from "../models/BankStatement.js";
import BankReconciliation from "../models/BankReconciliation.js";
import Currency from "../models/Currency.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import Customer from "../models/Customer.js";
import Vendor from "../models/Vendor.js";
import Tax from "../models/Tax.js";
import PaymentMade from "../models/PaymentMade.js";
import PaymentReceived from "../models/PaymentReceived.js";
import Expense from "../models/Expense.js";
import JournalEntry from "../models/JournalEntry.js";
import mongoose from "mongoose";
import { syncLinkedBankTransaction } from "../utils/bankTransactionSync.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const toNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MANUAL_BANK_TRANSACTION_TYPES = [
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
] as const;

type ManualBankTransactionType = (typeof MANUAL_BANK_TRANSACTION_TYPES)[number];

const MANUAL_BANK_TRANSACTION_TYPE_SET = new Set<string>(MANUAL_BANK_TRANSACTION_TYPES);
const MONEY_IN_TRANSACTION_TYPES = new Set<string>([
  "deposit",
  "refund",
  "sales_without_invoices",
  "expense_refund",
  "owner_contribution",
  "interest_income",
  "other_income",
]);
const TRANSFER_LIKE_TRANSACTION_TYPES = new Set<string>(["transfer_fund", "card_payment"]);
const BANK_ONLY_MONEY_IN_TYPES = new Set<string>([
  "sales_without_invoices",
  "expense_refund",
  "owner_contribution",
  "interest_income",
  "other_income",
]);
const BANK_ONLY_MONEY_OUT_TYPES = new Set<string>(["owner_drawings", "sales_return"]);

type ResolvedReferenceAccount =
  | {
    kind: "bank";
    record: any;
  }
  | {
    kind: "chart";
    record: any;
  }
  | null;

const getContactDisplayName = (contact: any): string | undefined => {
  const value =
    contact?.displayName ||
    contact?.name ||
    contact?.companyName ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ");

  return value ? String(value).trim() : undefined;
};

const resolveReferenceAccount = async (
  organizationId: string,
  accountId?: any
): Promise<ResolvedReferenceAccount> => {
  const normalizedId = String(accountId || "").trim();
  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
    return null;
  }

  const bankAccount = await BankAccount.findOne({
    _id: normalizedId,
    organization: organizationId,
  });
  if (bankAccount) {
    return { kind: "bank", record: bankAccount };
  }

  const chartAccount = await ChartOfAccount.findOne({
    _id: normalizedId,
    organization: organizationId,
  });
  if (chartAccount) {
    return { kind: "chart", record: chartAccount };
  }

  return null;
};

const getResolvedAccountName = (account: ResolvedReferenceAccount): string | undefined => {
  if (!account) return undefined;
  return String(account.record?.accountName || account.record?.name || "").trim() || undefined;
};

const syncPaymentHistoryForBankAccount = async (
  organizationId: string,
  accountId?: any,
): Promise<void> => {
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId || !mongoose.Types.ObjectId.isValid(normalizedAccountId)) {
    return;
  }

  const bankAccount = await BankAccount.findOne({
    _id: normalizedAccountId,
    organization: organizationId,
  }).lean();

  if (!bankAccount) {
    return;
  }

  const accountAliasIds = new Set<string>([normalizedAccountId]);
  const accountAliasNames = new Set<string>();
  const normalizedAccountName = String(bankAccount.accountName || "").trim();
  const normalizedBankName = String(bankAccount.bankName || "").trim();
  const normalizedAccountCode = String(bankAccount.accountCode || "").trim();
  const normalizedAccountNumber = String(bankAccount.accountNumber || "").trim();

  [normalizedAccountName, normalizedBankName, normalizedAccountCode, normalizedAccountNumber]
    .filter(Boolean)
    .forEach((value) => accountAliasNames.add(value));

  if (normalizedAccountName) {
    const matchingChartAccounts = await ChartOfAccount.find({
      organization: organizationId,
      $or: [
        { accountName: { $regex: `^${escapeRegex(normalizedAccountName)}$`, $options: "i" } },
        { name: { $regex: `^${escapeRegex(normalizedAccountName)}$`, $options: "i" } },
      ],
    }).select("_id").lean();

    matchingChartAccounts.forEach((account: any) => {
      if (account?._id) accountAliasIds.add(String(account._id));
    });
  }

  const accountIdentifiers = Array.from(accountAliasIds);
  const accountNamePatterns = Array.from(accountAliasNames).map((value) => new RegExp(`^${escapeRegex(value)}$`, "i"));

  const journalMatches = await JournalEntry.find({
    organization: organizationId,
    sourceType: { $in: ["payment_made", "payment_received", "expense"] },
    lines: {
      $elemMatch: {
        $or: [
          { account: { $in: accountIdentifiers } },
          ...(accountNamePatterns.length > 0 ? [{ accountName: { $in: accountNamePatterns } }] : []),
        ],
      },
    },
  })
    .select("sourceId sourceType")
    .lean();

  const paymentMadeIds = journalMatches
    .filter((entry: any) => entry?.sourceType === "payment_made" && entry?.sourceId)
    .map((entry: any) => entry.sourceId);
  const paymentReceivedIds = journalMatches
    .filter((entry: any) => entry?.sourceType === "payment_received" && entry?.sourceId)
    .map((entry: any) => entry.sourceId);
  const expenseIds = journalMatches
    .filter((entry: any) => entry?.sourceType === "expense" && entry?.sourceId)
    .map((entry: any) => entry.sourceId);

  const [paymentsMade, paymentsReceived, expenses] = await Promise.all([
    PaymentMade.find({
      organization: organizationId,
      $or: [
        { paidThrough: { $in: accountIdentifiers } },
        { bankAccount: { $in: accountIdentifiers } },
        ...(paymentMadeIds.length > 0 ? [{ _id: { $in: paymentMadeIds } }] : []),
      ],
    }).lean(),
    PaymentReceived.find({
      organization: organizationId,
      status: { $nin: ["draft", "void"] },
      $or: [
        { bankAccount: { $in: accountIdentifiers } },
        { depositTo: { $in: accountIdentifiers } },
        ...(paymentReceivedIds.length > 0 ? [{ _id: { $in: paymentReceivedIds } }] : []),
      ],
    }).lean(),
    Expense.find({
      organization: organizationId,
      $or: [
        { paid_through_account_id: { $in: accountIdentifiers } },
        ...(expenseIds.length > 0 ? [{ _id: { $in: expenseIds } }] : []),
      ],
    }).lean(),
  ]);

  await Promise.all([
    ...paymentsMade.map((payment: any) =>
      syncLinkedBankTransaction({
        organizationId,
        transactionKey: `payment_made:${payment._id}`,
        source: "payment_made",
        accountCandidates: [payment.bankAccount, payment.paidThrough, normalizedAccountId],
        amount: payment.amount,
        date: payment.date,
        referenceNumber: payment.paymentReference || payment.paymentNumber,
        description: payment.notes,
        paymentMode: payment.paymentMethod,
        transactionType: "withdrawal",
        debitOrCredit: "debit",
        vendorId: payment.vendor,
        fallbackDescription: `Payment made ${payment.paymentNumber}`,
      }),
    ),
    ...paymentsReceived.map((payment: any) =>
      syncLinkedBankTransaction({
        organizationId,
        transactionKey: `payment_received:${payment._id}`,
        source: "payment_received",
        accountCandidates: [payment.bankAccount, payment.depositTo, normalizedAccountId],
        amount: payment.amount,
        date: payment.date,
        referenceNumber: payment.paymentReference || payment.paymentNumber,
        description: payment.notes,
        paymentMode: payment.paymentMethod,
        transactionType: "deposit",
        debitOrCredit: "credit",
        shouldSync: !["draft", "void"].includes(String(payment.status || "").toLowerCase()),
        customerId: payment.customer,
        fallbackDescription: `Payment received ${payment.paymentNumber}`,
      }),
    ),
    ...expenses.map((expense: any) =>
      syncLinkedBankTransaction({
        organizationId,
        transactionKey: `expense:${expense._id}`,
        source: "expense",
        accountCandidates: [
          expense.paid_through_account_id,
          expense.paid_through_account_name,
          normalizedAccountId,
        ],
        amount: expense.amount,
        date: expense.date,
        referenceNumber: expense.reference_number || expense.expense_id,
        description: expense.description,
        transactionType: "expense",
        debitOrCredit: "debit",
        vendorId: expense.vendor_id,
        vendorName: expense.vendor_name,
        fallbackDescription: `Expense ${expense.reference_number || expense.expense_id || expense._id}`,
      }),
    ),
  ]);
};

const validateManualBankTransactionPayload = async (
  organizationId: string,
  userId: string,
  payload: any
): Promise<
  | {
    ok: true;
    transactionType: ManualBankTransactionType;
    currentBankAccount: any;
    debitOrCredit: "debit" | "credit";
    amount: number;
    fromAccount: ResolvedReferenceAccount;
    toAccount: ResolvedReferenceAccount;
    customerName?: string;
    vendorName?: string;
    effectiveUserId: string;
  }
  | {
    ok: false;
    message: string;
  }
> => {
  const transactionType = String(payload?.transaction_type || "").trim();
  if (!transactionType) {
    return { ok: false, message: "transaction_type is required" };
  }

  if (!MANUAL_BANK_TRANSACTION_TYPE_SET.has(transactionType)) {
    return {
      ok: false,
      message:
        "Manual bank transactions support only deposit, refund, transfer_fund, card_payment, sales_without_invoices, expense_refund, owner_contribution, interest_income, other_income, owner_drawings, and sales_return. Expense and customer/vendor payment flows belong in their respective modules.",
    };
  }

  const amount = toNumber(payload?.amount, NaN);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "amount must be greater than 0" };
  }

  const primaryBankAccountId = String(
    payload?.account_id ||
    (MONEY_IN_TRANSACTION_TYPES.has(transactionType) ? payload?.to_account_id : payload?.from_account_id) ||
    payload?.to_account_id ||
    payload?.from_account_id ||
    ""
  ).trim();

  if (!primaryBankAccountId || !mongoose.Types.ObjectId.isValid(primaryBankAccountId)) {
    return {
      ok: false,
      message: "A valid bank or credit card account is required for this transaction.",
    };
  }

  const currentBankAccount = await BankAccount.findOne({
    _id: primaryBankAccountId,
    organization: organizationId,
  });

  if (!currentBankAccount) {
    return { ok: false, message: "Bank account not found" };
  }

  const [fromAccount, toAccount, customer, vendor] = await Promise.all([
    resolveReferenceAccount(organizationId, payload?.from_account_id),
    resolveReferenceAccount(organizationId, payload?.to_account_id),
    payload?.customer_id && mongoose.Types.ObjectId.isValid(String(payload.customer_id))
      ? Customer.findOne({ _id: payload.customer_id, organization: organizationId })
      : Promise.resolve(null),
    payload?.vendor_id && mongoose.Types.ObjectId.isValid(String(payload.vendor_id))
      ? Vendor.findOne({ _id: payload.vendor_id, organization: organizationId })
      : Promise.resolve(null),
  ]);

  if (payload?.from_account_id && !fromAccount) {
    return { ok: false, message: "from_account_id is invalid for this organization" };
  }
  if (payload?.to_account_id && !toAccount) {
    return { ok: false, message: "to_account_id is invalid for this organization" };
  }

  const currentAccountId = String(currentBankAccount._id);
  const fromBankId = fromAccount?.kind === "bank" ? String(fromAccount.record._id) : undefined;
  const toBankId = toAccount?.kind === "bank" ? String(toAccount.record._id) : undefined;

  if (BANK_ONLY_MONEY_IN_TYPES.has(transactionType) && currentBankAccount.accountType !== "bank") {
    return {
      ok: false,
      message: `${transactionType} can only be recorded against a bank account.`,
    };
  }

  if (BANK_ONLY_MONEY_OUT_TYPES.has(transactionType) && currentBankAccount.accountType !== "bank") {
    return {
      ok: false,
      message: `${transactionType} can only be recorded against a bank account.`,
    };
  }

  if (transactionType === "refund" && currentBankAccount.accountType !== "credit_card") {
    return {
      ok: false,
      message: "refund is supported only for credit card accounts.",
    };
  }

  let debitOrCredit: "debit" | "credit";

  if (TRANSFER_LIKE_TRANSACTION_TYPES.has(transactionType)) {
    if (!fromBankId || !toBankId) {
      return {
        ok: false,
        message: `${transactionType} requires both from_account_id and to_account_id to be bank or credit card accounts.`,
      };
    }

    if (fromBankId === toBankId) {
      return {
        ok: false,
        message: "from_account_id and to_account_id must refer to different accounts.",
      };
    }

    if (currentAccountId !== fromBankId && currentAccountId !== toBankId) {
      return {
        ok: false,
        message: "account_id must match either from_account_id or to_account_id for transfer-like transactions.",
      };
    }

    if (transactionType === "card_payment") {
      const fromType = String(fromAccount?.record?.accountType || "");
      const toType = String(toAccount?.record?.accountType || "");
      const hasBank = fromType === "bank" || toType === "bank";
      const hasCard = fromType === "credit_card" || toType === "credit_card";

      if (!hasBank || !hasCard) {
        return {
          ok: false,
          message: "card_payment requires one bank account and one credit card account.",
        };
      }
    }

    debitOrCredit = currentAccountId === fromBankId ? "debit" : "credit";
  } else if (MONEY_IN_TRANSACTION_TYPES.has(transactionType)) {
    if (toBankId && toBankId !== currentAccountId) {
      return {
        ok: false,
        message: "For money-in transactions, to_account_id must match the selected bank or card account.",
      };
    }

    debitOrCredit = "credit";
  } else {
    if (fromBankId && fromBankId !== currentAccountId) {
      return {
        ok: false,
        message: "For money-out transactions, from_account_id must match the selected bank account.",
      };
    }

    debitOrCredit = "debit";
  }

  return {
    ok: true,
    transactionType: transactionType as ManualBankTransactionType,
    currentBankAccount,
    debitOrCredit,
    amount,
    fromAccount,
    toAccount,
    customerName: getContactDisplayName(customer),
    vendorName: getContactDisplayName(vendor),
    effectiveUserId: String(payload?.user_id || userId),
  };
};

// ==================== BANK ACCOUNTS ====================

/**
 * Get currencies for bank account form
 * GET /bankaccounts/currencies
 */
export const getBankAccountCurrencies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    // Read currencies from database
    const currencies = await Currency.find({
      organization: req.user.organizationId,
      isActive: true,
    })
      .select("code name symbol")
      .sort({ code: 1 });

    console.log(`[BankAccountCurrencies] Found ${currencies.length} currencies for organization ${req.user.organizationId}`);

    // If no currencies exist, seed default currencies
    if (currencies.length === 0) {
      console.log(`[BankAccountCurrencies] No currencies found, seeding default currencies...`);
      const defaultCurrencies = [
        { code: "USD", name: "United States Dollar", symbol: "$", isBaseCurrency: true },
        { code: "EUR", name: "Euro", symbol: "€", isBaseCurrency: false },
        { code: "GBP", name: "British Pound", symbol: "£", isBaseCurrency: false },
        { code: "AMD", name: "Armenian Dram", symbol: "֏", isBaseCurrency: false },
        { code: "KES", name: "Kenyan Shilling", symbol: "KSh", isBaseCurrency: false },
        { code: "SOS", name: "Somali Shilling", symbol: "SOS", isBaseCurrency: false },
        { code: "CAD", name: "Canadian Dollar", symbol: "C$", isBaseCurrency: false },
        { code: "AWG", name: "Aruban Guilder", symbol: "ƒ", isBaseCurrency: false },
      ];

      const currenciesToInsert = defaultCurrencies.map(currency => ({
        ...currency,
        organization: req.user.organizationId,
        isActive: true,
      }));

      const insertedCurrencies = await Currency.insertMany(currenciesToInsert);
      console.log(`[BankAccountCurrencies] Seeded ${insertedCurrencies.length} currencies`);
      
      res.json({
        code: 0,
        message: "success",
        currencies: insertedCurrencies.map(c => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
        })),
      });
      return;
    }

    // Return currencies from database (3-letter codes only)
    const currencyList = currencies.map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
    }));

    console.log(`[BankAccountCurrencies] Returning ${currencyList.length} currencies:`, currencyList.map(c => c.code).join(", "));

    res.json({
      code: 0,
      message: "success",
      currencies: currencyList,
    });
  } catch (error: any) {
    console.error("[BankAccountCurrencies] Error:", error);
    res.status(500).json({ code: 1, message: error.message || "Failed to get currencies" });
  }
};

/**
 * Create a bank account
 * POST /bankaccounts
 */
export const createBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_name, account_type, account_number, account_code, currency_id, currency_code, description, bank_name, routing_number, is_primary_account, is_paypal_account, paypal_type, paypal_email_address } = req.body;

    if (!account_name || !account_type) {
      res.status(400).json({ code: 1, message: "account_name and account_type are required" });
      return;
    }

    let currencyInfo = null;
    if (currency_id) {
      currencyInfo = await Currency.findOne({ _id: currency_id, organization: req.user.organizationId });
    } else if (currency_code) {
      currencyInfo = await Currency.findOne({ code: currency_code, organization: req.user.organizationId });
    }

    const bankAccount = await BankAccount.create({
      organization: req.user.organizationId,
      accountName: account_name,
      accountType: account_type,
      accountNumber: account_number,
      accountCode: account_code,
      currencyId: currencyInfo?._id,
      currencyCode: currencyInfo?.code || currency_code || "USD",
      currencySymbol: currencyInfo?.symbol || "$",
      pricePrecision: 2,
      description,
      bankName: bank_name,
      routingNumber: routing_number,
      isPrimaryAccount: is_primary_account || false,
      isPaypalAccount: is_paypal_account || false,
      paypalType: paypal_type,
      paypalEmailAddress: paypal_email_address,
      balance: 0,
      bankBalance: 0,
      bcyBalance: 0,
      isActive: true,
    });

    res.status(201).json({
      code: 0,
      message: "The account has been created.",
      bankaccount: bankAccount
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to create bank account" });
  }
};

/**
 * List bank accounts
 * GET /bankaccounts
 */
export const listBankAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { filter_by, sort_column, page = 1, per_page = 200 } = req.query;
    const orgId = req.user.organizationId;

    const query: any = { organization: orgId };
    
    if (filter_by === "Status.Active") {
      query.isActive = true;
    } else if (filter_by === "Status.Inactive") {
      query.isActive = false;
    }

    const sort: any = {};
    if (sort_column === "account_name") {
      sort.accountName = 1;
    } else if (sort_column === "account_type") {
      sort.accountType = 1;
    } else if (sort_column === "account_code") {
      sort.accountCode = 1;
    }

    const skip = (Number(page) - 1) * Number(per_page);
    const accounts = await BankAccount.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(per_page))
      .populate("currencyId", "code symbol");

    const bankaccounts = await Promise.all(
      accounts.map(async (account) => {
        const uncategorizedTransactions = await BankTransaction.countDocuments({
          organization: orgId,
          accountId: account._id,
          status: "uncategorized",
        });
        const raw = account.toObject();
        const fallbackBankBalance =
          Number(raw.bankBalance || 0) === 0 && Number(raw.balance || 0) !== 0
            ? Number(raw.balance || 0)
            : Number(raw.bankBalance || 0);
        return {
          ...raw,
          bankBalance: fallbackBankBalance,
          uncategorizedTransactions,
        };
      })
    );

    res.json({ code: 0, message: "success", bankaccounts });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to list bank accounts" });
  }
};

/**
 * Get bank account details
 * GET /bankaccounts/:account_id
 */
export const getBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const account = await BankAccount.findOne({
      _id: account_id,
      organization: req.user.organizationId
    }).populate("currencyId", "code symbol name");

    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    const raw = account.toObject();
    const fallbackBankBalance =
      Number(raw.bankBalance || 0) === 0 && Number(raw.balance || 0) !== 0
        ? Number(raw.balance || 0)
        : Number(raw.bankBalance || 0);

    res.json({
      code: 0,
      message: "success",
      bankaccount: {
        ...raw,
        bankBalance: fallbackBankBalance,
      }
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to get bank account" });
  }
};

/**
 * Update bank account
 * PUT /bankaccounts/:account_id
 */
export const updateBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const { account_name, account_type, account_number, account_code, currency_id, currency_code, description, bank_name, routing_number, is_primary_account, is_paypal_account, paypal_type, paypal_email_address } = req.body;

    if (!account_name || !account_type) {
      res.status(400).json({ code: 1, message: "account_name and account_type are required" });
      return;
    }

    const account = await BankAccount.findOneAndUpdate(
      { _id: account_id, organization: req.user.organizationId },
      {
        accountName: account_name,
        accountType: account_type,
        accountNumber: account_number,
        accountCode: account_code,
        currencyCode: currency_code,
        description,
        bankName: bank_name,
        routingNumber: routing_number,
        isPrimaryAccount: is_primary_account,
        isPaypalAccount: is_paypal_account,
        paypalType: paypal_type,
        paypalEmailAddress: paypal_email_address,
      },
      { new: true, runValidators: true }
    ).populate("currencyId", "code symbol");

    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    res.json({
      code: 0,
      message: "The details of the account has been updated.",
      bankaccount: account
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to update bank account" });
  }
};

/**
 * Delete bank account
 * DELETE /bankaccounts/:account_id
 */
export const deleteBankAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const account = await BankAccount.findOneAndDelete({
      _id: account_id,
      organization: req.user.organizationId
    });

    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    res.json({ code: 0, message: "The account has been deleted." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to delete bank account" });
  }
};

/**
 * Mark bank account as inactive
 * POST /bankaccounts/:account_id/inactive
 */
export const markBankAccountInactive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const account = await BankAccount.findOneAndUpdate(
      { _id: account_id, organization: req.user.organizationId },
      { isActive: false },
      { new: true }
    );

    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "The account has been marked as inactive." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to deactivate bank account" });
  }
};

/**
 * Mark bank account as active
 * POST /bankaccounts/:account_id/active
 */
export const markBankAccountActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const account = await BankAccount.findOneAndUpdate(
      { _id: account_id, organization: req.user.organizationId },
      { isActive: true },
      { new: true }
    );

    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "The account has been marked as active." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to activate bank account" });
  }
};

/**
 * Import bank statement
 * POST /bankstatements
 */
export const importBankStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id, start_date, end_date, transactions } = req.body;

    if (!account_id || !transactions || !Array.isArray(transactions)) {
      res.status(400).json({ code: 1, message: "account_id and transactions array are required" });
      return;
    }

    const account = await BankAccount.findOne({
      _id: account_id,
      organization: req.user.organizationId
    });

    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    const statement = await BankStatement.create({
      organization: req.user.organizationId,
      accountId: account_id,
      fromDate: start_date ? new Date(start_date) : new Date(),
      toDate: end_date ? new Date(end_date) : new Date(),
      source: "csv",
      transactions: [],
    });

    const createdTransactions = [];
    for (const txn of transactions) {
      if (!txn.date || !txn.debit_or_credit || txn.amount === undefined) continue;

      const transaction = await BankTransaction.create({
        organization: req.user.organizationId,
        accountId: account_id,
        accountName: account.accountName,
        date: new Date(txn.date),
        debitOrCredit: txn.debit_or_credit,
        amount: parseFloat(txn.amount),
        description: txn.description,
        referenceNumber: txn.reference_number,
        payee: txn.payee,
        status: "uncategorized",
        source: "imported",
        transactionType: txn.debit_or_credit === "credit" ? "deposit" : "withdrawal",
      });

      createdTransactions.push(transaction._id);
    }

    statement.transactions = createdTransactions;
    await statement.save();

    res.status(201).json({ code: 0, message: "Your bank statement has been imported." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to import bank statement" });
  }
};

/**
 * Get last imported statement
 * GET /bankaccounts/:account_id/statement/lastimported
 */
export const getLastImportedStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const statement = await BankStatement.findOne({
      accountId: account_id,
      organization: req.user.organizationId
    })
      .sort({ createdAt: -1 })
      .populate("transactions");

    if (!statement) {
      res.status(404).json({ code: 1, message: "No imported statement found" });
      return;
    }

    res.json({ code: 0, message: "success", statement: [statement] });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to get last imported statement" });
  }
};

/**
 * Delete last imported statement
 * DELETE /bankaccounts/:account_id/statement/:statement_id
 */
export const deleteLastImportedStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id, statement_id } = req.params;
    const statement = await BankStatement.findOneAndDelete({
      _id: statement_id,
      accountId: account_id,
      organization: req.user.organizationId
    });

    if (!statement) {
      res.status(404).json({ code: 1, message: "Statement not found" });
      return;
    }

    await BankTransaction.deleteMany({ _id: { $in: statement.transactions } });

    res.json({ code: 0, message: "You have successfully deleted the last imported statement." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to delete statement" });
  }
};

// ==================== BANK TRANSACTIONS ====================

/**
 * Create a bank transaction
 * POST /banktransactions
 */
export const createBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_type, from_account_id, to_account_id, account_id, amount, payment_mode, exchange_rate, date, customer_id, vendor_id, reference_number, description, currency_id, tax_id, is_inclusive_tax, tags, documents, bank_charges, user_id, tax_authority_id, tax_exemption_id, custom_fields, from_account_tags, to_account_tags } = req.body;

    const validation = await validateManualBankTransactionPayload(
      req.user.organizationId,
      req.user.userId,
      req.body
    );

    if ("message" in validation) {
      res.status(400).json({ code: 1, message: validation.message });
      return;
    }

    const account = validation.currentBankAccount;
    const accountId = String(account._id);

    const transaction = await BankTransaction.create({
      organization: req.user.organizationId,
      fromAccountId: from_account_id,
      fromAccountName: getResolvedAccountName(validation.fromAccount),
      toAccountId: to_account_id,
      toAccountName: getResolvedAccountName(validation.toAccount),
      accountId,
      accountName: account.accountName,
      accountType: account.accountType,
      transactionType: validation.transactionType,
      date: date ? new Date(date) : new Date(),
      debitOrCredit: validation.debitOrCredit,
      amount: validation.amount,
      currencyId: currency_id,
      currencyCode: account.currencyCode,
      currencySymbol: account.currencySymbol,
      pricePrecision: account.pricePrecision,
      exchangeRate: exchange_rate || 1,
      description,
      referenceNumber: reference_number,
      paymentMode: payment_mode,
      status: "manually_added",
      source: "manually_added",
      customerId: customer_id,
      customerName: validation.customerName,
      vendorId: vendor_id,
      vendorName: validation.vendorName,
      taxId: tax_id,
      isInclusiveTax: is_inclusive_tax || false,
      tags,
      documents,
      bankCharges: bank_charges || 0,
      userId: validation.effectiveUserId,
      taxAuthorityId: tax_authority_id,
      taxExemptionId: tax_exemption_id,
      customFields: custom_fields,
      fromAccountTags: from_account_tags,
      toAccountTags: to_account_tags,
    });

    if (validation.debitOrCredit === "credit") {
      account.balance = (account.balance || 0) + (transaction.amount || 0);
      account.bankBalance = (account.bankBalance || 0) + (transaction.amount || 0);
    } else {
      account.balance = (account.balance || 0) - (transaction.amount || 0);
      account.bankBalance = (account.bankBalance || 0) - (transaction.amount || 0);
    }
    await account.save();

    res.status(201).json({
      code: 0,
      message: "The bank transaction has been recorded.",
      banktransaction: transaction
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to create bank transaction" });
  }
};

/**
 * List bank transactions
 * GET /banktransactions
 */
export const listBankTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id, transaction_type, date, amount, status, reference_number, filter_by, sort_column, transaction_status, search_text, page = 1, per_page = 200 } = req.query;
    const orgId = req.user.organizationId;

    if (account_id) {
      await syncPaymentHistoryForBankAccount(orgId, account_id);
    }

    const query: any = { organization: orgId };

    if (account_id) {
      query.$or = [
        { accountId: account_id },
        { fromAccountId: account_id },
        { toAccountId: account_id },
      ];
    }
    if (transaction_type) query.transactionType = transaction_type;

    const statusValue = status || transaction_status || filter_by;
    if (statusValue === "Status.Uncategorized" || statusValue === "uncategorized") {
      query.status = "uncategorized";
    } else if (statusValue === "Status.Categorized" || statusValue === "categorized") {
      query.status = "categorized";
    } else if (statusValue === "Status.ManuallyAdded" || statusValue === "manually_added") {
      query.status = "manually_added";
    } else if (statusValue === "Status.Matched" || statusValue === "matched") {
      query.status = "matched";
    } else if (statusValue === "Status.Excluded" || statusValue === "excluded") {
      query.status = "excluded";
    } else if (statusValue === "Status.Unreconciled" || statusValue === "unreconciled") {
      query.isReconciled = false;
    } else if (statusValue === "Status.Reconciled" || statusValue === "reconciled") {
      query.isReconciled = true;
    }

    if (reference_number) {
      query.referenceNumber = { $regex: reference_number, $options: "i" };
    }

    if (search_text) {
      const searchOr = [
        { description: { $regex: search_text, $options: "i" } },
        { payee: { $regex: search_text, $options: "i" } },
        { customerName: { $regex: search_text, $options: "i" } },
        { vendorName: { $regex: search_text, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    if (date) {
      const dateStr = date as string;
      if (dateStr.includes(",")) {
        const [start, end] = dateStr.split(",");
        query.date = { $gte: new Date(start), $lte: new Date(end) };
      } else {
        query.date = new Date(dateStr);
      }
    }

    if (amount) {
      const amountStr = amount as string;
      if (amountStr.includes(",")) {
        const [start, end] = amountStr.split(",").map(Number);
        query.amount = { $gte: start, $lte: end };
      } else {
        query.amount = Number(amount);
      }
    }

    const sort: any = { date: -1, createdAt: -1 };
    if (sort_column && sort_column !== "date") {
      delete sort.createdAt;
      sort[sort_column as string] = -1;
    }

    const skip = (Number(page) - 1) * Number(per_page);
    const transactions = await BankTransaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(per_page))
      .populate("accountId", "accountName accountType")
      .populate("customerId", "name")
      .populate("vendorId", "name");

    res.json({ code: 0, message: "success", banktransactions: transactions });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to list bank transactions" });
  }
};

/**
 * Get bank transaction
 * GET /banktransactions/:bank_transaction_id
 */
export const getBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { bank_transaction_id } = req.params;
    const transaction = await BankTransaction.findOne({
      _id: bank_transaction_id,
      organization: req.user.organizationId
    })
      .populate("accountId", "accountName accountType")
      .populate("customerId", "name")
      .populate("vendorId", "name")
      .populate("currencyId", "code symbol");

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Bank transaction not found" });
      return;
    }

    res.json({ code: 0, message: "success", banktransaction: transaction });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to get bank transaction" });
  }
};

/**
 * Update bank transaction
 * PUT /banktransactions/:bank_transaction_id
 */
export const updateBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { bank_transaction_id } = req.params;
    const updateData: any = {};

    if (req.body.transaction_type) updateData.transactionType = req.body.transaction_type;
    if (req.body.from_account_id) updateData.fromAccountId = req.body.from_account_id;
    if (req.body.to_account_id) updateData.toAccountId = req.body.to_account_id;
    if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
    if (req.body.payment_mode) updateData.paymentMode = req.body.payment_mode;
    if (req.body.exchange_rate) updateData.exchangeRate = parseFloat(req.body.exchange_rate);
    if (req.body.date) updateData.date = new Date(req.body.date);
    if (req.body.customer_id) updateData.customerId = req.body.customer_id;
    if (req.body.reference_number) updateData.referenceNumber = req.body.reference_number;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.currency_id) updateData.currencyId = req.body.currency_id;
    if (req.body.tax_id) updateData.taxId = req.body.tax_id;
    if (req.body.is_inclusive_tax !== undefined) updateData.isInclusiveTax = req.body.is_inclusive_tax;
    if (req.body.tags) updateData.tags = req.body.tags;
    if (req.body.documents) updateData.documents = req.body.documents;
    if (req.body.bank_charges !== undefined) updateData.bankCharges = parseFloat(req.body.bank_charges);
    if (req.body.user_id) updateData.userId = req.body.user_id;
    if (req.body.tax_authority_id) updateData.taxAuthorityId = req.body.tax_authority_id;
    if (req.body.tax_exemption_id) updateData.taxExemptionId = req.body.tax_exemption_id;
    if (req.body.custom_fields) updateData.customFields = req.body.custom_fields;
    if (req.body.from_account_tags) updateData.fromAccountTags = req.body.from_account_tags;
    if (req.body.to_account_tags) updateData.toAccountTags = req.body.to_account_tags;
    if (req.body.line_items) updateData.lineItems = req.body.line_items;

    const transaction = await BankTransaction.findOneAndUpdate(
      { _id: bank_transaction_id, organization: req.user.organizationId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Bank transaction not found" });
      return;
    }

    res.json({
      code: 0,
      message: "The bank transaction has been updated.",
      banktransaction: transaction
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to update bank transaction" });
  }
};

/**
 * Delete bank transaction
 * DELETE /banktransactions/:bank_transaction_id
 */
export const deleteBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { bank_transaction_id } = req.params;
    const transaction = await BankTransaction.findOne({
      _id: bank_transaction_id,
      organization: req.user.organizationId
    });

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Bank transaction not found" });
      return;
    }

    if (transaction.isReconciled) {
      res.status(400).json({
        code: 1,
        message: "Cannot delete a reconciled transaction. Undo reconciliation first."
      });
      return;
    }

    await BankTransaction.deleteOne({
      _id: bank_transaction_id,
      organization: req.user.organizationId
    });

    const account = await BankAccount.findById(transaction.accountId);
    if (account) {
      if (transaction.debitOrCredit === "credit") {
        account.balance = (account.balance || 0) - (transaction.amount || 0);
        account.bankBalance = (account.bankBalance || 0) - (transaction.amount || 0);
      } else {
        account.balance = (account.balance || 0) + (transaction.amount || 0);
        account.bankBalance = (account.bankBalance || 0) + (transaction.amount || 0);
      }
      await account.save();
    }

    res.json({ code: 0, message: "The transaction has been deleted." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to delete bank transaction" });
  }
};

/**
 * Get matching transactions
 * GET /banktransactions/uncategorized/:transaction_id/match
 */
export const getMatchingTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const { transaction_type, date_after, date_before, amount_start, amount_end, contact, reference_number, show_all_transactions, page = 1, per_page = 200 } = req.query;

    const transaction = await BankTransaction.findOne({
      _id: transaction_id,
      organization: req.user.organizationId
    });

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    const query: any = {
      organization: req.user.organizationId,
      status: { $in: ["uncategorized", "manually_added"] },
    };

    if (transaction_type) query.transactionType = transaction_type;
    if (date_after || date_before) {
      query.date = {};
      if (date_after) query.date.$gte = new Date(date_after as string);
      if (date_before) query.date.$lte = new Date(date_before as string);
    }
    if (amount_start || amount_end) {
      query.amount = {};
      if (amount_start) query.amount.$gte = Number(amount_start);
      if (amount_end) query.amount.$lte = Number(amount_end);
    }
    if (contact) {
      query.$or = [
        { payee: { $regex: contact, $options: "i" } },
        { customerName: { $regex: contact, $options: "i" } },
        { vendorName: { $regex: contact, $options: "i" } },
      ];
    }
    if (reference_number) {
      query.referenceNumber = { $regex: reference_number, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(per_page);
    const matchingTransactions = await BankTransaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(per_page))
      .select("transactionId date transactionType referenceNumber amount debitOrCredit transactionNumber isPaidViaPrintCheck contactName isBestMatch");

    res.json({ code: 0, message: "success", matching_transactions: matchingTransactions });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to get matching transactions" });
  }
};

/**
 * Match a transaction
 * POST /banktransactions/uncategorized/:transaction_id/match
 */
export const matchBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const { transactions_to_be_matched } = req.body;

    if (!transactions_to_be_matched || !Array.isArray(transactions_to_be_matched)) {
      res.status(400).json({ code: 1, message: "transactions_to_be_matched array is required" });
      return;
    }

    const transaction = await BankTransaction.findOne({
      _id: transaction_id,
      organization: req.user.organizationId
    });

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    transaction.status = "matched";
    transaction.matchingTransactions = transactions_to_be_matched;
    await transaction.save();

    res.status(201).json({ code: 0, message: "The transaction has been matched." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to match transaction" });
  }
};

/**
 * Unmatch a matched transaction
 * POST /banktransactions/:transaction_id/unmatch
 */
export const unmatchBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const transaction = await BankTransaction.findOneAndUpdate(
      { _id: transaction_id, organization: req.user.organizationId },
      { status: "uncategorized", matchingTransactions: [] },
      { new: true }
    );

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "The transaction has been unmatched." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to unmatch transaction" });
  }
};

/**
 * Exclude a transaction
 * POST /banktransactions/uncategorized/:transaction_id/exclude
 */
export const excludeBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const transaction = await BankTransaction.findOneAndUpdate(
      { _id: transaction_id, organization: req.user.organizationId },
      { status: "excluded" },
      { new: true }
    );

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "The transaction has been excluded." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to exclude transaction" });
  }
};

/**
 * Restore an excluded transaction
 * POST /banktransactions/uncategorized/:transaction_id/restore
 */
export const restoreBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const transaction = await BankTransaction.findOneAndUpdate(
      { _id: transaction_id, organization: req.user.organizationId },
      { status: "uncategorized" },
      { new: true }
    );

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "The excluded transaction(s) have been restored." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to restore transaction" });
  }
};

/**
 * Categorize an uncategorized transaction
 * POST /banktransactions/uncategorized/:transaction_id/categorize
 */
export const categorizeBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const updateData: any = { status: "categorized" };

    if (req.body.transaction_type) updateData.transactionType = req.body.transaction_type;
    if (req.body.from_account_id) updateData.fromAccountId = req.body.from_account_id;
    if (req.body.to_account_id) updateData.toAccountId = req.body.to_account_id;
    if (req.body.amount !== undefined) updateData.amount = parseFloat(req.body.amount);
    if (req.body.date) updateData.date = new Date(req.body.date);
    if (req.body.reference_number) updateData.referenceNumber = req.body.reference_number;
    if (req.body.payment_mode) updateData.paymentMode = req.body.payment_mode;
    if (req.body.exchange_rate) updateData.exchangeRate = parseFloat(req.body.exchange_rate);
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.customer_id) updateData.customerId = req.body.customer_id;
    if (req.body.tags) updateData.tags = req.body.tags;
    if (req.body.documents) updateData.documents = req.body.documents;
    if (req.body.currency_id) updateData.currencyId = req.body.currency_id;
    if (req.body.tax_id) updateData.taxId = req.body.tax_id;
    if (req.body.to_account_tags) updateData.toAccountTags = req.body.to_account_tags;
    if (req.body.from_account_tags) updateData.fromAccountTags = req.body.from_account_tags;
    if (req.body.is_inclusive_tax !== undefined) updateData.isInclusiveTax = req.body.is_inclusive_tax;
    if (req.body.bank_charges !== undefined) updateData.bankCharges = parseFloat(req.body.bank_charges);
    if (req.body.user_id) updateData.userId = req.body.user_id;
    if (req.body.tax_authority_id) updateData.taxAuthorityId = req.body.tax_authority_id;
    if (req.body.tax_exemption_id) updateData.taxExemptionId = req.body.tax_exemption_id;
    if (req.body.custom_fields) updateData.customFields = req.body.custom_fields;
    if (req.body.line_items) updateData.lineItems = req.body.line_items;

    const transaction = await BankTransaction.findOneAndUpdate(
      { _id: transaction_id, organization: req.user.organizationId },
      updateData,
      { new: true }
    );

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "The transaction(s) have been categorized." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to categorize transaction" });
  }
};

/**
 * Uncategorize a categorized transaction
 * POST /banktransactions/:transaction_id/uncategorize
 */
export const uncategorizeBankTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;
    const transaction = await BankTransaction.findOneAndUpdate(
      { _id: transaction_id, organization: req.user.organizationId },
      { status: "uncategorized" },
      { new: true }
    );

    if (!transaction) {
      res.status(404).json({ code: 1, message: "Transaction not found" });
      return;
    }

    res.status(201).json({ code: 0, message: "Transaction(s) have been uncategorized." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to uncategorize transaction" });
  }
};

// ==================== BANK RECONCILIATIONS ====================

/**
 * Create reconciliation
 * POST /bankaccounts/:account_id/reconciliations
 */
export const createBankReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const {
      start_date,
      end_date,
      closing_balance,
      transaction_ids,
      notes
    } = req.body || {};

    if (!start_date || !end_date) {
      res.status(400).json({ code: 1, message: "start_date and end_date are required" });
      return;
    }
    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      res.status(400).json({ code: 1, message: "transaction_ids must contain at least one transaction" });
      return;
    }

    const account = await BankAccount.findOne({
      _id: account_id,
      organization: req.user.organizationId
    });
    if (!account) {
      res.status(404).json({ code: 1, message: "Bank account not found" });
      return;
    }

    const normalizedTransactionIds = transaction_ids
      .map((id: any) => String(id))
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    if (normalizedTransactionIds.length === 0) {
      res.status(400).json({ code: 1, message: "No valid transactions selected" });
      return;
    }

    const transactions = await BankTransaction.find({
      _id: { $in: normalizedTransactionIds },
      organization: req.user.organizationId,
      accountId: account_id,
    });

    if (transactions.length !== normalizedTransactionIds.length) {
      res.status(400).json({ code: 1, message: "One or more selected transactions are invalid for this account" });
      return;
    }

    const allowedStatuses = new Set(["manually_added", "matched", "categorized"]);
    const invalidTransaction = transactions.find((txn) => !allowedStatuses.has(String(txn.status || "")));
    if (invalidTransaction) {
      res.status(400).json({
        code: 1,
        message: `Transaction ${invalidTransaction._id} is not eligible for reconciliation`
      });
      return;
    }

    const alreadyReconciled = transactions.find((txn) => txn.isReconciled);
    if (alreadyReconciled) {
      res.status(400).json({
        code: 1,
        message: `Transaction ${alreadyReconciled._id} is already reconciled`
      });
      return;
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      res.status(400).json({ code: 1, message: "Invalid reconciliation date range" });
      return;
    }

    const outOfRange = transactions.find((txn) => {
      const txnDate = new Date(txn.date);
      return txnDate < startDate || txnDate > endDate;
    });
    if (outOfRange) {
      res.status(400).json({
        code: 1,
        message: `Transaction ${outOfRange._id} is outside selected reconciliation date range`
      });
      return;
    }

    const clearedAmount = Number(
      transactions.reduce((sum, txn) => {
        const absoluteAmount = Math.abs(toNumber(txn.amount));
        return sum + (txn.debitOrCredit === "credit" ? absoluteAmount : -absoluteAmount);
      }, 0).toFixed(2)
    );

    const closingBalance = Number(toNumber(closing_balance).toFixed(2));
    const difference = Number((closingBalance - clearedAmount).toFixed(2));

    if (Math.abs(difference) > 0.009) {
      res.status(400).json({
        code: 1,
        message: `Difference must be zero to reconcile. Current difference: ${difference.toFixed(2)}`
      });
      return;
    }

    const reconciliation = await BankReconciliation.create({
      organization: req.user.organizationId,
      accountId: account_id,
      startDate,
      endDate,
      closingBalance,
      clearedAmount,
      difference,
      status: "reconciled",
      reconciledTransactions: normalizedTransactionIds,
      notes,
      createdBy: req.user.userId,
      reconciledAt: new Date(),
    });

    await BankTransaction.updateMany(
      { _id: { $in: normalizedTransactionIds }, organization: req.user.organizationId, accountId: account_id },
      {
        $set: {
          isReconciled: true,
          reconciliationId: reconciliation._id,
          reconciledAt: new Date()
        }
      }
    );

    res.status(201).json({
      code: 0,
      message: "Account reconciled successfully",
      reconciliation
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to create reconciliation" });
  }
};

/**
 * List reconciliations for an account
 * GET /bankaccounts/:account_id/reconciliations
 */
export const listBankReconciliations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.params;
    const { page = 1, per_page = 200, status } = req.query as any;

    const query: any = {
      organization: req.user.organizationId,
      accountId: account_id,
    };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(per_page);
    const [reconciliations, total] = await Promise.all([
      BankReconciliation.find(query)
        .sort({ endDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(per_page))
        .populate("createdBy", "name email"),
      BankReconciliation.countDocuments(query)
    ]);

    res.json({
      code: 0,
      message: "success",
      reconciliations,
      pagination: {
        page: Number(page),
        per_page: Number(per_page),
        total
      }
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to list reconciliations" });
  }
};

/**
 * Get one reconciliation
 * GET /bankaccounts/:account_id/reconciliations/:reconciliation_id
 */
export const getBankReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id, reconciliation_id } = req.params;
    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliation_id,
      organization: req.user.organizationId,
      accountId: account_id
    }).populate("reconciledTransactions");

    if (!reconciliation) {
      res.status(404).json({ code: 1, message: "Reconciliation not found" });
      return;
    }

    res.json({ code: 0, message: "success", reconciliation });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to fetch reconciliation" });
  }
};

const validateLatestReconciliation = async (
  organizationId: string,
  accountId: string,
  reconciliationId: string
): Promise<{ ok: boolean; message?: string }> => {
  const latest = await BankReconciliation.findOne({
    organization: organizationId,
    accountId
  }).sort({ endDate: -1, createdAt: -1 });

  if (!latest) {
    return { ok: false, message: "No reconciliations found for this account" };
  }

  if (latest._id.toString() !== reconciliationId) {
    return {
      ok: false,
      message: "Undo/Delete is allowed only for the latest reconciliation. Undo newer reconciliations first."
    };
  }

  return { ok: true };
};

/**
 * Undo reconciliation
 * POST /bankaccounts/:account_id/reconciliations/:reconciliation_id/undo
 */
export const undoBankReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id, reconciliation_id } = req.params;
    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliation_id,
      organization: req.user.organizationId,
      accountId: account_id
    });

    if (!reconciliation) {
      res.status(404).json({ code: 1, message: "Reconciliation not found" });
      return;
    }

    if (reconciliation.status === "undone") {
      res.status(400).json({ code: 1, message: "Reconciliation is already undone" });
      return;
    }

    const latestValidation = await validateLatestReconciliation(
      req.user.organizationId,
      account_id,
      reconciliation_id
    );
    if (!latestValidation.ok) {
      res.status(400).json({ code: 1, message: latestValidation.message });
      return;
    }

    await BankTransaction.updateMany(
      {
        _id: { $in: reconciliation.reconciledTransactions },
        organization: req.user.organizationId,
        accountId: account_id,
        reconciliationId: reconciliation._id
      },
      {
        $set: { isReconciled: false },
        $unset: { reconciliationId: 1, reconciledAt: 1 }
      }
    );

    reconciliation.status = "undone";
    reconciliation.undoneAt = new Date();
    await reconciliation.save();

    res.json({ code: 0, message: "Reconciliation undone successfully" });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to undo reconciliation" });
  }
};

/**
 * Delete reconciliation
 * DELETE /bankaccounts/:account_id/reconciliations/:reconciliation_id
 */
export const deleteBankReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id, reconciliation_id } = req.params;
    const reconciliation = await BankReconciliation.findOne({
      _id: reconciliation_id,
      organization: req.user.organizationId,
      accountId: account_id
    });

    if (!reconciliation) {
      res.status(404).json({ code: 1, message: "Reconciliation not found" });
      return;
    }

    const latestValidation = await validateLatestReconciliation(
      req.user.organizationId,
      account_id,
      reconciliation_id
    );
    if (!latestValidation.ok) {
      res.status(400).json({ code: 1, message: latestValidation.message });
      return;
    }

    await BankTransaction.updateMany(
      {
        _id: { $in: reconciliation.reconciledTransactions },
        organization: req.user.organizationId,
        accountId: account_id,
        reconciliationId: reconciliation._id
      },
      {
        $set: { isReconciled: false },
        $unset: { reconciliationId: 1, reconciledAt: 1 }
      }
    );

    await BankReconciliation.deleteOne({ _id: reconciliation._id });

    res.json({ code: 0, message: "Reconciliation deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to delete reconciliation" });
  }
};

// ==================== BANK RULES ====================

/**
 * Create a bank rule
 * POST /bankaccounts/rules
 */
export const createBankRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { rule_name, target_account_id, apply_to, criteria_type, criterion, record_as, account_id, customer_id, tax_id, reference_number, vat_treatment, tax_treatment, is_reverse_charge_applied, product_type, tax_authority_id, tax_exemption_id } = req.body;

    if (!rule_name || !target_account_id || !apply_to || !criteria_type || !criterion || !record_as) {
      res.status(400).json({ code: 1, message: "rule_name, target_account_id, apply_to, criteria_type, criterion, and record_as are required" });
      return;
    }

    let accountName;
    if (account_id) {
      const account = await ChartOfAccount.findOne({ _id: account_id, organization: req.user.organizationId });
      accountName = account?.accountName;
    }

    let customerName;
    if (customer_id) {
      const customer = await Customer.findOne({ _id: customer_id, organization: req.user.organizationId });
      customerName = customer?.name;
    }

    const rule = await BankRule.create({
      organization: req.user.organizationId,
      ruleName: rule_name,
      targetAccountId: target_account_id,
      applyTo: apply_to,
      criteriaType: criteria_type,
      criterion: criterion,
      recordAs: record_as,
      accountId: account_id,
      accountName,
      customerId: customer_id,
      customerName,
      taxId: tax_id,
      referenceNumber: reference_number,
      vatTreatment: vat_treatment,
      taxTreatment: tax_treatment,
      isReverseChargeApplied: is_reverse_charge_applied,
      productType: product_type,
      taxAuthorityId: tax_authority_id,
      taxExemptionId: tax_exemption_id,
    });

    res.status(201).json({ code: 0, message: "The bank rule has been created.", rule });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to create bank rule" });
  }
};

/**
 * List bank rules
 * GET /bankaccounts/rules
 */
export const listBankRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { account_id } = req.query;
    const query: any = { organization: req.user.organizationId };

    if (account_id) {
      query.targetAccountId = account_id;
    }

    const rules = await BankRule.find(query)
      .sort({ ruleOrder: 1 })
      .populate("targetAccountId", "accountName accountType")
      .populate("accountId", "accountName")
      .populate("customerId", "name")
      .populate("taxId", "name");

    res.json({ code: 0, message: "success", rules });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to list bank rules" });
  }
};

/**
 * Get a bank rule
 * GET /bankaccounts/rules/:rule_id
 */
export const getBankRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { rule_id } = req.params;
    const rule = await BankRule.findOne({
      _id: rule_id,
      organization: req.user.organizationId
    })
      .populate("targetAccountId", "accountName accountType")
      .populate("accountId", "accountName")
      .populate("customerId", "name")
      .populate("taxId", "name");

    if (!rule) {
      res.status(404).json({ code: 1, message: "Bank rule not found" });
      return;
    }

    res.json({
      code: 0,
      message: "success",
      rule_id: rule._id,
      rule_name: rule.ruleName,
      rule_order: rule.ruleOrder,
      apply_to: rule.applyTo,
      criteria_type: rule.criteriaType,
      criterion: rule.criterion,
      record_as: rule.recordAs,
      account_id: rule.accountId,
      account_name: rule.accountName,
      tax_id: rule.taxId,
      customer_id: rule.customerId,
      customer_name: rule.customerName,
      reference_number: rule.referenceNumber,
      payment_mode: rule.paymentMode,
      vat_treatment: rule.vatTreatment,
      tax_treatment: rule.taxTreatment,
      is_reverse_charge_applied: rule.isReverseChargeApplied,
      product_type: rule.productType,
      tax_authority_id: rule.taxAuthorityId,
      tax_authority_name: rule.taxAuthorityName,
      tax_exemption_code: rule.taxExemptionCode,
    });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to get bank rule" });
  }
};

/**
 * Update a bank rule
 * PUT /bankaccounts/rules/:rule_id
 */
export const updateBankRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { rule_id } = req.params;
    const { rule_name, target_account_id, apply_to, criteria_type, criterion, record_as, account_id, customer_id, tax_id, reference_number, vat_treatment, tax_treatment, is_reverse_charge_applied, product_type, tax_authority_id, tax_exemption_id } = req.body;

    if (!rule_name || !target_account_id || !apply_to || !criteria_type || !criterion || !record_as) {
      res.status(400).json({ code: 1, message: "rule_name, target_account_id, apply_to, criteria_type, criterion, and record_as are required" });
      return;
    }

    let accountName;
    if (account_id) {
      const account = await ChartOfAccount.findOne({ _id: account_id, organization: req.user.organizationId });
      accountName = account?.accountName;
    }

    let customerName;
    if (customer_id) {
      const customer = await Customer.findOne({ _id: customer_id, organization: req.user.organizationId });
      customerName = customer?.name;
    }

    const rule = await BankRule.findOneAndUpdate(
      { _id: rule_id, organization: req.user.organizationId },
      {
        ruleName: rule_name,
        targetAccountId: target_account_id,
        applyTo: apply_to,
        criteriaType: criteria_type,
        criterion: criterion,
        recordAs: record_as,
        accountId: account_id,
        accountName,
        customerId: customer_id,
        customerName,
        taxId: tax_id,
        referenceNumber: reference_number,
        vatTreatment: vat_treatment,
        taxTreatment: tax_treatment,
        isReverseChargeApplied: is_reverse_charge_applied,
        productType: product_type,
        taxAuthorityId: tax_authority_id,
        taxExemptionId: tax_exemption_id,
      },
      { new: true, runValidators: true }
    );

    if (!rule) {
      res.status(404).json({ code: 1, message: "Bank rule not found" });
      return;
    }

    res.json({ code: 0, message: "The bank rule has been updated.", rule });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to update bank rule" });
  }
};

/**
 * Delete a bank rule
 * DELETE /bankaccounts/rules/:rule_id
 */
export const deleteBankRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ code: 1, message: "Unauthorized" });
      return;
    }

    const { rule_id } = req.params;
    const rule = await BankRule.findOneAndDelete({
      _id: rule_id,
      organization: req.user.organizationId
    });

    if (!rule) {
      res.status(404).json({ code: 1, message: "Bank rule not found" });
      return;
    }

    res.json({ code: 0, message: "The rule has been deleted." });
  } catch (error: any) {
    res.status(500).json({ code: 1, message: error.message || "Failed to delete bank rule" });
  }
};

export default {
  getBankAccountCurrencies,
  createBankAccount,
  listBankAccounts,
  getBankAccount,
  updateBankAccount,
  deleteBankAccount,
  markBankAccountInactive,
  markBankAccountActive,
  importBankStatement,
  getLastImportedStatement,
  deleteLastImportedStatement,
  createBankTransaction,
  listBankTransactions,
  getBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
  getMatchingTransactions,
  matchBankTransaction,
  unmatchBankTransaction,
  excludeBankTransaction,
  restoreBankTransaction,
  categorizeBankTransaction,
  uncategorizeBankTransaction,
  createBankReconciliation,
  listBankReconciliations,
  getBankReconciliation,
  undoBankReconciliation,
  deleteBankReconciliation,
  createBankRule,
  listBankRules,
  getBankRule,
  updateBankRule,
  deleteBankRule,
};
