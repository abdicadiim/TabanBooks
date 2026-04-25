export type BudgetPeriod =
  | "Monthly"
  | "Quarterly"
  | "Half-yearly"
  | "Yearly";

export type BudgetLine = {
  account: string;
  accountName: string;
  accountType: "income" | "expense" | "asset" | "liability" | "equity";
  periods: Array<{
    period: string;
    amount: number;
    actualAmount?: number;
  }>;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseFiscalYear(fiscalYearLabel: string) {
  const yearMatch = fiscalYearLabel.match(/(\d{4}).*(\d{4})/);
  const startYear = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  const endYear = yearMatch ? Number(yearMatch[2]) : startYear;
  return {
    startDate: new Date(startYear, 0, 1),
    endDate: new Date(endYear, 11, 31),
    startYear,
    endYear,
  };
}

export function getPeriods(
  budgetPeriod: BudgetPeriod,
  fiscalYearLabel: string
): string[] {
  const { startYear } = parseFiscalYear(fiscalYearLabel);

  if (budgetPeriod === "Quarterly") {
    return ["Q1", "Q2", "Q3", "Q4"].map((q) => `${q} ${startYear}`);
  }
  if (budgetPeriod === "Half-yearly") {
    return [`H1 ${startYear}`, `H2 ${startYear}`];
  }
  if (budgetPeriod === "Yearly") {
    return [`FY ${startYear}`];
  }
  return MONTHS.map((m) => `${m} ${startYear}`);
}

export function buildLinesFromSelections(opts: {
  periods: string[];
  income: string[];
  expense: string[];
  asset: string[];
  liability: string[];
  equity: string[];
}) {
  const map = (
    names: string[],
    accountType: BudgetLine["accountType"]
  ): BudgetLine[] =>
    names.map((name) => ({
      account: name,
      accountName: name,
      accountType,
      periods: opts.periods.map((period) => ({
        period,
        amount: 0,
        actualAmount: 0,
      })),
    }));

  return [
    ...map(opts.income, "income"),
    ...map(opts.expense, "expense"),
    ...map(opts.asset, "asset"),
    ...map(opts.liability, "liability"),
    ...map(opts.equity, "equity"),
  ];
}

export function sumLineBudget(line: BudgetLine) {
  return line.periods.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

export function sumLineActual(line: BudgetLine) {
  return line.periods.reduce((acc, p) => acc + (Number(p.actualAmount) || 0), 0);
}

export function sumByType(lines: BudgetLine[], type: BudgetLine["accountType"]) {
  return lines
    .filter((l) => l.accountType === type)
    .reduce((acc, line) => acc + sumLineBudget(line), 0);
}

