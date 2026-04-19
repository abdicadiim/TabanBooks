import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReportWizardHeader from "./ReportWizardHeader";

const ALL_COLUMNS = [
  "Quote Number","Quote Date","Customer Name","Owner","Status","Amount","Currency"
] as const;

type ColumnName = (typeof ALL_COLUMNS)[number];

export default function ColumnsStep() {
  const nav = useNavigate();
  const [visible, setVisible] = useState<Set<ColumnName>>(
    new Set<ColumnName>(["Quote Number", "Quote Date", "Customer Name", "Amount"])
  );

  const toggle = (c: ColumnName) =>
    setVisible(prev => {
      const n = new Set(prev);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });

  const card =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(17,24,39,0.06)]";

  return (
    <div className="p-4">
      <div className="mb-3 text-[18px] font-semibold text-slate-900">New Custom Report</div>
      <ReportWizardHeader />

      <div className="mt-2 flex flex-col gap-3">
        <div className={card}>
          <div className="mb-2">
            <label className="text-[12px] font-semibold text-slate-600">Show / Hide Columns</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_COLUMNS.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <input type="checkbox" checked={visible.has(c)} onChange={() => toggle(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 active:scale-[.98]"
          onClick={() => nav("/reports/new/general")}
        >
          Back
        </button>
        <button
          className="h-8 rounded-md px-3 text-sm font-semibold text-white shadow-md hover:brightness-95 active:scale-[.98]"
          style={{ background: "#156372" }}
          onClick={() => nav("/reports/new/layout")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
