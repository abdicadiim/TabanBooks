import React from "react";
import { CreditCard, Edit2, Folder, FolderPlus, LayoutGrid, Trash2 } from "lucide-react";
import type { FolderItem } from "../types";

type DocumentsSidebarProps = {
  activeView: string;
  folders: FolderItem[];
  counts: {
    all: number;
    inbox: number;
    bank: number;
    byFolder: Record<string, number>;
  };
  onSelectView: (view: string) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

function SidebarButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-[#156372] text-white shadow-lg shadow-[#156372]/20"
          : "text-slate-600 hover:bg-white hover:text-slate-900"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon size={18} className={active ? "text-white" : "text-slate-400"} />
        {label}
      </span>
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function DocumentsSidebar({
  activeView,
  folders,
  counts,
  onSelectView,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  canCreate,
  canEdit,
  canDelete,
}: DocumentsSidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-[#f8fafc]">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="mb-8">
          <h2 className="px-2 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Views</h2>
          <div className="mt-3 space-y-1.5">
            <SidebarButton
              active={activeView === "all"}
              count={counts.all}
              icon={LayoutGrid}
              label="All Documents"
              onClick={() => onSelectView("all")}
            />
            <SidebarButton
              active={activeView === "inbox"}
              count={counts.inbox}
              icon={Folder}
              label="Files"
              onClick={() => onSelectView("inbox")}
            />
            <SidebarButton
              active={activeView === "bank"}
              count={counts.bank}
              icon={CreditCard}
              label="Bank Statements"
              onClick={() => onSelectView("bank")}
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-3 flex items-center justify-between px-2">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Folders</h3>
            {canCreate ? (
              <button
                onClick={onCreateFolder}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#156372] transition hover:bg-white"
              >
                <FolderPlus size={14} />
                New
              </button>
            ) : null}
          </div>

          {folders.length ? (
            <div className="space-y-1.5">
              {folders.map((folder) => {
                const active = activeView === folder.id;
                return (
                  <div
                    key={folder.id}
                    className={`group rounded-2xl border px-3 py-3 transition ${
                      active ? "border-[#156372]/20 bg-white shadow-sm" : "border-transparent hover:bg-white"
                    }`}
                  >
                    <button
                      onClick={() => onSelectView(folder.id)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Folder size={18} className={active ? "text-[#156372]" : "text-slate-400"} />
                        <span className={`truncate text-sm font-semibold ${active ? "text-slate-900" : "text-slate-600"}`}>
                          {folder.name}
                        </span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {counts.byFolder[folder.name] || 0}
                      </span>
                    </button>

                    {(canEdit || canDelete) && (
                      <div className="mt-3 flex items-center gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        {canEdit ? (
                          <button
                            onClick={() => onEditFolder(folder)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            <Edit2 size={13} />
                            Rename
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            onClick={() => onDeleteFolder(folder)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-400">
              No custom folders yet.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
