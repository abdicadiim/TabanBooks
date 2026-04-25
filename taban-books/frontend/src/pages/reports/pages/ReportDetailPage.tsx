import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Download,
  Play,
  Printer,
  RefreshCw,
  Share2,
  CalendarClock,
  Menu,
  X,
} from "lucide-react";
import ReportsSidebar from "../../../components/ReportsSidebar";
import { reportsAPI, rolesAPI, usersAPI } from "../../../services/api";

const ACCENT = "#156372";

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
  { value: "previous_month", label: "Previous Month" },
  { value: "previous_year", label: "Previous Year" },
  { value: "custom", label: "Custom" },
];

interface ReportMeta {
  id: string;
  key: string;
  name: string;
  category: string;
  reportType?: "system" | "custom";
  supportsChart?: boolean;
  supportsSchedule?: boolean;
  supportsShare?: boolean;
  supportsExport?: boolean;
}

interface ReportData {
  reportKey: string;
  reportName: string;
  periodLabel: string;
  reportBasis: "accrual" | "cash";
  columns: string[];
  rows: Array<Record<string, any>>;
  summary?: Record<string, any>;
  chart?: {
    type: "line" | "bar" | "pie";
    labels: string[];
    datasets: Array<{ label: string; data: number[] }>;
  };
  notes?: string[];
}

interface ShareUser {
  userId: string;
  permission: string;
  skipModuleAccess?: boolean;
}

interface ShareRole {
  roleId?: string;
  roleName?: string;
  permission: string;
}

const parseNumericValue = (value: any): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};



