import { Request } from 'express';
import Invoice from '../../models/Invoice.js';
import PaymentReceived from '../../models/PaymentReceived.js';
import Bill from '../../models/Bill.js';
import Expense from '../../models/Expense.js';
import Project from '../../models/Project.js';
import BankAccount from '../../models/BankAccount.js';
import JournalEntry from '../../models/JournalEntry.js';
import ChartOfAccount from '../../models/ChartOfAccount.js';
import CreditNote from '../../models/CreditNote.js';
import VendorCredit from '../../models/VendorCredit.js';
import {
  aggregateAmountByBucket,
  aggregateTotalsAndMonthlyBuckets,
  buildAgingGroupStage,
  buildBucketSeries,
  buildDateMatch,
  buildDateRange,
  endOfDay,
  endOfMonth,
  formatBucketKey,
  getProfitLossMonthSeries,
  toOrganizationObjectId,
} from './dashboard.helpers.js';
import {
  calculateJournalCashFlowTotals,
  calculateJournalProfitLossAdjustmentsByMonth,
  calculateJournalProfitLossTotals,
  collectJournalAccountRefs,
  resolveAccountTypeMap,
} from './dashboard.journal.js';
import { measureStep } from './dashboard.timing.js';
import type {
  DashboardTiming,
  JournalEntryLite,
  ProfitLossSnapshot,
} from './dashboard.types.js';

export async function getTopExpensesData(organizationId: string, period: string, limit: number) {
  const range = buildDateRange(period);
  const organizationObjectId = toOrganizationObjectId(organizationId);

  const topExpenses = await Expense.find({
    organization: organizationObjectId,
    date: buildDateMatch(range),
  })
    .select('description amount account_id vendor_id date')
    .sort({ amount: -1 })
    .limit(limit)
    .populate('account_id', 'accountName accountType')
    .populate('vendor_id', 'name')
    .lean();

  return topExpenses.map((expense: any) => ({
    id: expense._id,
    description: expense.description,
    amount: expense.amount,
    category: expense.account_id,
    date: expense.date,
    vendor: expense.vendor_id,
  }));
}

export async function calculateAccountsReceivableMetrics(
  organizationId: string,
  options: { timings?: DashboardTiming[]; req?: Request } = {},
): Promise<any> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const measure = options.timings && options.req
    ? <T>(name: string, work: () => Promise<T>) => measureStep(options.timings!, name, work, options.req)
    : <T>(_name: string, work: () => Promise<T>) => work();

  const [invoicesStats, creditNotes] = await Promise.all([
    measure('accounts_receivable.invoice_aging_summary', () =>
      Invoice.aggregate([
        {
          $match: {
            organization: organizationObjectId,
            status: { $in: ['sent', 'viewed', 'partially paid', 'overdue'] },
          },
        },
        buildAgingGroupStage(today),
      ]),
    ),
    measure('accounts_receivable.open_credit_notes', () =>
      CreditNote.aggregate([
        { $match: { organization: organizationObjectId, status: 'open' } },
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
    ),
  ]);

  const stats = invoicesStats[0] || {
    total: 0, current: 0, overdue: 0, currentCount: 0, overdueCount: 0,
    overdue1_15: 0, overdue16_30: 0, overdue31_45: 0, overdueAbove45: 0,
  };

  const creditNoteTotal = creditNotes[0]?.total || 0;

  return {
    total: stats.total - creditNoteTotal,
    current: stats.current,
    overdue: stats.overdue,
    currentCount: stats.currentCount,
    overdueCount: stats.overdueCount,
    overdueBreakdown: {
      '1-15': stats.overdue1_15,
      '16-30': stats.overdue16_30,
      '31-45': stats.overdue31_45,
      'above-45': stats.overdueAbove45,
    },
  };
}

export async function calculateAccountsPayableMetrics(organizationId: string): Promise<any> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [billsStats, vendorCredits] = await Promise.all([
    Bill.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          status: { $in: ['open', 'partially paid', 'overdue'] },
        },
      },
      buildAgingGroupStage(today),
    ]),
    VendorCredit.aggregate([
      { $match: { organization: organizationObjectId, status: 'open' } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]),
  ]);

  const stats = billsStats[0] || {
    total: 0, current: 0, overdue: 0, currentCount: 0, overdueCount: 0,
    overdue1_15: 0, overdue16_30: 0, overdue31_45: 0, overdueAbove45: 0,
  };

  const vendorCreditTotal = vendorCredits[0]?.total || 0;

  return {
    total: stats.total - vendorCreditTotal,
    current: stats.current,
    overdue: stats.overdue,
    currentCount: stats.currentCount,
    overdueCount: stats.overdueCount,
    overdueBreakdown: {
      '1-15': stats.overdue1_15,
      '16-30': stats.overdue16_30,
      '31-45': stats.overdue31_45,
      'above-45': stats.overdueAbove45,
    },
  };
}

