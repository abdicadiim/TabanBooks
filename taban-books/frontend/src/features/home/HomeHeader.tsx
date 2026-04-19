import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";

export default function HomeHeader() {
  const location = useLocation();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.name) {
      setUserName(user.name.toUpperCase());
    }
  }, []);

  const tabs = [
    { label: "Dashboard", to: "/" },
    { label: "Getting Started", to: "/getting-started" },
    { label: "Recent Updates", to: "/recent-updates" },
    { label: "Projects Guide", to: "/time-tracking/projects-guide" },
  ];

  return (
    <section className="rounded-2xl border border-[#b9d4d8] bg-white px-4 py-4 shadow-sm box-border overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[32px] md:text-[36px] leading-none font-semibold text-slate-900 tracking-tight">
            Hello, <span className="text-[#156372]">{userName}</span>
          </h1>
          <p className="mt-2 text-[13px] text-[#55737a]">
            Manage your business finances and cash flow at a glance.
          </p>
        </div>
      </div>

      <div className="mt-5 border-b border-[#c8dce0] flex gap-6">
        {tabs.map((tab) => {
          const active =
            tab.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`relative pb-2.5 text-[12px] transition-colors ${active ? "text-slate-900 font-semibold" : "text-[#4b6970] hover:text-slate-900"}`}
            >
              {tab.label}
              {active && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#156372] rounded-full" />}
            </NavLink>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: "KPIs", href: "#kpis" },
          { label: "Cash Flow", href: "#cashflow" },
          { label: "Performance", href: "#performance" },
          { label: "Accounts", href: "#accounts" },
          { label: "Watchlist", href: "#watchlist" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="px-2.5 py-1.5 rounded-md text-[11px] border border-[#c8dce0] bg-[#f3f8f8] text-[#4a666d] hover:bg-[#edf5f6]"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}

