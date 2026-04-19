import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Lock, Save, Share2, User, Users, X } from "lucide-react";
import WizardNav from "./WizardNav";
import { useReportWizard } from "./ReportWizardContext";
import { reportsAPI, rolesAPI, usersAPI } from "../../../services/api";

const ACCENT = "#156372";

type PermissionKey = "view_only" | "view_export" | "view_export_schedule";

type ShareChoice = "Only Me" | "Only Selected Users & Roles" | "Everyone";

interface SharedUserEntry {
  userId: string;
  permission: PermissionKey;
  skipModuleAccess?: boolean;
}

interface SharedRoleEntry {
  roleId?: string;
  roleName?: string;
  permission: PermissionKey;
}

const PERMISSION_OPTIONS: Array<{ value: PermissionKey; label: string }> = [
  { value: "view_only", label: "View only" },
  { value: "view_export", label: "View and Export" },
  { value: "view_export_schedule", label: "View, Export and Schedule" },
];

const coerceShareChoice = (value: string): ShareChoice => {
  if (value === "Everyone") return "Everyone";
  if (value === "Only Selected Users & Roles") return "Only Selected Users & Roles";
  return "Only Me";
};

export default function ReportPreferences() {
  const nav = useNavigate();
  const {
    reportName,
    setReportName,
    exportName,
    setExportName,
    description,
    setDescription,
    shareWith,
    setShareWith,
    modules,
    selectedCols,
    filters,
    dateRange,
    reportBy,
    groupBy,
    tableDensity,
    tableDesign,
    paper,
    orientation,
    font,
    margins,
    layoutDetails,
  } = useReportWizard();

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [permission, setPermission] = useState<PermissionKey>("view_only");
  const [sharedUsers, setSharedUsers] = useState<SharedUserEntry[]>([]);
  const [sharedRoles, setSharedRoles] = useState<SharedRoleEntry[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedShare = coerceShareChoice(shareWith);

  useEffect(() => {
    setShareWith(selectedShare);
  }, []);

  useEffect(() => {
    const loadDirectory = async () => {
      try {
        setLoadingDirectory(true);
        const [usersResponse, rolesResponse] = await Promise.all([usersAPI.getAll(), rolesAPI.getAll()]);

        const resolvedUsers = Array.isArray(usersResponse?.data)
          ? usersResponse.data
          : Array.isArray(usersResponse)
            ? usersResponse
            : [];

        const resolvedRoles = Array.isArray(rolesResponse?.data)
          ? rolesResponse.data
          : Array.isArray(rolesResponse)
            ? rolesResponse
            : [];

        setUsers(resolvedUsers);
        setRoles(resolvedRoles);
      } catch (apiError: any) {
        setError(apiError?.message || "Failed to load users and roles");
      } finally {
        setLoadingDirectory(false);
      }
    };

    loadDirectory();
  }, []);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        id: String(user._id || user.id),
        name: String(user.name || user.fullName || user.email || "User"),
        email: String(user.email || ""),
      })),
    [users]
  );

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        id: String(role._id || role.id),
        name: String(role.name || "Role"),
      })),
    [roles]
  );

  const addUser = () => {
    if (!selectedUserId) return;
    if (sharedUsers.some((entry) => String(entry.userId) === selectedUserId)) return;

    setSharedUsers((prev) => [
      ...prev,
      {
        userId: selectedUserId,
        permission,
        skipModuleAccess: false,
      },
    ]);

    setSelectedUserId("");
  };

  const addRole = () => {
    if (!selectedRoleId) return;
    if (sharedRoles.some((entry) => String(entry.roleId) === selectedRoleId)) return;

    const role = roleOptions.find((item) => item.id === selectedRoleId);

    setSharedRoles((prev) => [
      ...prev,
      {
        roleId: selectedRoleId,
        roleName: role?.name || "Role",
        permission,
      },
    ]);

    setSelectedRoleId("");
  };

  const save = async () => {
    if (!reportName.trim()) {
      setError("Report name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: reportName.trim(),
        exportName: exportName.trim() || reportName.trim(),
        description: description.trim(),
        shareWith: selectedShare,
        modules,
        selectedCols,
        dateRange,
        reportBy,
        groupBy,
        filters,
        layout: {
          tableDensity,
          tableDesign,
          paperSize: paper,
          orientation,
          fontFamily: font,
          margins,
          details: layoutDetails,
        },
        sharedUsers,
        sharedRoles,
      };

      const response = await reportsAPI.createCustomReport(payload);
      const reportKey =
        response?.data?.key ||
        response?.data?.id ||
        (response?.data?._id ? `custom-${response.data._id}` : "");

      nav(reportKey ? `/reports/${reportKey}` : "/reports");
    } catch (apiError: any) {
      setError(apiError?.message || "Failed to save custom report");
    } finally {
      setSaving(false);
    }
  };

  const card = "rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(17,24,39,0.08)]";
  const label = "text-sm font-bold text-slate-700 mb-2 block";
  const input =
    "h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)]";
  const textarea =
    "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-[#156372] focus:ring-2 focus:ring-[rgba(21,99,114,0.1)] resize-none";

  return (
    <div className="min-h-screen bg-white px-5 py-4 pb-28">
      <div className="text-[18px] font-semibold text-slate-900 pb-3 border-b border-slate-200 mb-4">New Custom Report</div>

      <div className="mb-4">
        <WizardNav />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4 flex flex-col gap-5 max-w-[1000px]">
        <div className={card}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-50">
              <FileText className="h-5 w-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Report Information</div>
              <div className="text-xs text-slate-500">Provide details about your custom report</div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className={label}>
                Report Name <span className="text-red-500">*</span>
              </label>
              <input
                className={input}
                value={reportName}
                onChange={(event) => setReportName(event.target.value)}
                placeholder="Enter report name"
              />
            </div>

            <div>
              <label className={label}>Name in Export</label>
              <input
                className={input}
                value={exportName}
                onChange={(event) => setExportName(event.target.value)}
                placeholder="Export file name"
              />
            </div>

            <div>
              <label className={label}>Report Description</label>
              <textarea
                className={textarea}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a description"
              />
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-50">
              <Share2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Configure Permissions</div>
              <div className="text-xs text-slate-500">Control who can view/export/schedule this report</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: <Lock className="h-4 w-4" />, value: "Only Me", label: "Only Me" },
              { icon: <User className="h-4 w-4" />, value: "Only Selected Users & Roles", label: "Only Selected Users & Roles" },
              { icon: <Users className="h-4 w-4" />, value: "Everyone", label: "Everyone" },
            ].map((option) => {
              const active = selectedShare === option.value;
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-xl border-2 p-4 text-sm font-medium transition cursor-pointer"
                  style={
                    active
                      ? { borderColor: ACCENT, backgroundColor: "rgba(21, 99, 114, 0.1)", color: ACCENT }
                      : { borderColor: "#e2e8f0", backgroundColor: "#fff", color: "#334155" }
                  }
                >
                  <input
                    type="radio"
                    checked={active}
                    onChange={() => setShareWith(option.value)}
                    className="h-4 w-4"
                    style={{ accentColor: ACCENT }}
                  />
                  {option.icon}
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>

          {selectedShare === "Only Selected Users & Roles" && (
            <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Add User</label>
                  <div className="flex gap-2">
                    <select
                      className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                      disabled={loadingDirectory}
                    >
                      <option value="">Select user</option>
                      {userOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}{user.email ? ` (${user.email})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addUser}
                      className="h-10 rounded-lg px-4 text-sm font-semibold text-white"
                      style={{ background: ACCENT }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Add Role</label>
                  <div className="flex gap-2">
                    <select
                      className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                      value={selectedRoleId}
                      onChange={(event) => setSelectedRoleId(event.target.value)}
                      disabled={loadingDirectory}
                    >
                      <option value="">Select role</option>
                      {roleOptions.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addRole}
                      className="h-10 rounded-lg px-4 text-sm font-semibold text-white"
                      style={{ background: ACCENT }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Default Permission</label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  value={permission}
                  onChange={(event) => setPermission(event.target.value as PermissionKey)}
                >
                  {PERMISSION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {sharedUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-800">Shared Users</div>
                  {sharedUsers.map((entry) => {
                    const user = userOptions.find((item) => item.id === String(entry.userId));
                    return (
                      <div key={String(entry.userId)} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="min-w-[220px] text-sm text-slate-800">{user?.name || "User"}</div>
                        <select
                          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                          value={entry.permission}
                          onChange={(event) =>
                            setSharedUsers((prev) =>
                              prev.map((item) =>
                                item.userId === entry.userId ? { ...item, permission: event.target.value as PermissionKey } : item
                              )
                            )
                          }
                        >
                          {PERMISSION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={Boolean(entry.skipModuleAccess)}
                            onChange={(event) =>
                              setSharedUsers((prev) =>
                                prev.map((item) =>
                                  item.userId === entry.userId ? { ...item, skipModuleAccess: event.target.checked } : item
                                )
                              )
                            }
                          />
                          Skip Module Access
                        </label>
                        <button
                          type="button"
                          onClick={() => setSharedUsers((prev) => prev.filter((item) => item.userId !== entry.userId))}
                          className="ml-auto rounded p-1 text-slate-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {sharedRoles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-800">Shared Roles</div>
                  {sharedRoles.map((entry) => (
                    <div key={String(entry.roleId || entry.roleName)} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-[220px] text-sm text-slate-800">{entry.roleName || "Role"}</div>
                      <select
                        className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                        value={entry.permission}
                        onChange={(event) =>
                          setSharedRoles((prev) =>
                            prev.map((item) =>
                              item.roleId === entry.roleId ? { ...item, permission: event.target.value as PermissionKey } : item
                            )
                          )
                        }
                      >
                        {PERMISSION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setSharedRoles((prev) => prev.filter((item) => item.roleId !== entry.roleId))}
                        className="ml-auto rounded p-1 text-slate-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 shadow-2xl">
        <button
          className="h-9 rounded-lg border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[.98] transition"
          onClick={() => nav("/reports/new/layout")}
        >
          Back
        </button>

        <button
          className="h-9 rounded-lg border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[.98] transition"
          onClick={() => nav("/reports")}
        >
          Cancel
        </button>

        <button
          className="h-9 rounded-lg px-5 text-sm font-bold text-white shadow-lg active:scale-[.98] transition flex items-center gap-2 disabled:opacity-60"
          style={{ background: ACCENT }}
          onClick={save}
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save & View Report"}
        </button>
      </div>
    </div>
  );
}
