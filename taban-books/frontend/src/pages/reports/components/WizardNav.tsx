import React from "react";
import { Link, useLocation } from "react-router-dom";

const steps = [
  { n: 1, label: "General", path: "/reports/new/general" },
  { n: 2, label: "Show / Hide Columns", path: "/reports/new/columns" },
  { n: 3, label: "Report Layout", path: "/reports/new/layout" },
  { n: 4, label: "Report Preferences", path: "/reports/new/preferences" },
];

export default function WizardNav() {
  const { pathname } = useLocation();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const active = pathname.startsWith(s.path);
        return (
          <React.Fragment key={s.n}>
            <Link
              to={s.path}
              className={`inline-flex items-center gap-2 text-sm transition relative
                ${active ? "text-slate-900" : "text-slate-600"}
              `}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold border-2
                  ${active ? "bg-white" : "bg-slate-100 border-slate-300 text-slate-600"}
                  style={active ? { borderColor: "#156372", color: "#156372" } : {}}
                `}
              >
                {s.n}
              </span>
              <span className={active ? "font-semibold" : ""}>{s.label}</span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ bottom: '-8px', backgroundColor: "#156372" }} />
              )}
            </Link>
            {i < steps.length - 1 && <span className="text-slate-400 mx-1">›</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
