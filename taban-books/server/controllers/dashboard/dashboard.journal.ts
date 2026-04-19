import mongoose from 'mongoose';
import ChartOfAccount from '../../models/ChartOfAccount.js';
import {
  getAccountTypeCategory,
  normalizeAccountType as normalizeChartOfAccountType,
} from '../../utils/chartOfAccounts.js';
import { formatBucketKey } from './dashboard.helpers.js';
import type { DateRange, JournalEntryLite } from './dashboard.types.js';

const CASH_LIKE_ACCOUNT_TYPES = new Set(['bank', 'cash', 'other_current_asset']);

function normalizeAccountType(accountType: any): string {
  return normalizeChartOfAccountType(accountType);
}

export function collectJournalAccountRefs(journals: JournalEntryLite[]) {
  const refs = new Set<string>();

  journals.forEach((journal) => {
    journal.lines?.forEach((line) => {
      const accountRef = String(line?.account || '').trim();
      if (accountRef) {
        refs.add(accountRef);
      }
    });
  });

  return Array.from(refs);
}

export async function resolveAccountTypeMap(organizationId: string, accountRefs: string[]) {
  if (!accountRefs.length) {
    return new Map<string, string>();
  }

  const validAccountIds = accountRefs
    .filter((accountRef) => mongoose.Types.ObjectId.isValid(accountRef))
    .map((accountRef) => new mongoose.Types.ObjectId(accountRef));
  const accountNames = accountRefs.filter((accountRef) => !mongoose.Types.ObjectId.isValid(accountRef));

  const accountQuery: any = {
    organization: organizationId,
    $or: [],
  };

  if (validAccountIds.length) {
    accountQuery.$or.push({ _id: { $in: validAccountIds } });
  }

  if (accountNames.length) {
    accountQuery.$or.push({ accountName: { $in: accountNames } });
  }

  const accounts = await ChartOfAccount.find(accountQuery)
    .select('_id accountType accountName')
    .lean();

  const accountTypeMap = new Map<string, string>();

  accounts.forEach((account: any) => {
    const normalizedType = normalizeAccountType(account.accountType);
    accountTypeMap.set(String(account._id), normalizedType);

    if (account.accountName) {
      accountTypeMap.set(String(account.accountName).trim().toLowerCase(), normalizedType);
    }
  });

  return accountTypeMap;
}

function getAccountTypeFromLine(accountTypeMap: Map<string, string>, accountRef?: string) {
  const normalizedRef = String(accountRef || '').trim();
  if (!normalizedRef) return undefined;

  return accountTypeMap.get(normalizedRef) || accountTypeMap.get(normalizedRef.toLowerCase());
}

function isDateWithinRange(date: Date, range: DateRange) {
  const time = new Date(date).getTime();
  return time >= range.startDate.getTime() && time <= range.endDate.getTime();
}

export function calculateJournalCashFlowTotals(journals: JournalEntryLite[], accountTypeMap: Map<string, string>) {
  let inflows = 0;
  let outflows = 0;

  journals.forEach((journal) => {
    journal.lines?.forEach((line) => {
      const accountType = getAccountTypeFromLine(accountTypeMap, line.account);
      if (!accountType || !CASH_LIKE_ACCOUNT_TYPES.has(accountType)) {
        return;
      }

      inflows += Number(line.debit || 0);
      outflows += Number(line.credit || 0);
    });
  });

  return { inflows, outflows };
}

export function calculateJournalProfitLossTotals(
  journals: JournalEntryLite[],
  accountTypeMap: Map<string, string>,
  range?: DateRange,
) {
  let income = 0;
  let expenses = 0;

  journals.forEach((journal) => {
    if (range && !isDateWithinRange(journal.date, range)) {
      return;
    }

    journal.lines?.forEach((line) => {
      const accountType = getAccountTypeFromLine(accountTypeMap, line.account);
      if (!accountType) return;

      const category = getAccountTypeCategory(accountType);
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      if (category === 'income') {
        income += credit - debit;
      } else if (category === 'expense') {
        expenses += debit - credit;
      }
    });
  });

  return { income, expenses };
}

export function calculateJournalProfitLossAdjustmentsByMonth(
  journals: JournalEntryLite[],
  accountTypeMap: Map<string, string>,
) {
  const monthlyAdjustments = new Map<string, { income: number; expenses: number }>();

  journals.forEach((journal) => {
    const monthKey = formatBucketKey(new Date(journal.date), 'month');

    journal.lines?.forEach((line) => {
      const accountType = getAccountTypeFromLine(accountTypeMap, line.account);
      if (!accountType) return;

      const category = getAccountTypeCategory(accountType);
      if (category !== 'income' && category !== 'expense') {
        return;
      }

      const current = monthlyAdjustments.get(monthKey) || { income: 0, expenses: 0 };
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      if (category === 'income') {
        current.income += credit - debit;
      } else {
        current.expenses += debit - credit;
      }

      monthlyAdjustments.set(monthKey, current);
    });
  });

  return monthlyAdjustments;
}
