import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Clock, Folder, Home, Plus, Search, Share2, Star, User } from "lucide-react";
import { reportsAPI } from "../../../services/api";

const ACCENT = "#156372";

type LeftFilter = "home" | "favorites" | "shared" | "my" | "scheduled";

interface ReportRow {
  id: string;
  key: string;
  name: string;
  category: string;
  createdBy?: string;
  reportType?: "system" | "custom";
  lastVisited?: string | null;
}

interface CategoryRow {
  id: string;
  label: string;
  count: number;
}

const LEFT_FILTERS: Array<{ id: LeftFilter; label: string; icon: any }> = [
  { id: "home", label: "All Reports", icon: Home },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "shared", label: "Shared Reports", icon: Share2 },
  { id: "my", label: "My Reports", icon: User },
  { id: "scheduled", label: "Scheduled Reports", icon: Clock },
];

export default function ReportsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LeftFilter>("home");
  const [category, setCategory] = useState("all");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const raw = localStorage.getItem("taban_report_favorites");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string>("");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          search,
          category: category === "all" ? "" : category,
          filter: filter === "favorites" ? "home" : filter,
        };

        const response = await reportsAPI.getCatalog(params);
        if (!active) return;

        const nextReports = response?.data?.reports || [];
        const nextCategories = response?.data?.categories || [];

        setRows(
          nextReports.map((report: any) => ({
            id: report.id,
            key: report.key || report.id,
            name: report.name,
            category: report.category || "Reports",
            createdBy: report.createdBy || "System Generated",
            reportType: report.reportType || "system",
            lastVisited: report.lastVisited || null,
          }))
        );

        setCategories(nextCategories);
      } catch (apiError: any) {
        if (!active) return;
        setError(apiError?.message || "Failed to load reports");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCatalog();

    return () => {
      active = false;
    };
  }, [search, filter, category]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("forceSidebarCollapse", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("forceSidebarCollapse", { detail: false }));
    };
  }, []);

  const visibleRows = useMemo(() => {
    if (filter !== "favorites") return rows;
    return rows.filter((row) => favorites.includes(row.key));
  }, [rows, filter, favorites]);

  const toggleFavorite = (reportKey: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(reportKey);
      const next = exists ? prev.filter((key) => key !== reportKey) : [...prev, reportKey];
      localStorage.setItem("taban_report_favorites", JSON.stringify(next));
      setToastMessage(exists ? "Removed from favorites" : "Added to favorites");
      return next;
    });
  };

  const title = LEFT_FILTERS.find((row) => row.id === filter)?.label || "Reports";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6]">
      <div className="w-[260px] border-r border-slate-200 bg-white p-3 overflow-y-auto">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Views</div>
        <div className="space-y-1">
          {LEFT_FILTERS.map((view) => {
            const Icon = view.icon;
            const active = filter === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setFilter(view.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  active ? "bg-[#156372]/12 text-[#156372] font-semibold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">Categories</div>
        <button
          onClick={() => setCategory("all")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
            category === "all" ? "bg-[#156372]/12 text-[#156372] font-semibold" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <span className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            All Categories
          </span>
          <span className="text-xs">{rows.length}</span>
        </button>

        <div className="space-y-1 mt-1">
          {categories.map((entry) => {
            const active = category === entry.label;
            return (
              <button
                key={entry.id}
                onClick={() => setCategory(entry.label)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                  active ? "bg-[#156372]/12 text-[#156372] font-semibold" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="truncate">{entry.label}</span>
                <span className="text-xs">{entry.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <div className="text-xs text-slate-500">Taban Reports module</div>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-[#156372] focus:ring-2 focus:ring-[#156372]/20"
              />
            </div>
          </div>

          <Link
            to="/reports/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-white"
            style={{ background: ACCENT }}
          >
            <Plus className="h-4 w-4" />
            Create New Report
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {toastMessage && (
            <div className="mb-4 inline-flex items-center gap-2 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg">
              <Check className="h-3.5 w-3.5" />
              {toastMessage}
            </div>
          )}

          {loading && <div className="text-sm text-slate-600">Loading reports...</div>}
          {!loading && error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && !error && visibleRows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No reports found.
            </div>
          )}

          {!loading && !error && visibleRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Report Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.key} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleFavorite(row.key)}>
                            <Star
                              className={`h-4 w-4 ${
                                favorites.includes(row.key)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300 hover:text-amber-400"
                              }`}
                            />
                          </button>
                          <button
                            className="text-sm text-slate-800 hover:text-[#156372]"
                            onClick={() => navigate(`/reports/${row.key}`)}
                          >
                            {row.name}
                          </button>
                          {row.reportType === "custom" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.createdBy || "System Generated"}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{row.lastVisited ? new Date(row.lastVisited).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