export default function ReportDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reportKey = String(id || "");
  const queryDateRange = searchParams.get("dateRange") || "this_month";
  const queryReportBasis = searchParams.get("reportBasis") === "cash" ? "cash" : "accrual";
  const queryStartDate = searchParams.get("startDate") || "";
  const queryEndDate = searchParams.get("endDate") || "";
  const selectedAccountName = searchParams.get("accountName") || "";

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState(queryDateRange);
  const [reportBasis, setReportBasis] = useState<"accrual" | "cash">(queryReportBasis);
  const [startDate, setStartDate] = useState(queryStartDate);
  const [endDate, setEndDate] = useState(queryEndDate);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    frequency: "weekly",
    dayOfWeek: 1,
    dayOfMonth: 1,
    monthOfYear: 1,
    time: "09:00",
    timezone: "UTC",
    format: "pdf",
    recipientsText: "",
  });

  const [shareWith, setShareWith] = useState<"Only Me" | "Only Selected Users & Roles" | "Everyone">("Only Me");
  const [sharedUsers, setSharedUsers] = useState<ShareUser[]>([]);
  const [sharedRoles, setSharedRoles] = useState<ShareRole[]>([]);

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const canUseChart = Boolean(meta?.supportsChart && data?.chart);
  const isProfitAndLossReport = reportKey === "profit_and_loss";
  const formatReportCellValue = (row: Record<string, any>, column: string) => {
    const raw = row[column];
    if (raw === undefined || raw === null) return "-";

    if (isProfitAndLossReport && column === "amount") {
      const accountName = String(row.account || "");
      const isProfitLossLine = /profit|loss/i.test(accountName);
      const value = parseNumericValue(raw);
      if (isProfitLossLine && value !== null) {
        if (value > 0) return `+${value.toFixed(2)}`;
        if (value < 0) return value.toFixed(2);
        return "0.00";
      }
    }

    return String(raw);
  };

  const loadReport = async () => {
    if (!reportKey) return;
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getByKey(reportKey);
      const reportMeta = response?.data;
      setMeta(reportMeta);
      if (reportMeta?.reportType === "custom") {
        setShareWith(reportMeta?.config?.visibility === "everyone" ? "Everyone" : reportMeta?.config?.visibility === "selected" ? "Only Selected Users & Roles" : "Only Me");
      }
    } catch (apiError: any) {
      setError(apiError?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const runReport = async () => {
    if (!reportKey) return;
    try {
      setRunning(true);
      setError(null);
      const payload: Record<string, any> = {
        dateRange,
        reportBasis,
      };
      if (dateRange === "custom" && startDate && endDate) {
        payload.startDate = startDate;
        payload.endDate = endDate;
      }
      const response = await reportsAPI.run(reportKey, payload);
      setData(response?.data || null);
    } catch (apiError: any) {
      setError(apiError?.message || "Failed to run report");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportKey]);

  useEffect(() => {
    runReport();
  }, [reportKey, dateRange, reportBasis, startDate, endDate]);

  const exportCsv = () => {
    if (!data || data.columns.length === 0) return;
    const escape = (value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = data.columns.join(",");
    const lines = data.rows.map((row) => data.columns.map((column) => escape(row[column])).join(","));
    const csv = [header, ...lines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(meta?.name || "report").replace(/\s+/g, "_").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveSchedule = async () => {
    try {
      const recipients = scheduleForm.recipientsText
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email }));

      await reportsAPI.createSchedule({
        reportKey,
        frequency: scheduleForm.frequency,
        dayOfWeek: Number(scheduleForm.dayOfWeek),
        dayOfMonth: Number(scheduleForm.dayOfMonth),
        monthOfYear: Number(scheduleForm.monthOfYear),
        time: scheduleForm.time,
        timezone: scheduleForm.timezone,
        format: scheduleForm.format,
        recipients,
      });

      setScheduleOpen(false);
      await loadReport();
    } catch (apiError: any) {
      setError(apiError?.message || "Failed to schedule report");
    }
  };

  const loadShareData = async () => {
    try {
      const [shareResponse, usersResponse, rolesResponse] = await Promise.all([
        reportsAPI.getShare(reportKey),
        usersAPI.getAll(),
        rolesAPI.getAll(),
      ]);

      const share = shareResponse?.data || {};
      const nextUsers = usersResponse?.data || [];
      const nextRoles = rolesResponse?.data || [];

      setUsers(nextUsers);
      setRoles(nextRoles);
      setSharedUsers(Array.isArray(share.sharedUsers) ? share.sharedUsers : []);
      setSharedRoles(Array.isArray(share.sharedRoles) ? share.sharedRoles : []);

      const visibility = String(share.visibility || "").toLowerCase();
      setShareWith(visibility === "everyone" ? "Everyone" : visibility === "selected" ? "Only Selected Users & Roles" : "Only Me");
    } catch (apiError: any) {
      setError(apiError?.message || "Failed to load sharing info");
    }
  };

  useEffect(() => {
    if (shareOpen) loadShareData();
  }, [shareOpen]);

  const addSharedUser = () => {
    if (!selectedUserId) return;
    if (sharedUsers.some((entry) => String(entry.userId) === selectedUserId)) return;
    setSharedUsers((prev) => [...prev, { userId: selectedUserId, permission: "view_only" }]);
    setSelectedUserId("");
  };

  const addSharedRole = () => {
    if (!selectedRoleId) return;
    if (sharedRoles.some((entry) => String(entry.roleId) === selectedRoleId)) return;
    const role = roles.find((item) => String(item._id || item.id) === selectedRoleId);
    setSharedRoles((prev) => [...prev, { roleId: selectedRoleId, roleName: role?.name || "Role", permission: "view_only" }]);
    setSelectedRoleId("");
  };

  const saveShare = async () => {
    try {
      await reportsAPI.updateShare(reportKey, {
        shareWith,
        sharedUsers,
        sharedRoles,
      });
      setShareOpen(false);
      await loadReport();
    } catch (apiError: any) {
      setError(apiError?.message || "Failed to update sharing");
    }
  };

  const summaryRows = useMemo(() => {
    if (!data?.summary) return [];
    return Object.entries(data.summary).map(([key, value]) => ({ key, value }));
  }, [data]);


  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <ReportsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? "md:ml-[300px] ml-0" : "ml-0"}`}>
        <div className="bg-white border-b border-slate-200 px-6 pr-10 py-3 min-h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded hover:bg-slate-100" onClick={() => setSidebarOpen(true)}> <Menu className="h-4 w-4" /> </button>
            <div>
              <div className="text-base font-semibold text-slate-900">{meta?.name || "Report"}</div>
              <div className="text-xs text-slate-500">{meta?.category || "Reports"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={reportBasis}
              onChange={(event) => setReportBasis(event.target.value as "accrual" | "cash")}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="accrual">Accrual</option>
              <option value="cash">Cash</option>
            </select>

            <button onClick={runReport} className="h-9 px-3 rounded text-white text-sm inline-flex items-center gap-1" style={{ background: ACCENT }}>
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
            </button>

            {meta?.supportsSchedule !== false && (
              <button onClick={() => setScheduleOpen(true)} className="h-9 px-3 rounded border border-slate-300 bg-white text-sm inline-flex items-center gap-1">
                <CalendarClock className="h-4 w-4" /> Schedule
              </button>
            )}

            {meta?.supportsShare !== false && (
              <button onClick={() => setShareOpen(true)} className="h-9 px-3 rounded border border-slate-300 bg-white text-sm inline-flex items-center gap-1">
                <Share2 className="h-4 w-4" /> Share
              </button>
            )}

            <button onClick={exportCsv} className="h-9 px-3 rounded border border-slate-300 bg-white text-sm inline-flex items-center gap-1">
              <Download className="h-4 w-4" /> Export
            </button>

            <button onClick={() => window.print()} className="h-9 px-3 rounded border border-slate-300 bg-white text-sm inline-flex items-center gap-1">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading && <div className="text-sm text-slate-600">Loading report...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          {data && (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{data.reportName}</div>
                  <div className="text-xs text-slate-500">{data.periodLabel} • Basis: {data.reportBasis}{selectedAccountName ? ` • ${selectedAccountName}` : ""}</div>
                </div>
                {canUseChart && (
                  <div className="inline-flex items-center rounded border border-slate-200 overflow-hidden">
                    <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 text-xs ${viewMode === "table" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>Table</button>
                    <button onClick={() => setViewMode("chart")} className={`px-3 py-1.5 text-xs ${viewMode === "chart" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>Chart</button>
                  </div>
                )}
              </div>

              {summaryRows.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summaryRows.map((row) => (
                    <div key={row.key} className="rounded border border-slate-200 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{row.key}</div>
                      <div className="text-sm font-semibold text-slate-900">{String(row.value)}</div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "chart" && canUseChart && data.chart && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-sm font-semibold mb-3 text-slate-900 inline-flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Chart View
                  </div>
                  <div className="space-y-2">
                    {data.chart.labels.map((label, index) => {
                      const value = Number(data.chart?.datasets?.[0]?.data?.[index] || 0);
                      const max = Math.max(...(data.chart?.datasets?.[0]?.data || [1]));
                      const width = max > 0 ? Math.max(2, (value / max) * 100) : 2;
                      return (
                        <div key={`${label}-${index}`} className="grid grid-cols-[220px_1fr_120px] items-center gap-3 text-sm">
                          <div className="truncate text-slate-700">{label}</div>
                          <div className="h-3 rounded bg-slate-100 overflow-hidden">
                            <div className="h-full" style={{ width: `${width}%`, background: ACCENT }} />
                          </div>
                          <div className="text-right text-slate-800">{value.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMode === "table" && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-auto">
                  <table className="w-full min-w-[820px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        {data.columns.map((column) => (
                          <th key={column} className="px-3 py-2">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.length === 0 && (
                        <tr>
                          <td colSpan={data.columns.length} className="px-3 py-8 text-sm text-slate-500 text-center">
                            No data available for this period.
                          </td>
                        </tr>
                      )}

                      {data.rows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`} className="border-t border-slate-100 hover:bg-slate-50">
                          {data.columns.map((column) => (
                            <td key={`${rowIndex}-${column}`} className="px-3 py-2 text-sm text-slate-700">
                              {formatReportCellValue(row, column)}
                            </td>
                          ))}
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>
              )}

              {Array.isArray(data.notes) && data.notes.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  {data.notes.map((note, index) => (
                    <div key={`note-${index}`} className="text-xs text-blue-900">• {note}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {scheduleOpen && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-xl border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold">Schedule Report</div>
              <button onClick={() => setScheduleOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-600">Frequency
                <select className="mt-1 h-9 w-full border border-slate-300 rounded px-2 text-sm" value={scheduleForm.frequency} onChange={(e) => setScheduleForm((prev) => ({ ...prev, frequency: e.target.value }))}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>

              <label className="text-xs text-slate-600">Time
                <input type="time" className="mt-1 h-9 w-full border border-slate-300 rounded px-2 text-sm" value={scheduleForm.time} onChange={(e) => setScheduleForm((prev) => ({ ...prev, time: e.target.value }))} />
              </label>

              <label className="text-xs text-slate-600">Format
                <select className="mt-1 h-9 w-full border border-slate-300 rounded px-2 text-sm" value={scheduleForm.format} onChange={(e) => setScheduleForm((prev) => ({ ...prev, format: e.target.value }))}>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                </select>
              </label>

              <label className="text-xs text-slate-600">Timezone
                <input className="mt-1 h-9 w-full border border-slate-300 rounded px-2 text-sm" value={scheduleForm.timezone} onChange={(e) => setScheduleForm((prev) => ({ ...prev, timezone: e.target.value }))} />
              </label>

              <label className="col-span-2 text-xs text-slate-600">Recipients (comma separated emails)
                <input className="mt-1 h-9 w-full border border-slate-300 rounded px-2 text-sm" value={scheduleForm.recipientsText} onChange={(e) => setScheduleForm((prev) => ({ ...prev, recipientsText: e.target.value }))} placeholder="finance@taban.com, owner@taban.com" />
              </label>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setScheduleOpen(false)} className="h-9 px-3 border border-slate-300 rounded text-sm">Cancel</button>
              <button onClick={saveSchedule} className="h-9 px-3 rounded text-sm text-white" style={{ background: ACCENT }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="fixed inset-0 bg-black/40 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold">Share Report</div>
              <button onClick={() => setShareOpen(false)}><X className="h-4 w-4" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-3 text-sm">
                {(["Only Me", "Only Selected Users & Roles", "Everyone"] as const).map((option) => (
                  <label key={option} className="inline-flex items-center gap-1.5">
                    <input type="radio" checked={shareWith === option} onChange={() => setShareWith(option)} />
                    {option}
                  </label>
                ))}
              </div>

              {shareWith === "Only Selected Users & Roles" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Users</div>
                    <div className="flex gap-2">
                      <select className="h-9 flex-1 border border-slate-300 rounded px-2 text-sm" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                        <option value="">Select user</option>
                        {users.map((user: any) => (
                          <option key={String(user._id || user.id)} value={String(user._id || user.id)}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                      <button className="h-9 px-3 border border-slate-300 rounded text-sm" onClick={addSharedUser}>Add</button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {sharedUsers.map((entry, index) => {
                        const user = users.find((item: any) => String(item._id || item.id) === String(entry.userId));
                        return (
                          <div key={`u-${index}`} className="flex items-center justify-between text-sm border border-slate-200 rounded px-2 py-1">
                            <span>{user?.name || user?.email || entry.userId}</span>
                            <button onClick={() => setSharedUsers((prev) => prev.filter((_, i) => i !== index))} className="text-red-600">Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Roles</div>
                    <div className="flex gap-2">
                      <select className="h-9 flex-1 border border-slate-300 rounded px-2 text-sm" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                        <option value="">Select role</option>
                        {roles.map((role: any) => (
                          <option key={String(role._id || role.id)} value={String(role._id || role.id)}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button className="h-9 px-3 border border-slate-300 rounded text-sm" onClick={addSharedRole}>Add</button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {sharedRoles.map((entry, index) => (
                        <div key={`r-${index}`} className="flex items-center justify-between text-sm border border-slate-200 rounded px-2 py-1">
                          <span>{entry.roleName || entry.roleId}</span>
                          <button onClick={() => setSharedRoles((prev) => prev.filter((_, i) => i !== index))} className="text-red-600">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShareOpen(false)} className="h-9 px-3 border border-slate-300 rounded text-sm">Cancel</button>
              <button onClick={saveShare} className="h-9 px-3 rounded text-sm text-white" style={{ background: ACCENT }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}