export async function calculateCashFlowMetrics(organizationId: string, period?: string): Promise<any> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const range = buildDateRange(period);

  const [inflows, outflows, journals] = await Promise.all([
    PaymentReceived.aggregate([
      { $match: { organization: organizationObjectId, date: buildDateMatch(range) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Bill.aggregate([
      { $match: { organization: organizationObjectId, date: buildDateMatch(range) } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    JournalEntry.find({
      organization: organizationObjectId,
      date: buildDateMatch(range),
      status: 'posted',
    })
      .select('lines.account lines.debit lines.credit')
      .lean<JournalEntryLite[]>(),
  ]);

  const totalInflows = inflows[0]?.total || 0;
  const totalOutflows = outflows[0]?.total || 0;

  if (!journals.length) {
    return {
      inflows: totalInflows,
      outflows: totalOutflows,
      net: totalInflows - totalOutflows,
      operating: totalInflows - (totalOutflows * 0.7),
    };
  }

  const accountTypeMap = await resolveAccountTypeMap(organizationId, collectJournalAccountRefs(journals));
  const journalTotals = calculateJournalCashFlowTotals(journals, accountTypeMap);
  const finalInflows = totalInflows + journalTotals.inflows;
  const finalOutflows = totalOutflows + journalTotals.outflows;

  return {
    inflows: finalInflows,
    outflows: finalOutflows,
    net: finalInflows - finalOutflows,
    operating: finalInflows - (finalOutflows * 0.7),
  };
}

export async function getProfitLossSnapshot(
  organizationId: string,
  period = 'this-month',
  customStart?: Date,
  customEnd?: Date,
): Promise<ProfitLossSnapshot> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const totalsRange = buildDateRange(period, customStart, customEnd);
  const { monthSeries, breakdownRange } = getProfitLossMonthSeries(period, customStart, customEnd);

  const [incomeSnapshot, expenseSnapshot, journals] = await Promise.all([
    aggregateTotalsAndMonthlyBuckets(Invoice, organizationObjectId, 'total', totalsRange, breakdownRange),
    aggregateTotalsAndMonthlyBuckets(Expense, organizationObjectId, 'amount', totalsRange, breakdownRange),
    JournalEntry.find({
      organization: organizationObjectId,
      date: buildDateMatch(breakdownRange),
      status: 'posted',
    })
      .select('date lines.account lines.debit lines.credit')
      .lean<JournalEntryLite[]>(),
  ]);

  let totalIncome = incomeSnapshot.total;
  let totalExpenses = expenseSnapshot.total;
  let journalAdjustments = new Map<string, { income: number; expenses: number }>();

  if (journals.length) {
    const accountTypeMap = await resolveAccountTypeMap(organizationId, collectJournalAccountRefs(journals));
    const journalTotals = calculateJournalProfitLossTotals(journals, accountTypeMap, totalsRange);
    totalIncome += journalTotals.income;
    totalExpenses += journalTotals.expenses;
    journalAdjustments = calculateJournalProfitLossAdjustmentsByMonth(journals, accountTypeMap);
  }

  const grossProfit = totalIncome - totalExpenses;
  const operatingMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    grossProfit,
    netProfit: grossProfit,
    operatingMargin,
    monthlyBreakdown: monthSeries.map((monthStart) => {
      const key = formatBucketKey(monthStart, 'month');
      const journalAdjustment = journalAdjustments.get(key) || { income: 0, expenses: 0 };
      const income = (incomeSnapshot.monthlyTotals.get(key) || 0) + journalAdjustment.income;
      const expenses = (expenseSnapshot.monthlyTotals.get(key) || 0) + journalAdjustment.expenses;

      return {
        name: monthStart.toLocaleString('default', { month: 'short' }),
        income,
        expenses,
        profit: income - expenses,
      };
    }),
  };
}

export async function calculateProfitLossMetrics(
  organizationId: string,
  period?: string,
  customStart?: Date,
  customEnd?: Date,
): Promise<any> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const range = buildDateRange(period, customStart, customEnd);

  const [income, expenses, journals] = await Promise.all([
    Invoice.aggregate([
      { $match: { organization: organizationObjectId, date: buildDateMatch(range) } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Expense.aggregate([
      { $match: { organization: organizationObjectId, date: buildDateMatch(range) } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    JournalEntry.find({
      organization: organizationObjectId,
      date: buildDateMatch(range),
      status: 'posted',
    })
      .select('date lines.account lines.debit lines.credit')
      .lean<JournalEntryLite[]>(),
  ]);

  let totalIncome = income[0]?.total || 0;
  let totalExpenses = expenses[0]?.total || 0;

  if (journals.length) {
    const accountTypeMap = await resolveAccountTypeMap(organizationId, collectJournalAccountRefs(journals));
    const journalTotals = calculateJournalProfitLossTotals(journals, accountTypeMap);
    totalIncome += journalTotals.income;
    totalExpenses += journalTotals.expenses;
  }

  const grossProfit = totalIncome - totalExpenses;
  const operatingMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    grossProfit,
    netProfit: grossProfit,
    operatingMargin,
  };
}

export async function getProjectMetrics(organizationId: string): Promise<any> {
  const organizationObjectId = toOrganizationObjectId(organizationId);

  const [projectMetrics] = await Project.aggregate([
    {
      $match: {
        organization: organizationObjectId,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
          },
        },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
        totalValue: {
          $sum: { $ifNull: ['$budget', 0] },
        },
      },
    },
  ]);

  return {
    total: projectMetrics?.total || 0,
    active: projectMetrics?.active || 0,
    completed: projectMetrics?.completed || 0,
    totalValue: projectMetrics?.totalValue || 0,
  };
}

export async function getWatchlistAccounts(organizationId: string) {
  const organizationObjectId = toOrganizationObjectId(organizationId);

  return ChartOfAccount.find({
    organization: organizationObjectId,
    showInWatchlist: true,
  })
    .select('accountName balance currency accountType _id')
    .lean();
}

export async function countAccountsReceivable(organizationId: string) {
  const organizationObjectId = toOrganizationObjectId(organizationId);

  return Invoice.countDocuments({
    organization: organizationObjectId,
    status: { $in: ['sent', 'viewed', 'partially paid', 'overdue'] },
  });
}

export async function countAccountsPayable(organizationId: string) {
  const organizationObjectId = toOrganizationObjectId(organizationId);

  return Bill.countDocuments({
    organization: organizationObjectId,
    status: { $in: ['open', 'partially paid', 'overdue'] },
  });
}

export async function getBankAccountsSummaryInternal(
  organizationId: string,
  options: { includeAccounts?: boolean } = {},
): Promise<any> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const includeAccounts = options.includeAccounts === true;

  const [summary, accounts] = await Promise.all([
    BankAccount.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $gt: ['$balance', 0] }, 1, 0],
            },
          },
          totalBalance: {
            $sum: { $ifNull: ['$balance', 0] },
          },
        },
      },
    ]),
    includeAccounts
      ? BankAccount.find({ organization: organizationObjectId, isActive: true })
          .select('accountName balance accountType')
          .lean()
      : Promise.resolve([]),
  ]);

  const currentSummary = summary[0] || { count: 0, active: 0, totalBalance: 0 };

  return {
    count: currentSummary.count || 0,
    active: currentSummary.active || 0,
    totalBalance: currentSummary.totalBalance || 0,
    ...(includeAccounts
      ? {
          accounts: (accounts as any[]).map((account) => ({
            id: account._id,
            name: account.accountName,
            balance: account.balance,
            type: account.accountType,
          })),
        }
      : {}),
  };
}

