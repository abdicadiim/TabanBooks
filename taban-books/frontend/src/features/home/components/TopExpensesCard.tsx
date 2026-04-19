import React, { useEffect, useMemo, useState } from "react";
import Dropdown from "./Dropdown";
import { dashboardService } from "../../../services/dashboardService";

const PERIODS = [
  "This Fiscal Year",
  "This Month",
  "Previous Month",
  "Last 6 Months",
  "Last 12 Months",
] as const;

type PeriodLabel = (typeof PERIODS)[number];

type TopExpenseItem = {
  id?: string;
  description?: string;
  amount: number;
  category?: {
    accountName?: string;
    accountType?: string;
  } | null;
  vendor?: {
    name?: string;
  } | null;
  date?: string;
};

const PERIOD_TO_API: Record<PeriodLabel, string> = {
  "This Fiscal Year": "this-fiscal-year",
  "This Month": "this-month",
  "Previous Month": "last-month",
  "Last 6 Months": "last-6-months",
  "Last 12 Months": "last-12-months",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getExpenseLabel(expense: TopExpenseItem) {
  return (
    expense.category?.accountName ||
    expense.description ||
    expense.vendor?.name ||
    "Uncategorized"
  );
}

export default function TopExpensesCard() {
  const [period, setPeriod] = useState<PeriodLabel>("This Fiscal Year");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<TopExpenseItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apiPeriod = useMemo(() => PERIOD_TO_API[period], [period]);

  useEffect(() => {
    let cancelled = false;

    const fetchTopExpenses = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await dashboardService.getTopExpenses(apiPeriod);

        if (!cancelled) {
          const nextExpenses = Array.isArray(response?.data?.expenses)
            ? response.data.expenses
            : [];
          setExpenses(nextExpenses);
        }
      } catch (err) {
        console.error("Error fetching top expenses:", err);

        if (!cancelled) {
          setExpenses([]);
          setError("Failed to load top expenses");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTopExpenses();

    return () => {
      cancelled = true;
    };
  }, [apiPeriod]);

  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="font-semibold">Top Expenses</h3>
          <p className="text-xs text-slate-500 mt-1">Fetched from /dashboard/top-expenses</p>
        </div>

        <Dropdown
          open={open}
          setOpen={setOpen}
          trigger={<button className="text-sm">{period} ▾</button>}
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                p === period ? "bg-blue-600 text-white" : "hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </Dropdown>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-slate-400">
          Loading top expenses...
        </div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-500">
          {error}
        </div>
      ) : expenses.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400">
          No expense data
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 border p-3">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-xl font-semibold mt-1">{formatMoney(total)}</div>
          </div>

          {expenses.slice(0, 5).map((expense, index) => {
            const amount = Number(expense.amount || 0);
            const pct = total > 0 ? Math.max(6, Math.round((amount / total) * 100)) : 0;

            return (
              <div key={expense.id || `${getExpenseLabel(expense)}-${index}`}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="truncate pr-3">{getExpenseLabel(expense)}</span>
                  <span className="font-medium">{formatMoney(amount)}</span>
                </div>

                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}