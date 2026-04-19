import React, { useEffect, useState } from "react";
import { dashboardService } from "../../services/dashboardService";
import { MoreHorizontal } from "lucide-react";

interface ProfitLossData {
  monthlyBreakdown: Array<{
    name: string;
    income: number;
    expenses: number;
  }>;
}

const normalizeProfitLossData = (payload: any): ProfitLossData | null => {
  if (!payload) return null;
  return {
    monthlyBreakdown: Array.isArray(payload.monthlyBreakdown)
      ? payload.monthlyBreakdown.map((point: any) => ({
          name: String(point?.name || ""),
          income: Number(point?.income || 0),
          expenses: Number(point?.expenses || 0),
        }))
      : [],
  };
};

export default function IncomeExpenseCard({
  initialData = null,
  bootstrapLoading = false,
}: {
  initialData?: any;
  bootstrapLoading?: boolean;
}) {
  const [loading, setLoading] = useState(!initialData);
  const [data, setData] = useState<ProfitLossData | null>(() => normalizeProfitLossData(initialData));

  useEffect(() => {
    if (bootstrapLoading && !initialData) {
      setLoading(true);
      return;
    }

    if (initialData?.period === "this-fiscal-year") {
      setData(normalizeProfitLossData(initialData));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await dashboardService.getProfitLoss("this-fiscal-year");
        if (response?.success) {
          setData(normalizeProfitLossData(response.data));
        }
      } catch (error) {
        console.error("Error fetching P&L data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bootstrapLoading, initialData]);

  const breakdown = (data?.monthlyBreakdown || []).slice(0, 6);
  const maxValue = Math.max(...breakdown.flatMap((b) => [b.income, b.expenses]), 1);

  return (
    <section className="rounded-2xl border border-[#b9d4d8] bg-white py-1.5 px-1.5 w-full shadow-sm box-border overflow-x-hidden">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-[20px] font-semibold text-slate-900">Performance Lens</h2>
          <p className="text-[11px] text-[#55757c]">Income and Expense Comparison</p>
        </div>
        <button className="text-[#7ea883] hover:text-[#4d7e54]">
          <MoreHorizontal size={16} />
        </button>
      </header>

      <div className="rounded-xl border border-[#d7e7ea] p-3 relative">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-[180px] rounded bg-[#f4f8fb]" />
            <div className="mt-3 flex items-center justify-center gap-6">
              <div className="h-3 w-16 rounded bg-[#edf5f6]" />
              <div className="h-3 w-16 rounded bg-[#edf5f6]" />
            </div>
          </div>
        ) : (
          <div className="h-[180px] flex items-end gap-3">
            {breakdown.length ? (
              breakdown.map((m) => {
                const incomeHeight = Math.max(6, (m.income / maxValue) * 130);
                const expenseHeight = Math.max(6, (m.expenses / maxValue) * 130);
                return (
                  <div key={m.name} className="flex-1 flex items-end justify-center gap-2">
                    <div className="w-2.5 rounded-sm bg-[#156372]" style={{ height: `${incomeHeight}px` }} />
                    <div className="w-2.5 rounded-sm bg-[#f1b5b5]" style={{ height: `${expenseHeight}px` }} />
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[12px] text-slate-500">No income/expense data</div>
            )}
          </div>
        )}

        {!loading && (
          <div className="mt-3 flex items-center justify-center gap-6 text-[11px]">
            <div className="inline-flex items-center gap-1.5 text-[#537178]"><span className="w-2 h-2 rounded-full bg-[#156372]" />Income</div>
            <div className="inline-flex items-center gap-1.5 text-[#537178]"><span className="w-2 h-2 rounded-full bg-[#f1b5b5]" />Expense</div>
          </div>
        )}
      </div>
    </section>
  );
}


