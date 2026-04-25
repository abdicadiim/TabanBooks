import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const ACCENT = "#156372";

const steps = [
  { to: "/reports/new", label: "Modules" },
  { to: "/reports/new/general", label: "General" },
  { to: "/reports/new/columns", label: "Columns" },
  { to: "/reports/new/layout", label: "Layout" },
  { to: "/reports/new/preferences", label: "Preferences" },
];

export default function ReportWizardShell() {
  const loc = useLocation();

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <NavLink
            to="/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 active:scale-[.98]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </NavLink>
          <div>
            <div className="text-[18px] font-semibold text-slate-900">
              New Custom Report
            </div>
            <div className="text-sm text-slate-500">
              Build a report step-by-step.
            </div>
          </div>
        </div>

        <NavLink
          to="/reports"
          className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-md hover:brightness-95 active:scale-[.98]"
          style={{ background: ACCENT }}
        >
          Cancel
        </NavLink>
      </div>

      {/* Steps nav */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_28px_rgba(17,24,39,0.06)]">
        <div className="flex flex-wrap gap-2">
          {steps.map((s) => {
            const active = loc.pathname === s.to;
            return (
              <NavLink
                key={s.to}
                to={s.to}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "text-white shadow"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                style={active ? { background: ACCENT } : undefined}
              >
                {s.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Outlet />
    </div>
  );
}
