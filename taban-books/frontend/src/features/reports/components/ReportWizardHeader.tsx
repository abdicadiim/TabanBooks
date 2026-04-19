import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const steps = [
  { key: "general", label: "General", path: "/reports/new/general" },
  { key: "columns", label: "Show / Hide Columns", path: "/reports/new/columns" },
  { key: "layout",  label: "Report Layout", path: "/reports/new/layout" },
  { key: "prefs",   label: "Report Preferences", path: "/reports/new/preferences" },
];

export default function ReportWizardHeader() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  const activeIdx = steps.findIndex(s => pathname.startsWith(s.path));
  return (
    <div className="flex items-center gap-4 mb-4">
      {steps.map((s, idx) => {
        const active = idx === activeIdx;
        const done = idx < activeIdx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => nav(s.path)}
              className={`px-3 py-2 rounded-lg text-sm border transition
                ${active ? "bg-white" : "bg-slate-50"}
              `}
              style={{
                borderColor: "var(--card-border)",
                color: active ? "#0f172a" : "#334155",
                boxShadow: active ? "var(--shadow-sm)" : "none",
              }}
            >
              <span className={`mr-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
                ${done ? "bg-emerald-500 text-white" : active ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-700"}
              `}>
                {idx + 1}
              </span>
              {s.label}
            </button>
            {idx < steps.length - 1 && <span className="text-slate-300">›</span>}
          </div>
        );
      })}
    </div>
  );
}
