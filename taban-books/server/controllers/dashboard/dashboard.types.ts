export type DashboardTiming = {
  name: string;
  durationMs: number;
};

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type JournalLineLite = {
  account?: string;
  debit?: number;
  credit?: number;
};

export type JournalEntryLite = {
  date: Date;
  lines: JournalLineLite[];
};

export type BucketTotals = {
  _id: string;
  total: number;
};

export type ProfitLossMonthlyBreakdown = {
  name: string;
  income: number;
  expenses: number;
  profit: number;
};

export type ProfitLossSnapshot = {
  totalIncome: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  operatingMargin: number;
  monthlyBreakdown: ProfitLossMonthlyBreakdown[];
};