export async function getCashFlowBreakdown(organizationId: string, period: string): Promise<any[]> {
  const organizationObjectId = toOrganizationObjectId(organizationId);
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = now;
  let monthsCount = 1;
  let useDaily = false;
  let daysCount = 0;

  if (period === 'last-month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = endOfMonth(startDate);
  } else if (period === 'last-6-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    monthsCount = 6;
  } else if (period === 'last-12-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    monthsCount = 12;
  } else if (period === 'last-7-days') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    endDate = endOfDay(now);
    useDaily = true;
    daysCount = 7;
  } else if (period === 'this-month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = endOfDay(now);
    useDaily = true;
    daysCount = now.getDate();
  } else if (period === 'this-fiscal-year') {
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    startDate = new Date(startYear, 6, 1);
    monthsCount = 12;
  }

  const range = { startDate, endDate };
  const granularity = useDaily ? 'day' : 'month';

  const [incomeTotals, expenseTotals] = await Promise.all([
    aggregateAmountByBucket(PaymentReceived, organizationObjectId, 'amount', range, granularity),
    aggregateAmountByBucket(Bill, organizationObjectId, 'total', range, granularity),
  ]);

  if (useDaily) {
    return buildBucketSeries(startDate, daysCount, 'day').map((bucketDate) => {
      const key = formatBucketKey(bucketDate, 'day');
      const income = incomeTotals.get(key) || 0;
      const expenses = expenseTotals.get(key) || 0;

      return {
        name: bucketDate.toLocaleString('default', { month: 'short', day: 'numeric' }),
        income,
        expenses,
        net: income - expenses,
      };
    });
  }

  return buildBucketSeries(startDate, monthsCount, 'month').map((bucketDate) => {
    const key = formatBucketKey(bucketDate, 'month');
    const income = incomeTotals.get(key) || 0;
    const expenses = expenseTotals.get(key) || 0;

    return {
      name: bucketDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
      income,
      expenses,
      net: income - expenses,
    };
  });
}
