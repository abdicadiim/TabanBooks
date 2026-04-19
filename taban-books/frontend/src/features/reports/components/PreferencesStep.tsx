import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReportWizardHeader from "./ReportWizardHeader";

export default function PreferencesStep() {
  const nav = useNavigate();
  const [name, setName] = useState("My Custom Quote Report");
  const [share, setShare] = useState("Private");

  const card =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(17,24,39,0.06)]";
  const combo =
    "h-9 w-[320px] rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";
  const input =
    "h-9 w-[320px] rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

  return (
    <div className="p-4">
      <div className="mb-3 text-[18px] font-semibold text-slate-900">New Custom Report</div>
      <ReportWizardHeader />

      <div className="mt-2 flex flex-col gap-3">
        <div className={card}>
          <div className="mb-2">
            <label className="text-[12px] font-semibold text-slate-600">Report Name</label>
          </div>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className={card}>
          <div className="mb-2">
            <label className="text-[12px] font-semibold text-slate-600">Share With</label>
          </div>
          <select className={combo} value={share} onChange={(e) => setShare(e.target.value)}>
            <option>Private</option>
            <option>Organization</option>
            <option>Selected Users</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 active:scale-[.98]"
          onClick={() => nav("/reports/new/layout")}
        >
          Back
        </button>
        <button
          className="h-8 rounded-md px-3 text-sm font-semibold text-white shadow-md active:scale-[.98]"
          style={{ background: "#156372" }}
          onClick={() => nav("/reports")}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#0D4A52"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#156372"}
        >
          Save
        </button>
      </div>
    </div>
  );
}
