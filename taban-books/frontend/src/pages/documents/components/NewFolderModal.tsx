import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { FolderItem } from "../types";

type NewFolderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: { name: string; permission: string }) => void | Promise<void>;
  initialData?: FolderItem | null;
};

export default function NewFolderModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: NewFolderModalProps) {
  const [name, setName] = useState("");
  const [permission, setPermission] = useState("all");

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || "");
    setPermission(initialData?.permission || "all");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    await onSave({ name: trimmedName, permission });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {initialData ? "Edit Folder" : "New Folder"}
            </h2>
            <p className="text-sm text-slate-500">Create a lightweight folder structure for your documents.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Folder Name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Examples: Receipts, Contracts, Tax"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Visibility</span>
            <select
              value={permission}
              onChange={(event) => setPermission(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#156372] focus:ring-4 focus:ring-[#156372]/10"
            >
              <option value="all">All team members</option>
              <option value="restricted">Restricted</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#156372] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104e59]"
          >
            {initialData ? "Save Changes" : "Create Folder"}
          </button>
        </div>
      </form>
    </div>
  );
}
