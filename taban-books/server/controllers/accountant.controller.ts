/**
 * Accountant Controller
 * Handles Journals, Chart of Accounts, Budgets
 */

import mongoose from "mongoose";
import { Request, Response } from "express";

import JournalEntry from "../models/JournalEntry.js";
import ChartOfAccount from "../models/ChartOfAccount.js";
import Budget from "../models/Budget.js";
import CurrencyAdjustment from "../models/CurrencyAdjustment.js";
import Bill from "../models/Bill.js";
import Expense from "../models/Expense.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import CreditNote from "../models/CreditNote.js";
import VendorCredit from "../models/VendorCredit.js";
import BulkUpdateHistory from "../models/BulkUpdateHistory.js";
import JournalTemplate from "../models/JournalTemplate.js";
import TransactionLock from "../models/TransactionLock.js";
import Organization from "../models/Organization.js";
import { updateAccountBalances } from "../utils/accounting.js";
import {
  applyResourceVersionHeaders,
  buildResourceVersion,
  requestMatchesResourceVersion,
} from "../utils/resourceVersion.js";
import {
  getAccountTypesForCategory,
  normalizeAccountPayload,
  resolveAccountQueryFilters,
  resolveAccountSortField,
} from "../utils/chartOfAccounts.js";
import {
  DEFAULT_CHART_OF_ACCOUNTS,
  ensureDefaultChartOfAccounts,
} from "../utils/defaultChartOfAccounts.js";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const normalizeJournalStatus = (rawStatus: any): string | undefined => {
  const value = String(rawStatus || "").trim().toLowerCase();
  if (!value) return undefined;
  if (value === "published" || value === "posted") return "posted";
  if (value === "draft") return "draft";
  if (value === "pending approval" || value === "pending_approval" || value === "pending-approval") return "pending_approval";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "cancelled" || value === "canceled") return "cancelled";
  return value;
};

const normalizeBudgetPayload = (payload: any) => {
  const normalized = { ...payload };
  if (!Array.isArray(normalized.lines)) return normalized;

  normalized.lines = normalized.lines.map((line: any) => {
    const periods = Array.isArray(line?.periods)
      ? line.periods.map((p: any) => ({
          period: p?.period,
          amount: Number(p?.amount) || 0,
          actualAmount:
            p?.actualAmount === undefined ? undefined : Number(p.actualAmount) || 0,
        }))
      : [];

    const computedAmount =
      periods.length > 0
        ? periods.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : Number(line?.amount) || 0;

    return {
      ...line,
      amount: computedAmount,
      periods,
    };
  });

  return normalized;
};

const toJournalNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeReportingMethod = (rawMethod: any):
  | "accrual-and-cash"
  | "accrual-only"
  | "cash-only"
  | undefined => {
  const value = String(rawMethod || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (!value) return undefined;
  if (value === "accrual-and-cash" || value === "accrual-cash") return "accrual-and-cash";
  if (value === "accrual-only" || value === "accrual") return "accrual-only";
  if (value === "cash-only" || value === "cash") return "cash-only";
  return undefined;
};

const formatJournalDate = (value: any): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const resolveJournalLineDirection = (rawLine: any): "debit" | "credit" | undefined => {
  const explicit = String(
    rawLine?.debit_or_credit ?? rawLine?.debitOrCredit ?? rawLine?.type ?? ""
  )
    .trim()
    .toLowerCase();

  if (explicit === "debit" || explicit === "credit") {
    return explicit;
  }

  const debit = toJournalNumber(rawLine?.debit ?? rawLine?.debits);
  const credit = toJournalNumber(rawLine?.credit ?? rawLine?.credits);

  if (debit > 0 && credit <= 0) return "debit";
  if (credit > 0 && debit <= 0) return "credit";
  return undefined;
};

const normalizeJournalLine = (rawLine: any, index: number) => {
  const debitValue = toJournalNumber(rawLine?.debit ?? rawLine?.debits);
  const creditValue = toJournalNumber(rawLine?.credit ?? rawLine?.credits);
  const direction = resolveJournalLineDirection(rawLine);
  const explicitAmount = toJournalNumber(rawLine?.amount);
  const amount =
    explicitAmount > 0
      ? explicitAmount
      : direction === "debit"
        ? debitValue
        : direction === "credit"
          ? creditValue
          : Math.max(debitValue, creditValue, 0);

  const debit = direction === "debit" ? amount : direction ? 0 : debitValue;
  const credit = direction === "credit" ? amount : direction ? 0 : creditValue;
  const projectValue = rawLine?.project ?? rawLine?.projectId ?? rawLine?.project_id;

  return {
    lineId: String(rawLine?.lineId ?? rawLine?.line_id ?? rawLine?._id ?? index + 1),
    account: String(rawLine?.account ?? rawLine?.accountId ?? rawLine?.account_id ?? "").trim(),
    accountName: rawLine?.accountName ?? rawLine?.account_name ?? undefined,
    customerId: rawLine?.customerId ?? rawLine?.customer_id ?? undefined,
    customerName: rawLine?.customerName ?? rawLine?.customer_name ?? undefined,
    contact: rawLine?.contact ?? undefined,
    description: rawLine?.description ?? undefined,
    type: rawLine?.type ?? undefined,
    taxId:
      rawLine?.taxId ??
      rawLine?.tax_id ??
      rawLine?.tax?._id ??
      rawLine?.tax?.id ??
      undefined,
    taxName:
      rawLine?.taxName ??
      rawLine?.tax_name ??
      (typeof rawLine?.tax === "string" ? rawLine.tax : rawLine?.tax?.name) ??
      undefined,
    tax: rawLine?.tax ?? undefined,
    amount,
    debitOrCredit: direction,
    debit,
    credit,
    project: projectValue,
    projectName: rawLine?.projectName ?? rawLine?.project_name ?? undefined,
    reportingTags: rawLine?.reportingTags ?? rawLine?.reporting_tags ?? undefined,
    tags: Array.isArray(rawLine?.tags) ? rawLine.tags : undefined,
    locationId: rawLine?.locationId ?? rawLine?.location_id ?? undefined,
  };
};

const summarizeJournalLines = (lines: any[]) =>
  lines.reduce(
    (totals, line) => ({
      totalDebit: totals.totalDebit + toJournalNumber(line?.debit),
      totalCredit: totals.totalCredit + toJournalNumber(line?.credit),
    }),
    { totalDebit: 0, totalCredit: 0 }
  );

const validateNormalizedJournalLines = (lines: any[]): string | null => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return "Please add at least one journal line.";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const debit = toJournalNumber(line?.debit);
    const credit = toJournalNumber(line?.credit);

    if (!line?.account) {
      return `Journal line ${index + 1} is missing an account.`;
    }

    if (debit > 0 && credit > 0) {
      return `Journal line ${index + 1} cannot contain both a debit and a credit amount.`;
    }

    if (debit <= 0 && credit <= 0) {
      return `Journal line ${index + 1} must contain either a debit or a credit amount.`;
    }
  }

  const totals = summarizeJournalLines(lines);
  if (Math.abs(totals.totalDebit - totals.totalCredit) > 0.01) {
    return `Journal entries must be balanced. Total Debits: ${totals.totalDebit.toFixed(2)}, Total Credits: ${totals.totalCredit.toFixed(2)}`;
  }

  return null;
};

