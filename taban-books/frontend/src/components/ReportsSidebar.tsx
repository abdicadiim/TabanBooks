import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ChevronDown, ChevronRight, FileText, Search, X } from "lucide-react";
import { reportsAPI } from "../services/api";

interface ReportsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportListItem {
  id: string;
  key: string;
  name: string;
  category: string;
  reportType: "system" | "custom";
}

export default function ReportsSidebar({ isOpen, onClose }: ReportsSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "Business Overview": true,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await reportsAPI.getCatalog();
        if (!active) return;

        const data = response?.data?.reports || [];
        setReports(
          data.map((report: any) => ({
            id: report.id,
            key: report.key || report.id,
            name: report.name,
            category: report.category || "Reports",
            reportType: report.reportType || "system",
          }))
        );
      } catch (error) {
        console.error("[ReportsSidebar] Failed to load reports:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (isOpen) load();

    return () => {
      active = false;
    };
  }, [isOpen]);

  const grouped = useMemo(() => {
    const result = new Map<string, ReportListItem[]>();
    const query = search.trim().toLowerCase();

    reports.forEach((report) => {
      if (query) {
        const haystack = `${report.name} ${report.category}`.toLowerCase();
        if (!haystack.includes(query)) return;
      }

      if (!result.has(report.category)) result.set(report.category, []);
      result.get(report.category)!.push(report);
    });

    return Array.from(result.entries()).map(([category, categoryReports]) => ({
      category,
      reports: categoryReports.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [reports, search]);

  useEffect(() => {
    if (grouped.length > 0) {
      const first = grouped[0].category;
      setExpanded((prev) => ({ ...prev, [first]: prev[first] ?? true }));
    }
  }, [grouped]);

  const toggleCategory = (category: string) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const openReport = (report: ReportListItem) => {
    navigate(`/reports/${report.key}`);
  };

  if (!isOpen) return null;

  return (
    <aside
      className={`
        fixed top-0 left-[var(--sidebar-width)] h-screen w-[300px] bg-white border-r border-slate-200 shadow-lg z-[1001]
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        max-md:left-0 max-md:z-[1002]
      `}
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#156372]" />
          <h2 className="text-sm font-semibold text-slate-900">Taban Reports</h2>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports"
            className="w-full h-8 pl-8 pr-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#156372] focus:ring-2 focus:ring-[#156372]/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <div className="text-xs text-slate-500 px-2 py-2">Loading reports...</div>}

        {!loading && grouped.length === 0 && (
          <div className="text-xs text-slate-500 px-2 py-2">No reports found.</div>
        )}

        {!loading &&
          grouped.map((group) => {
            const isExpanded = Boolean(expanded[group.category]);
            return (
              <div key={group.category} className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 rounded-t-lg"
                >
                  <span>{group.category}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div className="p-1 space-y-1">
                    {group.reports.map((report) => {
                      const active =
                        location.pathname === `/reports/${report.key}` ||
                        location.pathname.startsWith(`/reports/${report.key}/`);

                      return (
                        <button
                          key={report.key}
                          onClick={() => openReport(report)}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded text-sm text-left transition-colors ${
                            active
                              ? "bg-[#156372]/15 text-[#156372] font-semibold"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="truncate flex-1">{report.name}</span>
                          {report.reportType === "custom" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                              Custom
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </aside>
  );
}
