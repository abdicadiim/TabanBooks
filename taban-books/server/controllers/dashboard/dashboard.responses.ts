import { calculateTrend } from './dashboard.helpers.js';

function mapWatchlistAccounts(watchlistAccounts: any[]) {
  return watchlistAccounts.map((account: any) => ({
    id: account._id,
    name: account.accountName,
    balance: account.balance,
    currency: account.currency,
    type: account.accountType,
  }));
}

export function buildKpiResponseData({
  arMetrics,
  apMetrics,
  cashFlowMetrics,
  profitLossMetrics,
  projectMetrics,
  bankAccountsSummary,
  watchlistAccounts,
  arCount,
  apCount,
}: {
  arMetrics: any;
  apMetrics: any;
  cashFlowMetrics: any;
  profitLossMetrics: any;
  projectMetrics: any;
  bankAccountsSummary: any;
  watchlistAccounts: any[];
  arCount: number;
  apCount: number;
}) {
  return {
    accountsReceivable: {
      balance: arMetrics.total,
      current: arMetrics.current,
      overdue: arMetrics.overdue,
      overdueBreakdown: arMetrics.overdueBreakdown,
      currentCount: arMetrics.currentCount,
      overdueCount: arMetrics.overdueCount,
      trend: calculateTrend('receivable'),
      count: arCount,
    },
    accountsPayable: {
      balance: apMetrics.total,
      current: apMetrics.current,
      overdue: apMetrics.overdue,
      overdueBreakdown: apMetrics.overdueBreakdown,
      currentCount: apMetrics.currentCount,
      overdueCount: apMetrics.overdueCount,
      trend: calculateTrend('payable'),
      count: apCount,
    },
    cashFlow: {
      netCashFlow: cashFlowMetrics.net,
      totalInflows: cashFlowMetrics.inflows,
      totalOutflows: cashFlowMetrics.outflows,
      operatingCashFlow: cashFlowMetrics.operating,
    },
    profitLoss: {
      grossProfit: profitLossMetrics.grossProfit,
      netProfit: profitLossMetrics.netProfit,
      totalIncome: profitLossMetrics.totalIncome,
      totalExpenses: profitLossMetrics.totalExpenses,
      operatingMargin: profitLossMetrics.operatingMargin,
    },
    projects: {
      total: projectMetrics.total,
      active: projectMetrics.active,
      completed: projectMetrics.completed,
      totalValue: projectMetrics.totalValue,
    },
    bankAccounts: {
      totalBalance: bankAccountsSummary.totalBalance,
      accountCount: bankAccountsSummary.count,
      activeAccounts: bankAccountsSummary.active,
    },
    watchlist: mapWatchlistAccounts(watchlistAccounts),
    lastUpdated: new Date().toISOString(),
  };
}

export function buildHomeDashboardBootstrapData({
  arMetrics,
  apMetrics,
  cashFlowMetrics,
  cashFlowBreakdown,
  profitLossSnapshot,
  topExpenses,
  projectMetrics,
  bankAccountsSummary,
  watchlistAccounts,
  defaultCashFlowPeriod,
  defaultProfitLossPeriod,
  defaultTopExpensesPeriod,
}: {
  arMetrics: any;
  apMetrics: any;
  cashFlowMetrics: any;
  cashFlowBreakdown: any[];
  profitLossSnapshot: any;
  topExpenses: any[];
  projectMetrics: any;
  bankAccountsSummary: any;
  watchlistAccounts: any[];
  defaultCashFlowPeriod: string;
  defaultProfitLossPeriod: string;
  defaultTopExpensesPeriod: string;
}) {
  return {
    kpi: {
      accountsReceivable: {
        balance: arMetrics.total,
        current: arMetrics.current,
        overdue: arMetrics.overdue,
        overdueBreakdown: arMetrics.overdueBreakdown,
        currentCount: arMetrics.currentCount,
        overdueCount: arMetrics.overdueCount,
        trend: calculateTrend('receivable'),
        count: arMetrics.currentCount + arMetrics.overdueCount,
      },
      accountsPayable: {
        balance: apMetrics.total,
        current: apMetrics.current,
        overdue: apMetrics.overdue,
        overdueBreakdown: apMetrics.overdueBreakdown,
        currentCount: apMetrics.currentCount,
        overdueCount: apMetrics.overdueCount,
        trend: calculateTrend('payable'),
        count: apMetrics.currentCount + apMetrics.overdueCount,
      },
      cashFlow: {
        netCashFlow: cashFlowMetrics.net,
        totalInflows: cashFlowMetrics.inflows,
        totalOutflows: cashFlowMetrics.outflows,
        operatingCashFlow: cashFlowMetrics.operating,
      },
      profitLoss: {
        grossProfit: profitLossSnapshot.grossProfit,
        netProfit: profitLossSnapshot.netProfit,
        totalIncome: profitLossSnapshot.totalIncome,
        totalExpenses: profitLossSnapshot.totalExpenses,
        operatingMargin: profitLossSnapshot.operatingMargin,
      },
      projects: {
        total: projectMetrics.total,
        active: projectMetrics.active,
        completed: projectMetrics.completed,
        totalValue: projectMetrics.totalValue,
      },
      bankAccounts: {
        totalBalance: bankAccountsSummary.totalBalance,
        accountCount: bankAccountsSummary.count,
        activeAccounts: bankAccountsSummary.active,
      },
      watchlist: mapWatchlistAccounts(watchlistAccounts),
      lastUpdated: new Date().toISOString(),
    },
    cashFlow: {
      period: defaultCashFlowPeriod,
      ...cashFlowMetrics,
      breakdown: cashFlowBreakdown,
    },
    profitLoss: {
      period: defaultProfitLossPeriod,
      ...profitLossSnapshot,
    },
    topExpenses: {
      period: defaultTopExpensesPeriod,
      expenses: topExpenses,
    },
  };
}