const normalizeJournalPayload = (payload: any) => {
  const normalized = { ...payload };
  const sourceLines = Array.isArray(payload?.lines)
    ? payload.lines
    : Array.isArray(payload?.line_items)
      ? payload.line_items
      : Array.isArray(payload?.entries)
        ? payload.entries
        : Array.isArray(payload?.journalLines)
          ? payload.journalLines
          : [];

  const lines = sourceLines
    .map((line: any, index: number) => normalizeJournalLine(line, index))
    .filter((line: any) => line.account || line.debit > 0 || line.credit > 0);
  const totals = summarizeJournalLines(lines);
  const dateValue = payload?.date ?? payload?.journalDate ?? payload?.journal_date;
  const entryNumberValue =
    payload?.entryNumber ?? payload?.entry_number ?? payload?.journalNumber ?? payload?.journal_number;
  const referenceValue = payload?.reference ?? payload?.referenceNumber ?? payload?.reference_number;
  const reportingMethodValue = normalizeReportingMethod(
    payload?.reportingMethod ?? payload?.reporting_method
  );
  const currencyValue = String(
    payload?.currency ??
      payload?.currencyCode ??
      payload?.currency_code ??
      payload?.currencyId ??
      payload?.currency_id ??
      ""
  )
    .trim()
    .toUpperCase();
  const amountValue = toJournalNumber(payload?.amount);

  if (dateValue !== undefined) normalized.date = dateValue;
  if (entryNumberValue) normalized.entryNumber = entryNumberValue;
  if (referenceValue !== undefined) normalized.reference = referenceValue;
  if (payload?.notes !== undefined || payload?.description !== undefined) {
    normalized.notes = payload?.notes ?? payload?.description ?? "";
    normalized.description = payload?.description ?? payload?.notes ?? "";
  }
  if (reportingMethodValue) normalized.reportingMethod = reportingMethodValue;
  if (currencyValue) normalized.currency = currencyValue;
  if (payload?.status !== undefined) {
    normalized.status = normalizeJournalStatus(payload?.status) ?? payload?.status;
  }
  if (sourceLines.length > 0 || Array.isArray(payload?.lines) || Array.isArray(payload?.line_items)) {
    normalized.lines = lines;
  }
  if (payload?.amount !== undefined || lines.length > 0) {
    normalized.amount = amountValue || Math.max(totals.totalDebit, totals.totalCredit, 0);
  }

  delete normalized.line_items;
  delete normalized.entries;
  delete normalized.journalLines;
  delete normalized.journalDate;
  delete normalized.journal_date;
  delete normalized.entry_number;
  delete normalized.journalNumber;
  delete normalized.journal_number;
  delete normalized.referenceNumber;
  delete normalized.reference_number;
  delete normalized.currencyCode;
  delete normalized.currency_code;
  delete normalized.currencyId;
  delete normalized.currency_id;
  delete normalized.reporting_method;

  return normalized;
};

const serializeJournalLine = (line: any, index: number) => {
  const normalized = normalizeJournalLine(line, index);

  return {
    ...line,
    ...normalized,
    line_id: normalized.lineId,
    accountId: normalized.account,
    account_id: normalized.account,
    account_name: normalized.accountName,
    customer_id: normalized.customerId,
    customer_name: normalized.customerName,
    tax_id: normalized.taxId,
    tax_name: normalized.taxName,
    debit_or_credit: normalized.debitOrCredit,
    projectId: normalized.project,
    project_id: normalized.project,
    project_name: normalized.projectName,
    reporting_tags: normalized.reportingTags,
    location_id: normalized.locationId,
  };
};

const serializeJournalEntry = (entry: any) => {
  const raw = typeof entry?.toObject === "function" ? entry.toObject() : entry;
  const lines = Array.isArray(raw?.lines)
    ? raw.lines.map((line: any, index: number) => serializeJournalLine(line, index))
    : [];
  const totals = summarizeJournalLines(lines);
  const total = toJournalNumber(raw?.amount) || Math.max(totals.totalDebit, totals.totalCredit, 0);
  const journalId = String(raw?._id ?? raw?.id ?? "");
  const journalDate = formatJournalDate(raw?.date);

  return {
    ...raw,
    id: journalId,
    journalId,
    journal_id: journalId,
    journalNumber: raw?.entryNumber,
    journal_number: raw?.entryNumber,
    entryNumber: raw?.entryNumber,
    entry_number: raw?.entryNumber,
    date: raw?.date,
    journalDate,
    journal_date: journalDate,
    referenceNumber: raw?.reference ?? raw?.referenceNumber ?? "",
    reference_number: raw?.reference ?? raw?.referenceNumber ?? "",
    notes: raw?.notes ?? raw?.description ?? "",
    description: raw?.description ?? raw?.notes ?? "",
    reportingMethod:
      normalizeReportingMethod(raw?.reportingMethod) ?? raw?.reportingMethod ?? "accrual-and-cash",
    currency: raw?.currency,
    currency_code: raw?.currency,
    currency_id: raw?.currency,
    lines,
    entries: lines,
    line_items: lines,
    amount: total,
    total,
    line_item_total: total,
  };
};

