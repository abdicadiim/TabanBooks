import mongoose from "mongoose";
import BankAccount from "../models/BankAccount.js";
import BankTransaction from "../models/BankTransaction.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import Customer from "../models/Customer.js";
import Vendor from "../models/Vendor.js";

type SyncBankTransactionOptions = {
  organizationId: string;
  transactionKey: string;
  source: string;
  accountCandidates?: any[];
  amount: any;
  date?: any;
  referenceNumber?: any;
  description?: any;
  paymentMode?: any;
  transactionType: "deposit" | "withdrawal" | "expense";
  debitOrCredit: "debit" | "credit";
  shouldSync?: boolean;
  customerId?: any;
  customerName?: any;
  vendorId?: any;
  vendorName?: any;
  fallbackDescription?: string;
};

const normalizeString = (value: any): string | undefined => {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
};

const normalizeObjectId = (value: any): string | undefined => {
  const candidate =
    value instanceof mongoose.Types.ObjectId
      ? value.toString()
      : typeof value === "object" && value !== null
        ? String(value._id || value.id || value.accountId || value.bankAccountId || "").trim()
        : String(value || "").trim();

  return mongoose.Types.ObjectId.isValid(candidate) ? candidate : undefined;
};

const getContactDisplayName = (contact: any): string | undefined => {
  const value =
    contact?.displayName ||
    contact?.name ||
    contact?.companyName ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ");

  return normalizeString(value);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractCandidateName = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "object") {
    return normalizeString(value.accountName || value.displayName || value.name || value.rawName);
  }
  return mongoose.Types.ObjectId.isValid(String(value || "").trim())
    ? undefined
    : normalizeString(value);
};

export const resolveOrganizationBankAccount = async (
  organizationId: string,
  candidates: any[] = [],
): Promise<any | null> => {
  for (const candidate of candidates) {
    const objectId = normalizeObjectId(candidate);
    if (objectId) {
      const account = await BankAccount.findOne({ _id: objectId, organization: organizationId });
      if (account) return account;

      const chartAccount = await ChartOfAccount.findOne({
        _id: objectId,
        organization: organizationId,
      }).lean();

      const chartAccountName = normalizeString(chartAccount?.accountName || chartAccount?.name);
      if (chartAccountName) {
        const mappedBankAccount = await BankAccount.findOne({
          organization: organizationId,
          accountName: { $regex: `^${escapeRegex(chartAccountName)}$`, $options: "i" },
        });
        if (mappedBankAccount) return mappedBankAccount;
      }
    }

    const name = extractCandidateName(candidate);
    if (!name) continue;

    const account = await BankAccount.findOne({
      organization: organizationId,
      accountName: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    if (account) return account;
  }

  return null;
};

const signedBalanceEffect = (debitOrCredit: "debit" | "credit", amount: number): number =>
  debitOrCredit === "credit" ? amount : -amount;

const addBalanceDelta = (deltas: Map<string, number>, accountId: string | undefined, amount: number) => {
  if (!accountId || !Number.isFinite(amount) || amount === 0) return;
  deltas.set(accountId, (deltas.get(accountId) || 0) + amount);
};

const applyBalanceDeltas = async (organizationId: string, deltas: Map<string, number>) => {
  const updates = Array.from(deltas.entries())
    .filter(([, delta]) => Number.isFinite(delta) && Math.abs(delta) > 0.000001)
    .map(([accountId, delta]) =>
      BankAccount.updateOne(
        { _id: accountId, organization: organizationId },
        { $inc: { balance: delta, bankBalance: delta } },
      ),
    );

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};

export const syncLinkedBankTransaction = async (
  options: SyncBankTransactionOptions,
): Promise<any | null> => {
  const amount = Number(options.amount || 0);
  const shouldSync = options.shouldSync !== false && Number.isFinite(amount) && amount > 0;
  const existingTransaction = await BankTransaction.findOne({
    organization: options.organizationId,
    transactionId: options.transactionKey,
  });

  const bankAccount = shouldSync
    ? await resolveOrganizationBankAccount(options.organizationId, options.accountCandidates || [])
    : null;

  let customerName = normalizeString(options.customerName);
  let vendorName = normalizeString(options.vendorName);

  const customerId = normalizeObjectId(options.customerId);
  const vendorId = normalizeObjectId(options.vendorId);

  if (!customerName && customerId) {
    const customer = await Customer.findOne({ _id: customerId, organization: options.organizationId }).lean();
    customerName = getContactDisplayName(customer);
  }

  if (!vendorName && vendorId) {
    const vendor = await Vendor.findOne({ _id: vendorId, organization: options.organizationId }).lean();
    vendorName = getContactDisplayName(vendor);
  }

  const deltas = new Map<string, number>();
  if (existingTransaction?.accountId) {
    addBalanceDelta(
      deltas,
      String(existingTransaction.accountId),
      -signedBalanceEffect(existingTransaction.debitOrCredit, Number(existingTransaction.amount || 0)),
    );
  }

  if (!bankAccount) {
    if (existingTransaction) {
      await BankTransaction.deleteOne({ _id: existingTransaction._id });
    }
    await applyBalanceDeltas(options.organizationId, deltas);
    return null;
  }

  const description =
    normalizeString(options.description) ||
    normalizeString(options.fallbackDescription) ||
    (options.transactionType === "deposit"
      ? "Payment received"
      : options.transactionType === "expense"
        ? "Expense"
        : "Payment made");

  const payload: Record<string, any> = {
    organization: options.organizationId,
    transactionId: options.transactionKey,
    accountId: bankAccount._id,
    accountName: bankAccount.accountName,
    accountType: bankAccount.accountType,
    transactionType: options.transactionType,
    date: options.date ? new Date(options.date) : new Date(),
    debitOrCredit: options.debitOrCredit,
    amount,
    currencyCode: normalizeString(bankAccount.currencyCode) || "USD",
    currencySymbol: normalizeString(bankAccount.currencySymbol) || "$",
    pricePrecision: Number(bankAccount.pricePrecision || 2),
    exchangeRate: 1,
    description,
    referenceNumber: normalizeString(options.referenceNumber),
    paymentMode: normalizeString(options.paymentMode),
    status: "manually_added",
    source: options.source,
    customerId: customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
    customerName,
    vendorId: vendorId ? new mongoose.Types.ObjectId(vendorId) : undefined,
    vendorName,
    payee: customerName || vendorName,
  };

  if (options.debitOrCredit === "debit") {
    payload.fromAccountId = bankAccount._id;
    payload.fromAccountName = bankAccount.accountName;
    payload.toAccountId = undefined;
    payload.toAccountName = undefined;
  } else {
    payload.toAccountId = bankAccount._id;
    payload.toAccountName = bankAccount.accountName;
    payload.fromAccountId = undefined;
    payload.fromAccountName = undefined;
  }

  addBalanceDelta(
    deltas,
    String(bankAccount._id),
    signedBalanceEffect(options.debitOrCredit, amount),
  );

  if (existingTransaction) {
    await BankTransaction.updateOne({ _id: existingTransaction._id }, { $set: payload });
  } else {
    await BankTransaction.create(payload);
  }

  await applyBalanceDeltas(options.organizationId, deltas);
  return payload;
};
