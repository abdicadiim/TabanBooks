import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { dashboardService } from "../../services/dashboardService";
import { useCurrency } from "../../hooks/useCurrency";

const PERIOD_MAPPING: Record<string, string> = {
  "This Fiscal Year": "this-fiscal-year",
  "This Month": "this-month",
  "Last 6 Months": "last-6-months",
};

const PERIODS = Object.keys(PERIOD_MAPPING);

const normalizeTopExpenses = (payload: any) =>
  (payload?.expenses || []).slice(0, 4).map((expense: any) => ({
    label: expense.category?.accountName || expense.description || "Uncategorized",
    value: Number(expense.amount || 0),
  }));

export default function TopExpensesCard({
  initialData = null,
  bootstrapLoading = false,
}: {
  initialData?: any;
  bootstrapLoading?: boolean;
}) {
  const { formatMoney } = useCurrency();
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [expenses, setExpenses] = useState<any[]>(() => normalizeTopExpenses(initialData));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const period = PERIOD_MAPPING[selectedPeriod] || "this-fiscal-year";

    if (bootstrapLoading && !initialData && period === "this-fiscal-year") {
      setLoading(true);
      return;
    }

    if (initialData && initialData.period === period) {
      setExpenses(normalizeTopExpenses(initialData));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await dashboardService.getTopExpenses(period);
        if (response?.success) {
          setExpenses(normalizeTopExpenses(response.data));
        }
      } catch (error) {
        console.error("Error fetching top expenses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bootstrapLoading, initialData, selectedPeriod]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const maxValue = Math.max(...expenses.map((e) => e.value), 1);

  return (
    <section className="rounded-2xl border border-[#b9d4d8] bg-white py-1.5 px-1.5 w-full shadow-sm box-border overflow-x-hidden">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[20px] font-semibold m-0 text-slate-900">Spending Story</h2>
          <p className="text-[11px] text-[#55757c] mt-0.5">Top Expense Categories</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="text-[11px] rounded-md border border-[#c8dce0] py-1.5 px-3 bg-[#f3f8f8] text-[#4a666d] cursor-pointer flex items-center gap-1"
            >
              {selectedPeriod}
              <ChevronDown size={12} className={dropdownOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#c8dce0] rounded-md shadow-lg z-50 min-w-[170px]">
                {PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(period);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs ${period === selectedPeriod ? "bg-[#156372] text-white" : "text-slate-700 hover:bg-[#eef6f7]"}`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link to="/reports" className="text-[11px] text-[#156372] font-semibold hover:underline">
            Full Report
          </Link>
        </div>
      </header>

      <div className="space-y-3 relative">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-3 w-28 rounded bg-[#edf5f6]" />
                  <div className="h-3 w-16 rounded bg-[#edf5f6]" />
                </div>
                <div className="h-1.5 rounded-full bg-[#e6f1f3] overflow-hidden">
                  <div className="h-full rounded-full bg-[#edf5f6]" style={{ width: `${70 - i * 12}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          expenses.map((expense, index) => {
            const pct = Math.max(6, Math.round((expense.value / maxValue) * 100));
            return (
              <div key={`${expense.label}-${index}`}>
                <div className="flex items-center justify-between mb-1.5 text-[12px]">
                  <span className="text-slate-700">{expense.label}</span>
                  <span className="font-medium text-slate-800">{formatMoney(expense.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e6f1f3] overflow-hidden">
                  <div className="h-full rounded-full bg-[#156372]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}