// --- Chart of Accounts ---

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const existingDefaultAccountCount = await ChartOfAccount.countDocuments({
      organization: req.user.organizationId,
      accountName: {
        $in: DEFAULT_CHART_OF_ACCOUNTS.map((account) => account.accountName),
      },
    });

    if (existingDefaultAccountCount < DEFAULT_CHART_OF_ACCOUNTS.length) {
      const organization = await Organization.findById(req.user.organizationId)
        .select("currency")
        .lean();

      await ensureDefaultChartOfAccounts({
        organizationId: req.user.organizationId,
        currency: organization?.currency,
      });
    }

    const {
      page = '1',
      limit = '50',
      per_page,
      search = '',
      type,
      filter_by,
      isActive,
      sortBy = 'accountCode',
      sort_column,
      last_modified_time,
      sortOrder = 'asc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (search) {
      query.$or = [
        { accountName: new RegExp(search as string, 'i') },
        { accountCode: new RegExp(search as string, 'i') }
      ];
    }

    const resolvedFilters = resolveAccountQueryFilters({
      filterBy: filter_by,
      type,
      isActive,
    });

    if (resolvedFilters.accountTypes?.length) {
      query.accountType = { $in: resolvedFilters.accountTypes };
    }
    if (resolvedFilters.isActive !== undefined) {
      query.isActive = resolvedFilters.isActive;
    }
    if (last_modified_time) {
      const modifiedAfter = new Date(last_modified_time as string);
      if (!Number.isNaN(modifiedAfter.getTime())) {
        query.updatedAt = { $gte: modifiedAfter };
      }
    }

    const [latestAccount, accountCount] = await Promise.all([
      ChartOfAccount.findOne(query).sort({ updatedAt: -1 }).select("updatedAt").lean(),
      ChartOfAccount.countDocuments(query),
    ]);

    const versionState = buildResourceVersion("accounts", [
      {
        key: "accounts",
        id: req.user.organizationId,
        updatedAt: (latestAccount as any)?.updatedAt,
        count: accountCount,
        extra: JSON.stringify({
          search,
          type,
          filter_by,
          isActive,
          sortBy,
          sort_column,
          sortOrder,
          last_modified_time: last_modified_time || "",
          page,
          limit,
          per_page,
        }),
      },
    ]);
    applyResourceVersionHeaders(res, versionState);
    if (requestMatchesResourceVersion(req, versionState)) {
      res.status(304).end();
      return;
    }

    const pageSize = parseInt((per_page as string) || (limit as string), 10);
    const skip = (parseInt(page as string, 10) - 1) * pageSize;
    const sort: any = {};
    sort[resolveAccountSortField({ sortBy, sortColumn: sort_column })] =
      sortOrder === 'desc' ? -1 : 1;

    const accounts = await ChartOfAccount.find(query)
      .populate('parentAccount', 'accountName accountCode')
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await ChartOfAccount.countDocuments(query);

    res.json({
      success: true,
      data: accounts.map((account: any) => ({
        ...account,
        currentBalance: Number(account.balance || 0),
      })),
      pagination: {
        total,
        page: parseInt(page as string, 10),
        limit: pageSize,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const payload = normalizeAccountPayload(req.body);

    if (!payload.accountName || !payload.accountType) {
      res.status(400).json({
        success: false,
        message: "account_name/accountName and account_type/accountType are required",
      });
      return;
    }

    if (payload.accountCode) {
      const existingAccount = await ChartOfAccount.findOne({
        organization: req.user.organizationId,
        accountCode: payload.accountCode
      });

      if (existingAccount) {
        res.status(400).json({ success: false, message: "Account code already exists" });
        return;
      }
    }

    const account = await ChartOfAccount.create({
      ...payload,
      organization: req.user.organizationId
    });

    res.status(201).json({ success: true, data: account });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const payload = normalizeAccountPayload(req.body);

    if (payload.accountCode) {
      const existingAccount = await ChartOfAccount.findOne({
        _id: { $ne: req.params.id },
        organization: req.user.organizationId,
        accountCode: payload.accountCode,
      }).lean();

      if (existingAccount) {
        res.status(400).json({ success: false, message: "Account code already exists" });
        return;
      }
    }

    const account = await ChartOfAccount.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      payload,
      { new: true, runValidators: true }
    );

    if (!account) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }

    res.json({ success: true, data: account });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      organization: req.user.organizationId
    });

    if (!account) {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }

    if (account.isSystemAccount) {
      res.status(400).json({ success: false, message: "System accounts cannot be deleted" });
      return;
    }

    await ChartOfAccount.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkDeleteAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ success: false, message: "Invalid IDs" });
      return;
    }

    // Filter out system accounts from deletion
    const accounts = await ChartOfAccount.find({
      _id: { $in: ids },
      organization: req.user.organizationId
    });

    const protectIds = accounts
      .filter(acc => acc.isSystemAccount)
      .map(acc => acc._id.toString());

    const deleteIds = ids.filter(id => !protectIds.includes(id));

    const result = await ChartOfAccount.deleteMany({
      _id: { $in: deleteIds },
      organization: req.user.organizationId
    });

    res.json({
      success: true,
      message: `${result.deletedCount} accounts deleted. ${protectIds.length} system accounts protected.`,
      deletedCount: result.deletedCount,
      protectedCount: protectIds.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUpdateAccountStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { ids, isActive } = req.body;
    if (!ids || !Array.isArray(ids)) {
      res.status(400).json({ success: false, message: "Invalid IDs" });
      return;
    }

    // Protect system accounts from having their active status changed
    const accounts = await ChartOfAccount.find({ _id: { $in: ids }, organization: req.user.organizationId });

    const protectedIds = accounts
      .filter(acc => acc.isSystemAccount)
      .map(acc => acc._id.toString());

    const updateIds = ids.filter((id: any) => !protectedIds.includes(String(id)));

    if (updateIds.length === 0) {
      res.json({
        success: true,
        message: `0 accounts updated. ${protectedIds.length} system accounts protected.`,
        modifiedCount: 0,
        protectedCount: protectedIds.length
      });
      return;
    }

    // Coerce isActive to boolean when possible
    const isActiveBool = isActive === true || isActive === 'true' || isActive === 1 || isActive === '1';

    const result = await ChartOfAccount.updateMany(
      { _id: { $in: updateIds }, organization: req.user.organizationId },
      { $set: { isActive: isActiveBool } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} accounts updated. ${protectedIds.length} system accounts protected.`,
      modifiedCount: result.modifiedCount,
      protectedCount: protectedIds.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Journal Entries ---

export const getJournalEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      page = '1',
      limit = '50',
      per_page,
      search = '',
      status,
      sourceType,
      accountId,
      entry_number,
      reference_number,
      sortBy = 'date',
      sort_column,
      sortOrder = 'desc'
    } = req.query;

    console.log("[DEBUG] getJournalEntries - User:", JSON.stringify(req.user));
    console.log("[DEBUG] getJournalEntries - OrgID from Token:", req.user?.organizationId);

    const query: any = { organization: req.user.organizationId };

    if (search) {
      query.$or = [
        { entryNumber: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') },
        { reference: new RegExp(search as string, 'i') }
      ];
    }
    if (entry_number) {
      query.entryNumber = new RegExp(entry_number as string, 'i');
    }
    if (reference_number) {
      query.reference = new RegExp(reference_number as string, 'i');
    }

    if (status) {
      const normalizedStatus = normalizeJournalStatus(status);
      if (normalizedStatus) query.status = normalizedStatus;
    }
    if (sourceType) query.sourceType = sourceType;
    if (accountId) {
      query['lines.account'] = accountId;
    }

    console.log("Journal Query:", JSON.stringify(query));
    console.log("User Org ID:", req.user?.organizationId);

    const pageSize = parseInt((per_page as string) || (limit as string), 10);
    const resolvedSortField =
      sort_column === 'journal_date'
        ? 'date'
        : sort_column === 'entry_number'
          ? 'entryNumber'
          : sort_column === 'reference_number'
            ? 'reference'
            : sort_column === 'total'
              ? 'amount'
              : (sortBy as string);

    const total = await JournalEntry.countDocuments(query);
    const journals = await JournalEntry.find(query)
      .sort({ [resolvedSortField]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page as string, 10) - 1) * pageSize)
      .limit(pageSize)
      .populate('postedBy', 'name email')
      .populate('createdBy', 'name email');

    console.log(`Found ${journals.length} journals (Total: ${total})`);
    const serializedJournals = journals.map((journal) => serializeJournalEntry(journal));

    res.json({
      success: true,
      data: serializedJournals,
      pagination: {
        page: parseInt(page as string, 10),
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJournalEntryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      organization: req.user.organizationId
    })
      .populate('createdBy', 'name email')
      .populate('postedBy', 'name email')
      .lean();

    if (!entry) {
      res.status(404).json({ success: false, message: "Journal entry not found" });
      return;
    }

    res.json({ success: true, data: serializeJournalEntry(entry) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const createJournalEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const normalizedPayload = normalizeJournalPayload(req.body);
    const { lines } = normalizedPayload;
    const status = normalizeJournalStatus(normalizedPayload.status) || "draft";

    const validationError = validateNormalizedJournalLines(lines);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError
      });
      return;
    }

    // Generate unique entry number if not provided
    let entryNumber = normalizedPayload.entryNumber;
    if (!entryNumber) {
      const lastEntry = await JournalEntry.findOne({ organization: req.user.organizationId })
        .sort({ entryNumber: -1 })
        .limit(1);

      if (lastEntry && lastEntry.entryNumber) {
        // Extract number from format like "JE-0001" or just "1"
        const match = lastEntry.entryNumber.match(/(\d+)$/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          const nextNumber = lastNumber + 1;
          entryNumber = `JE-${nextNumber.toString().padStart(4, '0')}`;
        } else {
          entryNumber = "JE-0001";
        }
      } else {
        entryNumber = "JE-0001";
      }
    }

    const entry = await JournalEntry.create({
      ...normalizedPayload,
      entryNumber,
      status,
      organization: req.user.organizationId,
      createdBy: req.user.userId,
      postedBy: status === 'posted' ? req.user.userId : undefined,
      postedAt: status === 'posted' ? new Date() : undefined,
      sourceType: 'manual_journal'
    });

    // If status is posted, update account balances
    if (status === 'posted' && lines) {
      await updateAccountBalances(lines, req.user.organizationId);
    }

    res.status(201).json({ success: true, data: serializeJournalEntry(entry) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateJournalEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const oldEntry = await JournalEntry.findOne({ _id: req.params.id, organization: req.user.organizationId });
    if (!oldEntry) {
      res.status(404).json({ success: false, message: "Journal entry not found" });
      return;
    }

    const normalizedPayload = normalizeJournalPayload(req.body);
    const newStatus = normalizeJournalStatus(normalizedPayload.status) || oldEntry.status;
    const newLines =
      Array.isArray(normalizedPayload.lines) && normalizedPayload.lines.length > 0
        ? normalizedPayload.lines
        : oldEntry.lines;
    const validationError = validateNormalizedJournalLines(newLines as any[]);

    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }

    // If it was posted, reverse old balances
    if (oldEntry.status === 'posted' && oldEntry.lines) {
      await updateAccountBalances(oldEntry.lines, req.user.organizationId, true);
    }

    const updatePayload: any = { ...normalizedPayload, lines: newLines };
    if (req.body.status !== undefined) {
      updatePayload.status = newStatus;
      updatePayload.postedBy = newStatus === 'posted' ? req.user.userId : undefined;
      updatePayload.postedAt = newStatus === 'posted' ? new Date() : undefined;
    }

    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      updatePayload,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('postedBy', 'name email');

    if (!entry) {
      res.status(404).json({ success: false, message: "Journal entry not found" });
      return;
    }

    // If new status is posted, apply new balances
    if (entry.status === 'posted' && entry.lines) {
      await updateAccountBalances(entry.lines, req.user.organizationId);
    }


    res.json({ success: true, data: serializeJournalEntry(entry) });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteJournalEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      organization: req.user.organizationId
    });

    if (!entry) {
      res.status(404).json({ success: false, message: "Journal entry not found" });
      return;
    }

    // If it was posted, reverse balances before deleting
    if (entry.status === 'posted' && entry.lines) {
      await updateAccountBalances(entry.lines, req.user.organizationId, true);
    }

    await JournalEntry.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: "Journal entry deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// --- Budgets ---

export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      fiscalYear,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (search) {
      query.name = new RegExp(search as string, 'i');
    }

    if (fiscalYear) query.fiscalYear = parseInt(fiscalYear as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const budgets = await Budget.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const total = await Budget.countDocuments(query);

    res.json({
      success: true,
      data: budgets,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBudgetById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      organization: req.user.organizationId
    }).lean();

    if (!budget) {
      res.status(404).json({ success: false, message: "Budget not found" });
      return;
    }

    res.json({ success: true, data: budget });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const budgetPayload = normalizeBudgetPayload(req.body);
    const budget = await Budget.create({
      ...budgetPayload,
      organization: req.user.organizationId
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const budgetPayload = normalizeBudgetPayload(req.body);
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      budgetPayload,
      { new: true, runValidators: true }
    );

    if (!budget) {
      res.status(404).json({ success: false, message: "Budget not found" });
      return;
    }

    res.json({ success: true, data: budget });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await Budget.deleteOne({
      _id: req.params.id,
      organization: req.user.organizationId
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Budget not found" });
      return;
    }

    res.json({ success: true, message: "Budget deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Bulk Update ---

const nonFilterableAccountTypes = new Set([
  "accounts_receivable",
  "accounts_payable",
  "fixed_asset",
  "stock",
  "bank",
]);

const nonFilterableAccountNames = new Set([
  "unearned revenue",
  "retained earnings",
]);

const buildDateAmountQuery = (filters: any) => {
  const query: any = {};
  if (filters?.dateFrom || filters?.dateTo) {
    query.date = {};
    if (filters?.dateFrom) query.date.$gte = new Date(filters.dateFrom);
    if (filters?.dateTo) query.date.$lte = new Date(filters.dateTo);
  }
  if (filters?.amountFrom || filters?.amountTo) {
    query.total = {};
    if (filters?.amountFrom !== undefined && filters?.amountFrom !== "") query.total.$gte = Number(filters.amountFrom);
    if (filters?.amountTo !== undefined && filters?.amountTo !== "") query.total.$lte = Number(filters.amountTo);
  }
  return query;
};

const txIsUpdatable = (tx: { status?: string; type: string }) => {
  const status = String(tx.status || "").toLowerCase();
  if (!status) return true;
  if (tx.type === "bill" && ["paid", "void", "cancelled"].includes(status)) return false;
  if (tx.type === "purchase_order" && ["closed", "cancelled", "received"].includes(status)) return false;
  if (tx.type === "vendor_credit" && ["closed", "refunded", "cancelled", "applied"].includes(status)) return false;
  if (tx.type === "credit_note" && ["closed", "void"].includes(status)) return false;
  return true;
};

export const previewBulkUpdateTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      accountId,
      accountName,
      contact,
      locationId,
      locationName,
      dateFrom,
      dateTo,
      amountFrom,
      amountTo,
      includeInactiveAccounts = false,
    } = req.body || {};

    const targetAccount =
      accountId
        ? await ChartOfAccount.findOne({ _id: accountId, organization: req.user.organizationId }).lean()
        : accountName
          ? await ChartOfAccount.findOne({ organization: req.user.organizationId, accountName }).lean()
          : null;

    const resolvedAccountName = accountName || targetAccount?.accountName;
    const resolvedAccountId = accountId || (targetAccount?._id ? String(targetAccount._id) : "");

    if (!resolvedAccountName) {
      res.status(400).json({ success: false, message: "Account is required." });
      return;
    }

    if (
      targetAccount &&
      (
        nonFilterableAccountTypes.has(String(targetAccount.accountType || "").toLowerCase()) ||
        nonFilterableAccountNames.has(String(targetAccount.accountName || "").toLowerCase())
      )
    ) {
      res.status(400).json({
        success: false,
        message: "This account cannot be used in Bulk Update.",
      });
      return;
    }

    const baseQuery = {
      organization: req.user.organizationId,
      ...buildDateAmountQuery({ dateFrom, dateTo, amountFrom, amountTo }),
    };

    const contactRegex = contact ? new RegExp(String(contact), "i") : null;
    const hasLocationId = Boolean(locationId && mongoose.Types.ObjectId.isValid(String(locationId)));
    const locationObjectId = hasLocationId ? new mongoose.Types.ObjectId(String(locationId)) : null;
    const resolvedLocationName = locationName || "";

    const billQuery: any = {
      ...baseQuery,
      $or: [
        { "items.account": resolvedAccountName },
        { "items.account": resolvedAccountId },
      ],
    };
    if (!includeInactiveAccounts) billQuery.status = { $nin: ["void", "cancelled"] };
    if (contactRegex) billQuery.vendorName = contactRegex;
    if (locationObjectId || resolvedLocationName) {
      billQuery.$and = [
        ...(billQuery.$and || []),
        {
          $or: [
            ...(locationObjectId ? [{ location_id: locationObjectId }, { location: locationObjectId }] : []),
            ...(resolvedLocationName ? [{ location_name: resolvedLocationName }, { locationName: resolvedLocationName }] : []),
          ],
        },
      ];
    }

    const poQuery: any = {
      ...baseQuery,
      "items.account": resolvedAccountName,
    };
    if (!includeInactiveAccounts) poQuery.status = { $nin: ["closed", "cancelled"] };
    if (contactRegex) poQuery.vendorName = contactRegex;
    if (locationObjectId || resolvedLocationName) {
      poQuery.$or = [
        ...(locationObjectId ? [{ location_id: locationObjectId }, { location: locationObjectId }] : []),
        ...(resolvedLocationName ? [{ location_name: resolvedLocationName }, { locationName: resolvedLocationName }] : []),
      ];
    }

    const expenseAccountClauses: any[] = [];
    if (resolvedAccountId && mongoose.Types.ObjectId.isValid(resolvedAccountId)) {
      const accountObjectId = new mongoose.Types.ObjectId(resolvedAccountId);
      expenseAccountClauses.push({ account_id: accountObjectId });
      expenseAccountClauses.push({ "line_items.account_id": accountObjectId });
    }
    if (resolvedAccountName) {
      expenseAccountClauses.push({ account_name: resolvedAccountName });
    }

    const expenseQuery: any = {
      organization: req.user.organizationId,
      ...buildDateAmountQuery({ dateFrom, dateTo, amountFrom, amountTo }),
      $or: expenseAccountClauses,
    };
    if (contactRegex) {
      expenseQuery.$and = [
        { $or: expenseAccountClauses },
        { $or: [{ vendor_name: contactRegex }, { customer_name: contactRegex }] },
      ];
      delete expenseQuery.$or;
    }
    if (locationObjectId || resolvedLocationName) {
      const locationClause: any = {
        $or: [
          ...(locationObjectId ? [{ location_id: locationObjectId }] : []),
          ...(resolvedLocationName ? [{ location_name: resolvedLocationName }] : []),
        ],
      };
      if (expenseQuery.$and) {
        expenseQuery.$and.push(locationClause);
      } else {
        expenseQuery.$and = [locationClause];
      }
    }

    const journalQuery: any = {
      organization: req.user.organizationId,
      "lines.account": resolvedAccountName,
      sourceType: { $in: ["credit_note", "vendor_credit"] },
      ...buildDateAmountQuery({ dateFrom, dateTo }),
    };

    const [bills, pos, expenses, relatedJournals] = await Promise.all([
      Bill.find(billQuery).limit(500).lean(),
      PurchaseOrder.find(poQuery).limit(500).lean(),
      Expense.find(expenseQuery).limit(500).lean(),
      JournalEntry.find(journalQuery).limit(500).lean(),
    ]);

    const txRows: any[] = [];

    bills.forEach((b: any) => {
      txRows.push({
        type: "bill",
        transactionId: String(b._id),
        displayNumber: b.billNumber,
        date: b.date,
        amount: Number(b.total || 0),
        contactName: b.vendorName || "",
        status: b.status || "",
        updatable: txIsUpdatable({ status: b.status, type: "bill" }),
      });
    });

    pos.forEach((p: any) => {
      txRows.push({
        type: "purchase_order",
        transactionId: String(p._id),
        displayNumber: p.purchaseOrderNumber,
        date: p.date,
        amount: Number(p.total || 0),
        contactName: p.vendorName || "",
        status: p.status || "",
        updatable: txIsUpdatable({ status: p.status, type: "purchase_order" }),
      });
    });

    expenses.forEach((e: any) => {
      txRows.push({
        type: "expense",
        transactionId: String(e._id),
        displayNumber: e.expense_id || e.reference_number || String(e._id).slice(-6),
        date: e.date,
        amount: Number(e.total || e.amount || 0),
        contactName: e.vendor_name || e.customer_name || "",
        status: e.status || "",
        updatable: txIsUpdatable({ status: e.status, type: "expense" }),
      });
    });

    relatedJournals.forEach((j: any) => {
      txRows.push({
        type: j.sourceType,
        transactionId: String(j.sourceId || j._id),
        displayNumber: j.entryNumber || String(j.sourceId || j._id).slice(-6),
        date: j.date,
        amount: Number((j.lines || []).reduce((sum: number, ln: any) => sum + (Number(ln.debit || ln.credit || 0)), 0)),
        contactName: "",
        status: j.status || "",
        updatable: txIsUpdatable({ status: j.status, type: j.sourceType }),
      });
    });

    const filteredRows = contactRegex
      ? txRows.filter((r) => contactRegex.test(String(r.contactName || "")))
      : txRows;

    res.json({
      success: true,
      data: {
        accountId: resolvedAccountId,
        accountName: resolvedAccountName,
        transactions: filteredRows,
        total: filteredRows.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const executeBulkUpdateTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { fromAccountId, fromAccountName, toAccountId, toAccountName, transactions, filters } = req.body || {};
    const txs = Array.isArray(transactions) ? transactions : [];

    if (!fromAccountName || !toAccountName) {
      res.status(400).json({ success: false, message: "From account and new account are required." });
      return;
    }
    if (!txs.length) {
      res.status(400).json({ success: false, message: "No transactions selected." });
      return;
    }
    if (txs.length > 50) {
      res.status(400).json({ success: false, message: "You can update a maximum of 50 transactions at a time." });
      return;
    }

    const history = await BulkUpdateHistory.create({
      organization: req.user.organizationId,
      fromAccountId,
      fromAccountName,
      toAccountId,
      toAccountName,
      filters: {
        contact: filters?.contact || "",
        dateFrom: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters?.dateTo ? new Date(filters.dateTo) : undefined,
        amountFrom: filters?.amountFrom !== undefined && filters?.amountFrom !== "" ? Number(filters.amountFrom) : undefined,
        amountTo: filters?.amountTo !== undefined && filters?.amountTo !== "" ? Number(filters.amountTo) : undefined,
        includeInactiveAccounts: Boolean(filters?.includeInactiveAccounts),
      },
      status: "ongoing",
      updatedCount: 0,
      description: `Bulk replaced ${fromAccountName} with ${toAccountName}`,
      transactions: txs.map((tx: any) => ({
        type: tx.type,
        transactionId: tx.transactionId,
        displayNumber: tx.displayNumber,
        date: tx.date ? new Date(tx.date) : undefined,
        amount: tx.amount,
        contactName: tx.contactName,
        status: tx.status,
      })),
      createdBy: req.user.userId,
    });

    let updatedCount = 0;
    const toAccountObjectId =
      toAccountId && mongoose.Types.ObjectId.isValid(toAccountId) ? new mongoose.Types.ObjectId(toAccountId) : null;
    const fromAccountObjectId =
      fromAccountId && mongoose.Types.ObjectId.isValid(fromAccountId) ? new mongoose.Types.ObjectId(fromAccountId) : null;

    for (const tx of txs) {
      if (!tx?.updatable) continue;
      if (tx.type === "bill") {
        const result = await Bill.updateOne(
          { _id: tx.transactionId, organization: req.user.organizationId },
          { $set: { "items.$[item].account": toAccountName } },
          {
            arrayFilters: [
              {
                $or: [
                  { "item.account": fromAccountName },
                  ...(fromAccountId ? [{ "item.account": fromAccountId }] : []),
                ],
              },
            ],
          } as any
        );
        if ((result as any).modifiedCount > 0) updatedCount += 1;
      } else if (tx.type === "purchase_order") {
        const result = await PurchaseOrder.updateOne(
          { _id: tx.transactionId, organization: req.user.organizationId },
          { $set: { "items.$[item].account": toAccountName } },
          {
            arrayFilters: [
              {
                $or: [
                  { "item.account": fromAccountName },
                  ...(fromAccountId ? [{ "item.account": fromAccountId }] : []),
                ],
              },
            ],
          } as any
        );
        if ((result as any).modifiedCount > 0) updatedCount += 1;
      } else if (tx.type === "expense") {
        const updateSet: Record<string, any> = {
          account_name: toAccountName,
        };
        if (toAccountObjectId) {
          updateSet.account_id = toAccountObjectId;
        }
        const hasLineItemFilter = Boolean(fromAccountObjectId && toAccountObjectId);
        if (hasLineItemFilter) {
          updateSet["line_items.$[line].account_id"] = toAccountObjectId;
        }

        const result = await Expense.updateOne(
          { _id: tx.transactionId, organization: req.user.organizationId },
          { $set: updateSet },
          hasLineItemFilter
            ? ({ arrayFilters: [{ "line.account_id": fromAccountObjectId }] } as any)
            : undefined
        );
        if ((result as any).modifiedCount > 0) updatedCount += 1;
      } else if (tx.type === "credit_note" || tx.type === "vendor_credit") {
        const sourceType = tx.type === "credit_note" ? "credit_note" : "vendor_credit";
        const result = await JournalEntry.updateMany(
          {
            organization: req.user.organizationId,
            sourceType,
            sourceId: tx.transactionId,
            "lines.account": fromAccountName,
          },
          { $set: { "lines.$[line].account": toAccountName, "lines.$[line].accountName": toAccountName } },
          { arrayFilters: [{ "line.account": fromAccountName }] } as any
        );
        if ((result as any).modifiedCount > 0) updatedCount += 1;
      }
    }

    await BulkUpdateHistory.findByIdAndUpdate(history._id, {
      status: "completed",
      updatedCount,
    });

    res.json({
      success: true,
      message: `${updatedCount} transaction(s) updated successfully.`,
      data: { updatedCount, bulkUpdateId: history._id },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBulkUpdateHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const rows = await BulkUpdateHistory.find({ organization: req.user.organizationId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBulkUpdateHistoryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const row = await BulkUpdateHistory.findOne({
      _id: req.params.id,
      organization: req.user.organizationId,
    }).lean();
    if (!row) {
      res.status(404).json({ success: false, message: "Bulk update record not found" });
      return;
    }
    res.json({ success: true, data: row });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Currency Adjustments ---

export const getCurrencyAdjustments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (search) {
      query.currency = new RegExp(search as string, 'i');
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const adjustments = await CurrencyAdjustment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const total = await CurrencyAdjustment.countDocuments(query);

    res.json({
      success: true,
      data: adjustments,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const normalizeAdjustmentDate = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const buildAffectedAccountRows = async (
  organizationId: string,
  currency: string,
  previousExchangeRate: number,
  newExchangeRate: number
) => {
  const accounts = await ChartOfAccount.find({
    organization: organizationId,
    isActive: true,
    currency: currency.split(" - ")[0] || currency,
    balance: { $ne: 0 },
    accountType: {
      $in: Array.from(
        new Set([
          ...getAccountTypesForCategory("asset"),
          ...getAccountTypesForCategory("liability"),
        ])
      ),
    },
  }).lean();

  return accounts.map((acc: any) => {
    const balanceFCY = Number(acc.balance || 0);
    const balanceBCY = Number((balanceFCY * previousExchangeRate).toFixed(2));
    const revaluedBalanceBCY = Number((balanceFCY * newExchangeRate).toFixed(2));
    const gainOrLossBCY = Number((revaluedBalanceBCY - balanceBCY).toFixed(2));

    return {
      accountId: String(acc._id),
      accountName: acc.accountName,
      balanceFCY,
      balanceBCY,
      revaluedBalanceBCY,
      gainOrLossBCY,
      selected: true,
    };
  });
};

export const previewCurrencyAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { currency, exchangeRate, previousExchangeRate } = req.body || {};
    const newRate = Number(exchangeRate);
    if (!currency || !newRate || Number.isNaN(newRate) || newRate <= 0) {
      res.status(400).json({
        success: false,
        message: "Currency and a valid new exchange rate are required.",
      });
      return;
    }

    const priorRate =
      Number(previousExchangeRate) > 0
        ? Number(previousExchangeRate)
        : (
            await CurrencyAdjustment.findOne({
              organization: req.user.organizationId,
              currency,
            })
              .sort({ createdAt: -1 })
              .lean()
          )?.exchangeRate || 1;

    const affectedAccounts = await buildAffectedAccountRows(
      req.user.organizationId,
      currency,
      priorRate,
      newRate
    );

    res.json({
      success: true,
      data: {
        currency,
        previousExchangeRate: priorRate,
        exchangeRate: newRate,
        affectedAccounts,
        totalGainOrLoss: Number(
          affectedAccounts
            .reduce((sum: number, row: any) => sum + (Number(row.gainOrLossBCY) || 0), 0)
            .toFixed(2)
        ),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrencyAdjustmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const adjustment = await CurrencyAdjustment.findOne({
      _id: req.params.id,
      organization: req.user.organizationId
    }).lean();

    if (!adjustment) {
      res.status(404).json({ success: false, message: "Currency adjustment not found" });
      return;
    }

    res.json({ success: true, data: adjustment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCurrencyAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { currency, date, exchangeRate, notes, previousExchangeRate, affectedAccounts } = req.body || {};
    const newRate = Number(exchangeRate);
    const priorRate = Number(previousExchangeRate) || 1;

    if (!currency || !date || !notes || !newRate || Number.isNaN(newRate) || newRate <= 0) {
      res.status(400).json({
        success: false,
        message: "Currency, date, exchange rate, and notes are required.",
      });
      return;
    }

    const previewRows = await buildAffectedAccountRows(
      req.user.organizationId,
      currency,
      priorRate,
      newRate
    );
    const selectedRows = (Array.isArray(affectedAccounts) ? affectedAccounts : previewRows).filter(
      (row: any) => row?.selected !== false
    );

    if (!selectedRows.length) {
      res.status(400).json({
        success: false,
        message: "You must have open transactions to perform base currency adjustments.",
      });
      return;
    }

    const totalGainOrLoss = Number(
      selectedRows
        .reduce((sum: number, row: any) => sum + (Number(row.gainOrLossBCY) || 0), 0)
        .toFixed(2)
    );

    const adjustment = await CurrencyAdjustment.create({
      organization: req.user.organizationId,
      currency,
      date: normalizeAdjustmentDate(date),
      previousExchangeRate: priorRate,
      exchangeRate: newRate,
      notes: String(notes).trim(),
      affectedAccounts: selectedRows,
      gainOrLoss: totalGainOrLoss,
      status: "adjusted",
    });

    res.status(201).json({ success: true, data: adjustment });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCurrencyAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const payload: any = { ...req.body };
    if (payload.date) payload.date = normalizeAdjustmentDate(payload.date);
    if (payload.exchangeRate !== undefined) payload.exchangeRate = Number(payload.exchangeRate);
    if (payload.previousExchangeRate !== undefined) payload.previousExchangeRate = Number(payload.previousExchangeRate);
    if (payload.notes !== undefined) payload.notes = String(payload.notes).trim();

    if (payload.affectedAccounts && Array.isArray(payload.affectedAccounts)) {
      payload.gainOrLoss = Number(
        payload.affectedAccounts
          .filter((row: any) => row?.selected !== false)
          .reduce((sum: number, row: any) => sum + (Number(row.gainOrLossBCY) || 0), 0)
          .toFixed(2)
      );
    }

    const adjustment = await CurrencyAdjustment.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      payload,
      { new: true, runValidators: true }
    );

    if (!adjustment) {
      res.status(404).json({ success: false, message: "Currency adjustment not found" });
      return;
    }

    res.json({ success: true, data: adjustment });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCurrencyAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await CurrencyAdjustment.deleteOne({
      _id: req.params.id,
      organization: req.user.organizationId
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Currency adjustment not found" });
      return;
    }

    res.json({ success: true, message: "Currency adjustment deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Journal Templates ---

export const getJournalTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      isActive,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (search) {
      query.$or = [
        { name: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') }
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const templates = await JournalTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const total = await JournalTemplate.countDocuments(query);

    res.json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJournalTemplateById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const template = await JournalTemplate.findOne({
      _id: req.params.id,
      organization: req.user.organizationId
    }).populate('createdBy', 'name email').lean();

    if (!template) {
      res.status(404).json({ success: false, message: "Journal template not found" });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJournalTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      templateName,
      name,
      notes,
      description,
      lines = [],
      referenceNumber,
      reportingMethod,
      projectName,
      currency,
      enterAmount,
      isActive,
    } = req.body || {};

    const mappedLines = Array.isArray(lines)
      ? lines.map((line: any) => ({
        account: line.account,
        accountName: line.accountName || line.account,
        description: line.description || "",
        contact: line.contact || "",
        type: line.type || undefined,
        tax: line.tax || "",
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        project: line.project || undefined,
      }))
      : [];

    const template = await JournalTemplate.create({
      name: String(templateName || name || "").trim(),
      notes: String(notes || description || "").trim(),
      description: String(description || notes || "").trim(),
      lines: mappedLines,
      referenceNumber: referenceNumber || "",
      reportingMethod: reportingMethod || "accrual-and-cash",
      projectName: projectName || "",
      currency: (currency || "USD").toUpperCase(),
      enterAmount: Boolean(enterAmount),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      organization: req.user.organizationId,
      createdBy: req.user.userId
    });

    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateJournalTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const payload: any = { ...req.body };
    if (payload.templateName && !payload.name) {
      payload.name = payload.templateName;
    }
    if (payload.description && !payload.notes) {
      payload.notes = payload.description;
    }
    if (payload.notes && !payload.description) {
      payload.description = payload.notes;
    }
    if (payload.lines && Array.isArray(payload.lines)) {
      payload.lines = payload.lines.map((line: any) => ({
        account: line.account,
        accountName: line.accountName || line.account,
        description: line.description || "",
        contact: line.contact || "",
        type: line.type || undefined,
        tax: line.tax || "",
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        project: line.project || undefined,
      }));
    }
    if (payload.currency) {
      payload.currency = String(payload.currency).toUpperCase();
    }

    const template = await JournalTemplate.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organizationId },
      payload,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!template) {
      res.status(404).json({ success: false, message: "Journal template not found" });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteJournalTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await JournalTemplate.deleteOne({
      _id: req.params.id,
      organization: req.user.organizationId
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Journal template not found" });
      return;
    }

    res.json({ success: true, message: "Journal template deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Transaction Locking ---

export const getTransactionLocks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      page = '1',
      limit = '50',
      search = '',
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { organization: req.user.organizationId };

    if (search) {
      query.$or = [
        { module: new RegExp(search as string, 'i') },
        { reason: new RegExp(search as string, 'i') }
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const locks = await TransactionLock.find(query)
      .populate('lockedBy', 'name email')
      .populate('unlockedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const total = await TransactionLock.countDocuments(query);

    res.json({
      success: true,
      data: locks,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransactionLock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { module, lockDate, reason } = req.body;

    // Check if lock already exists for this module
    const existingLock = await TransactionLock.findOne({
      organization: req.user.organizationId,
      module,
      isActive: true
    });

    if (existingLock) {
      res.status(400).json({ success: false, message: "Module is already locked" });
      return;
    }

    const lock = await TransactionLock.create({
      organization: req.user.organizationId,
      module,
      lockDate: new Date(lockDate),
      reason,
      lockedBy: req.user.userId,
      lockedAt: new Date()
    });

    res.status(201).json({ success: true, data: lock });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const unlockTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const lock = await TransactionLock.findOneAndUpdate(
      { _id: id, organization: req.user.organizationId, isActive: true },
      {
        isActive: false,
        unlockedBy: req.user.userId,
        unlockedAt: new Date()
      },
      { new: true }
    ).populate('lockedBy', 'name email').populate('unlockedBy', 'name email');

    if (!lock) {
      res.status(404).json({ success: false, message: "Transaction lock not found" });
      return;
    }

    res.json({ success: true, data: lock, message: "Transaction unlocked successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUnlockTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      res.status(400).json({ success: false, message: "Invalid modules array" });
      return;
    }

    const result = await TransactionLock.updateMany(
      {
        organization: req.user.organizationId,
        module: { $in: modules },
        isActive: true
      },
      {
        isActive: false,
        unlockedBy: req.user.userId,
        unlockedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} transactions unlocked successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAccounts, createAccount, updateAccount, deleteAccount, bulkDeleteAccounts, bulkUpdateAccountStatus,
  getJournalEntries, getJournalEntryById, createJournalEntry, updateJournalEntry, deleteJournalEntry,
  getBudgets, getBudgetById, createBudget, updateBudget, deleteBudget,
  previewBulkUpdateTransactions, executeBulkUpdateTransactions, getBulkUpdateHistory, getBulkUpdateHistoryById,
  getCurrencyAdjustments, previewCurrencyAdjustment, getCurrencyAdjustmentById, createCurrencyAdjustment, updateCurrencyAdjustment, deleteCurrencyAdjustment,
  getJournalTemplates, getJournalTemplateById, createJournalTemplate, updateJournalTemplate, deleteJournalTemplate,
  getTransactionLocks, createTransactionLock, unlockTransaction, bulkUnlockTransactions
};


