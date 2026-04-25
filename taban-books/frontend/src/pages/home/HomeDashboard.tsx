import React, { useState, useEffect } from "react";
import HomeHeader from "./HomeHeader";
import KpiRow from "./KpiRow";
import CashFlowCard from "./CashFlowCard";
import IncomeExpenseCard from "./IncomeExpenseCard";
import TopExpensesCard from "./TopExpensesCard";
import ProjectsCard from "./ProjectsCard";
import BankCardsCard from "./BankCardsCard";
import { dashboardService } from "../../services/dashboardService";
import { useCurrency } from "../../hooks/useCurrency";

function WatchlistCard({ data = [], loading = false }: { data?: any[]; loading?: boolean }) {
  const { formatMoney } = useCurrency();

  const rows = (data || []).slice(0, 6).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    category: acc.type?.replace(/_/g, " ") || "Operating Expense",
    amount: Number(acc.balance || 0),
  }));

  const totalAbsolute = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0);

  return (
    <section id="watchlist" className="rounded-2xl border border-[#b9d4d8] bg-white p-1.5 shadow-sm box-border overflow-x-auto">
      <header className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[20px] font-semibold text-slate-900">Account Watchlist</h3>
        <button className="text-[11px] font-semibold text-[#156372] hover:underline">Manage Watchlist</button>
      </header>

      <div className="rounded-xl border border-[#d7e7ea] overflow-hidden min-w-[760px]">
        <table className="w-full text-left">
          <thead className="bg-[#f3f8f8] text-[10px] uppercase tracking-wide text-[#657f86]">
            <tr>
              <th className="px-3 py-2">Account Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2 text-right">Share %</th>
              <th className="px-3 py-2 text-right">Trend</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [0, 1, 2, 3].map((i) => (
                <tr key={i} className="border-t border-[#eaf2f3]">
                  <td className="px-3 py-2.5">
                    <div className="h-3 w-28 rounded bg-[#edf5f6] animate-pulse" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="h-3 w-20 rounded bg-[#edf5f6] animate-pulse" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="h-3 w-16 rounded bg-[#edf5f6] animate-pulse inline-block" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="h-3 w-12 rounded bg-[#edf5f6] animate-pulse inline-block" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="h-3 w-4 rounded bg-[#edf5f6] animate-pulse inline-block" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[12px] text-slate-500">
                  No accounts on watchlist. Go to Chart of Accounts to add.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[#eaf2f3] text-[12px]">
                  <td className="px-3 py-2.5 text-slate-800 font-medium">{row.name}</td>
                  <td className="px-3 py-2.5 text-[#55717a]">{row.category}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{formatMoney(row.amount)}</td>
                  <td className="px-3 py-2.5 text-right text-[#2f7f8e]">
                    {totalAbsolute > 0 ? `${((Math.abs(row.amount) / totalAbsolute) * 100).toFixed(1)}%` : "0.0%"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-[12px] font-semibold ${row.amount > 0 ? "text-[#156372]" : row.amount < 0 ? "text-[#ef5c5c]" : "text-[#94a3b8]"}`}>
                      {row.amount > 0 ? "↗" : row.amount < 0 ? "↘" : "→"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HomeDashboard() {
  const [initialBootstrap] = useState(() => dashboardService.getCachedHomeBootstrap());
  const [loading, setLoading] = useState(() => !initialBootstrap?.data);
  const [dashboardData, setDashboardData] = useState<any>(() => initialBootstrap?.data ?? null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      if (!initialBootstrap?.data) {
        setLoading(true);
      }
      try {
        const response = await dashboardService.getHomeBootstrap();
        if (!cancelled && response && response.success && !response.pending && response.data?.kpi) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [initialBootstrap]);

  const kpiData = dashboardData?.kpi ?? null;

  return (
    <div className="min-h-screen w-full bg-[#f3f8f8] text-slate-900 overflow-x-hidden">
      <div className="w-full max-w-full mx-0 px-3 md:px-4 lg:px-5 pt-2 pb-5 space-y-3 box-border">
        <HomeHeader />

        <div className="rounded-2xl border border-[#b9d4d8] bg-white p-1.5 md:p-2 space-y-1.5 box-border overflow-x-hidden relative">
          {loading && (
            <div className="absolute inset-x-0 top-0 h-1 z-50">
              <div className="h-full bg-gradient-to-r from-[#156372] via-[#0D4A52] to-[#156372] animate-pulse" />
            </div>
          )}

          <div id="kpis">
            <KpiRow data={kpiData} loading={loading} />
          </div>

          <div id="cashflow">
            <CashFlowCard initialData={dashboardData?.cashFlow} bootstrapLoading={loading} />
          </div>

          <div id="performance" className="grid grid-cols-1 md:grid-cols-2 gap-1.5 box-border">
            <IncomeExpenseCard initialData={dashboardData?.profitLoss} bootstrapLoading={loading} />
            <TopExpensesCard initialData={dashboardData?.topExpenses} bootstrapLoading={loading} />
          </div>

          <div id="accounts" className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-1.5 box-border">
            <ProjectsCard data={kpiData?.projects} loading={loading} />
            <BankCardsCard data={kpiData?.bankAccounts} loading={loading} />
          </div>

          <WatchlistCard data={kpiData?.watchlist} loading={loading} />

          <div className="text-[10px] text-[#6d858b] px-1 pt-1 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Divine Emperor. All rights reserved.</span>
            <span>Privacy Policy | Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

