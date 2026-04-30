import React from "react";
import { useCurrency } from "../../hooks/useCurrency";

export default function ProjectsCard(props: { data?: any; loading?: boolean }) {
  const { formatMoney } = useCurrency();

  const projects = props.data || { total: 0, active: 0, completed: 0, totalValue: 0 };
  const completionRate = projects.total > 0 ? (projects.completed / projects.total) * 100 : 0;

  const rows = [
    { metric: "Total Projects", value: String(projects.total), state: "Live" },
    { metric: "Active Projects", value: String(projects.active), state: "Active" },
    { metric: "Completed Projects", value: String(projects.completed), state: "Closed" },
    { metric: "Completion Rate", value: `${completionRate.toFixed(1)}%`, state: completionRate >= 75 ? "Strong" : "Building" },
    { metric: "Pipeline Value", value: formatMoney(projects.totalValue || 0), state: "Value" },
  ];

  return (
    <section className="rounded-2xl border border-[#b9d4d8] bg-white py-1.5 px-1.5 w-full shadow-sm box-border overflow-x-hidden">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-[20px] font-semibold m-0 text-slate-900">Project Pipeline</h2>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[#e5f2f4] text-[#156372] font-semibold">
          {projects.active} ACTIVE PROJECTS
        </span>
      </header>

      <div className="rounded-xl border border-[#d7e7ea] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f3f8f8] text-[10px] uppercase tracking-wide text-[#657f86]">
            <tr>
              <th className="px-3 py-2">Metric</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="px-3 py-2 text-right">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric} className="border-t border-[#eaf2f3] text-[12px]">
                <td className="px-3 py-2.5 text-slate-700">{row.metric}</td>
                <td className="px-3 py-2.5 text-right font-medium text-slate-700">{row.value}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e6f3f5] text-[#156372]">{row.state}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.loading ? <div className="mt-2 text-right text-[10px] font-medium text-[#6f8294]">Refreshing...</div> : null}
    </section>
  );
}
